import { MarkdownRenderer } from "obsidian";
import { BranchChatMapChatView } from "../../src/view";
import { ViewState } from "../../src/state/viewState";
import { addChildNode, appendMessage, createMessage, createRootMap } from "../../src/domain/chatMap";
import { createDefaultSettings } from "../../src/settingsDefaults";
import { OpenAICompatibleProvider } from "../../src/ai/openAICompatibleProvider";
import { findSourceRange } from "../../src/ui/messageSelection";
import { setupLearningChecks } from "./learningExperience";
MarkdownRenderer.render = async (_app, markdown, root) => {
  await new Promise((resolve) => setTimeout(resolve, markdown.startsWith("slow") ? 90 : 5));
  for (const paragraph of markdown.split("\n\n")) {
    const p = root.ownerDocument.createElement("p");
    for (const part of paragraph.split(/(\*\*.*?\*\*)/g)) {
      if (part.startsWith("**") && part.endsWith("**")) {
        const strong = root.ownerDocument.createElement("strong");
        strong.textContent = part.slice(2, -2);
        p.append(strong);
      } else p.append(root.ownerDocument.createTextNode(part));
    }
    root.append(p);
  }
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (predicate, label) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await delay(20);
  }
  throw new Error("Timed out: " + label);
};
const report = document.querySelector("#results");
const assert = (condition, label) => {
  if (!condition) throw new Error(label);
  report.textContent += "PASS " + label + "\n";
};
const longParagraphs = (count, prefix) => Array.from({ length: count }, (_, index) => `${prefix} ${index}: a longer explanation with enough content to test precise scroll restoration.`);
const rootMap = createRootMap("Source navigation", "Root");
const originalAnswer = createMessage("assistant", [
  "First occurrence: SelfAttention is introduced here.",
  ...longParagraphs(16, "Earlier paragraph"),
  "Second occurrence: **SelfAttention** connects tokens in a sentence.",
  "The first part includes **bold words**.",
  "The next paragraph completes the definition.",
  ...longParagraphs(28, "Later paragraph")
].join("\n\n"));
let initial = appendMessage(rootMap, rootMap.rootNodeId, originalAnswer);
initial = appendMessage(initial, rootMap.rootNodeId, createMessage("user", "A user question containing SelfAttention."));
initial = appendMessage(initial, rootMap.rootNodeId, createMessage("assistant", "A separate answer also discusses SelfAttention."));
const siblingResult = addChildNode(initial, rootMap.rootNodeId, { title: "Existing sibling" });
initial = appendMessage(siblingResult.map, siblingResult.child.id, createMessage("assistant", longParagraphs(45, "Sibling paragraph").join("\n\n")));
const settingsListeners = /* @__PURE__ */ new Set();
let settingsRevision = 0;
const plugin = {
  settings: { ...createDefaultSettings("en"), apiKey: "local-test", model: "local-test", autoSummarizeNodes: false, onboardingCardDismissed: true },
  app: {},
  manifest: { id: "spider", version: "0.1.12" },
  saveSettings: async () => {
  },
  subscribeSettings: (listener) => {
    settingsListeners.add(listener);
    return () => settingsListeners.delete(listener);
  },
  getSettingsRevision: () => settingsRevision
};
plugin.updateSettings = async (patch) => {
  plugin.settings = { ...plugin.settings, ...patch };
  settingsRevision++;
  settingsListeners.forEach((listener) => listener());
};
const setTabEnabled = (enabled) => {
  plugin.settings = { ...plugin.settings, useTabToCreateChildNodes: enabled };
  settingsRevision++;
  settingsListeners.forEach((listener) => listener());
};
const vs = new ViewState(plugin, { saveMap: async () => {
} }, initial);
plugin.store = { getActiveSession: () => vs, subscribeActiveView: () => () => {
} };
const view = new BranchChatMapChatView({}, plugin);
document.querySelector("#app").append(view.contentEl);
await view.onOpen();
const scroller = () => view.contentEl.querySelector(".bcm-scroll-area");
const primaryAnswer = () => view.contentEl.querySelector(".bcm-message-assistant .markdown-rendered");
const selectRange = (root, start, end) => {
  document.activeElement?.blur();
  const iterator = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  while (iterator.nextNode()) {
    const node = iterator.currentNode;
    const length = node.textContent?.length ?? 0;
    if (start >= offset && start < offset + length) range.setStart(node, start - offset);
    if (end > offset && end <= offset + length) {
      range.setEnd(node, end - offset);
      break;
    }
    offset += length;
  }
  const selection = document.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
  return range;
};
const selectSecondOccurrence = () => {
  const answer = primaryAnswer();
  const text = answer.textContent;
  const start = text.indexOf("SelfAttention", text.indexOf("SelfAttention") + 1);
  const target = [...answer.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Second occurrence"));
  target.scrollIntoView({ block: "center" });
  scroller().dispatchEvent(new Event("scroll"));
  return selectRange(answer, start, start + "SelfAttention".length);
};
const switchNode = async (id) => {
  vs.setActiveNode(id);
  await delay(140);
};
const pressTab = async () => {
  const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
  document.body.dispatchEvent(event);
  await delay(140);
  return event;
};
Object.assign(window, { spiderChecks: { vs, view, originalAnswer, rootId: rootMap.rootNodeId, siblingId: siblingResult.child.id, setTabEnabled, selectSecondOccurrence, selectRange, primaryAnswer, scroller, switchNode, pressTab, delay, waitFor, assert, OpenAICompatibleProvider, findSourceRange } });
setupLearningChecks(plugin, window.spiderChecks);
document.querySelector("#prepare").addEventListener("click", async () => {
  await switchNode(rootMap.rootNodeId);
  selectSecondOccurrence();
});
document.querySelector("#run").addEventListener("click", async () => {
  report.textContent = "";
  try {
    const run = window.runSourceNavigationChecks;
    if (!run) throw new Error("Acceptance steps await stable source-navigation interfaces.");
    await run();
    report.textContent += "ALL SOURCE NAVIGATION CHECKS PASSED\n";
  } catch (error) {
    report.textContent += "FAIL " + error + "\n";
  }
});

window.runSourceNavigationChecks = async () => {
  const c = window.spiderChecks;
  const { vs, rootId, siblingId, delay, assert } = c;
  const hint = () => document.querySelector('.bcm-selection-branch-hint');
  const highlight = () => [...CSS.highlights].flatMap(([name, value]) => name.startsWith('spider-source-') ? [...value] : []);
  const returnParent = async () => {
    [...document.querySelectorAll('.bcm-detail-actions button')].find(button => button.textContent === 'Go to parent').click();
    await delay(180);
  };
  await c.switchNode(rootId);
  const selected = c.selectSecondOccurrence();
  const prefix = document.createRange();
  prefix.selectNodeContents(c.primaryAnswer()); prefix.setEnd(selected.startContainer, selected.startOffset);
  const secondOffset = prefix.toString().length;
  const originalTop = c.scroller().scrollTop;
  await delay(60);
  assert(hint()?.textContent === 'Tab Create branch', 'AI selection shows a visible Tab hint');
  const event = await c.pressTab();
  const child = vs.getActiveNode();
  assert(event.defaultPrevented && child.sourceMessageId === c.originalAnswer.id, 'Tab creates a branch with the exact source message');
  assert(child.sourceTextRange.start === secondOffset && child.anchorText === 'SelfAttention', 'second occurrence retains its UTF-16 offset');
  assert(!hint() && document.activeElement.matches('textarea'), 'new branch hides hint and focuses composer');
  await returnParent();
  assert(Math.abs(c.scroller().scrollTop - originalTop) < 2, 'parent button restores the original reading position');
  assert(highlight()[0]?.toString() === 'SelfAttention' && highlight()[0]?.startContainer.parentElement.tagName === 'STRONG', 'parent return highlights the second occurrence inside strong');

  await c.switchNode(siblingId);
  c.scroller().scrollTop = 537; c.scroller().dispatchEvent(new Event('scroll'));
  await delay(30);
  await c.switchNode(child.id);
  await c.switchNode(siblingId);
  assert(Math.abs(c.scroller().scrollTop - 537) < 2, 'ordinary node switching restores its own saved scroll position');
  await c.switchNode(child.id);
  document.querySelector('.bcm-breadcrumb-button').click(); await delay(180);
  assert(highlight()[0]?.toString() === 'SelfAttention', 'breadcrumb return restores and highlights the original source');

  c.selectSecondOccurrence(); await delay(40);
  document.getSelection().removeAllRanges(); await delay(50);
  assert(!hint(), 'clearing selection hides the hint');
  c.selectSecondOccurrence(); c.setTabEnabled(false); await delay(50);
  assert(!hint(), 'disabled Tab branching suppresses the hint');
  const disabledTab = await c.pressTab();
  assert(!disabledTab.defaultPrevented && vs.getActiveNode().id === rootId, 'disabled Tab does not create a branch');
  c.setTabEnabled(true); await delay(50);
  document.getSelection().removeAllRanges();
  const external = document.querySelector('#external');
  c.selectRange(external, 0, 12); await delay(50);
  assert(!hint(), 'selection in another panel does not show the hint');
  const externalText = document.getSelection().toString();
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
  assert(document.getSelection().toString() === externalText, 'Escape in another panel leaves its selection alone');
  document.getSelection().removeAllRanges();
  const input = document.querySelector('textarea');
  input.value = 'SelfAttention'; input.focus(); input.setSelectionRange(0, 13); await delay(50);
  assert(!hint(), 'composer text selection preserves normal input behavior');

  const userBody = document.querySelector('.bcm-message-user [data-spider-message-body]');
  c.selectRange(userBody, 0, 12); await delay(50);
  assert(!hint(), 'user-message selection does not advertise the AI shortcut');
  const answer = c.primaryAnswer();
  const fullText = answer.textContent;
  const start = fullText.indexOf('first part includes');
  const end = fullText.indexOf('completes the definition.') + 'completes the definition.'.length;
  [...answer.querySelectorAll('p')].find(p => p.textContent.startsWith('The first part')).scrollIntoView({ block:'center' });
  c.scroller().dispatchEvent(new Event('scroll'));
  const multi = c.selectRange(answer, start, end).toString(); await delay(50);
  hint().click(); await delay(140);
  assert(vs.getActiveNode().anchorText === multi.replace(/\s+/g, ' ').trim(), 'clicking the hint preserves a selection across strong and paragraph boundaries');
  await returnParent();
  assert(highlight()[0]?.toString() === multi, 'cross-paragraph source range is restored precisely');

  // Older saved branches did not include source offsets.
  vs.createChild('SelfAttention'); const legacy = vs.getActiveNode(); await delay(140);
  await returnParent();
  assert(!legacy.sourceMessageId && highlight()[0]?.toString() === 'SelfAttention', 'legacy branches still find their source text');

  const shifted = document.createElement('div');
  shifted.innerHTML = '<article class="bcm-message-assistant" data-spider-message-id="shifted"><div data-spider-message-body>New term A term</div></article>';
  assert(c.findSourceRange(shifted, {anchorText:'term', sourceMessageId:'shifted', sourceTextRange:{start:7,end:11}}) === null, 'a shifted ambiguous source never highlights the wrong repeated term');

  c.selectSecondOccurrence(); await delay(40);
  const box = hint().getBoundingClientRect();
  assert(box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight, 'hint stays inside the viewport');
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true})); await delay(40);
  assert(!hint() && document.getSelection().isCollapsed, 'Escape dismisses the selection hint');

  let resume, finish;
  const next = new Promise(resolve => { resume = resolve; });
  const done = new Promise(resolve => { finish = resolve; });
  const original = c.OpenAICompatibleProvider.prototype.streamChat;
  c.OpenAICompatibleProvider.prototype.streamChat = async function* () {
    yield 'StreamingSelection stays readable during output.';
    await next; yield '\n\nAdditional streamed content.';
    await done; yield '\n\nCompleted.';
  };
  try {
    vs.updateDraft(rootId, 'Check selection during streaming');
    const sending = vs.sendMessage(); await delay(160);
    const body = document.querySelector('.bcm-message-streaming [data-spider-message-body]');
    body.scrollIntoView({block:'center'}); c.scroller().dispatchEvent(new Event('scroll'));
    c.selectRange(body, 0, 18); await delay(40);
    resume(); await delay(160);
    assert(document.getSelection().toString() === 'StreamingSelection', 'stream rerender preserves the selected text');
    assert(hint(), 'stream rerender keeps the branch hint available');
    await c.pressTab();
    const streamingChild = vs.getActiveNode();
    finish(); await sending; await delay(160);
    await returnParent();
    assert(streamingChild.sourceMessageId && highlight()[0]?.toString() === 'StreamingSelection', 'branch created during streaming returns to the finalized answer');
  } finally { resume(); finish(); c.OpenAICompatibleProvider.prototype.streamChat = original; }
};

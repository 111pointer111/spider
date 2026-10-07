import { BranchChatMapSettingTab } from "../../src/settings";
import { buildExportFiles } from "../../src/export/exporters";

export function setupLearningChecks(plugin, checks) {
  const settingsTab = new BranchChatMapSettingTab(plugin.app, plugin);
  document.querySelector("#settings").append(settingsTab.containerEl);
  settingsTab.display();
  const { vs, view, rootId, siblingId, delay, assert } = checks;
  const key = async (options, target = document.body) => {
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...options });
    target.dispatchEvent(event);
    await delay(80);
    return event;
  };
  document.querySelector("#learning").addEventListener("click", async () => {
    document.querySelector("#results").textContent = "";
    try {
      await checks.switchNode(rootId);
      vs.updateNodeNote(rootId, "Existing insight");
      const count = vs.getActiveNode().messages.length;
      checks.selectSecondOccurrence();
      assert((await key()).defaultPrevented, "Enter handles a body-focused AI selection");
      assert(vs.getActiveNode().note === "Existing insight\n\n> SelfAttention", "Enter appends to existing node notes");
      assert(view.contentEl.querySelector(".bcm-inline-notes-snippet").textContent.includes("SelfAttention"), "saved quotes are visible without opening the notes panel");
      assert(vs.getActiveNode().messages.length === count && vs.getActiveNode().id === rootId, "saving a quote neither sends a question nor changes nodes");
      assert(document.getSelection().isCollapsed, "saved selection clears to prevent accidental duplicate Enter");
      await checks.switchNode(siblingId);
      assert(!vs.getActiveNode().note, "quotes remain on their originating node");
      await checks.switchNode(rootId);
      checks.setTabEnabled(false);
      checks.selectSecondOccurrence(); await delay(80);
      assert(!document.querySelector(".bcm-selection-branch-hint") && document.querySelector(".bcm-selection-note-hint"), "saving quotes remains discoverable with Tab disabled");
      document.querySelector(".bcm-selection-note-hint").click(); await delay(80);
      assert(vs.getActiveNode().note.endsWith("> SelfAttention\n\n> SelfAttention"), "clicking Save to notes appends the selected quote");
      checks.setTabEnabled(true);
      for (const modifier of ["shiftKey", "ctrlKey", "metaKey", "altKey", "isComposing"]) {
        checks.selectSecondOccurrence();
        assert(!(await key({ [modifier]: true })).defaultPrevented, `Enter preserves ${modifier}`);
      }
      const external = document.querySelector("#external");
      checks.selectRange(external, 0, 8);
      assert(!(await key()).defaultPrevented, "Enter preserves selections outside Spider");
      const user = view.contentEl.querySelector(".bcm-message-user [data-spider-message-body]");
      checks.selectRange(user, 0, 8);
      assert(!(await key()).defaultPrevented, "Enter does not quote user messages");
      document.getSelection().removeAllRanges();
      const summary = view.contentEl.querySelector(".bcm-inline-notes summary");
      summary.click();
      await delay(80);
      assert(view.contentEl.querySelector(".bcm-inline-notes-preview").textContent.includes("SelfAttention"), "expanded notes render a readable Markdown preview");
      view.contentEl.querySelector(".bcm-inline-notes-tools button").click();
      await delay(30);
      const editor = view.contentEl.querySelector("[data-spider-note-editor]");
      editor.focus();
      // React uses the native setter rather than an assignment that updates its value tracker.
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      setter.call(editor, "My insight with spaces ");
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      await delay(500);
      assert(editor.value.endsWith(" "), "autosaving keeps the trailing space in the active editor");
      setter.call(editor, "My insight with spaces \nand a second line!");
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      await checks.switchNode(siblingId);
      assert(vs.getSnapshot().map.nodes[rootId].note === "My insight with spaces \nand a second line!", "switching nodes flushes unsaved notes with spaces and newlines");
      const files = buildExportFiles(vs.getSnapshot().map, { language: "en" });
      const notes = files.find((file) => file.path === "notes.md").content;
      assert(notes.includes("My insight with spaces") && notes.includes("Depth: 0") && notes.includes(`ID: \`${rootId}\``), "note export preserves content and node identity");
      // Empty conversations exercise the original shrinking-panel defect and the error footer.
      await vs.createNewRootMap(); await delay(120);
      const bottomGap = () => Math.abs(view.contentEl.getBoundingClientRect().bottom - view.contentEl.querySelector(".bcm-composer").getBoundingClientRect().bottom);
      assert(bottomGap() < 2, "empty conversation composer is aligned to the panel bottom");
      await plugin.updateSettings({ apiKey: "" });
      vs.updateDraft(vs.getActiveNode().id, "Question"); await vs.sendMessage(); await delay(80);
      assert(view.contentEl.querySelector(".bcm-error") && bottomGap() < 2, "error messages keep the composer at the panel bottom");
      await plugin.updateSettings({ apiKey: "local-test" });
      settingsTab.display();
      assert(settingsTab.containerEl.querySelectorAll(".spider-settings-section").length === 5, "settings groups retain all controls");
      document.querySelector("#results").textContent += "ALL LEARNING EXPERIENCE CHECKS PASSED\n";
    } catch (error) {
      document.querySelector("#results").textContent += "FAIL " + (error.stack ?? error.message);
      console.error(error);
    }
  });
  window.spiderSettingsTab = settingsTab;
}

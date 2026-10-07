import { describe, expect, it, vi } from "vitest";
import { OpenAICompatibleProvider } from "../src/ai/openAICompatibleProvider";
import { appendMessage, createMessage, createRootMap, addChildNode, updateNode } from "../src/domain/chatMap";
import { ViewState } from "../src/state/viewState";
import type BranchChatMapPlugin from "../src/main";
import type { BranchChatMapSettings, ChatMap } from "../src/types";

const settings: BranchChatMapSettings = {
  language: "zh-CN",
  apiBaseUrl: "https://example.test/v1",
  apiKey: "test-key",
  model: "test-model",
  defaultExportFolder: "Spider Maps",
  useTabToCreateChildNodes: true,
  autoSummarizeNodes: false,
  includeParentContext: true,
  includeFullContext: false,
  streamResponses: true,
  onboardingCardDismissed: false,
  teachingStyle: "default",
  customSystemPrompt: "",
};

function createViewState(initialMap: ChatMap, settingsOverride: Partial<BranchChatMapSettings> = {}): ViewState {
  const plugin = {
    settings: { ...settings, ...settingsOverride },
    saveSettings: async () => {},
  } as BranchChatMapPlugin;

  const repository = {
    saveMap: async () => {},
    listMaps: async () => [],
    deleteMap: async () => true,
    loadMap: async () => null,
    loadLatestMap: async () => null,
    writeExport: async (_folder: string, path: string) => path,
  };

  return new ViewState(plugin, repository as never, initialMap);
}

describe("ViewState", () => {
  it("appends multiline quotes to the originating node without overwriting notes or sibling notes", () => {
    const root = createRootMap("Topic", "Root");
    const { map, child } = addChildNode(root, root.rootNodeId, { title: "Child" });
    const vs = createViewState(updateNode(map, root.rootNodeId, { note: "自己的理解" }));
    vs.setActiveNode(child.id);
    expect(vs.appendSelectionToNote(root.rootNodeId, "  第一行\n第二行  ")).toBe(true);
    expect(vs.getSnapshot().map?.nodes[root.rootNodeId]?.note).toBe("自己的理解\n\n> 第一行\n> 第二行");
    expect(vs.getActiveNode()?.note).toBeUndefined();
    expect(vs.appendSelectionToNote("missing", "quote")).toBe(false);
    expect(vs.appendSelectionToNote(child.id, "  ")).toBe(false);
  });
  it("preserves new branches, notes, and status while streaming and generating metadata", async () => {
    let finishStream!: () => void;
    let streamReady!: () => void;
    let finishTitle!: (title: string) => void;
    let titleReady!: () => void;
    const streamPaused = new Promise<void>((resolve) => { finishStream = resolve; });
    const firstChunk = new Promise<void>((resolve) => { streamReady = resolve; });
    const titlePaused = new Promise<string>((resolve) => { finishTitle = resolve; });
    const titleStarted = new Promise<void>((resolve) => { titleReady = resolve; });
    const stream = vi.spyOn(OpenAICompatibleProvider.prototype, "streamChat").mockImplementation(async function* () {
      yield "部分回答";
      streamReady();
      await streamPaused;
      yield "，完成";
    });
    const title = vi.spyOn(OpenAICompatibleProvider.prototype, "titleNode").mockImplementation(() => {
      titleReady();
      return titlePaused;
    });

    try {
      const map = createRootMap();
      const vs = createViewState(map);
      vs.updateDraft(map.rootNodeId, "Explain branching");
      const sending = vs.sendMessage();
      await firstChunk;
      const sourceMessageId = vs.getSnapshot().streamingMessages[map.rootNodeId]!.id;
      vs.createChild("部分回答", { messageId: sourceMessageId, start: 0, end: 4 });
      const childId = vs.getSnapshot().activeNodeId!;
      vs.updateNodeNote(map.rootNodeId, "流式期间的理解");
      vs.markUnderstood();
      finishStream();
      await titleStarted;
      vs.updateNodeNote(map.rootNodeId, "等待标题期间的新理解");
      finishTitle("分支探索");
      await sending;

      const snapshot = vs.getSnapshot();
      expect(snapshot.map?.nodes[map.rootNodeId]?.messages.at(-1)?.content).toBe("部分回答，完成");
      expect(snapshot.map?.nodes[map.rootNodeId]?.note).toBe("等待标题期间的新理解");
      expect(snapshot.map?.nodes[map.rootNodeId]?.children).toContain(childId);
      expect(snapshot.map?.nodes[childId]?.status).toBe("understood");
      expect(snapshot.map?.nodes[childId]?.sourceMessageId).toBe(sourceMessageId);
      expect(snapshot.map?.nodes[childId]?.sourceTextRange).toEqual({ start: 0, end: 4 });
      expect(snapshot.map?.nodes[map.rootNodeId]?.messages.at(-1)?.id).toBe(sourceMessageId);
      expect(snapshot.map?.edges.some((edge) => edge.from === map.rootNodeId && edge.to === childId)).toBe(true);
      expect(snapshot.map?.title).toBe("分支探索");
      expect(snapshot.activeNodeId).toBe(childId);
    } finally {
      finishStream();
      finishTitle("分支探索");
      stream.mockRestore();
      title.mockRestore();
    }
  });

  it.each(["delete-node", "switch-map"])("does not restore stale streaming results after %s", async (action) => {
    let finishStream!: () => void;
    let streamReady!: () => void;
    const paused = new Promise<void>((resolve) => { finishStream = resolve; });
    const ready = new Promise<void>((resolve) => { streamReady = resolve; });
    const stream = vi.spyOn(OpenAICompatibleProvider.prototype, "streamChat").mockImplementation(async function* () {
      yield "部分回答";
      streamReady();
      await paused;
      yield "，完成";
    });
    try {
      const map = createRootMap("Existing", "Existing");
      const { map: withChild, child } = addChildNode(map, map.rootNodeId, { title: "Child" });
      const vs = createViewState(withChild);
      vs.setActiveNode(child.id);
      vs.updateDraft(child.id, "Explain branching");
      const sending = vs.sendMessage();
      await ready;
      if (action === "delete-node") vs.deleteNode(child.id);
      else await vs.createNewRootMap();
      const expectedMap = vs.getSnapshot().map;
      finishStream();
      await sending;
      expect(vs.getSnapshot().map).toBe(expectedMap);
      expect(vs.getSnapshot().map?.nodes[child.id]).toBeUndefined();
      expect(vs.getSnapshot().error).toBeNull();
      expect(vs.getSnapshot().streamingMessages).toEqual({});
    } finally {
      finishStream();
      stream.mockRestore();
    }
  });

  it("batches streaming bursts and preserves the final tokens without delayed updates", async () => {
    vi.useFakeTimers();
    let finishStream!: () => void;
    let burstReady!: () => void;
    const paused = new Promise<void>((resolve) => { finishStream = resolve; });
    const ready = new Promise<void>((resolve) => { burstReady = resolve; });
    const stream = vi.spyOn(OpenAICompatibleProvider.prototype, "streamChat").mockImplementation(async function* () {
      yield "你";
      yield "好";
      yield "，";
      burstReady();
      await paused;
      yield "世界";
    });

    try {
      const map = createRootMap("Streaming", "Streaming");
      const vs = createViewState(map);
      vs.updateDraft(map.rootNodeId, "Explain streaming");
      const updates: string[] = [];
      vs.subscribe(() => {
        const content = vs.getSnapshot().streamingMessages[map.rootNodeId]?.content;
        if (content) updates.push(content);
      });
      const sending = vs.sendMessage();
      await ready;
      const messageId = vs.getSnapshot().streamingMessages[map.rootNodeId]?.id;
      expect(messageId).toBeTruthy();
      expect(updates).toEqual([]);

      await vi.advanceTimersByTimeAsync(32);
      expect(updates).toEqual(["你好，"]);

      finishStream();
      await sending;
      expect(vs.getSnapshot().map?.nodes[map.rootNodeId]?.messages.at(-1)?.content).toBe("你好，世界");
      expect(vs.getSnapshot().map?.nodes[map.rootNodeId]?.messages.at(-1)?.id).toBe(messageId);
      expect(vs.getSnapshot().streamingMessages).toEqual({});
      expect(vs.getSnapshot().pendingNodeId).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
      const updateCount = updates.length;
      await vi.runAllTimersAsync();
      expect(updates).toHaveLength(updateCount);
    } finally {
      finishStream();
      stream.mockRestore();
      vi.useRealTimers();
    }
  });

  it("cancels a pending stream update while retaining the partial answer", async () => {
    vi.useFakeTimers();
    let stopStream!: () => void;
    let chunkReady!: () => void;
    const paused = new Promise<void>((resolve) => { stopStream = resolve; });
    const ready = new Promise<void>((resolve) => { chunkReady = resolve; });
    const stream = vi.spyOn(OpenAICompatibleProvider.prototype, "streamChat").mockImplementation(async function* () {
      yield "部分回答";
      chunkReady();
      await paused;
      throw new DOMException("Aborted", "AbortError");
    });

    try {
      const map = createRootMap("Cancel streaming", "Cancel streaming");
      const vs = createViewState(map);
      vs.updateDraft(map.rootNodeId, "Explain streaming");
      const sending = vs.sendMessage();
      await ready;
      const messageId = vs.getSnapshot().streamingMessages[map.rootNodeId]?.id;
      vs.createChild("部分回答");
      const childId = vs.getSnapshot().activeNodeId!;
      vs.updateNodeNote(map.rootNodeId, "停止前写下的理解");
      vs.cancelGeneration();
      await vi.advanceTimersByTimeAsync(32);
      expect(vs.getSnapshot().streamingMessages[map.rootNodeId]?.content).toBe("");
      stopStream();
      await sending;
      expect(vs.getSnapshot().map?.nodes[map.rootNodeId]?.messages.at(-1)?.content).toBe("部分回答");
      expect(vs.getSnapshot().map?.nodes[map.rootNodeId]?.messages.at(-1)?.id).toBe(messageId);
      expect(vs.getSnapshot().map?.nodes[childId]).toBeDefined();
      expect(vs.getSnapshot().map?.nodes[map.rootNodeId]?.note).toBe("停止前写下的理解");
      expect(vs.getSnapshot().streamingMessages).toEqual({});
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      stopStream();
      stream.mockRestore();
      vi.useRealTimers();
    }
  });

  it("keeps full anchor text but truncates the child draft prompt", () => {
    const map = createRootMap("Long anchor");
    const vs = createViewState(map);
    const anchor = "自注意力机制".repeat(30);

    vs.createChild(anchor);

    const snapshot = vs.getSnapshot();
    const child = snapshot.activeNodeId ? snapshot.map?.nodes[snapshot.activeNodeId] : undefined;
    expect(child?.anchorText).toBe(anchor);
    expect(child?.sourceMessageId).toBeUndefined();
    expect(child?.sourceTextRange).toBeUndefined();
    expect(snapshot.activeNodeId ? snapshot.drafts[snapshot.activeNodeId]?.length : 0).toBeLessThan(anchor.length);
  });

  it("records valid assistant sources only from the current parent", () => {
    const rootMap = createRootMap("Selection sources");
    const assistant = createMessage("assistant", "🧠 **注意力**与注意力");
    const user = createMessage("user", "什么是注意力？");
    const foreignAssistant = createMessage("assistant", "另一个节点的注意力");
    const withMessages = appendMessage(appendMessage(rootMap, rootMap.rootNodeId, user), rootMap.rootNodeId, assistant);
    const other = addChildNode(withMessages, rootMap.rootNodeId);
    const map = appendMessage(other.map, other.child.id, foreignAssistant);

    for (const [source, accepted] of [
      [{ messageId: assistant.id, start: 7, end: 10 }, true],
      [{ messageId: user.id, start: 0, end: 3 }, false],
      [{ messageId: foreignAssistant.id, start: 0, end: 3 }, false],
      [{ messageId: "missing", start: 0, end: 3 }, false],
      [{ messageId: assistant.id, start: 0, end: Infinity }, false],
      [{ messageId: assistant.id, start: 3, end: 3 }, false],
    ] as const) {
      const vs = createViewState(map);
      vs.createChild("注意力", source);
      const child = vs.getActiveNode();
      expect(child?.anchorText).toBe("注意力");
      expect(child?.sourceMessageId).toBe(accepted ? assistant.id : undefined);
      expect(child?.sourceTextRange).toEqual(accepted ? { start: 7, end: 10 } : undefined);
    }
  });

  it("counts node subtrees including the selected node", () => {
    const rootMap = createRootMap("Tree");
    const first = addChildNode(rootMap, rootMap.rootNodeId);
    const second = addChildNode(first.map, first.child.id);
    const vs = createViewState(second.map);

    expect(vs.countNodeSubtree(first.child.id)).toBe(2);
    expect(vs.countNodeSubtree(second.child.id)).toBe(1);
  });

  it("searches titles, summaries, anchors, and messages", () => {
    const rootMap = createRootMap("Transformer map", "Transformer root");
    const child = addChildNode(rootMap, rootMap.rootNodeId, { anchorText: "embedding" });
    const withMessage = appendMessage(child.map, child.child.id, createMessage("user", "What is vector search?"));
    const finalMap = updateNode(withMessage, child.child.id, { summary: "Vector search summary" });
    const vs = createViewState(finalMap);

    expect(vs.searchNodes("transformer").map((result) => result.node.id)).toContain(rootMap.rootNodeId);
    expect(vs.searchNodes("embedding").map((result) => result.node.id)).toContain(child.child.id);
    expect(vs.searchNodes("vector").map((result) => result.node.id)).toContain(child.child.id);
    expect(vs.searchNodes("")).toEqual([]);
  });

  it("stores and searches a personal node note without touching the AI summary", () => {
    const stableMap = createRootMap("Notes");
    const vs = createViewState(stableMap);

    vs.updateNodeNote(stableMap.rootNodeId, "这是我自己的研究判断");

    const node = vs.getSnapshot().map?.nodes[stableMap.rootNodeId];
    expect(node?.note).toBe("这是我自己的研究判断");
    expect(node?.summary).toBeUndefined();
    expect(vs.searchNodes("研究判断").map((result) => result.node.id)).toContain(stableMap.rootNodeId);

    vs.updateNodeNote(stableMap.rootNodeId, "   ");
    expect(vs.getSnapshot().map?.nodes[stableMap.rootNodeId]?.note).toBeUndefined();
  });

  it("preserves the draft when AI configuration is incomplete", async () => {
    const map = createRootMap("Missing configuration");
    const vs = createViewState(map, { language: "en", apiKey: "" });
    vs.updateDraft(map.rootNodeId, "Explain retrieval augmented generation");

    await vs.sendMessage();

    const snapshot = vs.getSnapshot();
    expect(snapshot.map?.nodes[map.rootNodeId]?.messages).toHaveLength(0);
    expect(snapshot.drafts[map.rootNodeId]).toBe("Explain retrieval augmented generation");
    expect(snapshot.error).toBe("Missing API key. Add one in Spider settings.");
  });
});

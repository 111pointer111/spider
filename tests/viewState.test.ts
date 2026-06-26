import { describe, expect, it } from "vitest";
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
};

function createViewState(initialMap: ChatMap): ViewState {
  const plugin = {
    settings: { ...settings },
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
  it("keeps full anchor text but truncates the child draft prompt", () => {
    const map = createRootMap("Long anchor");
    const vs = createViewState(map);
    const anchor = "自注意力机制".repeat(30);

    vs.createChild(anchor);

    const snapshot = vs.getSnapshot();
    const child = snapshot.activeNodeId ? snapshot.map?.nodes[snapshot.activeNodeId] : undefined;
    expect(child?.anchorText).toBe(anchor);
    expect(snapshot.activeNodeId ? snapshot.drafts[snapshot.activeNodeId]?.length : 0).toBeLessThan(anchor.length);
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
});

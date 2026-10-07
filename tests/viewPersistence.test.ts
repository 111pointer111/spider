import { describe, expect, it } from "vitest";
import type { WorkspaceLeaf } from "obsidian";
import { BranchChatMapView } from "../src/view";
import { ViewState } from "../src/state/viewState";
import { createRootMap, addChildNode } from "../src/domain/chatMap";
import type BranchChatMapPlugin from "../src/main";

describe("Obsidian tab persistence", () => {
  it("restores each tab's map and reading node independently", async () => {
    const plugin = {} as BranchChatMapPlugin;
    const firstMap = createRootMap("First map");
    // Build a real branch under its own root rather than sharing another tab's node.
    const secondRoot = createRootMap("Second map");
    const { map: secondMap, child } = addChildNode(secondRoot, secondRoot.rootNodeId, { title: "Reading here" });
    const first = new BranchChatMapView({} as WorkspaceLeaf, plugin);
    const other = new BranchChatMapView({} as WorkspaceLeaf, plugin);
    Object.assign(first, { viewState: new ViewState(plugin, {} as never, firstMap) });
    Object.assign(other, { viewState: new ViewState(plugin, {} as never, secondMap) });
    await first.setState({ mapId: firstMap.id, activeNodeId: firstMap.rootNodeId }, { history: false });
    await other.setState({ mapId: secondMap.id, activeNodeId: child.id }, { history: false });
    expect(first.getState()).toEqual({ mapId: firstMap.id, activeNodeId: firstMap.rootNodeId });
    expect(other.getState()).toEqual({ mapId: secondMap.id, activeNodeId: child.id });
  });
});

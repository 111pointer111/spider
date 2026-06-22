import { describe, expect, it } from "vitest";
import { addChildNode, createRootMap, getAncestorPath } from "../src/domain/chatMap";

describe("chat map domain", () => {
  it("creates child and grandchild nodes with Tab-style branching", () => {
    const rootMap = createRootMap("Transformer map");
    const first = addChildNode(rootMap, rootMap.rootNodeId, {
      anchorText: "Self-Attention",
    });
    const second = addChildNode(first.map, first.child.id, {
      anchorText: "Query Key Value",
    });

    expect(first.child.parentId).toBe(rootMap.rootNodeId);
    expect(first.child.anchorText).toBe("Self-Attention");
    expect(second.child.parentId).toBe(first.child.id);
    expect(second.map.nodes[rootMap.rootNodeId]?.children).toEqual([first.child.id]);
    expect(second.map.nodes[first.child.id]?.children).toEqual([second.child.id]);
  });

  it("returns parent path for Shift+Tab navigation", () => {
    const rootMap = createRootMap();
    const first = addChildNode(rootMap, rootMap.rootNodeId);
    const second = addChildNode(first.map, first.child.id);

    const path = getAncestorPath(second.map, second.child.id);

    expect(path.map((node) => node.id)).toEqual([rootMap.rootNodeId, first.child.id, second.child.id]);
  });
});

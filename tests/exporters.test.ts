import { describe, expect, it } from "vitest";
import { addChildNode, appendMessage, createMessage, createRootMap, updateNode } from "../src/domain/chatMap";
import { buildExportFiles, exportCanvas, exportMarkdown, exportMermaidMindmap } from "../src/export/exporters";

describe("exporters", () => {
  it("exports markdown, mermaid, and canvas with node content", () => {
    const rootMap = createRootMap("AI learning");
    const childResult = addChildNode(rootMap, rootMap.rootNodeId, {
      anchorText: "embedding",
    });
    const withMessage = appendMessage(childResult.map, childResult.child.id, createMessage("user", "What is embedding?"));
    const finalMap = updateNode(withMessage, childResult.child.id, {
      summary: "Embedding maps tokens into vectors.",
    });

    expect(exportMarkdown(finalMap)).toContain("Embedding maps tokens into vectors.");
    expect(exportMermaidMindmap(finalMap)).toContain("embedding");

    const canvas = JSON.parse(exportCanvas(finalMap)) as { nodes: unknown[]; edges: unknown[] };
    expect(canvas.nodes).toHaveLength(2);
    expect(canvas.edges).toHaveLength(1);

    const files = buildExportFiles(finalMap);
    expect(files.map((file) => file.path)).toEqual(
      expect.arrayContaining(["README.md", "diagrams/mindmap.mermaid.md", "canvas/map.canvas", "data/map.json"]),
    );
    expect(files.some((file) => file.path.startsWith("nodes/") && file.content.includes("## 对话记录"))).toBe(true);
  });
});

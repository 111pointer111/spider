import { describe, expect, it } from "vitest";
import { addChildNode, appendMessage, createMessage, createRootMap, updateNode } from "../src/domain/chatMap";
import { buildExportFiles, exportCanvas, exportMarkdown, exportMermaidMindmap } from "../src/export/exporters";
import type { JsonCanvasFile } from "../src/export/exporters";

describe("exporters", () => {
  it("exports markdown, mermaid, and canvas with node content", () => {
    const rootMap = createRootMap("AI learning");
    const childResult = addChildNode(rootMap, rootMap.rootNodeId, {
      anchorText: "embedding",
    });
    const withMessage = appendMessage(childResult.map, childResult.child.id, createMessage("user", "What is embedding?"));
    const finalMap = updateNode(withMessage, childResult.child.id, {
      summary: "Embedding maps tokens into vectors.",
      status: "understood",
    });

    expect(exportMarkdown(finalMap)).toContain("Embedding maps tokens into vectors.");
    expect(exportMermaidMindmap(finalMap)).toContain("embedding");

    const canvas = JSON.parse(exportCanvas(finalMap)) as JsonCanvasFile;
    const fileNodes = canvas.nodes.filter((node) => node.type === "file");
    expect(canvas.nodes.some((node) => node.type === "group")).toBe(true);
    expect(canvas.nodes.some((node) => node.type === "text" && node.id === "overview")).toBe(true);
    expect(fileNodes).toHaveLength(2);
    expect(fileNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: "nodes/02-embedding.md",
          subpath: "#Canvas 卡片",
          color: "4",
        }),
        expect.objectContaining({
          file: "nodes/01-Root-question.md",
          color: "6",
        }),
      ]),
    );
    expect(canvas.edges).toHaveLength(1);
    expect(canvas.edges[0]).toMatchObject({
      label: "embedding",
      color: "4",
      toEnd: "arrow",
    });

    const exportedCanvas = JSON.parse(exportCanvas(finalMap, { exportFolder: "Spider Maps/AI learning" })) as JsonCanvasFile;
    expect(exportedCanvas.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "file",
          file: "Spider Maps/AI learning/nodes/02-embedding.md",
        }),
      ]),
    );

    const files = buildExportFiles(finalMap);
    expect(files.map((file) => file.path)).toEqual(
      expect.arrayContaining(["README.md", "index.md", "diagrams/mindmap.mermaid.md", "canvas/map.canvas", "data/map.json"]),
    );

    const readme = files.find((file) => file.path === "README.md");
    expect(readme?.content).toContain("[index.md](index.md)");

    const index = files.find((file) => file.path === "index.md");
    expect(index?.content).toContain("## 快速信息");
    expect(index?.content).toContain("## 推荐阅读路线");
    expect(index?.content).toContain("[canvas/map.canvas](canvas/map.canvas)");

    const rootNode = files.find((file) => file.path.startsWith("nodes/01-"));
    expect(rootNode?.content).toContain("## Canvas 卡片");
    expect(rootNode?.content).toContain("[AI learning](../index.md)");
    expect(rootNode?.content).toContain("[map.canvas](../canvas/map.canvas)");
    expect(rootNode?.content).toContain("[embedding](02-embedding.md)");

    const childNode = files.find((file) => file.path.startsWith("nodes/02-"));
    expect(childNode?.content).toContain("[Root question](01-Root-question.md)");
    expect(childNode?.content).toContain("## 对话记录");
    expect(childNode?.content).toContain("> [!question]");
  });
});

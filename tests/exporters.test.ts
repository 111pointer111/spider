import { describe, expect, it } from "vitest";
import { addChildNode, appendMessage, createMessage, createRootMap, updateNode } from "../src/domain/chatMap";
import { buildExportFiles, exportCanvas, exportMarkdown, exportMermaidMindmap } from "../src/export/exporters";
import type { JsonCanvasFile } from "../src/export/exporters";

function cardText(canvas: JsonCanvasFile, nodeId: string): string {
  const card = canvas.nodes.find((node) => node.id === nodeId);
  expect(card?.type).toBe("text");
  return card?.type === "text" ? card.text : "";
}

describe("exporters", () => {
  it("exports quoted notes with node paths, explicit depth, and links in both languages", () => {
    const root = createRootMap("Physics", "Mechanics");
    const { map, child } = addChildNode(root, root.rootNodeId, { title: "Inertia" });
    const noted = updateNode(updateNode(map, root.rootNodeId, { note: "My overview" }), child.id, { note: "> An important insight\n\nMy interpretation" });
    for (const language of ["zh-CN", "en"] as const) {
      const files = buildExportFiles(noted, { language });
      const notes = files.find((file) => file.path === "notes.md")!.content;
      expect(notes).toContain("## Mechanics");
      expect(notes).toContain("### Inertia");
      expect(notes).toContain("Mechanics / Inertia");
      expect(notes).toContain(language === "en" ? "Depth: 1" : "层级: 1");
      expect(notes).toContain("> An important insight\n\nMy interpretation");
      expect(notes).toContain(`[Inertia](nodes/${files.find((file) => file.path.startsWith("nodes/02-"))!.path.slice(6)})`);
      expect(files.find((file) => file.path === "index.md")!.content).toContain("[notes.md](notes.md)");
    }
  });
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
    const conceptCards = canvas.nodes.filter((node) => node.id !== "overview");
    expect(canvas.nodes.every((node) => node.type === "text")).toBe(true);
    expect(canvas.nodes.some((node) => node.type === "text" && node.id === "overview")).toBe(true);
    expect(conceptCards).toHaveLength(2);
    expect(conceptCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: childResult.child.id,
          text: expect.stringContaining("Embedding maps tokens into vectors."),
          color: "4",
        }),
        expect.objectContaining({
          id: rootMap.rootNodeId,
          color: "6",
        }),
      ]),
    );
    expect(canvas.edges).toHaveLength(1);
    expect(canvas.edges[0]).toMatchObject({
      color: "4",
      toEnd: "arrow",
    });
    expect(canvas.edges[0]).not.toHaveProperty("label");
    expect(cardText(canvas, childResult.child.id)).toContain("nodes/02-embedding.md");

    const exportedCanvas = JSON.parse(exportCanvas(finalMap, { exportFolder: "Spider Maps/AI learning" })) as JsonCanvasFile;
    expect(decodeURI(cardText(exportedCanvas, childResult.child.id))).toContain("Spider Maps/AI learning/nodes/02-embedding.md");

    const files = buildExportFiles(finalMap);
    expect(files.map((file) => file.path)).toEqual([
      "index.md",
      "brief.md",
      "notes.md",
      expect.stringMatching(/^nodes\/01-/),
      expect.stringMatching(/^nodes\/02-/),
      "map.canvas",
      "map.svg",
    ]);

    const index = files.find((file) => file.path === "index.md");
    expect(index?.content).toContain("## 快速信息");
    expect(index?.content).toContain("## 推荐阅读路线");
    expect(index?.content).toContain("[map.canvas](map.canvas)");
    expect(index?.content).toContain("[brief.md](brief.md)");

    const brief = files.find((file) => file.path === "brief.md");
    expect(brief?.content).toContain("## 关键结论");
    expect(brief?.content).toContain("Embedding maps tokens into vectors.");
    expect(brief?.content).toContain("## 待研究问题");

    const rootNode = files.find((file) => file.path.startsWith("nodes/01-"));
    expect(rootNode?.content).toContain("## Canvas 卡片");
    expect(rootNode?.content).toContain("[AI learning](../index.md)");
    expect(rootNode?.content).toContain("[map.canvas](../map.canvas)");
    expect(rootNode?.content).toContain("[embedding](02-embedding.md)");

    const childNode = files.find((file) => file.path.startsWith("nodes/02-"));
    expect(childNode?.content).toContain("[Root question](01-Root-question.md)");
    expect(childNode?.content).toContain("## 对话记录");
    expect(childNode?.content).toContain("> [!question]");
  });

  it("exports user-facing files in English when requested", () => {
    const map = createRootMap("AI learning");
    const files = buildExportFiles(map, { language: "en" });
    const index = files.find((file) => file.path === "index.md");
    const canvas = JSON.parse(files.find((file) => file.path === "map.canvas")?.content ?? "{}") as JsonCanvasFile;

    expect(index?.content).toContain("## Quick info");
    expect(index?.content).toContain("No conversation yet");
    expect(canvas.nodes.some((node) => node.type === "text" && node.text.includes("Overview"))).toBe(true);
    expect(cardText(canvas, map.rootNodeId)).toContain("No conversation yet");
    expect(cardText(canvas, map.rootNodeId)).not.toContain("暂无");
  });

  it("exports personal notes as first-class research findings", () => {
    const map = createRootMap("Research notes");
    const notedMap = updateNode(map, map.rootNodeId, {
      note: "我的判断：先验证核心假设，再扩展实现。",
      summary: "AI 生成的总结。",
    });
    const files = buildExportFiles(notedMap);
    const brief = files.find((file) => file.path === "brief.md");
    const rootNode = files.find((file) => file.path.startsWith("nodes/01-"));

    expect(brief?.content).toContain("我的判断：先验证核心假设，再扩展实现。");
    expect(rootNode?.content).toContain("> [!note] 我的笔记");
    expect(rootNode?.content).toContain("AI 生成的总结。");
  });

  it("leaves clear gaps throughout a wide, deep, uneven tree without changing the map", () => {
    let map = createRootMap("Layout regression");
    const branchIds: string[] = [];
    for (let index = 0; index < 8; index += 1) {
      const result = addChildNode(map, map.rootNodeId, { title: `Branch ${index}` });
      map = result.map;
      branchIds.push(result.child.id);
    }
    let parentId = branchIds[0]!;
    for (let depth = 0; depth < 5; depth += 1) {
      const result = addChildNode(map, parentId, { title: `Deep concept ${depth}` });
      map = result.map;
      parentId = result.child.id;
    }
    for (let index = 0; index < 4; index += 1) {
      map = addChildNode(map, branchIds[3]!, { title: `Uneven leaf ${index}` }).map;
    }
    const original = structuredClone(map);
    const canvas = JSON.parse(exportCanvas(map)) as JsonCanvasFile;
    const cards = canvas.nodes.filter((node) => node.id !== "overview");
    const overview = canvas.nodes.find((node) => node.id === "overview")!;

    expect(cards.map((card) => card.id).sort()).toEqual(Object.keys(map.nodes).sort());
    for (const card of cards) {
      expect(card).toMatchObject({ type: "text", width: 400, height: 320 });
      expect(Number.isInteger(card.x) && Number.isInteger(card.y)).toBe(true);
      expect(overview.y + overview.height).toBeLessThanOrEqual(card.y);
    }
    for (let index = 0; index < cards.length; index += 1) {
      for (const other of cards.slice(index + 1)) {
        const card = cards[index]!;
        const horizontalGap = Math.max(other.x - card.x - card.width, card.x - other.x - other.width);
        const verticalGap = Math.max(other.y - card.y - card.height, card.y - other.y - other.height);
        expect(horizontalGap >= 220 || verticalGap >= 120).toBe(true);
      }
    }
    for (const edge of canvas.edges) {
      expect(cards.some((card) => card.id === edge.fromNode)).toBe(true);
      expect(cards.some((card) => card.id === edge.toNode)).toBe(true);
      expect(edge).toMatchObject({ fromSide: "right", toSide: "left", toEnd: "arrow" });
      expect(edge).not.toHaveProperty("label");
    }
    expect(exportCanvas(map)).toBe(exportCanvas(map));
    expect(map).toEqual(original);
  });

  it("uses the best available content and falls back to the latest AI response", () => {
    let map = createRootMap("Preview sources", "概念");
    map = updateNode(map, map.rootNodeId, {
      note: "个人判断优先。",
      summary: "已有总结其次。",
      anchorText: "选中原文最后。",
      messages: [
        createMessage("user", "第一条问题。"),
        createMessage("assistant", "较早回答。"),
        createMessage("user", "后续问题。"),
        createMessage("assistant", "最新回答解释了概念。"),
      ],
    });
    for (const [expected, source, patch] of [
      ["个人判断优先。", "我的笔记", {}],
      ["已有总结其次。", "节点总结", { note: " \n " }],
      ["最新回答解释了概念。", "回答节选", { summary: "\n" }],
      ["第一条问题。", "问题", { messages: [createMessage("user", "第一条问题。"), createMessage("user", "后续问题。")] }],
      ["选中原文最后。", "问题", { messages: [] }],
      ["暂无对话", "", { anchorText: " " }],
    ] satisfies Array<[string, string, Parameters<typeof updateNode>[2]]>) {
      map = updateNode(map, map.rootNodeId, patch);
      const canvas = JSON.parse(exportCanvas(map)) as JsonCanvasFile;
      const text = cardText(canvas, map.rootNodeId);
      expect(text).toContain(expected);
      if (source) expect(text).toContain(`**${source}**`);
      expect(text).not.toContain("较早回答。");
    }
    map = appendMessage(map, map.rootNodeId, createMessage("assistant", "An answer excerpt."));
    const englishCanvas = JSON.parse(exportCanvas(map, { language: "en" })) as JsonCanvasFile;
    expect(cardText(englishCanvas, map.rootNodeId)).toContain("**Answer excerpt**");
    expect(cardText(englishCanvas, map.rootNodeId)).toContain("Open full note ↗");
  });

  it("keeps long Markdown previews compact while preserving complete notes and working links", () => {
    const title = "**概念** [参考](地址) " + "这是一个很长的概念标题".repeat(8);
    const note = "# 核心要点\n\n- **向量**用于语义检索。\n".repeat(30) + "这段结尾只应保留在完整笔记。";
    let map = createRootMap("长内容导出", title);
    map = updateNode(map, map.rootNodeId, { note });
    const exportFolder = "Spider Maps/中文概念 (本周)#索引";
    const files = buildExportFiles(map, { exportFolder });
    const canvas = JSON.parse(files.find((file) => file.path === "map.canvas")!.content) as JsonCanvasFile;
    const text = cardText(canvas, map.rootNodeId);
    const heading = text.split("\n")[0]!.replace(/^#+\s*/, "");
    const visibleHeading = heading.replace(/\\([\\`*_{}\[\]()#+.!|<>-])/g, "$1");
    const preview = text.match(/\*\*我的笔记\*\*\n\n([^\n]*)/)?.[1] ?? "";
    const visiblePreview = preview.replace(/\\([\\`*_{}\[\]()#+.!|<>-])/g, "$1");
    const linkTarget = text.match(/\]\(([^)]+)\)\s*$/)?.[1] ?? "";
    const fullNote = files.find((file) => file.path.startsWith("nodes/"))!;

    expect(visibleHeading.length).toBeLessThanOrEqual(40);
    expect(heading).toContain("\\*\\*概念\\*\\*");
    expect(text).toContain("向量");
    expect(text).not.toContain("# 核心要点");
    expect(text).not.toContain("这段结尾只应保留在完整笔记。");
    expect(visiblePreview.length).toBeLessThanOrEqual(100);
    expect(visiblePreview).toContain("向量用于语义检索。");
    expect(visiblePreview).toMatch(/…$/);
    expect(fullNote.content).toContain(title);
    expect(fullNote.content).toContain("这段结尾只应保留在完整笔记。");
    expect(decodeURIComponent(linkTarget)).toBe(`${exportFolder}/${fullNote.path}`);
    for (const encoded of ["%20", "%28", "%29", "%23"]) expect(linkTarget).toContain(encoded);
  });

  it("distinguishes archived, open, and understood concepts without adding edge labels", () => {
    let map = createRootMap("Progress states");
    for (const status of ["open", "understood", "archived"] as const) {
      const result = addChildNode(map, map.rootNodeId, { title: status });
      map = updateNode(result.map, result.child.id, { status });
    }
    const canvas = JSON.parse(exportCanvas(map, { language: "en" })) as JsonCanvasFile;
    for (const [status, color, label] of [
      ["open", "5", "Open"],
      ["understood", "4", "Understood"],
      ["archived", "#9ca3af", "Archived"],
    ]) {
      const node = Object.values(map.nodes).find((candidate) => candidate.title === status)!;
      expect(canvas.nodes.find((card) => card.id === node.id)?.color).toBe(color);
      expect(cardText(canvas, node.id)).toContain(label);
      expect(canvas.edges.find((edge) => edge.toNode === node.id)?.color).toBe(color);
    }
  });

  it("exports readable single-node and missing-root canvases", () => {
    const map = createRootMap("Empty exploration");
    const canvas = JSON.parse(exportCanvas(map)) as JsonCanvasFile;
    expect(canvas.nodes).toHaveLength(2);
    expect(cardText(canvas, map.rootNodeId)).toContain("暂无对话");
    expect(canvas.edges).toEqual([]);

    const missingRootCanvas = JSON.parse(exportCanvas({ ...map, nodes: {} })) as JsonCanvasFile;
    expect(missingRootCanvas.nodes).toHaveLength(1);
    expect(cardText(missingRootCanvas, "overview")).toContain("缺少根节点");
    expect(missingRootCanvas.edges).toEqual([]);
  });

  it("exports an accessible SVG with escaped content and every concept and connection", () => {
    let map = createRootMap('知识 <图谱> & "导出"', "<script>alert(1)</script>");
    map = updateNode(map, map.rootNodeId, { note: "A & B < C" });
    const child = addChildNode(map, map.rootNodeId, { title: "子概念" });
    const fullAnswer = "完整回答的第一段。\n" + "需要保留的解释与例子。".repeat(30) + "\n完整回答的结尾。";
    map = appendMessage(child.map, child.child.id, createMessage("assistant", fullAnswer));
    const files = buildExportFiles(map);
    const svg = files.find((file) => file.path === "map.svg")?.content ?? "";

    expect(svg).toMatch(/<svg\b[^>]*xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/);
    expect(svg).toMatch(/<title\b[^>]*id=["']spider-map-title["'][^>]*>/);
    expect(svg).toMatch(/<desc\b[^>]*id=["']spider-map-desc["'][^>]*>/);
    expect(svg).toMatch(/aria-labelledby=["']spider-map-title spider-map-desc["']/);
    expect(svg).toContain("&lt;图谱&gt; &amp;");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("A &amp; B &lt; C");
    expect(svg).not.toMatch(/<script\b/i);
    expect([...svg.matchAll(/\bdata-node-id=["']([^"']+)["']/g)].map((match) => match[1]).sort())
      .toEqual(Object.keys(map.nodes).sort());
    expect([...svg.matchAll(/\bdata-edge-id=["']([^"']+)["']/g)].map((match) => match[1]).sort())
      .toEqual(map.edges.map((edge) => edge.id).sort());
    const childNote = files.find((file) => file.path.startsWith("nodes/02-"))!;
    for (const line of fullAnswer.split("\n")) expect(childNote.content).toContain(line);
  });
});

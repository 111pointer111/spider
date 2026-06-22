import type { ChatMap, ChatMessage, ChatNode } from "../types";
import { escapeMermaid, slugifyFileName } from "../utils/text";

export interface JsonCanvasFile {
  nodes: Array<{
    id: string;
    type: "text";
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  edges: Array<{
    id: string;
    fromNode: string;
    toNode: string;
    fromSide: "right";
    toSide: "left";
  }>;
}

export interface ExportFile {
  path: string;
  content: string;
}

function nodeHeading(level: number): string {
  return "#".repeat(Math.min(level, 6));
}

function roleName(role: ChatMessage["role"]): string {
  if (role === "user") {
    return "你";
  }

  if (role === "assistant") {
    return "AI";
  }

  return "系统";
}

function firstUserQuestion(node: ChatNode): string | undefined {
  return node.messages.find((message) => message.role === "user")?.content.trim();
}

function nodeSummaryLine(node: ChatNode): string {
  return node.summary || firstUserQuestion(node) || node.anchorText || "暂无总结";
}

function walkNodes(map: ChatMap, startId = map.rootNodeId): ChatNode[] {
  const root = map.nodes[startId];
  if (!root) {
    return [];
  }

  const nodes: ChatNode[] = [];
  const visit = (node: ChatNode): void => {
    nodes.push(node);
    for (const childId of node.children) {
      const child = map.nodes[childId];
      if (child) {
        visit(child);
      }
    }
  };

  visit(root);
  return nodes;
}

function depthOf(map: ChatMap, node: ChatNode): number {
  let depth = 0;
  let cursor = node.parentId ? map.nodes[node.parentId] : undefined;

  while (cursor) {
    depth += 1;
    cursor = cursor.parentId ? map.nodes[cursor.parentId] : undefined;
  }

  return depth;
}

function nodeFileName(index: number, node: ChatNode): string {
  return `${String(index + 1).padStart(2, "0")}-${slugifyFileName(node.title)}.md`;
}

function renderCallout(title: string, body?: string): string[] {
  if (!body?.trim()) {
    return [];
  }

  return [`> [!note] ${title}`, ...body.trim().split(/\r?\n/).map((line) => `> ${line}`), ""];
}

function renderMessage(message: ChatMessage): string[] {
  return [`### ${roleName(message.role)} · ${message.createdAt}`, "", message.content.trim(), ""];
}

function renderNodeMarkdown(map: ChatMap, node: ChatNode, depth: number): string {
  const lines: string[] = [];
  lines.push(`${nodeHeading(depth)} ${node.title}`);
  lines.push("");
  lines.push(`- 状态：${node.status}`);
  lines.push(`- 子节点：${node.children.length}`);
  lines.push(`- 更新时间：${node.updatedAt}`);
  lines.push("");

  lines.push(...renderCallout("节点总结", node.summary));
  lines.push(...renderCallout("原文锚点", node.anchorText));

  if (node.messages.length > 0) {
    lines.push("## 对话记录");
    lines.push("");
    for (const message of node.messages) {
      lines.push(...renderMessage(message));
    }
  }

  const children = node.children.map((childId) => map.nodes[childId]).filter((child): child is ChatNode => Boolean(child));
  if (children.length > 0) {
    lines.push("## 子问题");
    lines.push("");
    for (const child of children) {
      lines.push(`- [[${child.title}]]：${nodeSummaryLine(child)}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportMarkdown(map: ChatMap): string {
  const root = map.nodes[map.rootNodeId];
  if (!root) {
    return `# ${map.title}\n\nNo root node found.\n`;
  }

  const sections = walkNodes(map).map((node) => renderNodeMarkdown(map, node, Math.min(depthOf(map, node) + 2, 6)));
  return [`# ${map.title}`, "", ...sections].join("\n").trimEnd() + "\n";
}

function renderMermaidNode(map: ChatMap, node: ChatNode, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const label = node.summary ? `${node.title}: ${node.summary}` : node.title;
  const lines = [`${indent}${escapeMermaid(label)}`];

  for (const childId of node.children) {
    const child = map.nodes[childId];
    if (child) {
      lines.push(...renderMermaidNode(map, child, depth + 1));
    }
  }

  return lines;
}

export function exportMermaidMindmap(map: ChatMap): string {
  const root = map.nodes[map.rootNodeId];
  if (!root) {
    return "mindmap\n  Missing root\n";
  }

  return ["mindmap", ...renderMermaidNode(map, root, 1)].join("\n") + "\n";
}

export function exportCanvas(map: ChatMap): string {
  const canvas: JsonCanvasFile = {
    nodes: Object.values(map.nodes).map((node) => ({
      id: node.id,
      type: "text",
      text: [
        `# ${node.title}`,
        node.summary ? `> [!summary]\n> ${node.summary}` : "",
        node.anchorText ? `> [!quote] 原文锚点\n> ${node.anchorText}` : "",
        firstUserQuestion(node) ? `**问题**：${firstUserQuestion(node)}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
      width: 360,
      height: 240,
    })),
    edges: map.edges.map((edge) => ({
      id: edge.id,
      fromNode: edge.from,
      toNode: edge.to,
      fromSide: "right",
      toSide: "left",
    })),
  };

  return `${JSON.stringify(canvas, null, 2)}\n`;
}

export function buildExportFiles(map: ChatMap): ExportFile[] {
  const root = map.nodes[map.rootNodeId];
  const nodes = walkNodes(map);
  const nodeFileNames = new Map(nodes.map((node, index) => [node.id, nodeFileName(index, node)]));
  const mindmap = exportMermaidMindmap(map);
  const rootSummary = root ? nodeSummaryLine(root) : "No root node found.";

  const indexLines = [
    `# ${map.title}`,
    "",
    "> [!summary] 总览",
    `> ${rootSummary}`,
    "",
    "## 文件结构",
    "",
    "- `README.md`：总览和入口",
    "- `nodes/`：每个节点的完整对话记录",
    "- `diagrams/mindmap.mermaid.md`：Mermaid 思维导图",
    "- `canvas/map.canvas`：Obsidian Canvas 图谱",
    "- `data/map.json`：原始结构化数据",
    "",
    "## 节点目录",
    "",
    ...nodes.map((node, index) => {
      const indent = "  ".repeat(depthOf(map, node));
      const fileName = nodeFileNames.get(node.id) ?? nodeFileName(index, node);
      return `${indent}- [${node.title}](nodes/${fileName})：${nodeSummaryLine(node)}`;
    }),
    "",
    "## Mermaid 预览",
    "",
    "```mermaid",
    mindmap.trimEnd(),
    "```",
    "",
  ];

  return [
    {
      path: "README.md",
      content: indexLines.join("\n"),
    },
    ...nodes.map((node, index) => ({
      path: `nodes/${nodeFileNames.get(node.id) ?? nodeFileName(index, node)}`,
      content: renderNodeMarkdown(map, node, 1),
    })),
    {
      path: "diagrams/mindmap.mermaid.md",
      content: `# ${map.title} 思维导图\n\n\`\`\`mermaid\n${mindmap}\`\`\`\n`,
    },
    {
      path: "canvas/map.canvas",
      content: exportCanvas(map),
    },
    {
      path: "data/map.json",
      content: `${JSON.stringify(map, null, 2)}\n`,
    },
  ];
}

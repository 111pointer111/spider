import type { ChatMap, ChatNode } from "../types";
import { escapeMermaid } from "../utils/text";

function nodeHeading(level: number): string {
  return "#".repeat(Math.min(level, 6));
}

function renderNodeMarkdown(map: ChatMap, node: ChatNode, depth: number): string {
  const lines: string[] = [];
  lines.push(`${nodeHeading(depth)} ${node.title}`);
  lines.push("");

  if (node.anchorText) {
    lines.push(`> Anchor: ${node.anchorText}`);
    lines.push("");
  }

  if (node.summary) {
    lines.push(`Summary: ${node.summary}`);
    lines.push("");
  }

  if (node.messages.length > 0) {
    lines.push("Messages:");
    lines.push("");
    for (const message of node.messages) {
      lines.push(`- **${message.role}** (${message.createdAt})`);
      lines.push("");
      lines.push(message.content);
      lines.push("");
    }
  }

  for (const childId of node.children) {
    const child = map.nodes[childId];
    if (child) {
      lines.push(renderNodeMarkdown(map, child, depth + 1));
    }
  }

  return lines.join("\n");
}

export function exportMarkdown(map: ChatMap): string {
  const root = map.nodes[map.rootNodeId];
  if (!root) {
    return `# ${map.title}\n\nNo root node found.\n`;
  }

  return [`# ${map.title}`, "", renderNodeMarkdown(map, root, 2)].join("\n").trimEnd() + "\n";
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

export function exportCanvas(map: ChatMap): string {
  const canvas: JsonCanvasFile = {
    nodes: Object.values(map.nodes).map((node) => ({
      id: node.id,
      type: "text",
      text: [
        `# ${node.title}`,
        node.anchorText ? `Anchor: ${node.anchorText}` : "",
        node.summary ? `Summary: ${node.summary}` : "",
        node.messages.length > 0 ? `Messages: ${node.messages.length}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
      width: 340,
      height: 220,
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

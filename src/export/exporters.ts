import type { ChatMap, ChatMessage, ChatNode } from "../types";
import { escapeMermaid, slugifyFileName } from "../utils/text";

type CanvasSide = "top" | "right" | "bottom" | "left";
type CanvasEnd = "none" | "arrow";
type CanvasColor = "1" | "2" | "3" | "4" | "5" | "6";

interface JsonCanvasBaseNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasColor;
}

interface JsonCanvasTextNode extends JsonCanvasBaseNode {
  type: "text";
  text: string;
}

interface JsonCanvasFileNode extends JsonCanvasBaseNode {
  type: "file";
  file: string;
  subpath?: string;
}

interface JsonCanvasGroupNode extends JsonCanvasBaseNode {
  type: "group";
  label?: string;
}

export interface JsonCanvasFile {
  nodes: Array<JsonCanvasTextNode | JsonCanvasFileNode | JsonCanvasGroupNode>;
  edges: Array<{
    id: string;
    fromNode: string;
    toNode: string;
    fromSide: CanvasSide;
    toSide: CanvasSide;
    toEnd: CanvasEnd;
    color?: CanvasColor;
    label?: string;
  }>;
}

export interface ExportFile {
  path: string;
  content: string;
}

export interface ExportCanvasOptions {
  exportFolder?: string;
}

export type BuildExportFilesOptions = ExportCanvasOptions;

interface CanvasPosition {
  x: number;
  y: number;
  depth: number;
}

const CANVAS_NODE_WIDTH = 360;
const CANVAS_NODE_HEIGHT = 220;
const CANVAS_COLUMN_GAP = 520;
const CANVAS_ROW_GAP = 300;
const CANVAS_GROUP_PADDING = 70;
const CANVAS_OVERVIEW_WIDTH = 460;
const CANVAS_OVERVIEW_HEIGHT = 260;

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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function joinExportPath(...parts: Array<string | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/^\//, "");
}

function markdownLink(label: string, path: string): string {
  return `[${label}](${encodeURI(path).replaceAll("%2F", "/")})`;
}

function nodeStatusLabel(node: ChatNode): string {
  if (node.status === "understood") {
    return "已理解";
  }

  if (node.status === "archived") {
    return "已归档";
  }

  return "进行中";
}

function nodeCanvasColor(node: ChatNode, isRoot: boolean): CanvasColor {
  if (isRoot) {
    return "6";
  }

  if (node.status === "understood") {
    return "4";
  }

  if (node.status === "archived") {
    return "2";
  }

  return "5";
}

function edgeLabel(node: ChatNode): string {
  return truncateForExport(node.anchorText || firstUserQuestion(node) || "追问", 18);
}

function truncateForExport(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function renderCallout(title: string, body?: string): string[] {
  if (!body?.trim()) {
    return [];
  }

  return [`> [!note] ${title}`, ...body.trim().split(/\r?\n/).map((line) => `> ${line}`), ""];
}

function renderMessage(message: ChatMessage): string[] {
  const calloutType = message.role === "user" ? "question" : message.role === "assistant" ? "info" : "note";
  const body = message.content.trim();

  return [
    `> [!${calloutType}] ${roleName(message.role)} · ${formatDateTime(message.createdAt)}`,
    ...(body ? body.split(/\r?\n/).map((line) => `> ${line}`) : [">"]),
    "",
  ];
}

function renderNodeMarkdown(
  map: ChatMap,
  node: ChatNode,
  depth: number,
  nodeFileNames?: ReadonlyMap<string, string>,
): string {
  const lines: string[] = [];
  const parent = node.parentId ? map.nodes[node.parentId] : undefined;
  const parentFileName = parent ? nodeFileNames?.get(parent.id) : undefined;
  const children = node.children.map((childId) => map.nodes[childId]).filter((child): child is ChatNode => Boolean(child));

  lines.push(`${nodeHeading(depth)} ${node.title}`);
  lines.push("");
  lines.push("## Canvas 卡片");
  lines.push("");
  lines.push(`> [!summary] ${node.title}`);
  lines.push(`> 状态：${nodeStatusLabel(node)}`);
  lines.push(`> 摘要：${nodeSummaryLine(node)}`);
  if (node.anchorText) {
    lines.push(`> 锚点：${node.anchorText}`);
  }
  const question = firstUserQuestion(node);
  if (question) {
    lines.push(`> 问题：${question}`);
  }
  lines.push("");

  lines.push("## 导航");
  lines.push("");
  lines.push(`- 图谱首页：${markdownLink(map.title, "../index.md")}`);
  lines.push(`- Canvas 视图：${markdownLink("map.canvas", "../canvas/map.canvas")}`);
  if (parent && parentFileName) {
    lines.push(`- 父节点：${markdownLink(parent.title, parentFileName)}`);
  } else {
    lines.push("- 父节点：无，这是根节点");
  }
  if (children.length > 0) {
    const childLinks = children.map((child) => {
      const fileName = nodeFileNames?.get(child.id) ?? `${slugifyFileName(child.title)}.md`;
      return markdownLink(child.title, fileName);
    });
    lines.push(`- 子节点：${childLinks.join("、")}`);
  } else {
    lines.push("- 子节点：暂无");
  }
  lines.push("");

  lines.push("## 节点信息");
  lines.push("");
  lines.push(`- 状态：${node.status}`);
  lines.push(`- 子节点：${node.children.length}`);
  lines.push(`- 创建时间：${formatDateTime(node.createdAt)}`);
  lines.push(`- 更新时间：${formatDateTime(node.updatedAt)}`);
  if (parent) {
    lines.push(`- 父节点：${parentFileName ? markdownLink(parent.title, parentFileName) : parent.title}`);
  }
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

  if (children.length > 0) {
    lines.push("## 子问题");
    lines.push("");
    for (const child of children) {
      const childFileName = nodeFileNames?.get(child.id);
      const link = childFileName ? markdownLink(child.title, childFileName) : `[[${child.title}]]`;
      lines.push(`- ${link}：${nodeSummaryLine(child)}`);
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

function buildCanvasLayout(map: ChatMap, nodes: ChatNode[]): Map<string, CanvasPosition> {
  const root = map.nodes[map.rootNodeId];
  const positions = new Map<string, CanvasPosition>();
  if (!root) {
    return positions;
  }

  const spans = new Map<string, number>();
  const nodeSet = new Set(nodes.map((node) => node.id));

  const computeSpan = (node: ChatNode): number => {
    const children = node.children.map((childId) => map.nodes[childId]).filter((child): child is ChatNode => Boolean(child && nodeSet.has(child.id)));
    const span = Math.max(
      1,
      children.reduce((total, child) => total + computeSpan(child), 0),
    );
    spans.set(node.id, span);
    return span;
  };

  const assign = (node: ChatNode, depth: number, topUnit: number): void => {
    const children = node.children.map((childId) => map.nodes[childId]).filter((child): child is ChatNode => Boolean(child && nodeSet.has(child.id)));
    const span = spans.get(node.id) ?? 1;
    let yUnit = topUnit + (span - 1) / 2;

    if (children.length > 0) {
      let childTop = topUnit;
      const childCenters: number[] = [];
      for (const child of children) {
        assign(child, depth + 1, childTop);
        const childPosition = positions.get(child.id);
        if (childPosition) {
          childCenters.push(childPosition.y / CANVAS_ROW_GAP);
        }
        childTop += spans.get(child.id) ?? 1;
      }

      if (childCenters.length > 0) {
        yUnit = (Math.min(...childCenters) + Math.max(...childCenters)) / 2;
      }
    }

    positions.set(node.id, {
      x: depth * CANVAS_COLUMN_GAP,
      y: Math.round(yUnit * CANVAS_ROW_GAP),
      depth,
    });
  };

  computeSpan(root);
  assign(root, 0, 0);

  return positions;
}

function buildCanvasGroups(positions: Map<string, CanvasPosition>): JsonCanvasGroupNode[] {
  const byDepth = new Map<number, CanvasPosition[]>();
  for (const position of positions.values()) {
    const level = byDepth.get(position.depth) ?? [];
    level.push(position);
    byDepth.set(position.depth, level);
  }

  return [...byDepth.entries()]
    .sort(([left], [right]) => left - right)
    .map(([depth, level]) => {
      const minY = Math.min(...level.map((position) => position.y));
      const maxY = Math.max(...level.map((position) => position.y));
      const x = depth * CANVAS_COLUMN_GAP - CANVAS_GROUP_PADDING;

      return {
        id: `group-depth-${depth}`,
        type: "group",
        label: depth === 0 ? "根问题" : `第 ${depth} 层`,
        x,
        y: minY - CANVAS_GROUP_PADDING,
        width: CANVAS_NODE_WIDTH + CANVAS_GROUP_PADDING * 2,
        height: maxY - minY + CANVAS_NODE_HEIGHT + CANVAS_GROUP_PADDING * 2,
        color: depth === 0 ? "6" : "5",
      };
    });
}

function canvasNodeFilePath(fileName: string, options: ExportCanvasOptions): string {
  return joinExportPath(options.exportFolder, "nodes", fileName);
}

export function exportCanvas(map: ChatMap, options: ExportCanvasOptions = {}): string {
  const root = map.nodes[map.rootNodeId];
  if (!root) {
    const canvas: JsonCanvasFile = {
      nodes: [
        {
          id: "overview",
          type: "text",
          text: `# ${map.title}\n\nNo root node found.`,
          x: 0,
          y: 0,
          width: CANVAS_OVERVIEW_WIDTH,
          height: CANVAS_OVERVIEW_HEIGHT,
          color: "6",
        },
      ],
      edges: [],
    };

    return `${JSON.stringify(canvas, null, 2)}\n`;
  }

  const nodes = walkNodes(map);
  const nodeFileNames = new Map(nodes.map((node, index) => [node.id, nodeFileName(index, node)]));
  const positions = buildCanvasLayout(map, nodes);
  const groups = buildCanvasGroups(positions);
  const minY = Math.min(...[...positions.values()].map((position) => position.y));

  const canvas: JsonCanvasFile = {
    nodes: [
      ...groups,
      {
        id: "overview",
        type: "text",
        text: [
          `# ${map.title}`,
          "",
          "> [!summary] 总览",
          `> ${nodeSummaryLine(root)}`,
          "",
          `- 根问题：${root.title}`,
          `- 节点数量：${nodes.length}`,
          `- 连线数量：${map.edges.length}`,
          `- 图谱首页：${markdownLink("index.md", joinExportPath(options.exportFolder, "index.md"))}`,
          "",
          "从根问题开始，沿箭头阅读每个子问题。节点卡片只展示摘要，完整对话请打开对应 Markdown 文件。",
        ].join("\n"),
        x: -CANVAS_OVERVIEW_WIDTH - 120,
        y: minY - CANVAS_GROUP_PADDING,
        width: CANVAS_OVERVIEW_WIDTH,
        height: CANVAS_OVERVIEW_HEIGHT,
        color: "6",
      },
      ...nodes.map((node) => {
        const position = positions.get(node.id) ?? { x: node.position.x, y: node.position.y, depth: depthOf(map, node) };
        const fileName = nodeFileNames.get(node.id) ?? nodeFileName(0, node);

        return {
          id: node.id,
          type: "file" as const,
          file: canvasNodeFilePath(fileName, options),
          subpath: "#Canvas 卡片",
          x: position.x,
          y: position.y,
          width: CANVAS_NODE_WIDTH,
          height: CANVAS_NODE_HEIGHT,
          color: nodeCanvasColor(node, node.id === map.rootNodeId),
        };
      }),
    ],
    edges: map.edges.map((edge) => ({
      id: edge.id,
      fromNode: edge.from,
      toNode: edge.to,
      fromSide: "right",
      toSide: "left",
      toEnd: "arrow",
      color: nodeCanvasColor(map.nodes[edge.to] ?? root, edge.to === map.rootNodeId),
      label: edgeLabel(map.nodes[edge.to] ?? root),
    })),
  };

  return `${JSON.stringify(canvas, null, 2)}\n`;
}

export function buildExportFiles(map: ChatMap, options: BuildExportFilesOptions = {}): ExportFile[] {
  const root = map.nodes[map.rootNodeId];
  const nodes = walkNodes(map);
  const nodeFileNames = new Map(nodes.map((node, index) => [node.id, nodeFileName(index, node)]));
  const mindmap = exportMermaidMindmap(map);
  const rootSummary = root ? nodeSummaryLine(root) : "No root node found.";
  const rootFileName = root ? nodeFileNames.get(root.id) : undefined;
  const nodeIndexLines = nodes.map((node, index) => {
    const indent = "  ".repeat(depthOf(map, node));
    const fileName = nodeFileNames.get(node.id) ?? nodeFileName(index, node);
    return `${indent}- [${node.title}](nodes/${fileName})：${nodeSummaryLine(node)}`;
  });

  const indexLines = [
    `# ${map.title}`,
    "",
    "> [!summary] 总览",
    `> ${rootSummary}`,
    "",
    "## 快速信息",
    "",
    "| 项目 | 内容 |",
    "| --- | --- |",
    `| 根问题 | ${rootFileName && root ? `[${root.title}](nodes/${rootFileName})` : root?.title ?? "缺少根节点"} |`,
    `| 节点数量 | ${nodes.length} |`,
    `| 连线数量 | ${map.edges.length} |`,
    `| 创建时间 | ${formatDateTime(map.createdAt)} |`,
    `| 更新时间 | ${formatDateTime(map.updatedAt)} |`,
    "",
    "## 入口",
    "",
    `- 知识导图：${markdownLink("canvas/map.canvas", "canvas/map.canvas")}`,
    `- Mermaid 图：${markdownLink("mindmap.mermaid.md", "diagrams/mindmap.mermaid.md")}`,
    `- 原始数据：${markdownLink("map.json", "data/map.json")}`,
    "",
    "## 推荐阅读路线",
    "",
    ...nodeIndexLines,
    "",
    "## 文件结构",
    "",
    "- `README.md`：总览和入口",
    "- `index.md`：Obsidian 内的图谱首页",
    "- `nodes/`：每个节点的完整对话记录",
    "- `diagrams/mindmap.mermaid.md`：Mermaid 思维导图",
    "- `canvas/map.canvas`：Obsidian Canvas 图谱",
    "- `data/map.json`：原始结构化数据",
    "",
    "## 使用建议",
    "",
    "- 从根问题开始读，然后沿着子问题向下钻。",
    "- 如果要继续编辑标题，回到 spider 里修改节点标题后重新导出。",
    "- `canvas/map.canvas` 适合在 Obsidian Canvas 里打开查看整体关系。",
    "",
    "## Mermaid 预览",
    "",
    "```mermaid",
    mindmap.trimEnd(),
    "```",
    "",
  ];
  const indexContent = indexLines.join("\n");
  const readmeContent = [
    `# ${map.title}`,
    "",
    "> [!summary] spider 导出包",
    `> ${rootSummary}`,
    "",
    `Obsidian 内建议从 ${markdownLink("index.md", "index.md")} 或 ${markdownLink("canvas/map.canvas", "canvas/map.canvas")} 开始阅读。`,
    "",
    "## 文件入口",
    "",
    `- ${markdownLink("index.md", "index.md")}：图谱首页，包含推荐阅读路线和节点索引`,
    `- ${markdownLink("canvas/map.canvas", "canvas/map.canvas")}：可视化知识导图`,
    `- ${markdownLink("diagrams/mindmap.mermaid.md", "diagrams/mindmap.mermaid.md")}：Mermaid 思维导图`,
    `- ${markdownLink("data/map.json", "data/map.json")}：原始结构化数据`,
    "",
  ].join("\n");

  return [
    {
      path: "README.md",
      content: readmeContent,
    },
    {
      path: "index.md",
      content: indexContent,
    },
    ...nodes.map((node, index) => ({
      path: `nodes/${nodeFileNames.get(node.id) ?? nodeFileName(index, node)}`,
      content: renderNodeMarkdown(map, node, 1, nodeFileNames),
    })),
    {
      path: "diagrams/mindmap.mermaid.md",
      content: `# ${map.title} 思维导图\n\n\`\`\`mermaid\n${mindmap}\`\`\`\n`,
    },
    {
      path: "canvas/map.canvas",
      content: exportCanvas(map, options),
    },
    {
      path: "data/map.json",
      content: `${JSON.stringify(map, null, 2)}\n`,
    },
  ];
}

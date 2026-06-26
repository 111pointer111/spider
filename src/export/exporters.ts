import type { AppLanguage, ChatMap, ChatMessage, ChatNode } from "../types";
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
  language?: AppLanguage;
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

interface ExportLabels {
  ai: string;
  anchor: string;
  archived: string;
  canvasCard: string;
  canvasView: string;
  childNodes: string;
  children: string;
  conversation: string;
  createdAt: string;
  dataPurpose: string;
  dataReadmeTitle: string;
  dataReadmeUsage: string;
  edgeCount: string;
  exportedPackage: string;
  fileStructure: string;
  fullConversationHint: string;
  graphHome: string;
  indexEntry: string;
  languageDepth(depth: number): string;
  mapJson: string;
  mapJsonDescription: string;
  mermaid: string;
  mermaidPreview: string;
  mermaidTitleSuffix: string;
  missingRoot: string;
  navigation: string;
  noChildren: string;
  noConversation: string;
  noParentRoot: string;
  noSummary: string;
  nodeCount: string;
  nodeInfo: string;
  nodeSummary: string;
  nodesFolder: string;
  open: string;
  overview: string;
  parent: string;
  question: string;
  quickInfo: string;
  rawData: string;
  readingRoute: string;
  rootQuestion: string;
  status: string;
  system: string;
  updatedAt: string;
  usageAdvice: string;
  user: string;
  understood: string;
}

function exportLabels(language: AppLanguage = "zh-CN"): ExportLabels {
  if (language === "en") {
    return {
      ai: "AI",
      anchor: "Anchor",
      archived: "Archived",
      canvasCard: "Canvas card",
      canvasView: "Canvas view",
      childNodes: "Child nodes",
      children: "Children",
      conversation: "Conversation",
      createdAt: "Created",
      dataPurpose: "Use this file for backup, debugging, or future import support.",
      dataReadmeTitle: "Structured data",
      dataReadmeUsage: "The JSON file contains the complete local Spider map: nodes, edges, messages, positions, timestamps, and status values.",
      edgeCount: "Edge count",
      exportedPackage: "spider export package",
      fileStructure: "File structure",
      fullConversationHint: "Start at the root question, follow arrows for child questions, and open each Markdown file for the full conversation.",
      graphHome: "Map home",
      indexEntry: "Obsidian entry note",
      languageDepth: (depth) => `Depth ${depth}`,
      mapJson: "map.json",
      mapJsonDescription: "Raw structured data",
      mermaid: "Mermaid map",
      mermaidPreview: "Mermaid preview",
      mermaidTitleSuffix: "mindmap",
      missingRoot: "No root node found.",
      navigation: "Navigation",
      noChildren: "No child nodes",
      noConversation: "No conversation yet",
      noParentRoot: "No parent; this is the root node",
      noSummary: "No summary yet",
      nodeCount: "Node count",
      nodeInfo: "Node info",
      nodeSummary: "Node summary",
      nodesFolder: "One Markdown file per node",
      open: "Open",
      overview: "Overview",
      parent: "Parent",
      question: "Question",
      quickInfo: "Quick info",
      rawData: "Raw data",
      readingRoute: "Recommended reading route",
      rootQuestion: "Root question",
      status: "Status",
      system: "System",
      updatedAt: "Updated",
      usageAdvice: "Reading tips",
      user: "You",
      understood: "Understood",
    };
  }

  return {
    ai: "AI",
    anchor: "原文锚点",
    archived: "已归档",
    canvasCard: "Canvas 卡片",
    canvasView: "Canvas 视图",
    childNodes: "子问题",
    children: "子节点",
    conversation: "对话记录",
    createdAt: "创建时间",
    dataPurpose: "这个文件可用于备份、调试，以及未来的重新导入支持。",
    dataReadmeTitle: "结构化数据",
    dataReadmeUsage: "JSON 文件包含完整的本地 Spider 图谱：节点、连线、消息、位置、时间戳和状态。",
    edgeCount: "连线数量",
    exportedPackage: "spider 导出包",
    fileStructure: "文件结构",
    fullConversationHint: "从根问题开始，沿箭头阅读每个子问题。节点卡片只展示摘要，完整对话请打开对应 Markdown 文件。",
    graphHome: "图谱首页",
    indexEntry: "Obsidian 内的图谱首页",
    languageDepth: (depth) => `第 ${depth} 层`,
    mapJson: "map.json",
    mapJsonDescription: "原始结构化数据",
    mermaid: "Mermaid 图",
    mermaidPreview: "Mermaid 预览",
    mermaidTitleSuffix: "思维导图",
    missingRoot: "缺少根节点",
    navigation: "导航",
    noChildren: "暂无",
    noConversation: "暂无对话",
    noParentRoot: "无，这是根节点",
    noSummary: "暂无总结",
    nodeCount: "节点数量",
    nodeInfo: "节点信息",
    nodeSummary: "节点总结",
    nodesFolder: "每个节点的完整对话记录",
    open: "进行中",
    overview: "总览",
    parent: "父节点",
    question: "问题",
    quickInfo: "快速信息",
    rawData: "原始数据",
    readingRoute: "推荐阅读路线",
    rootQuestion: "根问题",
    status: "状态",
    system: "系统",
    updatedAt: "更新时间",
    usageAdvice: "使用建议",
    user: "你",
    understood: "已理解",
  };
}

function nodeHeading(level: number): string {
  return "#".repeat(Math.min(level, 6));
}

function roleName(role: ChatMessage["role"], labels: ExportLabels): string {
  if (role === "user") {
    return labels.user;
  }

  if (role === "assistant") {
    return labels.ai;
  }

  return labels.system;
}

function firstUserQuestion(node: ChatNode): string | undefined {
  return node.messages.find((message) => message.role === "user")?.content.trim();
}

function nodeSummaryLine(node: ChatNode, labels: ExportLabels): string {
  return node.summary || firstUserQuestion(node) || node.anchorText || labels.noSummary;
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

function nodeStatusLabel(node: ChatNode, labels: ExportLabels): string {
  if (node.status === "understood") {
    return labels.understood;
  }

  if (node.status === "archived") {
    return labels.archived;
  }

  return labels.open;
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

function renderMessage(message: ChatMessage, labels: ExportLabels): string[] {
  const calloutType = message.role === "user" ? "question" : message.role === "assistant" ? "info" : "note";
  const body = message.content.trim();

  return [
    `> [!${calloutType}] ${roleName(message.role, labels)} · ${formatDateTime(message.createdAt)}`,
    ...(body ? body.split(/\r?\n/).map((line) => `> ${line}`) : [">"]),
    "",
  ];
}

function renderNodeMarkdown(
  map: ChatMap,
  node: ChatNode,
  depth: number,
  labels: ExportLabels,
  nodeFileNames?: ReadonlyMap<string, string>,
): string {
  const lines: string[] = [];
  const parent = node.parentId ? map.nodes[node.parentId] : undefined;
  const parentFileName = parent ? nodeFileNames?.get(parent.id) : undefined;
  const children = node.children.map((childId) => map.nodes[childId]).filter((child): child is ChatNode => Boolean(child));

  lines.push(`${nodeHeading(depth)} ${node.title}`);
  lines.push("");
  lines.push(`## ${labels.canvasCard}`);
  lines.push("");
  lines.push(`> [!summary] ${node.title}`);
  lines.push(`> ${labels.status}: ${nodeStatusLabel(node, labels)}`);
  lines.push(`> ${labels.nodeSummary}: ${nodeSummaryLine(node, labels)}`);
  if (node.anchorText) {
    lines.push(`> ${labels.anchor}: ${node.anchorText}`);
  }
  const question = firstUserQuestion(node);
  if (question) {
    lines.push(`> ${labels.question}: ${question}`);
  }
  lines.push("");

  lines.push(`## ${labels.navigation}`);
  lines.push("");
  lines.push(`- ${labels.graphHome}: ${markdownLink(map.title, "../index.md")}`);
  lines.push(`- ${labels.canvasView}: ${markdownLink("map.canvas", "../canvas/map.canvas")}`);
  if (parent && parentFileName) {
    lines.push(`- ${labels.parent}: ${markdownLink(parent.title, parentFileName)}`);
  } else {
    lines.push(`- ${labels.parent}: ${labels.noParentRoot}`);
  }
  if (children.length > 0) {
    const childLinks = children.map((child) => {
      const fileName = nodeFileNames?.get(child.id) ?? `${slugifyFileName(child.title)}.md`;
      return markdownLink(child.title, fileName);
    });
    lines.push(`- ${labels.children}: ${childLinks.join("、")}`);
  } else {
    lines.push(`- ${labels.children}: ${labels.noChildren}`);
  }
  lines.push("");

  lines.push(`## ${labels.nodeInfo}`);
  lines.push("");
  lines.push(`- ${labels.status}: ${nodeStatusLabel(node, labels)}`);
  lines.push(`- ${labels.children}: ${node.children.length}`);
  lines.push(`- ${labels.createdAt}: ${formatDateTime(node.createdAt)}`);
  lines.push(`- ${labels.updatedAt}: ${formatDateTime(node.updatedAt)}`);
  if (parent) {
    lines.push(`- ${labels.parent}: ${parentFileName ? markdownLink(parent.title, parentFileName) : parent.title}`);
  }
  lines.push("");

  lines.push(...renderCallout(labels.nodeSummary, node.summary));
  lines.push(...renderCallout(labels.anchor, node.anchorText));

  if (node.messages.length > 0) {
    lines.push(`## ${labels.conversation}`);
    lines.push("");
    for (const message of node.messages) {
      lines.push(...renderMessage(message, labels));
    }
  }

  if (children.length > 0) {
    lines.push(`## ${labels.childNodes}`);
    lines.push("");
    for (const child of children) {
      const childFileName = nodeFileNames?.get(child.id);
      const link = childFileName ? markdownLink(child.title, childFileName) : `[[${child.title}]]`;
      lines.push(`- ${link}: ${nodeSummaryLine(child, labels)}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportMarkdown(map: ChatMap, language: AppLanguage = "zh-CN"): string {
  const labels = exportLabels(language);
  const root = map.nodes[map.rootNodeId];
  if (!root) {
    return `# ${map.title}\n\n${labels.missingRoot}\n`;
  }

  const sections = walkNodes(map).map((node) => renderNodeMarkdown(map, node, Math.min(depthOf(map, node) + 2, 6), labels));
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

function buildCanvasGroups(positions: Map<string, CanvasPosition>, labels: ExportLabels): JsonCanvasGroupNode[] {
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
        label: depth === 0 ? labels.rootQuestion : labels.languageDepth(depth),
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
  const labels = exportLabels(options.language);
  const root = map.nodes[map.rootNodeId];
  if (!root) {
    const canvas: JsonCanvasFile = {
      nodes: [
        {
          id: "overview",
          type: "text",
          text: `# ${map.title}\n\n${labels.missingRoot}`,
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
  const groups = buildCanvasGroups(positions, labels);
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
          `> [!summary] ${labels.overview}`,
          `> ${nodeSummaryLine(root, labels)}`,
          "",
          `- ${labels.rootQuestion}: ${root.title}`,
          `- ${labels.nodeCount}: ${nodes.length}`,
          `- ${labels.edgeCount}: ${map.edges.length}`,
          `- ${labels.graphHome}: ${markdownLink("index.md", joinExportPath(options.exportFolder, "index.md"))}`,
          "",
          labels.fullConversationHint,
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
          subpath: `#${labels.canvasCard}`,
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
  const labels = exportLabels(options.language);
  const root = map.nodes[map.rootNodeId];
  const nodes = walkNodes(map);
  const nodeFileNames = new Map(nodes.map((node, index) => [node.id, nodeFileName(index, node)]));
  const mindmap = exportMermaidMindmap(map);
  const rootSummary = root ? nodeSummaryLine(root, labels) : labels.missingRoot;
  const rootFileName = root ? nodeFileNames.get(root.id) : undefined;
  const nodeIndexLines = nodes.map((node, index) => {
    const indent = "  ".repeat(depthOf(map, node));
    const fileName = nodeFileNames.get(node.id) ?? nodeFileName(index, node);
    return `${indent}- [${node.title}](nodes/${fileName}): ${nodeSummaryLine(node, labels)}`;
  });
  const isConversationEmpty = nodes.every((node) => node.messages.length === 0);

  const indexLines = [
    `# ${map.title}`,
    "",
    `> [!summary] ${labels.overview}`,
    `> ${rootSummary}`,
    "",
    "## " + labels.quickInfo,
    "",
    "| Item | Value |",
    "| --- | --- |",
    `| ${labels.rootQuestion} | ${rootFileName && root ? `[${root.title}](nodes/${rootFileName})` : root?.title ?? labels.missingRoot} |`,
    `| ${labels.nodeCount} | ${nodes.length} |`,
    `| ${labels.edgeCount} | ${map.edges.length} |`,
    `| ${labels.createdAt} | ${formatDateTime(map.createdAt)} |`,
    `| ${labels.updatedAt} | ${formatDateTime(map.updatedAt)} |`,
    "",
    "## " + labels.indexEntry,
    "",
    `- ${labels.canvasView}: ${markdownLink("canvas/map.canvas", "canvas/map.canvas")}`,
    `- ${labels.mermaid}: ${markdownLink("mindmap.mermaid.md", "diagrams/mindmap.mermaid.md")}`,
    `- ${labels.rawData}: ${markdownLink("map.json", "data/map.json")}`,
    `- ${labels.dataReadmeTitle}: ${markdownLink("README.md", "data/README.md")}`,
    "",
    "## " + labels.readingRoute,
    "",
    ...(nodeIndexLines.length > 0 ? nodeIndexLines : [`- ${labels.noConversation}`]),
    ...(isConversationEmpty ? [`- ${labels.noConversation}`] : []),
    "",
    "## " + labels.fileStructure,
    "",
    `- \`README.md\`: ${labels.overview}`,
    `- \`index.md\`: ${labels.indexEntry}`,
    `- \`nodes/\`: ${labels.nodesFolder}`,
    `- \`diagrams/mindmap.mermaid.md\`: ${labels.mermaid}`,
    `- \`canvas/map.canvas\`: ${labels.canvasView}`,
    `- \`data/map.json\`: ${labels.mapJsonDescription}`,
    `- \`data/README.md\`: ${labels.dataReadmeTitle}`,
    "",
    "## " + labels.usageAdvice,
    "",
    `- ${labels.fullConversationHint}`,
    `- ${labels.dataPurpose}`,
    "",
    "## " + labels.mermaidPreview,
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
    `> [!summary] ${labels.exportedPackage}`,
    `> ${rootSummary}`,
    "",
    `${labels.fullConversationHint} ${markdownLink("index.md", "index.md")} / ${markdownLink("canvas/map.canvas", "canvas/map.canvas")}`,
    "",
    "## " + labels.indexEntry,
    "",
    `- ${markdownLink("index.md", "index.md")}: ${labels.graphHome}`,
    `- ${markdownLink("canvas/map.canvas", "canvas/map.canvas")}: ${labels.canvasView}`,
    `- ${markdownLink("diagrams/mindmap.mermaid.md", "diagrams/mindmap.mermaid.md")}: ${labels.mermaid}`,
    `- ${markdownLink("data/map.json", "data/map.json")}: ${labels.mapJsonDescription}`,
    `- ${markdownLink("data/README.md", "data/README.md")}: ${labels.dataReadmeTitle}`,
    "",
  ].join("\n");
  const dataReadmeContent = [
    `# ${labels.dataReadmeTitle}`,
    "",
    labels.dataReadmeUsage,
    "",
    "| Item | Value |",
    "| --- | --- |",
    `| ${labels.rootQuestion} | ${root?.title ?? labels.missingRoot} |`,
    `| Root node ID | ${map.rootNodeId} |`,
    `| ${labels.nodeCount} | ${nodes.length} |`,
    `| ${labels.edgeCount} | ${map.edges.length} |`,
    `| ${labels.createdAt} | ${formatDateTime(map.createdAt)} |`,
    `| ${labels.updatedAt} | ${formatDateTime(map.updatedAt)} |`,
    "",
    `- \`${labels.mapJson}\`: ${labels.mapJsonDescription}`,
    `- ${labels.dataPurpose}`,
    isConversationEmpty ? `- ${labels.noConversation}` : "",
    "",
  ].filter(Boolean).join("\n");

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
      content: renderNodeMarkdown(map, node, 1, labels, nodeFileNames),
    })),
    {
      path: "diagrams/mindmap.mermaid.md",
      content: `# ${map.title} ${labels.mermaidTitleSuffix}\n\n\`\`\`mermaid\n${mindmap}\`\`\`\n`,
    },
    {
      path: "canvas/map.canvas",
      content: exportCanvas(map, options),
    },
    {
      path: "data/map.json",
      content: `${JSON.stringify(map, null, 2)}\n`,
    },
    {
      path: "data/README.md",
      content: dataReadmeContent,
    },
  ];
}

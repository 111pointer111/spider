import type { AppLanguage, ChatMap, ChatMessage, ChatNode } from "../types";
import { cleanText, escapeMermaid, markdownToPlainText, slugifyFileName } from "../utils/text";
import { renderGraphSvg } from "./graphSvg";
import { exportNodeNotes } from "./nodeNotes";

type CanvasSide = "top" | "right" | "bottom" | "left";
type CanvasEnd = "none" | "arrow";
type CanvasColor = "1" | "2" | "3" | "4" | "5" | "6" | `#${string}`;

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

const CANVAS_NODE_WIDTH = 400;
const CANVAS_NODE_HEIGHT = 320;
const CANVAS_COLUMN_GAP = CANVAS_NODE_WIDTH + 220;
const CANVAS_ROW_GAP = CANVAS_NODE_HEIGHT + 120;
const CANVAS_OVERVIEW_WIDTH = 800;
const CANVAS_OVERVIEW_HEIGHT = 200;

interface ExportLabels {
  ai: string;
  answerExcerpt: string;
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
  explorationPath: string;
  fileStructure: string;
  fullConversationHint: string;
  graphImage: string;
  graphHome: string;
  generatedAt: string;
  indexEntry: string;
  keyFindings: string;
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
  openFullNote: string;
  openQuestions: string;
  overview: string;
  parent: string;
  personalNote: string;
  question: string;
  quickInfo: string;
  rawData: string;
  researchBrief: string;
  readingRoute: string;
  rootQuestion: string;
  status: string;
  statusOverview: string;
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
      answerExcerpt: "Answer excerpt",
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
      explorationPath: "Exploration path",
      fileStructure: "File structure",
      fullConversationHint: "Follow the arrows from left to right. Each card links to its complete notes and conversation.",
      graphImage: "Knowledge map image",
      graphHome: "Map home",
      generatedAt: "Generated",
      indexEntry: "Obsidian entry note",
      keyFindings: "Key findings",
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
      openFullNote: "Open full note ↗",
      openQuestions: "Open questions",
      overview: "Overview",
      parent: "Parent",
      personalNote: "My note",
      question: "Question",
      quickInfo: "Quick info",
      rawData: "Raw data",
      researchBrief: "Research brief",
      readingRoute: "Recommended reading route",
      rootQuestion: "Root question",
      status: "Status",
      statusOverview: "Status overview",
      system: "System",
      updatedAt: "Updated",
      usageAdvice: "Reading tips",
      user: "You",
      understood: "Understood",
    };
  }

  return {
    ai: "AI",
    answerExcerpt: "回答节选",
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
    explorationPath: "探索路径",
    fileStructure: "文件结构",
    fullConversationHint: "从左向右，沿箭头探索。点击卡片中的笔记链接，继续阅读完整对话。",
    graphImage: "知识图谱图片",
    graphHome: "图谱首页",
    generatedAt: "生成时间",
    indexEntry: "Obsidian 内的图谱首页",
    keyFindings: "关键结论",
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
    openFullNote: "打开完整笔记 ↗",
    openQuestions: "待研究问题",
    overview: "总览",
    parent: "父节点",
    personalNote: "我的笔记",
    question: "问题",
    quickInfo: "快速信息",
    rawData: "原始数据",
    researchBrief: "研究简报",
    readingRoute: "推荐阅读路线",
    rootQuestion: "根问题",
    status: "状态",
    statusOverview: "进度概览",
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
  return node.note || node.summary || firstUserQuestion(node) || node.anchorText || labels.noSummary;
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

function pathOf(map: ChatMap, node: ChatNode): ChatNode[] {
  const path: ChatNode[] = [];
  let cursor: ChatNode | undefined = node;

  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? map.nodes[cursor.parentId] : undefined;
  }

  return path;
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
  const target = path.split("/").map((part) => encodeURIComponent(part).replace(/[()]/g, (char) => char === "(" ? "%28" : "%29")).join("/");
  return `[${label}](${target})`;
}

function tableCell(value: string): string {
  return value.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
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
    return "#9ca3af";
  }

  return "5";
}

function truncateForExport(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function canvasPlainText(value: string): string {
  return value.replace(/[\\`*_[\]<>#~]/g, "\\$&");
}

function graphCardContent(node: ChatNode, labels: ExportLabels) {
  const answer = node.messages.filter((message) => message.role === "assistant" && message.content.trim()).at(-1);
  const preview = node.note?.trim() || node.summary?.trim() || answer?.content || firstUserQuestion(node) || node.anchorText?.trim();
  const previewLabel = node.note?.trim() ? labels.personalNote
    : node.summary?.trim() ? labels.nodeSummary
    : answer ? labels.answerExcerpt : labels.question;

  return {
    title: cleanText(node.title),
    statusLabel: nodeStatusLabel(node, labels),
    previewLabel: preview ? previewLabel : "",
    preview: preview ? truncateForExport(markdownToPlainText(preview), 100) : labels.noConversation,
  };
}

function canvasCardText(node: ChatNode, labels: ExportLabels, filePath: string): string {
  const content = graphCardContent(node, labels);
  return [
    `### ${canvasPlainText(truncateForExport(content.title, 40))}`,
    "",
    content.statusLabel,
    "",
    ...(content.previewLabel ? [`**${content.previewLabel}**`, ""] : []),
    canvasPlainText(content.preview),
    "",
    markdownLink(labels.openFullNote, filePath),
  ].join("\n");
}

function buildResearchBrief(
  map: ChatMap,
  nodes: ChatNode[],
  labels: ExportLabels,
  nodeFileNames: ReadonlyMap<string, string>,
): string {
  const root = map.nodes[map.rootNodeId];
  const understood = nodes.filter((node) => node.status === "understood");
  const open = nodes.filter((node) => node.status === "open");
  const archived = nodes.filter((node) => node.status === "archived");
  const personalFindings = nodes.filter((node) => node.note?.trim());
  const findings = personalFindings.length > 0
    ? personalFindings
    : understood.filter((node) => node.summary?.trim());

  const lines = [
    `# ${map.title} · ${labels.researchBrief}`,
    "",
    `> [!summary] ${labels.overview}`,
    `> ${root ? nodeSummaryLine(root, labels) : labels.missingRoot}`,
    "",
    `- ${labels.generatedAt}: ${formatDateTime(new Date().toISOString())}`,
    `- ${labels.nodeCount}: ${nodes.length}`,
    `- ${labels.edgeCount}: ${map.edges.length}`,
    "",
    `## ${labels.statusOverview}`,
    "",
    `| ${labels.open} | ${labels.understood} | ${labels.archived} |`,
    "| ---: | ---: | ---: |",
    `| ${open.length} | ${understood.length} | ${archived.length} |`,
    "",
    `## ${labels.keyFindings}`,
    "",
    ...(findings.length > 0
      ? findings.map((node) => {
        const fileName = nodeFileNames.get(node.id);
        const title = fileName ? markdownLink(node.title, `nodes/${fileName}`) : node.title;
        return `- **${title}** — ${(node.note || node.summary)?.trim()}`;
      })
      : [`- ${labels.noSummary}`]),
    "",
    `## ${labels.openQuestions}`,
    "",
    ...(open.length > 0
      ? open.map((node) => {
        const fileName = nodeFileNames.get(node.id);
        const title = fileName ? markdownLink(node.title, `nodes/${fileName}`) : node.title;
        return `- ${title}: ${firstUserQuestion(node) || node.anchorText || labels.noConversation}`;
      })
      : [`- ${labels.noChildren}`]),
    "",
    `## ${labels.navigation}`,
    "",
    `- ${labels.graphHome}: ${markdownLink("index.md", "index.md")}`,
    `- ${labels.canvasView}: ${markdownLink("map.canvas", "map.canvas")}`,
    "",
  ];

  return lines.join("\n");
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
  const path = pathOf(map, node);

  lines.push(`${nodeHeading(depth)} ${node.title}`);
  lines.push("");
  lines.push(`## ${labels.canvasCard}`);
  lines.push("");
  lines.push(`> [!summary] ${node.title}`);
  lines.push(`> ${labels.status}: ${nodeStatusLabel(node, labels)}`);
  if (node.note) {
    lines.push(...node.note.split(/\r?\n/).map((line, index) => `> ${index === 0 ? `${labels.personalNote}: ` : ""}${line}`));
  }
  lines.push(`> ${labels.nodeSummary}: ${node.summary || firstUserQuestion(node) || node.anchorText || labels.noSummary}`);
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
  lines.push(`- ${labels.canvasView}: ${markdownLink("map.canvas", "../map.canvas")}`);
  if (parent && parentFileName) {
    lines.push(`- ${labels.parent}: ${markdownLink(parent.title, parentFileName)}`);
  } else {
    lines.push(`- ${labels.parent}: ${labels.noParentRoot}`);
  }
  const pathLinks = path.map((pathNode) => {
    const pathFileName = nodeFileNames?.get(pathNode.id);
    return pathFileName && pathNode.id !== node.id ? markdownLink(pathNode.title, pathFileName) : pathNode.title;
  });
  lines.push(`- ${labels.explorationPath}: ${pathLinks.join(" / ")}`);
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

  lines.push(...renderCallout(labels.personalNote, node.note));
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
  const minY = Math.min(...[...positions.values()].map((position) => position.y));

  const canvas: JsonCanvasFile = {
    nodes: [
      {
        id: "overview",
        type: "text",
        text: [
          `# ${canvasPlainText(truncateForExport(map.title, 64))}`,
          "",
          `${labels.overview} · ${labels.nodeCount} ${nodes.length} · ${labels.edgeCount} ${map.edges.length}`,
          "",
          labels.fullConversationHint,
          "",
          markdownLink(labels.graphHome, joinExportPath(options.exportFolder, "index.md")),
        ].join("\n"),
        x: 0,
        y: minY - CANVAS_OVERVIEW_HEIGHT - 100,
        width: CANVAS_OVERVIEW_WIDTH,
        height: CANVAS_OVERVIEW_HEIGHT,
      },
      ...nodes.map((node) => {
        const position = positions.get(node.id) ?? { x: node.position.x, y: node.position.y, depth: depthOf(map, node) };
        const fileName = nodeFileNames.get(node.id) ?? nodeFileName(0, node);

        return {
          id: node.id,
          type: "text" as const,
          text: canvasCardText(node, labels, canvasNodeFilePath(fileName, options)),
          x: position.x,
          y: position.y,
          width: CANVAS_NODE_WIDTH,
          height: CANVAS_NODE_HEIGHT,
          color: nodeCanvasColor(node, node.id === map.rootNodeId),
        };
      }),
    ],
    edges: map.edges.filter((edge) => positions.has(edge.from) && positions.has(edge.to)).map((edge) => ({
      id: edge.id,
      fromNode: edge.from,
      toNode: edge.to,
      fromSide: "right",
      toSide: "left",
      toEnd: "arrow",
      color: nodeCanvasColor(map.nodes[edge.to] ?? root, edge.to === map.rootNodeId),
    })),
  };

  return `${JSON.stringify(canvas, null, 2)}\n`;
}

export function buildExportFiles(map: ChatMap, options: BuildExportFilesOptions = {}): ExportFile[] {
  const labels = exportLabels(options.language);
  const root = map.nodes[map.rootNodeId];
  const nodes = walkNodes(map);
  const nodeFileNames = new Map(nodes.map((node, index) => [node.id, nodeFileName(index, node)]));
  const rootSummary = root ? nodeSummaryLine(root, labels) : labels.missingRoot;
  const rootFileName = root ? nodeFileNames.get(root.id) : undefined;
  const nodeIndexLines = nodes.map((node, index) => {
    const indent = "  ".repeat(depthOf(map, node));
    const fileName = nodeFileNames.get(node.id) ?? nodeFileName(index, node);
    return `${indent}- [${node.title}](nodes/${fileName}): ${nodeSummaryLine(node, labels)}`;
  });
  const isConversationEmpty = nodes.every((node) => node.messages.length === 0);
  const understoodCount = nodes.filter((node) => node.status === "understood").length;
  const openCount = nodes.filter((node) => node.status === "open").length;
  const archivedCount = nodes.filter((node) => node.status === "archived").length;
  const researchBrief = buildResearchBrief(map, nodes, labels, nodeFileNames);

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
    `| ${labels.rootQuestion} | ${tableCell(rootFileName && root ? `[${root.title}](nodes/${rootFileName})` : root?.title ?? labels.missingRoot)} |`,
    `| ${labels.nodeCount} | ${nodes.length} |`,
    `| ${labels.edgeCount} | ${map.edges.length} |`,
    `| ${labels.statusOverview} | ${labels.open} ${openCount} · ${labels.understood} ${understoodCount} · ${labels.archived} ${archivedCount} |`,
    `| ${labels.createdAt} | ${formatDateTime(map.createdAt)} |`,
    `| ${labels.updatedAt} | ${formatDateTime(map.updatedAt)} |`,
    "",
    "## " + labels.indexEntry,
    "",
    `- ${labels.canvasView}: ${markdownLink("map.canvas", "map.canvas")}`,
    `- ${labels.researchBrief}: ${markdownLink("brief.md", "brief.md")}`,
    `- ${labels.personalNote}: ${markdownLink("notes.md", "notes.md")}`,
    `- ${labels.graphImage}: ${markdownLink("map.svg", "map.svg")}`,
    "",
    "![](map.svg)",
    "",
    "## " + labels.readingRoute,
    "",
    ...(nodeIndexLines.length > 0 ? nodeIndexLines : [`- ${labels.noConversation}`]),
    ...(isConversationEmpty ? [`- ${labels.noConversation}`] : []),
    "",
    "## " + labels.fileStructure,
    "",
    `- \`index.md\`: ${labels.indexEntry}`,
    `- \`brief.md\`: ${labels.researchBrief}`,
    `- \`notes.md\`: ${labels.personalNote}`,
    `- \`nodes/\`: ${labels.nodesFolder}`,
    `- \`map.canvas\`: ${labels.canvasView}`,
    `- \`map.svg\`: ${labels.graphImage}`,
    "",
    "## " + labels.usageAdvice,
    "",
    `- ${labels.fullConversationHint}`,
    "",
  ];
  const indexContent = indexLines.join("\n");
  const positions = buildCanvasLayout(map, nodes);
  const graphImage = renderGraphSvg(
    map.title,
    `${labels.nodeCount} ${nodes.length} · ${labels.edgeCount} ${map.edges.length} · ${labels.fullConversationHint}`,
    labels.openFullNote,
    nodes.map((node) => ({
      ...graphCardContent(node, labels),
      id: node.id,
      x: positions.get(node.id)?.x ?? 0,
      y: positions.get(node.id)?.y ?? 0,
      root: node.id === map.rootNodeId,
      color: nodeCanvasColor(node, node.id === map.rootNodeId),
      notePath: `nodes/${nodeFileNames.get(node.id) ?? nodeFileName(0, node)}`,
    })),
    map.edges,
  );

  return [
    {
      path: "index.md",
      content: indexContent,
    },
    {
      path: "brief.md",
      content: researchBrief,
    },
    {
      path: "notes.md",
      content: exportNodeNotes(map, nodes, nodeFileNames, options.language ?? "zh-CN"),
    },
    ...nodes.map((node, index) => ({
      path: `nodes/${nodeFileNames.get(node.id) ?? nodeFileName(index, node)}`,
      content: renderNodeMarkdown(map, node, 1, labels, nodeFileNames),
    })),
    {
      path: "map.canvas",
      content: exportCanvas(map, options),
    },
    {
      path: "map.svg",
      content: graphImage,
    },
  ];
}

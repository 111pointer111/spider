import type { AppLanguage, ChatNodeStatus, ChatRole } from "./types";

export type TranslationKey =
  | "appName"
  | "openMap"
  | "createChildCommand"
  | "createChildFromSelectionCommand"
  | "goToParentCommand"
  | "summarizeCurrentNodeCommand"
  | "exportMapCommand"
  | "newMapCommand"
  | "switchMapCommand"
  | "deleteNode"
  | "viewNotReady"
  | "defaultMapTitle"
  | "rootQuestionTitle"
  | "untitledQuestionTitle"
  | "loading"
  | "newChild"
  | "mapStats"
  | "nodeStats"
  | "autoLayout"
  | "export"
  | "deleteMap"
  | "switchMapHint"
  | "moreActions"
  | "confirmAutoLayout"
  | "confirmDeleteNode"
  | "confirmDeleteSubtree"
  | "searchNodes"
  | "searchPlaceholder"
  | "searchNoResults"
  | "updatedAt"
  | "nodesCount"
  | "rootNode"
  | "childOf"
  | "anchor"
  | "summary"
  | "parent"
  | "summarize"
  | "markUnderstood"
  | "statusOpen"
  | "statusUnderstood"
  | "statusArchived"
  | "nodeMessages"
  | "streaming"
  | "emptyHint"
  | "composerPlaceholder"
  | "send"
  | "stop"
  | "retry"
  | "retryUnavailable"
  | "exported"
  | "apiTest"
  | "apiTesting"
  | "apiTestSuccess"
  | "apiTestFailed"
  | "apiAuthFailed"
  | "apiEndpointNotFound"
  | "apiRequestFailedShort"
  | "missingApiBaseUrl"
  | "missingApiKey"
  | "missingModel"
  | "aiRequestFailed"
  | "emptyAiResponse"
  | "streamUnavailable"
  | "generationStoppedWithPartial"
  | "settingsTitle"
  | "settingLanguageName"
  | "settingLanguageDesc"
  | "settingApiBaseUrlName"
  | "settingApiBaseUrlDesc"
  | "settingApiKeyName"
  | "settingApiKeyDesc"
  | "settingModelName"
  | "settingModelDesc"
  | "settingExportFolderName"
  | "settingExportFolderDesc"
  | "settingTabName"
  | "settingTabDesc"
  | "settingParentContextName"
  | "settingParentContextDesc"
  | "settingFullContextName"
  | "settingFullContextDesc"
  | "settingStreamName"
  | "settingStreamDesc"
  | "settingAutoSummaryName"
  | "settingAutoSummaryDesc";

type TranslationDictionary = Record<TranslationKey, string>;

const zh: TranslationDictionary = {
  appName: "spider",
  openMap: "打开 spider",
  createChildCommand: "创建子节点",
  createChildFromSelectionCommand: "从选中文本创建子节点",
  goToParentCommand: "回到父节点",
  summarizeCurrentNodeCommand: "总结当前节点",
  exportMapCommand: "导出图谱",
  deleteNode: "删除节点",
  newMapCommand: "新建 spider",
  switchMapCommand: "切换 spider 图谱",
  viewNotReady: "spider 还没准备好。",
  defaultMapTitle: "未命名对话图谱",
  rootQuestionTitle: "根问题",
  untitledQuestionTitle: "未命名问题",
  loading: "正在加载 spider...",
  newChild: "新建子节点",
  mapStats: "{nodes} 个节点 · 当前第 {depth} 层",
  nodeStats: "{messages} 条消息 · {children} 个子节点",
  autoLayout: "自动布局",
  export: "导出",
  deleteMap: "删除图谱",
  switchMapHint: "切换图谱",
  moreActions: "更多",
  confirmAutoLayout: "自动布局会重新排列当前图谱，可能覆盖你手动拖动的位置。确认继续？",
  confirmDeleteNode: "确认删除当前节点？此操作不可撤销。",
  confirmDeleteSubtree: "确认删除当前节点及其 {count} 个子节点？此操作不可撤销。",
  searchNodes: "搜索节点",
  searchPlaceholder: "搜索标题、摘要、锚点或消息",
  searchNoResults: "没有找到匹配节点",
  updatedAt: "更新于 {time}",
  nodesCount: "{count} 个节点",
  rootNode: "根节点",
  childOf: "上级：{title}",
  anchor: "原文锚点",
  summary: "节点总结",
  parent: "返回上级",
  summarize: "总结",
  markUnderstood: "已理解",
  statusOpen: "进行中",
  statusUnderstood: "已理解",
  statusArchived: "已归档",
  nodeMessages: "节点消息",
  streaming: "生成中",
  emptyHint: "按 Tab 创建子节点，或输入问题后按 Enter 发送。",
  composerPlaceholder: "输入当前节点的问题。Enter 发送，Shift + Enter 换行，Tab 创建子节点。",
  send: "发送",
  stop: "停止",
  retry: "重试",
  retryUnavailable: "只有最新一条用户消息生成失败后才能重试。",
  exported: "已导出到 {path}",
  apiTest: "测试 API",
  apiTesting: "正在测试...",
  apiTestSuccess: "API 配置可用，模型响应正常。",
  apiTestFailed: "API 测试失败，请查看详情。",
  apiAuthFailed: "API Key 无效或没有权限。",
  apiEndpointNotFound: "没有找到接口，请检查 API 地址是否包含正确的 /v1 基础路径。",
  apiRequestFailedShort: "AI 请求失败（{status}）。",
  missingApiBaseUrl: "缺少 API 地址。请在 spider 设置里填写。",
  missingApiKey: "缺少 API Key。请在 spider 设置里填写。",
  missingModel: "缺少模型名称。请在 spider 设置里填写。",
  aiRequestFailed: "AI 请求失败（{status}）。{body}",
  emptyAiResponse: "AI 返回为空。",
  streamUnavailable: "当前接口没有返回可读取的流。",
  generationStoppedWithPartial: "已停止生成，已保存当前部分回复。",
  settingsTitle: "spider",
  settingLanguageName: "界面语言",
  settingLanguageDesc: "切换插件界面语言。切换后当前设置页会立即刷新。",
  settingApiBaseUrlName: "API 地址",
  settingApiBaseUrlDesc: "OpenAI-compatible 的 chat completions 基础地址。",
  settingApiKeyName: "API Key",
  settingApiKeyDesc: "保存在本机 Obsidian 插件数据里。",
  settingModelName: "模型",
  settingModelDesc: "填写你的 OpenAI-compatible 服务支持的模型名。",
  settingExportFolderName: "默认导出文件夹",
  settingExportFolderDesc: "Markdown、Mermaid 和 Canvas 会导出到这里。",
  settingTabName: "使用 Tab 创建子节点",
  settingTabDesc: "开启后，插件视图内 Tab 会创建子节点，而不是输入缩进。",
  settingParentContextName: "携带上级上下文",
  settingParentContextDesc: "子节点请求会携带上级标题、总结和选中的原文锚点。",
  settingFullContextName: "全图谱上下文",
  settingFullContextDesc: "开启后 AI 请求会携带图谱中其他节点的对话记录作为参考，消耗更多 token。",
  settingStreamName: "流式输出",
  settingStreamDesc: "开启后 AI 回复会边生成边显示。",
  settingAutoSummaryName: "自动总结节点",
  settingAutoSummaryDesc: "每次 AI 回复后生成一句简短节点总结。",
};

const en: TranslationDictionary = {
  appName: "spider",
  openMap: "Open spider",
  createChildCommand: "Create child node",
  createChildFromSelectionCommand: "Create child node from selection",
  goToParentCommand: "Go to parent node",
  summarizeCurrentNodeCommand: "Summarize current node",
  exportMapCommand: "Export map",
  deleteNode: "Delete node",
  newMapCommand: "New spider",
  switchMapCommand: "Switch spider map",
  viewNotReady: "spider is not ready yet.",
  defaultMapTitle: "Untitled chat map",
  rootQuestionTitle: "Root question",
  untitledQuestionTitle: "Untitled question",
  loading: "Loading spider...",
  newChild: "New child",
  mapStats: "{nodes} nodes · depth {depth}",
  nodeStats: "{messages} messages · {children} children",
  autoLayout: "Auto layout",
  export: "Export",
  deleteMap: "Delete map",
  switchMapHint: "Switch map",
  moreActions: "More",
  confirmAutoLayout: "Auto layout will rearrange this map and may overwrite manually dragged positions. Continue?",
  confirmDeleteNode: "Delete the current node? This cannot be undone.",
  confirmDeleteSubtree: "Delete the current node and its {count} child nodes? This cannot be undone.",
  searchNodes: "Search nodes",
  searchPlaceholder: "Search titles, summaries, anchors, or messages",
  searchNoResults: "No matching nodes",
  updatedAt: "Updated {time}",
  nodesCount: "{count} nodes",
  rootNode: "Root node",
  childOf: "Child of {title}",
  anchor: "Anchor",
  summary: "Summary",
  parent: "Parent",
  summarize: "Summarize",
  markUnderstood: "Mark understood",
  statusOpen: "Open",
  statusUnderstood: "Understood",
  statusArchived: "Archived",
  nodeMessages: "Node messages",
  streaming: "Generating",
  emptyHint: "Press Tab to create a child node, or type a question and press Enter.",
  composerPlaceholder: "Ask this node. Enter sends, Shift + Enter adds a line, Tab creates a child.",
  send: "Send",
  stop: "Stop",
  retry: "Retry",
  retryUnavailable: "Retry is available after the latest user message fails.",
  exported: "Exported to {path}",
  apiTest: "Test API",
  apiTesting: "Testing...",
  apiTestSuccess: "API configuration works and the model responded.",
  apiTestFailed: "API test failed. Check details.",
  apiAuthFailed: "The API key is invalid or does not have access.",
  apiEndpointNotFound: "Endpoint not found. Check that the API base URL includes the correct /v1 path.",
  apiRequestFailedShort: "AI request failed ({status}).",
  missingApiBaseUrl: "Missing API base URL. Add one in spider settings.",
  missingApiKey: "Missing API key. Add one in spider settings.",
  missingModel: "Missing model. Add one in spider settings.",
  aiRequestFailed: "AI request failed ({status}). {body}",
  emptyAiResponse: "AI response was empty.",
  streamUnavailable: "The API did not return a readable stream.",
  generationStoppedWithPartial: "Generation stopped. The partial response was saved.",
  settingsTitle: "spider",
  settingLanguageName: "Interface language",
  settingLanguageDesc: "Switch the plugin interface language. The settings page refreshes immediately.",
  settingApiBaseUrlName: "API base URL",
  settingApiBaseUrlDesc: "OpenAI-compatible chat completions base URL.",
  settingApiKeyName: "API key",
  settingApiKeyDesc: "Stored in Obsidian plugin data on this device.",
  settingModelName: "Model",
  settingModelDesc: "Any model accepted by your OpenAI-compatible endpoint.",
  settingExportFolderName: "Default export folder",
  settingExportFolderDesc: "Markdown, Mermaid, and Canvas exports are written here.",
  settingTabName: "Use Tab to create child nodes",
  settingTabDesc: "When enabled, Tab creates a child node instead of inserting indentation inside the plugin view.",
  settingParentContextName: "Include parent context",
  settingParentContextDesc: "Send parent title, summary, and selected anchor text with child-node AI requests.",
  settingFullContextName: "Full map context",
  settingFullContextDesc: "Include other nodes' conversations in AI requests for full context. Uses more tokens.",
  settingStreamName: "Stream responses",
  settingStreamDesc: "Show AI responses as they are generated.",
  settingAutoSummaryName: "Auto-summarize nodes",
  settingAutoSummaryDesc: "Generate a short summary after each AI response.",
};

const dictionaries: Record<AppLanguage, TranslationDictionary> = {
  "zh-CN": zh,
  en,
};

export function t(language: AppLanguage, key: TranslationKey, vars: Record<string, string | number> = {}): string {
  const template = dictionaries[language]?.[key] ?? dictionaries.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(vars[name] ?? ""));
}

export function displayTitle(language: AppLanguage, title: string): string {
  if (language !== "zh-CN") {
    return title;
  }

  const legacyTitles: Record<string, string> = {
    "Untitled chat map": zh.defaultMapTitle,
    "Root question": zh.rootQuestionTitle,
    "Untitled question": zh.untitledQuestionTitle,
  };

  return legacyTitles[title] ?? title;
}

export function statusLabel(language: AppLanguage, status: ChatNodeStatus): string {
  if (language === "zh-CN") {
    const labels: Record<ChatNodeStatus, string> = {
      open: "进行中",
      understood: "已理解",
      archived: "已归档",
    };
    return labels[status];
  }

  return status;
}

export function roleLabel(language: AppLanguage, role: ChatRole): string {
  if (language === "zh-CN") {
    const labels: Record<ChatRole, string> = {
      system: "系统",
      user: "你",
      assistant: "AI",
    };
    return labels[role];
  }

  return role;
}

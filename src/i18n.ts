import type { AppLanguage, ChatNodeStatus, ChatRole } from "./types";

export type TranslationKey =
  | "selectionSaved"
  | "saveSelection"
  | "notesHint"
  | "settingsIntro"
  | "settingsGeneral"
  | "settingsConnection"
  | "settingsConnectionDesc"
  | "settingsLearning"
  | "settingsLearningDesc"
  | "settingTeachingStyle"
  | "styleDefault"
  | "styleTeacher"
  | "styleSocratic"
  | "styleConcise"
  | "styleCustom"
  | "settingSystemPrompt"
  | "systemPromptDesc"
  | "systemPromptPreview"
  | "systemPromptPlaceholder"
  | "settingsInteraction"
  | "settingsInteractionDesc"
  | "settingsExport"
  | "settingsExportDesc"
  | "settingsPrivacy"
  | "viewReleaseNotes"

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
  | "delete"
  | "cancel"
  | "viewNotReady"
  | "defaultMapTitle"
  | "rootQuestionTitle"
  | "untitledQuestionTitle"
  | "loading"
  | "newChild"
  | "mapNameLabel"
  | "explorationPath"
  | "currentNodeLabel"
  | "selectedSourceHint"
  | "branchSource"
  | "nodeSummaryLabel"
  | "nodeNote"
  | "addNodeNote"
  | "editNodeNote"
  | "nodeNotePlaceholder"
  | "nodeNoteEmpty"
  | "noteSaving"
  | "noteSaved"
  | "closeNodeNote"
  | "hasAnchorText"
  | "hasAiSummary"
  | "autoLayout"
  | "layout"
  | "export"
  | "deleteMap"
  | "switchMapHint"
  | "moreActions"
  | "confirmAutoLayout"
  | "confirmDeleteMap"
  | "confirmDeleteNode"
  | "confirmDialogOpenFailed"
  | "mapDeleted"
  | "mapFileNotFound"
  | "deleteFailed"
  | "searchNodes"
  | "searchPlaceholder"
  | "searchNoResults"
  | "mapSwitcherPlaceholder"
  | "mapSwitcherEmpty"
  | "galleryEmpty"
  | "rootLabel"
  | "noMessagesYet"
  | "updatedAt"
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
  | "apiTestDesc"
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
  | "connectAiTitle"
  | "connectAiBody"
  | "openSettings"
  | "openSettingsFailed"
  | "composerLabel"
  | "nodeTitleLabel"
  | "graphCanvasLabel"
  | "nodeStatusLabel"
  | "scrollTop"
  | "scrollLatest"
  | "details"
  | "onboardingCardLabel"
  | "onboardingAskTitle"
  | "onboardingAskBody"
  | "onboardingBranchTitle"
  | "onboardingBranchBody"
  | "onboardingChildTitle"
  | "onboardingChildBody"
  | "onboardingDoneTitle"
  | "onboardingDoneBody"
  | "onboardingDismiss"
  | "onboardingFinishButton"
  | "onboardingChildCreatedNotice"
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
  | "settingAutoSummaryDesc"
  | "settingOnboardingName"
  | "settingOnboardingDesc"
  | "settingOnboardingButton"
  | "settingOnboardingRestored";

type TranslationDictionary = Record<TranslationKey, string>;

const zh: TranslationDictionary = {
  selectionSaved: "已加入当前节点随记",
  saveSelection: "加入随记",
  notesHint: "选中 AI 回答，按 Enter 摘录；也可以在这里写下自己的理解。",
  settingsIntro: "配置你的 AI，选择适合自己的学习方式。",
  settingsGeneral: "通用",
  settingsConnection: "AI 连接",
  settingsConnectionDesc: "使用你自己的 API 服务。密钥保存在当前笔记库中。",
  settingsLearning: "学习方式",
  settingsLearningDesc: "决定 AI 如何讲解概念；修改后从下一次提问开始生效。",
  settingTeachingStyle: "教学风格",
  styleDefault: "默认 · 保持原有回答方式",
  styleTeacher: "循序渐进 · 从基础到全貌",
  styleSocratic: "启发提问 · 引导自己思考",
  styleConcise: "简明要点 · 快速掌握概念",
  styleCustom: "自定义 · 设计自己的老师",
  settingSystemPrompt: "系统提示词",
  systemPromptDesc: "可以设定老师的角色、讲解口吻、详细程度和教学方法。留空则使用默认方式。",
  systemPromptPreview: "模板预览；选择「自定义」可以编写自己的提示词。",
  systemPromptPlaceholder: "例如：你是一位耐心的物理老师，请用生活中的例子讲解概念……",
  settingsInteraction: "对话与分支",
  settingsInteractionDesc: "控制上下文范围和阅读体验。",
  settingsExport: "笔记与导出",
  settingsExportDesc: "选中 AI 正文：Tab 创建分支，Enter 加入节点随记。导出会保留节点路径和层次。",
  settingsPrivacy: "图谱与随记存储在本地。AI 请求只发送到你配置的端点；Spider 不收集使用统计。",
  viewReleaseNotes: "查看更新说明",
  appName: "Spider",
  openMap: "打开 Spider",
  createChildCommand: "创建分支",
  createChildFromSelectionCommand: "从选中文本创建分支",
  goToParentCommand: "回到父节点",
  summarizeCurrentNodeCommand: "总结当前节点",
  exportMapCommand: "导出图谱",
  deleteNode: "删除节点",
  delete: "删除",
  cancel: "取消",
  newMapCommand: "新建 Spider 图谱",
  switchMapCommand: "切换 Spider 图谱",
  viewNotReady: "Spider 还没准备好。",
  defaultMapTitle: "未命名对话图谱",
  rootQuestionTitle: "根问题",
  untitledQuestionTitle: "未命名问题",
  loading: "正在加载 Spider...",
  newChild: "创建分支",
  mapNameLabel: "图谱",
  explorationPath: "探索路径",
  currentNodeLabel: "当前节点",
  selectedSourceHint: "来自上一节点选中的原文",
  branchSource: "追问来源",
  nodeSummaryLabel: "结论",
  nodeNote: "个人随记",
  addNodeNote: "添加节点笔记",
  editNodeNote: "编辑节点笔记",
  nodeNotePlaceholder: "记录你的判断、结论或待办，支持 Markdown。",
  nodeNoteEmpty: "点击记录你对这个节点的判断或结论。",
  noteSaving: "保存中…",
  noteSaved: "已自动保存",
  closeNodeNote: "关闭节点笔记",
  hasAnchorText: "有原文",
  hasAiSummary: "有 AI 总结",
  autoLayout: "自动布局",
  layout: "布局",
  export: "导出",
  deleteMap: "删除图谱",
  switchMapHint: "切换图谱",
  moreActions: "更多",
  confirmAutoLayout: "自动布局会重新排列当前图谱，可能覆盖你手动拖动的位置。确认继续？",
  confirmDeleteMap: "确认删除「{title}」？此操作不可撤销。",
  confirmDeleteNode: "确认删除当前节点？此操作不可撤销。",
  confirmDialogOpenFailed: "打开确认弹窗失败：{message}",
  mapDeleted: "图谱已删除",
  mapFileNotFound: "未找到该图谱文件",
  deleteFailed: "删除失败：{message}",
  searchNodes: "搜索节点",
  searchPlaceholder: "搜索标题、笔记、摘要、锚点或消息",
  searchNoResults: "没有找到匹配节点",
  mapSwitcherPlaceholder: "切换 Spider 图谱...",
  mapSwitcherEmpty: "没有找到图谱。",
  galleryEmpty: "还没有图谱。点击上方按钮创建一个。",
  rootLabel: "根问题",
  noMessagesYet: "暂无对话",
  updatedAt: "更新于 {time}",
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
  emptyHint: "先输入一个问题。AI 回复后，选中文字按 Tab 深入探索，按 Enter 保存到随记。",
  composerPlaceholder: "问这个节点的问题。Enter 发送，Shift + Enter 换行。",
  send: "发送",
  stop: "停止",
  retry: "重试",
  retryUnavailable: "只有最新一条用户消息生成失败后才能重试。",
  exported: "已导出到 {path}",
  apiTest: "测试 API",
  apiTestDesc: "验证当前 API 地址、API Key 和模型是否可用。",
  apiTesting: "正在测试...",
  apiTestSuccess: "API 配置可用，模型响应正常。",
  apiTestFailed: "API 测试失败，请查看详情。",
  apiAuthFailed: "API Key 无效或没有权限。",
  apiEndpointNotFound: "没有找到接口，请检查 API 地址是否包含正确的 /v1 基础路径。",
  apiRequestFailedShort: "AI 请求失败（{status}）。",
  missingApiBaseUrl: "缺少 API 地址。请在 Spider 设置里填写。",
  missingApiKey: "缺少 API Key。请在 Spider 设置里填写。",
  missingModel: "缺少模型名称。请在 Spider 设置里填写。",
  aiRequestFailed: "AI 请求失败（{status}）。{body}",
  emptyAiResponse: "AI 返回为空。",
  streamUnavailable: "当前接口没有返回可读取的流。",
  generationStoppedWithPartial: "已停止生成，已保存当前部分回复。",
  connectAiTitle: "连接 AI 服务",
  connectAiBody: "先配置 OpenAI 兼容的 API 地址、API Key 和模型。你的草稿会保留在当前分支。",
  openSettings: "打开 Spider 设置",
  openSettingsFailed: "无法自动打开设置，请前往“设置 → Spider”。",
  composerLabel: "当前分支的问题",
  nodeTitleLabel: "节点标题",
  graphCanvasLabel: "知识图谱。使用方向键浏览节点，按 Tab 创建分支，按 Shift + Tab 返回父节点。",
  nodeStatusLabel: "节点状态",
  scrollTop: "回到顶部",
  scrollLatest: "跳到最新消息",
  details: "详情",
  onboardingCardLabel: "Spider 引导卡片",
  onboardingAskTitle: "从一个问题开始",
  onboardingAskBody: "先问一个根问题。Spider 会把这次探索固定成图谱里的起点。",
  onboardingBranchTitle: "把关键句拉成分支",
  onboardingBranchBody: "看到想深入的一句？选中它，按 Tab 创建分支。",
  onboardingChildTitle: "继续追问这段原文",
  onboardingChildBody: "这个子节点已带入选中的原文。现在直接追问它。",
  onboardingDoneTitle: "很棒哦，做得好，欢迎来到 Spider",
  onboardingDoneBody: "你已经完成核心流程。点击关闭结束引导；之后也可以在设置里重新显示。",
  onboardingDismiss: "隐藏引导",
  onboardingFinishButton: "关闭",
  onboardingChildCreatedNotice: "已从选中文本创建分支",
  settingsTitle: "Spider",
  settingLanguageName: "界面语言",
  settingLanguageDesc: "切换插件界面语言，所有已打开的 Spider 视图会立即刷新。",
  settingApiBaseUrlName: "API 地址",
  settingApiBaseUrlDesc: "OpenAI-compatible 的 chat completions 基础地址。",
  settingApiKeyName: "API Key",
  settingApiKeyDesc: "保存在本机 Obsidian 插件数据里。",
  settingModelName: "模型",
  settingModelDesc: "填写你的 OpenAI-compatible 服务支持的模型名。",
  settingExportFolderName: "默认导出文件夹",
  settingExportFolderDesc: "图谱首页、研究简报、节点对话和 Canvas 会导出到这里。",
  settingTabName: "使用 Tab 创建分支",
  settingTabDesc: "聚焦图谱画布时，Tab 会创建分支；在 AI 回复中选中文字后按 Tab，会从该文本创建分支。",
  settingParentContextName: "携带上级上下文",
  settingParentContextDesc: "分支请求会携带上级标题、总结和选中的原文锚点。",
  settingFullContextName: "全图谱上下文",
  settingFullContextDesc: "开启后 AI 请求会携带图谱中其他节点的对话记录作为参考，消耗更多 token。",
  settingStreamName: "流式输出",
  settingStreamDesc: "开启后 AI 回复会边生成边显示。",
  settingAutoSummaryName: "自动总结节点",
  settingAutoSummaryDesc: "每次 AI 回复后生成一句简短节点总结。",
  settingOnboardingName: "新手引导卡片",
  settingOnboardingDesc: "重新显示右侧面板里的 Spider 核心操作提示。",
  settingOnboardingButton: "重新显示",
  settingOnboardingRestored: "新手引导卡片已恢复。",
};

const en: TranslationDictionary = {
  selectionSaved: "Saved to this node’s notes",
  saveSelection: "Save to notes",
  notesHint: "Select an AI answer and press Enter to save a quote, or write your own insights here.",
  settingsIntro: "Connect your AI and choose how you want to learn.",
  settingsGeneral: "General",
  settingsConnection: "AI connection",
  settingsConnectionDesc: "Use your own API provider. Your key is stored in this vault.",
  settingsLearning: "Learning style",
  settingsLearningDesc: "Choose how AI explains concepts. Changes apply to your next question.",
  settingTeachingStyle: "Teaching style",
  styleDefault: "Default · original behavior",
  styleTeacher: "Step by step · build understanding",
  styleSocratic: "Socratic · learn through questions",
  styleConcise: "Concise · focus on key ideas",
  styleCustom: "Custom · design your own teacher",
  settingSystemPrompt: "System prompt",
  systemPromptDesc: "Set a teacher’s role, tone, level of detail, and method. Leave blank for the default behavior.",
  systemPromptPreview: "Template preview. Choose Custom to write your own prompt.",
  systemPromptPlaceholder: "Example: You are a patient physics teacher. Explain concepts using everyday examples…",
  settingsInteraction: "Chat and branches",
  settingsInteractionDesc: "Control context and your reading experience.",
  settingsExport: "Notes and export",
  settingsExportDesc: "Select AI text: Tab creates a branch; Enter saves a quote. Exports preserve node paths and hierarchy.",
  settingsPrivacy: "Maps and notes stay local. AI requests go to your configured endpoint; Spider does not collect usage analytics.",
  viewReleaseNotes: "Read release notes",
  appName: "Spider",
  openMap: "Open Spider",
  createChildCommand: "Create branch",
  createChildFromSelectionCommand: "Create branch from selection",
  goToParentCommand: "Go to parent node",
  summarizeCurrentNodeCommand: "Summarize current node",
  exportMapCommand: "Export map",
  deleteNode: "Delete node",
  delete: "Delete",
  cancel: "Cancel",
  newMapCommand: "New Spider map",
  switchMapCommand: "Switch Spider map",
  viewNotReady: "Spider is not ready yet.",
  defaultMapTitle: "Untitled chat map",
  rootQuestionTitle: "Root question",
  untitledQuestionTitle: "Untitled question",
  loading: "Loading Spider...",
  newChild: "Create branch",
  mapNameLabel: "Map",
  explorationPath: "Exploration path",
  currentNodeLabel: "Current node",
  selectedSourceHint: "Selected from the parent branch",
  branchSource: "Source text",
  nodeSummaryLabel: "Summary",
  nodeNote: "Personal notes",
  addNodeNote: "Add node note",
  editNodeNote: "Edit node note",
  nodeNotePlaceholder: "Capture your judgment, conclusion, or next step. Markdown is supported.",
  nodeNoteEmpty: "Click to record your judgment or conclusion for this node.",
  noteSaving: "Saving…",
  noteSaved: "Autosaved",
  closeNodeNote: "Close node note",
  hasAnchorText: "Has source",
  hasAiSummary: "Has AI summary",
  autoLayout: "Auto layout",
  layout: "Layout",
  export: "Export",
  deleteMap: "Delete map",
  switchMapHint: "Switch map",
  moreActions: "More",
  confirmAutoLayout: "Auto layout will rearrange this map and may overwrite manually dragged positions. Continue?",
  confirmDeleteMap: "Delete “{title}”? This cannot be undone.",
  confirmDeleteNode: "Delete the current node? This cannot be undone.",
  confirmDialogOpenFailed: "Could not open the confirmation dialog: {message}",
  mapDeleted: "Map deleted",
  mapFileNotFound: "Map file not found",
  deleteFailed: "Delete failed: {message}",
  searchNodes: "Search nodes",
  searchPlaceholder: "Search titles, notes, summaries, anchors, or messages",
  searchNoResults: "No matching nodes",
  mapSwitcherPlaceholder: "Switch Spider map...",
  mapSwitcherEmpty: "No maps found.",
  galleryEmpty: "No maps yet. Create one above.",
  rootLabel: "Root question",
  noMessagesYet: "No messages yet",
  updatedAt: "Updated {time}",
  rootNode: "Root node",
  childOf: "Child of {title}",
  anchor: "Source text",
  summary: "Summary",
  parent: "Go to parent",
  summarize: "Summarize",
  markUnderstood: "Mark understood",
  statusOpen: "Open",
  statusUnderstood: "Understood",
  statusArchived: "Archived",
  nodeMessages: "Node messages",
  streaming: "Generating",
  emptyHint: "Start with a question. In an AI answer, select text and press Tab to explore further or Enter to save a quote.",
  composerPlaceholder: "Ask a question in this branch. Enter sends; Shift + Enter adds a line.",
  send: "Send",
  stop: "Stop",
  retry: "Retry",
  retryUnavailable: "Retry is available after the latest user message fails.",
  exported: "Exported to {path}",
  apiTest: "Test API",
  apiTestDesc: "Verify the current endpoint, API key, and model.",
  apiTesting: "Testing...",
  apiTestSuccess: "API configuration works and the model responded.",
  apiTestFailed: "API test failed. Check details.",
  apiAuthFailed: "The API key is invalid or does not have access.",
  apiEndpointNotFound: "Endpoint not found. Check that the API base URL includes the correct /v1 path.",
  apiRequestFailedShort: "AI request failed ({status}).",
  missingApiBaseUrl: "Missing API base URL. Add one in Spider settings.",
  missingApiKey: "Missing API key. Add one in Spider settings.",
  missingModel: "Missing model. Add one in Spider settings.",
  aiRequestFailed: "AI request failed ({status}). {body}",
  emptyAiResponse: "AI response was empty.",
  streamUnavailable: "The API did not return a readable stream.",
  generationStoppedWithPartial: "Generation stopped. The partial response was saved.",
  connectAiTitle: "Connect an AI provider",
  connectAiBody: "Configure an OpenAI-compatible endpoint, API key, and model first. Your draft will stay in this branch.",
  openSettings: "Open Spider settings",
  openSettingsFailed: "Could not open settings automatically. Go to Settings → Spider.",
  composerLabel: "Question for this branch",
  nodeTitleLabel: "Node title",
  graphCanvasLabel: "Knowledge map. Use arrow keys to navigate nodes, Tab to create a branch, and Shift + Tab to go to the parent.",
  nodeStatusLabel: "Node status",
  scrollTop: "Scroll to top",
  scrollLatest: "Jump to latest message",
  details: "Details",
  onboardingCardLabel: "Spider guide card",
  onboardingAskTitle: "Start with one question",
  onboardingAskBody: "Ask a root question first. Spider anchors this exploration as the starting point of the map.",
  onboardingBranchTitle: "Branch from the useful phrase",
  onboardingBranchBody: "Found a useful phrase? Select it and press Tab to branch.",
  onboardingChildTitle: "Follow up on this source text",
  onboardingChildBody: "This child node carries the selected source text. Ask your follow-up here.",
  onboardingDoneTitle: "Nice work. Welcome to Spider",
  onboardingDoneBody: "You have completed the core flow. Click Close to finish the guide; you can show it again from settings.",
  onboardingDismiss: "Hide guide",
  onboardingFinishButton: "Close",
  onboardingChildCreatedNotice: "Created a child node from selection",
  settingsTitle: "Spider",
  settingLanguageName: "Interface language",
  settingLanguageDesc: "Switch the plugin interface language. All open Spider views update immediately.",
  settingApiBaseUrlName: "API base URL",
  settingApiBaseUrlDesc: "OpenAI-compatible chat completions base URL.",
  settingApiKeyName: "API key",
  settingApiKeyDesc: "Stored in Obsidian plugin data on this device.",
  settingModelName: "Model",
  settingModelDesc: "Any model accepted by your OpenAI-compatible endpoint.",
  settingExportFolderName: "Default export folder",
  settingExportFolderDesc: "The map index, research brief, node conversations, and Canvas are exported here.",
  settingTabName: "Use Tab to create branches",
  settingTabDesc: "When the map canvas is focused, Tab creates a branch. Selecting text in an AI response and pressing Tab branches from that text.",
  settingParentContextName: "Include parent context",
  settingParentContextDesc: "Send the parent title, summary, and selected source text with branch requests.",
  settingFullContextName: "Full map context",
  settingFullContextDesc: "Include other nodes' conversations in AI requests for full context. Uses more tokens.",
  settingStreamName: "Stream responses",
  settingStreamDesc: "Show AI responses as they are generated.",
  settingAutoSummaryName: "Auto-summarize nodes",
  settingAutoSummaryDesc: "Generate a short summary after each AI response.",
  settingOnboardingName: "Onboarding guide cards",
  settingOnboardingDesc: "Show the Spider core workflow hints in the right panel again.",
  settingOnboardingButton: "Show again",
  settingOnboardingRestored: "Onboarding guide cards restored.",
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
  const defaultTitles: Record<AppLanguage, Record<string, string>> = {
    "zh-CN": {
      "Untitled chat map": zh.defaultMapTitle,
      "Root question": zh.rootQuestionTitle,
      "Untitled question": zh.untitledQuestionTitle,
    },
    en: {
      "未命名对话图谱": en.defaultMapTitle,
      "根问题": en.rootQuestionTitle,
      "未命名问题": en.untitledQuestionTitle,
    },
  };
  return defaultTitles[language][title] ?? title;
}

export function statusLabel(language: AppLanguage, status: ChatNodeStatus): string {
  const keys: Record<ChatNodeStatus, TranslationKey> = {
    open: "statusOpen",
    understood: "statusUnderstood",
    archived: "statusArchived",
  };
  return t(language, keys[status]);
}

export function roleLabel(language: AppLanguage, role: ChatRole): string {
  const labels: Record<AppLanguage, Record<ChatRole, string>> = {
    "zh-CN": { system: "系统", user: "你", assistant: "AI" },
    en: { system: "System", user: "You", assistant: "AI" },
  };
  return labels[language][role];
}

function englishCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function nodesCountLabel(language: AppLanguage, count: number): string {
  return language === "zh-CN" ? `${count} 个节点` : englishCount(count, "node", "nodes");
}

export function branchesCountLabel(language: AppLanguage, count: number): string {
  return language === "zh-CN" ? `${count} 分支` : englishCount(count, "branch", "branches");
}

export function mapStatsLabel(language: AppLanguage, nodes: number, depth: number): string {
  return language === "zh-CN"
    ? `${nodes} 个节点 · 当前第 ${depth} 层`
    : `${englishCount(nodes, "node", "nodes")} · depth ${depth}`;
}

export function nodeStatsLabel(language: AppLanguage, messages: number, children: number): string {
  return language === "zh-CN"
    ? `${messages} 条消息 · ${children} 个子节点`
    : `${englishCount(messages, "message", "messages")} · ${englishCount(children, "branch", "branches")}`;
}

export function confirmDeleteSubtreeLabel(language: AppLanguage, count: number): string {
  return language === "zh-CN"
    ? `确认删除当前节点及其 ${count} 个子节点？此操作不可撤销。`
    : `Delete the current node and its ${englishCount(count, "branch", "branches")}? This cannot be undone.`;
}

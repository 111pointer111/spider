export type NodeId = string;
export type MessageId = string;
export type ChatMapId = string;

export type ChatRole = "system" | "user" | "assistant";
export type ChatNodeStatus = "open" | "understood" | "archived";
export type AppLanguage = "zh-CN" | "en";
export type TeachingStyle = "default" | "teacher" | "socratic" | "concise" | "custom";

export interface ChatMessage {
  id: MessageId;
  role: ChatRole;
  content: string;
  createdAt: string;
}

/** UTF-16 offsets within a rendered message body; end is exclusive. */
export interface BranchSource {
  messageId: MessageId;
  start: number;
  end: number;
}

export interface ChatNode {
  id: NodeId;
  parentId?: NodeId;
  title: string;
  anchorText?: string;
  sourceMessageId?: MessageId;
  sourceTextRange?: { start: number; end: number };
  messages: ChatMessage[];
  summary?: string;
  note?: string;
  status: ChatNodeStatus;
  position: {
    x: number;
    y: number;
  };
  children: NodeId[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatEdge {
  id: string;
  from: NodeId;
  to: NodeId;
}

export interface ChatMap {
  id: ChatMapId;
  title: string;
  rootNodeId: NodeId;
  nodes: Record<NodeId, ChatNode>;
  edges: ChatEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface BranchChatMapSettings {
  language: AppLanguage;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  defaultExportFolder: string;
  useTabToCreateChildNodes: boolean;
  autoSummarizeNodes: boolean;
  includeParentContext: boolean;
  includeFullContext: boolean;
  streamResponses: boolean;
  onboardingCardDismissed: boolean;
  teachingStyle: TeachingStyle;
  customSystemPrompt: string;
  lastOpenedMapId?: string;
}

export interface AiChatRequest {
  node: ChatNode;
  parent?: ChatNode;
  contextMessages?: ChatMessage[];
  model: string;
  includeParentContext: boolean;
  signal?: AbortSignal;
}

export interface AiProvider {
  chat(request: AiChatRequest): Promise<string>;
  streamChat(request: AiChatRequest): AsyncGenerator<string>;
  summarizeNode(node: ChatNode, signal?: AbortSignal): Promise<string>;
  titleNode(node: ChatNode, signal?: AbortSignal): Promise<string>;
}

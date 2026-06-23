import { requestUrl } from "obsidian";
import type { AiChatRequest, AiProvider, AppLanguage, BranchChatMapSettings, ChatMessage, ChatNode } from "../types";
import { t } from "../i18n";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

function buildMessages(request: AiChatRequest, language: AppLanguage): ChatMessage[] {
  const messages: ChatMessage[] = [];

  messages.push({
    id: "system_language",
    role: "system",
    content:
      language === "zh-CN"
        ? "除非用户明确要求其他语言，否则请默认使用简体中文回答。回答要清晰、适合学习场景，并尽量保留关键术语。"
        : "Unless the user explicitly asks for another language, respond in English. Keep answers clear and useful for learning.",
    createdAt: new Date().toISOString(),
  });

  if (request.includeParentContext && request.parent) {
    const context = [
      `Parent topic: ${request.parent.title}`,
      request.parent.summary ? `Parent summary: ${request.parent.summary}` : "",
      request.node.anchorText ? `Selected anchor: ${request.node.anchorText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    messages.push({
      id: "system_parent_context",
      role: "system",
      content: `Use this compact context for the child question.\n${context}`,
      createdAt: new Date().toISOString(),
    });
  }

  if (request.contextMessages && request.contextMessages.length > 0) {
    messages.push({
      id: "system_full_context",
      role: "system",
      content:
        language === "zh-CN"
          ? "以下是当前图谱中其他节点的对话记录，供你参考整体上下文：\n\n" +
            request.contextMessages.map((m) => `${m.role}: ${m.content}`).join("\n")
          : "Below are conversations from other nodes in this map for context:\n\n" +
            request.contextMessages.map((m) => `${m.role}: ${m.content}`).join("\n"),
      createdAt: new Date().toISOString(),
    });
  }

  return [...messages, ...request.node.messages];
}

export class OpenAICompatibleProvider implements AiProvider {
  private readonly settings: BranchChatMapSettings;

  constructor(settings: BranchChatMapSettings) {
    this.settings = settings;
  }

  async chat(request: AiChatRequest): Promise<string> {
    return this.requestChatCompletion(buildMessages(request, this.settings.language), request.model, request.signal);
  }

  async *streamChat(request: AiChatRequest): AsyncGenerator<string> {
    yield* this.requestChatCompletionStream(buildMessages(request, this.settings.language), request.model, request.signal);
  }

  async summarizeNode(node: ChatNode, signal?: AbortSignal): Promise<string> {
    const messages: ChatMessage[] = [
      {
        id: "system_summary",
        role: "system",
        content:
          this.settings.language === "zh-CN"
            ? "用一句简洁的简体中文总结这个对话节点。只返回总结本身。"
            : "Summarize this chat node in one concise sentence. Return only the summary.",
        createdAt: new Date().toISOString(),
      },
      ...node.messages,
    ];

    return this.requestChatCompletion(messages, this.settings.model, signal);
  }

  async titleNode(node: ChatNode, signal?: AbortSignal): Promise<string> {
    const messages: ChatMessage[] = [
      {
        id: "system_title",
        role: "system",
        content:
          this.settings.language === "zh-CN"
            ? "为这个对话节点生成一个简短中文标题。只返回标题，不要解释，不要引号，不要句号，不超过 8 个字。"
            : "Create a short title for this chat node. Return only the title, no quotes, no period, under 8 words.",
        createdAt: new Date().toISOString(),
      },
      ...node.messages,
    ];

    return this.requestChatCompletion(messages, this.settings.model, signal);
  }

  private async requestChatCompletion(
    messages: ChatMessage[],
    model: string,
    signal?: AbortSignal,
  ): Promise<string> {
    if (!this.settings.apiKey) {
      throw new Error(t(this.settings.language, "missingApiKey"));
    }

    if (!model) {
      throw new Error(t(this.settings.language, "missingModel"));
    }

    const baseUrl = this.settings.apiBaseUrl.replace(/\/+$/, "");
    const response = await requestUrl({
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        stream: false,
      }),
      throw: false,
    });

    if (response.status < 200 || response.status >= 300) {
      const body = typeof response.text === "string" ? response.text.slice(0, 240) : "";
      throw new Error(t(this.settings.language, "aiRequestFailed", { status: response.status, body }));
    }

    const data = response.json as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error(t(this.settings.language, "emptyAiResponse"));
    }

    return content;
  }

  private async *requestChatCompletionStream(
    messages: ChatMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    if (!this.settings.apiKey) {
      throw new Error(t(this.settings.language, "missingApiKey"));
    }

    if (!model) {
      throw new Error(t(this.settings.language, "missingModel"));
    }

    const baseUrl = this.settings.apiBaseUrl.replace(/\/+$/, "");
    // Streaming requires fetch — requestUrl does not support ReadableStream
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(t(this.settings.language, "aiRequestFailed", { status: response.status, body: body.slice(0, 240) }));
    }

    if (!response.body) {
      throw new Error(t(this.settings.language, "streamUnavailable"));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let emitted = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) {
            continue;
          }

          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") {
            continue;
          }

          const chunk = JSON.parse(payload) as ChatCompletionChunk;
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            emitted = true;
            yield content;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!emitted) {
      throw new Error(t(this.settings.language, "emptyAiResponse"));
    }
  }
}

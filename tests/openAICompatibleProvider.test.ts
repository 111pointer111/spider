import { describe, expect, it, vi } from "vitest";
import { OpenAICompatibleProvider } from "../src/ai/openAICompatibleProvider";
import { createMessage, createNode } from "../src/domain/chatMap";
import type { BranchChatMapSettings } from "../src/types";

const settings: BranchChatMapSettings = {
  language: "zh-CN",
  apiBaseUrl: "https://example.test/v1",
  apiKey: "test-key",
  model: "test-model",
  defaultExportFolder: "Spider Maps",
  useTabToCreateChildNodes: true,
  autoSummarizeNodes: false,
  includeParentContext: true,
  includeFullContext: false,
  streamResponses: true,
};

function streamFromText(value: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(value));
      controller.close();
    },
  });
}

describe("OpenAICompatibleProvider", () => {
  it("tests API configuration with a minimal non-streaming request", async () => {
    const requestUrl = await import("obsidian").then((mod) => vi.mocked(mod.requestUrl));
    requestUrl.mockResolvedValueOnce({
      status: 200,
      text: "",
      json: { choices: [{ message: { content: "OK" } }] },
      arrayBuffer: new ArrayBuffer(0),
      headers: {},
    });

    const provider = new OpenAICompatibleProvider(settings);
    const result = await provider.testConnection();

    expect(result.ok).toBe(true);
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
      url: "https://example.test/v1/chat/completions",
      method: "POST",
    }));
  });

  it("maps API test auth errors to friendly messages with details", async () => {
    const requestUrl = await import("obsidian").then((mod) => vi.mocked(mod.requestUrl));
    requestUrl.mockResolvedValueOnce({
      status: 401,
      text: "bad key",
      json: {},
      arrayBuffer: new ArrayBuffer(0),
      headers: {},
    });

    const provider = new OpenAICompatibleProvider(settings);
    const result = await provider.testConnection();

    expect(result.ok).toBe(false);
    expect(result.message).toContain("API Key");
    expect(result.details).toContain("401");
  });

  it("validates missing model before testing API", async () => {
    const provider = new OpenAICompatibleProvider({ ...settings, model: "" });
    const result = await provider.testConnection();

    expect(result.ok).toBe(false);
    expect(result.message).toContain("模型");
  });

  it("streams OpenAI-compatible chunks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        streamFromText(
          [
            'data: {"choices":[{"delta":{"content":"你好"}}]}',
            'data: {"choices":[{"delta":{"content":"，世界"}}]}',
            "data: [DONE]",
            "",
          ].join("\n"),
        ),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAICompatibleProvider(settings);
    const node = createNode({
      title: "测试",
      messages: [createMessage("user", "解释一下流式输出")],
    });

    let content = "";
    for await (const chunk of provider.streamChat({
      node,
      model: settings.model,
      includeParentContext: true,
    })) {
      content += chunk;
    }

    expect(content).toBe("你好，世界");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"stream":true'),
      }),
    );

    vi.unstubAllGlobals();
  });
});

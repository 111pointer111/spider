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
  onboardingCardDismissed: false,
  teachingStyle: "default",
  customSystemPrompt: "",
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
  it("sends the teaching prompt with chat context but not metadata requests", async () => {
    const requestUrl = await import("obsidian").then((mod) => vi.mocked(mod.requestUrl));
    requestUrl.mockClear();
    requestUrl.mockResolvedValue({ status: 200, text: "", json: { choices: [{ message: { content: "answer" } }] }, arrayBuffer: new ArrayBuffer(0), headers: {} });
    const provider = new OpenAICompatibleProvider({ ...settings, teachingStyle: "custom", customSystemPrompt: "  用例子教我物理  " });
    const parent = { ...createNode({ title: "力学" }), summary: "研究运动" };
    const node = createNode({ title: "惯性", anchorText: "惯性", messages: [createMessage("user", "解释惯性")] });
    await provider.chat({ node, parent, model: settings.model, includeParentContext: true });
    const lastBody = () => {
      const request = requestUrl.mock.calls.at(-1)![0];
      if (typeof request === "string") throw new Error("Expected a POST request");
      if (typeof request.body !== "string") throw new Error("Expected a JSON body");
      return request.body;
    };
    const body = JSON.parse(lastBody()) as { messages: { role: string; content: string }[] };
    expect(body.messages).toContainEqual({ role: "system", content: "用例子教我物理" });
    expect(body.messages.some((message) => message.content.includes("Parent topic: 力学"))).toBe(true);
    expect(body.messages.at(-1)?.content).toBe("解释惯性");
    await provider.titleNode(node);
    expect(lastBody()).not.toContain("用例子教我物理");
    await provider.summarizeNode(node);
    expect(lastBody()).not.toContain("用例子教我物理");
  });
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

    const provider = new OpenAICompatibleProvider({ ...settings, teachingStyle: "teacher" });
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
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).messages.some((message: { content: string }) => message.content.includes("耐心的专业老师"))).toBe(true);
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

import { describe, expect, it, vi } from "vitest";
import { OpenAICompatibleProvider } from "../src/ai/openAICompatibleProvider";
import { createMessage, createNode } from "../src/domain/chatMap";
import type { BranchChatMapSettings } from "../src/types";

const settings: BranchChatMapSettings = {
  language: "zh-CN",
  apiBaseUrl: "https://example.test/v1",
  apiKey: "test-key",
  model: "test-model",
  defaultExportFolder: "Branch Chat Maps",
  useTabToCreateChildNodes: true,
  autoSummarizeNodes: false,
  includeParentContext: true,
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

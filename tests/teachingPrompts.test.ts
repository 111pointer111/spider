import { describe, expect, it } from "vitest";
import { resolveTeachingPrompt } from "../src/ai/teachingPrompts";
import { createDefaultSettings } from "../src/settingsDefaults";

describe("teaching styles", () => {
  it("preserves default behavior and supports blank custom prompts", () => {
    const settings = createDefaultSettings("en");
    expect(resolveTeachingPrompt(settings)).toBe("");
    expect(resolveTeachingPrompt({ ...settings, teachingStyle: "custom", customSystemPrompt: "  " })).toBe("");
    expect(resolveTeachingPrompt({ ...settings, teachingStyle: "custom", customSystemPrompt: " My teacher " })).toBe("My teacher");
  });
  it.each(["teacher", "socratic", "concise"] as const)("localizes %s without changing the user's custom prompt", (teachingStyle) => {
    const settings = { ...createDefaultSettings("en"), teachingStyle, customSystemPrompt: "my teacher" };
    expect(resolveTeachingPrompt(settings)).not.toBe(resolveTeachingPrompt({ ...settings, language: "zh-CN" }));
    expect(resolveTeachingPrompt({ ...settings, teachingStyle: "custom" })).toBe("my teacher");
  });
});

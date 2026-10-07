import type { AppLanguage, BranchChatMapSettings } from "./types";
import { DEFAULT_EXPORT_DIR } from "./constants";

export type MissingAiConfiguration = "apiBaseUrl" | "apiKey" | "model";

export function resolveAppLanguage(locale: string): AppLanguage {
  return locale.trim().toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function createDefaultSettings(locale: string): BranchChatMapSettings {
  return {
    language: resolveAppLanguage(locale),
    apiBaseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o-mini",
    defaultExportFolder: DEFAULT_EXPORT_DIR,
    useTabToCreateChildNodes: true,
    autoSummarizeNodes: false,
    includeParentContext: true,
    includeFullContext: false,
    streamResponses: true,
    onboardingCardDismissed: false,
    teachingStyle: "default",
    customSystemPrompt: "",
  };
}

export const DEFAULT_SETTINGS: BranchChatMapSettings = createDefaultSettings("en");

export function getMissingAiConfiguration(settings: BranchChatMapSettings): MissingAiConfiguration | null {
  if (!settings.apiBaseUrl.trim()) {
    return "apiBaseUrl";
  }
  if (!settings.apiKey.trim()) {
    return "apiKey";
  }
  if (!settings.model.trim()) {
    return "model";
  }
  return null;
}

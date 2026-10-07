import { Setting } from "obsidian";
import type BranchChatMapPlugin from "./main";
import { t, type TranslationKey } from "./i18n";
import { resolveTeachingPrompt, TEACHING_STYLES } from "./ai/teachingPrompts";
import type { TeachingStyle } from "./types";

const styleLabels: Record<TeachingStyle, TranslationKey> = {
  default: "styleDefault", teacher: "styleTeacher", socratic: "styleSocratic", concise: "styleConcise", custom: "styleCustom",
};

export function renderTeachingStyleSettings(container: HTMLElement, plugin: BranchChatMapPlugin, refresh: () => void): void {
  const { settings } = plugin;
  const language = settings.language;
  new Setting(container)
    .setName(t(language, "settingTeachingStyle"))
    .addDropdown((dropdown) => {
      dropdown.selectEl.setAttribute("aria-label", t(language, "settingTeachingStyle"));
      for (const style of TEACHING_STYLES) dropdown.addOption(style, t(language, styleLabels[style]));
      dropdown.setValue(settings.teachingStyle).onChange(async (value) => {
        const teachingStyle = TEACHING_STYLES.find((style) => style === value) ?? "default";
        await plugin.updateSettings({ teachingStyle });
        refresh();
      });
    });

  if (settings.teachingStyle === "default") return;
  const custom = settings.teachingStyle === "custom";
  new Setting(container)
    .setName(t(language, "settingSystemPrompt"))
    .setDesc(t(language, custom ? "systemPromptDesc" : "systemPromptPreview"))
    .setClass("spider-prompt-setting")
    .addTextArea((text) => {
      text.inputEl.rows = 6;
      text.inputEl.readOnly = !custom;
      text.inputEl.setAttribute("aria-label", t(language, "settingSystemPrompt"));
      text.setPlaceholder(t(language, "systemPromptPlaceholder"))
        .setValue(custom ? settings.customSystemPrompt : resolveTeachingPrompt(settings))
        .onChange(async (value) => {
          if (custom) await plugin.updateSettings({ customSystemPrompt: value });
        });
    });
}

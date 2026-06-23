import { App, PluginSettingTab, Setting } from "obsidian";
import type BranchChatMapPlugin from "./main";
import { DEFAULT_EXPORT_DIR } from "./constants";
import type { BranchChatMapSettings } from "./types";
import { t } from "./i18n";

export const DEFAULT_SETTINGS: BranchChatMapSettings = {
  language: "zh-CN",
  apiBaseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  defaultExportFolder: DEFAULT_EXPORT_DIR,
  useTabToCreateChildNodes: true,
  autoSummarizeNodes: false,
  includeParentContext: true,
  includeFullContext: false,
  streamResponses: true,
};

export class BranchChatMapSettingTab extends PluginSettingTab {
  private readonly plugin: BranchChatMapPlugin;

  constructor(app: App, plugin: BranchChatMapPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const language = this.plugin.settings.language;
    containerEl.empty();

    new Setting(containerEl).setName(t(language, "settingsTitle")).setHeading();

    new Setting(containerEl)
      .setName(t(language, "settingLanguageName"))
      .setDesc(t(language, "settingLanguageDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("zh-CN", "简体中文")
          .addOption("en", "English")
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value === "en" ? "en" : "zh-CN";
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName(t(language, "settingApiBaseUrlName"))
      .setDesc(t(language, "settingApiBaseUrlDesc"))
      .addText((text) => {
        text
          .setPlaceholder("https://api.openai.com/v1")
          .setValue(this.plugin.settings.apiBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.apiBaseUrl = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t(language, "settingApiKeyName"))
      .setDesc(t(language, "settingApiKeyDesc"))
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t(language, "settingModelName"))
      .setDesc(t(language, "settingModelDesc"))
      .addText((text) => {
        text
          .setPlaceholder("gpt-4o-mini")
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t(language, "settingExportFolderName"))
      .setDesc(t(language, "settingExportFolderDesc"))
      .addText((text) => {
        text
          .setPlaceholder(DEFAULT_EXPORT_DIR)
          .setValue(this.plugin.settings.defaultExportFolder)
          .onChange(async (value) => {
            this.plugin.settings.defaultExportFolder = value.trim() || DEFAULT_EXPORT_DIR;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t(language, "settingTabName"))
      .setDesc(t(language, "settingTabDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.useTabToCreateChildNodes)
          .onChange(async (value) => {
            this.plugin.settings.useTabToCreateChildNodes = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t(language, "settingParentContextName"))
      .setDesc(t(language, "settingParentContextDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeParentContext)
          .onChange(async (value) => {
            this.plugin.settings.includeParentContext = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t(language, "settingFullContextName"))
      .setDesc(t(language, "settingFullContextDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.includeFullContext)
          .onChange(async (value) => {
            this.plugin.settings.includeFullContext = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t(language, "settingStreamName"))
      .setDesc(t(language, "settingStreamDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.streamResponses)
          .onChange(async (value) => {
            this.plugin.settings.streamResponses = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t(language, "settingAutoSummaryName"))
      .setDesc(t(language, "settingAutoSummaryDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.autoSummarizeNodes)
          .onChange(async (value) => {
            this.plugin.settings.autoSummarizeNodes = value;
            await this.plugin.saveSettings();
          });
      });
  }
}

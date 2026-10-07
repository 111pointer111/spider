import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type BranchChatMapPlugin from "./main";
import { DEFAULT_EXPORT_DIR } from "./constants";
import { t } from "./i18n";
import { OpenAICompatibleProvider, type ApiTestResult } from "./ai/openAICompatibleProvider";
import { renderTeachingStyleSettings } from "./teachingStyleSettings";
import type { TranslationKey } from "./i18n";

export { DEFAULT_SETTINGS } from "./settingsDefaults";

export class BranchChatMapSettingTab extends PluginSettingTab {
  private readonly plugin: BranchChatMapPlugin;
  private apiTestResult: ApiTestResult | null = null;
  private isTestingApi = false;

  constructor(app: App, plugin: BranchChatMapPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const language = this.plugin.settings.language;
    containerEl.empty();
    containerEl.addClass("spider-settings");

    const header = containerEl.createDiv({ cls: "spider-settings-header" });
    const title = header.createDiv({ cls: "spider-settings-title" });
    title.createEl("h2", { text: "Spider" });
    title.createEl("span", { text: this.plugin.manifest.version, cls: "spider-settings-version" });
    header.createEl("p", { text: t(language, "settingsIntro") });
    header.createEl("a", { text: t(language, "viewReleaseNotes"), href: "https://github.com/111pointer111/spider/releases" });

    const section = (name: TranslationKey, description?: TranslationKey): HTMLElement => {
      const el = containerEl.createEl("section", { cls: "spider-settings-section" });
      el.createEl("h3", { text: t(language, name) });
      if (description) el.createEl("p", { text: t(language, description), cls: "spider-settings-description" });
      return el;
    };
    const general = section("settingsGeneral");

    new Setting(general)
      .setName(t(language, "settingLanguageName"))
      .setDesc(t(language, "settingLanguageDesc"))
      .addDropdown((dropdown) => {
        dropdown.selectEl.setAttribute("aria-label", t(language, "settingLanguageName"));
        dropdown
          .addOption("zh-CN", "简体中文")
          .addOption("en", "English")
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ language: value === "en" ? "en" : "zh-CN" });
            this.display();
          });
      });

    const connection = section("settingsConnection", "settingsConnectionDesc");
    new Setting(connection)
      .setName(t(language, "settingApiBaseUrlName"))
      .setDesc(t(language, "settingApiBaseUrlDesc"))
      .addText((text) => {
        text.inputEl.setAttribute("aria-label", t(language, "settingApiBaseUrlName"));
        text
          .setPlaceholder("https://api.openai.com/v1")
          .setValue(this.plugin.settings.apiBaseUrl)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ apiBaseUrl: value.trim() });
          });
      });

    new Setting(connection)
      .setName(t(language, "settingApiKeyName"))
      .setDesc(t(language, "settingApiKeyDesc"))
      .addText((text) => {
        text.inputEl.setAttribute("aria-label", t(language, "settingApiKeyName"));
        text.inputEl.type = "password";
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ apiKey: value.trim() });
          });
      });

    new Setting(connection)
      .setName(t(language, "settingModelName"))
      .setDesc(t(language, "settingModelDesc"))
      .addText((text) => {
        text.inputEl.setAttribute("aria-label", t(language, "settingModelName"));
        text
          .setPlaceholder("gpt-4o-mini")
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ model: value.trim() });
          });
      });

    const apiTestSetting = new Setting(connection)
      .setName(t(language, "apiTest"))
      .setDesc(this.apiTestResult ? formatApiTestResult(this.apiTestResult) : t(language, "apiTestDesc"));

    apiTestSetting.addButton((button) => {
      button
        .setButtonText(this.isTestingApi ? t(language, "apiTesting") : t(language, "apiTest"))
        .setDisabled(this.isTestingApi)
        .onClick(async () => {
          this.isTestingApi = true;
          this.apiTestResult = null;
          this.display();

          const provider = new OpenAICompatibleProvider(this.plugin.settings);
          const result = await provider.testConnection();
          this.apiTestResult = result;
          this.isTestingApi = false;
          new Notice(result.message);
          this.display();
        });
    });

    const learning = section("settingsLearning", "settingsLearningDesc");
    renderTeachingStyleSettings(learning, this.plugin, () => this.display());

    const exports = section("settingsExport", "settingsExportDesc");
    new Setting(exports)
      .setName(t(language, "settingExportFolderName"))
      .setDesc(t(language, "settingExportFolderDesc"))
      .addText((text) => {
        text.inputEl.setAttribute("aria-label", t(language, "settingExportFolderName"));
        text
          .setPlaceholder(DEFAULT_EXPORT_DIR)
          .setValue(this.plugin.settings.defaultExportFolder)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ defaultExportFolder: value.trim() || DEFAULT_EXPORT_DIR });
          });
      });

    const interaction = section("settingsInteraction", "settingsInteractionDesc");
    new Setting(interaction)
      .setName(t(language, "settingTabName"))
      .setDesc(t(language, "settingTabDesc"))
      .addToggle((toggle) => {
        toggle.toggleEl.setAttribute("aria-label", t(language, "settingTabName"));
        toggle
          .setValue(this.plugin.settings.useTabToCreateChildNodes)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ useTabToCreateChildNodes: value });
          });
      });

    new Setting(interaction)
      .setName(t(language, "settingParentContextName"))
      .setDesc(t(language, "settingParentContextDesc"))
      .addToggle((toggle) => {
        toggle.toggleEl.setAttribute("aria-label", t(language, "settingParentContextName"));
        toggle
          .setValue(this.plugin.settings.includeParentContext)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ includeParentContext: value });
          });
      });

    new Setting(interaction)
      .setName(t(language, "settingFullContextName"))
      .setDesc(t(language, "settingFullContextDesc"))
      .addToggle((toggle) => {
        toggle.toggleEl.setAttribute("aria-label", t(language, "settingFullContextName"));
        toggle
          .setValue(this.plugin.settings.includeFullContext)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ includeFullContext: value });
          });
      });

    new Setting(interaction)
      .setName(t(language, "settingStreamName"))
      .setDesc(t(language, "settingStreamDesc"))
      .addToggle((toggle) => {
        toggle.toggleEl.setAttribute("aria-label", t(language, "settingStreamName"));
        toggle
          .setValue(this.plugin.settings.streamResponses)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ streamResponses: value });
          });
      });

    new Setting(interaction)
      .setName(t(language, "settingAutoSummaryName"))
      .setDesc(t(language, "settingAutoSummaryDesc"))
      .addToggle((toggle) => {
        toggle.toggleEl.setAttribute("aria-label", t(language, "settingAutoSummaryName"));
        toggle
          .setValue(this.plugin.settings.autoSummarizeNodes)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ autoSummarizeNodes: value });
          });
      });

    new Setting(interaction)
      .setName(t(language, "settingOnboardingName"))
      .setDesc(t(language, "settingOnboardingDesc"))
      .addButton((button) => {
        button
          .setButtonText(t(language, "settingOnboardingButton"))
          .onClick(async () => {
            await this.plugin.updateSettings({ onboardingCardDismissed: false });
            window.dispatchEvent(new CustomEvent("spider-onboarding-card-change", { detail: { dismissed: false } }));
            new Notice(t(language, "settingOnboardingRestored"));
          });
      });
    containerEl.createEl("p", { text: t(language, "settingsPrivacy"), cls: "spider-settings-privacy" });
  }
}

function formatApiTestResult(result: ApiTestResult): string {
  if (result.ok) {
    return result.message;
  }

  return result.details ? `${result.message}\n${result.details}` : result.message;
}

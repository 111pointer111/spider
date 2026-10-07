import { getLanguage, Plugin, WorkspaceLeaf, type Command, type Editor } from "obsidian";
import { BranchChatMapSettingTab } from "./settings";
import { createDefaultSettings, DEFAULT_SETTINGS } from "./settingsDefaults";
import type { BranchChatMapSettings } from "./types";
import {
  LEGACY_VIEW_TYPE_BRANCH_CHAT_MAP,
  LEGACY_VIEW_TYPE_BRANCH_CHAT_MAP_CHAT,
  VIEW_TYPE_BRANCH_CHAT_MAP,
  VIEW_TYPE_BRANCH_CHAT_MAP_CHAT,
} from "./constants";
import { BranchChatMapChatView, BranchChatMapView } from "./view";
import { t, type TranslationKey } from "./i18n";
import { BranchChatMapStore } from "./state/branchChatMapStore";
import { PluginSettingsStore } from "./state/pluginSettingsStore";
import { MapSwitcherModal } from "./ui/MapSwitcherModal";
import { createRootMap } from "./domain/chatMap";
import { applyDagreLayout } from "./domain/layout";
import { updateLocalizedChrome, type LocalizedCommand } from "./localizedChrome";
import { openPluginSettings } from "./ui/openPluginSettings";

export default class BranchChatMapPlugin extends Plugin {
  settings: BranchChatMapSettings = DEFAULT_SETTINGS;
  store!: BranchChatMapStore;
  private readonly settingsStore = new PluginSettingsStore();
  private readonly localizedCommands: LocalizedCommand[] = [];
  private ribbonEl: HTMLElement | null = null;

  subscribeSettings = this.settingsStore.subscribe;
  getSettingsRevision = this.settingsStore.getRevision;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.store = new BranchChatMapStore(this);

    this.registerView(
      VIEW_TYPE_BRANCH_CHAT_MAP,
      (leaf: WorkspaceLeaf) => new BranchChatMapView(leaf, this),
    );
    this.registerView(
      VIEW_TYPE_BRANCH_CHAT_MAP_CHAT,
      (leaf: WorkspaceLeaf) => new BranchChatMapChatView(leaf, this),
    );

    this.ribbonEl = this.addRibbonIcon("network", t(this.settings.language, "openMap"), () => {
      void this.activateView();
    });

    this.addLocalizedCommand("openMap", {
      id: "open-map",
      callback: () => {
        void this.activateView();
      },
    });

    this.addLocalizedCommand("openSettings", {
      id: "open-settings",
      callback: () => { openPluginSettings(this.app, this.manifest.id); },
    });

    this.addLocalizedCommand("createChildCommand", {
      id: "create-child-node",
      callback: () => {
        const vs = this.store.getActiveSession();
        if (vs) {
          vs.createChild();
        } else {
          void this.activateView().then(() => this.store.getActiveSession()?.createChild());
        }
      },
    });

    this.addLocalizedCommand("createChildFromSelectionCommand", {
      id: "create-child-node-from-selection",
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection().trim();
        const vs = this.store.getActiveSession();
        if (vs) {
          vs.createChild(selection || undefined);
        } else {
          void this.activateView().then(() => this.store.getActiveSession()?.createChild(selection || undefined));
        }
      },
    });

    this.addLocalizedCommand("goToParentCommand", {
      id: "go-to-parent-node",
      callback: () => {
        this.store.getActiveSession()?.goToParent();
      },
    });

    this.addLocalizedCommand("summarizeCurrentNodeCommand", {
      id: "summarize-current-node",
      callback: () => {
        void this.store.getActiveSession()?.summarizeCurrentNode();
      },
    });

    this.addLocalizedCommand("exportMapCommand", {
      id: "export-current-map",
      callback: () => {
        void this.store.getActiveSession()?.exportMap();
      },
    });

    this.addLocalizedCommand("newMapCommand", {
      id: "new-map",
      callback: () => {
        void this.newSpiderView();
      },
    });

    this.addLocalizedCommand("switchMapCommand", {
      id: "switch-map",
      callback: () => {
        const modal = new MapSwitcherModal(this);
        void modal.loadMaps().then(() => modal.open());
      },
    });

    this.addSettingTab(new BranchChatMapSettingTab(this.app, this));
    this.updateLocalizedChrome();

    this.app.workspace.onLayoutReady(() => {
      const activeView = this.app.workspace.getActiveViewOfType(BranchChatMapView);
      this.detachLegacyViews();
      void this.ensureMainTabView(false).then((leaf) => {
        if (leaf) {
          const view = activeView ?? (leaf.view instanceof BranchChatMapView ? leaf.view : null);
          view?.activateSession();
          void this.ensureChatSidebarView(true, false);
        }
      });
    });
  }

  onunload(): void {
    this.store.dispose();
  }

  async loadSettings(): Promise<void> {
    const defaults = createDefaultSettings(getLanguage());
    this.settings = {
      ...defaults,
      ...((await this.loadData()) as Partial<BranchChatMapSettings> | null),
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async updateSettings(patch: Partial<BranchChatMapSettings>): Promise<void> {
    const previous = this.settings;
    this.settings = { ...previous, ...patch };
    try {
      await this.saveSettings();
    } catch (error: unknown) {
      this.settings = previous;
      throw error;
    }
    this.updateLocalizedChrome();
    this.settingsStore.notify();
  }

  async activateView(): Promise<void> {
    const leaf = await this.ensureMainTabView(true);
    if (leaf) {
      await this.app.workspace.revealLeaf(leaf);
    }
    await this.ensureChatSidebarView(true);
    this.store.getActiveSession()?.requestComposerFocus();
  }

  async newSpiderView(): Promise<void> {
    const language = this.settings.language;
    const map = applyDagreLayout(createRootMap(t(language, "defaultMapTitle"), t(language, "rootQuestionTitle")));
    await this.store.repository.saveMap(map);

    this.store.prepareSessionWithMap(map);

    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: VIEW_TYPE_BRANCH_CHAT_MAP,
      active: true,
      state: { mapId: map.id, activeNodeId: map.rootNodeId },
    });
    await this.app.workspace.revealLeaf(leaf);

    await this.ensureChatSidebarView(true);
    this.store.getActiveSession()?.requestComposerFocus();
  }

  private async ensureMainTabView(openIfMissing: boolean): Promise<WorkspaceLeaf | null> {
    const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_BRANCH_CHAT_MAP);
    if (!openIfMissing && existingLeaves.length === 0) {
      return null;
    }

    const activeView = this.app.workspace.getActiveViewOfType(BranchChatMapView);
    const mainLeaf = activeView && this.isMainWorkspaceLeaf(activeView.leaf)
      ? activeView.leaf
      : existingLeaves.find((leaf) => this.isMainWorkspaceLeaf(leaf));
    if (mainLeaf) {
      return mainLeaf;
    }

    if (!openIfMissing) {
      return null;
    }

    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: VIEW_TYPE_BRANCH_CHAT_MAP,
      active: true,
    });
    await this.app.workspace.revealLeaf(leaf);

    return leaf;
  }

  private async ensureChatSidebarView(openIfMissing: boolean, reveal = true): Promise<WorkspaceLeaf | null> {
    const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_BRANCH_CHAT_MAP_CHAT);
    if (!openIfMissing && existingLeaves.length === 0) {
      return null;
    }

    const sideLeaf = existingLeaves.find((leaf) => this.isRightSidebarLeaf(leaf));
    for (const existingLeaf of existingLeaves) {
      if (existingLeaf !== sideLeaf) {
        existingLeaf.detach();
      }
    }

    if (sideLeaf) {
      if (openIfMissing && reveal) {
        this.app.workspace.rightSplit.expand();
        await this.app.workspace.revealLeaf(sideLeaf);
      }
      return sideLeaf;
    }

    const leaf = await this.app.workspace.ensureSideLeaf(VIEW_TYPE_BRANCH_CHAT_MAP_CHAT, "right", {
      active: openIfMissing && reveal,
      reveal: openIfMissing && reveal,
      split: false,
    });
    if (openIfMissing && reveal) this.app.workspace.rightSplit.expand();

    return leaf;
  }

  private detachLegacyViews(): void {
    this.app.workspace.detachLeavesOfType(LEGACY_VIEW_TYPE_BRANCH_CHAT_MAP);
    this.app.workspace.detachLeavesOfType(LEGACY_VIEW_TYPE_BRANCH_CHAT_MAP_CHAT);
  }

  private addLocalizedCommand(key: TranslationKey, command: Omit<Command, "name">): void {
    const localizedCommand: Command = {
      ...command,
      name: t(this.settings.language, key),
    };
    // Keep our own reference because some Obsidian builds do not return the command object at runtime.
    this.addCommand(localizedCommand);
    this.localizedCommands.push({ command: localizedCommand, key });
  }

  private updateLocalizedChrome(): void {
    updateLocalizedChrome(this.settings.language, this.localizedCommands, this.ribbonEl);
  }

  private isRightSidebarLeaf(leaf: WorkspaceLeaf): boolean {
    let parent: unknown = leaf.parent;

    while (parent && typeof parent === "object") {
      if (parent === this.app.workspace.rightSplit) {
        return true;
      }

      if (parent === this.app.workspace.rootSplit || parent === this.app.workspace.leftSplit) {
        return false;
      }

      parent = (parent as { parent?: unknown }).parent;
    }

    return false;
  }

  private isMainWorkspaceLeaf(leaf: WorkspaceLeaf): boolean {
    let parent: unknown = leaf.parent;

    while (parent && typeof parent === "object") {
      if (parent === this.app.workspace.rootSplit) {
        return true;
      }

      if (parent === this.app.workspace.leftSplit || parent === this.app.workspace.rightSplit) {
        return false;
      }

      parent = (parent as { parent?: unknown }).parent;
    }

    return false;
  }
}

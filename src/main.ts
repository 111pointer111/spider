import { Plugin, WorkspaceLeaf, type Editor } from "obsidian";
import { DEFAULT_SETTINGS, BranchChatMapSettingTab } from "./settings";
import type { BranchChatMapSettings } from "./types";
import { VIEW_TYPE_BRANCH_CHAT_MAP, VIEW_TYPE_BRANCH_CHAT_MAP_CHAT } from "./constants";
import { BranchChatMapChatView, BranchChatMapView } from "./view";
import { t } from "./i18n";
import { BranchChatMapStore } from "./state/branchChatMapStore";

export default class BranchChatMapPlugin extends Plugin {
  settings: BranchChatMapSettings = DEFAULT_SETTINGS;
  store!: BranchChatMapStore;

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

    this.addRibbonIcon("network", t(this.settings.language, "openMap"), () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-spider",
      name: t(this.settings.language, "openMap"),
      callback: () => {
        void this.activateView();
      },
    });

    this.addCommand({
      id: "spider-create-child-node",
      name: t(this.settings.language, "createChildCommand"),
      callback: () => {
        void this.activateView().then(() => this.store.createChild());
      },
    });

    this.addCommand({
      id: "spider-create-child-node-from-selection",
      name: t(this.settings.language, "createChildFromSelectionCommand"),
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection().trim();
        void this.activateView().then(() => this.store.createChild(selection || undefined));
      },
    });

    this.addCommand({
      id: "spider-go-to-parent-node",
      name: t(this.settings.language, "goToParentCommand"),
      callback: () => {
        this.store.goToParent();
      },
    });

    this.addCommand({
      id: "spider-summarize-current-node",
      name: t(this.settings.language, "summarizeCurrentNodeCommand"),
      callback: () => {
        void this.store.summarizeCurrentNode();
      },
    });

    this.addCommand({
      id: "spider-export-current-map",
      name: t(this.settings.language, "exportMapCommand"),
      callback: () => {
        void this.store.exportMap();
      },
    });

    this.addSettingTab(new BranchChatMapSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      void this.ensureMainTabView(false).then((leaf) => {
        if (leaf) {
          void this.ensureChatSidebarView(true);
        }
      });
    });
  }

  onunload(): void {
    this.store.dispose();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_BRANCH_CHAT_MAP);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_BRANCH_CHAT_MAP_CHAT);
  }

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...((await this.loadData()) as Partial<BranchChatMapSettings> | null),
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async activateView(): Promise<void> {
    await this.ensureMainTabView(true);
    await this.ensureChatSidebarView(true);
  }

  private async ensureMainTabView(openIfMissing: boolean): Promise<WorkspaceLeaf | null> {
    const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_BRANCH_CHAT_MAP);
    if (!openIfMissing && existingLeaves.length === 0) {
      return null;
    }

    const mainLeaf = existingLeaves.find((leaf) => this.isMainWorkspaceLeaf(leaf));
    for (const existingLeaf of existingLeaves) {
      if (existingLeaf !== mainLeaf) {
        existingLeaf.detach();
      }
    }

    if (mainLeaf) {
      if (openIfMissing) {
        this.app.workspace.revealLeaf(mainLeaf);
      }
      return mainLeaf;
    }

    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: VIEW_TYPE_BRANCH_CHAT_MAP,
      active: true,
    });
    this.app.workspace.revealLeaf(leaf);

    return leaf;
  }

  private async ensureChatSidebarView(openIfMissing: boolean): Promise<WorkspaceLeaf | null> {
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
      this.app.workspace.rightSplit.expand();
      if (openIfMissing) {
        this.app.workspace.revealLeaf(sideLeaf);
      }
      return sideLeaf;
    }

    const leaf = await this.app.workspace.ensureSideLeaf(VIEW_TYPE_BRANCH_CHAT_MAP_CHAT, "right", {
      active: true,
      reveal: openIfMissing,
      split: false,
    });
    this.app.workspace.rightSplit.expand();

    return leaf;
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

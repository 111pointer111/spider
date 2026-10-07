import { ItemView, WorkspaceLeaf, type ViewStateResult } from "obsidian";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VIEW_TYPE_BRANCH_CHAT_MAP, VIEW_TYPE_BRANCH_CHAT_MAP_CHAT } from "./constants";
import { t } from "./i18n";
import type BranchChatMapPlugin from "./main";
import { BranchChatMapApp, type BranchChatMapController } from "./ui/BranchChatMapApp";
import { BranchChatMapChatApp } from "./ui/BranchChatMapChatApp";
import type { ViewState } from "./state/viewState";
import type { ChatMapId, NodeId } from "./types";
import { shouldHandleViewKeydown } from "./ui/keyboardShortcuts";

abstract class BranchChatMapBaseView extends ItemView {
  protected readonly plugin: BranchChatMapPlugin;
  private root: Root | null = null;
  private controller: BranchChatMapController | null = null;
  private pendingActions: Array<(controller: BranchChatMapController) => void> = [];

  constructor(leaf: WorkspaceLeaf, plugin: BranchChatMapPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getDisplayText(): string {
    return t(this.plugin.settings.language, "appName");
  }

  getIcon(): string {
    return "network";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass(this.getContentClassName());
    this.root = createRoot(this.contentEl);
    this.root.render(
      this.renderApp((controller) => {
        this.controller = controller;
        const actions = [...this.pendingActions];
        this.pendingActions = [];
        for (const action of actions) {
          action(controller);
        }
      }),
    );

    const handleKeydown = (event: KeyboardEvent) => {
      if (shouldHandleViewKeydown(event, this.contentEl)) {
        this.controller?.handleKeydown(event);
      }
    };
    let doc = this.contentEl.ownerDocument;
    doc.addEventListener("keydown", handleKeydown, true);
    this.register(this.contentEl.onWindowMigrated(() => {
      doc.removeEventListener("keydown", handleKeydown, true);
      doc = this.contentEl.ownerDocument;
      doc.addEventListener("keydown", handleKeydown, true);
    }));
    this.register(() => doc.removeEventListener("keydown", handleKeydown, true));
  }

  async onClose(): Promise<void> {
    this.controller = null;
    this.root?.unmount();
    this.root = null;
  }

  createChildFromSelection(anchorText?: string): void {
    this.runWhenReady((controller) => controller.createChild(anchorText));
  }

  goToParent(): void {
    this.runWhenReady((controller) => controller.goToParent());
  }

  summarizeCurrentNode(): void {
    this.runWhenReady((controller) => {
      void controller.summarizeCurrentNode();
    });
  }

  exportCurrentMap(): void {
    this.runWhenReady((controller) => {
      void controller.exportMap();
    });
  }

  deleteCurrentMap(): void {
    this.runWhenReady((controller) => {
      void controller.deleteCurrentMap();
    });
  }

  protected abstract renderApp(onController: (controller: BranchChatMapController) => void): ReactElement;

  protected abstract getContentClassName(): string;

  protected onControllerReady(_controller: BranchChatMapController): void {
    // Subclasses can override
  }

  private runWhenReady(action: (controller: BranchChatMapController) => void): void {
    if (this.controller) {
      action(this.controller);
      return;
    }

    this.pendingActions.push(action);
  }
}

function generateLeafId(): string {
  return `spider-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class BranchChatMapView extends BranchChatMapBaseView {
  private leafId: string;
  private viewState: ViewState | null = null;
  private restoredState: { mapId?: ChatMapId; activeNodeId?: NodeId } = {};

  getState(): Record<string, unknown> {
    const snapshot = this.viewState?.getSnapshot();
    return {
      mapId: snapshot?.map?.id ?? this.restoredState.mapId,
      activeNodeId: snapshot?.activeNodeId ?? this.restoredState.activeNodeId,
    };
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    if (typeof state === "object" && state !== null) {
      this.restoredState = {
        mapId: "mapId" in state && typeof state.mapId === "string" ? state.mapId : undefined,
        activeNodeId: "activeNodeId" in state && typeof state.activeNodeId === "string" ? state.activeNodeId : undefined,
      };
      const { mapId, activeNodeId } = this.restoredState;
      if (mapId && this.viewState) {
        if (this.viewState.getLoadedMapId() !== mapId) await this.viewState.load(mapId);
        if (activeNodeId) this.viewState.setActiveNode(activeNodeId);
      }
    }
    await super.setState(state, result);
  }

  constructor(leaf: WorkspaceLeaf, plugin: BranchChatMapPlugin) {
    super(leaf, plugin);
    this.leafId = generateLeafId();
  }

  getViewType(): string {
    return VIEW_TYPE_BRANCH_CHAT_MAP;
  }

  activateSession(): void {
    this.plugin.store.setActiveSession(this.leafId);
  }

  protected getContentClassName(): string {
    return "spider-map-view";
  }

  async onOpen(): Promise<void> {
    const pending = this.plugin.store.claimPendingSession();
    if (pending) {
      this.leafId = pending.id;
      this.viewState = pending.vs;
    } else {
      this.viewState = this.plugin.store.registerSession(this.leafId);
    }

    const mapId = this.restoredState.mapId;

    if (mapId && !this.viewState.getSnapshot().map) {
      void this.viewState.load(mapId);
    } else if (!this.viewState.getSnapshot().map) {
      void this.viewState.load();
    }

    await super.onOpen();
    this.registerDomEvent(this.contentEl, "pointerdown", () => this.activateSession());

    let savedState = "";
    this.register(this.viewState.subscribe(() => {
      const current = this.getState();
      const key = `${current.mapId ?? ""}:${current.activeNodeId ?? ""}`;
      if (key !== savedState) {
        savedState = key;
        this.app.workspace.requestSaveLayout();
      }
    }));
    this.app.workspace.requestSaveLayout();

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf === this.leaf) {
          this.plugin.store.setActiveSession(this.leafId);
        }
      }),
    );

    if (this.app.workspace.getActiveViewOfType(BranchChatMapView) === this) {
      this.plugin.store.setActiveSession(this.leafId);
    }
  }

  async onClose(): Promise<void> {
    if (this.viewState) {
      this.plugin.store.unregisterSession(this.leafId);
    }
    await super.onClose();
  }

  protected renderApp(onController: (controller: BranchChatMapController) => void): ReactElement {
    return (
      <BranchChatMapApp
        plugin={this.plugin}
        viewState={this.viewState!}
        onController={onController}
        setTabTitle={(title) => {
          const headerEl = (this.leaf as unknown as { tabHeaderInnerTitleEl: HTMLElement }).tabHeaderInnerTitleEl;
          if (headerEl) {
            headerEl.textContent = title;
          }
        }}
        onNewSpider={() => {
          void this.plugin.newSpiderView();
        }}
        onLoadMap={(mapId) => {
          void this.viewState?.load(mapId);
          void this.plugin.updateSettings({ lastOpenedMapId: mapId });
        }}
      />
    );
  }
}

export class BranchChatMapChatView extends BranchChatMapBaseView {
  getViewType(): string {
    return VIEW_TYPE_BRANCH_CHAT_MAP_CHAT;
  }

  protected getContentClassName(): string {
    return "spider-chat-view";
  }

  protected renderApp(onController: (controller: BranchChatMapController) => void): ReactElement {
    return <BranchChatMapChatApp plugin={this.plugin} onController={onController} />;
  }
}

import { ItemView, WorkspaceLeaf } from "obsidian";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { VIEW_TYPE_BRANCH_CHAT_MAP, VIEW_TYPE_BRANCH_CHAT_MAP_CHAT } from "./constants";
import { t } from "./i18n";
import type BranchChatMapPlugin from "./main";
import { BranchChatMapApp, type BranchChatMapController } from "./ui/BranchChatMapApp";
import { BranchChatMapChatApp } from "./ui/BranchChatMapChatApp";

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

    this.registerDomEvent(
      document,
      "keydown",
      (event) => {
        const target = event.target;
        const activeElement = document.activeElement;
        const targetInside = target instanceof Node && this.contentEl.contains(target);
        const focusInside = activeElement instanceof Node && this.contentEl.contains(activeElement);

        if (!targetInside && !focusInside) {
          return;
        }

        this.controller?.handleKeydown(event);
      },
      { capture: true },
    );
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

  protected abstract renderApp(onController: (controller: BranchChatMapController) => void): ReactElement;

  protected abstract getContentClassName(): string;

  private runWhenReady(action: (controller: BranchChatMapController) => void): void {
    if (this.controller) {
      action(this.controller);
      return;
    }

    this.pendingActions.push(action);
  }
}

export class BranchChatMapView extends BranchChatMapBaseView {
  getViewType(): string {
    return VIEW_TYPE_BRANCH_CHAT_MAP;
  }

  protected getContentClassName(): string {
    return "branch-chat-map-view";
  }

  protected renderApp(onController: (controller: BranchChatMapController) => void): ReactElement {
    return <BranchChatMapApp plugin={this.plugin} onController={onController} />;
  }
}

export class BranchChatMapChatView extends BranchChatMapBaseView {
  getViewType(): string {
    return VIEW_TYPE_BRANCH_CHAT_MAP_CHAT;
  }

  protected getContentClassName(): string {
    return "branch-chat-map-chat-view";
  }

  protected renderApp(onController: (controller: BranchChatMapController) => void): ReactElement {
    return <BranchChatMapChatApp plugin={this.plugin} onController={onController} />;
  }
}

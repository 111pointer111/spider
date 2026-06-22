import { Notice } from "obsidian";
import type BranchChatMapPlugin from "../main";
import { OpenAICompatibleProvider } from "../ai/openAICompatibleProvider";
import { createRootMap, addChildNode, appendMessage, createMessage, getAncestorPath, updateMapTitle, updateNode } from "../domain/chatMap";
import { applyDagreLayout } from "../domain/layout";
import { buildExportFiles } from "../export/exporters";
import { t } from "../i18n";
import { MapRepository } from "../storage/mapRepository";
import type { ChatMap, ChatNode, NodeId } from "../types";
import { cleanText, slugifyFileName, truncateText } from "../utils/text";

export interface BranchChatMapState {
  map: ChatMap | null;
  activeNodeId: NodeId | null;
  collapsedIds: Set<NodeId>;
  drafts: Record<NodeId, string>;
  pendingNodeId: NodeId | null;
  streamingContent: Record<NodeId, string>;
  error: string | null;
  focusToken: number;
}

const INITIAL_STATE: BranchChatMapState = {
  map: null,
  activeNodeId: null,
  collapsedIds: new Set(),
  drafts: {},
  pendingNodeId: null,
  streamingContent: {},
  error: null,
  focusToken: 0,
};

export class BranchChatMapStore {
  private readonly plugin: BranchChatMapPlugin;
  private readonly repository: MapRepository;
  private readonly listeners = new Set<() => void>();
  private state: BranchChatMapState = INITIAL_STATE;
  private loadPromise: Promise<void> | null = null;
  private abortController: AbortController | null = null;

  constructor(plugin: BranchChatMapPlugin) {
    this.plugin = plugin;
    this.repository = new MapRepository(plugin.app);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): BranchChatMapState => this.state;

  async load(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadInternal();
    return this.loadPromise;
  }

  dispose(): void {
    this.abortController?.abort();
    this.listeners.clear();
  }

  setActiveNode(nodeId: NodeId): void {
    if (!this.state.map?.nodes[nodeId]) {
      return;
    }

    this.setState({ activeNodeId: nodeId });
  }

  createChild(anchorText?: string): void {
    const { map, activeNodeId } = this.state;
    if (!map || !activeNodeId) {
      return;
    }

    const selectedText = anchorText?.trim();
    const language = this.plugin.settings.language;
    const { map: nextMap, child } = addChildNode(map, activeNodeId, {
      anchorText: selectedText || undefined,
      title: selectedText ? undefined : t(language, "untitledQuestionTitle"),
    });

    this.commitMap(nextMap);
    this.setState({
      activeNodeId: child.id,
      focusToken: this.state.focusToken + 1,
      drafts: selectedText
        ? {
            ...this.state.drafts,
            [child.id]: language === "zh-CN" ? `请解释这段内容：${selectedText}` : `Please explain this: ${selectedText}`,
          }
        : this.state.drafts,
    });
  }

  goToParent(): void {
    const activeNode = this.getActiveNode();
    if (!activeNode?.parentId) {
      return;
    }

    this.setState({
      activeNodeId: activeNode.parentId,
      focusToken: this.state.focusToken + 1,
    });
  }

  async summarizeCurrentNode(): Promise<void> {
    const { map, activeNodeId } = this.state;
    if (!map || !activeNodeId) {
      return;
    }

    const node = map.nodes[activeNodeId];
    if (!node) {
      return;
    }

    const controller = new AbortController();
    this.abortController = controller;
    this.setState({ error: null });

    try {
      const provider = new OpenAICompatibleProvider(this.plugin.settings);
      const summary = await provider.summarizeNode(node, controller.signal);
      this.commitMap(updateNode(this.state.map ?? map, activeNodeId, { summary }));
    } catch (summaryError: unknown) {
      this.reportError(summaryError);
    } finally {
      this.abortController = null;
    }
  }

  async exportMap(): Promise<void> {
    const { map } = this.state;
    if (!map) {
      return;
    }

    try {
      const folder = `${this.plugin.settings.defaultExportFolder}/${slugifyFileName(map.title)}`;
      const files = buildExportFiles(map);
      let entryPath = "";

      for (const file of files) {
        const path = await this.repository.writeExport(folder, file.path, file.content);
        if (file.path === "README.md") {
          entryPath = path;
        }
      }

      new Notice(t(this.plugin.settings.language, "exported", { path: entryPath || folder }));
    } catch (exportError: unknown) {
      this.reportError(exportError);
    }
  }

  async sendMessage(): Promise<void> {
    const { map, activeNodeId, drafts, pendingNodeId } = this.state;
    if (!map || !activeNodeId || pendingNodeId) {
      return;
    }

    const draft = drafts[activeNodeId]?.trim();
    if (!draft) {
      return;
    }

    const userMap = appendMessage(map, activeNodeId, createMessage("user", draft));
    this.setState({
      drafts: {
        ...drafts,
        [activeNodeId]: "",
      },
    });
    this.commitMap(userMap);
    await this.generateAssistant(userMap, activeNodeId);
  }

  async retryAssistant(): Promise<void> {
    const { map, activeNodeId, pendingNodeId } = this.state;
    if (!map || !activeNodeId || pendingNodeId) {
      return;
    }

    const requestNode = map.nodes[activeNodeId];
    if (!requestNode || requestNode.messages.at(-1)?.role !== "user") {
      this.setState({ error: t(this.plugin.settings.language, "retryUnavailable") });
      return;
    }

    await this.generateAssistant(map, activeNodeId);
  }

  cancelGeneration(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.setState({ pendingNodeId: null });
  }

  updateDraft(nodeId: NodeId, value: string): void {
    this.setState({
      drafts: {
        ...this.state.drafts,
        [nodeId]: value,
      },
    });
  }

  updateCurrentNodeTitle(title: string): void {
    const cleanTitle = title.trim();
    const { map, activeNodeId } = this.state;
    if (!map || !activeNodeId || !cleanTitle) {
      return;
    }

    let nextMap = updateNode(map, activeNodeId, { title: cleanTitle });
    if (activeNodeId === map.rootNodeId) {
      nextMap = updateMapTitle(nextMap, cleanTitle);
    }

    this.commitMap(nextMap);
  }

  markUnderstood(): void {
    const { map, activeNodeId } = this.state;
    if (!map || !activeNodeId) {
      return;
    }

    this.commitMap(updateNode(map, activeNodeId, { status: "understood" }));
  }

  updatePosition(nodeId: NodeId, position: { x: number; y: number }): void {
    const { map } = this.state;
    if (!map) {
      return;
    }

    this.commitMap(updateNode(map, nodeId, { position }));
  }

  toggleCollapse(nodeId: NodeId): void {
    const collapsedIds = new Set(this.state.collapsedIds);
    if (collapsedIds.has(nodeId)) {
      collapsedIds.delete(nodeId);
    } else {
      collapsedIds.add(nodeId);
    }

    this.setState({ collapsedIds });
  }

  autoLayout(): void {
    const { map } = this.state;
    if (map) {
      this.commitMap(applyDagreLayout(map));
    }
  }

  getActiveNode(): ChatNode | null {
    const { map, activeNodeId } = this.state;
    return activeNodeId && map ? map.nodes[activeNodeId] ?? null : null;
  }

  getActivePath(): ChatNode[] {
    const { map, activeNodeId } = this.state;
    return activeNodeId && map ? getAncestorPath(map, activeNodeId) : [];
  }

  private async loadInternal(): Promise<void> {
    try {
      const loaded = await this.repository.loadLatestMap();
      const language = this.plugin.settings.language;
      const initial = loaded ?? applyDagreLayout(createRootMap(t(language, "defaultMapTitle"), t(language, "rootQuestionTitle")));
      if (!loaded) {
        await this.repository.saveMap(initial);
      }

      this.setState({
        map: initial,
        activeNodeId: initial.rootNodeId,
        error: null,
      });
    } catch (loadError: unknown) {
      this.reportError(loadError);
    }
  }

  private commitMap(nextMap: ChatMap): void {
    this.setState({ map: nextMap });
    void this.repository.saveMap(nextMap).catch((saveError: unknown) => this.reportError(saveError));
  }

  private async generateAssistant(baseMap: ChatMap, nodeId: NodeId): Promise<void> {
    const requestNode = baseMap.nodes[nodeId];
    if (!requestNode) {
      return;
    }

    const controller = new AbortController();
    this.abortController = controller;
    this.setState({
      pendingNodeId: nodeId,
      error: null,
      streamingContent: {
        ...this.state.streamingContent,
        [nodeId]: "",
      },
    });

    let answer = "";

    try {
      const provider = new OpenAICompatibleProvider(this.plugin.settings);
      const parent = requestNode.parentId ? baseMap.nodes[requestNode.parentId] : undefined;

      if (this.plugin.settings.streamResponses) {
        for await (const chunk of provider.streamChat({
          node: requestNode,
          parent,
          model: this.plugin.settings.model,
          includeParentContext: this.plugin.settings.includeParentContext,
          signal: controller.signal,
        })) {
          answer += chunk;
          this.setState({
            streamingContent: {
              ...this.state.streamingContent,
              [nodeId]: answer,
            },
          });
        }
      } else {
        answer = await provider.chat({
          node: requestNode,
          parent,
          model: this.plugin.settings.model,
          includeParentContext: this.plugin.settings.includeParentContext,
          signal: controller.signal,
        });
        this.setState({
          streamingContent: {
            ...this.state.streamingContent,
            [nodeId]: answer,
          },
        });
      }

      let nextMap = appendMessage(baseMap, nodeId, createMessage("assistant", answer));
      const updatedNode = nextMap.nodes[nodeId];
      if (this.plugin.settings.autoSummarizeNodes && updatedNode) {
        const summary = await provider.summarizeNode(updatedNode, controller.signal);
        nextMap = updateNode(nextMap, nodeId, { summary });
      }

      const titleNode = nextMap.nodes[nodeId];
      if (titleNode && this.shouldAutoTitle(titleNode, nextMap)) {
        try {
          const title = this.normalizeGeneratedTitle(await provider.titleNode(titleNode, controller.signal));
          nextMap = updateNode(nextMap, nodeId, { title });
          if (nodeId === nextMap.rootNodeId) {
            nextMap = updateMapTitle(nextMap, title);
          }
        } catch {
          // Naming is helpful, but it should never discard the completed answer.
        }
      }

      this.commitMap(nextMap);
    } catch (generateError: unknown) {
      if (controller.signal.aborted) {
        const partial = answer.trim();
        if (partial) {
          this.commitMap(appendMessage(baseMap, nodeId, createMessage("assistant", partial)));
        }
      } else {
        this.reportError(generateError);
      }
    } finally {
      const streamingContent = { ...this.state.streamingContent };
      delete streamingContent[nodeId];
      this.setState({
        streamingContent,
        pendingNodeId: null,
      });
      this.abortController = null;
    }
  }

  private shouldAutoTitle(node: ChatNode, map: ChatMap): boolean {
    const language = this.plugin.settings.language;
    const defaultTitles = new Set([
      t(language, "rootQuestionTitle"),
      t(language, "untitledQuestionTitle"),
      "Root question",
      "Untitled question",
      "根问题",
      "未命名问题",
    ]);

    if (node.id === map.rootNodeId) {
      return defaultTitles.has(node.title) || map.title === t(language, "defaultMapTitle") || map.title === "Untitled chat map" || map.title === "未命名对话图谱";
    }

    return defaultTitles.has(node.title);
  }

  private normalizeGeneratedTitle(title: string): string {
    return truncateText(cleanText(title).replace(/^["'“”‘’]+|["'“”‘’]+$/g, ""), 42);
  }

  private reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.setState({ error: message });
    new Notice(message);
  }

  private setState(patch: Partial<BranchChatMapState>): void {
    this.state = {
      ...this.state,
      ...patch,
    };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

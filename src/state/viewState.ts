import { Notice } from "obsidian";
import type BranchChatMapPlugin from "../main";
import { OpenAICompatibleProvider } from "../ai/openAICompatibleProvider";
import { createRootMap, addChildNode, appendMessage, createMessage, getAncestorPath, updateMapTitle, updateNode } from "../domain/chatMap";
import { applyDagreLayout } from "../domain/layout";
import { buildExportFiles } from "../export/exporters";
import { t } from "../i18n";
import { MapRepository } from "../storage/mapRepository";
import type { ChatMap, ChatMapId, ChatMessage, ChatNode, NodeId } from "../types";
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

export class ViewState {
  private readonly plugin: BranchChatMapPlugin;
  private readonly repository: MapRepository;
  private readonly listeners = new Set<() => void>();
  private state: BranchChatMapState = INITIAL_STATE;
  private loadPromise: Promise<void> | null = null;
  private abortController: AbortController | null = null;
  private loadedMapId: ChatMapId | null = null;

  constructor(plugin: BranchChatMapPlugin, repository: MapRepository, initialMap?: ChatMap) {
    this.plugin = plugin;
    this.repository = repository;
    if (initialMap) {
      this.loadedMapId = initialMap.id;
      this.state = {
        map: initialMap,
        activeNodeId: initialMap.rootNodeId,
        collapsedIds: new Set(),
        drafts: {},
        pendingNodeId: null,
        streamingContent: {},
        error: null,
        focusToken: 0,
      };
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): BranchChatMapState => this.state;

  getLoadedMapId(): ChatMapId | null {
    return this.loadedMapId;
  }

  async load(mapId?: ChatMapId): Promise<void> {
    if (!mapId && this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = mapId ? this.loadById(mapId) : this.loadLatest();
    return this.loadPromise;
  }

  async createNewRootMap(): Promise<ChatMap> {
    const language = this.plugin.settings.language;
    const map = applyDagreLayout(createRootMap(t(language, "defaultMapTitle"), t(language, "rootQuestionTitle")));
    await this.repository.saveMap(map);
    this.abortController?.abort();
    this.abortController = null;
    this.resetToMap(map);
    return map;
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

  deleteNode(nodeId: NodeId): void {
    const { map, activeNodeId } = this.state;
    if (!map || !activeNodeId || nodeId === map.rootNodeId) {
      return;
    }

    const node = map.nodes[nodeId];
    if (!node) {
      return;
    }

    let nextMap = {
      ...map,
      nodes: { ...map.nodes },
      edges: [...map.edges],
    };

    if (node.parentId) {
      const parent = nextMap.nodes[node.parentId];
      if (parent) {
        nextMap.nodes[node.parentId] = {
          ...parent,
          children: parent.children.filter((id) => id !== nodeId),
        };
      }
    }

    nextMap.edges = nextMap.edges.filter((e) => e.from !== nodeId && e.to !== nodeId);

    const toDelete = new Set<NodeId>();
    const collect = (id: NodeId): void => {
      toDelete.add(id);
      const n = nextMap.nodes[id];
      if (n) {
        for (const cid of n.children) {
          collect(cid);
        }
      }
    };
    collect(nodeId);

    for (const id of toDelete) {
      delete nextMap.nodes[id];
    }

    const nextActiveId = activeNodeId === nodeId ? (node.parentId ?? map.rootNodeId) : activeNodeId;
    this.commitMap(nextMap as ChatMap);
    this.setState({ activeNodeId: nextActiveId });
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
      const exportMap = await this.prepareMapForExport(map);
      const folder = `${this.plugin.settings.defaultExportFolder}/${this.exportFolderName(exportMap)}`;
      const files = buildExportFiles(exportMap, { exportFolder: folder });
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

  dispose(): void {
    this.abortController?.abort();
    this.listeners.clear();
  }

  private async loadLatest(): Promise<void> {
    try {
      const lastId = this.plugin.settings.lastOpenedMapId;
      let loaded: ChatMap | null = null;

      if (lastId) {
        loaded = await this.repository.loadMap(lastId);
      }

      if (!loaded) {
        loaded = await this.repository.loadLatestMap();
      }

      const language = this.plugin.settings.language;
      const initial = loaded ?? applyDagreLayout(createRootMap(t(language, "defaultMapTitle"), t(language, "rootQuestionTitle")));
      if (!loaded) {
        await this.repository.saveMap(initial);
      }

      this.loadedMapId = initial.id;
      this.setState({
        map: initial,
        activeNodeId: initial.rootNodeId,
        error: null,
      });
    } catch (loadError: unknown) {
      this.reportError(loadError);
    }
  }

  private async loadById(mapId: ChatMapId): Promise<void> {
    try {
      const loaded = await this.repository.loadMap(mapId);
      if (!loaded) {
        return;
      }

      this.plugin.settings.lastOpenedMapId = loaded.id;
      void this.plugin.saveSettings();

      this.loadedMapId = loaded.id;
      this.setState({
        map: loaded,
        activeNodeId: loaded.rootNodeId,
        collapsedIds: new Set(),
        drafts: {},
        pendingNodeId: null,
        streamingContent: {},
        error: null,
        focusToken: 0,
      });
    } catch (loadError: unknown) {
      this.reportError(loadError);
    }
  }

  private resetToMap(map: ChatMap): void {
    this.loadedMapId = map.id;
    this.state = {
      map,
      activeNodeId: map.rootNodeId,
      collapsedIds: new Set(),
      drafts: {},
      pendingNodeId: null,
      streamingContent: {},
      error: null,
      focusToken: 0,
    };
    this.emit();
  }

  private commitMap(nextMap: ChatMap): void {
    this.setState({ map: nextMap });
    void this.repository.saveMap(nextMap).catch((saveError: unknown) => this.reportError(saveError));
  }

  private buildContextMessages(map: ChatMap, currentNodeId: NodeId): ChatMessage[] {
    const result: ChatMessage[] = [];

    for (const node of Object.values(map.nodes)) {
      if (node.id === currentNodeId || node.messages.length === 0) {
        continue;
      }

      result.push({
        id: `ctx_${node.id}_header`,
        role: "system",
        content: `[Node: ${node.title}]`,
        createdAt: node.createdAt,
      });

      for (const msg of node.messages) {
        result.push({
          id: `ctx_${msg.id}`,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        });
      }
    }

    return result;
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
      const contextMessages = this.plugin.settings.includeFullContext
        ? this.buildContextMessages(baseMap, nodeId)
        : undefined;

      if (this.plugin.settings.streamResponses) {
        for await (const chunk of provider.streamChat({
          node: requestNode,
          parent,
          contextMessages,
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
          contextMessages,
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
          if (title) {
            nextMap = updateNode(nextMap, nodeId, { title });
            if (nodeId === nextMap.rootNodeId) {
              nextMap = updateMapTitle(nextMap, title);
            }
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
    const cleanTitle = cleanText(node.title);
    const anchorTitle = node.anchorText ? truncateText(cleanText(node.anchorText), 72) : undefined;
    const defaultTitles = new Set([
      t(language, "rootQuestionTitle"),
      t(language, "untitledQuestionTitle"),
      "Root question",
      "Untitled question",
      "根问题",
      "未命名问题",
    ]);

    if (node.id === map.rootNodeId) {
      return defaultTitles.has(cleanTitle) || map.title === t(language, "defaultMapTitle") || map.title === "Untitled chat map" || map.title === "未命名对话图谱";
    }

    return defaultTitles.has(cleanTitle) || Boolean(anchorTitle && cleanTitle === anchorTitle);
  }

  private async prepareMapForExport(map: ChatMap): Promise<ChatMap> {
    const root = map.nodes[map.rootNodeId];
    if (!root || root.messages.length === 0 || !this.plugin.settings.apiKey || !this.plugin.settings.model || !this.shouldAutoTitle(root, map)) {
      return map;
    }

    try {
      const provider = new OpenAICompatibleProvider(this.plugin.settings);
      const controller = new AbortController();
      const title = this.normalizeGeneratedTitle(await provider.titleNode(root, controller.signal));
      if (!title) {
        return map;
      }

      const titledMap = updateMapTitle(updateNode(map, root.id, { title }), title);
      this.commitMap(titledMap);
      return titledMap;
    } catch {
      return map;
    }
  }

  private exportFolderName(map: ChatMap): string {
    return `${this.formatExportTimestamp(map.createdAt)}-${slugifyFileName(map.title)}`;
  }

  private formatExportTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return slugifyFileName(value);
    }

    const pad = (number: number): string => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
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

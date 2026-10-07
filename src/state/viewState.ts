import { Notice } from "obsidian";
import type BranchChatMapPlugin from "../main";
import { OpenAICompatibleProvider } from "../ai/openAICompatibleProvider";
import { createRootMap, addChildNode, appendMessage, createMessage, getAncestorPath, updateMapTitle, updateNode } from "../domain/chatMap";
import { applyDagreLayout } from "../domain/layout";
import { isSourceTextRange } from "../domain/guards";
import { buildExportFiles } from "../export/exporters";
import { t } from "../i18n";
import { getMissingAiConfiguration } from "../settingsDefaults";
import { MapRepository } from "../storage/mapRepository";
import type { BranchSource, ChatMap, ChatMapId, ChatMessage, ChatNode, ChatNodeStatus, NodeId } from "../types";
import { cleanText, slugifyFileName, truncateText } from "../utils/text";

export interface BranchChatMapState {
  map: ChatMap | null;
  activeNodeId: NodeId | null;
  collapsedIds: Set<NodeId>;
  drafts: Record<NodeId, string>;
  pendingNodeId: NodeId | null;
  streamingMessages: Record<NodeId, ChatMessage>;
  error: string | null;
  errorDetails: string | null;
  focusToken: number;
  hasManualPositions: boolean;
}

const INITIAL_STATE: BranchChatMapState = {
  map: null,
  activeNodeId: null,
  collapsedIds: new Set(),
  drafts: {},
  pendingNodeId: null,
  streamingMessages: {},
  error: null,
  errorDetails: null,
  focusToken: 0,
  hasManualPositions: false,
};

export interface NodeSearchResult {
  node: ChatNode;
  path: ChatNode[];
  excerpt: string;
}

export class ViewState {
  private readonly plugin: BranchChatMapPlugin;
  private readonly repository: MapRepository;
  private readonly listeners = new Set<() => void>();
  private state: BranchChatMapState = INITIAL_STATE;
  private loadPromise: Promise<void> | null = null;
  private loadRevision = 0;
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
        streamingMessages: {},
        error: null,
        errorDetails: null,
        focusToken: 0,
        hasManualPositions: false,
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

    const revision = ++this.loadRevision;
    this.loadPromise = mapId ? this.loadById(mapId, revision) : this.loadLatest(revision);
    return this.loadPromise;
  }

  async createNewRootMap(): Promise<ChatMap> {
    this.loadRevision += 1;
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

  createChild(anchorText?: string, source?: BranchSource): void {
    const { map, activeNodeId } = this.state;
    if (!map || !activeNodeId) {
      return;
    }

    const selectedText = anchorText?.trim();
    const streamingMessage = this.state.pendingNodeId === activeNodeId ? this.state.streamingMessages[activeNodeId] : undefined;
    const validSource = isSourceTextRange(source) && (
      map.nodes[activeNodeId]?.messages.some((message) => message.id === source.messageId && message.role === "assistant")
      || (streamingMessage?.id === source.messageId && streamingMessage.role === "assistant")
    ) ? source : undefined;
    const language = this.plugin.settings.language;
    const { map: nextMap, child } = addChildNode(map, activeNodeId, {
      anchorText: selectedText || undefined,
      title: selectedText ? undefined : t(language, "untitledQuestionTitle"),
      source: validSource,
    });

    this.commitMap(nextMap);
    this.setState({
      activeNodeId: child.id,
      focusToken: this.state.focusToken + 1,
      drafts: selectedText
        ? {
            ...this.state.drafts,
            [child.id]: language === "zh-CN"
              ? `请解释这段内容：${truncateText(selectedText, 120)}`
              : `Please explain this: ${truncateText(selectedText, 120)}`,
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
    this.setState({ error: null, errorDetails: null });

    try {
      const provider = new OpenAICompatibleProvider(this.plugin.settings);
      const summary = await provider.summarizeNode(node, controller.signal);
      const currentMap = this.state.map;
      if (controller.signal.aborted || currentMap?.id !== map.id || !currentMap.nodes[activeNodeId]) return;
      this.commitMap(updateNode(currentMap, activeNodeId, { summary }));
    } catch (summaryError: unknown) {
      this.reportError(summaryError);
    } finally {
      if (this.abortController === controller) this.abortController = null;
    }
  }

  async deleteCurrentMap(): Promise<boolean> {
    const { map } = this.state;
    if (!map) {
      return false;
    }

    const removed = await this.repository.deleteMap(map.id);
    if (!removed) {
      return false;
    }

    const remaining = await this.repository.listMaps();
    if (remaining.length > 0) {
      await this.loadLatest();
    } else {
      const language = this.plugin.settings.language;
      const fresh = applyDagreLayout(
        createRootMap(t(language, "defaultMapTitle"), t(language, "rootQuestionTitle")),
      );
      await this.repository.saveMap(fresh);
      this.resetToMap(fresh);
    }

    return true;
  }

  async exportMap(): Promise<void> {
    const { map } = this.state;
    if (!map) {
      return;
    }

    try {
      const exportMap = await this.prepareMapForExport(map);
      const folder = await this.repository.createExportFolder(`${this.plugin.settings.defaultExportFolder}/${this.exportFolderName(exportMap)}`);
      const files = buildExportFiles(exportMap, { exportFolder: folder, language: this.plugin.settings.language });
      let entryPath = "";

      for (const file of files) {
        const path = await this.repository.writeExport(folder, file.path, file.content);
        if (file.path === "index.md") {
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

    const missingConfiguration = getMissingAiConfiguration(this.plugin.settings);
    if (missingConfiguration) {
      const errorKey = missingConfiguration === "apiBaseUrl"
        ? "missingApiBaseUrl"
        : missingConfiguration === "apiKey"
          ? "missingApiKey"
          : "missingModel";
      this.setState({ error: t(this.plugin.settings.language, errorKey), errorDetails: null });
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
      this.setState({ error: t(this.plugin.settings.language, "retryUnavailable"), errorDetails: null });
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

  requestComposerFocus(): void {
    this.setState({ focusToken: this.state.focusToken + 1 });
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
    this.updateCurrentNodeStatus("understood");
  }

  updateCurrentNodeStatus(status: ChatNodeStatus): void {
    const { map, activeNodeId } = this.state;
    if (!map || !activeNodeId) {
      return;
    }

    this.commitMap(updateNode(map, activeNodeId, { status }));
  }

  updateNodeNote(nodeId: NodeId, note: string): void {
    const { map } = this.state;
    if (!map?.nodes[nodeId]) {
      return;
    }

    const normalizedNote = note.trim() ? note.trimEnd() : undefined;
    if ((map.nodes[nodeId]?.note ?? undefined) === normalizedNote) {
      return;
    }

    this.commitMap(updateNode(map, nodeId, { note: normalizedNote }));
  }

  appendSelectionToNote(nodeId: NodeId, text: string): boolean {
    const node = this.state.map?.nodes[nodeId];
    const selected = text.trim();
    if (!node || !selected) return false;
    // Quotes share the existing editable note, so old maps and all exports keep working.
    const quote = selected.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
    this.updateNodeNote(nodeId, [node.note?.trimEnd(), quote].filter(Boolean).join("\n\n"));
    return true;
  }

  updatePosition(nodeId: NodeId, position: { x: number; y: number }): void {
    const { map } = this.state;
    if (!map) {
      return;
    }

    this.commitMap(updateNode(map, nodeId, { position }));
    this.setState({ hasManualPositions: true });
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
      this.setState({ hasManualPositions: false });
    }
  }

  countNodeSubtree(nodeId: NodeId): number {
    const { map } = this.state;
    if (!map || !map.nodes[nodeId]) {
      return 0;
    }

    let count = 0;
    const visit = (id: NodeId): void => {
      const node = map.nodes[id];
      if (!node) {
        return;
      }

      count += 1;
      for (const childId of node.children) {
        visit(childId);
      }
    };

    visit(nodeId);
    return count;
  }

  searchNodes(query: string): NodeSearchResult[] {
    const { map } = this.state;
    const cleanQuery = cleanText(query).toLowerCase();
    if (!map || !cleanQuery) {
      return [];
    }

    return Object.values(map.nodes)
      .map((node) => {
        const haystack = [
          node.title,
          node.note ?? "",
          node.summary ?? "",
          node.anchorText ?? "",
          ...node.messages.map((message) => message.content),
        ].join(" ");

        if (!haystack.toLowerCase().includes(cleanQuery)) {
          return null;
        }

        return {
          node,
          path: getAncestorPath(map, node.id),
          excerpt: this.searchExcerpt(haystack, cleanQuery),
        };
      })
      .filter((result): result is NodeSearchResult => Boolean(result));
  }

  revealNode(nodeId: NodeId): void {
    const { map } = this.state;
    if (!map?.nodes[nodeId]) {
      return;
    }

    const collapsedIds = new Set(this.state.collapsedIds);
    for (const node of getAncestorPath(map, nodeId)) {
      collapsedIds.delete(node.id);
    }

    this.setState({
      activeNodeId: nodeId,
      collapsedIds,
      focusToken: this.state.focusToken + 1,
    });
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
    this.loadRevision += 1;
    this.abortController?.abort();
    this.listeners.clear();
  }

  private async loadLatest(revision = ++this.loadRevision): Promise<void> {
    try {
      const lastId = this.plugin.settings.lastOpenedMapId;
      let loaded: ChatMap | null = null;

      if (lastId) {
        loaded = await this.repository.loadMap(lastId);
      }

      if (!loaded) {
        loaded = await this.repository.loadLatestMap();
      }
      if (revision !== this.loadRevision) return;

      const language = this.plugin.settings.language;
      const initial = loaded ?? applyDagreLayout(createRootMap(t(language, "defaultMapTitle"), t(language, "rootQuestionTitle")));
      if (!loaded) {
        await this.repository.saveMap(initial);
      }
      if (revision !== this.loadRevision) return;

      this.loadedMapId = initial.id;
      this.setState({
        map: initial,
        activeNodeId: initial.rootNodeId,
        error: null,
        errorDetails: null,
      });
    } catch (loadError: unknown) {
      if (revision === this.loadRevision) this.reportError(loadError);
    }
  }

  private async loadById(mapId: ChatMapId, revision: number): Promise<void> {
    try {
      const loaded = await this.repository.loadMap(mapId);
      if (!loaded || revision !== this.loadRevision) {
        return;
      }

      void this.plugin.updateSettings({ lastOpenedMapId: loaded.id });

      this.loadedMapId = loaded.id;
      this.setState({
        map: loaded,
        activeNodeId: loaded.rootNodeId,
        collapsedIds: new Set(),
        drafts: {},
        pendingNodeId: null,
        streamingMessages: {},
        error: null,
        errorDetails: null,
        focusToken: 0,
        hasManualPositions: false,
      });
    } catch (loadError: unknown) {
      if (revision === this.loadRevision) this.reportError(loadError);
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
      streamingMessages: {},
      error: null,
      errorDetails: null,
      focusToken: 0,
      hasManualPositions: false,
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
    const assistantMessage = createMessage("assistant", "");
    this.abortController = controller;
    this.setState({
      pendingNodeId: nodeId,
      error: null,
      errorDetails: null,
      streamingMessages: {
        ...this.state.streamingMessages,
        [nodeId]: assistantMessage,
      },
    });

    let answer = "";
    let streamUpdateTimer: ReturnType<typeof setTimeout> | undefined;
    const currentMap = () => {
      const map = this.state.map;
      return map?.id === baseMap.id && map.nodes[nodeId]
        && this.state.streamingMessages[nodeId]?.id === assistantMessage.id ? map : null;
    };
    const publishStream = () => {
      streamUpdateTimer = undefined;
      if (controller.signal.aborted || this.abortController !== controller || !currentMap()) return;
      this.setState({
        streamingMessages: {
          ...this.state.streamingMessages,
          [nodeId]: { ...assistantMessage, content: answer },
        },
      });
    };

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
          // Batch token bursts before notifying React and rendering Markdown.
          streamUpdateTimer ??= setTimeout(publishStream, 32);
        }
        clearTimeout(streamUpdateTimer);
        publishStream();
      } else {
        answer = await provider.chat({
          node: requestNode,
          parent,
          contextMessages,
          model: this.plugin.settings.model,
          includeParentContext: this.plugin.settings.includeParentContext,
          signal: controller.signal,
        });
        publishStream();
      }

      controller.signal.throwIfAborted();
      let latestMap = currentMap();
      if (!latestMap) return;
      // Commit the answer to the live map before optional AI metadata requests.
      this.commitMap(appendMessage(latestMap, nodeId, { ...assistantMessage, content: answer }));
      const updatedNode = this.state.map?.nodes[nodeId];
      if (this.plugin.settings.autoSummarizeNodes && updatedNode) {
        const summary = await provider.summarizeNode(updatedNode, controller.signal);
        controller.signal.throwIfAborted();
        latestMap = currentMap();
        if (!latestMap) return;
        this.commitMap(updateNode(latestMap, nodeId, { summary }));
      }

      latestMap = currentMap();
      if (!latestMap) return;
      const titleNode = latestMap.nodes[nodeId];
      if (titleNode && this.shouldAutoTitle(titleNode, latestMap)) {
        try {
          const title = this.normalizeGeneratedTitle(await provider.titleNode(titleNode, controller.signal));
          latestMap = currentMap();
          const currentNode = latestMap?.nodes[nodeId];
          if (title && !controller.signal.aborted && latestMap && currentNode?.title === titleNode.title) {
            let nextMap = updateNode(latestMap, nodeId, { title });
            if (nodeId === nextMap.rootNodeId) {
              nextMap = updateMapTitle(nextMap, title);
            }
            this.commitMap(nextMap);
          }
        } catch {
          // Naming is helpful, but it should never discard the completed answer.
        }
      }
    } catch (generateError: unknown) {
      if (controller.signal.aborted) {
        const partial = answer.trim();
        const latestMap = currentMap();
        if (partial && latestMap && !latestMap.nodes[nodeId]?.messages.some((message) => message.id === assistantMessage.id)) {
          this.commitMap(appendMessage(latestMap, nodeId, { ...assistantMessage, content: partial }));
          new Notice(t(this.plugin.settings.language, "generationStoppedWithPartial"));
        }
      } else if (currentMap()) {
        this.reportError(generateError);
      }
    } finally {
      clearTimeout(streamUpdateTimer);
      if (this.state.streamingMessages[nodeId]?.id === assistantMessage.id) {
        const streamingMessages = { ...this.state.streamingMessages };
        delete streamingMessages[nodeId];
        this.setState({
          streamingMessages,
          pendingNodeId: this.state.pendingNodeId === nodeId ? null : this.state.pendingNodeId,
        });
      }
      if (this.abortController === controller) this.abortController = null;
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

      const currentMap = this.state.map;
      if (currentMap?.id !== map.id || !currentMap.nodes[root.id]) return map;
      if (currentMap.nodes[root.id]?.title !== root.title) return currentMap;
      const titledMap = updateMapTitle(updateNode(currentMap, root.id, { title }), title);
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
    const details = error instanceof Error && "details" in error && typeof error.details === "string" ? error.details : null;
    this.setState({ error: message, errorDetails: details });
    new Notice(message);
  }

  private searchExcerpt(value: string, query: string): string {
    const clean = cleanText(value);
    const idx = clean.toLowerCase().indexOf(query);
    if (idx < 0) {
      return truncateText(clean, 120);
    }

    const start = Math.max(0, idx - 36);
    const end = Math.min(clean.length, idx + query.length + 72);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < clean.length ? "..." : "";
    return `${prefix}${clean.slice(start, end)}${suffix}`;
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

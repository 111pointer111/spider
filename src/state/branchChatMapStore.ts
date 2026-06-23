import type BranchChatMapPlugin from "../main";
import { MapRepository } from "../storage/mapRepository";
import { ViewState } from "./viewState";
import type { ChatMap, ChatMapId } from "../types";

export type { BranchChatMapState } from "./viewState";
export { ViewState } from "./viewState";

let sessionCounter = 0;

function generateSessionId(): string {
  sessionCounter += 1;
  return `spider-session-${sessionCounter}-${Date.now().toString(36)}`;
}

export class BranchChatMapStore {
  readonly repository: MapRepository;
  private readonly plugin: BranchChatMapPlugin;
  private readonly sessions = new Map<string, ViewState>();
  private activeSessionId: string | null = null;
  private readonly activeViewListeners = new Set<() => void>();
  private pendingSession: { id: string; vs: ViewState } | null = null;

  constructor(plugin: BranchChatMapPlugin) {
    this.plugin = plugin;
    this.repository = new MapRepository(plugin.app);
  }

  prepareSessionWithMap(map: ChatMap): string {
    const id = generateSessionId();
    const vs = new ViewState(this.plugin, this.repository, map);
    this.sessions.set(id, vs);
    this.pendingSession = { id, vs };
    return id;
  }

  claimPendingSession(): { id: string; vs: ViewState } | null {
    const ps = this.pendingSession;
    this.pendingSession = null;
    return ps;
  }

  registerSession(sessionId: string): ViewState {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing;
    }

    const vs = new ViewState(this.plugin, this.repository);
    this.sessions.set(sessionId, vs);
    return vs;
  }

  unregisterSession(sessionId: string): void {
    const vs = this.sessions.get(sessionId);
    if (vs) {
      vs.dispose();
      this.sessions.delete(sessionId);
    }

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
  }

  getSession(sessionId: string): ViewState | undefined {
    return this.sessions.get(sessionId);
  }

  setActiveSession(sessionId: string | null): void {
    if (this.activeSessionId === sessionId) {
      return;
    }

    this.activeSessionId = sessionId;
    for (const listener of this.activeViewListeners) {
      listener();
    }
  }

  getActiveSession(): ViewState | null {
    if (!this.activeSessionId) {
      return null;
    }

    return this.sessions.get(this.activeSessionId) ?? null;
  }

  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  getOpenMaps(): Array<{ id: string; title: string; nodeCount: number }> {
    const result: Array<{ id: string; title: string; nodeCount: number }> = [];
    for (const vs of this.sessions.values()) {
      const snapshot = vs.getSnapshot();
      if (snapshot.map) {
        result.push({
          id: snapshot.map.id,
          title: snapshot.map.title,
          nodeCount: Object.keys(snapshot.map.nodes).length,
        });
      }
    }
    return result;
  }

  async listAvailableMaps(): Promise<ChatMap[]> {
    return this.repository.listMaps();
  }

  async switchActiveMap(mapId: ChatMapId): Promise<void> {
    const active = this.getActiveSession();
    if (!active) {
      return;
    }

    await active.load(mapId);
  }

  subscribeActiveView(listener: () => void): () => void {
    this.activeViewListeners.add(listener);
    return () => {
      this.activeViewListeners.delete(listener);
    };
  }

  dispose(): void {
    for (const vs of this.sessions.values()) {
      vs.dispose();
    }
    this.sessions.clear();
    this.activeViewListeners.clear();
  }
}

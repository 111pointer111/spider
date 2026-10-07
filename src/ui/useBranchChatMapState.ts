import { useCallback, useEffect, useSyncExternalStore } from "react";
import type BranchChatMapPlugin from "../main";
import type { ViewState, BranchChatMapState } from "../state/viewState";
import type { BranchChatMapSettings } from "../types";

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

export function useBranchChatMapState(viewState: ViewState): BranchChatMapState {
  useEffect(() => {
    if (!viewState.getSnapshot().map) {
      void viewState.load();
    }
  }, [viewState]);

  return useSyncExternalStore(viewState.subscribe, viewState.getSnapshot, viewState.getSnapshot);
}

export function useActiveViewState(plugin: BranchChatMapPlugin): BranchChatMapState {
  const store = plugin.store;

  const getActiveViewState = useCallback(() => {
    return store.getActiveSession() ?? null;
  }, [store]);

  const subscribeActiveView = useCallback((listener: () => void) => {
    return store.subscribeActiveView(listener);
  }, [store]);
  // Re-check after subscribing so startup cannot miss the first active-session change.
  const viewState = useSyncExternalStore(subscribeActiveView, getActiveViewState, getActiveViewState);

  const subscribe = useCallback(
    (cb: () => void) => {
      if (!viewState) return () => {};
      return viewState.subscribe(cb);
    },
    [viewState],
  );

  const getSnapshot = useCallback((): BranchChatMapState => {
    return viewState?.getSnapshot() ?? INITIAL_STATE;
  }, [viewState]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function usePluginSettings(plugin: BranchChatMapPlugin): BranchChatMapSettings {
  useSyncExternalStore(plugin.subscribeSettings, plugin.getSettingsRevision, plugin.getSettingsRevision);
  return plugin.settings;
}

import { useCallback, useEffect, useSyncExternalStore, useState } from "react";
import type BranchChatMapPlugin from "../main";
import type { ViewState, BranchChatMapState } from "../state/viewState";

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

  const [viewState, setViewState] = useState<ViewState | null>(getActiveViewState);

  useEffect(() => {
    return store.subscribeActiveView(() => {
      setViewState(store.getActiveSession());
    });
  }, [store]);

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



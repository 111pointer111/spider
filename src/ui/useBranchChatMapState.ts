import { useEffect, useSyncExternalStore } from "react";
import type BranchChatMapPlugin from "../main";
import type { BranchChatMapState } from "../state/branchChatMapStore";

export function useBranchChatMapState(plugin: BranchChatMapPlugin): BranchChatMapState {
  useEffect(() => {
    void plugin.store.load();
  }, [plugin.store]);

  return useSyncExternalStore(plugin.store.subscribe, plugin.store.getSnapshot, plugin.store.getSnapshot);
}

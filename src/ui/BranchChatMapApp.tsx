import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useRef, type ReactElement } from "react";
import type BranchChatMapPlugin from "../main";
import { displayTitle, t } from "../i18n";
import { GraphCanvas } from "./GraphCanvas";
import { useBranchChatMapState } from "./useBranchChatMapState";

export interface BranchChatMapController {
  handleKeydown(event: KeyboardEvent): void;
  createChild(anchorText?: string): void;
  goToParent(): void;
  summarizeCurrentNode(): Promise<void>;
  exportMap(): Promise<void>;
}

interface BranchChatMapAppProps {
  plugin: BranchChatMapPlugin;
  onController(controller: BranchChatMapController): void;
}

export function getSelectionInside(root: HTMLElement | null): string | undefined {
  if (!root) {
    return undefined;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return undefined;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    return undefined;
  }

  const text = selection.toString().trim();
  return text || undefined;
}

export function BranchChatMapApp({ plugin, onController }: BranchChatMapAppProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useBranchChatMapState(plugin);
  const { map, activeNodeId, collapsedIds, error } = state;
  const activeNode = activeNodeId && map ? map.nodes[activeNodeId] : null;
  const language = plugin.settings.language;
  const path = plugin.store.getActivePath();

  const createChild = useCallback(
    (anchorText?: string) => {
      plugin.store.createChild(anchorText?.trim() || getSelectionInside(rootRef.current));
    },
    [plugin.store],
  );

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Tab" && plugin.settings.useTabToCreateChildNodes && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
          plugin.store.goToParent();
        } else {
          createChild();
        }
      }

      if (event.key === "Escape") {
        window.getSelection()?.removeAllRanges();
      }
    },
    [createChild, plugin.settings.useTabToCreateChildNodes, plugin.store],
  );

  useEffect(() => {
    onController({
      handleKeydown,
      createChild,
      goToParent: () => plugin.store.goToParent(),
      summarizeCurrentNode: () => plugin.store.summarizeCurrentNode(),
      exportMap: () => plugin.store.exportMap(),
    });
  }, [createChild, handleKeydown, onController, plugin.store]);

  if (!map || !activeNode) {
    return (
      <div className="bcm-root bcm-root-graph" ref={rootRef}>
        <div className="bcm-loading">{error ?? t(language, "loading")}</div>
      </div>
    );
  }

  const nodeCount = Object.keys(map.nodes).length;

  return (
    <div className="bcm-root bcm-root-graph" ref={rootRef}>
      <div className="bcm-topbar">
        <div>
          <div className="bcm-eyebrow">{t(language, "appName")}</div>
          <div className="bcm-title">{displayTitle(language, map.title)}</div>
          <div className="bcm-topbar-meta">{t(language, "mapStats", { nodes: nodeCount, depth: Math.max(path.length - 1, 0) })}</div>
        </div>
      </div>

      <div className="bcm-workspace">
        <GraphCanvas
          map={map}
          activeNodeId={activeNode.id}
          collapsedIds={collapsedIds}
          language={language}
          onActivateNode={(nodeId) => plugin.store.setActiveNode(nodeId)}
          onToggleCollapse={(nodeId) => plugin.store.toggleCollapse(nodeId)}
          onPositionChange={(nodeId, position) => plugin.store.updatePosition(nodeId, position)}
        />
      </div>
    </div>
  );
}

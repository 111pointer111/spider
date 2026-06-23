import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useRef, type ReactElement } from "react";
import type BranchChatMapPlugin from "../main";
import { displayTitle, t } from "../i18n";
import { GraphCanvas } from "./GraphCanvas";
import { useBranchChatMapState } from "./useBranchChatMapState";
import { MapSwitcherModal } from "./MapSwitcherModal";
import { MapGallery } from "./MapGallery";
import type { ViewState } from "../state/viewState";
import type { ChatMapId } from "../types";

export interface BranchChatMapController {
  handleKeydown(this: void, event: KeyboardEvent): void;
  createChild(this: void, anchorText?: string): void;
  goToParent(this: void): void;
  summarizeCurrentNode(this: void): Promise<void>;
  exportMap(this: void): Promise<void>;
}

interface BranchChatMapAppProps {
  plugin: BranchChatMapPlugin;
  viewState: ViewState;
  onController(this: void, controller: BranchChatMapController): void;
  setTabTitle(this: void, title: string): void;
  onNewSpider(this: void): void;
  onLoadMap(this: void, mapId: ChatMapId): void;
}

export function getSelectionInside(root: HTMLElement | null, doc?: Document): string | undefined {
  if (!root) {
    return undefined;
  }

  const documentRef = doc || activeDocument;
  const active = documentRef.activeElement;

  if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT") && root.contains(active)) {
    const el = active as HTMLInputElement | HTMLTextAreaElement;
    const text = el.value.substring(el.selectionStart ?? 0, el.selectionEnd ?? 0).trim();
    if (text) {
      return text;
    }
  }

  const selection = documentRef.getSelection();
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

function openMapSwitcher(plugin: BranchChatMapPlugin): void {
  const modal = new MapSwitcherModal(plugin);
  void modal.loadMaps().then(() => modal.open());
}

export function BranchChatMapApp({ plugin, viewState, onController, setTabTitle, onNewSpider, onLoadMap }: BranchChatMapAppProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useBranchChatMapState(viewState);
  const { map, activeNodeId, collapsedIds } = state;
  const activeNode = activeNodeId && map ? map.nodes[activeNodeId] : null;
  const language = plugin.settings.language;
  const path = viewState.getActivePath();

  useEffect(() => {
    if (map) {
      setTabTitle(displayTitle(language, map.title));
    }
  }, [map, language, setTabTitle]);

  const handleSwitchClick = useCallback(() => {
    openMapSwitcher(plugin);
  }, [plugin]);

  const handleSelectMap = useCallback((mapId: ChatMapId) => {
    onLoadMap(mapId);
  }, [onLoadMap]);

  const createChild = useCallback(
    (anchorText?: string) => {
      const doc = activeDocument;
      viewState.createChild(anchorText?.trim() || getSelectionInside(rootRef.current, doc));
    },
    [viewState],
  );

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      const tag = (event.target as Node)?.nodeName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA";

      if (event.key === "Tab" && plugin.settings.useTabToCreateChildNodes && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
          viewState.goToParent();
        } else {
          createChild();
        }
        return;
      }

      if (event.key === "Escape") {
        window.getSelection()?.removeAllRanges();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && !isInput) {
        const { map, activeNodeId } = viewState.getSnapshot();
        if (map && activeNodeId && activeNodeId !== map.rootNodeId) {
          event.preventDefault();
          viewState.deleteNode(activeNodeId);
          return;
        }
      }

      if (isInput && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown")) {
        return;
      }

      const { map, activeNodeId: currentId } = viewState.getSnapshot();
      if (!map || !currentId) {
        return;
      }

      const currentNode = map.nodes[currentId];
      if (!currentNode) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        viewState.goToParent();
        return;
      }

      if (event.key === "ArrowRight") {
        if (currentNode.children.length > 0) {
          const firstChild = currentNode.children[0];
          if (firstChild) {
            event.preventDefault();
            viewState.setActiveNode(firstChild);
          }
        }
        return;
      }

      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        if (!currentNode.parentId) {
          return;
        }

        const parent = map.nodes[currentNode.parentId];
        if (!parent) {
          return;
        }

        const siblings = parent.children;
        const idx = siblings.indexOf(currentId);
        if (idx < 0) {
          return;
        }

        if (event.key === "ArrowUp" && idx > 0) {
          const prev = siblings[idx - 1];
          if (prev) {
            event.preventDefault();
            viewState.setActiveNode(prev);
          }
        } else if (event.key === "ArrowDown" && idx < siblings.length - 1) {
          const next = siblings[idx + 1];
          if (next) {
            event.preventDefault();
            viewState.setActiveNode(next);
          }
        }
      }
    },
    [createChild, plugin.settings.useTabToCreateChildNodes, viewState],
  );

  useEffect(() => {
    onController({
      handleKeydown,
      createChild,
      goToParent: () => viewState.goToParent(),
      summarizeCurrentNode: () => viewState.summarizeCurrentNode(),
      exportMap: () => viewState.exportMap(),
    });
  }, [createChild, handleKeydown, onController, viewState]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const doc = activeDocument;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && plugin.settings.useTabToCreateChildNodes && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const container = rootRef.current;
        if (!container) return;

        const sel = doc.getSelection();
        const inContainer = (node: Node | null) => node instanceof Node && container.contains(node);

        const hasSelection = (sel && sel.rangeCount > 0 && inContainer(sel.getRangeAt(0).commonAncestorContainer));
        const inTextarea = doc.activeElement?.tagName === "TEXTAREA" && inContainer(doc.activeElement);

        if (!hasSelection && !inTextarea) return;

        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          viewState.goToParent();
        } else {
          viewState.createChild(getSelectionInside(container, doc) || undefined);
        }
      }
    };

    doc.addEventListener("keydown", onKeyDown, { capture: true });
    return () => doc.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [plugin.settings.useTabToCreateChildNodes, viewState]);

  if (!map || !activeNode) {
    return (
      <MapGallery
        plugin={plugin}
        onSelectMap={handleSelectMap}
        onNewMap={onNewSpider}
      />
    );
  }

  const nodeCount = Object.keys(map.nodes).length;

  return (
    <div className="bcm-root bcm-root-graph" ref={rootRef}>
      <div className="bcm-topbar">
        <div>
          <div className="bcm-eyebrow">{t(language, "appName")}</div>
          <div className="bcm-title-row">
            <span className="bcm-title-link" onClick={handleSwitchClick} role="button" tabIndex={0}>
              {displayTitle(language, map.title)}
              <span className="bcm-title-arrow">▾</span>
            </span>
            <button className="bcm-title-add" onClick={onNewSpider} type="button" aria-label={t(language, "newMapCommand")}>+</button>
          </div>
          <div className="bcm-topbar-meta">{t(language, "mapStats", { nodes: nodeCount, depth: Math.max(path.length - 1, 0) })}</div>
        </div>
        <div className="bcm-topbar-actions">
          <button className="bcm-topbar-btn" onClick={() => viewState.autoLayout()} type="button" title={t(language, "autoLayout")}>
            {language === "zh-CN" ? "布局" : "Layout"}
          </button>
          <button className="bcm-topbar-btn" onClick={() => { void viewState.exportMap(); }} type="button" title={t(language, "export")}>
            {language === "zh-CN" ? "导出" : "Export"}
          </button>
        </div>
      </div>

      <div className="bcm-workspace">
        <GraphCanvas
          map={map}
          activeNodeId={activeNode.id}
          collapsedIds={collapsedIds}
          language={language}
          onActivateNode={(nodeId) => viewState.setActiveNode(nodeId)}
          onToggleCollapse={(nodeId) => viewState.toggleCollapse(nodeId)}
          onPositionChange={(nodeId, position) => viewState.updatePosition(nodeId, position)}
        />
      </div>
    </div>
  );
}

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Notice } from "obsidian";
import type BranchChatMapPlugin from "../main";
import { confirmDeleteSubtreeLabel, displayTitle, mapStatsLabel, t } from "../i18n";
import { GraphCanvas } from "./GraphCanvas";
import { useBranchChatMapState, usePluginSettings } from "./useBranchChatMapState";
import { MapSwitcherModal } from "./MapSwitcherModal";
import { MapGallery } from "./MapGallery";
import { confirmAction, confirmDelete } from "./ConfirmModal";
import type { ViewState } from "../state/viewState";
import type { ChatMapId, NodeId } from "../types";
import { getSelectionInside, shouldCreateBranchFromTab, shouldGoToParentFromShiftTab, shouldHandleCanvasNavigation } from "./keyboardShortcuts";
import { SearchResultItem } from "./SearchResultItem";

export interface BranchChatMapController {
  handleKeydown(this: void, event: KeyboardEvent): void;
  createChild(this: void, anchorText?: string): void;
  goToParent(this: void): void;
  summarizeCurrentNode(this: void): Promise<void>;
  exportMap(this: void): Promise<void>;
  deleteCurrentMap(this: void): Promise<void>;
}

interface BranchChatMapAppProps {
  plugin: BranchChatMapPlugin;
  viewState: ViewState;
  onController(this: void, controller: BranchChatMapController): void;
  setTabTitle(this: void, title: string): void;
  onNewSpider(this: void): void;
  onLoadMap(this: void, mapId: ChatMapId): void;
}

function openMapSwitcher(plugin: BranchChatMapPlugin): void {
  const modal = new MapSwitcherModal(plugin);
  void modal.loadMaps().then(() => modal.open());
}

export function BranchChatMapApp({ plugin, viewState, onController, setTabTitle, onNewSpider, onLoadMap }: BranchChatMapAppProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useBranchChatMapState(viewState);
  const { map, activeNodeId, collapsedIds, hasManualPositions } = state;
  const [searchQuery, setSearchQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const activeNode = activeNodeId && map ? map.nodes[activeNodeId] : null;
  const settings = usePluginSettings(plugin);
  const language = settings.language;
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

  const handleDeleteCurrentMap = useCallback(async () => {
    const target = viewState.getSnapshot().map;
    if (!target) {
      return;
    }
    const ok = await confirmDelete(plugin.app, language, target.title);
    if (!ok) {
      return;
    }
    const removed = await viewState.deleteCurrentMap();
    if (removed) {
      new Notice(t(language, "mapDeleted"));
    }
  }, [language, plugin.app, viewState]);

  const handleAutoLayout = useCallback(async () => {
    if (hasManualPositions) {
      const ok = await confirmAction(plugin.app, {
        title: t(language, "autoLayout"),
        message: t(language, "confirmAutoLayout"),
        confirmText: t(language, "autoLayout"),
        cancelText: t(language, "cancel"),
        openFailureText: (message) => t(language, "confirmDialogOpenFailed", { message }),
      });
      if (!ok) {
        return;
      }
    }

    viewState.autoLayout();
  }, [hasManualPositions, language, plugin.app, viewState]);

  const confirmAndDeleteNode = useCallback(async (nodeId: ChatMapId) => {
    const subtreeCount = viewState.countNodeSubtree(nodeId);
    const childCount = Math.max(0, subtreeCount - 1);
    const message = childCount > 0
      ? confirmDeleteSubtreeLabel(language, childCount)
      : t(language, "confirmDeleteNode");
    const ok = await confirmAction(plugin.app, {
      title: t(language, "deleteNode"),
      message,
      confirmText: t(language, "deleteNode"),
      cancelText: t(language, "cancel"),
      openFailureText: (openError) => t(language, "confirmDialogOpenFailed", { message: openError }),
    });
    if (ok) {
      viewState.deleteNode(nodeId);
    }
  }, [language, plugin.app, viewState]);

  const searchResults = useMemo(() => viewState.searchNodes(searchQuery), [searchQuery, state.map, viewState]);
  const searchMatchIds = useMemo(() => new Set(searchResults.map((result) => result.node.id)), [searchResults]);

  const createChild = useCallback(
    (anchorText?: string) => {
      const selectedText = anchorText?.trim() || getSelectionInside(rootRef.current);
      viewState.createChild(selectedText);
      if (selectedText) {
        new Notice(t(language, "onboardingChildCreatedNotice"));
      }
    },
    [language, viewState],
  );

  const handleNoteChange = useCallback((nodeId: NodeId, note: string) => {
    viewState.updateNodeNote(nodeId, note);
  }, [viewState]);

  const handleActivateNode = useCallback((nodeId: NodeId) => {
    viewState.setActiveNode(nodeId);
    viewState.requestComposerFocus();
  }, [viewState]);
  const handleToggleCollapse = useCallback((nodeId: NodeId) => viewState.toggleCollapse(nodeId), [viewState]);
  const handlePositionChange = useCallback((nodeId: NodeId, position: { x: number; y: number }) => {
    viewState.updatePosition(nodeId, position);
  }, [viewState]);

  const handleRevealSearchResult = useCallback((nodeId: NodeId) => {
    viewState.revealNode(nodeId);
  }, [viewState]);

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      const selectedText = getSelectionInside(rootRef.current);
      if (shouldCreateBranchFromTab(event, settings.useTabToCreateChildNodes, Boolean(selectedText))) {
        event.preventDefault();
        event.stopPropagation();
        createChild(selectedText);
        rootRef.current?.ownerDocument.getSelection()?.removeAllRanges();
        return;
      }

      if (shouldGoToParentFromShiftTab(event, settings.useTabToCreateChildNodes)) {
        event.preventDefault();
        event.stopPropagation();
        viewState.goToParent();
        return;
      }

      if (event.key === "Escape") {
        rootRef.current?.ownerDocument.getSelection()?.removeAllRanges();
        return;
      }

      if (!shouldHandleCanvasNavigation(event)) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const { map, activeNodeId } = viewState.getSnapshot();
        if (map && activeNodeId && activeNodeId !== map.rootNodeId) {
          event.preventDefault();
          void confirmAndDeleteNode(activeNodeId);
          return;
        }
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
    [confirmAndDeleteNode, createChild, settings.useTabToCreateChildNodes, viewState],
  );

  useEffect(() => {
    onController({
      handleKeydown,
      createChild,
      goToParent: () => viewState.goToParent(),
      summarizeCurrentNode: () => viewState.summarizeCurrentNode(),
      exportMap: () => viewState.exportMap(),
      deleteCurrentMap: handleDeleteCurrentMap,
    });
  }, [createChild, handleDeleteCurrentMap, handleKeydown, onController, viewState]);

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
          <div className="bcm-title-row">
            <span
              className="bcm-title-link"
              onClick={handleSwitchClick}
              role="button"
              tabIndex={0}
              title={t(language, "switchMapHint")}
              aria-label={t(language, "switchMapHint")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleSwitchClick();
                }
              }}
            >
              {displayTitle(language, map.title)}
              <span className="bcm-title-arrow">▾</span>
            </span>
            <button className="bcm-title-add" onClick={onNewSpider} type="button" aria-label={t(language, "newMapCommand")}>+</button>
          </div>
          <div className="bcm-topbar-meta">{mapStatsLabel(language, nodeCount, Math.max(path.length - 1, 0))}</div>
        </div>
        <div className="bcm-topbar-actions">
          <button className="bcm-topbar-btn" onClick={() => { void handleAutoLayout(); }} type="button" title={t(language, "autoLayout")}>
            {t(language, "layout")}
          </button>
          <button className="bcm-topbar-btn" onClick={() => { void viewState.exportMap(); }} type="button" title={t(language, "export")}>
            {t(language, "export")}
          </button>
          <div className="bcm-more">
            <button className="bcm-topbar-btn" onClick={() => setMoreOpen((open) => !open)} type="button" title={t(language, "moreActions")} aria-expanded={moreOpen}>
              {t(language, "moreActions")} ▾
            </button>
            {moreOpen ? (
              <div className="bcm-more-menu">
                <button className="bcm-more-item is-danger" onClick={() => { setMoreOpen(false); void handleDeleteCurrentMap(); }} type="button">
                  {t(language, "deleteMap")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bcm-workspace">
        <div className="bcm-search-panel">
          <input
            className="bcm-search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            placeholder={t(language, "searchPlaceholder")}
            aria-label={t(language, "searchNodes")}
          />
          {searchQuery ? (
            <div className="bcm-search-results">
              {searchResults.length > 0 ? searchResults.slice(0, 8).map((result) => (
                <SearchResultItem
                  app={plugin.app}
                  key={result.node.id}
                  language={language}
                  result={result}
                  onActivate={handleRevealSearchResult}
                />
              )) : (
                <div className="bcm-search-empty">{t(language, "searchNoResults")}</div>
              )}
            </div>
          ) : null}
        </div>
        <GraphCanvas
          map={map}
          activeNodeId={activeNode.id}
          collapsedIds={collapsedIds}
          language={language}
          searchMatchIds={searchMatchIds}
          onActivateNode={handleActivateNode}
          onNoteChange={handleNoteChange}
          onToggleCollapse={handleToggleCollapse}
          onPositionChange={handlePositionChange}
        />
      </div>
    </div>
  );
}

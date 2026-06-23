import { useCallback, useEffect, useRef, type ReactElement } from "react";
import type BranchChatMapPlugin from "../main";
import { displayTitle, t } from "../i18n";
import { NodeDetails } from "./NodeDetails";
import type { BranchChatMapController } from "./BranchChatMapApp";
import { getSelectionInside } from "./BranchChatMapApp";
import { useActiveViewState } from "./useBranchChatMapState";

interface BranchChatMapChatAppProps {
  plugin: BranchChatMapPlugin;
  onController(this: void, controller: BranchChatMapController): void;
}

export function BranchChatMapChatApp({ plugin, onController }: BranchChatMapChatAppProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useActiveViewState(plugin);
  const { map, activeNodeId, drafts, error, focusToken, pendingNodeId, streamingContent } = state;
  const node = activeNodeId && map ? map.nodes[activeNodeId] : null;
  const parent = node?.parentId && map ? map.nodes[node.parentId] : undefined;
  const language = plugin.settings.language;

  const viewState = plugin.store.getActiveSession();

  const path = viewState?.getActivePath() ?? [];

  const createChild = useCallback(
    (anchorText?: string) => {
      const doc = activeDocument;
      viewState?.createChild(anchorText?.trim() || getSelectionInside(rootRef.current, doc));
    },
    [viewState],
  );

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Tab" && plugin.settings.useTabToCreateChildNodes && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();

        if (event.shiftKey) {
          viewState?.goToParent();
        } else {
          createChild();
        }
        return;
      }

      if (event.key === "Escape") {
        window.getSelection()?.removeAllRanges();
        return;
      }

      const tag = (event.target as Node)?.nodeName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA";

      if ((event.key === "Delete" || event.key === "Backspace") && !isInput) {
        const vs = viewState;
        const snap = vs?.getSnapshot();
        if (snap?.map && snap.activeNodeId && snap.activeNodeId !== snap.map.rootNodeId) {
          event.preventDefault();
          vs?.deleteNode(snap.activeNodeId);
          return;
        }
      }

      if (isInput && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown")) {
        return;
      }

      const vs = viewState;
      if (!vs) {
        return;
      }
      const { map, activeNodeId: currentId } = vs.getSnapshot();
      if (!map || !currentId) {
        return;
      }

      const currentNode = map.nodes[currentId];
      if (!currentNode) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        vs.goToParent();
        return;
      }

      if (event.key === "ArrowRight") {
        if (currentNode.children.length > 0) {
          const firstChild = currentNode.children[0];
          if (firstChild) {
            event.preventDefault();
            vs.setActiveNode(firstChild);
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
            vs.setActiveNode(prev);
          }
        } else if (event.key === "ArrowDown" && idx < siblings.length - 1) {
          const next = siblings[idx + 1];
          if (next) {
            event.preventDefault();
            vs.setActiveNode(next);
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
      goToParent: () => viewState?.goToParent(),
      summarizeCurrentNode: () => viewState?.summarizeCurrentNode() ?? Promise.resolve(),
      exportMap: () => viewState?.exportMap() ?? Promise.resolve(),
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
          viewState?.goToParent();
        } else {
          viewState?.createChild(getSelectionInside(container, doc) || undefined);
        }
      }
    };

    doc.addEventListener("keydown", onKeyDown, { capture: true });
    return () => doc.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [plugin.settings.useTabToCreateChildNodes, viewState]);

  if (!node) {
    return (
      <div className="bcm-sidebar-root" ref={rootRef}>
        <div className="bcm-loading">{error ?? t(language, "loading")}</div>
      </div>
    );
  }

  const vs = viewState;

  return (
    <div className="bcm-sidebar-root" ref={rootRef}>
      <div className="bcm-chat-map-name">
        {map ? displayTitle(language, map.title) : ""}
      </div>
      <NodeDetails
        app={plugin.app}
        node={node}
        parent={parent}
        path={path}
        draft={drafts[node.id] ?? ""}
        error={error}
        focusToken={focusToken}
        isPending={pendingNodeId === node.id}
        language={language}
        streamingContent={streamingContent[node.id] ?? ""}
        onCancel={() => vs?.cancelGeneration()}
        onCreateChild={() => createChild()}
        onDeleteNode={(nodeId) => vs?.deleteNode(nodeId)}
        onDraftChange={(value) => vs?.updateDraft(node.id, value)}
        onGoParent={() => vs?.goToParent()}
        onMarkUnderstood={() => vs?.markUnderstood()}
        onRetry={() => void vs?.retryAssistant()}
        onSend={() => void vs?.sendMessage()}
        onSummarize={() => void vs?.summarizeCurrentNode()}
        onTitleChange={(title) => vs?.updateCurrentNodeTitle(title)}
      />
    </div>
  );
}

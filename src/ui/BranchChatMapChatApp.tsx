import { useCallback, useEffect, useRef, type ReactElement } from "react";
import type BranchChatMapPlugin from "../main";
import { t } from "../i18n";
import { NodeDetails } from "./NodeDetails";
import type { BranchChatMapController } from "./BranchChatMapApp";
import { getSelectionInside } from "./BranchChatMapApp";
import { useBranchChatMapState } from "./useBranchChatMapState";

interface BranchChatMapChatAppProps {
  plugin: BranchChatMapPlugin;
  onController(controller: BranchChatMapController): void;
}

export function BranchChatMapChatApp({ plugin, onController }: BranchChatMapChatAppProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const state = useBranchChatMapState(plugin);
  const { map, activeNodeId, drafts, error, focusToken, pendingNodeId, streamingContent } = state;
  const node = activeNodeId && map ? map.nodes[activeNodeId] : null;
  const parent = node?.parentId && map ? map.nodes[node.parentId] : undefined;
  const path = plugin.store.getActivePath();
  const language = plugin.settings.language;

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

  if (!node) {
    return (
      <div className="bcm-sidebar-root" ref={rootRef}>
        <div className="bcm-loading">{error ?? t(language, "loading")}</div>
      </div>
    );
  }

  return (
    <div className="bcm-sidebar-root" ref={rootRef}>
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
        onAutoLayout={() => plugin.store.autoLayout()}
        onCancel={() => plugin.store.cancelGeneration()}
        onCreateChild={() => createChild()}
        onDraftChange={(value) => plugin.store.updateDraft(node.id, value)}
        onExport={() => void plugin.store.exportMap()}
        onGoParent={() => plugin.store.goToParent()}
        onMarkUnderstood={() => plugin.store.markUnderstood()}
        onRetry={() => void plugin.store.retryAssistant()}
        onSend={() => void plugin.store.sendMessage()}
        onSummarize={() => void plugin.store.summarizeCurrentNode()}
        onTitleChange={(title) => plugin.store.updateCurrentNodeTitle(title)}
      />
    </div>
  );
}

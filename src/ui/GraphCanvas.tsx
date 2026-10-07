import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { memo, useEffect, useMemo, useState, type ReactElement } from "react";
import { branchesCountLabel, displayTitle, statusLabel, t } from "../i18n";
import type { AppLanguage, ChatMap, ChatNode, NodeId } from "../types";
import { markdownToPlainText, truncateText } from "../utils/text";
import { NodeNotePopover } from "./NodeNotePopover";

interface BranchNodeData {
  [key: string]: unknown;
  node: ChatNode;
  active: boolean;
  inPath: boolean;
  collapsed: boolean;
  childCount: number;
  language: AppLanguage;
  searchMatch: boolean;
  notePinned: boolean;
  onActivateNode(nodeId: NodeId): void;
  onPinnedNoteChange(nodeId: NodeId | null): void;
  onNoteChange(nodeId: NodeId, note: string): void;
  onToggleCollapse(nodeId: NodeId): void;
}

type BranchFlowNode = Node<BranchNodeData, "branchNode">;

const BranchNode = memo(function BranchNode({ data }: NodeProps<BranchFlowNode>) {
  const statusLabelText = statusLabel(data.language, data.node.status);
  const hasNote = Boolean(data.node.note?.trim());
  const hasSummary = Boolean(data.node.summary?.trim());
  const hasAnchor = Boolean(data.node.anchorText?.trim());
  const branchLabel = branchesCountLabel(data.language, data.childCount);
  const previewContent = data.node.note?.trim() || data.node.summary?.trim();
  const previewLabel = hasNote ? t(data.language, "nodeNote") : t(data.language, "nodeSummaryLabel");
  const previewText = previewContent ? truncateText(markdownToPlainText(previewContent), 180) : "";

  return (
    <div
      className={`bcm-graph-node ${data.active ? "is-active" : ""} ${data.inPath ? "is-path" : ""} ${
        data.node.status === "understood" ? "is-understood" : ""
      } ${
        data.node.status === "archived" ? "is-archived" : ""
      } ${data.searchMatch ? "is-search-match" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="bcm-node-meta">
        <span className="bcm-node-status">
          <span className="bcm-node-status-dot" aria-hidden="true" />
          {statusLabelText}
        </span>
        <div className="bcm-node-meta-actions">
          <NodeNotePopover
            nodeId={data.node.id}
            note={data.node.note}
            language={data.language}
            pinned={data.notePinned}
            preferLeft={!data.node.parentId}
            onActivate={data.onActivateNode}
            onPinnedChange={data.onPinnedNoteChange}
            onNoteChange={data.onNoteChange}
          />
          {data.childCount > 0 ? (
            <button
              className="bcm-node-branch-count"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                data.onToggleCollapse(data.node.id);
              }}
            >
              {data.collapsed ? `+${branchLabel}` : branchLabel}
            </button>
          ) : null}
        </div>
      </div>
      <div className="bcm-node-title" title={displayTitle(data.language, data.node.title)}>
        {displayTitle(data.language, data.node.title)}
      </div>
      {previewText ? (
        <div className={`bcm-node-preview ${hasNote ? "is-note" : "is-summary"}`}>
          <span className="bcm-node-section-label">{previewLabel}</span>
          <div className="bcm-node-preview-text" title={previewText}>{previewText}</div>
        </div>
      ) : null}
      {hasAnchor || (hasNote && hasSummary) ? (
        <div className="bcm-node-signals">
          {hasAnchor ? <span>{t(data.language, "hasAnchorText")}</span> : null}
          {hasNote && hasSummary ? <span>{t(data.language, "hasAiSummary")}</span> : null}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

const nodeTypes = {
  branchNode: BranchNode,
};

interface GraphCanvasProps {
  map: ChatMap;
  activeNodeId: NodeId;
  collapsedIds: Set<NodeId>;
  language: AppLanguage;
  searchMatchIds?: Set<NodeId>;
  onActivateNode(this: void, nodeId: NodeId): void;
  onNoteChange(this: void, nodeId: NodeId, note: string): void;
  onToggleCollapse(this: void, nodeId: NodeId): void;
  onPositionChange(this: void, nodeId: NodeId, position: { x: number; y: number }): void;
}

function collectVisibleNodeIds(map: ChatMap, collapsedIds: Set<NodeId>): Set<NodeId> {
  const visible = new Set<NodeId>();

  const visit = (nodeId: NodeId): void => {
    const node = map.nodes[nodeId];
    if (!node) {
      return;
    }

    visible.add(nodeId);
    if (collapsedIds.has(nodeId)) {
      return;
    }

    for (const childId of node.children) {
      visit(childId);
    }
  };

  visit(map.rootNodeId);
  return visible;
}

function collectActivePathIds(map: ChatMap, activeNodeId: NodeId): Set<NodeId> {
  const ids = new Set<NodeId>();
  let current = map.nodes[activeNodeId];

  while (current) {
    ids.add(current.id);
    current = current.parentId ? map.nodes[current.parentId] : undefined;
  }

  return ids;
}

function GraphCanvasInner({
  map,
  activeNodeId,
  collapsedIds,
  language,
  searchMatchIds,
  onActivateNode,
  onNoteChange,
  onToggleCollapse,
  onPositionChange,
}: GraphCanvasProps): ReactElement {
  const visibleIds = useMemo(() => collectVisibleNodeIds(map, collapsedIds), [collapsedIds, map]);
  const activePathIds = useMemo(() => collectActivePathIds(map, activeNodeId), [activeNodeId, map]);
  const [pinnedNoteNodeId, setPinnedNoteNodeId] = useState<NodeId | null>(null);

  const computedNodes = useMemo<BranchFlowNode[]>(() => {
    return Object.values(map.nodes)
      .filter((node) => visibleIds.has(node.id))
      .map((node) => ({
        id: node.id,
        type: "branchNode",
        position: node.position,
        data: {
          node,
          active: node.id === activeNodeId,
          inPath: activePathIds.has(node.id),
          collapsed: collapsedIds.has(node.id),
          childCount: node.children.length,
          language,
          searchMatch: searchMatchIds?.has(node.id) ?? false,
          notePinned: pinnedNoteNodeId === node.id,
          onActivateNode,
          onPinnedNoteChange: setPinnedNoteNodeId,
          onNoteChange,
          onToggleCollapse,
        },
      }));
  }, [activeNodeId, activePathIds, collapsedIds, language, map.nodes, onActivateNode, onNoteChange, onToggleCollapse, pinnedNoteNodeId, searchMatchIds, visibleIds]);

  const computedEdges = useMemo<Edge[]>(() => {
    return map.edges
      .filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to))
      .map((edge) => {
        const targetNode = map.nodes[edge.to];
        const isPathEdge = activePathIds.has(edge.from) && activePathIds.has(edge.to) && targetNode?.parentId === edge.from;

        return {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          type: "smoothstep",
          className: isPathEdge ? "is-path-edge" : undefined,
        };
      });
  }, [activePathIds, map.edges, map.nodes, visibleIds]);

  const [nodes, setNodes] = useState<BranchFlowNode[]>(computedNodes);

  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes]);

  return (
    <div
      className="bcm-graph"
      data-spider-canvas="true"
      tabIndex={0}
      role="application"
      aria-label={t(language, "graphCanvasLabel")}
    >
      <ReactFlow<BranchFlowNode, Edge>
        nodes={nodes}
        edges={computedEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.24 }}
        minZoom={0.18}
        maxZoom={1.7}
        onNodeClick={(_event, node) => {
          setPinnedNoteNodeId(null);
          onActivateNode(node.id);
        }}
        onPaneClick={() => setPinnedNoteNodeId(null)}
        onNodeDragStop={(_event, node) => onPositionChange(node.id, node.position)}
        onNodesChange={(changes: NodeChange<BranchFlowNode>[]) => {
          setNodes((current) => applyNodeChanges(changes, current));
        }}
      >
        <Background gap={24} size={1} />
        <Controls />
        <MiniMap pannable zoomable nodeStrokeWidth={2} />
      </ReactFlow>
    </div>
  );
}

export const GraphCanvas = memo(function GraphCanvas(props: GraphCanvasProps): ReactElement {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
});

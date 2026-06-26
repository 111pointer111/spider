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
import { displayTitle, statusLabel } from "../i18n";
import type { AppLanguage, ChatMap, ChatNode, NodeId } from "../types";

interface BranchNodeData {
  [key: string]: unknown;
  node: ChatNode;
  active: boolean;
  inPath: boolean;
  collapsed: boolean;
  childCount: number;
  language: AppLanguage;
  searchMatch: boolean;
  onToggleCollapse(nodeId: NodeId): void;
}

type BranchFlowNode = Node<BranchNodeData, "branchNode">;

const BranchNode = memo(function BranchNode({ data }: NodeProps<BranchFlowNode>) {
  const statusLabelText = statusLabel(data.language, data.node.status);
  return (
    <div
      className={`bcm-graph-node ${data.active ? "is-active" : ""} ${data.inPath ? "is-path" : ""} ${
        data.node.status === "understood" ? "is-understood" : ""
      } ${data.searchMatch ? "is-search-match" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="bcm-node-header">
        <span className="bcm-node-status">{statusLabelText}</span>
        {data.childCount > 0 ? (
          <button
            className="bcm-node-toggle"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              data.onToggleCollapse(data.node.id);
            }}
          >
            {data.collapsed ? `+${data.childCount}` : data.childCount}
          </button>
        ) : null}
      </div>
      <div className="bcm-node-title">{displayTitle(data.language, data.node.title)}</div>
      {data.node.summary ? <div className="bcm-node-summary">{data.node.summary}</div> : null}
      {data.node.anchorText ? <div className="bcm-node-anchor">{data.node.anchorText}</div> : null}
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
  onToggleCollapse,
  onPositionChange,
}: GraphCanvasProps): ReactElement {
  const visibleIds = useMemo(() => collectVisibleNodeIds(map, collapsedIds), [collapsedIds, map]);
  const activePathIds = useMemo(() => collectActivePathIds(map, activeNodeId), [activeNodeId, map]);

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
          onToggleCollapse,
        },
      }));
  }, [activeNodeId, activePathIds, collapsedIds, language, map.nodes, onToggleCollapse, searchMatchIds, visibleIds]);

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
          animated: isPathEdge,
          className: isPathEdge ? "is-path-edge" : undefined,
        };
      });
  }, [activePathIds, map.edges, map.nodes, visibleIds]);

  const [nodes, setNodes] = useState<BranchFlowNode[]>(computedNodes);

  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes]);

  return (
    <div className="bcm-graph">
      <ReactFlow<BranchFlowNode, Edge>
        nodes={nodes}
        edges={computedEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.24 }}
        minZoom={0.18}
        maxZoom={1.7}
        onNodeClick={(_event, node) => onActivateNode(node.id)}
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

export function GraphCanvas(props: GraphCanvasProps): ReactElement {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

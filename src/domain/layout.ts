import * as dagre from "@dagrejs/dagre";
import type { ChatMap, ChatNode } from "../types";

const NODE_WIDTH = 340;
const NODE_HEIGHT = 180;

export function applyDagreLayout(map: ChatMap): ChatMap {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "LR",
    nodesep: 80,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  for (const node of Object.values(map.nodes)) {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  for (const edge of map.edges) {
    graph.setEdge(edge.from, edge.to);
  }

  dagre.layout(graph);

  const nodes: Record<string, ChatNode> = {};
  for (const node of Object.values(map.nodes)) {
    const positioned = graph.node(node.id) as { x?: number; y?: number } | undefined;
    nodes[node.id] = {
      ...node,
      position: {
        x: Math.round((positioned?.x ?? node.position.x) - NODE_WIDTH / 2),
        y: Math.round((positioned?.y ?? node.position.y) - NODE_HEIGHT / 2),
      },
    };
  }

  return {
    ...map,
    nodes,
  };
}

import { DEFAULT_MAP_TITLE, UNTITLED_NODE_TITLE } from "../constants";
import type { ChatMap, ChatMessage, ChatNode, NodeId } from "../types";
import { createId, nowIso } from "../utils/id";
import { cleanText, truncateText } from "../utils/text";

export function createRootMap(title = DEFAULT_MAP_TITLE, rootTitle = "Root question"): ChatMap {
  const createdAt = nowIso();
  const rootNode = createNode({
    title: rootTitle,
    position: { x: 0, y: 0 },
  });

  rootNode.createdAt = createdAt;
  rootNode.updatedAt = createdAt;

  return {
    id: createId("map"),
    title,
    rootNodeId: rootNode.id,
    nodes: {
      [rootNode.id]: rootNode,
    },
    edges: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function createNode(input: {
  parentId?: NodeId;
  title?: string;
  anchorText?: string;
  position?: { x: number; y: number };
  messages?: ChatMessage[];
}): ChatNode {
  const createdAt = nowIso();
  const anchorTitle = input.anchorText ? truncateText(input.anchorText, 72) : undefined;

  return {
    id: createId("node"),
    parentId: input.parentId,
    title: input.title ?? anchorTitle ?? UNTITLED_NODE_TITLE,
    anchorText: input.anchorText ? cleanText(input.anchorText) : undefined,
    messages: input.messages ?? [],
    status: "open",
    position: input.position ?? { x: 0, y: 0 },
    children: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: createId("msg"),
    role,
    content,
    createdAt: nowIso(),
  };
}

export function addChildNode(
  map: ChatMap,
  parentId: NodeId,
  options: {
    anchorText?: string;
    title?: string;
  } = {},
): { map: ChatMap; child: ChatNode } {
  const parent = map.nodes[parentId];
  if (!parent) {
    throw new Error(`Cannot create child node. Parent does not exist: ${parentId}`);
  }

  const siblingIndex = parent.children.length;
  const child = createNode({
    parentId,
    title: options.title,
    anchorText: options.anchorText,
    position: {
      x: parent.position.x + 360,
      y: parent.position.y + siblingIndex * 180 - Math.max(0, parent.children.length - 1) * 70,
    },
  });

  const updatedParent: ChatNode = {
    ...parent,
    children: [...parent.children, child.id],
    updatedAt: nowIso(),
  };

  const nextMap: ChatMap = {
    ...map,
    nodes: {
      ...map.nodes,
      [parentId]: updatedParent,
      [child.id]: child,
    },
    edges: [
      ...map.edges,
      {
        id: `edge_${parentId}_${child.id}`,
        from: parentId,
        to: child.id,
      },
    ],
    updatedAt: nowIso(),
  };

  return { map: nextMap, child };
}

export function appendMessage(map: ChatMap, nodeId: NodeId, message: ChatMessage): ChatMap {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new Error(`Cannot append message. Node does not exist: ${nodeId}`);
  }

  return updateNode(map, nodeId, {
    messages: [...node.messages, message],
  });
}

export function updateNode(
  map: ChatMap,
  nodeId: NodeId,
  patch: Partial<Omit<ChatNode, "id" | "createdAt">>,
): ChatMap {
  const node = map.nodes[nodeId];
  if (!node) {
    throw new Error(`Cannot update node. Node does not exist: ${nodeId}`);
  }

  return {
    ...map,
    nodes: {
      ...map.nodes,
      [nodeId]: {
        ...node,
        ...patch,
        updatedAt: nowIso(),
      },
    },
    updatedAt: nowIso(),
  };
}

export function updateMapTitle(map: ChatMap, title: string): ChatMap {
  const cleanTitle = cleanText(title).trim();
  if (!cleanTitle) {
    return map;
  }

  return {
    ...map,
    title: cleanTitle,
    updatedAt: nowIso(),
  };
}

export function getAncestorPath(map: ChatMap, nodeId: NodeId): ChatNode[] {
  const path: ChatNode[] = [];
  let cursor: NodeId | undefined = nodeId;

  while (cursor) {
    const node: ChatNode | undefined = map.nodes[cursor];
    if (!node) {
      break;
    }

    path.unshift(node);
    cursor = node.parentId;
  }

  return path;
}

export function walkTree(map: ChatMap, startId = map.rootNodeId): ChatNode[] {
  const start = map.nodes[startId];
  if (!start) {
    return [];
  }

  const result: ChatNode[] = [];
  const visit = (node: ChatNode): void => {
    result.push(node);
    for (const childId of node.children) {
      const child = map.nodes[childId];
      if (child) {
        visit(child);
      }
    }
  };

  visit(start);
  return result;
}

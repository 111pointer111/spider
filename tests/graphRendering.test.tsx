// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import type { ReactNode } from "react";
import { BranchChatMapApp } from "../src/ui/BranchChatMapApp";
import { OpenAICompatibleProvider } from "../src/ai/openAICompatibleProvider";
import { addChildNode, createRootMap } from "../src/domain/chatMap";
import { createDefaultSettings } from "../src/settingsDefaults";
import { ViewState } from "../src/state/viewState";
import type BranchChatMapPlugin from "../src/main";
import type { ChatNode, NodeId } from "../src/types";

type ProbeNode = Node<{
  node: ChatNode;
  active: boolean;
  onNoteChange(id: NodeId, value: string): void;
  onToggleCollapse(id: NodeId): void;
}>;
interface FlowProps {
  nodes: ProbeNode[];
  edges: Edge[];
  onNodeClick(event: unknown, node: ProbeNode): void;
  onNodeDragStop(event: unknown, node: ProbeNode): void;
}
const probe = vi.hoisted(() => ({ flow: vi.fn<(props: FlowProps) => void>() }));

// Keep the production GraphCanvas and its hooks; replace only the host graph renderer.
vi.mock("@xyflow/react", () => ({
  ReactFlow: (props: FlowProps) => { probe.flow(props); return <div />; },
  ReactFlowProvider: ({ children }: { children: ReactNode }) => children,
  Background: () => null, Controls: () => null, MiniMap: () => null,
  Handle: () => null, NodeToolbar: () => null, useStore: () => null,
  Position: { Left: "left", Right: "right" },
  applyNodeChanges: (_changes: unknown, nodes: ProbeNode[]) => nodes,
}));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function setup() {
  probe.flow.mockClear();
  const root = createRootMap("Rendering check", "Rendering check");
  const { map, child } = addChildNode(root, root.rootNodeId, { title: "Child" });
  const plugin = {
    app: {}, settings: { ...createDefaultSettings("en"), apiKey: "test" },
    subscribeSettings: () => () => {}, getSettingsRevision: () => 0,
    updateSettings: async () => {},
  } as unknown as BranchChatMapPlugin;
  const state = new ViewState(plugin, { saveMap: async () => {} } as never, map);
  render(<BranchChatMapApp plugin={plugin} viewState={state} onController={() => {}}
    setTabTitle={() => {}} onNewSpider={() => {}} onLoadMap={() => {}} />);
  return { state, rootId: root.rootNodeId, childId: child.id };
}

const flow = () => probe.flow.mock.calls.at(-1)![0];
const baselineMeasurement = process.env.SPIDER_RENDER_BASELINE === "1";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("graph rendering isolation", () => {
  it("keeps graph rendering stable across 100 draft changes while navigation, notes, dragging and collapse still update it", () => {
    const { state, rootId, childId } = setup();
    const initialRenders = probe.flow.mock.calls.length;
    for (let index = 0; index < 100; index++) act(() => state.updateDraft(rootId, `draft ${index}`));
    if (baselineMeasurement) console.info("DRAFT_GRAPH_RENDERS", probe.flow.mock.calls.length - initialRenders);
    else expect(probe.flow).toHaveBeenCalledTimes(initialRenders);

    const child = flow().nodes.find((node) => node.id === childId)!;
    act(() => flow().onNodeClick(null, child));
    expect(flow().nodes.find((node) => node.data.active)?.id).toBe(childId);
    expect(flow().edges[0]?.className).toBe("is-path-edge");
    expect(flow().edges[0]?.animated ?? false).toBe(false);
    act(() => child.data.onNoteChange(childId, "My understanding"));
    expect(flow().nodes.find((node) => node.id === childId)?.data.node.note).toBe("My understanding");
    act(() => flow().onNodeDragStop(null, { ...child, position: { x: 123, y: 456 } }));
    expect(flow().nodes.find((node) => node.id === childId)?.position).toEqual({ x: 123, y: 456 });
    act(() => flow().nodes.find((node) => node.id === rootId)!.data.onToggleCollapse(rootId));
    expect(flow().nodes.map((node) => node.id)).toEqual([rootId]);
  });

  it("does not rebuild the graph for 20 streamed updates but displays the completed answer", async () => {
    vi.useFakeTimers();
    const { state, rootId } = setup();
    const tokens = Array.from({ length: 20 }, () => ({ emitted: deferred(), next: deferred() }));
    vi.spyOn(OpenAICompatibleProvider.prototype, "streamChat").mockImplementation(async function* () {
      for (const token of tokens) {
        yield "word ";
        token.emitted.resolve();
        await token.next.promise;
      }
    });
    vi.spyOn(OpenAICompatibleProvider.prototype, "titleNode").mockResolvedValue("Rendering check");
    act(() => state.updateDraft(rootId, "Question"));
    let sending!: Promise<void>;
    await act(async () => { sending = state.sendMessage(); await tokens[0]!.emitted.promise; });
    const baseline = probe.flow.mock.calls.length;
    for (let index = 0; index < tokens.length; index++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(33); });
      if (!baselineMeasurement) expect(probe.flow).toHaveBeenCalledTimes(baseline);
      expect(state.getSnapshot().streamingMessages[rootId]?.content).toBe("word ".repeat(index + 1));
      await act(async () => {
        tokens[index]!.next.resolve();
        if (index + 1 < tokens.length) await tokens[index + 1]!.emitted.promise;
        else {
          if (baselineMeasurement) console.info("STREAM_GRAPH_RENDERS", probe.flow.mock.calls.length - baseline);
          await sending;
        }
      });
    }
    expect(state.getSnapshot().map?.nodes[rootId]?.messages.at(-1)?.content).toBe("word ".repeat(20));
    expect(probe.flow.mock.calls.length).toBeGreaterThan(baseline);
  });
});

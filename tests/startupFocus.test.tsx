// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { App, WorkspaceLeaf } from "obsidian";
import BranchChatMapPlugin from "../src/main";
import { BranchChatMapView } from "../src/view";
import { NodeDetails } from "../src/ui/NodeDetails";
import { createNode } from "../src/domain/chatMap";
import { VIEW_TYPE_BRANCH_CHAT_MAP, VIEW_TYPE_BRANCH_CHAT_MAP_CHAT } from "../src/constants";
import manifest from "../manifest.json";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function pluginFixture(existingSidebar = true) {
  let ready!: () => void;
  const rootSplit = {};
  const rightSplit = { expand: vi.fn() };
  const mainLeaf = { parent: rootSplit } as unknown as WorkspaceLeaf;
  const sideLeaf = { parent: rightSplit, detach: vi.fn() } as unknown as WorkspaceLeaf;
  const workspace = {
    rootSplit, rightSplit, leftSplit: {},
    onLayoutReady: (callback: () => void) => { ready = callback; },
    getActiveViewOfType: () => graph,
    getLeavesOfType: (type: string) => type === VIEW_TYPE_BRANCH_CHAT_MAP ? [mainLeaf]
      : type === VIEW_TYPE_BRANCH_CHAT_MAP_CHAT && existingSidebar ? [sideLeaf] : [],
    detachLeavesOfType: vi.fn(), revealLeaf: vi.fn(async (_leaf: WorkspaceLeaf) => {}),
    ensureSideLeaf: vi.fn(async () => sideLeaf),
  };
  const app = { workspace } as unknown as App;
  const plugin = new BranchChatMapPlugin(app, manifest);
  Object.assign(plugin, { app, manifest,
    registerView: vi.fn(), addCommand: vi.fn(), addSettingTab: vi.fn(),
    addRibbonIcon: () => document.createElement("button"),
  });
  vi.spyOn(plugin, "loadSettings").mockResolvedValue();
  const graph = new BranchChatMapView(mainLeaf, plugin);
  Object.assign(graph, { leaf: mainLeaf });
  Object.assign(mainLeaf, { view: graph });
  const activate = vi.spyOn(graph, "activateSession").mockImplementation(() => {});
  return { plugin, workspace, mainLeaf, sideLeaf, activate, ready: () => ready() };
}

describe("startup window focus", () => {
  it.each([true, false])("restores a sidebar without expanding or revealing windows (sidebar exists: %s)", async (exists) => {
    const fixture = pluginFixture(exists);
    await fixture.plugin.onload();
    fixture.ready();
    await waitFor(() => expect(fixture.activate).toHaveBeenCalled());
    expect(fixture.workspace.revealLeaf).not.toHaveBeenCalled();
    expect(fixture.workspace.rightSplit.expand).not.toHaveBeenCalled();
    if (!exists) expect(fixture.workspace.ensureSideLeaf).toHaveBeenCalledWith(
      VIEW_TYPE_BRANCH_CHAT_MAP_CHAT, "right", { active: false, reveal: false, split: false },
    );
  });

  it("still reveals the main view and sidebar when the user explicitly opens Spider", async () => {
    const fixture = pluginFixture();
    await fixture.plugin.onload();
    await fixture.plugin.activateView();
    expect(fixture.workspace.revealLeaf.mock.calls.map((call) => call[0])).toEqual([fixture.mainLeaf, fixture.sideLeaf]);
    expect(fixture.workspace.rightSplit.expand).toHaveBeenCalledOnce();
  });
});

function details(focusToken: number): ComponentProps<typeof NodeDetails> {
  const node = createNode({ title: "Empty question" });
  const noop = () => {};
  return {
    app: {} as App, mapId: "focus-check", mapTitle: "Focus check", node, path: [node],
    draft: "", error: null, errorDetails: null, focusToken,
    isPending: false, canUseAi: true, tabBranchEnabled: true, language: "en", onboardingVariant: null,
    onCancel: noop, onCreateChild: noop, onSaveSelection: noop, onNoteChange: noop,
    onDeleteNode: noop, onDismissOnboarding: noop, onDraftChange: noop, onGoParent: noop,
    onMarkUnderstood: noop, onOpenSettings: noop, onRevealNode: noop, onRetry: noop,
    onSend: noop, onSummarize: noop, onStatusChange: noop, onTitleChange: noop,
  };
}

describe("composer focus intent", () => {
  it.each([
    { token: 0, focused: true, visible: true },
    { token: 1, focused: false, visible: true },
    { token: 1, focused: true, visible: false },
  ])(
    "does not autofocus a restored, background or hidden view (%j)", ({ token, focused, visible }) => {
      vi.spyOn(document, "hasFocus").mockReturnValue(focused);
      vi.spyOn(HTMLTextAreaElement.prototype, "getClientRects").mockReturnValue(
        (visible ? [new DOMRect(0, 0, 300, 90)] : []) as unknown as DOMRectList,
      );
      const focus = vi.spyOn(HTMLTextAreaElement.prototype, "focus");
      render(<NodeDetails {...details(token)} />);
      expect(focus).not.toHaveBeenCalled();
    },
  );

  it("focuses a visible, explicitly requested empty composer without scrolling the window", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    vi.spyOn(HTMLTextAreaElement.prototype, "getClientRects").mockReturnValue([new DOMRect(0, 0, 300, 90)] as unknown as DOMRectList);
    const focus = vi.spyOn(HTMLTextAreaElement.prototype, "focus");
    render(<NodeDetails {...details(1)} />);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});

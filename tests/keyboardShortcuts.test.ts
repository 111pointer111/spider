import { describe, expect, it } from "vitest";
import {
  getSelectionInside,
  shouldCreateBranchFromTab,
  shouldHandleCanvasNavigation,
  shouldHandleViewKeydown,
  shouldGoToParentFromShiftTab,
  shouldSaveSelectionFromEnter,
} from "../src/ui/keyboardShortcuts";

function createTarget(matches: string[] = []): EventTarget {
  return {
    closest(selector: string): object | null {
      return matches.some((match) => selector.includes(match)) ? {} : null;
    },
  } as unknown as EventTarget;
}

function createEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: "Tab",
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    target: createTarget(),
    ...overrides,
  } as KeyboardEvent;
}

describe("Spider keyboard shortcut scope", () => {
  it("saves selected answers with Enter while preserving native controls and modifiers", () => {
    expect(shouldSaveSelectionFromEnter(createEvent({ key: "Enter" }), true)).toBe(true);
    expect(shouldSaveSelectionFromEnter(createEvent({ key: "Enter" }), false)).toBe(false);
    expect(shouldSaveSelectionFromEnter(createEvent(), true)).toBe(false);
    for (const control of ["button", "input", "textarea", "select", "contenteditable", "a[href]"]) {
      expect(shouldSaveSelectionFromEnter(createEvent({ key: "Enter", target: createTarget([control]) }), true)).toBe(false);
    }
    for (const modifier of ["shiftKey", "metaKey", "ctrlKey", "altKey", "isComposing", "defaultPrevented"] as const) {
      expect(shouldSaveSelectionFromEnter(createEvent({ key: "Enter", [modifier]: true }), true)).toBe(false);
    }
  });
  it("keeps Tab available for standard interactive controls", () => {
    expect(shouldCreateBranchFromTab(createEvent({ target: createTarget(["button"]) }), true, true)).toBe(false);
    expect(shouldCreateBranchFromTab(createEvent({ target: createTarget(["textarea"]) }), true, true)).toBe(false);
  });

  it("creates a branch for selected message text or a focused canvas", () => {
    expect(shouldCreateBranchFromTab(createEvent(), true, true)).toBe(true);
    expect(shouldCreateBranchFromTab(createEvent({ target: createTarget(["data-spider-canvas"]) }), true, false)).toBe(true);
    expect(shouldCreateBranchFromTab(createEvent(), true, false)).toBe(false);
  });

  it("respects disabled shortcuts, modifiers, IME, and an already handled event", () => {
    expect(shouldCreateBranchFromTab(createEvent(), false, true)).toBe(false);
    for (const modifier of ["shiftKey", "metaKey", "ctrlKey", "altKey", "isComposing", "defaultPrevented"] as const) {
      expect(shouldCreateBranchFromTab(createEvent({ [modifier]: true }), true, true)).toBe(false);
    }
  });

  it("limits Shift+Tab and arrow navigation to the canvas", () => {
    const canvasTarget = createTarget(["data-spider-canvas"]);
    expect(shouldGoToParentFromShiftTab(createEvent({ shiftKey: true, target: canvasTarget }), true)).toBe(true);
    expect(shouldGoToParentFromShiftTab(createEvent({ shiftKey: true }), true)).toBe(false);
    expect(shouldHandleCanvasNavigation(createEvent({ key: "ArrowRight", target: canvasTarget }))).toBe(true);
    expect(shouldHandleCanvasNavigation(createEvent({ key: "Delete", target: createTarget(["select"]) }))).toBe(false);
  });
});

describe("Spider selection keyboard routing", () => {
  function selectionInView() {
    const message = createTarget();
    const selection = {
      rangeCount: 1,
      getRangeAt: () => ({ commonAncestorContainer: message }),
      toString: () => "  自注意力机制  ",
    };
    const doc = {
      activeElement: null,
      body: createTarget(),
      documentElement: createTarget(),
      getSelection: () => selection,
    };
    const root = {
      ownerDocument: doc,
      contains: (target: unknown) => target === message,
    } as unknown as HTMLElement;
    return { root, doc, message, selection };
  }

  it("routes body-targeted Tab to the selected answer's view", () => {
    const { root, doc } = selectionInView();
    const event = createEvent({ target: doc.body });
    expect(getSelectionInside(root)).toBe("自注意力机制");
    expect(shouldHandleViewKeydown(event, root)).toBe(true);
    expect(shouldHandleViewKeydown(createEvent({ target: doc.body, key: "Enter" }), root)).toBe(true);
    expect(shouldCreateBranchFromTab(event, true, Boolean(getSelectionInside(root)))).toBe(true);
    expect(shouldHandleViewKeydown(createEvent({ target: doc.body, key: "ArrowDown" }), root)).toBe(false);
  });

  it("does not steal Tab from another view or handle it twice", () => {
    const { root, doc, message, selection } = selectionInView();
    expect(shouldHandleViewKeydown(createEvent({ target: createTarget(["button"]) }), root)).toBe(false);
    expect(shouldHandleViewKeydown(createEvent({ target: createTarget(["data-spider-canvas"]) }), root)).toBe(false);
    expect(shouldHandleViewKeydown(createEvent({ target: doc.body, defaultPrevented: true }), root)).toBe(false);
    selection.getRangeAt = () => ({ commonAncestorContainer: createTarget() });
    expect(getSelectionInside(root)).toBeUndefined();
    expect(shouldHandleViewKeydown(createEvent({ target: doc.body }), root)).toBe(false);
    expect(shouldHandleViewKeydown(createEvent({ target: message }), root)).toBe(true);
  });

  it("leaves normal Tab alone when there is no selected text", () => {
    const { root, doc, selection } = selectionInView();
    selection.rangeCount = 0;
    expect(shouldHandleViewKeydown(createEvent({ target: doc.body }), root)).toBe(false);
    selection.rangeCount = 1;
    selection.toString = () => "  ";
    expect(getSelectionInside(root)).toBeUndefined();
    expect(getSelectionInside(null)).toBeUndefined();
  });
});

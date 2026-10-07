const INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a[href]",
  "[contenteditable='true']",
  "[role='button']",
  "[role='menuitem']",
  "[role='option']",
  "[data-spider-note-editor='true']",
].join(", ");

const CANVAS_SELECTOR = "[data-spider-canvas='true']";

function hasClosest(target: EventTarget | null): target is EventTarget & { closest(selector: string): Element | null } {
  return typeof target === "object"
    && target !== null
    && "closest" in target
    && typeof target.closest === "function";
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return hasClosest(target) && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

function isCanvasTarget(target: EventTarget | null): boolean {
  return hasClosest(target) && Boolean(target.closest(CANVAS_SELECTOR));
}

function hasUnsupportedModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey || event.altKey;
}

export function getSelectionInside(root: HTMLElement | null): string | undefined {
  if (!root) return undefined;

  const doc = root.ownerDocument;
  const active = doc.activeElement;
  if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT") && root.contains(active)) {
    const input = active as HTMLInputElement | HTMLTextAreaElement;
    return input.value.substring(input.selectionStart ?? 0, input.selectionEnd ?? 0).trim() || undefined;
  }

  const selection = doc.getSelection();
  if (!selection?.rangeCount || !root.contains(selection.getRangeAt(0).commonAncestorContainer)) {
    return undefined;
  }
  return selection.toString().trim() || undefined;
}

export function shouldHandleViewKeydown(event: KeyboardEvent, root: HTMLElement): boolean {
  if (event.defaultPrevented) return false;
  const doc = root.ownerDocument;
  const isDocumentTarget = event.target === doc || event.target === doc.body || event.target === doc.documentElement;
  // Selecting non-focusable answer text can leave keyboard focus on the document body.
  return root.contains(event.target as Node | null)
    || (isDocumentTarget && (event.key === "Tab" || event.key === "Enter") && Boolean(getSelectionInside(root)));
}

export function shouldSaveSelectionFromEnter(event: KeyboardEvent, hasMessageSelection: boolean): boolean {
  return hasMessageSelection && event.key === "Enter" && !event.defaultPrevented && !event.isComposing
    && !event.shiftKey && !hasUnsupportedModifier(event) && !isInteractiveTarget(event.target);
}

export function shouldCreateBranchFromTab(event: KeyboardEvent, enabled: boolean, hasSelection: boolean): boolean {
  if (!enabled || event.defaultPrevented || event.isComposing || event.key !== "Tab" || event.shiftKey || hasUnsupportedModifier(event) || isInteractiveTarget(event.target)) {
    return false;
  }
  return hasSelection || isCanvasTarget(event.target);
}

export function shouldGoToParentFromShiftTab(event: KeyboardEvent, enabled: boolean): boolean {
  return enabled
    && event.key === "Tab"
    && event.shiftKey
    && !hasUnsupportedModifier(event)
    && !isInteractiveTarget(event.target)
    && isCanvasTarget(event.target);
}

export function shouldHandleCanvasNavigation(event: KeyboardEvent): boolean {
  if (isInteractiveTarget(event.target) || !isCanvasTarget(event.target)) {
    return false;
  }
  return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Delete", "Backspace"].includes(event.key);
}

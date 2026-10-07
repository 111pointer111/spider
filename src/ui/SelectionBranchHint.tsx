import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { AppLanguage, BranchSource } from "../types";
import { t } from "../i18n";
import { getMessageSelection } from "./messageSelection";

interface SelectionBranchHintProps {
  rootRef: RefObject<HTMLElement | null>;
  nodeId: string;
  enabled: boolean;
  language: AppLanguage;
  onCreateChild(text?: string, source?: BranchSource): void;
  onSaveSelection(text: string): void;
}

export function SelectionBranchHint({ rootRef, nodeId, enabled, language, onCreateChild, onSaveSelection }: SelectionBranchHintProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState<{ nodeId: string; text: string; source: BranchSource; left: number; top: number; width: number; doc: Document } | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) { setHint(null); return; }
    let unbind = () => {};
    const bind = () => {
      unbind();
      const doc = root.ownerDocument;
      const win = doc.defaultView;
      if (!win) return;
      let frame: number | undefined;
      const update = () => {
        frame = undefined;
        const selection = getMessageSelection(root);
        if (!selection) { setHint(null); return; }
        const bounds = root.getBoundingClientRect();
        const visible = [...selection.range.getClientRects()].filter((rect) => rect.height && rect.bottom > bounds.top && rect.top < bounds.bottom);
        const rect = visible.at(-1);
        if (!rect) { setHint(null); return; }
        const width = Math.max(0, Math.min(340, bounds.width - 16, win.innerWidth - 16));
        const height = buttonRef.current?.offsetHeight ?? (enabled && width < 300 ? 80 : 44);
        const lower = Math.min(bounds.bottom, win.innerHeight) - height - 8;
        const top = rect.bottom + 8 <= lower ? rect.bottom + 8 : rect.top - height - 8;
        setHint({
          nodeId, text: selection.text, source: selection.source, doc, width,
          left: Math.max(bounds.left + 8, Math.min(rect.left, bounds.right - width - 8, win.innerWidth - width - 8)),
          top: Math.max(8, bounds.top + 8, Math.min(top, lower)),
        });
      };
      const schedule = () => { frame ??= win.requestAnimationFrame(update); };
      const dismiss = (event: KeyboardEvent) => {
        if (event.key === "Escape" && getMessageSelection(root)) {
          doc.getSelection()?.removeAllRanges();
          setHint(null);
        }
      };
      doc.addEventListener("selectionchange", schedule);
      doc.addEventListener("focusin", schedule);
      doc.addEventListener("keydown", dismiss);
      doc.addEventListener("scroll", schedule, true);
      win.addEventListener("resize", schedule);
      schedule();
      unbind = () => {
        if (frame !== undefined) win.cancelAnimationFrame(frame);
        doc.removeEventListener("selectionchange", schedule);
        doc.removeEventListener("focusin", schedule);
        doc.removeEventListener("keydown", dismiss);
        doc.removeEventListener("scroll", schedule, true);
        win.removeEventListener("resize", schedule);
      };
    };
    bind();
    const view = root.closest<HTMLElement>(".spider-chat-view");
    const offMigration = view?.onWindowMigrated?.(bind);
    return () => { unbind(); offMigration?.(); };
  }, [enabled, nodeId, rootRef]);

  if (!hint || hint.nodeId !== nodeId) return null;
  return createPortal(
    <div
      ref={buttonRef}
      className="bcm-selection-actions"
      style={{ left: hint.left, top: hint.top, maxWidth: hint.width }}
      onPointerDown={(event) => event.preventDefault()}
    >
      {enabled ? <button
        type="button"
        className="bcm-selection-branch-hint"
        onClick={() => {
          onCreateChild(hint.text, hint.source);
          hint.doc.getSelection()?.removeAllRanges();
          setHint(null);
        }}
      ><kbd>Tab</kbd> {t(language, "newChild")}</button> : null}
      <button type="button" className="bcm-selection-note-hint" onClick={() => {
        onSaveSelection(hint.text);
        hint.doc.getSelection()?.removeAllRanges();
        setHint(null);
      }}><kbd>Enter</kbd> {t(language, "saveSelection")}</button>
    </div>,
    hint.doc.body,
  );
}

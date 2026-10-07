import { useEffect, useRef, useState } from "react";
import type { AppLanguage } from "../types";
import { t } from "../i18n";

interface NodeNotesProps {
  note?: string;
  language: AppLanguage;
  onChange(value: string): void;
}

/** Keep a local draft so trimming persisted Markdown doesn't interrupt typing. */
export function NodeNotes({ note, language, onChange }: NodeNotesProps) {
  const [draft, setDraft] = useState(note ?? "");
  const draftRef = useRef(draft);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useRef(onChange);
  save.current = onChange;

  const flush = () => {
    clearTimeout(timer.current);
    if (dirty.current) {
      dirty.current = false;
      save.current(draftRef.current);
    }
  };

  useEffect(() => {
    const persistedDraft = draftRef.current.trim() ? draftRef.current.trimEnd() : "";
    if (!dirty.current && (note ?? "") !== persistedDraft) {
      draftRef.current = note ?? "";
      setDraft(note ?? "");
    }
  }, [note]);

  useEffect(() => () => {
    clearTimeout(timer.current);
    if (dirty.current) save.current(draftRef.current);
  }, []);

  return <details className="bcm-inline-notes">
    <summary>{t(language, "nodeNote")}{draft.trim() ? " · ●" : ""}</summary>
    <p>{t(language, "notesHint")}</p>
    <textarea
      data-spider-note-editor="true"
      aria-label={t(language, "nodeNote")}
      placeholder={t(language, "nodeNotePlaceholder")}
      value={draft}
      onBlur={flush}
      onChange={(event) => {
        const value = event.currentTarget.value;
        draftRef.current = value;
        dirty.current = true;
        setDraft(value);
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, 400);
      }}
    />
  </details>;
}

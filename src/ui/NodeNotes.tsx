import { useEffect, useRef, useState } from "react";
import type { App } from "obsidian";
import type { AppLanguage } from "../types";
import { t } from "../i18n";
import { markdownToPlainText, truncateText } from "../utils/text";
import { MarkdownContent } from "./MarkdownContent";

interface NodeNotesProps {
  app: App;
  sourcePath: string;
  note?: string;
  language: AppLanguage;
  onChange(value: string): void;
}

/** Keep a local draft so trimming persisted Markdown doesn't interrupt typing. */
export function NodeNotes({ app, sourcePath, note, language, onChange }: NodeNotesProps) {
  const [draft, setDraft] = useState(note ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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
      setSaving(false);
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

  const hasNote = Boolean(draft.trim());
  const preview = hasNote ? truncateText(markdownToPlainText(draft), 180) : "";

  return <details className="bcm-inline-notes">
    <summary>
      <span className="bcm-inline-notes-title">{t(language, "nodeNote")}</span>
      {preview ? <span className="bcm-inline-notes-snippet">{preview}</span> : null}
    </summary>
    <div className="bcm-inline-notes-tools">
      <span>{t(language, "notesHint")}</span>
      {hasNote ? <button type="button" onClick={() => {
        flush();
        setEditing(!editing);
      }}>{t(language, editing ? "previewNote" : "editNodeNote")}</button> : null}
    </div>
    {editing || !hasNote ? <textarea
      autoFocus={editing}
      data-spider-note-editor="true"
      aria-label={t(language, "nodeNote")}
      placeholder={t(language, "nodeNotePlaceholder")}
      value={draft}
      onBlur={flush}
      onChange={(event) => {
        const value = event.currentTarget.value;
        setEditing(true);
        draftRef.current = value;
        dirty.current = true;
        setSaving(true);
        setDraft(value);
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, 400);
      }}
    /> : <MarkdownContent app={app} markdown={draft} sourcePath={sourcePath} className="bcm-inline-notes-preview markdown-rendered" />}
    <div className="bcm-node-note-save-state" role="status">{saving ? t(language, "noteSaving") : hasNote ? t(language, "noteSaved") : ""}</div>
  </details>;
}

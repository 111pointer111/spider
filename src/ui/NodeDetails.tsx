import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import type { App } from "obsidian";
import { displayTitle, nodeStatsLabel, roleLabel, t } from "../i18n";
import type { AppLanguage, BranchSource, ChatMessage, ChatNode, ChatNodeStatus, NodeId } from "../types";
import { MarkdownContent } from "./MarkdownContent";
import { OnboardingCard } from "./OnboardingCard";
import type { OnboardingGuideVariant } from "./onboarding";
import { useReadingPosition } from "./useReadingPosition";
import { SelectionBranchHint } from "./SelectionBranchHint";
import { NodeNotes } from "./NodeNotes";

interface NodeDetailsProps {
  app: App;
  mapId: string;
  mapTitle: string;
  node: ChatNode;
  parent?: ChatNode;
  path: ChatNode[];
  draft: string;
  error: string | null;
  errorDetails: string | null;
  focusToken: number;
  isPending: boolean;
  canUseAi: boolean;
  tabBranchEnabled: boolean;
  language: AppLanguage;
  onboardingVariant: OnboardingGuideVariant | null;
  streamingMessage?: ChatMessage;
  onCancel(this: void): void;
  onCreateChild(this: void, anchorText?: string, source?: BranchSource): void;
  onSaveSelection(this: void, text: string): void;
  onNoteChange(this: void, value: string): void;
  onDeleteNode(this: void, nodeId: NodeId): void;
  onDismissOnboarding(this: void): void;
  onDraftChange(this: void, value: string): void;
  onGoParent(this: void): void;
  onMarkUnderstood(this: void): void;
  onOpenSettings(this: void): void;
  onRevealNode(this: void, nodeId: NodeId): void;
  onRetry(this: void): void;
  onSend(this: void): void;
  onSummarize(this: void): void;
  onStatusChange(this: void, status: ChatNodeStatus): void;
  onTitleChange(this: void, title: string): void;
}

function isImeComposing(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

function ScrollJumpIcon({ direction }: { direction: "up" | "down" }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      className={direction === "down" ? "is-down" : undefined}
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
    >
      <path d="m5 11 7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m5 18 7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NodeDetails({
  app,
  mapId,
  mapTitle,
  node,
  parent,
  path,
  draft,
  error,
  errorDetails,
  focusToken,
  isPending,
  canUseAi,
  tabBranchEnabled,
  language,
  onboardingVariant,
  streamingMessage,
  onCancel,
  onCreateChild,
  onSaveSelection,
  onNoteChange,
  onDeleteNode,
  onDismissOnboarding,
  onDraftChange,
  onGoParent,
  onMarkUnderstood,
  onOpenSettings,
  onRevealNode,
  onRetry,
  onSend,
  onSummarize,
  onStatusChange,
  onTitleChange,
}: NodeDetailsProps): ReactElement {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { scrollRef, onScroll, onRendered: handleMarkdownRendered, scrollToBottom, scrollToTop, showScrollTop, showScrollBottom, highlightName } = useReadingPosition(mapId, node, path);
  const [titleDraft, setTitleDraft] = useState(displayTitle(language, node.title));
  const sourcePath = `spider/${node.id}.md`;
  const pendingMessage = streamingMessage?.content && !node.messages.some((message) => message.id === streamingMessage.id)
    ? streamingMessage
    : undefined;
  const messages = pendingMessage ? [...node.messages, pendingMessage] : node.messages;

  const commitTitle = useCallback(() => {
    const nextTitle = titleDraft.trim();
    if (nextTitle && nextTitle !== node.title) {
      onTitleChange(nextTitle);
    } else {
      setTitleDraft(displayTitle(language, node.title));
    }
  }, [language, node.title, onTitleChange, titleDraft]);

  useEffect(() => {
    setTitleDraft(displayTitle(language, node.title));
  }, [language, node.id, node.title]);

  useEffect(() => {
    if (node.messages.length === 0) {
      inputRef.current?.focus();
    }
  }, [node.id]);

  return (
    <aside className="bcm-detail">
      <style>{`::highlight(${highlightName}) { background-color: var(--text-highlight-bg, #ffe28a); color: var(--text-normal, #202124); }`}</style>
      <header className="bcm-context-header">
        <div className="bcm-map-context">
          <span className="bcm-context-label">{t(language, "mapNameLabel")}</span>
          <span className="bcm-map-title">{displayTitle(language, mapTitle)}</span>
        </div>
        <div className="bcm-context-current" title={t(language, "currentNodeLabel")}>
          {displayTitle(language, node.title)}
        </div>
        {path.length > 1 ? (
          <nav className="bcm-path" aria-label={t(language, "explorationPath")}>
            <span className="bcm-context-label">{t(language, "explorationPath")}</span>
            <div className="bcm-breadcrumbs">
              {path.slice(0, -1).map((item, index) => (
                <span className="bcm-breadcrumb-part" key={item.id}>
                  {index > 0 ? <span className="bcm-path-sep">/</span> : null}
                  <button className="bcm-breadcrumb-button" type="button" onClick={() => onRevealNode(item.id)}>
                    {displayTitle(language, item.title)}
                  </button>
                </span>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <div className="bcm-message-area">
        <div className="bcm-scroll-area" ref={scrollRef} onScroll={onScroll}>
          <div className="bcm-node-toolbar">
            <div className="bcm-node-toolbar-main">
              <input
                className="bcm-node-title-input"
                value={titleDraft}
                aria-label={t(language, "nodeTitleLabel")}
                onBlur={commitTitle}
                onChange={(e) => setTitleDraft(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              />
              <select
                className={`bcm-status bcm-status-${node.status}`}
                value={node.status}
                onChange={(e) => onStatusChange(e.currentTarget.value as ChatNodeStatus)}
                aria-label={t(language, "nodeStatusLabel")}
              >
                <option value="open">{t(language, "statusOpen")}</option>
                <option value="understood">{t(language, "statusUnderstood")}</option>
                <option value="archived">{t(language, "statusArchived")}</option>
              </select>
            </div>
            <div className="bcm-node-facts">
              {nodeStatsLabel(language, node.messages.length, node.children.length)}
            </div>
          </div>

        {node.anchorText ? (
          <section className="bcm-context-strip bcm-anchor">
            <span>{t(language, "anchor")}</span>
            <div className="bcm-source-hint">{t(language, "selectedSourceHint")}</div>
            <MarkdownContent app={app} markdown={node.anchorText} sourcePath={sourcePath} className="bcm-context-markdown" onRendered={handleMarkdownRendered} />
          </section>
        ) : null}

        {onboardingVariant === "child" ? (
          <OnboardingCard language={language} variant="child" onDismiss={onDismissOnboarding} />
        ) : null}

        {node.summary ? (
          <section className="bcm-context-strip bcm-summary">
            <span>{t(language, "summary")}</span>
            <MarkdownContent app={app} markdown={node.summary} sourcePath={sourcePath} className="bcm-context-markdown" onRendered={handleMarkdownRendered} />
          </section>
        ) : null}

        {messages.length === 0 ? (
          <div className="bcm-empty">
            {t(language, "emptyHint")}
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <article className={`bcm-message bcm-message-${message.role}${message === pendingMessage ? " bcm-message-streaming" : ""}`} data-spider-message-id={message.id} key={message.id}>
                <div className="bcm-message-meta">{message === pendingMessage ? t(language, "streaming") : roleLabel(language, message.role)}</div>
                <div className="bcm-message-content bcm-streaming-content" data-spider-message-body="true">
                  <MarkdownContent app={app} markdown={message.content} sourcePath={sourcePath} className="bcm-message-content markdown-rendered" onRendered={handleMarkdownRendered} />
                  {message === pendingMessage ? <span className="bcm-caret" /> : null}
                </div>
              </article>
            ))}
            {onboardingVariant === "branch" ? (
              <OnboardingCard language={language} variant="branch" onDismiss={onDismissOnboarding} />
            ) : null}
            {onboardingVariant === "done" ? (
              <OnboardingCard language={language} variant="done" onDismiss={onDismissOnboarding} />
            ) : null}
          </>
        )}

        </div>

        <SelectionBranchHint rootRef={scrollRef} nodeId={node.id} enabled={tabBranchEnabled} language={language} onCreateChild={onCreateChild} onSaveSelection={onSaveSelection} />

        {showScrollTop ? (
          <button className="bcm-scroll-jump bcm-scroll-top" type="button" onClick={() => scrollToTop()} aria-label={t(language, "scrollTop")}>
            <ScrollJumpIcon direction="up" />
          </button>
        ) : null}

        {showScrollBottom ? (
          <button className="bcm-scroll-jump bcm-scroll-bottom" type="button" onClick={() => scrollToBottom()} aria-label={t(language, "scrollLatest")}>
            <ScrollJumpIcon direction="down" />
          </button>
        ) : null}
      </div>

      <div className="bcm-detail-footer">
        <NodeNotes key={`${mapId}/${node.id}`} note={node.note} language={language} onChange={onNoteChange} />
        {error ? (
          <div className="bcm-error">
            <span>{error}</span>
            {errorDetails ? (
              <details>
                <summary>{t(language, "details")}</summary>
                <pre>{errorDetails}</pre>
              </details>
            ) : null}
            <button type="button" onClick={onRetry}>{t(language, "retry")}</button>
          </div>
        ) : null}

        <div className="bcm-composer">
          {!canUseAi ? (
            <section className="bcm-provider-setup" aria-labelledby="spider-provider-setup-title">
              <div>
                <div className="bcm-provider-setup-title" id="spider-provider-setup-title">{t(language, "connectAiTitle")}</div>
                <div className="bcm-provider-setup-body">{t(language, "connectAiBody")}</div>
              </div>
              <button type="button" onClick={onOpenSettings}>{t(language, "openSettings")}</button>
            </section>
          ) : onboardingVariant === "ask" ? (
            <OnboardingCard language={language} variant="ask" onDismiss={onDismissOnboarding} />
          ) : null}
          <textarea
            ref={inputRef}
            data-branch-chat-input="true"
            value={draft}
            aria-label={t(language, "composerLabel")}
            placeholder={t(language, "composerPlaceholder")}
            onChange={(e) => onDraftChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isImeComposing(e)) {
                e.preventDefault();
                if (canUseAi) {
                  onSend();
                }
              }
            }}
          />
          <div className="bcm-composer-footer">
            <div className="bcm-detail-actions">
              <button type="button" onClick={() => onCreateChild()} title="Tab">{t(language, "newChild")}</button>
              <button type="button" onClick={onGoParent} disabled={!parent} title="Shift + Tab">{t(language, "parent")}</button>
              <button type="button" onClick={() => onDeleteNode(node.id)} disabled={!parent}>{t(language, "deleteNode")}</button>
              <button type="button" onClick={onSummarize} disabled={!canUseAi} title={!canUseAi ? t(language, "missingApiKey") : undefined}>{t(language, "summarize")}</button>
            </div>
            <div className="bcm-composer-actions">
              {isPending ? (
                <button type="button" onClick={onCancel}>{t(language, "stop")}</button>
              ) : (
                <button type="button" onClick={onSend} disabled={!canUseAi || !draft.trim()}>{t(language, "send")}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

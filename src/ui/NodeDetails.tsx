import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import type { App } from "obsidian";
import { displayTitle, roleLabel, statusLabel, t } from "../i18n";
import type { AppLanguage, ChatNode } from "../types";
import { MarkdownContent } from "./MarkdownContent";

interface NodeDetailsProps {
  app: App;
  node: ChatNode;
  parent?: ChatNode;
  path: ChatNode[];
  draft: string;
  error: string | null;
  focusToken: number;
  isPending: boolean;
  language: AppLanguage;
  streamingContent: string;
  onAutoLayout(): void;
  onCancel(): void;
  onCreateChild(): void;
  onDraftChange(value: string): void;
  onExport(): void;
  onGoParent(): void;
  onMarkUnderstood(): void;
  onRetry(): void;
  onSend(): void;
  onSummarize(): void;
  onTitleChange(title: string): void;
}

export function NodeDetails({
  app,
  node,
  parent,
  path,
  draft,
  error,
  focusToken,
  isPending,
  language,
  streamingContent,
  onAutoLayout,
  onCancel,
  onCreateChild,
  onDraftChange,
  onExport,
  onGoParent,
  onMarkUnderstood,
  onRetry,
  onSend,
  onSummarize,
  onTitleChange,
}: NodeDetailsProps): ReactElement {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [titleDraft, setTitleDraft] = useState(displayTitle(language, node.title));
  const sourcePath = `spider/${node.id}.md`;
  const scrollToBottomLabel = language === "zh-CN" ? "跳到最新消息" : "Jump to latest message";
  const titleInputLabel = language === "zh-CN" ? "节点标题" : "Node title";

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const messages = messagesRef.current;
    if (!messages) {
      return;
    }

    messages.scrollTo({
      top: messages.scrollHeight,
      behavior,
    });
    stickToBottomRef.current = true;
    setShowScrollToBottom(false);
  }, []);

  const updateScrollState = useCallback(() => {
    const messages = messagesRef.current;
    if (!messages) {
      return;
    }

    const distanceToBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight;
    const isNearBottom = distanceToBottom < 80;
    stickToBottomRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom);
  }, []);

  const handleScrollToBottomClick = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const commitTitle = useCallback(() => {
    const nextTitle = titleDraft.trim();
    if (nextTitle && nextTitle !== node.title) {
      onTitleChange(nextTitle);
    } else {
      setTitleDraft(displayTitle(language, node.title));
    }
  }, [language, node.title, onTitleChange, titleDraft]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusToken, node.id]);

  useEffect(() => {
    setTitleDraft(displayTitle(language, node.title));
  }, [language, node.id, node.title]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => scrollToBottom("auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [node.id, scrollToBottom]);

  useEffect(() => {
    if (!stickToBottomRef.current) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => scrollToBottom(streamingContent ? "auto" : "smooth"));
    return () => window.cancelAnimationFrame(frame);
  }, [node.messages.length, scrollToBottom, streamingContent]);

  return (
    <aside className="bcm-detail">
      <div className="bcm-path">
        {path.map((item, index) => (
          <span key={item.id}>
            {index > 0 ? " / " : ""}
            {displayTitle(language, item.title)}
          </span>
        ))}
      </div>

      <div className="bcm-detail-header">
        <div>
          <div className="bcm-eyebrow">{parent ? t(language, "childOf", { title: displayTitle(language, parent.title) }) : t(language, "rootNode")}</div>
          <input
            aria-label={titleInputLabel}
            className="bcm-node-title-input"
            value={titleDraft}
            onBlur={commitTitle}
            onChange={(event) => setTitleDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
          <div className="bcm-node-facts">{t(language, "nodeStats", { messages: node.messages.length, children: node.children.length })}</div>
        </div>
        <span className={`bcm-status bcm-status-${node.status}`}>{statusLabel(language, node.status)}</span>
      </div>

      {node.anchorText ? (
        <section className="bcm-context-strip bcm-anchor">
          <span>{t(language, "anchor")}</span>
          <MarkdownContent app={app} markdown={node.anchorText} sourcePath={sourcePath} className="bcm-context-markdown" />
        </section>
      ) : null}

      {node.summary ? (
        <section className="bcm-context-strip bcm-summary">
          <span>{t(language, "summary")}</span>
          <MarkdownContent app={app} markdown={node.summary} sourcePath={sourcePath} className="bcm-context-markdown" />
        </section>
      ) : null}

      <div className="bcm-message-area">
        <div className="bcm-messages" aria-label={t(language, "nodeMessages")} onScroll={updateScrollState} ref={messagesRef}>
          {node.messages.length === 0 && !streamingContent ? (
            <div className="bcm-empty">
              {language === "zh-CN" ? (
                <>
                  按 <kbd>Tab</kbd> 创建子节点，或输入问题后按 <kbd>Enter</kbd> 发送。
                </>
              ) : (
                <>
                  Press <kbd>Tab</kbd> to create a child node, or type a question here and press <kbd>Enter</kbd>.
                </>
              )}
            </div>
          ) : (
            <>
              {node.messages.map((message) => (
                <article className={`bcm-message bcm-message-${message.role}`} key={message.id}>
                  <div className="bcm-message-meta">{roleLabel(language, message.role)}</div>
                  <MarkdownContent app={app} markdown={message.content} sourcePath={sourcePath} className="bcm-message-content markdown-rendered" />
                </article>
              ))}
              {streamingContent ? (
                <article className="bcm-message bcm-message-assistant bcm-message-streaming">
                  <div className="bcm-message-meta">{t(language, "streaming")}</div>
                  <div className="bcm-streaming-content">
                    <MarkdownContent app={app} markdown={streamingContent} sourcePath={sourcePath} className="bcm-message-content markdown-rendered" />
                    <span className="bcm-caret" />
                  </div>
                </article>
              ) : null}
            </>
          )}
        </div>

        {showScrollToBottom ? (
          <button className="bcm-scroll-bottom" type="button" aria-label={scrollToBottomLabel} title={scrollToBottomLabel} onClick={handleScrollToBottomClick}>
            ↓
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="bcm-error">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            {t(language, "retry")}
          </button>
        </div>
      ) : null}

      <div className="bcm-composer">
        <textarea
          ref={inputRef}
          data-branch-chat-input="true"
          value={draft}
          placeholder={t(language, "composerPlaceholder")}
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <div className="bcm-composer-footer">
          <div className="bcm-detail-actions">
            <button type="button" onClick={onCreateChild} title="Tab">
              {t(language, "newChild")}
            </button>
            <button type="button" onClick={onGoParent} disabled={!parent} title="Shift + Tab">
              {t(language, "parent")}
            </button>
            <button type="button" onClick={onAutoLayout}>
              {t(language, "autoLayout")}
            </button>
            <button type="button" onClick={onSummarize}>
              {t(language, "summarize")}
            </button>
            <button type="button" onClick={onMarkUnderstood}>
              {t(language, "markUnderstood")}
            </button>
            <button type="button" onClick={onExport}>
              {t(language, "export")}
            </button>
          </div>
          <div className="bcm-composer-actions">
            {isPending ? (
              <button type="button" onClick={onCancel}>
                {t(language, "stop")}
              </button>
            ) : (
              <button type="button" onClick={onSend}>
                {t(language, "send")}
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

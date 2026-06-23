import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import type { App } from "obsidian";
import { displayTitle, roleLabel, statusLabel, t } from "../i18n";
import type { AppLanguage, ChatNode, NodeId } from "../types";
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
  onCancel(): void;
  onCreateChild(): void;
  onDeleteNode(nodeId: NodeId): void;
  onDraftChange(value: string): void;
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
  onCancel,
  onCreateChild,
  onDeleteNode,
  onDraftChange,
  onGoParent,
  onMarkUnderstood,
  onRetry,
  onSend,
  onSummarize,
  onTitleChange,
}: NodeDetailsProps): ReactElement {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [titleDraft, setTitleDraft] = useState(displayTitle(language, node.title));
  const sourcePath = `spider/${node.id}.md`;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    stickToBottomRef.current = true;
    setShowScrollBottom(false);
  }, []);

  const scrollToTop = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior });
  }, []);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const toBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = toBottom < 80;
    setShowScrollTop(el.scrollTop > 60);
    setShowScrollBottom(toBottom > 40);
  }, []);

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
    const frame = window.requestAnimationFrame(() => scrollToBottom("auto"));
    return () => window.cancelAnimationFrame(frame);
  }, [node.id, scrollToBottom]);

  useEffect(() => {
    if (!stickToBottomRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => scrollToBottom(streamingContent ? "auto" : "smooth"));
    return () => window.cancelAnimationFrame(frame);
  }, [node.messages.length, scrollToBottom, streamingContent]);

  useEffect(() => {
    if (node.messages.length === 0) {
      inputRef.current?.focus();
    }
  }, [node.id]);

  return (
    <aside className="bcm-detail">
      {path.length > 1 ? (
        <div className="bcm-path">
          {path.slice(0, -1).map((item, index) => (
            <span key={item.id}>
              {index > 0 ? <span className="bcm-path-sep"> / </span> : null}
              {displayTitle(language, item.title)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="bcm-scroll-area" ref={scrollRef} onScroll={updateScrollState}>
        <div className="bcm-node-card">
          <div className="bcm-node-card-header">
            <input
              className="bcm-node-title-input"
              value={titleDraft}
              onBlur={commitTitle}
              onChange={(e) => setTitleDraft(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            />
            <span className={`bcm-status bcm-status-${node.status}`}>{statusLabel(language, node.status)}</span>
          </div>
          <div className="bcm-node-facts">
            {t(language, "nodeStats", { messages: node.messages.length, children: node.children.length })}
          </div>
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

        {node.messages.length === 0 && !streamingContent ? (
          <div className="bcm-empty">
            {language === "zh-CN" ? (
              <>按 <kbd>Tab</kbd> 创建子节点，或输入问题后按 <kbd>Enter</kbd> 发送。</>
            ) : (
              <>Press <kbd>Tab</kbd> to create a child node, or type a question here and press <kbd>Enter</kbd>.</>
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

        {showScrollTop ? (
          <button className="bcm-scroll-jump bcm-scroll-top" type="button" onClick={() => scrollToTop()} aria-label={language === "zh-CN" ? "回到顶部" : "Scroll to top"}>
            ↑
          </button>
        ) : null}
      </div>

      {showScrollBottom ? (
        <button className="bcm-scroll-jump bcm-scroll-bottom" type="button" onClick={() => scrollToBottom()} aria-label={language === "zh-CN" ? "跳到最新消息" : "Jump to latest"}>
          ↓
        </button>
      ) : null}

      {error ? (
        <div className="bcm-error">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>{t(language, "retry")}</button>
        </div>
      ) : null}

      <div className="bcm-composer">
        <textarea
          ref={inputRef}
          data-branch-chat-input="true"
          value={draft}
          placeholder={t(language, "composerPlaceholder")}
          onChange={(e) => onDraftChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <div className="bcm-composer-footer">
          <div className="bcm-detail-actions">
            <button type="button" onClick={onCreateChild} title="Tab">{t(language, "newChild")}</button>
            <button type="button" onClick={onGoParent} disabled={!parent} title="Shift + Tab">{t(language, "parent")}</button>
            <button type="button" onClick={() => onDeleteNode(node.id)} disabled={!parent}>{t(language, "deleteNode")}</button>
            <button type="button" onClick={onSummarize}>{t(language, "summarize")}</button>
            <button type="button" onClick={onMarkUnderstood}>{t(language, "markUnderstood")}</button>
          </div>
          <div className="bcm-composer-actions">
            {isPending ? (
              <button type="button" onClick={onCancel}>{t(language, "stop")}</button>
            ) : (
              <button type="button" onClick={onSend}>{t(language, "send")}</button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

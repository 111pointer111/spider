import { useEffect, useRef, type ReactElement } from "react";
import { displayTitle, roleLabel, statusLabel, t } from "../i18n";
import type { AppLanguage, ChatNode } from "../types";

interface NodeDetailsProps {
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
}

export function NodeDetails({
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
}: NodeDetailsProps): ReactElement {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusToken, node.id]);

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
          <h2>{displayTitle(language, node.title)}</h2>
          <div className="bcm-node-facts">{t(language, "nodeStats", { messages: node.messages.length, children: node.children.length })}</div>
        </div>
        <span className={`bcm-status bcm-status-${node.status}`}>{statusLabel(language, node.status)}</span>
      </div>

      {node.anchorText ? (
        <blockquote className="bcm-anchor">
          <span>{t(language, "anchor")}</span>
          {node.anchorText}
        </blockquote>
      ) : null}

      {node.summary ? (
        <section className="bcm-summary">
          <span>{t(language, "summary")}</span>
          <p>{node.summary}</p>
        </section>
      ) : null}

      <div className="bcm-messages" aria-label={t(language, "nodeMessages")}>
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
                <div className="bcm-message-content">{message.content}</div>
              </article>
            ))}
            {streamingContent ? (
              <article className="bcm-message bcm-message-assistant bcm-message-streaming">
                <div className="bcm-message-meta">{t(language, "streaming")}</div>
                <div className="bcm-message-content">
                  {streamingContent}
                  <span className="bcm-caret" />
                </div>
              </article>
            ) : null}
          </>
        )}
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

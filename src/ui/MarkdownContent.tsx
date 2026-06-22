import { Component, MarkdownRenderer, type App } from "obsidian";
import { useEffect, useRef, type ReactElement } from "react";

interface MarkdownContentProps {
  app: App;
  markdown: string;
  sourcePath: string;
  className?: string;
}

export function MarkdownContent({ app, markdown, sourcePath, className }: MarkdownContentProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const component = new Component();
    component.load();
    root.replaceChildren();

    void MarkdownRenderer.render(app, markdown, root, sourcePath, component).catch(() => {
      root.textContent = markdown;
    });

    return () => {
      component.unload();
      root.replaceChildren();
    };
  }, [app, markdown, sourcePath]);

  return <div className={className} ref={rootRef} />;
}

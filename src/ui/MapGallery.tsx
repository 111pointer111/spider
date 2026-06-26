import { useEffect, useState, type ReactElement } from "react";
import { Notice } from "obsidian";
import type BranchChatMapPlugin from "../main";
import { displayTitle, t } from "../i18n";
import type { ChatMap, ChatMapId } from "../types";
import { confirmDelete } from "./ConfirmModal";

interface MapGalleryProps {
  plugin: BranchChatMapPlugin;
  onSelectMap(this: void, mapId: ChatMapId): void;
  onNewMap(this: void): void;
}

interface MapEntry {
  map: ChatMap;
}

export function MapGallery({ plugin, onSelectMap, onNewMap }: MapGalleryProps): ReactElement {
  const [entries, setEntries] = useState<MapEntry[]>([]);
  const language = plugin.settings.language;

  const refresh = () => {
    void plugin.store.listAvailableMaps().then((maps) => {
      setEntries(
        [...maps]
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
          .map((map) => ({ map })),
      );
    });
  };

  useEffect(refresh, [plugin.store]);

  const handleDelete = async (e: React.MouseEvent, entry: MapEntry) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await confirmDelete(plugin.app, entry.map.title);
    if (!ok) return;

    try {
      const deleted = await plugin.store.repository.deleteMap(entry.map.id);
      if (deleted) {
        new Notice(language === "zh-CN" ? "图谱已删除" : "Map deleted");
        refresh();
      } else {
        new Notice(language === "zh-CN" ? "未找到该图谱文件" : "Map file not found");
      }
    } catch (deleteError: unknown) {
      const message = deleteError instanceof Error ? deleteError.message : String(deleteError);
      new Notice(language === "zh-CN" ? `删除失败：${message}` : `Delete failed: ${message}`);
    }
  };

  return (
    <div className="bcm-root bcm-root-graph">
      <div className="bcm-topbar">
        <div>
          <div className="bcm-eyebrow">{t(language, "appName")}</div>
          <div className="bcm-title">{t(language, "appName")}</div>
        </div>
      </div>
      <div className="bcm-gallery">
        <div className="bcm-gallery-toolbar">
          <button className="bcm-gallery-new" type="button" onClick={onNewMap}>
            + {t(language, "newMapCommand")}
          </button>
        </div>
        {entries.length === 0 ? (
          <div className="bcm-gallery-empty">
            {language === "zh-CN"
              ? "还没有图谱。点击上方按钮创建一个。"
              : "No maps yet. Create one above."}
          </div>
        ) : (
          <div className="bcm-gallery-grid">
            {entries.map((entry) => {
              const root = entry.map.nodes[entry.map.rootNodeId];
              const firstMsg = root?.messages[0];
              const nodeCount = Object.keys(entry.map.nodes).length;
              const summary = root?.summary || firstMsg?.content;
              return (
                <div
                  key={entry.map.id}
                  className="bcm-gallery-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectMap(entry.map.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") onSelectMap(entry.map.id); }}
                >
                  <div className="bcm-gallery-card-accent" />
                  <div className="bcm-gallery-card-body">
                    <div className="bcm-gallery-card-title">
                      {displayTitle(language, entry.map.title)}
                    </div>
                    {root ? (
                      <div className="bcm-gallery-card-root">
                        <span className="bcm-gallery-card-root-label">
                          {language === "zh-CN" ? "根问题" : "Root"}:
                        </span>
                        {root.title}
                      </div>
                    ) : null}
                    {summary ? (
                      <div className="bcm-gallery-card-message">
                        {summary}
                      </div>
                    ) : (
                      <div className="bcm-gallery-card-empty">
                        {language === "zh-CN" ? "暂无对话" : "No messages yet"}
                      </div>
                    )}
                    <div className="bcm-gallery-card-footer">
                      <span className="bcm-gallery-card-meta">
                        {t(language, "nodesCount", { count: nodeCount })}
                      </span>
                      <span className="bcm-gallery-card-meta">
                        {t(language, "updatedAt", { time: new Date(entry.map.updatedAt).toLocaleString(language) })}
                      </span>
                      <button
                        className="bcm-gallery-card-delete"
                        type="button"
                        onClick={(e) => { void handleDelete(e, entry); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-label={language === "zh-CN" ? "删除" : "Delete"}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

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
      setEntries(maps.map((map) => ({ map })));
    });
  };

  useEffect(refresh, [plugin.store]);

  const handleDelete = async (e: React.MouseEvent, mapId: ChatMapId) => {
    e.stopPropagation();
    const ok = await confirmDelete(plugin.app, mapId);
    if (!ok) return;

    const deleted = await plugin.store.repository.deleteMap(mapId);
    if (deleted) {
      new Notice(language === "zh-CN" ? "图谱已删除" : "Map deleted");
      refresh();
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
                    {firstMsg ? (
                      <div className="bcm-gallery-card-message">
                        {firstMsg.content}
                      </div>
                    ) : (
                      <div className="bcm-gallery-card-empty">
                        {language === "zh-CN" ? "暂无对话" : "No messages yet"}
                      </div>
                    )}
                    <div className="bcm-gallery-card-footer">
                      <span className="bcm-gallery-card-meta">
                        {nodeCount}
                        {language === "zh-CN" ? " 节点" : " nodes"}
                      </span>
                      <button
                        className="bcm-gallery-card-delete"
                        type="button"
                        onClick={(e) => { void handleDelete(e, entry.map.id); }}
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

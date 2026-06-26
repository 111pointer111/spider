import { FuzzySuggestModal, Notice, type FuzzyMatch } from "obsidian";
import type BranchChatMapPlugin from "../main";
import { displayTitle, t } from "../i18n";
import { confirmDelete } from "./ConfirmModal";

interface MapItem {
  id: string;
  title: string;
  nodeCount: number;
  rootTitle: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export class MapSwitcherModal extends FuzzySuggestModal<MapItem> {
  private readonly plugin: BranchChatMapPlugin;
  private items: MapItem[] = [];
  private language: string;

  constructor(plugin: BranchChatMapPlugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.language = plugin.settings.language;
    this.emptyStateText = "No maps found.";
    this.setPlaceholder("Switch spider map...");
    this.limit = 999;
  }

  async loadMaps(): Promise<void> {
    const openMaps = this.plugin.store.getOpenMaps();
    const activeId = this.plugin.store.getActiveSession()?.getLoadedMapId() ?? null;

    const available = await this.plugin.store.listAvailableMaps();
    const seen = new Set<string>();
    const result: MapItem[] = [];

    for (const map of available) {
      if (seen.has(map.id)) continue;
      seen.add(map.id);
      const root = map.nodes[map.rootNodeId];
      result.push({
        id: map.id,
        title: map.title,
        nodeCount: Object.keys(map.nodes).length,
        rootTitle: root?.title ?? "",
        summary: root?.summary || root?.messages[0]?.content || "",
        createdAt: map.createdAt,
        updatedAt: map.updatedAt,
      });
    }

    for (const om of openMaps) {
      if (seen.has(om.id)) continue;
      seen.add(om.id);
      result.push({
        id: om.id,
        title: om.title,
        nodeCount: om.nodeCount,
        rootTitle: "",
        summary: "",
        createdAt: "",
        updatedAt: "",
      });
    }

    result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt));

    if (activeId) {
      const activeIdx = result.findIndex((m) => m.id === activeId);
      if (activeIdx > 0) {
        const [first] = result.splice(activeIdx, 1);
        if (first) {
          result.unshift(first);
        }
      }
    }

    this.items = result;
  }

  getItems(): MapItem[] {
    return this.items;
  }

  getItemText(item: MapItem): string {
    return item.title;
  }

  renderSuggestion(item: FuzzyMatch<MapItem>, el: HTMLElement): void {
    const mapItem = item.item;
    const isActive = mapItem.id === this.plugin.store.getActiveSession()?.getLoadedMapId();

    el.addClass("map-switcher-item");
    if (isActive) {
      el.addClass("is-active");
    }

    const content = el.createDiv({ cls: "map-switcher-content" });

    const titleEl = content.createDiv({ cls: "map-switcher-title" });
    titleEl.setText(displayTitle(this.plugin.settings.language, mapItem.title));

    const metaEl = content.createDiv({ cls: "map-switcher-meta" });
    metaEl.setText([
      t(this.plugin.settings.language, "nodesCount", { count: mapItem.nodeCount }),
      mapItem.updatedAt ? t(this.plugin.settings.language, "updatedAt", { time: new Date(mapItem.updatedAt).toLocaleString(this.plugin.settings.language) }) : "",
    ].filter(Boolean).join(" · "));

    if (mapItem.rootTitle || mapItem.summary) {
      const summaryEl = content.createDiv({ cls: "map-switcher-summary" });
      summaryEl.setText(mapItem.summary || mapItem.rootTitle);
    }

    const deleteBtn = el.createEl("button", { cls: "map-switcher-delete" });
    deleteBtn.setText("×");
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      const ok = await confirmDelete(this.plugin.app, mapItem.title);
      if (!ok) return;

      try {
        const removed = await this.plugin.store.repository.deleteMap(mapItem.id);
        if (removed) {
          new Notice(this.language === "zh-CN" ? "图谱已删除" : "Map deleted");
        } else {
          new Notice(this.language === "zh-CN" ? "未找到该图谱文件" : "Map file not found");
        }
      } catch (deleteError: unknown) {
        const message = deleteError instanceof Error ? deleteError.message : String(deleteError);
        new Notice(this.language === "zh-CN" ? `删除失败：${message}` : `Delete failed: ${message}`);
      }

      await this.loadMaps();
      this.inputEl.dispatchEvent(new Event("input"));
    };
  }

  onChooseItem(item: MapItem, _evt: MouseEvent | KeyboardEvent): void {
    void this.plugin.store.switchActiveMap(item.id);
  }
}

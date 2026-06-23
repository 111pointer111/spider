import { normalizePath, type App } from "obsidian";
import { DATA_DIR, LEGACY_DATA_DIR } from "../constants";
import { isChatMap } from "../domain/guards";
import type { ChatMap } from "../types";
import { slugifyFileName } from "../utils/text";

export class MapRepository {
  private readonly app: App;

  constructor(app: App) {
    this.app = app;
  }

  async loadLatestMap(): Promise<ChatMap | null> {
    await this.ensureDataDir();
    return (await this.loadLatestMapFromDir(DATA_DIR)) ?? (await this.loadLatestMapFromDir(LEGACY_DATA_DIR));
  }

  private async loadLatestMapFromDir(dir: string): Promise<ChatMap | null> {
    if (!(await this.app.vault.adapter.exists(dir))) {
      return null;
    }

    const listed = await this.app.vault.adapter.list(dir);
    const files = listed.files.filter((path) => path.endsWith(".json")).sort((left, right) => right.localeCompare(left));

    for (const path of files) {
      try {
        const raw = await this.app.vault.adapter.read(path);
        const parsed = JSON.parse(raw) as unknown;
        if (isChatMap(parsed)) {
          return parsed;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  async loadMap(mapId: string): Promise<ChatMap | null> {
    const fromDir = async (dir: string): Promise<ChatMap | null> => {
      if (!(await this.app.vault.adapter.exists(dir))) {
        return null;
      }

      const listed = await this.app.vault.adapter.list(dir);
      for (const path of listed.files) {
        if (!path.endsWith(".json")) continue;
        try {
          const raw = await this.app.vault.adapter.read(path);
          const parsed = JSON.parse(raw) as unknown;
          if (isChatMap(parsed) && parsed.id === mapId) {
            return parsed;
          }
        } catch {
          continue;
        }
      }

      return null;
    };

    return (await fromDir(DATA_DIR)) ?? (await fromDir(LEGACY_DATA_DIR));
  }

  async listMaps(): Promise<ChatMap[]> {
    const maps: ChatMap[] = [];

    const fromDir = async (dir: string): Promise<void> => {
      if (!(await this.app.vault.adapter.exists(dir))) {
        return;
      }

      const listed = await this.app.vault.adapter.list(dir);
      const files = listed.files.filter((path) => path.endsWith(".json"));

      for (const path of files) {
        try {
          const raw = await this.app.vault.adapter.read(path);
          const parsed = JSON.parse(raw) as unknown;
          if (isChatMap(parsed)) {
            maps.push(parsed);
          }
        } catch {
          continue;
        }
      }
    };

    await fromDir(DATA_DIR);
    await fromDir(LEGACY_DATA_DIR);

    return maps;
  }

  async deleteMap(mapId: string): Promise<boolean> {
    const fromDir = async (dir: string): Promise<string | null> => {
      if (!(await this.app.vault.adapter.exists(dir))) {
        return null;
      }

      const listed = await this.app.vault.adapter.list(dir);
      for (const path of listed.files) {
        if (!path.endsWith(".json")) continue;
        try {
          const raw = await this.app.vault.adapter.read(path);
          const parsed = JSON.parse(raw) as unknown;
          if (isChatMap(parsed) && parsed.id === mapId) {
            return path;
          }
        } catch {
          continue;
        }
      }

      return null;
    };

    const path = (await fromDir(DATA_DIR)) ?? (await fromDir(LEGACY_DATA_DIR));
    if (!path) {
      return false;
    }

    await this.app.vault.adapter.remove(path);
    return true;
  }

  async saveMap(map: ChatMap): Promise<void> {
    await this.ensureDataDir();
    const path = this.mapPath(map);
    await this.app.vault.adapter.write(path, `${JSON.stringify(map, null, 2)}\n`);
  }

  async writeExport(folder: string, fileName: string, content: string): Promise<string> {
    const cleanFolder = normalizePath(folder);
    const path = normalizePath(`${cleanFolder}/${fileName}`);
    const parentFolder = path.split("/").slice(0, -1).join("/");
    await this.ensureFolder(parentFolder || cleanFolder);
    await this.app.vault.adapter.write(path, content);
    return path;
  }

  private mapPath(map: ChatMap): string {
    return normalizePath(`${DATA_DIR}/${slugifyFileName(map.title)}-${map.id}.json`);
  }

  private async ensureDataDir(): Promise<void> {
    await this.ensureFolder(DATA_DIR);
  }

  private async ensureFolder(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const segments = normalized.split("/").filter(Boolean);
    let current = "";

    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!(await this.app.vault.adapter.exists(current))) {
        await this.app.vault.createFolder(current);
      }
    }
  }
}

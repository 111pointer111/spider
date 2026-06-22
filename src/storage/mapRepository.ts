import { normalizePath, type App } from "obsidian";
import { DATA_DIR } from "../constants";
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
    const listed = await this.app.vault.adapter.list(DATA_DIR);
    const files = listed.files
      .filter((path) => path.endsWith(".json"))
      .sort((left, right) => right.localeCompare(left));

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

  async saveMap(map: ChatMap): Promise<void> {
    await this.ensureDataDir();
    const path = this.mapPath(map);
    await this.app.vault.adapter.write(path, `${JSON.stringify(map, null, 2)}\n`);
  }

  async writeExport(folder: string, fileName: string, content: string): Promise<string> {
    const cleanFolder = normalizePath(folder);
    await this.ensureFolder(cleanFolder);
    const path = normalizePath(`${cleanFolder}/${fileName}`);
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

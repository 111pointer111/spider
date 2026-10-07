import { normalizePath, type App } from "obsidian";
import { DATA_DIR, LEGACY_DATA_DIR } from "../constants";
import { isChatMap } from "../domain/guards";
import type { ChatMap } from "../types";
import { slugifyFileName } from "../utils/text";

export class MapRepository {
  private readonly app: App;
  private readonly mapWrites = new Map<string, Promise<void>>();

  constructor(app: App) {
    this.app = app;
  }

  async loadLatestMap(): Promise<ChatMap | null> {
    return (await this.listMaps())[0] ?? null;
  }

  async loadMap(mapId: string): Promise<ChatMap | null> {
    await this.mapWrites.get(mapId);
    return (await this.listMaps()).find((map) => map.id === mapId) ?? null;
  }

  async listMaps(): Promise<ChatMap[]> {
    const maps = new Map<string, ChatMap>();

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
            const previous = maps.get(parsed.id);
            // Old title-based filenames may contain several revisions of the same map.
            if (!previous || parsed.updatedAt > previous.updatedAt
              || (parsed.updatedAt === previous.updatedAt && path === this.mapPath(parsed))) {
              maps.set(parsed.id, parsed);
            }
          }
        } catch {
          continue;
        }
      }
    };

    await fromDir(DATA_DIR);
    await fromDir(LEGACY_DATA_DIR);

    return [...maps.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async deleteMap(mapId: string): Promise<boolean> {
    await this.mapWrites.get(mapId);
    const paths: string[] = [];
    for (const dir of [DATA_DIR, LEGACY_DATA_DIR]) {
      if (!(await this.app.vault.adapter.exists(dir))) continue;
      const listed = await this.app.vault.adapter.list(dir);
      for (const path of listed.files.filter((file) => file.endsWith(".json"))) {
        try {
          const parsed: unknown = JSON.parse(await this.app.vault.adapter.read(path));
          if (isChatMap(parsed) && parsed.id === mapId) paths.push(path);
        } catch {
          continue;
        }
      }
    }
    for (const path of paths) await this.app.vault.adapter.remove(path);
    return paths.length > 0;
  }

  async saveMap(map: ChatMap): Promise<void> {
    // Serialize writes per map so a slower old revision cannot replace a newer note.
    const write = (this.mapWrites.get(map.id) ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        await this.ensureDataDir();
        await this.app.vault.adapter.write(this.mapPath(map), `${JSON.stringify(map, null, 2)}\n`);
      });
    this.mapWrites.set(map.id, write);
    try {
      await write;
    } finally {
      if (this.mapWrites.get(map.id) === write) this.mapWrites.delete(map.id);
    }
  }

  async writeExport(folder: string, fileName: string, content: string): Promise<string> {
    const cleanFolder = normalizePath(folder);
    const path = normalizePath(`${cleanFolder}/${fileName}`);
    const parentFolder = path.split("/").slice(0, -1).join("/");
    await this.ensureFolder(parentFolder || cleanFolder);
    await this.app.vault.adapter.write(path, content);
    return path;
  }

  async createExportFolder(folder: string): Promise<string> {
    const cleanFolder = normalizePath(folder);
    let destination = cleanFolder;
    let suffix = 2;
    while (await this.app.vault.adapter.exists(destination)) {
      destination = `${cleanFolder}-${suffix++}`;
    }
    const parent = cleanFolder.split("/").slice(0, -1).join("/");
    await this.ensureFolder(parent);
    // Create exclusively: a concurrent export must fail instead of overwriting another snapshot.
    await this.app.vault.createFolder(destination);
    return destination;
  }

  private mapPath(map: ChatMap): string {
    return normalizePath(`${DATA_DIR}/${slugifyFileName(map.id)}.json`);
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

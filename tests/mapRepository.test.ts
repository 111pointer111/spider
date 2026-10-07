import { expect, it, vi } from "vitest";
import type { App } from "obsidian";
import { createRootMap, updateNode, updateMapTitle } from "../src/domain/chatMap";
import type BranchChatMapPlugin from "../src/main";
import { createDefaultSettings } from "../src/settingsDefaults";
import { ViewState } from "../src/state/viewState";
import { MapRepository } from "../src/storage/mapRepository";

vi.mock("obsidian", async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  normalizePath: (value: string) => value.replaceAll("\\", "/").replace(/\/{2,}/g, "/"),
}));

function memoryVault(files: Map<string, string>) {
  const folders = new Set([".spider", ".spider/maps"]);
  const write = vi.fn(async (path: string, content: string) => { files.set(path, content); });
  const app = { vault: {
    adapter: {
      exists: async (path: string) => files.has(path) || folders.has(path),
      list: async (dir: string) => ({ files: [...files.keys()].filter((path) => path.startsWith(dir + "/")), folders: [] }),
      read: async (path: string) => files.get(path)!,
      write,
      remove: async (path: string) => { files.delete(path); },
    },
    createFolder: async (path: string) => { folders.add(path); },
  } } as unknown as App;
  return { app, write };
}

it("recovers the newest legacy revision, keeps renamed maps at a stable path, and deletes all revisions", async () => {
  const root = createRootMap("Before", "Root");
  const old = { ...root, updatedAt: "2026-10-01T00:00:00.000Z" };
  const current = { ...updateNode(root, root.rootNodeId, { note: "Saved quote" }), updatedAt: "2026-10-02T00:00:00.000Z" };
  const files = new Map([
    [`.spider/maps/Before-${root.id}.json`, JSON.stringify(old)],
    [`.spider/maps/After-${root.id}.json`, JSON.stringify(current)],
  ]);
  const { app } = memoryVault(files);
  const repo = new MapRepository(app);
  expect((await repo.loadMap(root.id))?.nodes[root.rootNodeId]?.note).toBe("Saved quote");
  expect(await repo.listMaps()).toHaveLength(1);
  await repo.saveMap(updateMapTitle(current, "Renamed again"));
  expect(files.has(`.spider/maps/${root.id}.json`)).toBe(true);
  expect((await repo.loadMap(root.id))?.title).toBe("Renamed again");
  expect(files.size).toBe(3); // Legacy files remain intact until the user deletes the map.
  expect(await repo.deleteMap(root.id)).toBe(true);
  expect(files.size).toBe(0);
});

it("orders competing note writes and waits for them before reopening the map", async () => {
  const files = new Map<string, string>();
  const { app, write } = memoryVault(files);
  const repo = new MapRepository(app);
  const root = createRootMap("Write ordering", "Root");
  let finish!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  const paused = new Promise<void>((resolve) => { finish = resolve; });
  write.mockImplementationOnce(async (path, content) => { started(); await paused; files.set(path, content); });
  const first = repo.saveMap(root);
  await ready;
  const second = repo.saveMap(updateNode(root, root.rootNodeId, { note: "Latest note" }));
  const reopened = repo.loadMap(root.id);
  expect(write).toHaveBeenCalledTimes(1);
  finish();
  await Promise.all([first, second]);
  expect((await reopened)?.nodes[root.rootNodeId]?.note).toBe("Latest note");
});

it("exports numbered snapshots without touching previous notes and links each Canvas to its own snapshot", async () => {
  const files = new Map<string, string>();
  const folders = new Set<string>();
  const rmdir = vi.fn();
  const app = {
    vault: {
      adapter: {
        exists: async (path: string) => files.has(path) || folders.has(path),
        write: async (path: string, content: string) => { files.set(path, content); },
        rmdir,
      },
      createFolder: async (path: string) => {
        if (folders.has(path) || files.has(path)) throw new Error("Already exists");
        folders.add(path);
      },
    },
  } as unknown as App;
  const plugin = {
    settings: { ...createDefaultSettings("zh-CN"), defaultExportFolder: "Spider Maps" },
  } as BranchChatMapPlugin;
  const state = new ViewState(plugin, new MapRepository(app), createRootMap("快照验证", "快照验证"));

  try {
    await state.exportMap();
    expect(state.getSnapshot().error).toBeNull();
    const original = [...files.keys()].find((path) => path.endsWith("/index.md"))!.replace(/\/index\.md$/, "");
    files.set(`${original}/index.md`, "手写修改的入口");
    files.set(`${original}/我的补充.md`, "自己的研究判断");
    const before = new Map(files);

    await state.exportMap();
    await state.exportMap();

    expect(state.getSnapshot().error).toBeNull();
    for (const [path, content] of before) expect(files.get(path)).toBe(content);
    expect(rmdir).not.toHaveBeenCalled();
    for (const suffix of ["-2", "-3"]) {
      const folder = original + suffix;
      expect(files.has(`${folder}/index.md`)).toBe(true);
      expect(files.has(`${folder}/map.svg`)).toBe(true);
      const canvas = JSON.parse(files.get(`${folder}/map.canvas`)!);
      const text = canvas.nodes.map((node: { text: string }) => node.text).join("\n");
      expect(decodeURIComponent(text)).toContain(`${folder}/nodes/`);
      expect(decodeURIComponent(text)).not.toContain(`${original}/nodes/`);
    }
  } finally {
    state.dispose();
  }
});

import { symlink, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const vault = process.argv[2] || process.env.SPIDER_VAULT;
if (!vault) {
  console.error("Usage: node scripts/link.mjs <vault-path>");
  console.error("  or set SPIDER_VAULT env var");
  process.exit(1);
}

const pluginDir = resolve(vault, ".obsidian", "plugins", "spider");
const projectDir = resolve(import.meta.dirname, "..");

const files = ["main.js", "styles.css", "manifest.json"];

for (const file of files) {
  const target = resolve(pluginDir, file);
  const source = resolve(projectDir, file);

  try {
    await unlink(target);
  } catch {
    // doesn't exist yet, ok
  }

  await symlink(source, target);
  console.log(`  ${file} -> ${source}`);
}

console.log(`\nLinked to ${pluginDir}`);
console.log("Run 'npm run dev' to start watching. Obsidian hot-reload will pick up changes.");

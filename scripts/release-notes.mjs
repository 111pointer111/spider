import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const version = process.argv[2] ?? manifest.version;
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const versions = JSON.parse(await readFile("versions.json", "utf8"));
if (version !== manifest.version || version !== pkg.version || version !== lock.version || version !== lock.packages[""].version || versions[version] !== manifest.minAppVersion) {
  throw new Error("Release tag and version files must agree.");
}
const path = `.github/release-notes/${version}.md`;
const notes = await readFile(path, "utf8");
if (!notes.includes("## 中文") || !notes.includes("## English")) throw new Error("Write user-facing release notes in Chinese and English before releasing.");
console.log(`Release ${version}: ${path}`);

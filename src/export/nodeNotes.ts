import { getAncestorPath } from "../domain/chatMap";
import type { AppLanguage, ChatMap, ChatNode } from "../types";

/** Depth-first order keeps notes in the same order as the exploration tree. */
export function exportNodeNotes(map: ChatMap, nodes: readonly ChatNode[], fileNames: ReadonlyMap<string, string>, language: AppLanguage): string {
  const zh = language === "zh-CN";
  const lines = [`# ${map.title} · ${zh ? "节点随记" : "Node notes"}`, ""];
  for (const node of nodes) {
    if (!node.note?.trim()) continue;
    const path = getAncestorPath(map, node.id);
    const depth = path.length;
    lines.push(`${"#".repeat(Math.min(depth + 1, 6))} ${node.title}`, "",
      `- ${zh ? "路径" : "Path"}: ${path.map((item) => item.title).join(" / ")}`,
      `- ${zh ? "层级" : "Depth"}: ${depth - 1}`,
      `- ${zh ? "节点" : "Node"}: [${node.title}](nodes/${fileNames.get(node.id)})`,
      `- ID: \`${node.id}\``, "", node.note.trim(), "");
  }
  if (lines.length === 2) lines.push(zh ? "暂无随记。选中 AI 回答后按 Enter，可以将原句保存到对应节点。" : "No notes yet. Select an AI answer and press Enter to save a quote to its node.", "");
  return lines.join("\n");
}

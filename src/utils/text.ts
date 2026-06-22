export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function truncateText(value: string, maxLength: number): string {
  const clean = cleanText(value);
  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function escapeMermaid(value: string): string {
  return cleanText(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', "'")
    .replaceAll("(", "[")
    .replaceAll(")", "]");
}

export function slugifyFileName(value: string): string {
  const slug = cleanText(value)
    .replace(/[\\/:*?"<>|#^[\]]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "spider";
}

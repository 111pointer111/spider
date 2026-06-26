import { describe, expect, it } from "vitest";
import { cleanText, escapeMermaid, slugifyFileName, truncateText } from "../src/utils/text";

describe("text utilities", () => {
  it("collapses whitespace and trims surrounding space", () => {
    expect(cleanText("  hello\n   world\t!  ")).toBe("hello world !");
  });

  it("truncates long strings with an ellipsis", () => {
    expect(truncateText("alpha beta gamma", 8)).toBe("alpha b…");
    expect(truncateText("short", 12)).toBe("short");
  });

  it("slugs unsafe characters for filenames", () => {
    expect(slugifyFileName("AI: Self-Attention?")).toBe("AI-Self-Attention");
    expect(slugifyFileName("a/b\\c|d*e?f")).toBe("a-b-c-d-e-f");
    expect(slugifyFileName("////")).toBe("spider");
  });

  describe("escapeMermaid", () => {
    it("never introduces square brackets from parentheses", () => {
      const out = escapeMermaid("app.get('/users', async (req, res) => {})");
      expect(out).not.toContain("[");
      expect(out).not.toContain("]");
      expect(out).toContain("#40;");
      expect(out).toContain("#41;");
    });

    it("escapes existing square brackets so Mermaid's shape parser is not triggered", () => {
      const out = escapeMermaid("Tuple: [req, res]");
      expect(out).toContain("#91;req, res#93;");
    });

    it("escapes braces and quotes consistently", () => {
      const out = escapeMermaid(`const obj = { a: "x" };`);
      expect(out).toContain("#123;");
      expect(out).toContain("#125;");
      expect(out).toContain("'x'");
    });

    it("escapes the hash character first to avoid double-escaping", () => {
      const out = escapeMermaid("issue #91 vs [bracket]");
      expect(out.startsWith("issue #35;91 vs #91;bracket#93;")).toBe(true);
    });

    it("flattens newlines so the label stays on a single mindmap line", () => {
      expect(escapeMermaid("line1\nline2")).toBe("line1 line2");
    });

    it("preserves plain text unchanged", () => {
      expect(escapeMermaid("Plain text node")).toBe("Plain text node");
    });
  });
});

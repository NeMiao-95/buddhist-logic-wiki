import { AuditResult, ContextBundle } from "../types/schema";

const CITE_TOKEN_RE = /\[((?:F|E|N)\d+(?:\s*,\s*(?:F|E|N)\d+)*)\]/g;

/**
 * Programmatic Anti-Hallucination & Reproducibility Auditor.
 * Verifies that:
 * 1) Every [F*]/[E*]/[N*] tag actually exists in the closed-world ContextBundle.
 * 2) Every substantive factual sentence in sections 1–5 carries at least one citation tag.
 */
export function auditCompiledMarkdown(
  markdown: string,
  bundle: ContextBundle
): AuditResult {
  const validSet = new Set<string>([
    ...bundle.facts.map((f) => f.id),
    ...bundle.edges.map((e) => e.id),
    ...bundle.neighbors.map((n) => n.id),
  ]);

  const citedSet = new Set<string>();
  const invalidSet = new Set<string>();

  for (const match of markdown.matchAll(CITE_TOKEN_RE)) {
    const parts = match[1].split(",").map((s) => s.trim());
    for (const id of parts) {
      citedSet.add(id);
      if (!validSet.has(id)) {
        invalidSet.add(id);
      }
    }
  }

  const uncitedSentences: string[] = [];
  const lines = markdown.split(/\r?\n/);
  let inGapSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      inGapSection = line.includes("盲区") || line.includes("六、");
      continue;
    }
    if (inGapSection && /^-\s+`P\d+`/.test(line)) continue;
    if (line.startsWith(">")) continue;
    if (
      line.includes("【当前库中未记录】") ||
      line.includes("【当前尚未与其他概念建立连接】") ||
      line.includes("【当前库中暂无可对比的相邻概念】") ||
      line.includes("【当前所有预设插头均已记录】") ||
      line.includes("【当前暂无足够已记录信息可供汇总】")
    ) {
      continue;
    }

    // Split paragraph into sentences by terminal punctuation (keep clauses joined by ； within one sentence)
    const cleanLine = line.replace(/^[-*]\s+/, "");
    const sentences = cleanLine
      .split(/(?<=[。！？])/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 6);

    for (const sent of sentences) {
      const hasCitation = /\[(?:F|E|N)\d+(?:\s*,\s*(?:F|E|N)\d+)*\]/.test(sent);
      if (!hasCitation) {
        uncitedSentences.push(sent);
      }
    }
  }

  return {
    passed:
      invalidSet.size === 0 &&
      uncitedSentences.length === 0 &&
      (validSet.size === 0 || citedSet.size > 0),
    citedIds: Array.from(citedSet),
    validIdsInBundle: Array.from(validSet),
    invalidIds: Array.from(invalidSet),
    uncitedSentences,
  };
}

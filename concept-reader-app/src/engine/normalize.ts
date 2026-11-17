import { ConceptNode } from "../types/schema";

/**
 * Strip Unicode combining diacritical marks (e.g. Vedānta -> vedanta, Sāṃkhya -> samkhya),
 * lowercase, and collapse spaces/punctuation for deterministic concept matching.
 */
export function normalizeConceptText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[《》「」『』()（）\[\]【】.,，。:：;；!！?？'"“”‘’\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactNormalizedText(input: string): string {
  return normalizeConceptText(input).replace(/\s+/g, "");
}

export interface ConceptMatchCandidate {
  node: ConceptNode;
  matchType: "exact" | "alias" | "fuzzy";
  score: number;
  matchedTerm: string;
}

function bigramSet(str: string): Set<string> {
  const s = compactNormalizedText(str);
  const out = new Set<string>();
  if (s.length <= 1) {
    if (s) out.add(s);
    return out;
  }
  for (let i = 0; i < s.length - 1; i++) {
    out.add(s.slice(i, i + 2));
  }
  return out;
}

function diceSimilarity(a: string, b: string): number {
  const setA = bigramSet(a);
  const setB = bigramSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const item of setA) {
    if (setB.has(item)) overlap++;
  }
  return (2 * overlap) / (setA.size + setB.size);
}

/**
 * Detect whether newly entered plug text matches an existing concept node in the library.
 */
export function findMatchingNodes(
  rawInput: string,
  nodes: ConceptNode[],
  excludeNodeId?: string
): ConceptMatchCandidate[] {
  const queryCompact = compactNormalizedText(rawInput);
  if (!queryCompact || queryCompact.length < 2) return [];

  const results: ConceptMatchCandidate[] = [];

  for (const node of nodes) {
    if (node.id === excludeNodeId) continue;

    const labelCompact = compactNormalizedText(node.label);
    if (labelCompact === queryCompact) {
      results.push({
        node,
        matchType: "exact",
        score: 1.0,
        matchedTerm: node.label,
      });
      continue;
    }

    let matchedAlias: string | null = null;
    for (const alias of node.aliases) {
      if (compactNormalizedText(alias) === queryCompact) {
        matchedAlias = alias;
        break;
      }
    }
    if (matchedAlias) {
      results.push({
        node,
        matchType: "alias",
        score: 0.98,
        matchedTerm: matchedAlias,
      });
      continue;
    }

    // Check containment or high Dice bigram similarity (e.g. "印度哲学学派" vs "印度哲学的学派")
    const candidates = [node.label, ...node.aliases];
    let bestFuzzy = 0;
    let bestTerm = node.label;
    for (const term of candidates) {
      const termCompact = compactNormalizedText(term);
      if (!termCompact) continue;
      let sim = diceSimilarity(queryCompact, termCompact);
      if (
        termCompact.length >= 3 &&
        queryCompact.length >= 3 &&
        (queryCompact.includes(termCompact) || termCompact.includes(queryCompact))
      ) {
        sim = Math.max(sim, 0.82);
      }
      if (sim > bestFuzzy) {
        bestFuzzy = sim;
        bestTerm = term;
      }
    }

    if (bestFuzzy >= 0.55) {
      results.push({
        node,
        matchType: "fuzzy",
        score: Number(bestFuzzy.toFixed(2)),
        matchedTerm: bestTerm,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 4);
}

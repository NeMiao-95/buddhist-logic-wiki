import { BookDocument, DocumentChunk } from "../types/schema";
import { normalizeConceptText } from "./normalize";

export function chunkDocument(doc: BookDocument): DocumentChunk[] {
  const lines = doc.content.split(/\r?\n/);
  const chunks: DocumentChunk[] = [];
  let currentPage = "未标页码";
  let buffer: string[] = [];
  let chunkIndex = 0;

  const pageRegex =
    /(?:\[(?:p\.?\s*|第)\s*([0-9]+)\s*页?\]|【(?:p\.?\s*|第)\s*([0-9]+)\s*页?】|^#{1,3}\s*(.+)$)/i;

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (!text) return;
    chunkIndex += 1;
    chunks.push({
      chunkId: `${doc.id}_c${chunkIndex}`,
      docId: doc.id,
      docTitle: doc.title,
      role: doc.role,
      pageLabel: currentPage,
      text,
      normalizedText: normalizeConceptText(text),
    });
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const pageMatch = trimmed.match(pageRegex);
    if (pageMatch) {
      if (pageMatch[1] || pageMatch[2]) {
        const num = pageMatch[1] || pageMatch[2];
        if (buffer.join("").length > 60) flush();
        currentPage = `p.${num}`;
      } else if (pageMatch[3]) {
        if (buffer.join("").length > 60) flush();
        currentPage = pageMatch[3].trim();
      }
    }

    if (trimmed === "") {
      if (buffer.join("\n").length >= 120) flush();
    } else {
      buffer.push(trimmed);
      if (buffer.join("\n").length >= 420) flush();
    }
  }
  flush();

  return chunks;
}

export function buildAllChunks(docs: BookDocument[]): DocumentChunk[] {
  return docs.flatMap(chunkDocument);
}

function tokenizeForSearch(query: string): string[] {
  const norm = normalizeConceptText(query);
  const tokens = new Set<string>();

  for (const part of norm.split(/\s+/)) {
    if (!part) continue;
    if (/^[a-z0-9]+$/.test(part)) {
      if (part.length >= 2) tokens.add(part);
    } else {
      tokens.add(part);
      const chars = Array.from(part);
      for (let i = 0; i < chars.length - 1; i++) {
        tokens.add(chars[i] + chars[i + 1]);
      }
      for (let i = 0; i < chars.length - 2; i++) {
        tokens.add(chars[i] + chars[i + 1] + chars[i + 2]);
      }
    }
  }
  return Array.from(tokens);
}

export interface ScoredChunk {
  chunk: DocumentChunk;
  score: number;
}

export function searchCorpus(
  query: string,
  conceptLabel: string,
  aliases: string[],
  chunks: DocumentChunk[],
  topK = 5
): ScoredChunk[] {
  const conceptTerms = [conceptLabel, ...aliases]
    .map((t) => normalizeConceptText(t))
    .filter(Boolean);
  const queryTokens = tokenizeForSearch(query);

  const scored: ScoredChunk[] = [];
  for (const chunk of chunks) {
    let score = 0;
    const text = chunk.normalizedText;
    let hasConcept = false;

    for (const term of conceptTerms) {
      if (text.includes(term)) {
        score += 6;
        hasConcept = true;
      }
    }
    for (const tok of queryTokens) {
      if (text.includes(tok)) {
        score += tok.length >= 4 ? 2.5 : 1.4;
      }
    }
    if (chunk.role === "primary" && hasConcept) score += 1.5;
    if (score > 0) scored.push({ chunk, score });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

const PLUG_HINTS: Record<string, string[]> = {
  P1: ["学派", "属于", "归属", "分类", "体系", "六派", "传统"],
  P2: ["对比", "区别", "关系", "对立", "并列", "类似", "批判"],
  P3: ["派生", "分支", "支派", "不二", "细分", "下位"],
  P4: ["词义", "字面", "意思", "含义", "终结", "语源", "原意", "术语"],
  P5: ["为什么", "动机", "目的", "意义", "解决", "作用", "为何"],
  P6: ["创始", "创立", "作者", "经典", "文本", "文献", "奥义书", "梵经", "源流"],
  P7: ["核心", "主张", "命题", "观点", "学说", "本质", "思想"],
};

export function extractConciseDemoAnswer(
  plugId: string,
  question: string,
  conceptLabel: string,
  aliases: string[],
  chunks: DocumentChunk[]
): {
  answer: string;
  found: boolean;
  sourceRef?: { docId: string; docTitle: string; pageLabel: string; excerpt: string };
} {
  const combinedQuery = `${conceptLabel} ${question} ${(PLUG_HINTS[plugId] || []).join(" ")}`;
  const top = searchCorpus(combinedQuery, conceptLabel, aliases, chunks, 4);

  if (top.length === 0 || top[0].score < 4) {
    return { found: false, answer: "当前所供资料中未提及该内容。" };
  }

  const stopTokens = new Set(["什么", "的是", "怎么", "如何", "请问", "这个", "关于", "哪些", "哪个", "我们", "它的", "它们", "是不是", "有没有"]);
  const conceptNorms = [conceptLabel, ...aliases].map(normalizeConceptText);
  const questionTokens = tokenizeForSearch(question).filter(
    (t) => t.length >= 2 && !stopTokens.has(t) && !conceptNorms.some((c) => c === t)
  );
  const plugHints = PLUG_HINTS[plugId] || [];

  let bestSentence = "";
  let bestScore = -1;
  let bestQuestionHits = 0;
  let bestChunk = top[0].chunk;

  for (const item of top) {
    const cleanText = item.chunk.text
      .replace(/\[(?:p\.?\s*|第)\s*[0-9]+\s*页?\]/gi, "")
      .trim();
    const sentences = cleanText
      .split(/(?<=[。！？.!?\n])/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 6);

    for (const sent of sentences) {
      const normSent = normalizeConceptText(sent);
      let sScore = 0;
      let qHits = 0;
      for (const c of conceptNorms) {
        if (c && normSent.includes(c)) sScore += 3;
      }
      for (const qt of questionTokens) {
        if (qt && normSent.includes(normalizeConceptText(qt))) {
          sScore += 3.5;
          qHits += 1;
        }
      }
      for (const hw of plugHints) {
        if (hw && normSent.includes(normalizeConceptText(hw))) sScore += 1.5;
      }
      if (sScore > bestScore) {
        bestScore = sScore;
        bestQuestionHits = qHits;
        bestSentence = sent.replace(/^[-*•\s]+/, "").trim();
        bestChunk = item.chunk;
      }
    }
  }

  if (!bestSentence || bestScore < 3.5 || (questionTokens.length > 0 && bestQuestionHits === 0)) {
    return { found: false, answer: "当前所供资料中未找到对应这一方向的明确记载。" };
  }

  let concise = bestSentence;
  if (concise.length > 80) {
    concise = concise.slice(0, 77).replace(/[，、；：,\s]+$/, "") + "…";
  }

  return {
    found: true,
    answer: concise,
    sourceRef: {
      docId: bestChunk.docId,
      docTitle: bestChunk.docTitle,
      pageLabel: bestChunk.pageLabel,
      excerpt: bestChunk.text,
    },
  };
}

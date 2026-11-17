import { AiSettings, DocumentChunk, PlugDefinition } from "../types/schema";
import { extractConciseDemoAnswer, searchCorpus } from "../engine/localRag";

export interface RagQueryResult {
  answer: string;
  found: boolean;
  sourceRef?: {
    docId: string;
    docTitle: string;
    pageLabel: string;
    excerpt: string;
  };
  usedMode: "demo" | "llm";
}

export async function callOpenAiCompatible(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  settings: AiSettings
): Promise<string> {
  const base = settings.baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model || "gpt-4o-mini",
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API 请求失败 (${res.status}): ${errText.slice(0, 160)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("模型返回内容为空");
  }
  return content;
}

export async function askPlugQuestionFromCorpus(
  conceptLabel: string,
  aliases: string[],
  plug: PlugDefinition,
  question: string,
  chunks: DocumentChunk[],
  settings: AiSettings
): Promise<RagQueryResult> {
  if (chunks.length === 0) {
    return {
      found: false,
      answer: "当前尚未导入任何书籍或补充资料，请先在左侧导入文本。",
      usedMode: "demo",
    };
  }

  const hits = searchCorpus(
    `${conceptLabel} ${plug.name} ${question}`,
    conceptLabel,
    aliases,
    chunks,
    5
  );

  if (hits.length === 0) {
    return {
      found: false,
      answer: "当前所供资料中未检索到与该问题相关的段落。",
      usedMode: "demo",
    };
  }

  if (settings.mode === "openai-compatible" && settings.apiKey.trim()) {
    try {
      const passagesText = hits
        .map(
          (h, idx) =>
            `[资料${idx + 1}] 《${h.chunk.docTitle}》(${h.chunk.pageLabel})\n${h.chunk.text}`
        )
        .join("\n\n");

      const systemPrompt = `你是一个极简读书助手。你只能依据下方提供的【检索资料】回答用户关于概念「${conceptLabel}」在插头「${plug.name}」上的提问。
严格要求：
1. 回答必须极度简短（控制在 60~80 个汉字以内，最多 1~2 句话）。
2. 严禁使用资料之外的外部知识脑补。如果资料中没有写，必须返回 found: false。
3. 必须严格返回 JSON：{"found": true/false, "answer": "简短回答", "source_index": 1}`;

      const userPrompt = `提问：${question}\n\n【检索资料】\n${passagesText}`;
      const raw = await callOpenAiCompatible(systemPrompt, userPrompt, 0, settings);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const idx = Math.max(0, Math.min(hits.length - 1, (parsed.source_index || 1) - 1));
        const chosen = hits[idx].chunk;
        return {
          found: Boolean(parsed.found),
          answer: String(parsed.answer || "当前所供资料中未提及该内容。").slice(0, 100),
          sourceRef: parsed.found
            ? {
                docId: chosen.docId,
                docTitle: chosen.docTitle,
                pageLabel: chosen.pageLabel,
                excerpt: chosen.text,
              }
            : undefined,
          usedMode: "llm",
        };
      }
    } catch {
      // Fall through cleanly to local grounded extractor
    }
  }

  const localRes = extractConciseDemoAnswer(
    plug.id,
    question,
    conceptLabel,
    aliases,
    chunks
  );
  return {
    ...localRes,
    usedMode: "demo",
  };
}

import React, { useState } from "react";
import { BookOpen, Plus, Sparkles } from "lucide-react";
import {
  AiSettings,
  ConceptNode,
  DocumentChunk,
  FactEntry,
  PlugDefinition,
  PlugId,
} from "../types/schema";
import { askPlugQuestionFromCorpus, RagQueryResult } from "../services/llmClient";

const SUGGESTED_QUESTIONS: Record<PlugId, string[]> = {
  P1: ["它属于哪个更大的学派或分类？"],
  P2: ["它与哪一个概念常被放在一起对比？"],
  P3: ["它向下分化出哪些具体支派或子概念？"],
  P4: ["这个词的意思是什么？"],
  P5: ["我们为什么要学习它？"],
  P6: ["它的创始者是谁？依托哪些经典？"],
  P7: ["用简短的话概括它的核心主张是什么？"],
};

interface PlugAiQueryBoxProps {
  node: ConceptNode;
  activePlug: PlugDefinition;
  chunks: DocumentChunk[];
  aiSettings: AiSettings;
  onAdoptAnswer: (text: string, sourceRef?: FactEntry["sourceRef"]) => void;
}

export const PlugAiQueryBox: React.FC<PlugAiQueryBoxProps> = ({
  node,
  activePlug,
  chunks,
  aiSettings,
  onAdoptAnswer,
}) => {
  const [questionText, setQuestionText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<RagQueryResult | null>(null);

  const handleAskAi = async (customQ?: string) => {
    const q = (customQ || questionText || SUGGESTED_QUESTIONS[activePlug.id][0]).trim();
    if (!q) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await askPlugQuestionFromCorpus(
        node.label,
        node.aliases,
        activePlug,
        q,
        chunks,
        aiSettings
      );
      setAiResult(res);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="card-block ai-rag-block">
      <div className="block-label-row">
        <label className="block-label">
          <Sparkles size={14} /> 向 AI 检索书中简短说明
        </label>
        <span className="mode-pill">
          {aiSettings.mode === "openai-compatible" && aiSettings.apiKey
            ? "在线 LLM"
            : "本地严谨摘录演示"}
        </span>
      </div>

      <div className="quick-q-list">
        {SUGGESTED_QUESTIONS[activePlug.id].map((sq) => (
          <button
            key={sq}
            type="button"
            className="quick-q-chip"
            onClick={() => {
              setQuestionText(sq);
              handleAskAi(sq);
            }}
          >
            {sq}
          </button>
        ))}
      </div>

      <div className="input-action-row">
        <input
          type="text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAskAi();
          }}
          placeholder="输入你想从当前书库问 AI 的问题..."
        />
        <button type="button" disabled={aiLoading} onClick={() => handleAskAi()}>
          {aiLoading ? "检索中..." : "简短检索"}
        </button>
      </div>

      {aiResult && (
        <div className={`ai-answer-card ${aiResult.found ? "found" : "not-found"}`}>
          <p className="ai-answer-text">{aiResult.answer}</p>
          {aiResult.sourceRef && (
            <details className="source-details">
              <summary>
                <BookOpen size={12} /> 出处：{aiResult.sourceRef.docTitle}（
                {aiResult.sourceRef.pageLabel}）
              </summary>
              <blockquote>{aiResult.sourceRef.excerpt}</blockquote>
            </details>
          )}
          {aiResult.found && (
            <button
              type="button"
              className="adopt-answer-btn"
              onClick={() => {
                onAdoptAnswer(aiResult.answer, aiResult.sourceRef);
                setAiResult(null);
              }}
            >
              <Plus size={14} /> 写入此插头
            </button>
          )}
        </div>
      )}
    </div>
  );
};

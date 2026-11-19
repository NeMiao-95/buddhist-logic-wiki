import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Copy, Download, X, RefreshCw } from "lucide-react";
import { CompiledSummary } from "../types/schema";

interface SummaryCompilerModalProps {
  summary: CompiledSummary;
  compiling: boolean;
  onClose: () => void;
  onRecompile: () => void;
  onInspectCitation: (citationId: string, summary: CompiledSummary) => void;
}

export const SummaryCompilerModal: React.FC<SummaryCompilerModalProps> = ({
  summary,
  compiling,
  onClose,
  onRecompile,
  onInspectCitation,
}) => {
  const [tab, setTab] = useState<"prose" | "bundle">("prose");
  const [copied, setCopied] = useState(false);
  const [activeRefDetail, setActiveRefDetail] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([summary.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.bundle.targetConcept}_说明文_${summary.snapshotHash}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderInlineText = (text: string) =>
    text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((seg, i) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return <strong key={i}>{seg.slice(2, -2)}</strong>;
      }
      if (seg.startsWith("`") && seg.endsWith("`")) {
        return <code key={i}>{seg.slice(1, -1)}</code>;
      }
      return <span key={i}>{seg}</span>;
    });

  const renderLineWithClickableCitations = (line: string, idx: number, allLines: string[]) => {
    if (line.trim() === "---") return <hr key={idx} className="prose-hr" />;
    const isH1 = line.startsWith("# ");
    const isH2 = line.startsWith("## ");
    const isColophon = line.startsWith("> Compiled with");
    const displayLine = isH2 ? line.slice(3) : isH1 ? line.slice(2) : isColophon ? line.slice(2) : line;
    const isSynthesisBody = idx > 0 && allLines[idx - 1]?.includes("七、一段话汇总");
    const parts = displayLine.split(/(\[(?:F|E|N)\d+\])/g);
    return (
      <p key={idx} className={isH2 ? "prose-h2" : isH1 ? "prose-h1" : isColophon ? "prose-colophon" : isSynthesisBody ? "prose-line prose-synthesis" : "prose-line"}>
        {parts.map((part, pIdx) => {
          const m = part.match(/^\[((?:F|E|N)\d+)\]$/);
          if (!m) return <span key={pIdx}>{renderInlineText(part)}</span>;
          const cid = m[1];
          return (
            <button
              key={pIdx}
              type="button"
              className="cite-chip"
              onClick={() => {
                onInspectCitation(cid, summary);
                const f = summary.bundle.facts.find((x) => x.id === cid);
                const e = summary.bundle.edges.find((x) => x.id === cid);
                const n = summary.bundle.neighbors.find((x) => x.id === cid);
                if (f) {
                  setActiveRefDetail(`[${f.id}] 插头「${f.plugName}」：${f.text}${f.sourceLabel ? `（${f.sourceLabel}）` : ""}`);
                } else if (e) {
                  setActiveRefDetail(`[${e.id}] 图谱连线：${e.fromLabel} —(${e.relationLabel})→ ${e.toLabel}`);
                } else if (n) {
                  setActiveRefDetail(`[${n.id}] 相邻概念「${n.label}」（${n.relationship}）`);
                }
              }}
            >
              {part}
            </button>
          );
        })}
      </p>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>可复刻概念说明文 · {summary.bundle.targetConcept}</h3>
            <div className="audit-badges">
              {summary.audit.passed ? (
                <span className="audit-pass"><CheckCircle2 size={14} /> 100% 封闭图谱校验通过（无外部脑补）</span>
              ) : (
                <span className="audit-warn"><AlertTriangle size={14} /> 发现 {summary.audit.invalidIds.length + summary.audit.uncitedSentences.length} 处待核查句</span>
              )}
              <span className="hash-pill">配方 {summary.recipeVersion} · 快照 {summary.snapshotHash}</span>
              <span className="hash-pill">{summary.mode === "llm" ? "LLM 温度0编译" : "本地确定性编译"}</span>
            </div>
          </div>
          <button type="button" className="icon-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-toolbar">
          <div className="tab-group">
            <button type="button" className={tab === "prose" ? "active" : ""} onClick={() => setTab("prose")}>说明文视图</button>
            <button type="button" className={tab === "bundle" ? "active" : ""} onClick={() => setTab("bundle")}>封闭快照 JSON（复刻输入）</button>
          </div>
          <div className="toolbar-actions">
            <button type="button" onClick={onRecompile} disabled={compiling}>
              <RefreshCw size={14} /> {compiling ? "编译中..." : "重新编译"}
            </button>
            <button type="button" onClick={handleCopy}><Copy size={14} /> {copied ? "已复制" : "复制 Markdown"}</button>
            <button type="button" onClick={handleDownload}><Download size={14} /> 导出 .md</button>
          </div>
        </div>

        {activeRefDetail && (
          <div className="citation-trace-bar">
            <span>溯源定位：{activeRefDetail}</span>
            <button type="button" onClick={() => setActiveRefDetail(null)}>收起</button>
          </div>
        )}

        <div className="modal-body">
          {tab === "prose" ? (
            <div className="prose-container">
              {summary.markdown.split(/\r?\n/).map((line, idx, arr) =>
                renderLineWithClickableCitations(line, idx, arr)
              )}
            </div>
          ) : (
            <pre className="json-bundle-view">{JSON.stringify(summary.bundle, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
};

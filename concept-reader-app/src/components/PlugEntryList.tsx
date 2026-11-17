import React from "react";
import { Trash2 } from "lucide-react";
import { FactEntry } from "../types/schema";

interface PlugEntryListProps {
  entries: FactEntry[];
  onDelete: (entryId: string) => void;
}

export const PlugEntryList: React.FC<PlugEntryListProps> = ({ entries, onDelete }) => (
  <div className="card-block">
    <label className="block-label">当前插头已写入记录（{entries.length}）</label>
    {entries.length === 0 ? (
      <p className="empty-hint">暂无记录。可手写、磁吸连线，或上方问 AI 写入。</p>
    ) : (
      <ul className="fact-entry-list">
        {entries.map((entry) => (
          <li key={entry.id} className="fact-entry-item">
            <div className="fact-entry-main">
              <span>{entry.text}</span>
              {entry.linkedNodeId && <span className="linked-badge">🧲 已磁吸连线</span>}
              {entry.sourceRef && (
                <details className="source-details">
                  <summary>
                    出处：{entry.sourceRef.docTitle}（{entry.sourceRef.pageLabel}）
                  </summary>
                  <blockquote>{entry.sourceRef.excerpt}</blockquote>
                </details>
              )}
            </div>
            <button
              type="button"
              className="mini-delete-btn"
              onClick={() => onDelete(entry.id)}
              title="移除该记录"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

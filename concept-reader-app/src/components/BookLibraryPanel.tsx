import React, { useState } from "react";
import { BookOpen, FilePlus2, Trash2 } from "lucide-react";
import { BookDocument } from "../types/schema";

interface BookLibraryPanelProps {
  documents: BookDocument[];
  onAddDocument: (title: string, role: "primary" | "supplementary", content: string) => void;
  onDeleteDocument: (docId: string) => void;
}

export const BookLibraryPanel: React.FC<BookLibraryPanelProps> = ({
  documents,
  onAddDocument,
  onDeleteDocument,
}) => {
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<"primary" | "supplementary">("primary");
  const [content, setContent] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onAddDocument(file.name.replace(/\.(txt|md)$/i, ""), role, text);
    e.target.value = "";
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onAddDocument(title.trim(), role, content.trim());
    setTitle("");
    setContent("");
    setShowAdd(false);
  };

  return (
    <aside className="library-panel">
      <div className="library-header">
        <div className="library-title">
          <BookOpen size={16} />
          <h3>共读资料库（{documents.length}）</h3>
        </div>
        <button type="button" className="small-btn" onClick={() => setShowAdd(!showAdd)}>
          <FilePlus2 size={14} /> {showAdd ? "收起" : "投喂文本"}
        </button>
      </div>

      {showAdd && (
        <div className="add-doc-box">
          <div className="role-toggle">
            <button
              type="button"
              className={role === "primary" ? "active" : ""}
              onClick={() => setRole("primary")}
            >
              当前在读书籍
            </button>
            <button
              type="button"
              className={role === "supplementary" ? "active" : ""}
              onClick={() => setRole("supplementary")}
            >
              补充参考资料
            </button>
          </div>
          <label className="file-upload-label">
            选择本地 .txt / .md 文件导入
            <input type="file" accept=".txt,.md,.markdown" onChange={handleFileUpload} hidden />
          </label>
          <input
            type="text"
            placeholder="或手动输入书名/章节标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            rows={5}
            placeholder="粘贴书籍正文（可用 [p.12] 标注页码，方便精准溯源）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button type="button" className="save-doc-btn" onClick={handleSubmit}>
            添加到共读库
          </button>
        </div>
      )}

      <div className="doc-list">
        {documents.map((doc) => (
          <details key={doc.id} className="doc-card">
            <summary>
              <div className="doc-card-head">
                <span className={`doc-role-tag ${doc.role}`}>
                  {doc.role === "primary" ? "在读" : "补充"}
                </span>
                <span className="doc-title-text">{doc.title}</span>
                <button
                  type="button"
                  className="mini-delete-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    onDeleteDocument(doc.id);
                  }}
                  title="删除资料"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </summary>
            <pre className="doc-preview-text">{doc.content.slice(0, 1200)}{doc.content.length > 1200 ? "\n..." : ""}</pre>
          </details>
        ))}
      </div>
    </aside>
  );
};

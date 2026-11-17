import React, { useState } from "react";
import { BookOpenCheck, Circle, Plus, Settings, Square } from "lucide-react";

interface TopBarProps {
  onCreateNode: (label: string, shape: "circle" | "rect") => void;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onCreateNode, onOpenSettings }) => {
  const [newLabel, setNewLabel] = useState("");
  const [newShape, setNewShape] = useState<"circle" | "rect">("circle");

  const submit = () => {
    if (!newLabel.trim()) return;
    onCreateNode(newLabel.trim(), newShape);
    setNewLabel("");
  };

  return (
    <header className="topbar">
      <div className="brand-area">
        <BookOpenCheck size={20} color="#4f46e5" />
        <h1>ConceptPlug Reader</h1>
        <span className="brand-badge">插头式伴读 · 磁吸图谱 · 可复刻说明文</span>
      </div>

      <div className="create-bar">
        <input
          type="text"
          placeholder="输入新概念（如 Ātman）..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <div className="shape-switch">
          <button
            type="button"
            className={newShape === "circle" ? "active" : ""}
            onClick={() => setNewShape("circle")}
          >
            <Circle size={12} /> 圆圈
          </button>
          <button
            type="button"
            className={newShape === "rect" ? "active" : ""}
            onClick={() => setNewShape("rect")}
          >
            <Square size={12} /> 方格
          </button>
        </div>
        <button type="button" className="primary-btn" onClick={submit}>
          <Plus size={15} /> 生成概念
        </button>
      </div>

      <div className="topbar-actions">
        <button type="button" className="small-btn" onClick={onOpenSettings}>
          <Settings size={14} /> 设置 / 跨电脑同步
        </button>
      </div>
    </header>
  );
};

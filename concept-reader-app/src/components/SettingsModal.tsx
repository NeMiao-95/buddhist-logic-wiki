import React, { useState } from "react";
import { Download, RotateCcw, Upload, X } from "lucide-react";
import { AiSettings, PlugDefinition } from "../types/schema";

interface SettingsModalProps {
  aiSettings: AiSettings;
  plugDefinitions: PlugDefinition[];
  onSaveAiSettings: (next: AiSettings) => void;
  onSavePlugDefinitions: (next: PlugDefinition[]) => void;
  onExportWorkspace: () => void;
  onImportWorkspace: (file: File) => void;
  onResetDemo: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  aiSettings,
  plugDefinitions,
  onSaveAiSettings,
  onSavePlugDefinitions,
  onExportWorkspace,
  onImportWorkspace,
  onResetDemo,
  onClose,
}) => {
  const [draftAi, setDraftAi] = useState<AiSettings>(aiSettings);
  const [draftPlugs, setDraftPlugs] = useState<PlugDefinition[]>(
    plugDefinitions.map((p) => ({ ...p }))
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>系统设置 · 插头定义与跨电脑同步</h3>
          <button type="button" className="icon-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body settings-body">
          <section className="settings-section">
            <h4>1. AI 驱动模式（默认免配置即可体验）</h4>
            <div className="role-toggle">
              <button
                type="button"
                className={draftAi.mode === "demo" ? "active" : ""}
                onClick={() => setDraftAi({ ...draftAi, mode: "demo" })}
              >
                本地严谨摘录 + 确定性编译（免 Key）
              </button>
              <button
                type="button"
                className={draftAi.mode === "openai-compatible" ? "active" : ""}
                onClick={() => setDraftAi({ ...draftAi, mode: "openai-compatible" })}
              >
                OpenAI 兼容接口（仅存本地浏览器）
              </button>
            </div>
            {draftAi.mode === "openai-compatible" && (
              <div className="form-grid">
                <label>
                  API Base URL
                  <input
                    value={draftAi.baseUrl}
                    onChange={(e) => setDraftAi({ ...draftAi, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                  />
                </label>
                <label>
                  Model 名称
                  <input
                    value={draftAi.model}
                    onChange={(e) => setDraftAi({ ...draftAi, model: e.target.value })}
                    placeholder="gpt-4o-mini / deepseek-chat"
                  />
                </label>
                <label className="full-span">
                  API Key（仅存当前浏览器 localStorage）
                  <input
                    type="password"
                    value={draftAi.apiKey}
                    onChange={(e) => setDraftAi({ ...draftAi, apiKey: e.target.value })}
                    placeholder="sk-..."
                  />
                </label>
              </div>
            )}
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draftAi.autoSnapExactMatch}
                onChange={(e) => setDraftAi({ ...draftAi, autoSnapExactMatch: e.target.checked })}
              />
              连接型插头精确命中库中概念时，按回车自动触发磁吸动画
            </label>
          </section>

          <section className="settings-section">
            <h4>2. 自定义 7 个插头名称（对应视频中的概念方向）</h4>
            <div className="plug-edit-list">
              {draftPlugs.map((plug, idx) => (
                <div key={plug.id} className="plug-edit-row">
                  <span className="plug-edit-id">{plug.id}</span>
                  <input
                    value={plug.shortLabel}
                    onChange={(e) => {
                      const next = [...draftPlugs];
                      next[idx] = { ...next[idx], shortLabel: e.target.value };
                      setDraftPlugs(next);
                    }}
                  />
                  <input
                    value={plug.name}
                    onChange={(e) => {
                      const next = [...draftPlugs];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setDraftPlugs(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="settings-section">
            <h4>3. 跨电脑同步（JSON 整库导入/导出）</h4>
            <div className="sync-btn-row">
              <button type="button" onClick={onExportWorkspace}><Download size={14} /> 导出整库 (.json)</button>
              <label className="import-label-btn">
                <Upload size={14} /> 导入整库 (.json)
                <input type="file" accept=".json" hidden onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportWorkspace(f);
                  e.target.value = "";
                }} />
              </label>
              <button type="button" className="danger-outline-btn" onClick={() => {
                if (window.confirm("确定重置为初始 Vedānta 示例工程吗？")) { onResetDemo(); onClose(); }
              }}>
                <RotateCcw size={14} /> 恢复示例工程
              </button>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>取消</button>
          <button type="button" className="primary-compile-btn" onClick={() => {
            onSaveAiSettings(draftAi);
            onSavePlugDefinitions(draftPlugs);
            onClose();
          }}>
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

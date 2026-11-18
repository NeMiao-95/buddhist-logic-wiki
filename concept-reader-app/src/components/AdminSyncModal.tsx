import React, { useState } from "react";
import { CloudDownload, CloudUpload, KeyRound, LogOut, ShieldCheck, X } from "lucide-react";
import { AdminSyncConfig } from "../types/schema";

interface AdminSyncModalProps {
  adminConfig: AdminSyncConfig;
  syncStatus: "idle" | "syncing" | "ok" | "error";
  syncMessage: string;
  onLogin: (token: string, gistId: string, pullImmediately: boolean) => Promise<void>;
  onPushNow: () => Promise<void>;
  onPullNow: () => Promise<void>;
  onToggleAutoSync: (enabled: boolean) => void;
  onLogout: (resetLocal: boolean) => void;
  onClose: () => void;
}

export const AdminSyncModal: React.FC<AdminSyncModalProps> = ({
  adminConfig, syncStatus, syncMessage, onLogin, onPushNow, onPullNow, onToggleAutoSync, onLogout, onClose,
}) => {
  const [tokenInput, setTokenInput] = useState("");
  const [gistInput, setGistInput] = useState(adminConfig.gistId || "");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const isLoggedIn = Boolean(adminConfig.token.trim());

  const handleLogin = async (pullNow: boolean) => {
    if (!tokenInput.trim()) { setLocalError("请输入 GitHub Token"); return; }
    setBusy(true);
    setLocalError("");
    try {
      await onLogin(tokenInput.trim(), gistInput.trim(), pullNow);
      setTokenInput("");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3><KeyRound size={16} /> 管理者私有云同步通道</h3>
            <p className="admin-sub">基于你个人的 GitHub Secret Gist 加密存取，访客完全不可见。</p>
          </div>
          <button type="button" className="icon-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body settings-body">
          {!isLoggedIn ? (
            <section className="settings-section">
              <h4>管理者登录（任意电脑接续阅读）</h4>
              <p className="admin-guide">
                只需一个仅勾选 <code>gist</code> 权限的 GitHub Token：
                <a href="https://github.com/settings/tokens/new?description=ConceptPlug-Reader&scopes=gist" target="_blank" rel="noreferrer"> 点此生成 Token →</a>
              </p>
              <div className="form-grid">
                <label className="full-span">
                  GitHub Personal Access Token（仅存本地浏览器）
                  <input type="password" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="ghp_... 或 github_pat_..." />
                </label>
                <label className="full-span">
                  私有 Gist ID（留空则自动查找或首次自动创建）
                  <input type="text" value={gistInput} onChange={(e) => setGistInput(e.target.value)} placeholder="留空自动识别" />
                </label>
              </div>
              {localError && <p className="admin-error">{localError}</p>}
              <div className="sync-btn-row" style={{ marginTop: 12 }}>
                <button type="button" className="primary-compile-btn" disabled={busy} onClick={() => handleLogin(true)}>
                  <CloudDownload size={14} /> {busy ? "连接中..." : "登录并拉取云端进度"}
                </button>
                <button type="button" className="secondary-btn" disabled={busy} onClick={() => handleLogin(false)}>
                  仅登录（保留本机进度）
                </button>
              </div>
            </section>
          ) : (
            <section className="settings-section">
              <div className="admin-status-card">
                <div className="admin-user-row">
                  <ShieldCheck size={16} color="#059669" />
                  <strong>已登录管理者：@{adminConfig.username || "Admin"}</strong>
                </div>
                <p>私有 Gist ID：<code>{adminConfig.gistId || "（首次上传时自动创建）"}</code></p>
                <p>最近同步：{adminConfig.lastSyncedAt ? new Date(adminConfig.lastSyncedAt).toLocaleString() : "尚未同步"}</p>
                {syncMessage && <p className={syncStatus === "error" ? "admin-error" : "admin-ok"}>{syncMessage}</p>}
              </div>

              <label className="checkbox-row">
                <input type="checkbox" checked={adminConfig.autoSync} onChange={(e) => onToggleAutoSync(e.target.checked)} />
                每次修改笔记/书库后自动静默同步到云端（防抖 2.5 秒）
              </label>

              <div className="sync-btn-row" style={{ marginTop: 12 }}>
                <button type="button" className="primary-compile-btn" disabled={syncStatus === "syncing"} onClick={onPushNow}>
                  <CloudUpload size={14} /> 立即保存到云端
                </button>
                <button type="button" className="secondary-btn" disabled={syncStatus === "syncing" || !adminConfig.gistId} onClick={onPullNow}>
                  <CloudDownload size={14} /> 从云端拉取覆盖本机
                </button>
              </div>

              <div className="sync-btn-row" style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                <button type="button" className="danger-outline-btn" onClick={() => { onLogout(false); onClose(); }}>
                  <LogOut size={14} /> 仅退出登录
                </button>
                <button type="button" className="danger-outline-btn" onClick={() => {
                  if (window.confirm("确定退出并清空本机记录回到初始示例吗？（适合公共电脑）")) { onLogout(true); onClose(); }
                }}>
                  <LogOut size={14} /> 退出并清空本机痕迹
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

import { useEffect, useRef, useState } from "react";
import {
  pullWorkspaceFromGist,
  pushWorkspaceToGist,
  verifyAdminTokenAndDiscoverGist,
} from "../services/gistSync";
import {
  clearAdminSync,
  DEFAULT_ADMIN_CONFIG,
  loadAdminSync,
  saveAdminSync,
} from "../services/storage";
import { AdminSyncConfig, WorkspaceData } from "../types/schema";

export function useAdminSync(
  workspace: WorkspaceData,
  applyWorkspaceFromCloud: (ws: WorkspaceData) => void,
  resetLocalDemo: () => void
) {
  const [adminConfig, setAdminConfig] = useState<AdminSyncConfig>(() => loadAdminSync());
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "ok" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const isFirstRender = useRef(true);
  const skipNextAutoPush = useRef(false);

  useEffect(() => {
    if (adminConfig.token) saveAdminSync(adminConfig);
  }, [adminConfig]);

  const pushNow = async (cfg = adminConfig) => {
    if (!cfg.token) return;
    setSyncStatus("syncing");
    setSyncMessage("正在上传至私有云端...");
    try {
      const res = await pushWorkspaceToGist(cfg.token, cfg.gistId, workspace);
      setAdminConfig((p) => ({ ...p, gistId: res.gistId, lastSyncedAt: res.syncedAt }));
      setSyncStatus("ok");
      setSyncMessage(`已同步 (${new Date(res.syncedAt).toLocaleTimeString()})`);
    } catch (err) {
      setSyncStatus("error");
      setSyncMessage(err instanceof Error ? err.message : "上传失败");
    }
  };

  const pullNow = async (cfg = adminConfig) => {
    if (!cfg.token || !cfg.gistId) return;
    setSyncStatus("syncing");
    setSyncMessage("正在拉取云端存档...");
    try {
      const res = await pullWorkspaceFromGist(cfg.token, cfg.gistId);
      skipNextAutoPush.current = true;
      applyWorkspaceFromCloud(res.workspace);
      setAdminConfig((p) => ({ ...p, lastSyncedAt: res.syncedAt || new Date().toISOString() }));
      setSyncStatus("ok");
      setSyncMessage("已恢复云端读书进度");
    } catch (err) {
      setSyncStatus("error");
      setSyncMessage(err instanceof Error ? err.message : "拉取失败");
    }
  };

  const login = async (token: string, explicitGistId: string, pullImmediately: boolean) => {
    const info = await verifyAdminTokenAndDiscoverGist(token, explicitGistId);
    const nextCfg: AdminSyncConfig = {
      token,
      gistId: info.gistId,
      username: info.username,
      autoSync: adminConfig.autoSync,
    };
    setAdminConfig(nextCfg);
    saveAdminSync(nextCfg);
    if (pullImmediately && info.gistId) {
      await pullNow(nextCfg);
    } else if (!info.gistId) {
      setSyncStatus("ok");
      setSyncMessage("登录成功（云端暂无旧存档，首次保存将自动新建私有 Gist）");
    } else {
      setSyncStatus("ok");
      setSyncMessage(`已连接 @${info.username}`);
    }
  };

  const logout = (resetLocal: boolean) => {
    clearAdminSync();
    setAdminConfig(DEFAULT_ADMIN_CONFIG);
    setSyncStatus("idle");
    setSyncMessage("");
    if (resetLocal) resetLocalDemo();
  };

  // Debounced auto-sync when logged in as admin
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (skipNextAutoPush.current) {
      skipNextAutoPush.current = false;
      return;
    }
    if (!adminConfig.token || !adminConfig.autoSync) return;

    const timer = setTimeout(() => {
      void pushNow(adminConfig);
    }, 2500);
    return () => clearTimeout(timer);
  }, [workspace, adminConfig.token, adminConfig.autoSync]);

  return {
    adminConfig,
    syncStatus,
    syncMessage,
    login,
    pushNow: () => pushNow(adminConfig),
    pullNow: () => pullNow(adminConfig),
    toggleAutoSync: (enabled: boolean) => setAdminConfig((p) => ({ ...p, autoSync: enabled })),
    logout,
  };
}

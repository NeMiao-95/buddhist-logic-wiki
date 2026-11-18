import { createDemoWorkspace, DEFAULT_AI_SETTINGS } from "../data/demoWorkspace";
import { AdminSyncConfig, AiSettings, WorkspaceData } from "../types/schema";

const WORKSPACE_KEY = "concept_plug_reader_workspace_v1";
const SETTINGS_KEY = "concept_plug_reader_settings_v1";
const ADMIN_KEY = "concept_plug_reader_admin_v1";

export const DEFAULT_ADMIN_CONFIG: AdminSyncConfig = {
  token: "",
  gistId: "",
  autoSync: true,
};

export function loadWorkspace(): WorkspaceData {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return createDemoWorkspace();
    const parsed = JSON.parse(raw) as WorkspaceData;
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.plugDefinitions)) {
      return createDemoWorkspace();
    }
    return parsed;
  } catch {
    return createDemoWorkspace();
  }
}

export function saveWorkspace(data: WorkspaceData): void {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function downloadWorkspaceJson(workspace: WorkspaceData): void {
  const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `concept-plug-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseWorkspaceJsonFile(file: File): Promise<WorkspaceData | null> {
  try {
    const parsed = JSON.parse(await file.text()) as WorkspaceData;
    if (Array.isArray(parsed.nodes) && Array.isArray(parsed.plugDefinitions)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadAdminSync(): AdminSyncConfig {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) return DEFAULT_ADMIN_CONFIG;
    return { ...DEFAULT_ADMIN_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ADMIN_CONFIG;
  }
}

export function saveAdminSync(config: AdminSyncConfig): void {
  try {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(config));
  } catch {
    // Ignore quota errors
  }
}

export function clearAdminSync(): void {
  try {
    localStorage.removeItem(ADMIN_KEY);
  } catch {
    // Ignore
  }
}

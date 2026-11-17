import { WorkspaceData } from "../types/schema";

export const SYNC_FILENAME = "concept-plug-reader-sync.json";
const GH_API = "https://api.github.com";

function ghHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token.trim()}`,
    "Content-Type": "application/json",
  };
}

export async function verifyAdminTokenAndDiscoverGist(
  token: string,
  explicitGistId?: string
): Promise<{ username: string; gistId: string }> {
  const userRes = await fetch(`${GH_API}/user`, { headers: ghHeaders(token) });
  if (!userRes.ok) {
    throw new Error(`GitHub 验证失败 (${userRes.status})，请检查 Token 是否有效且包含 gist 权限`);
  }
  const userData = await userRes.json();
  const username = String(userData.login || "admin");

  if (explicitGistId?.trim()) {
    const gRes = await fetch(`${GH_API}/gists/${explicitGistId.trim()}`, {
      headers: ghHeaders(token),
    });
    if (!gRes.ok) {
      throw new Error(`找不到指定 Gist (${gRes.status})`);
    }
    return { username, gistId: explicitGistId.trim() };
  }

  // Auto-discover existing secret sync gist by filename
  const listRes = await fetch(`${GH_API}/gists?per_page=100`, {
    headers: ghHeaders(token),
  });
  if (listRes.ok) {
    const gists = (await listRes.json()) as Array<{
      id: string;
      files?: Record<string, unknown>;
    }>;
    const found = gists.find((g) => g.files && SYNC_FILENAME in g.files);
    if (found) {
      return { username, gistId: found.id };
    }
  }

  return { username, gistId: "" };
}

export async function pushWorkspaceToGist(
  token: string,
  gistId: string | undefined,
  workspace: WorkspaceData
): Promise<{ gistId: string; syncedAt: string }> {
  const syncedAt = new Date().toISOString();
  const content = JSON.stringify({ syncedAt, workspace }, null, 2);
  const body = JSON.stringify({
    description: "ConceptPlug Reader Private Cloud Sync (Admin Only)",
    public: false,
    files: { [SYNC_FILENAME]: { content } },
  });

  const targetUrl = gistId?.trim()
    ? `${GH_API}/gists/${gistId.trim()}`
    : `${GH_API}/gists`;
  const method = gistId?.trim() ? "PATCH" : "POST";

  const res = await fetch(targetUrl, {
    method,
    headers: ghHeaders(token),
    body,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`上传云端失败 (${res.status}): ${msg.slice(0, 120)}`);
  }
  const data = await res.json();
  return { gistId: String(data.id), syncedAt };
}

export async function pullWorkspaceFromGist(
  token: string,
  gistId: string
): Promise<{ workspace: WorkspaceData; syncedAt?: string }> {
  const res = await fetch(`${GH_API}/gists/${gistId.trim()}`, {
    headers: ghHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`拉取云端失败 (${res.status})`);
  }
  const data = await res.json();
  const fileObj = data.files?.[SYNC_FILENAME];
  if (!fileObj) {
    throw new Error(`Gist 中未找到 ${SYNC_FILENAME}`);
  }

  let rawContent: string = fileObj.content || "";
  if (fileObj.truncated && fileObj.raw_url) {
    const rawRes = await fetch(fileObj.raw_url);
    rawContent = await rawRes.text();
  }

  const parsed = JSON.parse(rawContent);
  const ws: WorkspaceData = parsed.workspace ? parsed.workspace : parsed;
  if (!ws || !Array.isArray(ws.nodes) || !Array.isArray(ws.plugDefinitions)) {
    throw new Error("云端数据格式无效");
  }
  return { workspace: ws, syncedAt: parsed.syncedAt };
}

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { AdminSyncModal } from "./components/AdminSyncModal";
import { BookLibraryPanel } from "./components/BookLibraryPanel";
import { ConceptCanvas } from "./components/ConceptCanvas";
import { PlugInspectorDrawer } from "./components/PlugInspectorDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { SummaryCompilerModal } from "./components/SummaryCompilerModal";
import { TopBar } from "./components/TopBar";
import { useWorkspaceController } from "./hooks/useWorkspaceController";
import { downloadWorkspaceJson, parseWorkspaceJsonFile } from "./services/storage";

export default function App() {
  const ctrl = useWorkspaceController();
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const selectedNode = ctrl.workspace.nodes.find((n) => n.id === ctrl.selectedNodeId) || null;

  return (
    <div className="app-shell">
      <TopBar onCreateNode={ctrl.addConceptNode} onOpenSettings={() => setShowSettings(true)} />
      {showGuide && (
        <div className="tip-banner">
          <span>💡 <strong>快速体验：</strong>点开 <strong>Vedānta</strong> 的 <strong>P1 归属</strong> 输入「印度哲学的学派」触发磁吸；点 <strong>P4/P5/P6</strong> 问 AI 书中短答；最后点「编译可复刻说明文」。</span>
          <button type="button" onClick={() => setShowGuide(false)}>收起提示</button>
        </div>
      )}
      <div className="workspace-grid">
        <BookLibraryPanel
          documents={ctrl.workspace.documents}
          onAddDocument={(title, role, content) =>
            ctrl.setWorkspace((p) => ({
              ...p,
              documents: [{ id: `doc_${Date.now()}`, title, role, content, createdAt: new Date().toISOString() }, ...p.documents],
            }))
          }
          onDeleteDocument={(docId) => ctrl.setWorkspace((p) => ({ ...p, documents: p.documents.filter((d) => d.id !== docId) }))}
        />
        <ConceptCanvas
          nodes={ctrl.workspace.nodes}
          edges={ctrl.workspace.edges}
          plugDefinitions={ctrl.workspace.plugDefinitions}
          selectedNodeId={ctrl.selectedNodeId}
          selectedPlugId={ctrl.selectedPlugId}
          highlightedNodeId={ctrl.highlightedNodeId}
          highlightedEdgeId={ctrl.highlightedEdgeId}
          magneticPulse={ctrl.magneticPulse}
          onSelectNodePlug={(nodeId, plugId) => {
            ctrl.setSelectedNodeId(nodeId);
            if (plugId) ctrl.setSelectedPlugId(plugId);
            ctrl.setHighlightedNodeId(null);
            ctrl.setHighlightedEdgeId(null);
          }}
          onMoveNode={(nodeId, x, y) =>
            ctrl.setWorkspace((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)) }))
          }
          onDeleteEdge={(edgeId) => ctrl.setWorkspace((p) => ({ ...p, edges: p.edges.filter((e) => e.id !== edgeId) }))}
        />
        {selectedNode && (
          <PlugInspectorDrawer
            node={selectedNode}
            allNodes={ctrl.workspace.nodes}
            plugDefinitions={ctrl.workspace.plugDefinitions}
            activePlugId={ctrl.selectedPlugId}
            chunks={ctrl.chunks}
            aiSettings={ctrl.aiSettings}
            onSelectPlug={ctrl.setSelectedPlugId}
            onToggleShape={ctrl.toggleShape}
            onUpdateAliases={ctrl.updateAliases}
            onAddFactEntry={ctrl.addFactEntry}
            onDeleteFactEntry={ctrl.deleteFactEntry}
            onMagneticLink={ctrl.magneticLink}
            onCreateAndLinkNode={ctrl.createAndLinkNode}
            onCompileSummary={ctrl.compileNodeSummary}
            onDeleteNode={ctrl.deleteNode}
          />
        )}
      </div>
      {ctrl.activeSummary && (
        <SummaryCompilerModal
          summary={ctrl.activeSummary}
          compiling={ctrl.compiling}
          onClose={() => ctrl.setActiveSummary(null)}
          onRecompile={() => ctrl.compileNodeSummary(ctrl.activeSummary!.nodeId)}
          onInspectCitation={ctrl.inspectCitation}
        />
      )}
      {showSettings && (
        <SettingsModal
          aiSettings={ctrl.aiSettings}
          plugDefinitions={ctrl.workspace.plugDefinitions}
          onSaveAiSettings={ctrl.setAiSettings}
          onSavePlugDefinitions={ctrl.updatePlugDefinitions}
          onExportWorkspace={() => downloadWorkspaceJson(ctrl.workspace)}
          onImportWorkspace={async (f) => {
            const parsed = await parseWorkspaceJsonFile(f);
            if (parsed) { ctrl.setWorkspace(parsed); ctrl.setSelectedNodeId(parsed.nodes[0]?.id || null); }
            else window.alert("导入失败：JSON 格式不符合工程结构。");
          }}
          onResetDemo={ctrl.resetDemo}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showAdmin && (
        <AdminSyncModal
          adminConfig={ctrl.adminSync.adminConfig}
          syncStatus={ctrl.adminSync.syncStatus}
          syncMessage={ctrl.adminSync.syncMessage}
          onLogin={ctrl.adminSync.login}
          onPushNow={ctrl.adminSync.pushNow}
          onPullNow={ctrl.adminSync.pullNow}
          onToggleAutoSync={ctrl.adminSync.toggleAutoSync}
          onLogout={ctrl.adminSync.logout}
          onClose={() => setShowAdmin(false)}
        />
      )}
      <button
        type="button"
        className={`admin-corner-btn ${ctrl.adminSync.adminConfig.token ? "logged-in" : ""}`}
        onClick={() => setShowAdmin(true)}
        title="管理者私有云同步通道"
      >
        <KeyRound size={12} />
        {ctrl.adminSync.adminConfig.token
          ? ctrl.adminSync.syncStatus === "syncing"
            ? "同步中..."
            : `管理者 @${ctrl.adminSync.adminConfig.username || "Admin"}`
          : "管理者"}
      </button>
    </div>
  );
}

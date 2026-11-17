import React, { useState } from "react";
import { Circle, FileText, Square, Trash2 } from "lucide-react";
import {
  AiSettings,
  ConceptNode,
  DocumentChunk,
  FactEntry,
  PlugDefinition,
  PlugId,
} from "../types/schema";
import { PlugAiQueryBox } from "./PlugAiQueryBox";
import { PlugEntryList } from "./PlugEntryList";
import { PlugLinkInputBox } from "./PlugLinkInputBox";

interface PlugInspectorDrawerProps {
  node: ConceptNode;
  allNodes: ConceptNode[];
  plugDefinitions: PlugDefinition[];
  activePlugId: PlugId;
  chunks: DocumentChunk[];
  aiSettings: AiSettings;
  onSelectPlug: (plugId: PlugId) => void;
  onToggleShape: (nodeId: string) => void;
  onUpdateAliases: (nodeId: string, aliases: string[]) => void;
  onAddFactEntry: (
    nodeId: string,
    plugId: PlugId,
    text: string,
    sourceRef?: FactEntry["sourceRef"],
    linkedNodeId?: string
  ) => void;
  onDeleteFactEntry: (nodeId: string, plugId: PlugId, entryId: string) => void;
  onMagneticLink: (
    fromNodeId: string,
    fromPlugId: PlugId,
    toNodeId: string,
    relationLabel: string,
    entryText: string
  ) => void;
  onCreateAndLinkNode: (
    fromNodeId: string,
    fromPlugId: PlugId,
    newLabel: string,
    relationLabel: string
  ) => void;
  onCompileSummary: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const PlugInspectorDrawer: React.FC<PlugInspectorDrawerProps> = ({
  node,
  allNodes,
  plugDefinitions,
  activePlugId,
  chunks,
  aiSettings,
  onSelectPlug,
  onToggleShape,
  onUpdateAliases,
  onAddFactEntry,
  onDeleteFactEntry,
  onMagneticLink,
  onCreateAndLinkNode,
  onCompileSummary,
  onDeleteNode,
}) => {
  const [aliasDraft, setAliasDraft] = useState(node.aliases.join("、"));
  const [editingAlias, setEditingAlias] = useState(false);

  const activePlug = plugDefinitions.find((p) => p.id === activePlugId) || plugDefinitions[0];
  const entries = node.plugs[activePlug.id] || [];

  return (
    <aside className="inspector-drawer">
      <div className="inspector-header">
        <div>
          <div className="inspector-title-row">
            <h2>{node.label}</h2>
            <button type="button" className="icon-pill-btn" onClick={() => onToggleShape(node.id)}>
              {node.shape === "circle" ? <Circle size={14} /> : <Square size={14} />}
              {node.shape === "circle" ? "圆圈" : "方格"}
            </button>
          </div>
          {editingAlias ? (
            <div className="alias-edit-row">
              <input value={aliasDraft} onChange={(e) => setAliasDraft(e.target.value)} />
              <button
                type="button"
                onClick={() => {
                  onUpdateAliases(
                    node.id,
                    aliasDraft.split(/[,，、;；]/).map((s) => s.trim()).filter(Boolean)
                  );
                  setEditingAlias(false);
                }}
              >
                保存
              </button>
            </div>
          ) : (
            <p className="alias-caption" onClick={() => { setAliasDraft(node.aliases.join("、")); setEditingAlias(true); }}>
              别名：{node.aliases.length > 0 ? node.aliases.join(" / ") : "点击添加别名"}
            </p>
          )}
        </div>
        <div className="inspector-actions">
          <button type="button" className="primary-compile-btn" onClick={() => onCompileSummary(node.id)}>
            <FileText size={15} /> 编译可复刻说明文
          </button>
          <button
            type="button"
            className="danger-icon-btn"
            onClick={() => {
              if (window.confirm(`确定删除概念「${node.label}」及其连线吗？`)) onDeleteNode(node.id);
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="plug-tabs">
        {plugDefinitions.map((p) => {
          const count = (node.plugs[p.id] || []).length;
          return (
            <button
              key={p.id}
              type="button"
              className={`plug-tab ${activePlug.id === p.id ? "active" : ""} ${count > 0 ? "has-data" : ""}`}
              onClick={() => onSelectPlug(p.id)}
            >
              <span className="plug-tab-id">{p.id}</span>
              <span>{p.shortLabel}</span>
              {count > 0 && <span className="plug-badge">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="plug-body">
        <div className="plug-meta-box">
          <div className="plug-meta-title">
            <strong>{activePlug.id} · {activePlug.name}</strong>
            <span className={`kind-tag kind-${activePlug.kind}`}>
              {activePlug.kind === "link" ? "🔗 连接型" : activePlug.kind === "hybrid" ? "🔀 混合型" : "📝 记录型"}
            </span>
          </div>
          <p className="plug-hint">{activePlug.promptHint}</p>
        </div>

        <PlugLinkInputBox
          key={`${node.id}_${activePlug.id}_in`}
          node={node}
          allNodes={allNodes}
          activePlug={activePlug}
          aiSettings={aiSettings}
          onAddPlain={(text) => onAddFactEntry(node.id, activePlug.id, text)}
          onMagneticLink={onMagneticLink}
          onCreateAndLinkNode={onCreateAndLinkNode}
        />

        <PlugAiQueryBox
          key={`${node.id}_${activePlug.id}_ai`}
          node={node}
          activePlug={activePlug}
          chunks={chunks}
          aiSettings={aiSettings}
          onAdoptAnswer={(text, sourceRef) => onAddFactEntry(node.id, activePlug.id, text, sourceRef)}
        />

        <PlugEntryList
          entries={entries}
          onDelete={(entryId) => onDeleteFactEntry(node.id, activePlug.id, entryId)}
        />
      </div>
    </aside>
  );
};

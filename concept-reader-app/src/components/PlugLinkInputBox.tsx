import React, { useMemo, useState } from "react";
import { Link2, Magnet, Plus } from "lucide-react";
import { AiSettings, ConceptNode, PlugDefinition, PlugId } from "../types/schema";
import { findMatchingNodes } from "../engine/normalize";

interface PlugLinkInputBoxProps {
  node: ConceptNode;
  allNodes: ConceptNode[];
  activePlug: PlugDefinition;
  aiSettings: AiSettings;
  onAddPlain: (text: string) => void;
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
}

export const PlugLinkInputBox: React.FC<PlugLinkInputBoxProps> = ({
  node,
  allNodes,
  activePlug,
  aiSettings,
  onAddPlain,
  onMagneticLink,
  onCreateAndLinkNode,
}) => {
  const [inputText, setInputText] = useState("");
  const isLinkPlug = activePlug.kind === "link" || activePlug.kind === "hybrid";

  const matchCandidates = useMemo(() => {
    if (!isLinkPlug || !inputText.trim()) return [];
    return findMatchingNodes(inputText, allNodes, node.id);
  }, [inputText, isLinkPlug, allNodes, node.id]);

  const exactMatch = matchCandidates.find(
    (m) => m.matchType === "exact" || m.matchType === "alias"
  );

  const handleSave = () => {
    const clean = inputText.trim();
    if (!clean) return;
    if (isLinkPlug && exactMatch && aiSettings.autoSnapExactMatch) {
      onMagneticLink(node.id, activePlug.id, exactMatch.node.id, activePlug.relationVerb, clean);
      setInputText("");
      return;
    }
    onAddPlain(clean);
    setInputText("");
  };

  return (
    <div className="card-block">
      <label className="block-label">
        写入插头{isLinkPlug ? "（输入已有概念将触发磁吸）" : ""}
      </label>
      <div className="input-action-row">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder={activePlug.id === "P1" ? "试试输入：印度哲学的学派" : "输入简短记录..."}
        />
        <button type="button" onClick={handleSave}>
          <Plus size={15} /> 写入
        </button>
      </div>

      {isLinkPlug && matchCandidates.length > 0 && (
        <div className="magnet-detect-box">
          <div className="magnet-detect-header">
            <Magnet size={15} />
            <span>检测到库中已有概念，可立即磁吸：</span>
          </div>
          {matchCandidates.map((cand) => (
            <div key={cand.node.id} className="magnet-candidate-row">
              <span>
                <strong>{cand.node.label}</strong>{" "}
                <small>
                  ({cand.matchType === "fuzzy" ? `近似 ${Math.round(cand.score * 100)}%` : "精确命中"})
                </small>
              </span>
              <button
                type="button"
                className="magnet-snap-btn"
                onClick={() => {
                  onMagneticLink(
                    node.id,
                    activePlug.id,
                    cand.node.id,
                    activePlug.relationVerb,
                    inputText.trim() || cand.node.label
                  );
                  setInputText("");
                }}
              >
                <Magnet size={13} /> 立即磁吸过去
              </button>
            </div>
          ))}
        </div>
      )}

      {isLinkPlug && inputText.trim().length >= 2 && !exactMatch && (
        <button
          type="button"
          className="create-link-subbtn"
          onClick={() => {
            onCreateAndLinkNode(node.id, activePlug.id, inputText.trim(), activePlug.relationVerb);
            setInputText("");
          }}
        >
          <Link2 size={13} /> 库中尚无「{inputText.trim()}」，新建节点并磁吸连线
        </button>
      )}
    </div>
  );
};

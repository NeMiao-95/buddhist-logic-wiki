import React from "react";
import { ConceptNode, PlugDefinition, PlugId } from "../types/schema";

export function getPlugTipOffset(
  shape: "circle" | "rect",
  angleDeg: number
): { sx: number; sy: number; tx: number; ty: number; lx: number; ly: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const baseR =
    shape === "circle"
      ? 48
      : Math.min(
          50 / Math.max(Math.abs(cos), 0.001),
          42 / Math.max(Math.abs(sin), 0.001)
        );
  const clampedBase = Math.min(baseR, 56);
  const stalkLen = 30;
  const labelDist = clampedBase + stalkLen + 18;

  return {
    sx: cos * clampedBase,
    sy: sin * clampedBase,
    tx: cos * (clampedBase + stalkLen),
    ty: sin * (clampedBase + stalkLen),
    lx: cos * labelDist,
    ly: sin * labelDist,
  };
}

interface ConceptNodeItemProps {
  node: ConceptNode;
  plugDefinitions: PlugDefinition[];
  isSelected: boolean;
  isHighlighted: boolean;
  selectedPlugId: PlugId | null;
  onSelectPlug: (nodeId: string, plugId: PlugId) => void;
  onStartDragNode: (e: React.MouseEvent, node: ConceptNode) => void;
}

export const ConceptNodeItem: React.FC<ConceptNodeItemProps> = ({
  node,
  plugDefinitions,
  isSelected,
  isHighlighted,
  selectedPlugId,
  onSelectPlug,
  onStartDragNode,
}) => {
  const totalFacts = Object.values(node.plugs).reduce(
    (acc, arr) => acc + arr.length,
    0
  );

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className={`concept-node ${isSelected ? "selected" : ""} ${
        isHighlighted ? "highlighted" : ""
      }`}
    >
      {plugDefinitions.map((plug) => {
        const entries = node.plugs[plug.id] || [];
        const filled = entries.length > 0;
        const isPlugSelected = isSelected && selectedPlugId === plug.id;
        const tip = getPlugTipOffset(node.shape, plug.angleDeg);
        const isLinkType = plug.kind === "link" || plug.kind === "hybrid";

        return (
          <g
            key={plug.id}
            className={`plug-arm ${filled ? "filled" : "empty"} ${
              isPlugSelected ? "plug-selected" : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectPlug(node.id, plug.id);
            }}
          >
            <line
              x1={tip.sx}
              y1={tip.sy}
              x2={tip.tx}
              y2={tip.ty}
              className="plug-stalk"
            />
            {isLinkType ? (
              <g transform={`translate(${tip.tx}, ${tip.ty})`}>
                <circle r={9.5} className="plug-socket-outer" />
                <circle r={4} className="plug-socket-core" />
              </g>
            ) : (
              <rect
                x={tip.tx - 8}
                y={tip.ty - 8}
                width={16}
                height={16}
                rx={4}
                className="plug-record-head"
              />
            )}
            <text
              x={tip.lx}
              y={tip.ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="plug-label-text"
            >
              {plug.id} {plug.shortLabel}
              {filled ? `(${entries.length})` : ""}
            </text>
          </g>
        );
      })}

      <g
        className="node-body-hit"
        onMouseDown={(e) => onStartDragNode(e, node)}
      >
        {node.shape === "circle" ? (
          <circle r={48} className="node-shape" />
        ) : (
          <rect
            x={-52}
            y={-42}
            width={104}
            height={84}
            rx={14}
            className="node-shape"
          />
        )}
        <text textAnchor="middle" dy="-2" className="node-title">
          {node.label.length > 12 ? node.label.slice(0, 11) + "…" : node.label}
        </text>
        <text textAnchor="middle" dy="18" className="node-submeta">
          {totalFacts} 条记录
        </text>
      </g>
    </g>
  );
};

import React from "react";
import { ConceptEdge, ConceptNode, PlugDefinition } from "../types/schema";
import { getPlugTipOffset } from "./ConceptNodeItem";

interface ConceptEdgeItemProps {
  edge: ConceptEdge;
  fromNode: ConceptNode;
  toNode: ConceptNode;
  plugDef: PlugDefinition;
  isHighlighted: boolean;
  onDeleteEdge: (edgeId: string) => void;
}

export const ConceptEdgeItem: React.FC<ConceptEdgeItemProps> = ({
  edge,
  fromNode,
  toNode,
  plugDef,
  isHighlighted,
  onDeleteEdge,
}) => {
  const tip = getPlugTipOffset(fromNode.shape, plugDef.angleDeg);
  const x1 = fromNode.x + tip.tx;
  const y1 = fromNode.y + tip.ty;

  const angleToTarget = Math.atan2(y1 - toNode.y, x1 - toNode.x);
  const targetRadius = toNode.shape === "circle" ? 52 : 54;
  const x2 = toNode.x + Math.cos(angleToTarget) * targetRadius;
  const y2 = toNode.y + Math.sin(angleToTarget) * targetRadius;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 22;

  return (
    <g className="edge-group">
      <path
        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
        fill="none"
        stroke={isHighlighted ? "#ea580c" : "#4f46e5"}
        strokeWidth={isHighlighted ? 3.2 : 2.2}
        markerEnd={isHighlighted ? "url(#arrowHeadHi)" : "url(#arrowHead)"}
      />
      <g
        transform={`translate(${mx}, ${my})`}
        className="edge-label-pill"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`确定断开「${fromNode.label} -> ${toNode.label}」连线吗？`)) {
            onDeleteEdge(edge.id);
          }
        }}
      >
        <rect x="-34" y="-11" width="68" height="22" rx="11" />
        <text textAnchor="middle" dy="4">
          {edge.relationLabel}
        </text>
      </g>
    </g>
  );
};

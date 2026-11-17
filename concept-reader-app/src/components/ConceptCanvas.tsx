import React, { useRef, useState } from "react";
import { ConceptEdge, ConceptNode, PlugDefinition, PlugId } from "../types/schema";
import { ConceptEdgeItem } from "./ConceptEdgeItem";
import { ConceptNodeItem } from "./ConceptNodeItem";

export interface MagneticPulse {
  fromNodeId: string;
  toNodeId: string;
  fromPlugId: PlugId;
}

interface ConceptCanvasProps {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  plugDefinitions: PlugDefinition[];
  selectedNodeId: string | null;
  selectedPlugId: PlugId | null;
  highlightedNodeId: string | null;
  highlightedEdgeId: string | null;
  magneticPulse: MagneticPulse | null;
  onSelectNodePlug: (nodeId: string, plugId: PlugId | null) => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export const ConceptCanvas: React.FC<ConceptCanvasProps> = ({
  nodes,
  edges,
  plugDefinitions,
  selectedNodeId,
  selectedPlugId,
  highlightedNodeId,
  highlightedEdgeId,
  magneticPulse,
  onSelectNodePlug,
  onMoveNode,
  onDeleteEdge,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pan, setPan] = useState({ x: 15, y: 0 });
  const [zoom, setZoom] = useState(0.95);
  const [drag, setDrag] = useState<
    | { type: "pan"; sx: number; sy: number; ox: number; oy: number }
    | { type: "node"; id: string; sx: number; sy: number; ox: number; oy: number }
    | null
  >(null);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const handleDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).dataset.bg === "true") {
      setDrag({ type: "pan", sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y });
    }
  };

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drag) return;
    if (drag.type === "pan") {
      setPan({ x: drag.ox + (e.clientX - drag.sx), y: drag.oy + (e.clientY - drag.sy) });
    } else {
      onMoveNode(drag.id, drag.ox + (e.clientX - drag.sx) / zoom, drag.oy + (e.clientY - drag.sy) / zoom);
    }
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.max(0.45, Math.min(2.1, Number((z * factor).toFixed(2)))));
  };

  return (
    <div className="canvas-wrapper">
      <div className="canvas-hud">
        <span>滚轮缩放 ({Math.round(zoom * 100)}%) · 拖动画布平移 · 点击插头填入或问 AI</span>
        <button type="button" className="hud-reset-btn" onClick={() => { setPan({ x: 40, y: 10 }); setZoom(1); }}>
          重置视角
        </button>
      </div>
      <svg
        ref={svgRef}
        className="concept-svg"
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={() => setDrag(null)}
        onMouseLeave={() => setDrag(null)}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="dotGrid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.2" fill="#cbd5e1" opacity="0.7" />
          </pattern>
          <marker id="arrowHead" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
            <path d="M 0 1 L 8 4.5 L 0 8 z" fill="#4f46e5" />
          </marker>
          <marker id="arrowHeadHi" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#ea580c" />
          </marker>
        </defs>
        <rect data-bg="true" width="100%" height="100%" fill="url(#dotGrid)" />
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {magneticPulse &&
            (() => {
              const f = nodeMap.get(magneticPulse.fromNodeId);
              const t = nodeMap.get(magneticPulse.toNodeId);
              if (!f || !t) return null;
              return (
                <g className="magnetic-beam-group">
                  <circle cx={t.x} cy={t.y} r={76} className="magnetic-ring-outer" />
                  <circle cx={t.x} cy={t.y} r={58} className="magnetic-ring-inner" />
                  <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} className="magnetic-beam-line" />
                </g>
              );
            })()}
          {edges.map((edge) => {
            const fromN = nodeMap.get(edge.fromNodeId);
            const toN = nodeMap.get(edge.toNodeId);
            if (!fromN || !toN) return null;
            const plugDef = plugDefinitions.find((p) => p.id === edge.fromPlugId) || plugDefinitions[0];
            return (
              <ConceptEdgeItem
                key={edge.id}
                edge={edge}
                fromNode={fromN}
                toNode={toN}
                plugDef={plugDef}
                isHighlighted={highlightedEdgeId === edge.id}
                onDeleteEdge={onDeleteEdge}
              />
            );
          })}
          {nodes.map((node) => (
            <ConceptNodeItem
              key={node.id}
              node={node}
              plugDefinitions={plugDefinitions}
              isSelected={selectedNodeId === node.id}
              isHighlighted={highlightedNodeId === node.id}
              selectedPlugId={selectedPlugId}
              onSelectPlug={(nid, pid) => onSelectNodePlug(nid, pid)}
              onStartDragNode={(e, n) => {
                e.stopPropagation();
                onSelectNodePlug(n.id, selectedPlugId);
                setDrag({ type: "node", id: n.id, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y });
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};

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
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; zoom: number; midX: number; midY: number; ox: number; oy: number } | null>(null);
  const [drag, setDrag] = useState<
    | { type: "pan"; sx: number; sy: number; ox: number; oy: number }
    | { type: "node"; id: string; sx: number; sy: number; ox: number; oy: number }
    | null
  >(null);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const startPinchIfTwo = () => {
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 2) {
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
      pinchRef.current = { dist, zoom, midX: (pts[0].x + pts[1].x) / 2, midY: (pts[0].y + pts[1].y) / 2, ox: pan.x, oy: pan.y };
      setDrag(null);
      return true;
    }
    return false;
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (startPinchIfTwo()) return;
    if (e.target === svgRef.current || (e.target as HTMLElement).dataset.bg === "true") {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      setDrag({ type: "pan", sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const nextZoom = Math.max(0.45, Math.min(2.1, Number((pinchRef.current.zoom * (dist / pinchRef.current.dist)).toFixed(2))));
      setZoom(nextZoom);
      setPan({ x: pinchRef.current.ox + (midX - pinchRef.current.midX), y: pinchRef.current.oy + (midY - pinchRef.current.midY) });
      return;
    }
    if (!drag) return;
    if (drag.type === "pan") {
      setPan({ x: drag.ox + (e.clientX - drag.sx), y: drag.oy + (e.clientY - drag.sy) });
    } else {
      onMoveNode(drag.id, drag.ox + (e.clientX - drag.sx) / zoom, drag.oy + (e.clientY - drag.sy) / zoom);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    setDrag(null);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.max(0.45, Math.min(2.1, Number((z * factor).toFixed(2)))));
  };

  return (
    <div className="canvas-wrapper">
      <div className="canvas-hud">
        <span className="hud-hint-pill">双指/滚轮缩放 ({Math.round(zoom * 100)}%) · Pencil/手指拖动 · 点插头提问</span>
        <div className="hud-zoom-group">
          <button type="button" className="hud-reset-btn" onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))))}>－</button>
          <button type="button" className="hud-reset-btn" onClick={() => setZoom((z) => Math.min(2.1, Number((z + 0.15).toFixed(2))))}>＋</button>
          <button type="button" className="hud-reset-btn" onClick={() => { setPan({ x: 15, y: 0 }); setZoom(0.95); }}>重置</button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="concept-svg"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
                pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
                try { svgRef.current?.setPointerCapture(e.pointerId); } catch {}
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

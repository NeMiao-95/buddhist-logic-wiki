import { createEmptyPlugs } from "../data/demoWorkspace";
import { ConceptEdge, ConceptNode, FactEntry, PlugId, WorkspaceData } from "../types/schema";

export function mutateAddNode(prev: WorkspaceData, label: string, shape: "circle" | "rect"): { next: WorkspaceData; id: string } {
  const id = `node_${Date.now()}`;
  const off = (prev.nodes.length % 5) * 42;
  const node: ConceptNode = {
    id, label: label.trim(), aliases: [], shape, x: 520 + off, y: 240 + off,
    plugs: createEmptyPlugs(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  return { next: { ...prev, nodes: [...prev.nodes, node] }, id };
}

export function mutateAddFact(
  prev: WorkspaceData, nodeId: string, plugId: PlugId, text: string, sourceRef?: FactEntry["sourceRef"], linkedNodeId?: string
): WorkspaceData {
  const entry: FactEntry = {
    id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    text, sourceRef, linkedNodeId, createdAt: new Date().toISOString(),
  };
  return {
    ...prev,
    nodes: prev.nodes.map((n) =>
      n.id === nodeId ? { ...n, updatedAt: new Date().toISOString(), plugs: { ...n.plugs, [plugId]: [...(n.plugs[plugId] || []), entry] } } : n
    ),
  };
}

export function mutateLinkNodes(
  prev: WorkspaceData, fromNodeId: string, fromPlugId: PlugId, toNodeId: string, relationLabel: string, entryText: string
): WorkspaceData {
  const exists = prev.edges.some((e) => e.fromNodeId === fromNodeId && e.fromPlugId === fromPlugId && e.toNodeId === toNodeId);
  const edge: ConceptEdge = { id: `edge_${Date.now()}`, fromNodeId, fromPlugId, toNodeId, relationLabel, createdAt: new Date().toISOString() };
  const entry: FactEntry = { id: `f_${Date.now()}`, text: entryText, linkedNodeId: toNodeId, createdAt: new Date().toISOString() };
  return {
    ...prev,
    edges: exists ? prev.edges : [...prev.edges, edge],
    nodes: prev.nodes.map((n) =>
      n.id === fromNodeId ? { ...n, plugs: { ...n.plugs, [fromPlugId]: [...(n.plugs[fromPlugId] || []), entry] } } : n
    ),
  };
}

export function mutateCreateAndLink(
  prev: WorkspaceData, fromNodeId: string, fromPlugId: PlugId, newLabel: string, relationLabel: string
): { next: WorkspaceData; newId: string } {
  const fromN = prev.nodes.find((n) => n.id === fromNodeId);
  const newId = `node_${Date.now()}`;
  const newNode: ConceptNode = {
    id: newId, label: newLabel, aliases: [], shape: "circle",
    x: (fromN?.x || 400) - 210, y: (fromN?.y || 300) - 90,
    plugs: createEmptyPlugs(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const edge: ConceptEdge = { id: `edge_${Date.now()}`, fromNodeId, fromPlugId, toNodeId: newId, relationLabel, createdAt: new Date().toISOString() };
  const entry: FactEntry = { id: `f_${Date.now()}`, text: newLabel, linkedNodeId: newId, createdAt: new Date().toISOString() };
  return {
    newId,
    next: {
      ...prev,
      edges: [...prev.edges, edge],
      nodes: [...prev.nodes, newNode].map((n) =>
        n.id === fromNodeId ? { ...n, plugs: { ...n.plugs, [fromPlugId]: [...(n.plugs[fromPlugId] || []), entry] } } : n
      ),
    },
  };
}

import { useEffect, useMemo, useRef, useState } from "react";
import { createDemoWorkspace } from "../data/demoWorkspace";
import { buildContextBundle } from "../engine/contextBundler";
import { mutateAddFact, mutateAddNode, mutateCreateAndLink, mutateLinkNodes } from "../engine/graphMutations";
import { buildAllChunks } from "../engine/localRag";
import { runSpringPullAnimation } from "../engine/magneticPhysics";
import { runSummaryCompiler } from "../engine/summaryCompiler";
import { callOpenAiCompatible } from "../services/llmClient";
import { loadAiSettings, loadWorkspace, saveAiSettings, saveWorkspace } from "../services/storage";
import { AiSettings, CompiledSummary, ConceptNode, FactEntry, PlugDefinition, PlugId, WorkspaceData } from "../types/schema";
import { MagneticPulse } from "../components/ConceptCanvas";

export function useWorkspaceController() {
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => loadWorkspace());
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadAiSettings());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node_vedanta");
  const [selectedPlugId, setSelectedPlugId] = useState<PlugId>("P1");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null);
  const [magneticPulse, setMagneticPulse] = useState<MagneticPulse | null>(null);
  const [activeSummary, setActiveSummary] = useState<CompiledSummary | null>(null);
  const [compiling, setCompiling] = useState(false);
  const stopAnimRef = useRef<(() => void) | null>(null);

  useEffect(() => saveWorkspace(workspace), [workspace]);
  useEffect(() => saveAiSettings(aiSettings), [aiSettings]);

  const chunks = useMemo(() => buildAllChunks(workspace.documents), [workspace.documents]);

  const triggerPull = (fromId: string, toId: string, plugId: PlugId, snapNodes: ConceptNode[]) => {
    stopAnimRef.current?.();
    const fromN = snapNodes.find((n) => n.id === fromId);
    const toN = snapNodes.find((n) => n.id === toId);
    if (!fromN || !toN) return;
    setMagneticPulse({ fromNodeId: fromId, toNodeId: toId, fromPlugId: plugId });
    stopAnimRef.current = runSpringPullAnimation(
      fromN, toN, snapNodes,
      (x, y) => setWorkspace((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === fromId ? { ...n, x, y } : n)) })),
      (x, y) => {
        setWorkspace((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === fromId ? { ...n, x, y } : n)) }));
        setTimeout(() => setMagneticPulse(null), 450);
      }
    );
  };

  return {
    workspace, setWorkspace, aiSettings, setAiSettings, chunks,
    selectedNodeId, setSelectedNodeId, selectedPlugId, setSelectedPlugId,
    highlightedNodeId, setHighlightedNodeId, highlightedEdgeId, setHighlightedEdgeId,
    magneticPulse, activeSummary, setActiveSummary, compiling,
    addConceptNode: (label: string, shape: "circle" | "rect") => {
      if (!label.trim()) return;
      const res = mutateAddNode(workspace, label, shape);
      setWorkspace(res.next);
      setSelectedNodeId(res.id);
      setSelectedPlugId("P1");
    },
    addFactEntry: (nodeId: string, plugId: PlugId, text: string, ref?: FactEntry["sourceRef"], lid?: string) =>
      setWorkspace((p) => mutateAddFact(p, nodeId, plugId, text, ref, lid)),
    magneticLink: (fromId: string, plugId: PlugId, toId: string, rel: string, text: string) => {
      setWorkspace((p) => mutateLinkNodes(p, fromId, plugId, toId, rel, text));
      triggerPull(fromId, toId, plugId, workspace.nodes);
    },
    createAndLinkNode: (fromId: string, plugId: PlugId, newLabel: string, rel: string) => {
      const res = mutateCreateAndLink(workspace, fromId, plugId, newLabel, rel);
      setWorkspace(res.next);
      setTimeout(() => triggerPull(fromId, res.newId, plugId, res.next.nodes), 40);
    },
    compileNodeSummary: async (nodeId: string) => {
      setCompiling(true);
      try {
        const bundle = buildContextBundle(nodeId, workspace.nodes, workspace.edges, workspace.plugDefinitions);
        const summary = await runSummaryCompiler(bundle, aiSettings, callOpenAiCompatible);
        setActiveSummary(summary);
        setWorkspace((p) => ({ ...p, summaries: { ...p.summaries, [nodeId]: summary } }));
      } finally {
        setCompiling(false);
      }
    },
    resetDemo: () => { setWorkspace(createDemoWorkspace()); setSelectedNodeId("node_vedanta"); setSelectedPlugId("P1"); },
    updatePlugDefinitions: (defs: PlugDefinition[]) => setWorkspace((p) => ({ ...p, plugDefinitions: defs })),
    toggleShape: (nid: string) =>
      setWorkspace((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === nid ? { ...n, shape: n.shape === "circle" ? "rect" : "circle" } : n)) })),
    updateAliases: (nid: string, aliases: string[]) =>
      setWorkspace((p) => ({ ...p, nodes: p.nodes.map((n) => (n.id === nid ? { ...n, aliases } : n)) })),
    deleteFactEntry: (nid: string, pid: PlugId, eid: string) =>
      setWorkspace((p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nid ? { ...n, plugs: { ...n.plugs, [pid]: (n.plugs[pid] || []).filter((x) => x.id !== eid) } } : n)),
      })),
    deleteNode: (nid: string) => {
      setWorkspace((p) => ({
        ...p, nodes: p.nodes.filter((n) => n.id !== nid), edges: p.edges.filter((e) => e.fromNodeId !== nid && e.toNodeId !== nid),
      }));
      setSelectedNodeId(null);
    },
    inspectCitation: (cid: string, summary: CompiledSummary) => {
      const fact = summary.bundle.facts.find((f) => f.id === cid);
      if (fact) { setSelectedNodeId(summary.nodeId); setSelectedPlugId(fact.plugId); setHighlightedNodeId(summary.nodeId); setHighlightedEdgeId(null); return; }
      const edge = summary.bundle.edges.find((e) => e.id === cid);
      if (edge) {
        const we = workspace.edges.find((x) => x.fromPlugId === edge.fromPlugId && x.fromNodeId === edge.fromNodeId);
        setHighlightedEdgeId(we?.id || null); setHighlightedNodeId(edge.toNodeId); return;
      }
      const nb = summary.bundle.neighbors.find((n) => n.id === cid);
      if (nb) { setHighlightedNodeId(nb.nodeId); setHighlightedEdgeId(null); }
    },
  };
}

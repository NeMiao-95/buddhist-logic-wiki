import {
  BundleEdge,
  BundleFact,
  BundleNeighbor,
  ConceptEdge,
  ConceptNode,
  ContextBundle,
  PlugDefinition,
} from "../types/schema";

function stableHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Deterministic Closed-World Snapshot Packer.
 * Freezes the node's own [F*] facts, [E*] edges, 1-hop neighbors & sibling nodes [N*],
 * and unfilled plugs so the LLM cannot sneak in external pretraining knowledge.
 */
export function buildContextBundle(
  targetNodeId: string,
  nodes: ConceptNode[],
  edges: ConceptEdge[],
  plugDefs: PlugDefinition[]
): ContextBundle {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const target = nodeMap.get(targetNodeId);
  if (!target) {
    throw new Error(`Node not found: ${targetNodeId}`);
  }

  const facts: BundleFact[] = [];
  const emptyPlugs: { plugId: PlugDefinition["id"]; plugName: string }[] = [];

  let factCounter = 0;
  for (const def of plugDefs) {
    const entries = target.plugs[def.id] || [];
    if (entries.length === 0) {
      emptyPlugs.push({ plugId: def.id, plugName: def.name });
      continue;
    }
    for (const entry of entries) {
      factCounter += 1;
      facts.push({
        id: `F${factCounter}`,
        plugId: def.id,
        plugName: def.name,
        entryId: entry.id,
        text: entry.text,
        sourceLabel: entry.sourceRef
          ? `${entry.sourceRef.docTitle} ${entry.sourceRef.pageLabel}`
          : undefined,
        excerpt: entry.sourceRef?.excerpt,
      });
    }
  }

  const bundleEdges: BundleEdge[] = [];
  let edgeCounter = 0;
  const directNeighborIds = new Set<string>();

  for (const edge of edges) {
    if (edge.fromNodeId === targetNodeId || edge.toNodeId === targetNodeId) {
      const fromNode = nodeMap.get(edge.fromNodeId);
      const toNode = nodeMap.get(edge.toNodeId);
      if (!fromNode || !toNode) continue;

      edgeCounter += 1;
      const isOutgoing = edge.fromNodeId === targetNodeId;
      directNeighborIds.add(isOutgoing ? toNode.id : fromNode.id);

      bundleEdges.push({
        id: `E${edgeCounter}`,
        direction: isOutgoing ? "outgoing" : "incoming",
        fromNodeId: fromNode.id,
        fromLabel: fromNode.label,
        fromPlugId: edge.fromPlugId,
        relationLabel: edge.relationLabel,
        toNodeId: toNode.id,
        toLabel: toNode.label,
      });
    }
  }

  // Collect direct neighbors + sibling nodes sharing the same P1 parent
  const neighbors: BundleNeighbor[] = [];
  const addedNeighborIds = new Set<string>();
  let neighborCounter = 0;

  const summarizeNodeFacts = (n: ConceptNode): string[] => {
    const out: string[] = [];
    for (const def of plugDefs) {
      const entries = n.plugs[def.id] || [];
      for (const e of entries) {
        out.push(`${def.shortLabel}: ${e.text}`);
      }
    }
    return out;
  };

  for (const nid of directNeighborIds) {
    const n = nodeMap.get(nid);
    if (!n || addedNeighborIds.has(n.id)) continue;
    addedNeighborIds.add(n.id);
    neighborCounter += 1;
    const relEdge = bundleEdges.find(
      (be) => be.toNodeId === n.id || be.fromNodeId === n.id
    );
    neighbors.push({
      id: `N${neighborCounter}`,
      nodeId: n.id,
      label: n.label,
      relationship: relEdge
        ? relEdge.direction === "outgoing"
          ? `${relEdge.relationLabel}「${n.label}」`
          : `通过「${relEdge.relationLabel}」连接而来`
        : "直接关联",
      recordedFacts: summarizeNodeFacts(n),
    });
  }

  // Find siblings sharing P1 parent
  const parentIds = edges
    .filter((e) => e.fromNodeId === targetNodeId && e.fromPlugId === "P1")
    .map((e) => e.toNodeId);

  for (const pid of parentIds) {
    const parentLabel = nodeMap.get(pid)?.label || pid;
    const siblingEdges = edges.filter(
      (e) =>
        e.toNodeId === pid &&
        e.fromPlugId === "P1" &&
        e.fromNodeId !== targetNodeId
    );
    for (const se of siblingEdges) {
      const sib = nodeMap.get(se.fromNodeId);
      if (!sib || addedNeighborIds.has(sib.id)) continue;
      addedNeighborIds.add(sib.id);
      neighborCounter += 1;
      neighbors.push({
        id: `N${neighborCounter}`,
        nodeId: sib.id,
        label: sib.label,
        relationship: `同归属于「${parentLabel}」的并列概念`,
        recordedFacts: summarizeNodeFacts(sib),
      });
    }
  }

  const canonicalPayload = JSON.stringify({
    recipeVersion: "v1.0",
    targetConcept: target.label,
    facts: facts.map((f) => ({ id: f.id, plugId: f.plugId, text: f.text })),
    edges: bundleEdges.map((e) => ({
      id: e.id,
      from: e.fromLabel,
      rel: e.relationLabel,
      to: e.toLabel,
    })),
    neighbors: neighbors.map((n) => ({
      id: n.id,
      label: n.label,
      relationship: n.relationship,
      recordedFacts: n.recordedFacts,
    })),
    emptyPlugs,
  });

  return {
    recipeVersion: "v1.0",
    snapshotHash: stableHash(canonicalPayload),
    targetNodeId: target.id,
    targetConcept: target.label,
    aliases: target.aliases,
    facts,
    edges: bundleEdges,
    neighbors,
    emptyPlugs,
  };
}

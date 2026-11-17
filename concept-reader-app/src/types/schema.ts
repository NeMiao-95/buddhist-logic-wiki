export type PlugId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7";

export type PlugKind = "link" | "record" | "hybrid";

export interface PlugDefinition {
  id: PlugId;
  name: string;
  shortLabel: string;
  kind: PlugKind;
  angleDeg: number;
  promptHint: string;
  relationVerb: string;
}

export const DEFAULT_PLUG_DEFINITIONS: PlugDefinition[] = [
  {
    id: "P1",
    name: "归属 / 上位概念",
    shortLabel: "归属",
    kind: "link",
    angleDeg: -90,
    promptHint: "它属于哪一类更大概念/学派/体系？（命中已有概念会触发磁吸）",
    relationVerb: "归属于",
  },
  {
    id: "P2",
    name: "关联 / 对比概念",
    shortLabel: "关联",
    kind: "link",
    angleDeg: 180,
    promptHint: "它与库中哪个概念形成并列、对立或承接关系？",
    relationVerb: "关联对照",
  },
  {
    id: "P3",
    name: "下位 / 派生概念",
    shortLabel: "派生",
    kind: "link",
    angleDeg: 90,
    promptHint: "它向下分出哪些支派、子概念或具体学说？",
    relationVerb: "派生出",
  },
  {
    id: "P4",
    name: "词义 / 术语解析",
    shortLabel: "词义",
    kind: "record",
    angleDeg: -32,
    promptHint: "这个词的字面意思、词源或原文写法是什么？",
    relationVerb: "词义",
  },
  {
    id: "P5",
    name: "学习动机（为什么学）",
    shortLabel: "为何学",
    kind: "record",
    angleDeg: 0,
    promptHint: "在当前阅读中，我们为什么要学习它？它试图解决什么问题？",
    relationVerb: "学习动机",
  },
  {
    id: "P6",
    name: "创始者 / 依托文本",
    shortLabel: "源流",
    kind: "hybrid",
    angleDeg: 34,
    promptHint: "它的创始者、代表人物或核心经典是什么？（命中人物/典籍节点可磁吸）",
    relationVerb: "源自/依托",
  },
  {
    id: "P7",
    name: "核心命题 / 本质特征",
    shortLabel: "核心",
    kind: "record",
    angleDeg: 142,
    promptHint: "用 1～2 句最凝练的话概括它的核心主张或判定标准。",
    relationVerb: "核心主张",
  },
];

export interface SourceRef {
  docId: string;
  docTitle: string;
  pageLabel: string;
  excerpt: string;
}

export interface FactEntry {
  id: string;
  text: string;
  linkedNodeId?: string;
  sourceRef?: SourceRef;
  createdAt: string;
}

export interface ConceptNode {
  id: string;
  label: string;
  aliases: string[];
  shape: "circle" | "rect";
  x: number;
  y: number;
  plugs: Record<PlugId, FactEntry[]>;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptEdge {
  id: string;
  fromNodeId: string;
  fromPlugId: PlugId;
  toNodeId: string;
  relationLabel: string;
  createdAt: string;
}

export interface BookDocument {
  id: string;
  title: string;
  role: "primary" | "supplementary";
  content: string;
  createdAt: string;
}

export interface DocumentChunk {
  chunkId: string;
  docId: string;
  docTitle: string;
  role: "primary" | "supplementary";
  pageLabel: string;
  text: string;
  normalizedText: string;
}

export interface BundleFact {
  id: string; // e.g. "F1"
  plugId: PlugId;
  plugName: string;
  entryId: string;
  text: string;
  sourceLabel?: string;
  excerpt?: string;
}

export interface BundleEdge {
  id: string; // e.g. "E1"
  direction: "outgoing" | "incoming";
  fromNodeId: string;
  fromLabel: string;
  fromPlugId: PlugId;
  relationLabel: string;
  toNodeId: string;
  toLabel: string;
}

export interface BundleNeighbor {
  id: string; // e.g. "N1"
  nodeId: string;
  label: string;
  relationship: string;
  recordedFacts: string[];
}

export interface ContextBundle {
  recipeVersion: "v1.0";
  snapshotHash: string;
  targetNodeId: string;
  targetConcept: string;
  aliases: string[];
  facts: BundleFact[];
  edges: BundleEdge[];
  neighbors: BundleNeighbor[];
  emptyPlugs: { plugId: PlugId; plugName: string }[];
}

export interface AuditResult {
  passed: boolean;
  citedIds: string[];
  validIdsInBundle: string[];
  invalidIds: string[];
  uncitedSentences: string[];
}

export interface CompiledSummary {
  nodeId: string;
  recipeVersion: "v1.0";
  snapshotHash: string;
  bundle: ContextBundle;
  markdown: string;
  audit: AuditResult;
  mode: "llm" | "deterministic";
  generatedAt: string;
}

export interface AiSettings {
  mode: "demo" | "openai-compatible";
  baseUrl: string;
  apiKey: string;
  model: string;
  autoSnapExactMatch: boolean;
}

export interface WorkspaceData {
  version: "1.0";
  plugDefinitions: PlugDefinition[];
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  documents: BookDocument[];
  summaries: Record<string, CompiledSummary>;
}

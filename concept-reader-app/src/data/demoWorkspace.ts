import {
  AiSettings,
  BookDocument,
  ConceptEdge,
  ConceptNode,
  DEFAULT_PLUG_DEFINITIONS,
  FactEntry,
  PlugId,
  WorkspaceData,
} from "../types/schema";

export function createEmptyPlugs(): Record<PlugId, FactEntry[]> {
  return {
    P1: [],
    P2: [],
    P3: [],
    P4: [],
    P5: [],
    P6: [],
    P7: [],
  };
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  mode: "demo",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  autoSnapExactMatch: true,
};

const DEMO_DOCS: BookDocument[] = [
  {
    id: "doc_primary_1",
    title: "印度哲学导读（示例当前读物）",
    role: "primary",
    createdAt: "2026-11-17T00:00:00.000Z",
    content: `[p.8]
在印度正统思想史上，通常围绕对《吠陀》权威的承认，划分出若干被称为“印度哲学的学派”（Darśana）的思想传统，其中以数论（Sāṃkhya）、瑜伽、正理、胜论、弥曼差与吠檀多六派最为核心。

[p.9]
数论（Sāṃkhya）的字面意思是“列举”或“计数”，通过列举二十五谛来说明宇宙万象的展开。数论主张纯粹精神（Puruṣa）与根本物质（Prakṛti）彼此独立，因此具有鲜明的二元论倾向。

[p.12]
Vedānta（吠檀多）一词由 Veda（吠陀）与 anta（终结、归宿）合成，字面意思是“吠陀的终结”或“吠陀教义的最终归宿”。它既指吠陀文献末段的《奥义书》，也指专事阐释这一终极义理的印度哲学学派。

[p.14]
我们之所以需要学习 Vedānta，是因为它构成理解后期印度哲学如何围绕《奥义书》重新整合“梵我关系”（Brahman 与 Ātman）并回应佛教哲学挑战的关键枢纽。

[p.15]
在源流与创始者方面，Vedānta 并非由某一位单一历史创始者凭空创立，而是长期依托《奥义书》《梵经》（Brahmasūtra）与《薄伽梵歌》形成的解经传统；后世常将《梵经》编纂者跋达罗衍那（Bādarāyaṇa）视为其体系化起点。

[p.16]
Vedānta 的核心主张在于：万有的终极实在归于“梵”（Brahman），修行与解脱的根本在于通过正知破除无明、洞见个体自我与终极实在之间的真实关系。`,
  },
  {
    id: "doc_supp_1",
    title: "补充词条：学派分化简注",
    role: "supplementary",
    createdAt: "2026-11-17T00:00:00.000Z",
    content: `[p.3]
Vedānta 内部在后世进一步分化为多个重要支派，其中最著名的是商羯罗（Śaṅkara）系统化的不二论吠檀多（Advaita Vedānta），以及罗摩努阇（Rāmānuja）的限定不二论。

[p.5]
与强调二元并立的 Sāṃkhya 不同，不二论方向的 Vedānta 主张唯有梵是绝对真实，现象界的差别源于无明（Avidyā）所起的错觉。`,
  },
];

const DEMO_NODES: ConceptNode[] = [
  {
    id: "node_indian_schools",
    label: "印度哲学的学派",
    aliases: ["Darśana", "Darsana", "六派哲学", "印度哲学学派"],
    shape: "circle",
    x: 240,
    y: 205,
    createdAt: "2026-11-17T00:00:00.000Z",
    updatedAt: "2026-11-17T00:00:00.000Z",
    plugs: {
      ...createEmptyPlugs(),
      P4: [
        {
          id: "f_school_1",
          text: "指围绕《吠陀》权威展开的思想体系传统（Darśana），常见以六派为代表。",
          sourceRef: {
            docId: "doc_primary_1",
            docTitle: "印度哲学导读（示例当前读物）",
            pageLabel: "p.8",
            excerpt:
              "在印度正统思想史上，通常围绕对《吠陀》权威的承认，划分出若干被称为“印度哲学的学派”（Darśana）的思想传统。",
          },
          createdAt: "2026-11-17T00:00:00.000Z",
        },
      ],
    },
  },
  {
    id: "node_samkhya",
    label: "Sāṃkhya",
    aliases: ["Samkhya", "数论", "数论派"],
    shape: "rect",
    x: 210,
    y: 475,
    createdAt: "2026-11-17T00:00:00.000Z",
    updatedAt: "2026-11-17T00:00:00.000Z",
    plugs: {
      ...createEmptyPlugs(),
      P1: [
        {
          id: "f_sam_1",
          text: "印度哲学的学派",
          linkedNodeId: "node_indian_schools",
          createdAt: "2026-11-17T00:00:00.000Z",
        },
      ],
      P4: [
        {
          id: "f_sam_2",
          text: "字面意思是“列举”或“计数”，通过列举二十五谛说明宇宙展开。",
          sourceRef: {
            docId: "doc_primary_1",
            docTitle: "印度哲学导读（示例当前读物）",
            pageLabel: "p.9",
            excerpt: "数论（Sāṃkhya）的字面意思是“列举”或“计数”，通过列举二十五谛来说明宇宙万象的展开。",
          },
          createdAt: "2026-11-17T00:00:00.000Z",
        },
      ],
      P7: [
        {
          id: "f_sam_3",
          text: "主张精神（Puruṣa）与物质（Prakṛti）彼此独立的二元论体系。",
          sourceRef: {
            docId: "doc_primary_1",
            docTitle: "印度哲学导读（示例当前读物）",
            pageLabel: "p.9",
            excerpt: "数论主张纯粹精神（Puruṣa）与根本物质（Prakṛti）彼此独立，因此具有鲜明的二元论倾向。",
          },
          createdAt: "2026-11-17T00:00:00.000Z",
        },
      ],
    },
  },
  {
    id: "node_vedanta",
    label: "Vedānta",
    aliases: ["Vedanta", "吠檀多", "吠檀多派"],
    shape: "circle",
    x: 545,
    y: 315,
    createdAt: "2026-11-17T00:00:00.000Z",
    updatedAt: "2026-11-17T00:00:00.000Z",
    plugs: createEmptyPlugs(),
  },
];

const DEMO_EDGES: ConceptEdge[] = [
  {
    id: "E_demo_1",
    fromNodeId: "node_samkhya",
    fromPlugId: "P1",
    toNodeId: "node_indian_schools",
    relationLabel: "归属于",
    createdAt: "2026-11-17T00:00:00.000Z",
  },
];

export function createDemoWorkspace(): WorkspaceData {
  return {
    version: "1.0",
    plugDefinitions: DEFAULT_PLUG_DEFINITIONS.map((p) => ({ ...p })),
    nodes: JSON.parse(JSON.stringify(DEMO_NODES)),
    edges: JSON.parse(JSON.stringify(DEMO_EDGES)),
    documents: JSON.parse(JSON.stringify(DEMO_DOCS)),
    summaries: {},
  };
}

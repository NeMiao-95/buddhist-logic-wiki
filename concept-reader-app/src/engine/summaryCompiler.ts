import {
  AiSettings,
  CompiledSummary,
  ContextBundle,
  PlugId,
} from "../types/schema";
import { auditCompiledMarkdown } from "./citationAuditor";

export const COLOPHON_FOOTER =
  "> Compiled with ConceptPlug Reader · Method by Shoule Miao (https://researchmap.jp/miaoshoule)";

function ensureColophonFooter(markdown: string): string {
  const trimmed = markdown.trim();
  if (trimmed.includes("researchmap.jp/miaoshoule")) return trimmed;
  return `${trimmed}\n\n---\n\n${COLOPHON_FOOTER}`;
}

export const COMPILER_SYSTEM_PROMPT = `你是一个严谨的“图谱到说明文编译器”。你的唯一任务，是将输入 JSON 中的封闭知识，严格按照指定的【7段式骨架】改写为清晰、平实、易于人脑理解的中文说明文。

必须遵守以下五条铁律：
1. 封闭世界铁律：你只能使用输入 JSON 中 facts、edges、neighbors 里明确出现的命题与术语。严禁调用你的预训练知识补充任何背景、人名、历史年代、学派细节或常见解释。
2. 逐句溯源铁律：正文（除标题、固定“未记录”提示和第六段盲区清单外）中的每一个事实陈述句末尾，必须紧跟对应的证据编号，例如 [F1]、[E1]、[N1] 或组合 [F1][E1]。不得出现没有编号的事实断言。
3. 诚实留白铁律：如果某个段落对应的事实或边在输入 JSON 中为空，必须原样输出 【当前库中未记录】（定位段空时输出 【当前尚未与其他概念建立连接】，对照段空时输出 【当前库中暂无可对比的相邻概念】，第七段全空时输出 【当前暂无足够已记录信息可供汇总】），严禁凑字数。
4. 可理解性铁律：句式简短通顺、逻辑递进清晰；遇到专业术语时，只允许使用 facts 中已经记录的释义。
5. 结构复刻铁律：必须严格保留一级标题和“一、定位”到“七、一段话汇总”的固定七段顺序；第七段必须是将一至五段已有信息串连成**一段完整连贯的自然段**（不得分点），且严禁增加任何一至五段之外的新信息。`;

function formatFactsSection(
  bundle: ContextBundle,
  plugIds: PlugId[],
  leadIn: string
): string {
  const matched = bundle.facts.filter((f) => plugIds.includes(f.plugId));
  if (matched.length === 0) {
    return "【当前库中未记录】";
  }
  const lines = matched.map((f) => {
    const clean = f.text.replace(/[。；;]+$/, "");
    return `- ${leadIn ? `${f.plugName}：` : ""}${clean} [${f.id}]。`;
  });
  return lines.join("\n");
}

function buildSingleParagraphSynthesis(bundle: ContextBundle): string {
  const sentences: string[] = [];

  if (bundle.edges.length > 0) {
    const edgePhrases = bundle.edges.map((e) =>
      e.direction === "outgoing"
        ? `${e.relationLabel}**${e.toLabel}** [${e.id}]`
        : `被 **${e.fromLabel}** 以「${e.relationLabel}」关联 [${e.id}]`
    );
    sentences.push(`在当前知识网中，**${bundle.targetConcept}** ${edgePhrases.join("，并")}。`);
  } else {
    const linkFacts = bundle.facts.filter((f) => ["P1", "P2", "P3"].includes(f.plugId));
    if (linkFacts.length > 0) {
      sentences.push(
        `在当前记录中，**${bundle.targetConcept}** ${linkFacts.map((f) => `${f.plugName}为「${f.text.replace(/[。；;]+$/, "")}」 [${f.id}]`).join("，")}。`
      );
    }
  }

  const cleanText = (s: string) => s.replace(/[。；;]+$/, "").trim();
  const byPlug = (pid: PlugId) => bundle.facts.filter((f) => f.plugId === pid);

  const p4 = byPlug("P4");
  if (p4.length > 0) {
    sentences.push(
      `就词义与术语解析而言，其含义为${p4.map((f) => `「${cleanText(f.text)}」 [${f.id}]`).join("，")}。`
    );
  }

  const p5 = byPlug("P5");
  if (p5.length > 0) {
    sentences.push(
      `学习该概念的动机在于${p5.map((f) => `${cleanText(f.text)} [${f.id}]`).join("；")}。`
    );
  }

  const p6p7 = [...byPlug("P6"), ...byPlug("P7")];
  if (p6p7.length > 0) {
    sentences.push(
      `在源流与核心主张方面，当前记录显示${p6p7.map((f) => `${cleanText(f.text)} [${f.id}]`).join("，且")}。`
    );
  }

  if (bundle.neighbors.length > 0) {
    const nPhrases = bundle.neighbors.map((n) => `**${n.label}**（${n.relationship}） [${n.id}]`);
    sentences.push(`同时，它与图谱中的 ${nPhrases.join("、")} 形成了直接关联或并列对照。`);
  }

  if (sentences.length === 0) {
    return "【当前暂无足够已记录信息可供汇总】";
  }

  return sentences.join("");
}

/**
 * Deterministic 6-section compiler: guarantees 100% reproducible, zero-hallucination
 * prose directly compiled from the closed-world ContextBundle.
 */
export function compileDeterministically(bundle: ContextBundle): string {
  const title = `# ${bundle.targetConcept} 概念说明（快照 \`${bundle.snapshotHash}\`）`;

  // Section 1: 定位
  let sec1 = "【当前尚未与其他概念建立连接】";
  if (bundle.edges.length > 0) {
    sec1 = bundle.edges
      .map((e) => {
        if (e.direction === "outgoing") {
          return `- 在当前知识网中，**${e.fromLabel}** ${e.relationLabel} **${e.toLabel}** [${e.id}]。`;
        }
        return `- 已有概念 **${e.fromLabel}** 通过「${e.relationLabel}」连接到 **${e.toLabel}** [${e.id}]。`;
      })
      .join("\n");
  } else {
    const linkFacts = bundle.facts.filter((f) =>
      ["P1", "P2", "P3"].includes(f.plugId)
    );
    if (linkFacts.length > 0) {
      sec1 = linkFacts
        .map(
          (f) =>
            `- 目前已记录其${f.plugName}为「${f.text.replace(/[。]+$/, "")}」，尚未完成画布连线 [${f.id}]。`
        )
        .join("\n");
    }
  }

  // Section 2: 词义
  const sec2 = formatFactsSection(bundle, ["P4"], "");

  // Section 3: 动机
  const sec3 = formatFactsSection(bundle, ["P5"], "");

  // Section 4: 面貌（来源与核心主张）
  const sec4 = formatFactsSection(bundle, ["P6", "P7"], "show");

  // Section 5: 对照
  let sec5 = "【当前库中暂无可对比的相邻概念】";
  if (bundle.neighbors.length > 0) {
    sec5 = bundle.neighbors
      .map((n) => {
        if (n.recordedFacts.length === 0) {
          return `- **${n.label}**（${n.relationship}）：该相邻节点目前尚未写入具体插头事实，暂无法做细节对比 [${n.id}]。`;
        }
        const summary = n.recordedFacts
          .slice(0, 3)
          .map((t) => t.replace(/[。；;]+$/, ""))
          .join(" / ");
        return `- **${n.label}**（${n.relationship}）：当前库中记录其要点为「${summary}」[${n.id}]。`;
      })
      .join("\n");
  }

  // Section 6: 盲区清单
  let sec6 = "【当前所有预设插头均已记录】";
  if (bundle.emptyPlugs.length > 0) {
    sec6 = bundle.emptyPlugs
      .map((p) => `- \`${p.plugId}\` **${p.plugName}**：尚未填写，后续阅读可重点检索此方向。`)
      .join("\n");
  }

  // Section 7: 一段话汇总
  const sec7 = buildSingleParagraphSynthesis(bundle);

  return [
    title,
    `> 编译配方：\`${bundle.recipeVersion}\` ｜ 事实条目：${bundle.facts.length} ｜ 关系边：${bundle.edges.length} ｜ 邻接概念：${bundle.neighbors.length}`,
    "",
    "## 一、定位：它在当前知识网中的位置",
    sec1,
    "",
    "## 二、词义：这个概念字面指什么",
    sec2,
    "",
    "## 三、动机：为什么要学习它",
    sec3,
    "",
    "## 四、面貌：创始者、依托文本与核心主张",
    sec4,
    "",
    "## 五、对照：它与相邻概念的关系",
    sec5,
    "",
    "## 六、盲区清单（尚未填写的插头）",
    sec6,
    "",
    "## 七、一段话汇总（仅整合以上已知信息）",
    sec7,
    "",
    "---",
    "",
    COLOPHON_FOOTER,
  ].join("\n");
}

export async function runSummaryCompiler(
  bundle: ContextBundle,
  settings: AiSettings,
  callLlmFn: (
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    settings: AiSettings
  ) => Promise<string>
): Promise<CompiledSummary> {
  if (settings.mode === "openai-compatible" && settings.apiKey.trim()) {
    try {
      const userPrompt = [
        `请严格基于以下封闭世界 JSON 快照（snapshotHash: ${bundle.snapshotHash}），按七段式骨架编译「${bundle.targetConcept}」的中文说明文。`,
        "",
        "```json",
        JSON.stringify(bundle, null, 2),
        "```",
        "",
        "请直接输出 Markdown，包含以下七个二级标题（其中第七段只能将一至五段已包含的信息整合成一段连贯的话，严禁增加新信息）：",
        "## 一、定位：它在当前知识网中的位置",
        "## 二、词义：这个概念字面指什么",
        "## 三、动机：为什么要学习它",
        "## 四、面貌：创始者、依托文本与核心主张",
        "## 五、对照：它与相邻概念的关系",
        "## 六、盲区清单（尚未填写的插头）",
        "## 七、一段话汇总（仅整合以上已知信息）",
      ].join("\n");

      const llmMarkdown = await callLlmFn(
        COMPILER_SYSTEM_PROMPT,
        userPrompt,
        0,
        settings
      );
      const trimmed = ensureColophonFooter(llmMarkdown);
      const audit = auditCompiledMarkdown(trimmed, bundle);
      return {
        nodeId: bundle.targetNodeId,
        recipeVersion: bundle.recipeVersion,
        snapshotHash: bundle.snapshotHash,
        bundle,
        markdown: trimmed,
        audit,
        mode: "llm",
        generatedAt: new Date().toISOString(),
      };
    } catch {
      // Fallback cleanly to deterministic compiler if network/CORS fails
    }
  }

  const detMarkdown = compileDeterministically(bundle);
  const audit = auditCompiledMarkdown(detMarkdown, bundle);
  return {
    nodeId: bundle.targetNodeId,
    recipeVersion: bundle.recipeVersion,
    snapshotHash: bundle.snapshotHash,
    bundle,
    markdown: detMarkdown,
    audit,
    mode: "deterministic",
    generatedAt: new Date().toISOString(),
  };
}

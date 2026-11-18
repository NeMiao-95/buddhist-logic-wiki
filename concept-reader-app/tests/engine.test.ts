import assert from "node:assert/strict";
import { createDemoWorkspace } from "../src/data/demoWorkspace.ts";
import { auditCompiledMarkdown } from "../src/engine/citationAuditor.ts";
import { buildContextBundle } from "../src/engine/contextBundler.ts";
import { mutateLinkNodes } from "../src/engine/graphMutations.ts";
import { buildAllChunks, extractConciseDemoAnswer } from "../src/engine/localRag.ts";
import { findMatchingNodes } from "../src/engine/normalize.ts";
import { compileDeterministically } from "../src/engine/summaryCompiler.ts";
import { pullWorkspaceFromGist, pushWorkspaceToGist, SYNC_FILENAME, verifyAdminTokenAndDiscoverGist } from "../src/services/gistSync.ts";

const ws = createDemoWorkspace();

// 1. Magnetic concept matching (exact + IAST stripped + fuzzy)
const exactSchool = findMatchingNodes("印度哲学的学派", ws.nodes, "node_vedanta");
assert.equal(exactSchool[0]?.node.id, "node_indian_schools");
assert.equal(exactSchool[0]?.matchType, "exact");

const fuzzySchool = findMatchingNodes("印度哲学学派", ws.nodes, "node_vedanta");
assert.equal(fuzzySchool[0]?.node.id, "node_indian_schools");

const iastSamkhya = findMatchingNodes("Samkhya", ws.nodes, "node_vedanta");
assert.equal(iastSamkhya[0]?.node.id, "node_samkhya");

// 2. Concise grounded RAG extraction (<= 80 chars + page anchor)
const chunks = buildAllChunks(ws.documents);
const etymology = extractConciseDemoAnswer("P4", "这个词的意思是什么？", "Vedānta", ["Vedanta", "吠檀多"], chunks);
assert.equal(etymology.found, true);
assert.ok(etymology.answer.length <= 80);
assert.equal(etymology.sourceRef?.pageLabel, "p.12");

const missing = extractConciseDemoAnswer("P4", "量子力学弦论是什么", "Vedānta", ["Vedanta"], chunks);
assert.equal(missing.found, false);

// 3. Magnetic link + closed-world ContextBundle + sibling detection + deterministic compile + audit
const linkedWs = mutateLinkNodes(ws, "node_vedanta", "P1", "node_indian_schools", "归属于", "印度哲学的学派");
const vNode = linkedWs.nodes.find((n) => n.id === "node_vedanta")!;
vNode.plugs.P4.push({
  id: "f_test_1",
  text: etymology.answer,
  sourceRef: etymology.sourceRef,
  createdAt: "2026-11-17T00:00:00.000Z",
});

const bundle1 = buildContextBundle("node_vedanta", linkedWs.nodes, linkedWs.edges, linkedWs.plugDefinitions);
const bundle2 = buildContextBundle("node_vedanta", linkedWs.nodes, linkedWs.edges, linkedWs.plugDefinitions);
assert.equal(bundle1.snapshotHash, bundle2.snapshotHash);
assert.ok(bundle1.neighbors.some((n) => n.label === "Sāṃkhya"));

const markdown = compileDeterministically(bundle1);
assert.ok(markdown.includes("## 七、一段话汇总（仅整合以上已知信息）"));
const sec7Body = markdown.split("## 七、一段话汇总（仅整合以上已知信息）")[1]?.trim() || "";
assert.ok(sec7Body.length > 20 && !sec7Body.includes("\n- "), "Section 7 must be a single cohesive paragraph");
const auditPass = auditCompiledMarkdown(markdown, bundle1);
assert.equal(auditPass.passed, true, `Expected audit pass, uncited: ${auditPass.uncitedSentences.join(" | ")}`);

// 4. Auditor catches hallucinated citation IDs and uncited assertions
const badMarkdown = markdown + "\n- 商羯罗是不二论的创立者。\n- 这是伪造引用 [F99]。";
const auditFail = auditCompiledMarkdown(badMarkdown, bundle1);
assert.equal(auditFail.passed, false);
assert.ok(auditFail.invalidIds.includes("F99"));
assert.ok(auditFail.uncitedSentences.some((s) => s.includes("商羯罗")));

// 5. Admin Private Gist Sync round-trip with mocked fetch
const origFetch = globalThis.fetch;
let storedBody = "";
globalThis.fetch = (async (url: string, init?: RequestInit) => {
  if (url.endsWith("/user")) {
    return new Response(JSON.stringify({ login: "NeMiao-95" }), { status: 200 });
  }
  if (url.includes("/gists?per_page=100")) {
    return new Response(JSON.stringify([{ id: "gist_abc123", files: { [SYNC_FILENAME]: {} } }]), { status: 200 });
  }
  if (init?.method === "PATCH") {
    storedBody = String(init.body || "");
    return new Response(JSON.stringify({ id: "gist_abc123" }), { status: 200 });
  }
  if (url.endsWith("/gists/gist_abc123")) {
    const parsed = JSON.parse(storedBody);
    return new Response(JSON.stringify({ id: "gist_abc123", files: { [SYNC_FILENAME]: { content: parsed.files[SYNC_FILENAME].content } } }), { status: 200 });
  }
  return new Response("not found", { status: 404 });
}) as typeof fetch;

const info = await verifyAdminTokenAndDiscoverGist("tok_test");
assert.equal(info.username, "NeMiao-95");
assert.equal(info.gistId, "gist_abc123");
const pushed = await pushWorkspaceToGist("tok_test", info.gistId, linkedWs);
assert.equal(pushed.gistId, "gist_abc123");
const pulled = await pullWorkspaceFromGist("tok_test", info.gistId);
assert.equal(pulled.workspace.nodes.length, linkedWs.nodes.length);
globalThis.fetch = origFetch;

console.log("ALL ENGINE TESTS PASSED (snapshotHash=" + bundle1.snapshotHash + ")");

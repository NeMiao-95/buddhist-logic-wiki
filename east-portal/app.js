"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const ui = { results: $("results"), status: $("result-status"), search: $("search"), sort: $("sort"), filter: $("author-filter"), filterLabel: $("author-filter-label") };
  const state = { view: "persons", query: "", sort: "chronological", personId: null, focusPerson: null };
  let catalog = null;
  let personsById = new Map();
  let searchTimer;
  const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en");
  const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const alphabetKey = (entry) => normalize(entry.alphabetKey || entry.name).replace(/^[^\p{L}\p{N}]+/u, "");
  function node(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function safeURL(value, local = false) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value, window.location.href);
      if (local) {
        if (!value.startsWith("archive/pages/") || value.includes("..") || url.origin !== location.origin) return null;
      } else if (!["https:", "http:"].includes(url.protocol)) return null;
      return value;
    } catch { return null; }
  }
  function link(label, value, local = false) {
    const href = safeURL(value, local);
    if (!href) return null;
    const el = node("a", "", label);
    el.href = href;
    return el;
  }
  function stamp(value) {
    const text = String(value || "");
    if (/^\d{14}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)} ${text.slice(8, 10)}:${text.slice(10, 12)}:${text.slice(12, 14)} UTC`;
    return text;
  }
  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    state.view = params.get("view") === "works" || location.hash === "#works" ? "works" : "persons";
    state.query = params.get("q") || "";
    state.sort = state.view === "works" ? "alphabetical" : params.get("sort") === "alphabetical" ? "alphabetical" : "chronological";
    state.personId = state.view === "works" ? params.get("person") : null;
    state.focusPerson = state.view === "persons" ? params.get("id") : null;
  }
  function writeHash() {
    const params = new URLSearchParams({ view: state.view });
    if (state.query) params.set("q", state.query);
    if (state.view === "persons" && state.sort === "alphabetical") params.set("sort", state.sort);
    if (state.personId) params.set("person", state.personId);
    if (state.focusPerson) params.set("id", state.focusPerson);
    history.replaceState(null, "", `#${params}`);
  }
  function selectView(view) {
    state.view = view;
    state.sort = view === "works" ? "alphabetical" : "chronological";
    state.query = "";
    state.personId = null;
    state.focusPerson = null;
    writeHash(); render();
  }
  function showWorks(person) {
    state.view = "works"; state.sort = "alphabetical"; state.personId = String(person.id); state.query = ""; state.focusPerson = null;
    writeHash(); render(); $("tab-works").focus();
  }
  function showPerson(person) {
    state.view = "persons"; state.sort = "chronological"; state.personId = null; state.query = ""; state.focusPerson = String(person.id);
    writeHash(); render();
    const card = document.getElementById(`person-${person.id}`);
    if (card) { card.focus(); card.scrollIntoView({ block: "center" }); }
  }
  function sourceLinks(entry) {
    const details = node("details", "source-details");
    details.append(node("summary", "", "詳細・出典"));
    const links = node("div", "entry-links");
    const values = [["本文を読む", entry.localUrl, true], ["原サイト", entry.sourceUrl], ["スナップショット", entry.archiveUrl]];
    values.forEach(([label, url, local]) => { const a = link(label, url, local); if (a) links.append(a); });
    if (entry.archiveTimestamp) {
      const timestamp = node("span", "source-label", `スナップショット日時: ${stamp(entry.archiveTimestamp)}`);
      links.append(timestamp);
    }
    details.append(links);
    return details;
  }
  function card(entry) {
    const el = node("article", "entry");
    if (state.view === "persons") {
      el.id = `person-${entry.id}`;
      el.tabIndex = -1;
      if (state.focusPerson === String(entry.id)) el.classList.add("highlight");
    }
    const heading = node("h4");
    heading.append(link(entry.name, entry.localUrl, true) || node("span", "", entry.name));
    el.append(heading);
    if (state.view === "persons") {
      const meta = node("div", "entry-meta");
      meta.append(node("span", "", `年代: ${entry.dates || "記載なし"}`));
      if (entry.chronologyStatus === "unknown") meta.append(node("span", "", "年代不明"));
      el.append(meta);
      const count = catalog.works.filter((work) => String(work.personId) === String(entry.id)).length;
      if (count) {
        const button = node("button", "relation-button", `関連著作 ${count} 件を見る`);
        button.type = "button";
        button.addEventListener("click", () => showWorks(entry));
        el.append(button);
      }
    } else {
      const person = personsById.get(String(entry.personId));
      if (person) {
        const relation = node("p", "authors", "関連人物: ");
        const button = node("button", "text-button", person.name);
        button.type = "button"; button.addEventListener("click", () => showPerson(person));
        relation.append(button); el.append(relation);
      }
      if (entry.authorRaw) el.append(node("p", "authors", `原頁表記: ${entry.authorRaw}`));
      const details = [entry.languageRaw, entry.typeRaw].filter(Boolean);
      if (details.length) el.append(node("p", "entry-meta", details.join(" · ")));
    }
    el.append(sourceLinks(entry));
    return el;
  }
  function groupKey(entry) {
    if (state.view === "works" || state.sort === "alphabetical") {
      const first = alphabetKey(entry).charAt(0).toUpperCase();
      return /^[A-Z]$/.test(first) ? first : "その他";
    }
    if (entry.chronologyStatus === "unknown") return "年代不明";
    if (!Number.isFinite(entry.dateStart)) return "年代順未確定";
    const year = entry.dateStart;
    if (year < 1) return `紀元前 ${Math.ceil(Math.abs(year) / 100)} 世紀`;
    return `${Math.ceil(year / 100)} 世紀`;
  }
  function matches(entry) {
    const related = personsById.get(String(entry.personId));
    const haystack = normalize([entry.name, entry.dates, entry.authorRaw, entry.languageRaw, entry.typeRaw, related?.name].filter(Boolean).join(" "));
    return normalize(state.query).trim().split(/\s+/).every((term) => haystack.includes(term));
  }
  function render() {
    if (!catalog) return;
    ui.search.value = state.query;
    ui.sort.value = state.sort;
    ui.sort.disabled = state.view === "works";
    $("list-title").textContent = state.view === "persons" ? "Persons" : "Works";
    $("catalog-panel").setAttribute("aria-labelledby", `tab-${state.view}`);
    document.querySelectorAll("[data-tab]").forEach((tab) => {
      const active = tab.dataset.tab === state.view;
      tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1;
    });
    $("ordering-note").textContent = state.view === "persons"
      ? "年代は索引の整列用データに基づきます。各項目には原資料の年代表記を示します。年代の欠けた部分は補っていません。"
      : "題名のアルファベット順です。関連人物は資料の分類上の関連を示します。";
    const person = state.personId && personsById.get(state.personId);
    ui.filter.hidden = !state.personId;
    ui.filterLabel.textContent = person ? `関連人物: ${person.name}` : state.personId ? "該当する人物は索引にありません。" : "";
    const all = catalog[state.view];
    let entries = all.filter((entry) => (!state.personId || String(entry.personId) === state.personId) && matches(entry));
    entries.sort((a, b) => {
      if (state.view === "persons" && state.sort === "chronological") {
        const aUnknown = a.chronologyStatus === "unknown" ? 2 : Number.isFinite(a.dateStart) ? 0 : 1;
        const bUnknown = b.chronologyStatus === "unknown" ? 2 : Number.isFinite(b.dateStart) ? 0 : 1;
        return aUnknown - bUnknown || (a.dateStart ?? Infinity) - (b.dateStart ?? Infinity) || compareText(alphabetKey(a), alphabetKey(b));
      }
      return compareText(alphabetKey(a), alphabetKey(b)) || compareText(String(a.id), String(b.id));
    });
    ui.status.textContent = `${all.length} 件中 ${entries.length} 件を表示`;
    ui.results.replaceChildren();
    if (!entries.length) {
      const empty = node("div", "notice");
      empty.append(node("h3", "", "一致する項目がありません"), node("p", "", "検索語を短くするか、綴りや関連人物の絞り込みを確認してください。"));
      ui.results.append(empty);
    } else {
      const fragment = document.createDocumentFragment();
      let currentKey; let section;
      entries.forEach((entry) => {
        const key = groupKey(entry);
        if (key !== currentKey) {
          currentKey = key; section = node("section", "group");
          section.append(node("h3", "group-title", key)); fragment.append(section);
        }
        section.append(card(entry));
      });
      ui.results.append(fragment);
    }
    ui.results.setAttribute("aria-busy", "false");
  }
  function fail() {
    ui.results.setAttribute("aria-busy", "false");
    ui.status.textContent = "読み込みに失敗しました";
    const notice = node("div", "notice");
    notice.append(node("h3", "", "索引データを読み込めませんでした"), node("p", "", "接続を確認して再度お試しください。ローカルでは HTTP サーバーからこのページを開いてください。"));
    const retry = node("button", "", "再読み込み"); retry.type = "button"; retry.addEventListener("click", load);
    notice.append(retry); ui.results.replaceChildren(notice);
  }
  async function load() {
    ui.results.setAttribute("aria-busy", "true");
    ui.status.textContent = "資料を読み込んでいます…";
    try {
      const response = await fetch("./catalog.json");
      if (!response.ok) throw new Error("Catalog request failed");
      const data = await response.json();
      if (data.schemaVersion !== 1 || !Array.isArray(data.persons) || !Array.isArray(data.works) || data.persons.length !== data.counts?.persons || data.works.length !== data.counts?.works) throw new Error("Invalid catalog");
      catalog = data; personsById = new Map(data.persons.map((person) => [String(person.id), person]));
      $("persons-count").textContent = String(data.persons.length); $("works-count").textContent = String(data.works.length);
      readHash(); render();
    } catch { fail(); }
  }
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => selectView(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const view = event.key === "Home" ? "persons" : event.key === "End" ? "works" : state.view === "persons" ? "works" : "persons";
      selectView(view); $(`tab-${view}`).focus();
    });
  });
  ui.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = ui.search.value; state.focusPerson = null; writeHash(); render(); }, 150);
  });
  ui.sort.addEventListener("change", () => { state.sort = ui.sort.value; state.focusPerson = null; writeHash(); render(); });
  $("clear-author").addEventListener("click", () => { state.personId = null; writeHash(); render(); });
  window.addEventListener("hashchange", () => { readHash(); render(); });
  readHash(); load();
})();

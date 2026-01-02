/* NEWS (data-driven)
   - Renders: (A) Home latest 1-2 items, (B) /news/ list page with category filters
   - Data: /assets/data/news.json + /assets/data/i18n.json
*/
(() => {
  "use strict";

  const SUPPORTED = ["ja","en","es","fr","ko","zh-hans"];
  const DEFAULT_LANG = "ja";
  const CATEGORY_ORDER = ["update","exhibition","release","press","collaboration"];

  function detectLangFromPath(){
    const seg = location.pathname.split("/").filter(Boolean)[0] || "";
    if (SUPPORTED.includes(seg)) return seg;
    return DEFAULT_LANG;
  }

  async function fetchJson(url){
    const r = await fetch(url, { cache: "no-store" });
    if(!r.ok) throw new Error(`fetch failed: ${url}`);
    return r.json();
  }

  function getText(dict, key, lang){
    const node = (dict.i18n||{})[key];
    if(!node) return "";
    return node[lang] ?? node[DEFAULT_LANG] ?? "";
  }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[m]));
  }

  function normCatId(it){
    if(it && it.categoryId) return String(it.categoryId).toLowerCase();
    if(it && it.categoryKey && String(it.categoryKey).startsWith("news.cat.")){
      return String(it.categoryKey).slice("news.cat.".length).toLowerCase();
    }
    if(it && it.category) return String(it.category).toLowerCase();
    return "";
  }

  function catLabel(dict, lang, it){
    const key = it.categoryKey || (normCatId(it) ? `news.cat.${normCatId(it)}` : "");
    return (key ? getText(dict, key, lang) : "") || it.category || "";
  }

  function getInitialFilter(){
    const url = new URL(location.href);
    const fromQuery = (url.searchParams.get("cat") || "").toLowerCase();
    if(fromQuery) return fromQuery;
    const fromHash = (location.hash || "").replace("#","").toLowerCase();
    if(fromHash) return fromHash;
    return "all";
  }

  function setUrlFilter(cat){
    const url = new URL(location.href);
    if(!cat || cat === "all"){
      url.searchParams.delete("cat");
      history.replaceState(null, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") + url.hash);
      return;
    }
    url.searchParams.set("cat", cat);
    history.replaceState(null, "", url.pathname + `?${url.searchParams.toString()}` + url.hash);
  }

  function renderHomeLatest(dict, lang, items){
    const list = document.getElementById("homeNewsList");
    if(!list) return;

    const latest = (items || [])
      .slice()
      .sort((a,b)=> String(b.date||"").localeCompare(String(a.date||"")))
      .slice(0,2);

    if(!latest.length){
      list.innerHTML = `<div class="tile"><div class="news-summary">${esc(getText(dict,"news.empty",lang))}</div></div>`;
      return;
    }

    list.innerHTML = latest.map(it => {
      const title = getText(dict, it.titleKey, lang) || it.title || "";
      const summary = getText(dict, it.summaryKey, lang) || it.summary || "";
      const url = (it.links && it.links[0] && it.links[0].url) ? it.links[0].url : "#";
      const cat = catLabel(dict, lang, it);
      return `
        <a class="news-item" href="${esc(url)}">
          <div class="tile">
            <div class="news-meta"><span>${esc(it.date||"")}</span><span>${esc(cat)}</span></div>
            <div class="news-title">${esc(title)}</div>
            <div class="news-summary">${esc(summary)}</div>
          </div>
        </a>
      `;
    }).join("");
  }

  function renderNewsList(dict, lang, items){
    const list = document.getElementById("newsList");
    const empty = document.getElementById("newsEmpty");
    const filters = document.getElementById("newsFilters");
    if(!list) return;

    const sorted = (items || []).slice().sort((a,b)=> String(b.date||"").localeCompare(String(a.date||"")));

    // build filters UI (optional)
    let current = getInitialFilter();
    if(current !== "all" && !CATEGORY_ORDER.includes(current)){
      // unknown category -> fall back to all
      current = "all";
      setUrlFilter("all");
    }

    if(filters){
      const counts = Object.create(null);
      for(const it of sorted){
        const id = normCatId(it);
        if(!id) continue;
        counts[id] = (counts[id] || 0) + 1;
      }

      const btns = [
        { id:"all", label: getText(dict,"news.filter.all",lang) || "ALL", disabled: !sorted.length }
      ].concat(CATEGORY_ORDER.map(id => ({
        id,
        label: getText(dict, `news.cat.${id}`, lang) || id.toUpperCase(),
        disabled: !counts[id]
      })));

      filters.innerHTML = btns.map(b => `
        <button type="button"
                class="news-filter-btn"
                data-cat="${esc(b.id)}"
                aria-pressed="${b.id === current ? "true":"false"}"
                ${b.disabled ? "disabled" : ""}>
          ${esc(b.label)}
        </button>
      `).join("");

      filters.querySelectorAll("button[data-cat]").forEach(btn => {
        btn.addEventListener("click", () => {
          const next = String(btn.getAttribute("data-cat")||"all").toLowerCase();
          current = next;
          setUrlFilter(current);
          // update pressed states
          filters.querySelectorAll("button[data-cat]").forEach(b2 => {
            b2.setAttribute("aria-pressed", (String(b2.getAttribute("data-cat")||"") === current) ? "true" : "false");
          });
          // re-render list
          renderListBody();
        });
      });
    }

    function renderListBody(){
      const filtered = (current === "all") ? sorted : sorted.filter(it => normCatId(it) === current);

      if(!filtered.length){
        if(empty) empty.textContent = getText(dict, "news.empty", lang);
        list.innerHTML = "";
        return;
      }
      if(empty) empty.textContent = "";

      list.innerHTML = filtered.map(it => {
        const title = getText(dict, it.titleKey, lang) || it.title || "";
        const summary = getText(dict, it.summaryKey, lang) || it.summary || "";
        const url = (it.links && it.links[0] && it.links[0].url) ? it.links[0].url : "#";
        const cat = catLabel(dict, lang, it);
        return `
          <a class="news-item" href="${esc(url)}">
            <div class="tile">
              <div class="news-meta"><span>${esc(it.date||"")}</span><span>${esc(cat)}</span></div>
              <div class="news-title">${esc(title)}</div>
              <div class="news-summary">${esc(summary)}</div>
            </div>
          </a>
        `;
      }).join("");
    }

    renderListBody();
  }

  async function boot(){
    const lang = detectLangFromPath();
    const [dict, items] = await Promise.all([
      fetchJson("/assets/data/i18n.json"),
      fetchJson("/assets/data/news.json")
    ]);
    renderHomeLatest(dict, lang, items);
    renderNewsList(dict, lang, items);
  }

  boot().catch(()=>{ /* silent fail */ });
})();

/* NEWS (data-driven)
   - Renders: (A) Home latest 1-2 items, (B) /news/ list page
   - Data: /assets/data/news.json + /assets/data/i18n.json
*/
(() => {
  "use strict";

  const SUPPORTED = ["ja","en","es","fr","ko","zh-hans"];
  const DEFAULT_LANG = "ja";

  function detectLangFromPath(){
    const seg = location.pathname.split("/").filter(Boolean)[0] || "";
    if (SUPPORTED.includes(seg)) return seg;
    return "ja";
  }

  async function fetchJson(url){
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error(`fetch failed: ${url}`);
    return await res.json();
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

  function hrefForLang(lang, path){
    if(lang === "ja") return `/${path}`;
    return `/${lang}/${path}`;
  }

  function renderHomeLatest(dict, lang, items){
    const list = document.getElementById("homeNewsList");
    if(!list) return;

    const latest = (items || []).slice().sort((a,b)=> String(b.date||"").localeCompare(String(a.date||""))).slice(0,2);

    if(!latest.length){
      list.innerHTML = `<div class="tile"><div class="news-summary">${esc(getText(dict,"news.empty",lang))}</div></div>`;
      return;
    }

    list.innerHTML = latest.map(it => {
      const title = getText(dict, it.titleKey, lang) || it.title || "";
      const summary = getText(dict, it.summaryKey, lang) || it.summary || "";
      const url = (it.links && it.links[0] && it.links[0].url) ? it.links[0].url : "#";
      const cat = it.category || "";
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
    if(!list) return;

    const sorted = (items || []).slice().sort((a,b)=> String(b.date||"").localeCompare(String(a.date||"")));

    if(!sorted.length){
      if(empty) empty.textContent = getText(dict, "news.empty", lang);
      list.innerHTML = "";
      return;
    }
    if(empty) empty.textContent = "";

    list.innerHTML = sorted.map(it => {
      const title = getText(dict, it.titleKey, lang) || it.title || "";
      const summary = getText(dict, it.summaryKey, lang) || it.summary || "";
      const url = (it.links && it.links[0] && it.links[0].url) ? it.links[0].url : "#";
      const cat = it.category || "";
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

  async function boot(){
    const lang = detectLangFromPath();
    const [dict, items] = await Promise.all([
      fetchJson("/assets/data/i18n.json"),
      fetchJson("/assets/data/news.json")
    ]);
    renderHomeLatest(dict, lang, items);
    renderNewsList(dict, lang, items);
  }

  // run
  boot().catch(()=>{ /* silent fail */ });

})();

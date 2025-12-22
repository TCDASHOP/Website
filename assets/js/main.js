/* =========================
   SAIREN COLOR ARCHIVE
   - Theme switch (A/B/C)
   - Works gallery / detail loader
   ========================= */

const SCA = (() => {
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => [...root.querySelectorAll(s)];

  function setTheme(theme){
    const t = theme || "a";
    document.body.classList.remove("theme-a","theme-b","theme-c");
    document.body.classList.add(`theme-${t}`);
    localStorage.setItem("sca_theme", t);
    const sel = qs("[data-theme-select]");
    if(sel) sel.value = t;
  }

  function initTheme(){
    const saved = localStorage.getItem("sca_theme") || "a";
    setTheme(saved);

    const sel = qs("[data-theme-select]");
    if(sel){
      sel.value = saved;
      sel.addEventListener("change", e => setTheme(e.target.value));
    }
  }

  async function loadJSON(path){
    const res = await fetch(path, {cache:"no-store"});
    if(!res.ok) throw new Error(`Failed: ${path}`);
    return await res.json();
  }

  function getParam(name){
    const u = new URL(location.href);
    return u.searchParams.get(name);
  }

  function pathPrefix(){
    // /ja/... or /en/... から /assets を指す
    // 例: /ja/works.html -> ../assets/...
    return "../";
  }

  async function renderWorksGallery(){
    const mount = qs("[data-works-gallery]");
    if(!mount) return;

    const dataPath = mount.getAttribute("data-src") || (pathPrefix()+"assets/data/works.json");
    const data = await loadJSON(dataPath);

    // newest first (id desc) を仮定
    const items = (data.works || []).slice().sort((a,b)=> (b.order||0)-(a.order||0));

    mount.innerHTML = items.map(w => {
      const href = `work.html?id=${encodeURIComponent(w.id)}`;
      const title = w.title || w.id;
      const subtitle = w.subtitle || "";
      const img = (pathPrefix() + w.formed);
      return `
        <a class="work-tile" href="${href}">
          <img loading="lazy" src="${img}" alt="${escapeHtml(title)}">
          <div class="label">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(subtitle)}</span>
          </div>
        </a>
      `;
    }).join("");
  }

  async function renderWorkDetail(){
    const mount = qs("[data-work-detail]");
    if(!mount) return;

    const id = getParam("id");
    const dataPath = mount.getAttribute("data-src") || (pathPrefix()+"assets/data/works.json");
    const data = await loadJSON(dataPath);

    const item = (data.works||[]).find(w => w.id === id) || (data.works||[])[0];
    if(!item){
      mount.innerHTML = `<div class="panel card"><p class="muted">No work found.</p></div>`;
      return;
    }

    const titleEl = qs("[data-work-title]");
    const subEl = qs("[data-work-subtitle]");
    if(titleEl) titleEl.textContent = item.title || item.id;
    if(subEl) subEl.textContent = item.subtitle || "";

    const formedImg = qs("[data-formed-img]");
    const rawImg = qs("[data-raw-img]");
    const formedCap = qs("[data-formed-cap]");
    const rawCap = qs("[data-raw-cap]");

    if(formedImg) formedImg.src = pathPrefix()+item.formed;
    if(rawImg) rawImg.src = pathPrefix()+item.raw;

    if(formedCap) formedCap.textContent = item.formed_label || "Formed (after)";
    if(rawCap) rawCap.textContent = item.raw_label || "Raw (before)";

    const tags = qs("[data-work-tags]");
    if(tags){
      const arr = item.tags || [];
      tags.innerHTML = arr.map(t=>`<span class="badge"># ${escapeHtml(t)}</span>`).join(" ");
    }
  }

  function escapeHtml(str){
    return (str||"").replace(/[&<>"']/g, (m)=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function initLangSave(){
    const lang = document.documentElement.getAttribute("lang");
    if(lang === "ja" || lang === "en"){
      localStorage.setItem("sca_lang", lang);
    }
  }

  function init(){
    initLangSave();
    initTheme();
    renderWorksGallery().catch(console.error);
    renderWorkDetail().catch(console.error);
  }

  return { init, setTheme };
})();

document.addEventListener("DOMContentLoaded", SCA.init);

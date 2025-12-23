(() => {
  const LANGS = ["ja","en","es","fr","ko","zh-hans"];

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function getPathParts(){
    const parts = location.pathname.split("/").filter(Boolean);
    return parts;
  }

  function detectLang(){
    const parts = getPathParts();
    const maybe = parts[0];
    return LANGS.includes(maybe) ? maybe : "ja";
  }

  function inLangFolder(){
    const parts = getPathParts();
    return LANGS.includes(parts[0]);
  }

  function basePrefix(){
    return inLangFolder() ? ".." : ".";
  }

  function assetUrl(rel){
    return `${basePrefix()}/${rel.replace(/^\//,"")}`;
  }

  async function fetchJson(rel){
    const res = await fetch(assetUrl(rel), { cache: "no-store" });
    if(!res.ok) throw new Error(`Fetch failed: ${rel} (${res.status})`);
    return await res.json();
  }

  function t(dict, key, lang){
    const node = dict?.[key];
    if(!node) return key;
    return node[lang] ?? node["en"] ?? node["ja"] ?? Object.values(node)[0] ?? key;
  }

  function applyI18n(dict, lang){
    $$("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(dict, key, lang);
    });

    $$("[data-i18n-attr]").forEach(el => {
      const raw = el.getAttribute("data-i18n-attr") || "";
      const [attr, key] = raw.split(":");
      if(attr && key) el.setAttribute(attr, t(dict, key, lang));
    });

    const titleKey = document.body?.getAttribute("data-title-key");
    if(titleKey){
      document.title = `${t(dict, titleKey, lang)} | ${t(dict, "siteName", lang)}`;
    }else{
      document.title = t(dict, "siteName", lang);
    }
  }

  function setLangSelect(lang){
    const sel = $("#langSelect");
    if(!sel) return;
    sel.value = lang;
    sel.addEventListener("change", () => {
      const next = sel.value;
      const parts = getPathParts();
      const file = inLangFolder() ? (parts[1] || "index.html") : (parts[0] || "index.html");
      if(inLangFolder()){
        location.href = `../${next}/${file}`;
      }else{
        location.href = `./${next}/${file}`;
      }
    });
  }

  function setupMenu(dict, lang){
    const overlay = $("#overlay");
    const openBtn = $("#menuBtn");
    const closeArea = $("#overlay");
    if(!overlay || !openBtn) return;

    openBtn.addEventListener("click", () => overlay.classList.add("on"));
    closeArea.addEventListener("click", (e) => {
      if(e.target === overlay) overlay.classList.remove("on");
    });

    applyI18n(dict, lang);
  }

  function randomGradient(){
    const palettes = [
      ["#7C5CFF","#00D6FF","#66FFB5","#FFE66B"],
      ["#FF4FD8","#8A5CFF","#00D6FF","#7CFF6B"],
      ["#00D6FF","#7C5CFF","#FF4FD8","#FFE66B"]
    ];
    const p = palettes[Math.floor(Math.random()*palettes.length)];
    const stops = p.map((c,i)=> `${c} ${(i/(p.length-1))*100}%`).join(", ");
    return `linear-gradient(90deg, ${stops})`;
  }

  function setupTaglineGradient(){
    const gradEl = $("#taglineGrad");
    if(!gradEl) return;
    gradEl.style.backgroundImage = randomGradient();
  }

  async function renderWorksIfNeeded(){
    const grid = $("#worksGrid");
    if(!grid) return;

    const data = await fetchJson("assets/data/works.json");
    const works = data.works || [];

    if(works.length === 0){
      grid.innerHTML = `<div class="muted">No works yet.</div>`;
      return;
    }

    grid.innerHTML = works.map(w => {
      const title = w.title || w.id;
      const img = w.main || w.raw || "";
      const alt = w.alt || title;
      return `
        <article class="card">
          <div class="thumb">
            <img src="${img}" alt="${alt}" loading="lazy" />
          </div>
          <div class="meta">
            <div class="title">${title}</div>
            <div class="sub">${w.id || ""}</div>
          </div>
        </article>
      `;
    }).join("");
  }

  async function wireLookbook(){
    const btn = $("#openLookbookBtn");
    if(!btn) return;
    const site = await fetchJson("assets/data/site.json");
    const url = site?.lookbook?.externalUrl || "";
    if(!url){
      btn.style.display = "none";
      return;
    }
    btn.href = url;
  }

  async function wireContact(){
    const emailLink = $("#emailLink");
    if(!emailLink) return;
    const site = await fetchJson("assets/data/site.json");
    const email = site?.contact?.email || "";
    if(!email){
      emailLink.style.display = "none";
      return;
    }
    emailLink.href = `mailto:${email}`;
    emailLink.textContent = email;
  }

  async function wireSNS(){
    const ig = $("#igLink");
    const tt = $("#ttLink");
    if(!ig && !tt) return;

    const site = await fetchJson("assets/data/site.json");
    const igUrl = site?.sns?.instagramUrl || "";
    const ttUrl = site?.sns?.tiktokUrl || "";

    if(ig){
      if(igUrl) ig.href = igUrl;
      else ig.style.display = "none";
    }
    if(tt){
      if(ttUrl) tt.href = ttUrl;
      else tt.style.display = "none";
    }
  }

  async function main(){
    const lang = detectLang();
    setLangSelect(lang);
    setupTaglineGradient();

    const i18n = await fetchJson("assets/data/i18n.json");
    applyI18n(i18n, lang);
    setupMenu(i18n, lang);

    await Promise.allSettled([
      renderWorksIfNeeded(),
      wireLookbook(),
      wireContact(),
      wireSNS()
    ]);
  }

  document.addEventListener("DOMContentLoaded", () => {
    main().catch(err => {
      console.error(err);
      const box = document.createElement("div");
      box.className = "panel";
      box.innerHTML = `<div class="h1">Error</div><div class="muted">${String(err)}</div>`;
      document.body.prepend(box);
    });
  });
})();

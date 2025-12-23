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

    grid.innerHTML = works.map((w, idx) => {
      const title = w.title || w.id;
      const img = w.main || w.raw || "";
      const alt = w.alt || title;

      return `
        <button class="workCard" data-work-idx="${idx}" type="button">
          <div class="thumb">
            <img loading="lazy" src="${img}" alt="${escapeHtml(alt)}" />
          </div>
          <div class="meta">
            <div class="title">${escapeHtml(title)}</div>
            <div class="sub muted">${escapeHtml(w.id || "")}</div>
          </div>
        </button>
      `;
    }).join("");

    // Modal (create once)
    let modal = $("#workModal");
    if(!modal){
      modal = document.createElement("div");
      modal.id = "workModal";
      modal.className = "modal";
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML = `
        <div class="modalInner" role="dialog" aria-modal="true">
          <div class="modalBox">
            <div class="modalTop">
              <div class="modalTitle" id="workModalTitle"></div>
              <button class="modalClose" data-close type="button" aria-label="Close">×</button>
            </div>
            <div class="modalImgWrap">
              <img class="modalImg" id="workModalImg" alt="" />
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener("click", (e) => {
        if(e.target === modal || e.target.closest("[data-close]")) closeModal();
      });

      document.addEventListener("keydown", (e) => {
        if(e.key === "Escape") closeModal();
      });
    }

    const modalImg = $("#workModalImg");
    const modalTitle = $("#workModalTitle");
    const closeBtn = modal.querySelector("[data-close]");

    // i18n for close aria-label if available
    if(closeBtn){
      const label = t("ui.close") || "Close";
      closeBtn.setAttribute("aria-label", label);
    }

    function openModal(idx){
      const w = works[idx];
      if(!w) return;

      const title = w.title || w.id || "";
      const img = w.raw || w.main || "";

      modalTitle.textContent = title;
      modalImg.src = img;
      modalImg.alt = title;

      modal.classList.add("on");
      modal.setAttribute("aria-hidden", "false");
    }

    function closeModal(){
      modal.classList.remove("on");
      modal.setAttribute("aria-hidden", "true");
      // Clear src to stop decoding on iOS
      if(modalImg) modalImg.src = "";
    }

    if(!grid.dataset.modalBound){
      grid.addEventListener("click", (e) => {
        const card = e.target.closest("[data-work-idx]");
        if(!card) return;
        openModal(parseInt(card.dataset.workIdx, 10));
      });
      grid.dataset.modalBound = "1";
    }
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

  
  function runIntroFxIfPresent(){
    const fx = $("#introFx");
    if(!fx) return;

    // Respect reduced motion
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      return;
    }

    const root = document.documentElement;
    root.classList.add("building");

    // paint drips
    const dripCount = 7;
    for(let i=0;i<dripCount;i++){
      const d = document.createElement("div");
      d.className = "drip";
      const w = 46 + Math.random()*70;
      d.style.width = w + "px";
      d.style.left = (Math.random()*100) + "vw";
      d.style.animationDelay = (Math.random()*0.35) + "s";
      fx.appendChild(d);
    }

    // puzzle-ish pieces
    const pieceCount = 18;
    for(let i=0;i<pieceCount;i++){
      const p = document.createElement("div");
      p.className = "piece";
      const size = 22 + Math.random()*34;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.left = (Math.random()*100) + "vw";
      p.style.animationDelay = (Math.random()*0.55) + "s";
      fx.appendChild(p);
    }

    // reveal
    setTimeout(() => {
      root.classList.add("buildingDone");
      root.classList.remove("building");
    }, 900);

    // cleanup
    setTimeout(() => {
      fx.innerHTML = "";
      if(fx.parentElement) fx.parentElement.removeChild(fx);
    }, 3100);
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

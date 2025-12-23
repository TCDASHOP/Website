(() => {
  const LANGS = ["ja","en","es","fr","ko","zh-hans"];
  const DEFAULT_LANG = "ja";

  const pathParts = (location.pathname || "/").split("/").filter(Boolean);
  const langFromPath = pathParts[0] && LANGS.includes(pathParts[0]) ? pathParts[0] : DEFAULT_LANG;

  // page id: index/about/sns/contact/works/lookbook/license
  const file = (pathParts[1] || "index.html").toLowerCase();
  const pageId = file.replace(".html","") || "index";

  const $ = (sel, root=document) => root.querySelector(sel);

  // palette random
  const palettes = [
    ["#7C4DFF","#00D4FF","#FF4D6D"],
    ["#FFB703","#219EBC","#8E2DE2"],
    ["#06D6A0","#118AB2","#EF476F"],
    ["#A78BFA","#60A5FA","#F472B6"],
    ["#F97316","#22C55E","#38BDF8"]
  ];
  const p = palettes[Math.floor(Math.random() * palettes.length)];
  const r = document.documentElement.style;
  r.setProperty("--ink1", p[0]);
  r.setProperty("--ink2", p[1]);
  r.setProperty("--ink3", p[2]);

  // language switcher links (same page in another language)
  function setupLangSwitcher() {
    const sel = $("#langSelect");
    if (!sel) return;
    sel.value = langFromPath;

    sel.addEventListener("change", () => {
      const to = sel.value;
      const target = `/${to}/${pageId}.html`;
      location.href = target;
    });
  }

  async function loadI18n() {
    const res = await fetch("/assets/data/i18n.json", { cache: "no-store" });
    if (!res.ok) throw new Error("i18n.json load failed");
    return await res.json();
  }

  function t(dict, key) {
    const obj = dict[key];
    if (!obj) return "";
    return obj[langFromPath] ?? obj[DEFAULT_LANG] ?? "";
  }

  function applyI18n(dict) {
    // header brand
    const siteName = $(".brandTitle");
    const siteSub  = $(".brandSub");
    if (siteName) siteName.textContent = t(dict, "siteName");
    if (siteSub) siteSub.textContent = t(dict, "siteSub");

    // nav labels
    const home = $('[data-i18n="nav.home"]'); if (home) home.textContent = t(dict, "nav.home");
    const about = $('[data-i18n="nav.about"]'); if (about) about.textContent = t(dict, "nav.about");
    const sns = $('[data-i18n="nav.sns"]'); if (sns) sns.textContent = t(dict, "nav.sns");
    const contact = $('[data-i18n="nav.contact"]'); if (contact) contact.textContent = t(dict, "nav.contact");

    // hero
    const heroTitle = $('[data-i18n="hero.title"]'); if (heroTitle) heroTitle.textContent = t(dict, "hero.title");
    const heroLead  = $('[data-i18n="hero.lead"]'); if (heroLead) heroLead.textContent = t(dict, "hero.lead");

    // home tiles
    const wT = $('[data-i18n="home.tile.works.title"]'); if (wT) wT.textContent = t(dict, "home.tile.works.title");
    const wD = $('[data-i18n="home.tile.works.desc"]'); if (wD) wD.textContent = t(dict, "home.tile.works.desc");
    const lT = $('[data-i18n="home.tile.lookbook.title"]'); if (lT) lT.textContent = t(dict, "home.tile.lookbook.title");
    const lD = $('[data-i18n="home.tile.lookbook.desc"]'); if (lD) lD.textContent = t(dict, "home.tile.lookbook.desc");

    // page titles/bodies (generic)
    const pageTitle = $('[data-i18n="page.title"]');
    const pageBody  = $('[data-i18n="page.body"]');

    const titleKey = `page.${pageId}.title`;
    const bodyKey  = `page.${pageId}.body`;
    if (pageTitle) pageTitle.textContent = t(dict, titleKey);
    if (pageBody) pageBody.textContent  = t(dict, bodyKey);

    // footer
    const cp = $('[data-i18n="footer.copyright"]'); if (cp) cp.textContent = t(dict, "footer.copyright");
    const lic = $('[data-i18n="footer.license"]'); if (lic) lic.textContent = t(dict, "footer.license");

    const langLabel = $('[data-i18n="lang.label"]'); if (langLabel) langLabel.textContent = t(dict, "lang.label");

    // document title
    const pageName = t(dict, titleKey) || t(dict, "siteName");
    document.title = `${pageName} | ${t(dict,"siteName")}`;
  }

  // highlight active nav
  function setActiveNav(){
    const map = { index:"home", about:"about", sns:"sns", contact:"contact" };
    const active = map[pageId] || null;
    document.querySelectorAll(".navLink").forEach(a => a.classList.remove("isActive"));
    if (!active) return;
    const el = $(`.navLink[data-nav="${active}"]`);
    if (el) el.classList.add("isActive");
  }

  // Works gallery + modal
  async function setupWorks(){
    if (pageId !== "works") return;
    const grid = $("#gallery");
    const modal = $("#modal");
    const modalImg = $("#modalImg");
    const modalTitle = $("#modalTitle");
    const closeBtn = $("#modalClose");

    if (!grid || !modal || !modalImg || !modalTitle || !closeBtn) return;

    const res = await fetch("/assets/data/works.json", { cache:"no-store" });
    const items = res.ok ? await res.json() : [];

    grid.innerHTML = items.map(it => `
      <button class="thumb" type="button" data-src="${it.src}" data-title="${escapeHtml(it.title)}" aria-label="${escapeHtml(it.title)}">
        <img src="${it.src}" alt="${escapeHtml(it.alt || it.title)}" loading="lazy">
        <div class="cap">${escapeHtml(it.title)}</div>
      </button>
    `).join("");

    const open = (src, title) => {
      modalImg.src = src;
      modalTitle.textContent = title || "WORK";
      modal.classList.add("isOpen");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      modal.classList.remove("isOpen");
      modalImg.src = "";
      document.body.style.overflow = "";
    };

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".thumb");
      if (!btn) return;
      open(btn.dataset.src, btn.dataset.title);
    });

    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  async function boot(){
    try{
      setupLangSwitcher();
      setActiveNav();
      const dict = await loadI18n();
      applyI18n(dict);
      await setupWorks();
    }catch(err){
      // fail safe: show minimal (avoid white screen)
      console.error(err);
      document.documentElement.style.setProperty("--text", "rgba(255,255,255,.92)");
    }
  }

  boot();
})();

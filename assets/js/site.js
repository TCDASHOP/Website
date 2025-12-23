(() => {
  const LANGS = ["ja","en","es","fr","ko","zh-hans"];
  const DEFAULT_LANG = "ja";

  const pathParts = (location.pathname || "/").split("/").filter(Boolean);
  const lang = pathParts[0] && LANGS.includes(pathParts[0]) ? pathParts[0] : DEFAULT_LANG;

  // page id: index/about/sns/contact/works/lookbook/license
  const file = (pathParts[1] || "index.html").toLowerCase();
  const pageId = file.replace(".html","") || "index";

  const $ = (sel, root=document) => root.querySelector(sel);

  // subtle random palette (stays within your current vibe)
  const palettes = [
    ["#7C4DFF","#00D4FF","#FF4D6D"],
    ["#2D7DFF","#7B61FF","#FF8A00"],
    ["#00C2FF","#3D5AFE","#FF2E63"],
    ["#7B61FF","#00D4FF","#00FFA3"],
    ["#3D5AFE","#00C2FF","#FF4D6D"]
  ];
  function applyPalette(){
    const p = palettes[Math.floor(Math.random()*palettes.length)];
    document.documentElement.style.setProperty("--ink1", p[0]);
    document.documentElement.style.setProperty("--ink2", p[1]);
    document.documentElement.style.setProperty("--ink3", p[2]);
  }

  function cacheBust(url){
    const u = new URL(url, location.origin);
    u.searchParams.set("v", String(Date.now()));
    return u.toString();
  }

  async function fetchJson(url){
    const res = await fetch(cacheBust(url), { cache: "no-store" });
    if(!res.ok) throw new Error(`Failed to fetch: ${url} (${res.status})`);
    return await res.json();
  }

  // unified data
  async function loadSite(){
    return await fetchJson("/assets/data/site.json");
  }

  function t(i18n, key){
    const entry = i18n && i18n[key];
    if(!entry) return "";
    return entry[lang] ?? entry[DEFAULT_LANG] ?? "";
  }

  function applyText(el, value){
    if(!el) return;
    el.textContent = value ?? "";
  }

  function applyI18n(site){
    const i18n = site.i18n || {};

    // brand
    applyText($(".brandTitle"), t(i18n,"siteName"));
    // brandSub intentionally hidden/removed

    // nav
    applyText($('[data-i18n="nav.home"]'), t(i18n,"nav.home"));
    applyText($('[data-i18n="nav.about"]'), t(i18n,"nav.about"));
    applyText($('[data-i18n="nav.sns"]'), t(i18n,"nav.sns"));
    applyText($('[data-i18n="nav.contact"]'), t(i18n,"nav.contact"));

    // hero
    applyText($('[data-i18n="hero.title"]'), t(i18n,"hero.title"));
    applyText($('[data-i18n="hero.lead"]'), t(i18n,"hero.lead"));

    // home tiles
    applyText($('[data-i18n="home.tile.works.title"]'), t(i18n,"home.tile.works.title"));
    applyText($('[data-i18n="home.tile.works.desc"]'), t(i18n,"home.tile.works.desc"));
    applyText($('[data-i18n="home.tile.lookbook.title"]'), t(i18n,"home.tile.lookbook.title"));
    applyText($('[data-i18n="home.tile.lookbook.desc"]'), t(i18n,"home.tile.lookbook.desc"));

    // generic page title/body
    const titleKey = `page.${pageId}.title`;
    const bodyKey  = `page.${pageId}.body`;
    const bodyHtmlKey = `page.${pageId}.bodyHtml`;

    const pageTitle = $('[data-i18n="page.title"]');
    const pageBody  = $('[data-i18n="page.body"]');

    if (pageTitle) pageTitle.textContent = t(i18n, titleKey);

    if (pageBody){
      const htmlVal = t(i18n, bodyHtmlKey);
      if (htmlVal){
        pageBody.innerHTML = htmlVal;
        pageBody.classList.add("richText");
      } else {
        pageBody.textContent = t(i18n, bodyKey);
        pageBody.classList.remove("richText");
      }
    }

    // footer
    applyText($('[data-i18n="footer.copyright"]'), t(i18n,"footer.copyright"));
    applyText($('[data-i18n="footer.license"]'), t(i18n,"footer.license"));
    applyText($('[data-i18n="lang.label"]'), t(i18n,"lang.label"));

    // document title
    const pageName = t(i18n, titleKey) || t(i18n,"siteName") || "SAIREN COLOR ARCHIVE";
    document.title = `${pageName} | ${t(i18n,"siteName") || "SAIREN COLOR ARCHIVE"}`;
  }

  function setActiveNav(){
    const map = { index:"home", about:"about", sns:"sns", contact:"contact" };
    const active = map[pageId] || null;
    document.querySelectorAll(".navLink").forEach(a => a.classList.remove("isActive"));
    if (!active) return;
    const el = $(`.navLink[data-nav="${active}"]`);
    if (el) el.classList.add("isActive");
  }

  function setupLangSwitcher(){
    const sel = $("#langSelect");
    if (!sel) return;

    // set current
    sel.value = lang;

    sel.addEventListener("change", () => {
      const next = sel.value;
      if(!next || next === lang) return;

      // keep same page file name
      const currentFile = (pathParts[1] || "index.html");
      location.href = `/${next}/${currentFile}`;
    });
  }

  function applyConfig(site){
    // lookbook external link
    const lookbookUrl = site.lookbook && site.lookbook.externalUrl ? site.lookbook.externalUrl : null;
    if (lookbookUrl){
      document.querySelectorAll('a[href$="lookbook.html"], a[data-role="lookbook"]').forEach(a => {
        a.setAttribute("href", lookbookUrl);
        a.setAttribute("target", "_self");
      });
    }

    // contact email
    const email = site.contact && site.contact.email ? site.contact.email : null;
    if (email){
      const mailEl = $("#contactEmail");
      if (mailEl) mailEl.textContent = email;
      const mailLink = $("#contactEmailLink");
      if (mailLink) mailLink.setAttribute("href", `mailto:${email}`);
    }

    // sns links
    const ig = site.sns && site.sns.instagramUrl ? site.sns.instagramUrl : null;
    const tk = site.sns && site.sns.tiktokUrl ? site.sns.tiktokUrl : null;
    const igA = $('[data-sns="instagram"]');
    const tkA = $('[data-sns="tiktok"]');
    if (igA && ig) igA.setAttribute("href", ig);
    if (tkA && tk) tkA.setAttribute("href", tk);
  }

  async function setupWorks(site){
    if (pageId !== "works") return;

    const works = Array.isArray(site.works) ? site.works : [];
    const grid = $("#gallery");
    if (!grid) return;

    // Render: raw first, tap toggles to main
    grid.innerHTML = works.map(w => {
      const raw = w.raw || w.src || "";
      const main = w.main || "";
      const title = escapeHtml(w.title || "");
      const alt = escapeHtml(w.alt || w.title || "");
      return (
        `<button class="thumb" type="button"
                 data-raw="${raw}" data-main="${main}" data-state="raw"
                 aria-label="${title}">
           <img loading="lazy" src="${raw}" alt="${alt}">
         </button>`
      );
    }).join("");

    // Toggle on tap/click
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".thumb");
      if (!btn || !grid.contains(btn)) return;
      const img = btn.querySelector("img");
      if (!img) return;

      const raw = btn.dataset.raw || "";
      const main = btn.dataset.main || "";
      if (!raw || !main) return;

      const next = (btn.dataset.state || "raw") === "raw" ? "main" : "raw";
      btn.dataset.state = next;
      img.src = next === "raw" ? raw : main;
    }, { passive: true });
  })();
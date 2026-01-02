/* SAIREN COLOR ARCHIVE - site.js (FULL SITE V1)
   - i18n: replace all [data-i18n] (textContent) and [data-i18n-html] (innerHTML)
   - lang switch: keep same page while switching /<lang>/ folder
   - hamburger drawer: opens menu (HOME/WORKS/ABOUT/LOOKBOOK/SNS/CONTACT/LICENSE)
   - works: render formed-only grid from /assets/data/works.json
*/
(() => {
  "use strict";
  const SUPPORTED = ["ja","en","es","fr","ko","zh-hans"];
  const DEFAULT_LANG = "ja";

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------------------------------------------------------
  // Hero "matrix-scramble" animation
  //  - Keeps layout intact, but makes the headline feel like it is born from the
  //    same stream as the matrix/canvas background.
  //  - Runs once per page load to avoid re-triggering on drawer updates.
  // ---------------------------------------------------------------------------
  let heroAnimatedOnce = false;

  function scrambleReveal(el, finalText, opts={}){
    const duration = opts.duration ?? 1100;
    const delay = opts.delay ?? 0;
    const glyphs = opts.glyphs ?? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+-=<>?";
    const keepSpaces = true;

    // Preserve layout width while animating
    el.style.opacity = "1";
    el.setAttribute("aria-label", finalText);

    const startAt = performance.now() + delay;

    const tick = (t) => {
      if (t < startAt){
        requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, (t - startAt) / duration);
      const lockCount = Math.floor(finalText.length * p);

      let out = "";
      for (let i=0;i<finalText.length;i++){
        const ch = finalText[i];
        if (keepSpaces && ch === " ") { out += " "; continue; }
        if (i < lockCount) out += ch;
        else out += glyphs[Math.floor(Math.random()*glyphs.length)];
      }
      el.textContent = out;

      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = finalText;
    };
    requestAnimationFrame(tick);
  }

  function animateHeroMatrixText(){
    if (heroAnimatedOnce) return;
    const hero = $(".hero");
    if (!hero) return;

    const title = hero.querySelector('[data-hero-matrix="line1"]') || $("h1:not(.sr-only)", hero);
    const sub = hero.querySelector('[data-hero-matrix="line2"]') || $("p:not(.sr-only)", hero);
    if (!title || !sub) return;

    // Add the CSS blend/mono look only for the hero copy
    title.classList.add("matrixText");
    sub.classList.add("matrixText");

    // Capture final text AFTER i18n has filled it
    const t1 = (title.textContent || "").trim();
    const t2 = (sub.textContent || "").trim();
    if (!t1 && !t2) return;

    // Start hidden, then reveal in order with spacing
    title.style.opacity = "0";
    sub.style.opacity = "0";

    // Fade in gently (no sudden pop)
    requestAnimationFrame(() => {
      title.style.transition = "opacity 600ms ease";
      sub.style.transition = "opacity 700ms ease";
      title.style.opacity = "1";
      sub.style.opacity = "1";
    });

    // Scramble reveal (title -> short gap -> subtitle)
    scrambleReveal(title, t1, { duration: 1000, delay: 80 });
    scrambleReveal(sub, t2, { duration: 1200, delay: 680 });

    heroAnimatedOnce = true;
  }

  function detectLangFromPath(){
    const seg = location.pathname.split("/").filter(Boolean)[0];
    return SUPPORTED.includes(seg) ? seg : "ja";
  }

  function currentPageFile(){
    const SUP = ["ja","en","es","fr","ko","zh-hans"];
    const parts = location.pathname.split("/").filter(Boolean);
    // strip lang prefix if present
    const p = (parts.length && SUP.includes(parts[0])) ? parts.slice(1) : parts.slice(0);

    // root
    if(p.length === 0) return "index.html";

    const last = p[p.length-1];

    // If last segment has a file extension, keep full path
    if(last.includes(".")) return p.join("/");

    // directory route => append index.html
    return `${p.join("/")}/index.html`;
  }

  function langBase(lang){
    return (lang === "ja") ? "/" : `/${lang}/`;
  }

  function gotoLang(lang){
    const page = currentPageFile();
    location.href = `${langBase(lang)}${page}`;
  }

  async function loadI18n(){
    const res = await fetch("/assets/data/i18n.json", { cache: "no-store" });
    if(!res.ok) throw new Error("i18n.json not found");
    return await res.json();
  }

  function getText(dict, key, lang){
    const node = (dict.i18n||{})[key];
    if(!node) return "";
    return node[lang] ?? node[DEFAULT_LANG] ?? "";
  }

  function applyI18n(dict, lang){
    // textContent replacements
    $$("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const text = getText(dict, key, lang);
      el.textContent = text;
    });
    // innerHTML replacements (ABOUT body)
    $$("[data-i18n-html]").forEach(el => {
      const key = el.getAttribute("data-i18n-html");
      const html = getText(dict, key, lang);
      el.innerHTML = html;
    });

    const siteName = getText(dict, "siteName", lang) || "SAIREN COLOR ARCHIVE";
    // dispatch hook for matrix.js to re-scramble short labels
    document.dispatchEvent(new CustomEvent("sairen:i18n-applied"));
  }

  function wireBrandHome(){
    const brand = $(".brand");
    if(!brand) return;
    brand.addEventListener("click", () => {
      const lang = detectLangFromPath();
      location.href = (lang==="ja") ? "/index.html" : `/${lang}/index.html`;
    });
  }

  function wireLangSelect(lang){
    const sel = $("[data-lang-select]");
    if(!sel) return;
    sel.value = lang;
    sel.addEventListener("change", () => {
      const next = sel.value;
      localStorage.setItem("lang", next);
      gotoLang(next);
    });
  }

  function buildDrawer(dict, lang){
    const drawer = $("#drawer");
    const backdrop = $("#drawerBackdrop");
    const btn = $("#hamburgerBtn");
    if(!drawer || !backdrop || !btn) return;

	  // Drawer (hamburger) menu items.
	  // NOTE: WORKS / ABOUT / LOOKBOOK / SHOP are intentionally NOT listed here,
	  // because they already exist as HOME cards. This keeps the UI clean.
	  const items = [
	    { key:"nav.home", page:"index.html", icon:"⌂" },
	    { key:"nav.news", page:"news/", icon:"✦" },
        { key:"nav.blog", page:"blog/", icon:"✎" },
        { key:"nav.timeline", page:"timeline.html", icon:"⌁" },
	    { key:"nav.sns", page:"sns.html", icon:"◎" },
	    { key:"nav.contact", page:"contact.html", icon:"✉" },
	    { key:"nav.license", page:"license.html", icon:"§" },
	  ];

    const nav = document.createElement("div");
	  items.forEach(it => {
	    const a = document.createElement("a");
	    if(it.external){
	      a.href = it.href;
	      a.target = "_blank";
	      a.rel = "noopener";
	    }else{
	      a.href = `${langBase(lang)}${it.page}`;
	    }
	    a.innerHTML = `<span data-i18n="${it.key}"></span><span class="chev">›</span>`;
	    nav.appendChild(a);
	  });
    drawer.innerHTML = "";
    drawer.appendChild(nav);

    const open = () => {
      backdrop.classList.add("is-open");
      drawer.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      // reapply i18n because we injected data-i18n
      applyI18n(dict, lang);
    };
    const close = () => {
      backdrop.classList.remove("is-open");
      drawer.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if(drawer.classList.contains("is-open")) close();
      else open();
    });
    backdrop.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if(e.key==="Escape") close(); });
  }

  async function renderWorks(dict, lang){
    const grid = $("#worksGrid");
    if(!grid) return;
    grid.innerHTML = `<div class="card"><p data-i18n="ui.loading"></p></div>`;
    applyI18n(dict, lang);

    const res = await fetch("/assets/data/works.json", { cache:"no-store" });
    if(!res.ok){
      grid.innerHTML = `<div class="card"><p>works.json not found</p></div>`;
      return;
    }
    const data = await res.json();
    const works = Array.isArray(data.works) ? data.works : [];
    if(works.length === 0){
      grid.innerHTML = `<div class="card"><p>No works</p></div>`;
      return;
    }

    grid.innerHTML = "";
    works.forEach(w => {
      const card = document.createElement("div");
      card.className = "work-card";
      card.innerHTML = `
        <img src="${w.main}" alt="${w.alt || ""}" loading="lazy">
        <div class="label">${w.title || ""}</div>
      `;
      card.addEventListener("click", () => openWorkModal(w));
      grid.appendChild(card);
    });
  }
  async function renderTimeline(dict, lang){
    const nav = $("#timelineNav");
    const wrap = $("#timelineYears");
    if(!nav || !wrap) return;

    // Build year list (fixed range + any extra years found)
    const FIXED = ["2026","2025","2024","2023","2022","2021","2020"];

    nav.innerHTML = `<div class="timeline-nav-label" data-i18n="timeline.jump"></div>`;
    applyI18n(dict, lang);

    const res = await fetch("/assets/data/works.json", { cache:"no-store" });
    if(!res.ok){
      wrap.innerHTML = `<div class="card"><p>works.json not found</p></div>`;
      return;
    }
    const data = await res.json();
    const works = Array.isArray(data.works) ? data.works : [];

    const byYear = new Map();
    works.forEach(w => {
      const m = (w.main||"").match(/\/formed\/(\d{4})\//);
      const y = (w.year || (m ? m[1] : "") || "unknown").toString();
      if(!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(w);
    });

    const extraYears = Array.from(byYear.keys()).filter(y => y !== "unknown" && !FIXED.includes(y));
    extraYears.sort((a,b) => Number(b) - Number(a));

    const years = [...FIXED, ...extraYears];
    if(byYear.has("unknown")) years.push("unknown");

    // Build year buttons (always tappable)
    const btnRow = document.createElement("div");
    btnRow.className = "timeline-nav-buttons";
    years.forEach(y => {
      const count = (byYear.get(y) || []).length;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "timeline-year-btn" + (count===0 ? " is-empty" : "");
      b.textContent = (y==="unknown") ? "?" : y;
      b.addEventListener("click", () => {
        const id = (y==="unknown") ? "year-unknown" : `year-${y}`;
        const el = document.getElementById(id);
        if(el) el.scrollIntoView({ behavior:"smooth", block:"start" });
      });
      btnRow.appendChild(b);
    });
    nav.appendChild(btnRow);

    // Build year sections
    wrap.innerHTML = "";
    years.forEach(y => {
      const list = byYear.get(y) || [];
      const sec = document.createElement("section");
      sec.className = "card timeline-year";
      sec.id = (y==="unknown") ? "year-unknown" : `year-${y}`;

      const h2 = document.createElement("h2");
      h2.className = "timeline-year-title";
      h2.textContent = (y==="unknown") ? "UNKNOWN" : y;
      sec.appendChild(h2);

      if(list.length === 0){
        const empty = document.createElement("div");
        empty.className = "timeline-empty";
        empty.setAttribute("data-i18n", "timeline.empty");
        sec.appendChild(empty);
      }else{
        const grid = document.createElement("div");
        grid.className = "works-grid timeline-grid";
        list.forEach(w => {
          const card = document.createElement("div");
          card.className = "work-card";
          card.innerHTML = `
            <img src="${w.main}" alt="${w.alt || ""}" loading="lazy">
            <div class="label">${w.title || ""}</div>
          `;
          card.addEventListener("click", () => openWorkModal(w));
          grid.appendChild(card);
        });
        sec.appendChild(grid);
      }

      wrap.appendChild(sec);
    });

    // translate empty messages / label
    applyI18n(dict, lang);
  }


  function openWorkModal(work){
    const modal = $("#workModal");
    const img = $("#workModalImg");
    if(!modal || !img) return;
    img.src = work.main;
    img.alt = work.alt || "";
    modal.classList.add("is-open");
  }

  function wireModalClose(){
    const modal = $("#workModal");
    if(!modal) return;
    modal.addEventListener("click", (e) => {
      // close by tapping backdrop; no close button
      if(e.target === modal){
        modal.classList.remove("is-open");
        const img = $("#workModalImg");
        if(img) img.src = "";
      }
    });
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && modal.classList.contains("is-open")){
        modal.classList.remove("is-open");
        const img = $("#workModalImg");
        if(img) img.src = "";
      }
    });
  }

  function setFooterYear(){
    const el = $("#footerYear");
    if(!el) return;
    el.textContent = String(new Date().getFullYear());
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // Always set footer year first (failsafe)
    try { setFooterYear(); } catch (e) {}

    try {
    const urlLang = detectLangFromPath();
    const saved = localStorage.getItem("lang");
    const lang = (saved && SUPPORTED.includes(saved)) ? saved : urlLang;

    // ensure URL matches chosen language (complete sync)
    if(lang !== urlLang){
      gotoLang(lang);
      return;
    }

    const dict = await loadI18n();
    applyI18n(dict, lang);
    animateHeroMatrixText();
    wireBrandHome();
    wireLangSelect(lang);
    buildDrawer(dict, lang);
    wireModalClose();

    await renderWorks(dict, lang);
    await renderTimeline(dict, lang);

    // LOOKBOOK external link wiring (apply to all matching elements)
    const lbs = document.querySelectorAll("[data-lookbook-open]");
    if(lbs && lbs.length){
      const url = (dict.lookbook && dict.lookbook.externalUrl) ? dict.lookbook.externalUrl : "";
      if(url){
        lbs.forEach((a)=>{
          a.href = url;
          // External link behavior
          a.target = "_blank";
          a.rel = "noopener";
        });
      }
    }

    // CONTACT email wiring
    const emailLink = document.querySelector("[data-contact-email]");
    if(emailLink){
      const email = dict.contact?.email || "";
      if(email){
        emailLink.textContent = email;
        emailLink.href = `mailto:${email}`;
      }
    }

    // SNS icons wiring
    const ig = document.querySelector("[data-sns-instagram]");
    const tt = document.querySelector("[data-sns-tiktok]");
    if(ig) ig.href = dict.sns?.instagramUrl || "https://www.instagram.com/";
    if(tt) tt.href = dict.sns?.tiktokUrl || "https://www.tiktok.com/";
    } catch (e) {
      console.warn("site init failed", e);
    }

  });
})();

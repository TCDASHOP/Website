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


  const WORK_IMG_PLACEHOLDER = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <rect width="100%" height="100%" fill="#0b0c10"/>
  <rect x="40" y="40" width="1520" height="1120" rx="24" ry="24" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  <text x="50%" y="50%" fill="rgba(255,255,255,0.40)" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="44" text-anchor="middle" dominant-baseline="middle">COMING SOON</text>
</svg>`);

// ---------------------------------------------------------------------------
// Responsive WORKS images (srcset)
//  - Keeps existing `main.webp` as the safe fallback `src`
//  - Adds -960 / -1440 / -2048 candidates via srcset when available
// ---------------------------------------------------------------------------
const WORK_IMG_SIZES = "(max-width: 650px) 50vw, (max-width: 900px) 33vw, 25vw";
const WORK_MODAL_SIZES = "(max-width: 900px) 92vw, 80vw";

function buildWorkSrcset(mainPath){
  if(!mainPath || typeof mainPath !== "string") return "";
  if(!mainPath.endsWith("-main.webp")) return "";
  const base = mainPath.slice(0, -"-main.webp".length);
  return `${base}-960.webp 960w, ${base}-1440.webp 1440w, ${base}-2048.webp 2048w`;
}

  function applyImageFallback(scope){
    if(!scope) return;
    scope.querySelectorAll("img[data-work-img]").forEach((img) => {
      img.addEventListener("error", () => {
        const card = img.closest(".work-card");
        if(card) card.classList.add("is-missing");
        img.src = WORK_IMG_PLACEHOLDER;
      }, { once:true });
    });
  }

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
    return `/${lang}/`;
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

  function wireBrandHome(lang){
    const brand = $(".brand");
    if(!brand) return;
    brand.addEventListener("click", () => {
      location.href = `${langBase(lang)}index.html`;
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
      const srcset = buildWorkSrcset(w.main);
card.innerHTML = `
  <img data-work-img src="${w.main}" srcset="${srcset}" sizes="${WORK_IMG_SIZES}" alt="${w.alt || ""}" loading="lazy">
  <div class="label">${w.title || ""}</div>
`;
      card.addEventListener("click", () => openWorkModal(w));
      grid.appendChild(card);
    });
    applyImageFallback(grid);
  }
  async function renderTimeline(dict, lang){
    const nav = $("#timelineNav");
    const wrap = $("#timelineYears");
    if(!nav || !wrap) return;
    try {

    // Build year list (fixed range + any extra years found)
    const FIXED = ["2025","2024","2023","2022","2021","2020"];

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
          const srcset = buildWorkSrcset(w.main);
card.innerHTML = `
  <img data-work-img src="${w.main}" srcset="${srcset}" sizes="${WORK_IMG_SIZES}" alt="${w.alt || ""}" loading="lazy">
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
    applyImageFallback(wrap);
  } catch (e) {
    console.error("renderTimeline failed", e);
    wrap.innerHTML = `<div class="card"><p class="muted">Failed to render timeline.</p></div>`;
  }
  }

  function openWorkModal(work){
    const modal = $("#workModal");
    const img = $("#workModalImg");
    if(!modal || !img) return;
    img.src = work.main;
    img.srcset = buildWorkSrcset(work.main);
    img.sizes = WORK_MODAL_SIZES;
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
        if(img){ img.src = ""; img.removeAttribute("srcset"); img.removeAttribute("sizes"); }
      }
    });
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && modal.classList.contains("is-open")){
        modal.classList.remove("is-open");
        const img = $("#workModalImg");
        if(img){ img.src = ""; img.removeAttribute("srcset"); img.removeAttribute("sizes"); }
      }
    });
  }

  function setFooterYear(){
    const el = $("#footerYear");
    if(!el) return;
    el.textContent = String(new Date().getFullYear());
  }

  // --- SEO: hreflang alternates (multi-language) ---
  function injectHreflangAlternates(){
    try{
      const path = window.location.pathname || "/";
      const m = path.match(/^\/(ja|en|es|fr|ko|zh-hans)(\/|$)/);
      if(!m) return; // only for language-scoped pages
      let rest = path.replace(/^\/(ja|en|es|fr|ko|zh-hans)/, "");
      if(rest === "") rest = "/";

      const origin = window.location.origin;
      const langList = ["ja","en","es","fr","ko","zh-hans"];
      const hreflangMap = {
        "ja": "ja",
        "en": "en",
        "es": "es",
        "fr": "fr",
        "ko": "ko",
        "zh-hans": "zh-Hans"
      };
      const defaultLang = "ja";

      // Remove existing alternates we manage (avoid duplicates)
      const existing = document.head.querySelectorAll('link[rel="alternate"][hreflang]');
      existing.forEach((el) => {
        const hl = (el.getAttribute("hreflang") || "").toLowerCase();
        const managed = Object.values(hreflangMap).map(v => v.toLowerCase());
        if(hl === "x-default" || managed.includes(hl)){
          el.remove();
        }
      });

      langList.forEach((lang) => {
        const link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", hreflangMap[lang]);
        link.setAttribute("href", origin + "/" + lang + (rest.startsWith("/") ? rest : ("/" + rest)));
        document.head.appendChild(link);
      });

      const xdef = document.createElement("link");
      xdef.setAttribute("rel", "alternate");
      xdef.setAttribute("hreflang", "x-default");
      xdef.setAttribute("href", origin + "/" + defaultLang + (rest.startsWith("/") ? rest : ("/" + rest)));
      document.head.appendChild(xdef);
    }catch(e){
      // fail-safe: never block page rendering because of SEO tags
    }
  }
  document.addEventListener("DOMContentLoaded", async () => {
    // Always set footer year first (failsafe)
    try { setFooterYear(); } catch (e) {}
    try { injectHreflangAlternates(); } catch (e) {}

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
    wireBrandHome(lang);
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

    // CONTACT wiring (subject auto-fill + copy + spam-safe display)
    const emailTile = document.querySelector("[data-contact-email]");
    if(emailTile){
      const email = (dict.contact && dict.contact.email) ? dict.contact.email : "";
      const titleEl = emailTile.querySelector("[data-contact-email-text]") || emailTile.querySelector(".tile-title");
      const topicSel = document.querySelector("[data-contact-topic]");
      const copyBtn = document.querySelector("[data-contact-copy]");

      const getSubject = () => {
        const baseSubject = getText(dict, "contact.mailSubject.default", lang) || "SAIREN COLOR ARCHIVE — Contact";
        if(topicSel && topicSel.value){
          const opt = topicSel.options[topicSel.selectedIndex];
          const topic = (opt && opt.textContent) ? opt.textContent.trim() : "";
          if(topic) return `${topic} — SAIREN COLOR ARCHIVE`;
        }
        return baseSubject;
      };

      const updateMailto = () => {
        if(!email) return;
        if(titleEl){
          titleEl.textContent = email.replace("@", " [at] ");
        }
        const subject = getSubject();
        emailTile.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
      };

      updateMailto();
      if(topicSel){
        topicSel.addEventListener("change", updateMailto);
      }

      if(copyBtn && email){
        const copyLabel = getText(dict, "contact.copy", lang) || copyBtn.textContent || "Copy";
        const copiedLabel = getText(dict, "contact.copied", lang) || "Copied";
        copyBtn.addEventListener("click", async () => {
          try{
            if(navigator.clipboard && window.isSecureContext){
              await navigator.clipboard.writeText(email);
            }else{
              const ta = document.createElement("textarea");
              ta.value = email;
              ta.setAttribute("readonly","");
              ta.style.position = "fixed";
              ta.style.left = "-9999px";
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              document.body.removeChild(ta);
            }
            copyBtn.textContent = copiedLabel;
            copyBtn.disabled = true;
            setTimeout(() => {
              copyBtn.textContent = copyLabel;
              copyBtn.disabled = false;
            }, 1200);
          }catch(e){
            // ignore
          }
        });
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


  // ---------------------------------------------------------------------------
  // Save deterrence (right-click / long-press) - WORKS images
  //  - Not perfect prevention, but blocks common save gestures/menus.
  // ---------------------------------------------------------------------------
  (function protectArtworkMedia(){
    const isArtworkTarget = (t) => {
      if(!t || !t.closest) return false;
      return Boolean(
        t.closest(".work-card") ||
        t.closest("#workModal") ||
        t.closest(".modal")
      );
    };

    // Disable context menu on artwork areas (desktop right-click)
    document.addEventListener("contextmenu", (e) => {
      if(isArtworkTarget(e.target)) e.preventDefault();
    }, { capture:true });

    // Disable drag (drag-to-desktop save)
    document.addEventListener("dragstart", (e) => {
      if(isArtworkTarget(e.target)) e.preventDefault();
    }, { capture:true });

    // Reduce text/image selection on long-press
    document.addEventListener("selectstart", (e) => {
      if(isArtworkTarget(e.target)) e.preventDefault();
    }, { capture:true });

    // iOS long-press helper: prevent default only after a short hold
    let holdTimer = null;
    document.addEventListener("touchstart", (e) => {
      if(!isArtworkTarget(e.target)) return;
      holdTimer = setTimeout(() => {
        try { e.preventDefault(); } catch(_) {}
      }, 450);
    }, { passive:false, capture:true });

    const clearHold = () => {
      if(holdTimer){ clearTimeout(holdTimer); holdTimer = null; }
    };
    document.addEventListener("touchend", clearHold, { capture:true });
    document.addEventListener("touchmove", clearHold, { capture:true });
    document.addEventListener("touchcancel", clearHold, { capture:true });
  })();

})();


/* ===== Watermark on save-attempt (right-click / long-press only) ===== */
(function watermarkOnSaveAttempt(){
  const WM_TEXT = "https://sairencolorarchive.com";
  const SHOW_MS = 850; // 0.6–1.0s range (fixed here)
  const TILE = 240;    // must match CSS background-size for consistency

  function svgDataUrl(text){
    // Tiled SVG with rotated text. Kept lightweight.
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">
  <rect width="100%" height="100%" fill="transparent"/>
  <g transform="translate(${TILE/2},${TILE/2}) rotate(-20)">
    <text x="0" y="0" text-anchor="middle"
      font-family="system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
      font-size="18"
      fill="rgba(255,255,255,0.9)"
      stroke="rgba(0,0,0,0.35)" stroke-width="0.6"
      paint-order="stroke"
    >${text}</text>
  </g>
</svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.trim());
  }

  const WM_BG = `url("${svgDataUrl(WM_TEXT)}")`;

  function pickArtworkImage(target){
    if (!target) return null;
    const img = target.closest?.(".work-card img, #workModal img");
    if (img) return img;
    const card = target.closest?.(".work-card");
    if (card) return card.querySelector("img");
    const modal = target.closest?.("#workModal");
    if (modal) return modal.querySelector("img");
    return null;
  }

  function showWatermarkOver(img){
    if (!img) return;
    const rect = img.getBoundingClientRect();
    // Ignore invisible / zero-sized targets
    if (rect.width < 8 || rect.height < 8) return;

    const overlay = document.createElement("div");
    overlay.className = "sairen-wm-overlay";
    overlay.style.left = rect.left + "px";
    overlay.style.top = rect.top + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
    overlay.style.backgroundImage = WM_BG;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-on"));

    // Cleanup
    window.setTimeout(() => {
      overlay.classList.remove("is-on");
      window.setTimeout(() => overlay.remove(), 120);
    }, SHOW_MS);
  }

  // Right-click: show watermark immediately
  document.addEventListener("contextmenu", (e) => {
    const img = pickArtworkImage(e.target);
    if (!img) return;
    showWatermarkOver(img);
  }, { capture: true });

  // Long-press: show watermark shortly after press begins
  let lpTimer = null;
  function clearLP(){
    if (lpTimer) window.clearTimeout(lpTimer);
    lpTimer = null;
  }

  document.addEventListener("touchstart", (e) => {
    const img = pickArtworkImage(e.target);
    if (!img) return;

    clearLP();
    lpTimer = window.setTimeout(() => {
      showWatermarkOver(img);
    }, 280); // before iOS long-press menu typically appears
  }, { passive: true, capture: true });

  document.addEventListener("touchend", clearLP, { capture: true });
  document.addEventListener("touchmove", clearLP, { capture: true });
  document.addEventListener("touchcancel", clearLP, { capture: true });
})();

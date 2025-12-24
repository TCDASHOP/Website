const SUPPORTED_LANGS = ["ja","en","es","fr","ko","zh-hans"];

const Site = (() => {
  let cfg = null;

  const detectLangFromPath = () => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const maybe = parts[0] || "";
    if (SUPPORTED_LANGS.includes(maybe)) return maybe;
    return null;
  };

  const getPageName = () => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "index.html";
    // If directory URL like /en/ -> treat as index.html
    if (!last.includes(".")) return "index.html";
    return last;
  };

  const getStoredLang = () => {
    try { return localStorage.getItem("sca_lang"); } catch { return null; }
  };

  const setStoredLang = (lang) => {
    try { localStorage.setItem("sca_lang", lang); } catch {}
  };

  const fetchConfig = async () => {
    if (cfg) return cfg;
    const res = await fetch("/assets/site.config.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load site.config.json");
    cfg = await res.json();
    return cfg;
  };

  const getText = (key, lang) => {
    const dict = cfg?.i18n?.[key];
    if (!dict) return null;
    return dict[lang] ?? dict["ja"] ?? null;
  };

  const applyI18n = (lang) => {
    document.documentElement.setAttribute("lang", lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const t = getText(key, lang);
      if (t != null) el.textContent = t;
    });

    // Set page title if present
    const titleKey = document.querySelector("meta[name='sca-title-key']")?.getAttribute("content");
    if (titleKey) {
      const t = getText(titleKey, lang);
      if (t) document.title = t + " | " + (getText("siteName", lang) || "SAIREN COLOR ARCHIVE");
    } else {
      const sn = getText("siteName", lang);
      if (sn) document.title = sn;
    }
  };

  const wireLangSelector = (lang) => {
    const sel = document.getElementById("langSelect");
    if (!sel) return;

    // populate options (keeps HTML simple)
    if (sel.options.length === 0) {
      const labels = {
        "ja":"日本語", "en":"English", "es":"Español", "fr":"Français", "ko":"한국어", "zh-hans":"中文(简体)"
      };
      SUPPORTED_LANGS.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l;
        opt.textContent = labels[l] || l;
        sel.appendChild(opt);
      });
    }

    sel.value = lang;

    sel.addEventListener("change", () => {
      const next = sel.value;
      if (!SUPPORTED_LANGS.includes(next)) return;
      setStoredLang(next);

      const page = getPageName();
      // ja is the root (and /ja/ is also provided as a mirror)
      if (next === "ja") {
        window.location.href = "/" + page;
      } else {
        window.location.href = "/" + next + "/" + page;
      }
    });
  };

  const wireDrawer = () => {
    const openBtn = document.getElementById("drawerOpen");
    const closeBtn = document.getElementById("drawerClose");
    const drawer = document.getElementById("drawer");
    const backdrop = document.getElementById("drawerBackdrop");

    if (!drawer || !backdrop) return;

    const open = () => {
      drawer.classList.add("isOpen");
      backdrop.classList.add("isOpen");
      drawer.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      drawer.classList.remove("isOpen");
      backdrop.classList.remove("isOpen");
      drawer.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    };

    openBtn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  };

  const setDrawerLinks = (lang) => {
    const mk = (id, hrefRoot) => {
      const a = document.getElementById(id);
      if (!a) return;
      const page = hrefRoot.endsWith(".html") ? hrefRoot : (hrefRoot + ".html");
      if (lang === "ja") a.href = "/" + page;
      else a.href = "/" + lang + "/" + page;
    };
    mk("navHome", "index.html");
    mk("navWorks", "works.html");
    mk("navAbout", "about.html");
    mk("navSns", "sns.html");
    mk("navContact", "contact.html");
    mk("navLicense", "license.html");

    const lb = document.getElementById("navLookbook");
    if (lb) {
      const url = cfg?.lookbook?.externalUrl || "https://look.sairencolorarchive.com/";
      lb.href = url;
      lb.target = "_blank";
      lb.rel = "noopener";
    }
  };

  const randomNeon = () => {
    const hues = [136, 152, 170, 195, 210, 290, 320, 42];
    const h = hues[Math.floor(Math.random() * hues.length)];
    const s = 92;
    const l = 70;
    return `hsl(${h} ${s}% ${l}%)`;
  };

  const wireRandomColorText = () => {
    const targets = document.querySelectorAll("[data-randcolor='1']");
    if (!targets.length) return;

    const tick = () => {
      const c = randomNeon();
      targets.forEach(el => {
        el.style.color = c;
        el.style.textShadow = `0 0 18px rgba(88,255,201,.28), 0 0 30px ${c}`;
      });
    };
    tick();
    setInterval(tick, 1200);
  };

  const setFooterYear = () => {
    const y = String(new Date().getFullYear());
    const el = document.getElementById("footerYear");
    if (el) el.textContent = y;
    const el2 = document.getElementById("footerYearDrawer");
    if (el2) el2.textContent = y;
  };

  const init = async () => {
    await fetchConfig();

    const pathLang = detectLangFromPath();
    const stored = getStoredLang();
    const fallback = cfg?.defaults?.lang || "ja";
    const lang = (pathLang || stored || fallback);
    setStoredLang(lang);

    applyI18n(lang);
    wireLangSelector(lang);
    wireDrawer();
    setDrawerLinks(lang);

    const brand = document.getElementById("brandHome");
    if (brand) {
      const page = "index.html";
      brand.href = (lang === "ja") ? ("/" + page) : ("/" + lang + "/" + page);
    }
    wireRandomColorText();
    setFooterYear();

    // Dynamic pages
    const pageType = document.body.getAttribute("data-page");
    if (pageType === "sns") {
      const ig = document.getElementById("igLink");
      const tt = document.getElementById("ttLink");
      if (ig) ig.href = cfg?.sns?.instagramUrl || "https://www.instagram.com/tcda.shop";
      if (tt) tt.href = cfg?.sns?.tiktokUrl || "https://www.tiktok.com/@tcda.shop";
    }
    if (pageType === "contact") {
      const mail = document.getElementById("contactMail");
      if (mail) {
        const email = cfg?.contact?.email || "info@sairencolorarchive.com";
        mail.textContent = email;
        mail.href = "mailto:" + email;
      }
    }
    if (pageType === "about") {
      const body = document.getElementById("aboutBody");
      if (body) {
        const t = getText("about.body", lang) || "";
        body.textContent = t;
      }
    }
    if (pageType === "lookbook") {
      const a = document.getElementById("lookbookGo");
      const url = cfg?.lookbook?.externalUrl || "https://look.sairencolorarchive.com/";
      if (a) a.href = url;
    }
  };

  return { init, fetchConfig };
})();

window.addEventListener("DOMContentLoaded", () => {
  Site.init().catch(err => console.error(err));
});

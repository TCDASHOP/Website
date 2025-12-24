(function () {
  const SUPPORTED = ["ja","en","es","fr","ko","zh-hans"];

  function normalize(lang){
    if(!lang) return null;
    lang = String(lang).toLowerCase();
    if(lang==="zh" || lang==="zh-cn" || lang==="zh-hans") return "zh-hans";
    if(SUPPORTED.includes(lang)) return lang;
    return null;
  }

  async function loadConfig(){
    if(window.SITE_CONFIG) return window.SITE_CONFIG;
    const res = await fetch("/assets/site.config.json", { cache:"no-store" });
    window.SITE_CONFIG = await res.json();
    return window.SITE_CONFIG;
  }

  function langFromUrl(){
    const p = new URLSearchParams(location.search);
    return normalize(p.get("lang"));
  }
  function langFromStorage(){
    return normalize(localStorage.getItem("lang"));
  }

  function setUrlLang(lang){
    const u = new URL(location.href);
    u.searchParams.set("lang", lang);
    history.replaceState(null, "", u.toString());
  }

  function t(cfg, key, lang){
    const fallback = normalize(cfg?.defaults?.lang) || "ja";
    const obj = cfg?.i18n?.[key];
    if(!obj) return key;
    return obj[lang] ?? obj[fallback] ?? obj["en"] ?? obj["ja"] ?? key;
  }

  function apply(cfg, lang){
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el)=>{
      const key = el.getAttribute("data-i18n");
      const value = t(cfg, key, lang);
      if(el.getAttribute("data-i18n-html")==="1") el.innerHTML = value;
      else el.textContent = value;
    });

    // keep language on internal links
    document.querySelectorAll("a[data-keep-lang]").forEach((a)=>{
      try{
        const u = new URL(a.getAttribute("href"), location.origin);
        u.searchParams.set("lang", lang);
        a.setAttribute("href", u.pathname + u.search);
      }catch(_){}
    });
  }

  function syncSelect(lang){
    const sel = document.getElementById("langSelect");
    if(sel) sel.value = lang;
  }

  async function initI18n(){
    const cfg = await loadConfig();
    const lang = langFromUrl() || langFromStorage() || normalize(cfg?.defaults?.lang) || "ja";

    localStorage.setItem("lang", lang);
    setUrlLang(lang);

    apply(cfg, lang);
    syncSelect(lang);

    const sel = document.getElementById("langSelect");
    if(sel){
      sel.addEventListener("change", ()=>{
        const next = normalize(sel.value) || "ja";
        localStorage.setItem("lang", next);
        setUrlLang(next);
        apply(cfg, next);
      });
    }
  }

  window.initI18n = initI18n;
  window.addEventListener("DOMContentLoaded", ()=>window.initI18n?.());
})();
(() => {
  const LANGS = ["ja", "en", "es", "fr", "ko", "zh-hans"];
  const DEFAULT = "ja";

  function parts() {
    return location.pathname.split("/").filter(Boolean);
  }

  function detectLang() {
    const p = parts();
    const found = p.find(seg => LANGS.includes(seg));
    return found || null;
  }

  function basePrefix() {
    // Handles:
    // - /ja/works.html            -> ""
    // - /Website/ja/works.html    -> "/Website"
    // - /Website/index.html       -> "/Website"
    const p = parts();
    const langIndex = p.findIndex(seg => LANGS.includes(seg));
    const base = (langIndex >= 0) ? p.slice(0, langIndex) : p.slice(0, Math.max(0, p.length - 1));
    return base.length ? ("/" + base.join("/")) : "";
  }

  function currentFile() {
    const p = parts();
    const last = p[p.length - 1] || "index.html";
    return last.endsWith(".html") ? last : "index.html";
  }

  function go(lang, file = "index.html") {
    const base = basePrefix();
    location.href = `${base}/${lang}/${file}`;
  }

  // Root index.html should redirect to a language home.
  const currentLang = detectLang();
  if (!currentLang) {
    const saved = localStorage.getItem("sca_lang") || DEFAULT;
    go(LANGS.includes(saved) ? saved : DEFAULT, "index.html");
    return;
  }

  // Sync select
  const select = document.getElementById("langSelect");
  if (select) {
    select.value = currentLang;
    select.addEventListener("change", () => {
      const next = select.value;
      if (!LANGS.includes(next)) return;
      localStorage.setItem("sca_lang", next);
      go(next, currentFile());
    });
  }
})();

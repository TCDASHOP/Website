(async function(){
  const $ = (s, el=document)=> el.querySelector(s);
  const $$ = (s, el=document)=> Array.from(el.querySelectorAll(s));

  // Theme
  const THEME_KEY = "sca_theme";
  const savedTheme = localStorage.getItem(THEME_KEY);
  if(savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

  // Load locales
  async function loadJSON(path){
    const res = await fetch(path, {cache:"no-store"});
    if(!res.ok) throw new Error("Failed to load: " + path);
    return await res.json();
  }

  // Paths: pages are under /<lang>/, assets are at /assets/
  // Use relative paths so it works on custom domain + GitHub Pages subpath.
  const ASSETS = "../assets";
  const lang = document.body.dataset.lang || "ja";
  const page = document.body.dataset.page || "home";

  let locales;
  try{
    locales = await loadJSON(`${ASSETS}/data/locales.json`);
  }catch(e){
    console.warn(e);
    return;
  }
  const t = (key)=> {
    const L = locales[lang] || locales["en"];
    return key.split(".").reduce((o,k)=> (o && o[k]!==undefined)?o[k]:undefined, L);
  };

  // Build header (single source of truth)
  const header = document.createElement("header");
  header.innerHTML = `
    <a class="skiplink" href="#main">Skip</a>
    <div class="wrap">
      <div class="navbar">
        <a class="brand" href="./index.html" aria-label="SAIREN COLOR ARCHIVE">
          <img src="${ASSETS}/images/ui/logo.svg" alt="" />
          <div>
            <div class="title">SAIREN COLOR ARCHIVE</div>
            <span class="tag">${t("siteTag")}</span>
          </div>
        </a>

        <nav class="pills" aria-label="Primary">
          <a class="pill" data-nav="home" href="./index.html">${t("nav.home")}</a>
          <a class="pill" data-nav="works" href="./works.html">${t("nav.works")}</a>
          <a class="pill" data-nav="about" href="./about.html">${t("nav.about")}</a>
          <a class="pill" data-nav="lookbook" href="./lookbook.html">${t("nav.lookbook")}</a>
          <a class="pill" data-nav="sns" href="./sns.html">${t("nav.sns")}</a>
          <a class="pill" data-nav="contact" href="./contact.html">${t("nav.contact")}</a>
        </nav>

        <div class="ctrl">
          <div class="langbar" aria-label="Language">
            <button class="lang" data-lang="ja" type="button">JA</button>
            <button class="lang" data-lang="en" type="button">EN</button>
            <button class="lang" data-lang="es" type="button">ES</button>
            <button class="lang" data-lang="fr" type="button">FR</button>
            <button class="lang" data-lang="ko" type="button">KO</button>
            <button class="lang" data-lang="zh-hans" type="button">中文</button>
          </div>
          <button class="iconbtn" id="themeBtn" type="button" aria-label="Theme">
            ☾
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.prepend(header);

  // Mark current nav
  const current = header.querySelector(`[data-nav="${page}"]`);
  if(current) current.setAttribute("aria-current","page");

  // Lang pressed
  $$(".lang", header).forEach(b=>{
    b.setAttribute("aria-pressed", b.dataset.lang === lang ? "true" : "false");
  });

  // Theme button
  const themeBtn = $("#themeBtn", header);
  const setTheme = (v)=>{
    document.documentElement.setAttribute("data-theme", v);
    localStorage.setItem(THEME_KEY, v);
    themeBtn.textContent = v === "light" ? "☼" : "☾";
  };
  const initTheme = document.documentElement.getAttribute("data-theme") || "dark";
  setTheme(initTheme);

  themeBtn.addEventListener("click", ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  });

  // Language switching: keep the same page filename
  $$(".lang", header).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const target = btn.dataset.lang;
      if(target === lang) return;
      const file = location.pathname.split("/").pop() || "index.html";
      // from /ja/xxx.html -> ../en/xxx.html
      location.href = `../${target}/${file}`;
    });
  });

  // Footer (single)
  const footer = document.createElement("div");
  footer.className = "wrap";
  footer.innerHTML = `
    <div class="footer">
      <div>© SAIREN COLOR ARCHIVE</div>
      <div style="display:flex; gap:14px; align-items:center">
        <a href="./license.html">${t("licenseTitle")}</a>
        <a href="./contact.html">${t("nav.contact")}</a>
      </div>
    </div>
  `;
  document.body.append(footer);

  // Inject localized strings
  // Elements with data-i18n="key.path" get replaced with textContent
  $$("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    const val = t(key);
    if(val!==undefined) el.textContent = val;
  });

  // Elements with data-i18n-href="key.path" get replaced with href
  $$("[data-i18n-href]").forEach(el=>{
    const key = el.getAttribute("data-i18n-href");
    const val = t(key);
    if(val!==undefined) el.setAttribute("href", val);
  });

})();

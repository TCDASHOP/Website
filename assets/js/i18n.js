(() => {
  const DEFAULT_LANG = 'ja';
  const SUPPORTED = ['ja','en','es','fr','ko','zh-hans'];

  function getQueryLang() {
    const p = new URLSearchParams(location.search);
    const q = p.get('lang');
    if (q && SUPPORTED.includes(q)) return q;
    return null;
  }

  function detectLang() {
    const q = getQueryLang();
    if (q) return q;
    const saved = localStorage.getItem('lang');
    if (saved && SUPPORTED.includes(saved)) return saved;
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('zh')) return 'zh-hans';
    if (nav.startsWith('ko')) return 'ko';
    if (nav.startsWith('fr')) return 'fr';
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('en')) return 'en';
    return DEFAULT_LANG;
  }

  async function loadConfig() {
    const res = await fetch('/assets/site.config.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load site.config.json');
    return await res.json();
  }

  function t(i18n, key, lang) {
    const node = i18n[key];
    if (!node) return null;
    return node[lang] ?? node[DEFAULT_LANG] ?? null;
  }

  function applyTranslations(config, lang) {
    const i18n = config.i18n || {};

    // textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(i18n, key, lang);
      if (val != null) el.textContent = val;
    });

    // innerHTML
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = t(i18n, key, lang);
      if (val != null) el.innerHTML = val;
    });

    // title fallback
    const titleKey = document.documentElement.getAttribute('data-i18n-title');
    if (titleKey) {
      const v = t(i18n, titleKey, lang);
      if (v) document.title = v;
    }
  }

  function setLangLinks(lang) {
    // Keep current lang in same-page links
    document.querySelectorAll('a[data-keep-lang="1"]').forEach(a => {
      const url = new URL(a.getAttribute('href'), location.origin);
      url.searchParams.set('lang', lang);
      a.setAttribute('href', url.pathname + url.search + url.hash);
    });
  }

  function updateLangSelect(lang) {
    const sel = document.getElementById('langSelect');
    if (!sel) return;
    sel.value = lang;
    sel.addEventListener('change', () => {
      const next = sel.value;
      localStorage.setItem('lang', next);
      const url = new URL(location.href);
      url.searchParams.set('lang', next);
      location.href = url.pathname + url.search + url.hash;
    });
  }

  window.__SCA_I18N__ = { detectLang, loadConfig, applyTranslations, setLangLinks, updateLangSelect };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const config = await loadConfig();
      const lang = detectLang();
      localStorage.setItem('lang', lang);
      document.documentElement.setAttribute('lang', lang);
      applyTranslations(config, lang);
      setLangLinks(lang);
      updateLangSelect(lang);
    } catch (e) {
      console.error(e);
    }
  });
})();
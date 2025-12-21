// SAIREN COLOR ARCHIVE — small, deliberate JS (no libraries)

(() => {
  // Year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Language pack
  const dict = {
    en: {
      nav_works: "Works",
      nav_about: "About",
      nav_brand: "Apparel Brand",
      nav_info: "Info",
      nav_top: "Back to top",

      chip_sound: "Sound",
      chip_enter: "Enter",

      hero_kicker: "ARCHIVE / LOOKBOOK / ARTWORKS",
      hero_title: "Color is not decoration.<br />It is structure.",
      hero_lede: "A living archive where visual thought becomes wearable form — and returns to art again.",
      cta_viewworks: "View Works",
      cta_brand: "Explore Apparel Brand",
      hero_micro: "Minimal UI. Maximum presence. Scroll slowly.",

      works_title: "Works",
      works_sub: "Selected lookbooks and artworks. Each piece is a chapter, not a product.",
      work1_desc: "A first signal: color as a system, not a mood.",
      work2_desc: "Quiet intensity: saturation with restraint.",
      work3_desc: "When the body becomes the frame, the world becomes the gallery.",
      works_note: "Tip: replace the “#” links with your lookbook pages later. The design stays.",

      about_title: "About",
      about_p1: "Sairen Takashima is an artist and founder of an apparel brand that treats clothing as an extension of visual philosophy.",
      about_p2: "Working with color as structure, not decoration — building a language that can be worn, archived, and re-read.",
      about_quote: "“A moving canvas — where visual thought becomes wearable form.”",

      panel_title: "Archive Principles",
      p1: "Color accuracy matters. Beauty without truth is decoration.",
      p2: "Minimal text. Presence is the message.",
      p3: "Works are chapters — each has context and intent.",
      p4: "The archive expands slowly, deliberately.",

      brand_title: "Apparel Brand",
      brand_sub: "Wearable extensions of the archive. The shop is not the story — it’s a portal.",
      brand_h: "Transcend Color Digital Apparel",
      brand_p: "Items are produced on-demand. Visuals may include AI-generated models for representation only; artworks/designs are original.",
      brand_btn: "Visit Apparel Brand",
      brand_btn2: "Read Notes",

      info_title: "Info",
      info_sub: "Practical notes and clarity. No noise.",
      contact_title: "Contact",
      notes_title: "Notes",
      n1: "AI-generated models may be used for visual representation only (artworks/designs are original).",
      n2: "Colors may vary depending on display and production process.",
      n3: "This archive is independent from the apparel sales platform.",
      nav_title: "Navigation",

      footer_m: "Built for calm, built for color."
    },

    ja: {
      nav_works: "Works",
      nav_about: "About",
      nav_brand: "Apparel Brand",
      nav_info: "Info",
      nav_top: "TOPへ",

      chip_sound: "Sound",
      chip_enter: "Enter",

      hero_kicker: "ARCHIVE / LOOKBOOK / ARTWORKS",
      hero_title: "色は装飾ではない。<br />構造である。",
      hero_lede: "視覚思考が“着られる形”になり、またアートへ戻っていく。ここはそのアーカイブ。",
      cta_viewworks: "作品を見る",
      cta_brand: "アパレルブランドへ",
      hero_micro: "UIは最小。存在感は最大。ゆっくりスクロールして。",

      works_title: "Works",
      works_sub: "ルックブックとアートワークの選抜。これは商品一覧ではなく、章の集合。",
      work1_desc: "最初の信号：気分ではなく、システムとしての色。",
      work2_desc: "静かな強度：抑制された飽和。",
      work3_desc: "身体がフレームになるとき、世界はギャラリーになる。",
      works_note: "※「#」リンクは後でルックブックのURLに差し替えてください。デザインは崩れません。",

      about_title: "About",
      about_p1: "高嶋彩蓮（Sairen Takashima）。衣服を“視覚哲学の延長”として扱うアパレルブランドの創設者でありアーティスト。",
      about_p2: "色を装飾ではなく構造として扱い、着られ、記録され、再読される言語を組み立てる。",
      about_quote: "「動くキャンバス——視覚思考が着用可能な形になる。」",

      panel_title: "Archive Principles",
      p1: "色の正確さは重要。真実のない美は装飾に落ちる。",
      p2: "テキストは最小。存在感そのものがメッセージ。",
      p3: "作品は章。意図と文脈を持つ。",
      p4: "アーカイブはゆっくり、意図的に拡張する。",

      brand_title: "Apparel Brand",
      brand_sub: "アーカイブの“着用可能な拡張”。ショップは物語ではなく、入口。",
      brand_h: "Transcend Color Digital Apparel",
      brand_p: "アイテムはオンデマンド生産。ビジュアルには表現目的でAI生成モデルを含む場合があります（アート/デザインはオリジナル）。",
      brand_btn: "Apparel Brandへ",
      brand_btn2: "注記を読む",

      info_title: "Info",
      info_sub: "必要な情報だけ。ノイズは入れない。",
      contact_title: "Contact",
      notes_title: "Notes",
      n1: "AI生成モデルは表現目的で使用される場合があります（アート/デザインはオリジナル）。",
      n2: "色味は閲覧環境および製造工程により差が出る場合があります。",
      n3: "本アーカイブは、販売プラットフォームとは独立しています。",
      nav_title: "Navigation",

      footer_m: "静けさのために、色のために。"
    }
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Apply language
  function applyLang(lang) {
    const pack = dict[lang] || dict.en;
    $$("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key || !(key in pack)) return;
      // allow <br/> in some strings
      el.innerHTML = pack[key];
    });

    // Toggle label
    const label = document.getElementById("langLabel");
    if (label) label.textContent = (lang === "ja") ? "EN" : "JP";

    // Store
    localStorage.setItem("sca_lang", lang);
  }

  // Init language
  const saved = localStorage.getItem("sca_lang");
  const initial = saved || (navigator.language?.startsWith("ja") ? "ja" : "en");
  applyLang(initial);

  // Language toggle button
  const langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.addEventListener("click", () => {
      const current = localStorage.getItem("sca_lang") || initial;
      const next = current === "ja" ? "en" : "ja";
      applyLang(next);
      langToggle.setAttribute("aria-pressed", next === "ja" ? "true" : "false");
    });
  }

  // Ambient sound (very subtle) — optional
  let audioCtx = null;
  let noiseNode = null;
  let gainNode = null;
  let playing = false;

  function startSound() {
    if (playing) return;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();

    // Pink-ish noise (simple filtered noise)
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.12;
    }

    noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.0;

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseNode.start();
    // fade in
    gainNode.gain.setTargetAtTime(0.035, audioCtx.currentTime, 0.25);
    playing = true;
  }

  function stopSound() {
    if (!playing) return;
    try {
      gainNode.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.18);
      setTimeout(() => {
        try { noiseNode.stop(); } catch {}
        noiseNode.disconnect();
      }, 350);
    } catch {}
    playing = false;
  }

  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("click", async () => {
      const pressed = soundToggle.getAttribute("aria-pressed") === "true";
      if (pressed) {
        stopSound();
        soundToggle.setAttribute("aria-pressed", "false");
      } else {
        startSound();
        soundToggle.setAttribute("aria-pressed", "true");
      }
    });
  }

  // Smooth-ish anchor focus (native scroll is okay, just highlight)
  window.addEventListener("hashchange", () => {
    const id = location.hash.replace("#", "");
    if (!id) return;
    const target = document.getElementById(id);
    if (target) target.setAttribute("tabindex", "-1");
  });
})();

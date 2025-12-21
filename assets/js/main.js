(() => {
  document.documentElement.dataset.jsok = "1";

  const $ = (q, root=document) => root.querySelector(q);
  const $$ = (q, root=document) => [...root.querySelectorAll(q)];

  const root = document.documentElement;
  const body = document.body;

  // ========= コピー抑止（完全防止ではなく“抑止”） =========
  const block = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
  window.addEventListener("contextmenu", block, {passive:false});
  window.addEventListener("copy", block, {passive:false});
  window.addEventListener("cut", block, {passive:false});
  window.addEventListener("dragstart", (e) => {
    if (e.target && (e.target.tagName === "IMG")) block(e);
  }, {passive:false});

  const shield = $(".touchShield");
  const enableShield = () => { if(shield) shield.style.pointerEvents = "auto"; };
  const disableShield = () => { if(shield) shield.style.pointerEvents = "none"; };

  // ========= HUD =========
  const hudX = $("#hudX");
  const hudY = $("#hudY");
  const hudT = $("#hudT");
  const hudS = $("#hudS");

  const t0 = performance.now();
  (function tickHUD(){
    if (hudT) hudT.textContent = ((performance.now() - t0) / 1000).toFixed(2) + "s";
    requestAnimationFrame(tickHUD);
  })();

  window.addEventListener("pointermove", (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    if (hudX) hudX.textContent = x.toFixed(2);
    if (hudY) hudY.textContent = y.toFixed(2);
  }, {passive:true});

  // ========= トップ文字：スクロールで変異 =========
  function setupMorphTitle() {
    const el = $(".hero__titleCore");
    if (!el) return;

    const seq = (el.dataset.morph || "").split("|").map(s => s.trim()).filter(Boolean);
    if (seq.length < 2) return;

    let lastIndex = -1;

    const morphTo = (txt) => {
      el.animate([
        { transform: "translate3d(0,0,0) scale(1)", filter:"blur(0px)", opacity:1 },
        { transform: "translate3d(0,6px,0) scale(0.985)", filter:"blur(2px)", opacity:.62 },
        { transform: "translate3d(0,0,0) scale(1)", filter:"blur(0px)", opacity:1 }
      ], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
      el.textContent = txt;
    };

    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = window.scrollY / max;
      const idx = Math.min(seq.length - 1, Math.floor(p * seq.length));
      if (idx !== lastIndex) {
        lastIndex = idx;
        morphTo(seq[idx]);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ========= 背景色場反応 =========
  function setFieldFromEvent(e, hue = 210) {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    root.style.setProperty("--fieldX", x.toFixed(2) + "%");
    root.style.setProperty("--fieldY", y.toFixed(2) + "%");
    root.style.setProperty("--fieldHue", String(hue));
  }

  // ========= 無操作でUI崩壊 =========
  let idleTimer = null;
  let decaying = false;
  let decayVal = 0;

  const bumpActivity = () => {
    if (idleTimer) clearTimeout(idleTimer);

    if (decaying) {
      decaying = false;
      body.classList.remove("is-decaying");
      decayVal = 0;
      root.style.setProperty("--decay", "0");
      root.style.setProperty("--skew", "0deg");
      root.style.setProperty("--shake", "0px");
      if (hudS) hudS.textContent = "LIVE";
    }
    idleTimer = setTimeout(startDecay, 5200);
  };

  const startDecay = () => {
    decaying = true;
    body.classList.add("is-decaying");
    if (hudS) hudS.textContent = "DECAY";

    const loop = () => {
      if (!decaying) return;
      decayVal = Math.min(1, decayVal + 0.008);
      root.style.setProperty("--decay", decayVal.toFixed(3));
      root.style.setProperty("--skew", (Math.sin(performance.now()/1200) * decayVal * 2.5).toFixed(2) + "deg");
      root.style.setProperty("--shake", (Math.sin(performance.now()/180) * decayVal * 2.2).toFixed(2) + "px");
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  ["pointermove","pointerdown","keydown","scroll","touchstart"].forEach(ev => {
    window.addEventListener(ev, bumpActivity, {passive:true});
  });
  bumpActivity();

  // ========= works.json読み込み =========
  async function loadWorks() {
    const res = await fetch("./works.json", { cache: "no-store" });
    if (!res.ok) throw new Error("works.json not found");
    return await res.json();
  }

  const catLabel = (c) => String(c || "").toUpperCase();

  function cardHTML(w) {
    const hue = w.hue ?? 210;
    return `
      <a class="card" href="./work.html?id=${encodeURIComponent(w.id)}" data-hue="${hue}">
        <div class="card__media">
          <img src="${w.image}" alt="${w.title}" draggable="false" loading="lazy">
        </div>
        <div class="card__body">
          <div class="card__meta">${catLabel(w.category)} ${w.id} / ${w.year}</div>
          <div class="card__name">${w.title}</div>
          <div class="card__note">${w.jp}</div>
          <div class="card__tag">“これは服になる前の思考だ”</div>
        </div>
      </a>
    `;
  }

  async function mountHome() {
    const grid = $("#worksGrid");
    if (!grid) return;

    const works = await loadWorks();
    grid.innerHTML = works.map(cardHTML).join("");

    $$(".card", grid).forEach(card => {
      const hue = Number(card.dataset.hue || 210);

      card.addEventListener("pointerenter", (e) => {
        enableShield();
        setFieldFromEvent(e, hue);
        root.style.setProperty("--fieldA", ".68");
      });
      card.addEventListener("pointermove", (e) => setFieldFromEvent(e, hue));
      card.addEventListener("pointerleave", () => {
        disableShield();
        root.style.setProperty("--fieldA", ".55");
      });
    });
  }

  // ========= work.html（個別ページ＋時間軸） =========
  const getQuery = (name) => new URL(location.href).searchParams.get(name);

  const nodeHTML = (n) => `
    <div class="tnode">
      <div class="tnode__t">${n.t}</div>
      <div class="tnode__tx">${n.text}</div>
    </div>
  `;

  async function mountWork() {
    const id = getQuery("id");
    if (!id) return;

    const works = await loadWorks();
    const idx = works.findIndex(w => String(w.id) === String(id));
    const w = works[idx >= 0 ? idx : 0];

    $("#workMeta").textContent = `${catLabel(w.category)} ${w.id} / ${w.year}`;
    $("#workTitle").textContent = w.title;
    $("#workLead").textContent = w.note || "これは服になる前の思考だ。";

    const img = $("#workImg");
    img.src = w.image;
    img.alt = w.title;

    img.addEventListener("pointerenter", enableShield);
    img.addEventListener("pointerleave", disableShield);

    $("#workBody").innerHTML = (w.timeline || []).map(nodeHTML).join("");

    root.style.setProperty("--fieldHue", String(w.hue ?? 210));
    root.style.setProperty("--fieldA", ".58");

    const prev = works[(idx - 1 + works.length) % works.length];
    const next = works[(idx + 1) % works.length];
    $("#prevLink").href = `./work.html?id=${encodeURIComponent(prev.id)}`;
    $("#nextLink").href = `./work.html?id=${encodeURIComponent(next.id)}`;

    const fill = $("#tlFill");
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      fill.style.width = (p * 100).toFixed(1) + "%";

      // “時間軸の漂い”
      const fx = 50 + Math.sin(p * Math.PI * 2) * 12;
      const fy = 40 + Math.cos(p * Math.PI * 2) * 10;
      root.style.setProperty("--fieldX", fx.toFixed(2) + "%");
      root.style.setProperty("--fieldY", fy.toFixed(2) + "%");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ========= boot =========
  setupMorphTitle();

  const page = body?.dataset?.page;
  if (page === "home") mountHome().catch(console.error);
  if (page === "work") mountWork().catch(console.error);
})();

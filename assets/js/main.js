/* =========================
   SAIREN COLOR ARCHIVE
   main.js (no external libs)
   ========================= */

(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const root = document.documentElement;
  const hero = $('[data-section="hero"]');
  const mutate = $('[data-mutate]');
  const baseEl = $('[data-base]');
  const altEl = $('[data-alt]');
  const yearEl = $('[data-year]');
  const hudX = $('[data-hud-x]');
  const hudY = $('[data-hud-y]');
  const hudT = $('[data-hud-t]');
  const cards = $$('[data-card]');
  const grid = $('[data-grid]');
  const uiToggle = $('[data-toggle-ui]');

  // 年号
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // HEROを“動いてる”状態に
  if (hero) hero.dataset.live = "1";

  // -------------------------
  // 1) スクロールで文字が「分類名」に変異
  // （構造。→ アーティファクト → フィールドノート）
  // -------------------------
  const phases = [
    { labelJP: '構造。', labelEN: 'STRUCTURE' },
    { labelJP: 'アーティファクト。', labelEN: 'ARTIFACT' },
    { labelJP: 'フィールドノート。', labelEN: 'FIELD NOTE' },
  ];

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function updateMutateByScroll(){
    const y = window.scrollY || 0;
    const h = Math.max(1, window.innerHeight);
    const p = clamp(y / (h * 1.15), 0, 0.9999); // 0..~1
    const idx = Math.floor(p * phases.length);
    const phase = phases[idx] || phases[0];

    if (baseEl) baseEl.textContent = phase.labelJP;
    if (altEl) altEl.textContent = phase.labelEN;

    // HUD
    if (hudX) hudX.textContent = (p * 1.00).toFixed(2);
    if (hudY) hudY.textContent = (y / 1000).toFixed(2);
  }

  // -------------------------
  // 2) 作品カードに近づくと背景の色場が反応
  // -------------------------
  function setFieldFromPoint(clientX, clientY){
    const x = (clientX / window.innerWidth) * 100;
    const y = (clientY / window.innerHeight) * 100;
    root.style.setProperty('--cx', `${x.toFixed(2)}%`);
    root.style.setProperty('--cy', `${y.toFixed(2)}%`);

    // hue をX/Yで変化（穏やか）
    const hue = (x * 3.2 + y * 1.4) % 360;
    root.style.setProperty('--hue', `${hue.toFixed(0)}`);
  }

  // Pointer tracking（背景反応）
  window.addEventListener('pointermove', (e) => {
    setFieldFromPoint(e.clientX, e.clientY);
    bumpPulse(0.16);
  }, { passive: true });

  // カードへ“近づく”反応：カード中心へ吸い寄せるように色場を移動
  function activateCardProximity(card){
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width/2;
    const cy = r.top + r.height/2;
    setFieldFromPoint(cx, cy);

    // ノード別に色味を少しずらす
    const node = card.getAttribute('data-node') || 'artifact';
    const baseHue = parseFloat(getComputedStyle(root).getPropertyValue('--hue')) || 210;
    const add = node === 'artifact' ? 0 : node === 'lookbook' ? 40 : 120;
    root.style.setProperty('--hue', String((baseHue + add) % 360));
    bumpPulse(0.28);
  }

  cards.forEach(card => {
    card.addEventListener('pointerenter', () => activateCardProximity(card));
    card.addEventListener('focus', () => activateCardProximity(card));
  });

  // pulse（背景の鼓動）
  let pulse = 0;
  let pulseRAF = null;

  function bumpPulse(amount){
    pulse = Math.min(0.65, pulse + amount);
    root.style.setProperty('--pulse', pulse.toFixed(3));
    if (!pulseRAF) pulseRAF = requestAnimationFrame(decayPulse);
  }
  function decayPulse(){
    pulse = Math.max(0, pulse - 0.02);
    root.style.setProperty('--pulse', pulse.toFixed(3));
    if (pulse > 0) pulseRAF = requestAnimationFrame(decayPulse);
    else pulseRAF = null;
  }

  // -------------------------
  // 3) 一定時間操作しないと、UIが静かに崩壊する
  // -------------------------
  let idleTimer = null;
  let idleMs = 0;
  const IDLE_LIMIT = 18000; // 18秒（好みで変更）

  function resetIdle(){
    idleMs = 0;
    document.body.classList.remove('is-decaying');
  }

  function tickIdle(){
    idleMs += 1000;
    if (hudT) hudT.textContent = (idleMs/1000).toFixed(2) + "s";
    if (idleMs >= IDLE_LIMIT){
      document.body.classList.add('is-decaying');
      // 崩壊中は、UI透明度を落とす
      root.style.setProperty('--ui', '0.65');
    } else {
      root.style.setProperty('--ui', '1');
    }
  }

  function startIdleLoop(){
    if (idleTimer) clearInterval(idleTimer);
    idleTimer = setInterval(tickIdle, 1000);
  }

  ['pointerdown','pointermove','keydown','scroll','touchstart'].forEach(evt => {
    window.addEventListener(evt, () => { resetIdle(); }, { passive: true });
  });

  resetIdle();
  startIdleLoop();

  // -------------------------
  // HEROタイトル：追加の“生きてる”動き（微細な歪み）
  // -------------------------
  let t0 = performance.now();

  function animateTitle(now){
    const t = (now - t0) / 1000;
    // スクロール量と時間を混ぜて、ほんの少しだけ変形
    const s = (window.scrollY || 0) / 800;
    const wob = Math.sin(t * 0.9) * 0.6 + Math.sin(t * 1.7) * 0.35;
    const skew = (wob * 0.25) + (s * 0.15);

    if (baseEl){
      baseEl.style.transform = `translate3d(0, ${Math.sin(t*0.6)*1.4}px, 0) skewX(${skew}deg)`;
      baseEl.style.filter = `blur(${Math.max(0, (Math.abs(wob)-0.6))*0.6}px)`;
    }
    requestAnimationFrame(animateTitle);
  }
  requestAnimationFrame(animateTitle);

  // -------------------------
  // Smooth-ish nav (optional)
  // -------------------------
  $$('[data-nav]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // UI toggle（崩壊演出とは別。手動でUIの存在感を落とす）
  if (uiToggle){
    uiToggle.addEventListener('click', () => {
      const cur = parseFloat(getComputedStyle(root).getPropertyValue('--ui')) || 1;
      root.style.setProperty('--ui', cur > 0.8 ? '0.35' : '1');
      bumpPulse(0.22);
    });
  }

  // Scroll-driven mutate + HUD
  window.addEventListener('scroll', updateMutateByScroll, { passive: true });
  updateMutateByScroll();

  // -------------------------
  // コピー抑止（完全防止ではなく“抑止”）
  // ※ブラウザ上で100%防ぐのは不可能。保存/スクショは止められない。
  // -------------------------
  // 右クリック抑止
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    bumpPulse(0.25);
  });

  // コピー系ショートカット抑止（Ctrl/Cmd + C/S/P/U など）
  window.addEventListener('keydown', (e) => {
    const key = (e.key || '').toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;

    const blocked = ['c','s','p','u','a']; // copy/save/print/view-source/select-all
    if (blocked.includes(key)){
      e.preventDefault();
      bumpPulse(0.30);
    }
  });

  // Drag保存っぽい動き抑止（画像導入後にも効く）
  window.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  // 長押し保存（iOSの画像保存メニュー）抑止に近いもの
  // ※iOSは完全には止められないが、コンテキストを出にくくする
  window.addEventListener('touchstart', () => {}, { passive: true });

})();

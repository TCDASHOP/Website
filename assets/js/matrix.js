/*
  SAIREN COLOR ARCHIVE — Matrix Rain (TextMASK integrated)
  v5: "rain itself forms the letters" (no big overlay text)

  - Prebuild an alpha mask of the 2 lines.
  - While drawing rain glyphs, sample mask alpha at (x,y).
    If inside the text shape, brighten/gently glow that rain.
  - Canvas is injected as FIRST child of <body> so UI sits above it.
*/

(() => {
  'use strict';

  const TEXT_LINES = [
    'Color arrives before words.',
    'An archive of works and the trail of creation.'
  ];

  // ---- Tunables (feel free to tweak) ----
  const MASK_SETTINGS = {
    y: 0.38,          // vertical anchor (0-1)
    lineGap: 1.55,    // spacing between line1 and line2
    titleMaxPx: 34,
    titleMinPx: 18,
    subMaxPx: 18,
    subMinPx: 12
  };

  const RAIN_SETTINGS = {
    columnStep: 16,   // smaller = denser
    speedMin: 0.9,
    speedMax: 2.2,
    fade: 0.08,       // larger = faster trails disappear
    baseAlpha: 0.55,
    // highlight when inside text mask
    boostAlpha: 0.92,
    glowBlur: 6,
    glowBoost: 0.35,  // 0..1, how strong the glow is inside mask
  };

  const GLYPHS = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+?/<>()[]{}';

  // ---------- Canvas bootstrap ----------
  function ensureCanvas() {
    let c = document.getElementById('sairen-matrix-canvas');
    if (c) return c;

    c = document.createElement('canvas');
    c.id = 'sairen-matrix-canvas';
    c.setAttribute('aria-hidden', 'true');

    c.style.position = 'fixed';
    c.style.inset = '0';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.pointerEvents = 'none';
    c.style.zIndex = '0';

    // Put it BEFORE everything so header/page/footer naturally paint on top.
    const body = document.body;
    if (body.firstChild) body.insertBefore(c, body.firstChild);
    else body.appendChild(c);

    return c;
  }

  const canvas = ensureCanvas();
  const ctx = canvas.getContext('2d', { alpha: true });

  let W = 0, H = 0, DPR = 1;

  // Text mask buffer
  let maskW = 0, maskH = 0;
  let maskAlpha = null; // Uint8Array

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(str) { return str[(Math.random() * str.length) | 0]; }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, window.innerWidth | 0);
    H = Math.max(1, window.innerHeight | 0);

    canvas.width = (W * DPR) | 0;
    canvas.height = (H * DPR) | 0;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    buildMask();
    buildColumns();
  }

  // ---------- Text mask (alpha field) ----------
  function buildMask() {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const m = off.getContext('2d');

    // clear
    m.clearRect(0, 0, W, H);

    // fonts (keep it calm — the rain makes it readable)
    const titlePx = clamp(W * 0.055, MASK_SETTINGS.titleMinPx, MASK_SETTINGS.titleMaxPx);
    const subPx = clamp(W * 0.020, MASK_SETTINGS.subMinPx, MASK_SETTINGS.subMaxPx);

    m.textAlign = 'center';
    m.textBaseline = 'middle';
    m.fillStyle = '#fff';

    const x = W * 0.5;
    const y0 = H * MASK_SETTINGS.y;

    m.font = `600 ${titlePx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    m.fillText(TEXT_LINES[0], x, y0);

    m.font = `400 ${subPx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    m.fillText(TEXT_LINES[1], x, y0 + titlePx * MASK_SETTINGS.lineGap);

    const img = m.getImageData(0, 0, W, H).data;
    maskW = W;
    maskH = H;

    // Store alpha channel (img[i+3])
    const a = new Uint8Array(W * H);
    for (let p = 0, i = 0; p < a.length; p++, i += 4) a[p] = img[i + 3];
    maskAlpha = a;
  }

  function sampleMaskAlpha(x, y) {
    if (!maskAlpha) return 0;
    const xi = x | 0;
    const yi = y | 0;
    if (xi < 0 || yi < 0 || xi >= maskW || yi >= maskH) return 0;
    return maskAlpha[yi * maskW + xi];
  }

  // ---------- Rain columns ----------
  let columns = [];

  function buildColumns() {
    const step = RAIN_SETTINGS.columnStep;
    const count = Math.max(12, Math.floor(W / step));
    columns = new Array(count);

    for (let i = 0; i < count; i++) {
      columns[i] = {
        x: i * step + step * 0.5,
        y: rand(-H, 0),
        speed: rand(RAIN_SETTINGS.speedMin, RAIN_SETTINGS.speedMax),
        // vary density
        jitter: rand(0.65, 1.35)
      };
    }
  }

  // ---------- Render loop ----------
  function paintBackgroundFade() {
    // subtle fade, keeps trails
    ctx.fillStyle = `rgba(11, 12, 16, ${RAIN_SETTINGS.fade})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawColumn(col) {
    // base glyph size
    const fontSize = clamp(W / 80, 14, 20);
    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;

    // draw multiple glyphs per column per frame for richness
    const stamps = Math.max(2, Math.floor(5 * col.jitter));

    for (let s = 0; s < stamps; s++) {
      const y = col.y - s * fontSize * 1.15;
      if (y < -50) continue;
      if (y > H + 50) continue;

      const x = col.x + rand(-2, 2);
      const a = sampleMaskAlpha(x, y);
      const inside = a > 10;
      const t = inside ? (a / 255) : 0;

      // colors: base teal-gray -> bright cyan-white inside mask
      // (done as manual lerp)
      const baseR = 120, baseG = 190, baseB = 185;
      const hiR = 210, hiG = 255, hiB = 245;
      const r = (baseR + (hiR - baseR) * t) | 0;
      const g = (baseG + (hiG - baseG) * t) | 0;
      const b = (baseB + (hiB - baseB) * t) | 0;

      const alpha = inside
        ? (RAIN_SETTINGS.boostAlpha * (0.55 + 0.45 * t))
        : RAIN_SETTINGS.baseAlpha;

      if (inside) {
        ctx.shadowColor = `rgba(${hiR}, ${hiG}, ${hiB}, ${RAIN_SETTINGS.glowBoost * t})`;
        ctx.shadowBlur = RAIN_SETTINGS.glowBlur;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillText(pick(GLYPHS), x, y);
    }

    // move
    col.y += col.speed * 10;
    if (col.y > H + 120) {
      col.y = rand(-H * 0.6, -50);
      col.speed = rand(RAIN_SETTINGS.speedMin, RAIN_SETTINGS.speedMax);
      col.jitter = rand(0.65, 1.35);
    }
  }

  function frame() {
    paintBackgroundFade();

    // Draw columns
    for (let i = 0; i < columns.length; i++) drawColumn(columns[i]);

    requestAnimationFrame(frame);
  }

  // ---------- Kickoff ----------
  window.addEventListener('resize', () => {
    clearTimeout(resize._t);
    resize._t = setTimeout(resize, 120);
  });

  // IMPORTANT: If page is hidden, stop heavy drawing
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // paint once (dimmer) and let it rest
      ctx.fillStyle = 'rgba(11,12,16,0.5)';
      ctx.fillRect(0, 0, W, H);
    }
  });

  resize();
  // clear to base
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, W, H);
  frame();
})();

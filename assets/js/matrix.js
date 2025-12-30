/*
  SAIREN COLOR ARCHIVE — Matrix Rain (TextMASK integrated)
  v6: Make the textmask unmistakable:
      - Outside mask: dimmer rain
      - Inside mask: brighter + glow
      - No overlay text element (rain itself forms the letters)
*/

(() => {
  'use strict';

  const TEXT_LINES = [
    'Color arrives before words.',
    'An archive of works and the trail of creation.'
  ];

  const MASK_SETTINGS = {
    y: 0.38,
    lineGap: 1.55,
    titleMaxPx: 36,
    titleMinPx: 18,
    subMaxPx: 18,
    subMinPx: 12
  };

  const RAIN_SETTINGS = {
    columnStep: 16,
    speedMin: 0.9,
    speedMax: 2.2,
    fade: 0.10,          // trails fade (slightly faster = clearer mask contrast)
    outsideAlpha: 0.18,  // <<< important: outside mask is dim
    insideAlpha: 0.95,   // <<< important: inside mask is bright
    insideGlowBlur: 10,
    insideGlowAlpha: 0.55,
    // Optional “pulse” to feel alive
    pulseEverySec: 12,
    pulseDurationSec: 0.6,
    pulseBoost: 0.20
  };

  // Add some JP-friendly glyphs too (subtle vibe)
  const GLYPHS = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+?/<>()[]{}ｱｲｳｴｵﾝﾄﾘﾐ';

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

    const body = document.body;
    if (body.firstChild) body.insertBefore(c, body.firstChild);
    else body.appendChild(c);

    return c;
  }

  const canvas = ensureCanvas();
  const ctx = canvas.getContext('2d', { alpha: true });

  let W = 0, H = 0, DPR = 1;

  // Mask alpha field (0..255)
  let maskW = 0, maskH = 0;
  let maskAlpha = null;

  let columns = [];

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(str) { return str[(Math.random() * str.length) | 0]; }

  function buildMask() {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const m = off.getContext('2d');

    m.clearRect(0, 0, W, H);

    const titlePx = clamp(W * 0.055, MASK_SETTINGS.titleMinPx, MASK_SETTINGS.titleMaxPx);
    const subPx   = clamp(W * 0.020, MASK_SETTINGS.subMinPx,   MASK_SETTINGS.subMaxPx);

    m.textAlign = 'center';
    m.textBaseline = 'middle';
    m.fillStyle = '#fff';

    const x = W * 0.5;
    const y0 = H * MASK_SETTINGS.y;

    m.font = `700 ${titlePx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    m.fillText(TEXT_LINES[0], x, y0);

    m.font = `500 ${subPx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    m.fillText(TEXT_LINES[1], x, y0 + titlePx * MASK_SETTINGS.lineGap);

    const img = m.getImageData(0, 0, W, H).data;
    maskW = W; maskH = H;

    const a = new Uint8Array(W * H);
    for (let p = 0, i = 0; p < a.length; p++, i += 4) a[p] = img[i + 3];
    maskAlpha = a;
  }

  function sampleMask(x, y) {
    if (!maskAlpha) return 0;
    const xi = x | 0;
    const yi = y | 0;
    if (xi < 0 || yi < 0 || xi >= maskW || yi >= maskH) return 0;
    return maskAlpha[yi * maskW + xi] / 255; // 0..1
  }

  function buildColumns() {
    const colCount = Math.ceil(W / RAIN_SETTINGS.columnStep);
    columns = new Array(colCount);
    for (let i = 0; i < colCount; i++) {
      columns[i] = {
        x: i * RAIN_SETTINGS.columnStep,
        y: rand(-H, 0),
        speed: rand(RAIN_SETTINGS.speedMin, RAIN_SETTINGS.speedMax)
      };
    }
  }

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

  let t0 = performance.now();
  function pulseFactor(now) {
    const sec = (now - t0) / 1000;
    const p = RAIN_SETTINGS.pulseEverySec;
    const d = RAIN_SETTINGS.pulseDurationSec;
    const phase = sec % p;
    if (phase > d) return 0;
    // smooth in/out pulse 0..1
    const x = phase / d;
    return Math.sin(Math.PI * x) * RAIN_SETTINGS.pulseBoost;
  }

  function frame(now) {
    requestAnimationFrame(frame);

    // Fade previous frame (trail)
    ctx.fillStyle = `rgba(0,0,0,${RAIN_SETTINGS.fade})`;
    ctx.fillRect(0, 0, W, H);

    const pulse = pulseFactor(now);

    // Draw glyphs
    ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    ctx.textBaseline = 'top';

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];

      const x = col.x;
      const y = col.y;

      const m = sampleMask(x, y); // 0..1

      // Make the LETTERS by contrast:
      // Outside mask: very dim
      // Inside mask: bright + glow
      const a = (m > 0.02)
        ? clamp(RAIN_SETTINGS.insideAlpha + pulse, 0, 1)
        : RAIN_SETTINGS.outsideAlpha;

      // Color palette: keep cool/teal vibe but readable
      // (inside slightly brighter)
      const inside = (m > 0.02);

      if (inside) {
        ctx.save();
        ctx.globalAlpha = a;

        ctx.shadowBlur = RAIN_SETTINGS.insideGlowBlur;
        ctx.shadowColor = `rgba(200,255,255,${RAIN_SETTINGS.insideGlowAlpha})`;

        ctx.fillStyle = 'rgba(210,255,255,1)';
        ctx.fillText(pick(GLYPHS), x, y);

        ctx.restore();
      } else {
        ctx.globalAlpha = a;
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(160,220,220,1)';
        ctx.fillText(pick(GLYPHS), x, y);
      }

      // Move
      col.y += col.speed * 10;

      // Reset column if it leaves screen
      if (col.y > H + 40) {
        col.y = rand(-200, -40);
        col.speed = rand(RAIN_SETTINGS.speedMin, RAIN_SETTINGS.speedMax);
      }
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  requestAnimationFrame(frame);
})();

/* Matrix Rain with Text Mask (v7)
   Goal: Make the rain itself form the phrase shapes (no overlay text DOM).
   Drop-in replacement for /assets/js/matrix.js
*/
(() => {
  'use strict';

  // ====== TUNING ======
  const CHARSET = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@$%&*+-=<>?/|{}[]()';
  // --- Phrase banners inside the rain (disabled; story reveal uses text mask only)
  const ENABLE_PHRASE_BANNERS = false;
  const PHRASE_BANNERS = [];
  const PHRASE_GAP_MIN_MS = 9000;
  const PHRASE_GAP_MAX_MS = 18000;
  const phraseBanners = []; // { text, startCol, y, speed }
  let nextPhraseAt = performance.now() + rand(PHRASE_GAP_MIN_MS, PHRASE_GAP_MAX_MS);

  const FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  // Rain look
  const FONT_SIZE = 18;               // base font size in CSS pixels
  const COL_SPACING = 14;             // distance between columns in CSS pixels
  const SPEED_MIN = 0.35;
  const SPEED_MAX = 1.15;
  const FADE_ALPHA = 0.08;            // higher = longer trails
  const BASE_ALPHA = 0.18;            // normal rain brightness
  const MASK_BOOST = 0.48;            // extra alpha inside the mask (0..1)
  const GLOW_BOOST = 0.35;            // extra glow inside the mask (0..1)
  const MASK_EDGE_SOFTEN = 1.4;       // soften mask edges in device pixels

  // Mask text (English only, per spec)
  const STORY_LINE1 = 'COLOR ARRIVES BEFORE WORDS.';
  const STORY_LINE2 = 'SAIREN COLOR ARCHIVE.';

  // story state (drawn into the mask)
  let storyLine1 = '';
  let storyLine2 = '';
  let storyAlpha = 0;
  let lastStoryKey = '';
  const MASK_LINE_GAP = 14;           // px gap between lines (CSS px)
  const LINE1_SCALE = 1.0;            // relative size
  const LINE2_SCALE = 0.55;           // relative size

  // Layout constraints (keep the phrase in the "hero" region)
  const MASK_Y_ANCHOR = 0.35;         // 0..1 from top (where the phrase center sits)
  const MASK_MAX_WIDTH_RATIO = 0.92;  // keep within viewport
  const MASK_PADDING = 24;            // px

  // Motion preference
  const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ====== Canvas setup ======
  const canvas = document.createElement('canvas');
  canvas.id = 'matrixCanvas';
  canvas.className = 'matrix-canvas';
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '1',
    pointerEvents: 'none'
  });
  document.body.insertBefore(canvas, document.body.firstChild);

  let ctx = null;
  try { ctx = canvas.getContext('2d', { alpha: true }); } catch (e) {}
  if (!ctx) ctx = canvas.getContext('2d');

  // Offscreen mask canvas
  const maskCanvas = document.createElement('canvas');
  let mctx = null;
  try { mctx = maskCanvas.getContext('2d', { alpha: true, willReadFrequently: true }); } catch (e) {}
  if (!mctx) mctx = maskCanvas.getContext('2d');

  let DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  let W = 0, H = 0;
  let cols = [];
  let maskData = null;   // Uint8ClampedArray
  let maskW = 0, maskH = 0;

  // Ease helper
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function randInt(n) { return (Math.random() * n) | 0; }
  function rand(min, max) { return min + Math.random() * (max - min); }


  // Color: randomized hues inside the matrix rain (kept subtle)
  // Modes:
  //   - 'palette': picks from a curated set of hues (recommended)
  //   - 'hsl': fully random hue per column
  const COLOR_MODE = 'palette';
  const PALETTE = [
    { h: 185, s: 0.55, l: 0.55 }, // cyan
    { h: 165, s: 0.55, l: 0.52 }, // teal
    { h: 210, s: 0.55, l: 0.55 }, // blue
    { h: 255, s: 0.50, l: 0.56 }, // violet
    { h: 305, s: 0.45, l: 0.56 }, // magenta
    { h:  45, s: 0.50, l: 0.56 }, // amber
  ];

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function hslToRgb(h, s, l) {
    // h: 0..360, s/l: 0..1
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1=0, g1=0, b1=0;
    if (hp >= 0 && hp < 1) [r1,g1,b1] = [c,x,0];
    else if (hp < 2)       [r1,g1,b1] = [x,c,0];
    else if (hp < 3)       [r1,g1,b1] = [0,c,x];
    else if (hp < 4)       [r1,g1,b1] = [0,x,c];
    else if (hp < 5)       [r1,g1,b1] = [x,0,c];
    else                   [r1,g1,b1] = [c,0,x];
    const m = l - c/2;
    return [
      Math.round((r1 + m) * 255),
      Math.round((g1 + m) * 255),
      Math.round((b1 + m) * 255),
    ];
  }

  function buildColumns() {
    cols = [];
    const step = Math.max(10, Math.floor(COL_SPACING));
    const count = Math.ceil(W / step) + 1;
    for (let i = 0; i < count; i++) {
      const pal = (COLOR_MODE === 'palette') ? PALETTE[randInt(PALETTE.length)] : null;
      const hue = pal ? pal.h : Math.random() * 360;
      const sat = pal ? pal.s : 0.50;
      const lit = pal ? pal.l : 0.52;
      const hueSpeed = rand(0.03, 0.10);
      cols.push({
        x: i * step,
        y: Math.random() * H,
        speed: rand(SPEED_MIN, SPEED_MAX) * (REDUCE_MOTION ? 0.55 : 1.0),
        phase: Math.random() * Math.PI * 2,
        hue,
        sat,
        lit,
        hueSpeed
      });
    }
  }

  function fitTextToWidth(text, targetWidth, baseSize) {
    // binary-ish: shrink until fits
    let size = baseSize;
    mctx.font = `${size}px ${FONT_FAMILY}`;
    while (mctx.measureText(text).width > targetWidth && size > 10) {
      size -= 1;
      mctx.font = `${size}px ${FONT_FAMILY}`;
    }
    return size;
  }

  function rebuildMask() {
    if (!maskCtx) return;

    const has1 = !!storyLine1;
    const has2 = !!storyLine2;
    if (!has1 && !has2) {
      maskData = null;
      return;
    }

    const w = Math.max(1, maskW), h = Math.max(1, maskH);
    const mctx = maskCtx;
    mctx.setTransform(1,0,0,1,0,0);
    mctx.clearRect(0, 0, w, h);

    const cx = Math.round(w * MASK_ANCHOR_X_RATIO);
    const cy = Math.round(h * MASK_ANCHOR_Y_RATIO);
    const maxW = w * MAX_WIDTH_RATIO;

    const s1 = has1 ? fitTextToWidth(storyLine1, MASK_FONT_PX * LINE1_SCALE, maxW, MASK_FONT_FAMILY) : 0;
    const s2 = has2 ? fitTextToWidth(storyLine2, MASK_FONT_PX * LINE2_SCALE, maxW, MASK_FONT_FAMILY) : 0;

    const lineGap = Math.round(MASK_FONT_PX * LINE_GAP_RATIO);

    let y1 = cy, y2 = cy;
    if (has1 && has2) {
      const totalH = s1 + lineGap + s2;
      y1 = cy - totalH * 0.12;
      y2 = y1 + s1 + lineGap;
    } else if (has1) {
      y1 = cy + s1 * 0.12;
    } else {
      y2 = cy + s2 * 0.12;
    }

    mctx.save();
    mctx.textAlign = 'center';
    mctx.textBaseline = 'alphabetic';
    mctx.fillStyle = 'rgba(255,255,255,1)';

    if (has1) {
      mctx.font = `${s1}px ${MASK_FONT_FAMILY}`;
      mctx.fillText(storyLine1, cx, y1);
    }
    if (has2) {
      mctx.font = `${s2}px ${MASK_FONT_FAMILY}`;
      mctx.fillText(storyLine2, cx, y2);
    }

    mctx.restore();

    try {
      const img = mctx.getImageData(0,0,w,h);
      maskData = img.data;
    } catch (e) {
      maskData = null;
    }
  }

  function maskValueAt(cssX, cssY) {
    // cssX/cssY are in CSS pixels. Convert to device pixels and sample alpha.
    if (!maskData) return 0;
    const x = Math.max(0, Math.min(maskW - 1, Math.round(cssX * DPR)));
    const y = Math.max(0, Math.min(maskH - 1, Math.round(cssY * DPR)));
    const idx = (y * maskW + x) * 4 + 3; // alpha
    return maskData[idx] / 255;
  }

  function resize() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // draw in CSS pixels
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';

    buildColumns();
    rebuildMask();
  }

  // ====== Render ======
  const startAt = performance.now();

  
  // --- Story timing (reveals text through the mask, while the rain keeps flowing) ---
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t){
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
  }
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }

  function updateStory(now){
    const full1 = STORY_LINE1;
    const full2 = STORY_LINE2;

    const startDelay = 1200;
    const reveal1CharMs = 65;
    const hold1 = 1400;
    const lead2Delay = 550;
    const reveal2CharMs = 55;
    const holdBoth = 2400;
    const fadeOut = 1100;
    const gap = 6200;

    const r1 = full1.length * reveal1CharMs;
    const r2 = full2.length * reveal2CharMs;
    const cycle = startDelay + r1 + hold1 + lead2Delay + r2 + holdBoth + fadeOut + gap;

    const t = (now - startAt) % cycle;

    let l1 = '';
    let l2 = '';
    let a = 0;

    if (t < startDelay) {
      a = 0;
    } else if (t < startDelay + r1) {
      const dt = t - startDelay;
      const count = Math.max(0, Math.min(full1.length, Math.floor(dt / reveal1CharMs) + 1));
      l1 = full1.slice(0, count);
      a = 1;
    } else if (t < startDelay + r1 + hold1 + lead2Delay) {
      l1 = full1;
      a = 1;
    } else if (t < startDelay + r1 + hold1 + lead2Delay + r2) {
      const dt = t - (startDelay + r1 + hold1 + lead2Delay);
      const count = Math.max(0, Math.min(full2.length, Math.floor(dt / reveal2CharMs) + 1));
      l1 = full1;
      l2 = full2.slice(0, count);
      a = 1;
    } else if (t < startDelay + r1 + hold1 + lead2Delay + r2 + holdBoth) {
      l1 = full1;
      l2 = full2;
      a = 1;
    } else if (t < startDelay + r1 + hold1 + lead2Delay + r2 + holdBoth + fadeOut) {
      l1 = full1;
      l2 = full2;
      const u = clamp01((t - (startDelay + r1 + hold1 + lead2Delay + r2 + holdBoth)) / fadeOut);
      a = 1 - easeInOutCubic(u);
    } else {
      a = 0;
    }

    // keep a gentle "breathing" without becoming obvious
    const breathe = 0.90 + 0.10 * Math.sin(now * 0.0021);
    a = a * breathe;

    // extra soft fade-in for first page load
    const intro = clamp01((now - startAt) / 900);
    a *= intro;

    const key = `${l1}||${l2}`;
    if (key !== lastStoryKey) {
      lastStoryKey = key;
      storyLine1 = l1;
      storyLine2 = l2;
      rebuildMask();
    }
    storyAlpha = a;
  }
function tick(now) {
    const t = (now - startAt) / 1000;
    updateStory(now);
    const maskStrength = storyAlpha;

    // --- Phrase banners: spawn + advance ---
    // Best-effort fit to current column count
    if (ENABLE_PHRASE_BANNERS && PHRASE_BANNERS.length && now >= nextPhraseAt && cols.length > 12) {
      let text = PHRASE_BANNERS[randInt(PHRASE_BANNERS.length)];
      // If too long, remove spaces; if still too long, truncate
      if (text.length > cols.length - 2) text = text.replace(/\s+/g, '');
      if (text.length > cols.length - 2) text = text.slice(0, Math.max(1, cols.length - 2));

      const startCol = randInt(Math.max(1, cols.length - text.length));
      phraseBanners.push({
        text,
        startCol,
        y: -FONT_SIZE * (2 + randInt(14)),
        speed: rand(0.85, 1.15) * (REDUCE_MOTION ? 0.65 : 1.0),
      });

      // keep it sparse
      if (phraseBanners.length > 3) phraseBanners.shift();
      nextPhraseAt = now + rand(PHRASE_GAP_MIN_MS, PHRASE_GAP_MAX_MS) * (REDUCE_MOTION ? 1.35 : 1.0);
    }

    for (let bi = phraseBanners.length - 1; bi >= 0; bi--) {
      const b = phraseBanners[bi];
      b.y += (FONT_SIZE * 0.55) * b.speed;
      if (b.y > H + FONT_SIZE * 6) phraseBanners.splice(bi, 1);
    }


    // fade previous frame
    ctx.fillStyle = `rgba(0,0,0,${FADE_ALPHA})`;
    ctx.fillRect(0, 0, W, H);

    // draw each column
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];

      // choose a few glyphs per column per frame
      const steps = 2 + ((i + (t * 10) | 0) % 3); // 2..4
      for (let s = 0; s < steps; s++) {
        const y = c.y - s * (FONT_SIZE * 0.95);
        if (y < -FONT_SIZE) continue;

        const x = c.x;
        const mv = maskValueAt(x, y); // 0..1
        const inMask = mv > 0.02;

        // Base alpha + intensity
        const alpha = BASE_ALPHA + (inMask ? (MASK_BOOST * mv * maskStrength) : 0);
        const glow = inMask ? (GLOW_BOOST * mv * maskStrength) : 0;

        // Randomized color: per-column hue with slow drift + a tiny deterministic jitter
        const jitter = (((i * 13 + s * 17) % 9) - 4); // -4..4
        const drift = 14 * Math.sin(t * (0.25 + c.hueSpeed) + c.phase);
        const h = c.hue + drift + jitter;
        const sat2 = clamp01(c.sat + (inMask ? 0.18 : 0.00));
        const lit2 = clamp01(c.lit + (inMask ? 0.18 : 0.00) + 0.10 * glow);
        const [r, g, b] = hslToRgb(h, sat2, lit2);

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;

        // glow via shadow (cheap, but works)
        ctx.shadowColor = `rgba(${r},${g},${b},${0.55 * glow})`;
        ctx.shadowBlur = 12 * glow;

        // Inject phrases into the rain without changing the UI layout
        let ch = null;
        let phraseHit = false;
        for (let bi = 0; bi < phraseBanners.length; bi++) {
          const pb = phraseBanners[bi];
          const off = i - pb.startCol;
          if (off < 0 || off >= pb.text.length) continue;
          if (s === 0 && Math.abs(y - pb.y) < FONT_SIZE * 0.55) {
            const cc = pb.text[off];
            if (cc && cc !== ' ') {
              ch = cc;
              phraseHit = true;
            }
            break;
          }
        }
        if (!ch) ch = CHARSET[randInt(CHARSET.length)];
        if (phraseHit) {
          const a2 = Math.min(1, alpha + 0.28);
          ctx.fillStyle = `rgba(${r},${g},${b},${a2})`;
          ctx.shadowBlur = Math.max(ctx.shadowBlur, 16 * glow + 8);
        }
        ctx.fillText(ch, x, y);
      }

      // advance
      c.y += (FONT_SIZE * 0.55) * c.speed;

      // wrap
      if (c.y > H + FONT_SIZE * 4) {
        c.y = -Math.random() * (H * 0.35);
        c.speed = rand(SPEED_MIN, SPEED_MAX) * (REDUCE_MOTION ? 0.55 : 1.0);
      }
    }

    // reset shadow for safety
    ctx.shadowBlur = 0;

    requestAnimationFrame(tick);
  }

  // ====== Start ======
  window.addEventListener('resize', () => {
    resize();
  }, { passive: true });

  // In case body isn't ready yet
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { resize(); requestAnimationFrame(tick); }, { once: true });
  } else {
    resize();
    requestAnimationFrame(tick);
  }
})();

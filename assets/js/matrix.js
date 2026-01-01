/* Matrix Rain with Text Mask (v7)
   Goal: Make the rain itself form the phrase shapes (no overlay text DOM).
   Drop-in replacement for /assets/js/matrix.js
*/
(() => {
  'use strict';

  // ====== TUNING ======
  const CHARSET = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@$%&*+-=<>?/|{}[]()';
// --- Story phrases hidden in the rain (time-delayed, readable) ---
// Requirement:
//  - Rain keeps flowing.
//  - If you look, you can clearly read the phrases.
//  - Not shown all at once: reveal gradually, line by line.
const STORY_PHRASES = [
  { text: 'COLOR ARRIVES BEFORE WORDS.', revealEveryMs: 85, holdMs: 6500 },
  { text: 'SAIREN COLOR ARCHIVE.',       revealEveryMs: 90, holdMs: 7000 },
];
const STORY_START_DELAY_MS = 1800;
const STORY_GAP_BETWEEN_MS = 1200;
const STORY_LOOP_GAP_MS    = 12000;
const STORY_FADE_OUT_MS    = 1800;

// Visual tuning for the story layer (still part of the rain canvas)
const STORY_ALPHA   = 0.95;   // base opacity of revealed letters
const STORY_BOOST_A = 0.32;   // extra alpha compared to normal rain
const STORY_GLOW    = 0.65;   // glow intensity (0..1)
const STORY_S_BOOST = 0.22;   // saturation boost
const STORY_L_BOOST = 0.22;   // lightness boost

let storyState = null;

  const FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

  // Rain look
  const FONT_SIZE = 18;               // base font size in CSS pixels
  const COL_SPACING = 14;             // distance between columns in CSS pixels
  const SPEED_MIN = 0.35;
  const SPEED_MAX = 1.15;
  const FADE_ALPHA = 0.08;            // higher = longer trails
  const BASE_ALPHA = 0.18;            // normal rain brightness
  const MASK_BOOST = 0.55;            // extra alpha inside the mask (0..1)
  const GLOW_BOOST = 0.35;            // extra glow inside the mask (0..1)
  const MASK_EDGE_SOFTEN = 1.4;       // soften mask edges in device pixels
// Mask text: disabled for this build.
// We render the story phrases directly into the rain canvas with time-delayed reveal.
const LINE1 = '';
const LINE2 = '';
const MASK_LINE_GAP = 14;           // kept for compatibility
const LINE1_SCALE = 1.0;
const LINE2_SCALE = 0.55;

// Layout constraints (keep the story in the "hero" region)
const MASK_Y_ANCHOR = 0.35;         // 0..1 from top (where the story sits)
const MASK_MAX_WIDTH_RATIO = 0.92;
const MASK_PADDING = 24;

  // Motion preference
  const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ====== Canvas setup ======
  const canvas = document.createElement('canvas');
  canvas.id = 'matrix-canvas';
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    pointerEvents: 'none'
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: true });

  // Offscreen mask canvas
  const maskCanvas = document.createElement('canvas');
  const mctx = maskCanvas.getContext('2d', { alpha: true, willReadFrequently: true });

  let DPR = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
  let W = 0, H = 0;
  let cols = [];
  let maskData = null;   // Uint8ClampedArray
  let maskW = 0, maskH = 0;

  // Ease helper
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);


// ====== Story phrase system ======
const rowStep = () => (FONT_SIZE * 0.95);

function buildStory(now) {
  if (!cols || cols.length < 8) { storyState = null; return; }

  const rs = rowStep();
  const rowCount = Math.max(1, Math.floor(H / rs));

  // anchor rows (line1 slightly above, line2 slightly below)
  const baseRow = Math.max(0, Math.min(rowCount - 1, Math.floor((H * MASK_Y_ANCHOR) / rs)));
  const rows = [baseRow, Math.min(rowCount - 1, baseRow + 4)];

  const jitterX = (Math.random() * 6 - 3) | 0;

  const seq = [];
  let t = now + STORY_START_DELAY_MS;

  for (let pi = 0; pi < STORY_PHRASES.length; pi++) {
    const text = STORY_PHRASES[pi].text;
    const revealEveryMs = STORY_PHRASES[pi].revealEveryMs;
    const holdMs = STORY_PHRASES[pi].holdMs;

    // ensure it fits horizontally
    let line = text;
    if (line.length > cols.length - 2) line = line.replace(/\s+/g, '');
    if (line.length > cols.length - 2) line = line.slice(0, Math.max(1, cols.length - 2));

    const startCol = Math.max(0, Math.floor((cols.length - line.length) / 2) + jitterX);
    const row = rows[Math.min(rows.length - 1, pi)];

    // build positions (skip spaces but keep their place in centering)
    const positions = [];
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === ' ') continue;
      const col = startCol + i;
      if (col < 0 || col >= cols.length) continue;
      positions.push({ col, row, ch });
    }

    const revealMs = positions.length * revealEveryMs;
    const startAt = t;
    const endAt = t + revealMs + holdMs + STORY_FADE_OUT_MS;

    seq.push({ text: line, positions, revealEveryMs, startAt, endAt });

    t = endAt + STORY_GAP_BETWEEN_MS;
  }

  storyState = { seq, loopAt: t + STORY_LOOP_GAP_MS };
}

function getActiveStory(now) {
  if (!storyState) return null;
  for (let i = 0; i < storyState.seq.length; i++) {
    const p = storyState.seq[i];
    if (now >= p.startAt && now <= p.endAt) return p;
  }
  return null;
}

function renderStory(now, t) {
  const p = getActiveStory(now);
  if (!p) return;

  const elapsed = Math.max(0, now - p.startAt);
  const revealCount = Math.floor(elapsed / p.revealEveryMs);

  const fadeStart = p.endAt - STORY_FADE_OUT_MS;
  let fadeMul = 1;
  if (now > fadeStart) {
    const k = clamp01((now - fadeStart) / STORY_FADE_OUT_MS);
    fadeMul = 1 - easeOutCubic(k);
  }

  const breathe = 0.92 + 0.08 * Math.sin(t * 0.85);

  for (let idx = 0; idx < p.positions.length; idx++) {
    if (idx > revealCount) break;
    const pos = p.positions[idx];
    const c = cols[pos.col];
    if (!c) continue;

    const x = c.x;
    const y = Math.round(pos.row * rowStep());

    // match rain coloring but boost for readability
    const jitter = (((pos.col * 13 + 17) % 9) - 4);
    const drift = 14 * Math.sin(t * (0.25 + c.hueSpeed) + c.phase);
    const h = c.hue + drift + jitter;

    const sat2 = clamp01(c.sat + STORY_S_BOOST);
    const lit2 = clamp01(c.lit + STORY_L_BOOST);

    const [r, g, b] = hslToRgb(h, sat2, lit2);

    const alpha = Math.min(1, (BASE_ALPHA + STORY_BOOST_A) * STORY_ALPHA * fadeMul * breathe);

    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.shadowColor = `rgba(${r},${g},${b},${0.55 * STORY_GLOW * fadeMul})`;
    ctx.shadowBlur = 14 * STORY_GLOW;

    ctx.fillText(pos.ch, x, y);
  }
}

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
    // Match mask canvas to main canvas pixel grid
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    maskW = maskCanvas.width;
    maskH = maskCanvas.height;

    mctx.clearRect(0, 0, maskW, maskH);

    // If mask text is disabled, skip building mask data.
    if (!LINE1) { maskData = null; return; }

    // Compute max width for the phrase
    const maxW = (W * MASK_MAX_WIDTH_RATIO - MASK_PADDING * 2);
    const base1 = Math.round(56 * LINE1_SCALE);
    const base2 = Math.round(40 * LINE2_SCALE);

    // Fit sizes to width
    const s1 = fitTextToWidth(LINE1, maxW, base1);
    const s2 = fitTextToWidth(LINE2, maxW, base2);

    // Use DPR for crisp mask
    const fs1 = Math.round(s1 * DPR);
    const fs2 = Math.round(s2 * DPR);

    // Position: centered, anchored around MASK_Y_ANCHOR
    const centerX = Math.round((W / 2) * DPR);
    const centerY = Math.round((H * MASK_Y_ANCHOR) * DPR);

    // Metrics for vertical placement
    mctx.font = `${fs1}px ${FONT_FAMILY}`;
    const m1 = mctx.measureText(LINE1);
    mctx.font = `${fs2}px ${FONT_FAMILY}`;
    const m2 = mctx.measureText(LINE2);

    const lineGap = Math.round(MASK_LINE_GAP * DPR);
    const totalH = (fs1 + lineGap + fs2);

    const y1 = centerY - totalH / 2 + fs1;          // baseline
    const y2 = y1 + lineGap + fs2;

    // Draw the text in white to create a mask
    mctx.save();
    mctx.textAlign = 'center';
    mctx.textBaseline = 'alphabetic';
    mctx.fillStyle = 'rgba(255,255,255,1)';

    // Soften edges a bit (blur)
    mctx.shadowColor = 'rgba(255,255,255,0.85)';
    mctx.shadowBlur = Math.round(MASK_EDGE_SOFTEN * 10);

    mctx.font = `${fs1}px ${FONT_FAMILY}`;
    mctx.fillText(LINE1, centerX, y1);

    mctx.shadowBlur = Math.round(MASK_EDGE_SOFTEN * 8);
    mctx.font = `${fs2}px ${FONT_FAMILY}`;
    mctx.fillText(LINE2, centerX, y2);

    // Additional soft halo (helps rain "find" the letters)
    mctx.globalAlpha = 0.35;
    mctx.shadowBlur = Math.round(MASK_EDGE_SOFTEN * 18);
    mctx.font = `${fs1}px ${FONT_FAMILY}`;
    mctx.fillText(LINE1, centerX, y1);
    mctx.font = `${fs2}px ${FONT_FAMILY}`;
    mctx.fillText(LINE2, centerX, y2);

    mctx.restore();

    try {
      const img = mctx.getImageData(0, 0, maskW, maskH);
      maskData = img.data;
    } catch (e) {
      // Some browsers may block getImageData with certain settings; degrade gracefully
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


    buildStory(performance.now());
  }

  // ====== Render ======
  const startAt = performance.now();

  function tick(now) {
    const t = (now - startAt) / 1000;
    const maskIntro = easeOutCubic(Math.min(1, t / 2.2)); // fade-in over ~2.2s
    const breathe = 0.92 + 0.08 * Math.sin(t * 0.8);
    const maskStrength = maskIntro * breathe;

    // --- Story phrases: schedule / loop ---
    if (!storyState || now >= storyState.loopAt) buildStory(now);

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

        // Normal rain glyph
        const ch = CHARSET[randInt(CHARSET.length)];
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

    // render story phrases (time-delayed reveal)
    renderStory(now, t);

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

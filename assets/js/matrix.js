/* Matrix Rain with Text Mask (v7)
   Goal: Make the rain itself form the phrase shapes (no overlay text DOM).
   Drop-in replacement for /assets/js/matrix.js
*/
(() => {
  'use strict';

  // ====== TUNING ======
  const CHARSET = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@$%&*+-=<>?/|{}[]()';
  // --- Phrase banners disabled (story reveal only) ---

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

  // Mask text (English only, per spec)
  const LINE1 = 'COLOR ARRIVES BEFORE WORDS.';
  const LINE2 = 'SAIREN COLOR ARCHIVE.';
  const MASK_LINE_GAP = 14;           // px gap between lines (CSS px)
  const LINE1_SCALE = 1.0;            // relative size
  const LINE2_SCALE = 0.90;           // relative size

// ====== Hidden message drops (discoverable, not loud) ======
// Old "rain forms the phrase" mask can stay in the file, but is OFF by default.
const ENABLE_TEXT_MASK = false;
const ENABLE_MESSAGE_DROPS = true;

const MESSAGE_TEXTS = [LINE1, LINE2];

// Spawn cadence (seconds). First minute is slightly more likely to happen.
const MESSAGE_FIRST_MIN_INTERVAL_MIN = 15;
const MESSAGE_FIRST_MIN_INTERVAL_MAX = 30;
const MESSAGE_INTERVAL_MIN = 25;
const MESSAGE_INTERVAL_MAX = 60;

// Visibility (alpha). Keep it in the "noticeable only when you notice" band.
const MESSAGE_ALPHA_MIN = 0.10;
const MESSAGE_ALPHA_MAX = 0.16;
const MESSAGE_PULSE_ALPHA_MIN = 0.18;
const MESSAGE_PULSE_ALPHA_MAX = 0.26;

// A short clarity pulse to create the "…wait, did I see that?" moment.
const MESSAGE_PULSE_DUR = 0.35;
const MESSAGE_PULSE_DELAY_MIN = 0.8;
const MESSAGE_PULSE_DELAY_MAX = 2.0;

// Slightly slower than the rain so the eye can catch it without screaming.
const MESSAGE_SPEED_MULT_MIN = 0.88;
const MESSAGE_SPEED_MULT_MAX = 0.95;

// Spawn position bias (0..1). Higher = more often near center where eyes rest.
const MESSAGE_CENTER_BIAS = 0.70;


  // Layout constraints (keep the phrase in the "hero" region)
  const MASK_Y_ANCHOR = 0.35;         // 0..1 from top (where the phrase center sits)
  const MASK_MAX_WIDTH_RATIO = 0.92;  // keep within viewport
  const MASK_PADDING = 24;            // px

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
  let maskData = null;   // (legacy)
  let maskA = null;      // Uint8ClampedArray alpha for LINE1
  let maskB = null;      // Uint8ClampedArray alpha for LINE2
  let maskW = 0, maskH = 0;

  // Ease helper
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  // ====== Story reveal (in-rain mask) ======
  // Time-delayed: LINE1 then LINE2. No DOM overlay; only the rain "forms" the letters.
  const STORY_DELAY_1 = 0.8;     // seconds before LINE1 begins to appear
  const STORY_REVEAL_1 = 2.1;    // seconds to reveal LINE1
  const STORY_GAP = 1.1;         // seconds gap before LINE2 begins
  const STORY_REVEAL_2 = 1.9;    // seconds to reveal LINE2

  let storyA1 = 0; // 0..1
  let storyA2 = 0; // 0..1

  function smooth01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function ease01(x) { return easeOutCubic(smooth01(x)); }



  function randInt(n) { return (Math.random() * n) | 0; }
  function rand(min, max) { return min + Math.random() * (max - min); }

// ====== Message drops (rare, discoverable) ======
let messages = [];
let nextMsgAt = null;

function scheduleNextMessage(t) {
  if (!ENABLE_MESSAGE_DROPS) { nextMsgAt = null; return; }
  const inFirstMin = t < 60;
  const minI = inFirstMin ? MESSAGE_FIRST_MIN_INTERVAL_MIN : MESSAGE_INTERVAL_MIN;
  const maxI = inFirstMin ? MESSAGE_FIRST_MIN_INTERVAL_MAX : MESSAGE_INTERVAL_MAX;
  nextMsgAt = t + rand(minI, maxI);
}

function pickMessageText() {
  return MESSAGE_TEXTS[randInt(MESSAGE_TEXTS.length)];
}

function spawnMessage(t) {
  if (!cols || cols.length < 10) return;

  const chars = Array.from(pickMessageText());
  const len = chars.length;

  // Choose a starting column, biased toward the center where eyes tend to rest.
  const maxStart = Math.max(0, cols.length - len - 1);
  let startIdx = 0;

  if (Math.random() < MESSAGE_CENTER_BIAS) {
    const mid = Math.floor(cols.length / 2);
    startIdx = mid - Math.floor(len / 2) + (randInt(7) - 3); // small wobble
    if (startIdx < 0) startIdx = 0;
    if (startIdx > maxStart) startIdx = maxStart;
  } else {
    startIdx = randInt(maxStart + 1);
  }

  messages.push({
    chars,
    len,
    startIdx,
    y: -rand(FONT_SIZE * 6, FONT_SIZE * 20),
    speedMult: rand(MESSAGE_SPEED_MULT_MIN, MESSAGE_SPEED_MULT_MAX) * (REDUCE_MOTION ? 0.70 : 1.0),
    baseAlpha: rand(MESSAGE_ALPHA_MIN, MESSAGE_ALPHA_MAX),
    pulseAlpha: rand(MESSAGE_PULSE_ALPHA_MIN, MESSAGE_PULSE_ALPHA_MAX),
    pulseAt: rand(MESSAGE_PULSE_DELAY_MIN, MESSAGE_PULSE_DELAY_MAX),
    born: t
  });
}

function updateAndDrawMessages(t) {
  if (!ENABLE_MESSAGE_DROPS) return;

  // Spawn control
  if (nextMsgAt === null) scheduleNextMessage(t);
  if (t >= nextMsgAt) {
    spawnMessage(t);
    scheduleNextMessage(t);
  }
  if (!messages.length) return;

  // Temporarily switch font (then restore)
  const prevFont = ctx.font;
  const prevBaseline = ctx.textBaseline;
  const fontPx = FONT_SIZE; // keep grid-consistent
  ctx.font = `${fontPx}px ${FONT_FAMILY}`;
  ctx.textBaseline = 'top';

  const dy = (FONT_SIZE * 0.55);

  const alive = [];
  for (let mi = 0; mi < messages.length; mi++) {
    const m = messages[mi];
    const age = t - m.born;

    // Motion
    m.y += dy * m.speedMult;

    // Alpha: base + short clarity pulse (triangle bump)
    let a = m.baseAlpha;
    const p = age - m.pulseAt;
    if (p >= 0 && p <= MESSAGE_PULSE_DUR) {
      const u = p / MESSAGE_PULSE_DUR;
      const bump = u < 0.5 ? (u * 2) : ((1 - u) * 2); // 0..1..0
      a = m.baseAlpha + (m.pulseAlpha - m.baseAlpha) * bump;
    }

    const y = m.y;

    for (let ci = 0; ci < m.len; ci++) {
      const ch = m.chars[ci];
      if (ch === ' ') continue;

      const colIdx = m.startIdx + ci;
      const col = cols[colIdx];
      if (!col) continue;

      const x = col.x;

      // Use the same per-column palette + drift so it blends in
      const jitter = (((colIdx * 13 + ci * 17) % 9) - 4); // -4..4
      const drift = 14 * Math.sin(t * (0.25 + col.hueSpeed) + col.phase);
      const h = col.hue + drift + jitter;

      const lift = (a > (m.baseAlpha + 0.02)) ? 0.10 : 0.05;
      const sat2 = clamp01(col.sat + lift);
      const lit2 = clamp01(col.lit + lift);
      const [r, g, b] = hslToRgb(h, sat2, lit2);

      // Subtle glow (kept small to avoid shouting)
      ctx.shadowColor = `rgba(${r},${g},${b},${0.25 * a})`;
      ctx.shadowBlur = 0.75 * lift * FONT_SIZE;

      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.fillText(ch, x, y);
    }

    // Cleanup per message
    ctx.shadowBlur = 0;

    // Keep if still on-screen
    if (m.y < H + FONT_SIZE * 6) alive.push(m);
  }

  messages = alive;

  // Restore
  ctx.shadowBlur = 0;
  ctx.font = prevFont;
  ctx.textBaseline = prevBaseline;
}



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

    // We'll store alpha-only masks for each line to allow time-delayed reveal
    // without calling getImageData every frame.
    const alpha1 = new Uint8ClampedArray(maskW * maskH);
    const alpha2 = new Uint8ClampedArray(maskW * maskH);

    // Compute max width for the phrase
    const maxW = (W * MASK_MAX_WIDTH_RATIO - MASK_PADDING * 2);
    const base1 = Math.round(56 * LINE1_SCALE);
    const base2 = Math.round(54 * LINE2_SCALE);

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
    mctx.measureText(LINE1);
    mctx.font = `${fs2}px ${FONT_FAMILY}`;
    mctx.measureText(LINE2);

    const lineGap = Math.round(MASK_LINE_GAP * DPR);
    const totalH = (fs1 + lineGap + fs2);

    const y1 = centerY - totalH / 2 + fs1;          // baseline
    const y2 = y1 + lineGap + fs2;

    function renderLineToAlpha(text, fontSizePx, y, outAlpha) {
      mctx.clearRect(0, 0, maskW, maskH);
      mctx.save();
      mctx.textAlign = 'center';
      mctx.textBaseline = 'alphabetic';
      mctx.fillStyle = 'rgba(255,255,255,1)';

      // Soften edges (blur + halo)
      mctx.shadowColor = 'rgba(255,255,255,0.85)';
      mctx.shadowBlur = Math.round(MASK_EDGE_SOFTEN * 10);
      mctx.font = `${fontSizePx}px ${FONT_FAMILY}`;
      mctx.fillText(text, centerX, y);

      mctx.globalAlpha = 0.35;
      mctx.shadowBlur = Math.round(MASK_EDGE_SOFTEN * 18);
      mctx.fillText(text, centerX, y);

      mctx.restore();

      try {
        const img = mctx.getImageData(0, 0, maskW, maskH).data;
        // extract alpha channel
        for (let i = 0, p = 3; i < outAlpha.length; i++, p += 4) {
          outAlpha[i] = img[p];
        }
      } catch (e) {
        // Some browsers may block getImageData; degrade gracefully
        for (let i = 0; i < outAlpha.length; i++) outAlpha[i] = 0;
      }
    }

    renderLineToAlpha(LINE1, fs1, y1, alpha1);
    renderLineToAlpha(LINE2, fs2, y2, alpha2);

    maskData = null;   // unused in this mode
    // Store as globals
    maskA = alpha1;
    maskB = alpha2;
  }


  function maskValueAt(cssX, cssY) {
    // cssX/cssY are in CSS pixels. Convert to device pixels and sample alpha.
    if (!maskA || !maskB) return 0;
    const x = Math.max(0, Math.min(maskW - 1, Math.round(cssX * DPR)));
    const y = Math.max(0, Math.min(maskH - 1, Math.round(cssY * DPR)));
    const idx = (y * maskW + x);
    const a = (maskA[idx] / 255) * storyA1 + (maskB[idx] / 255) * storyA2;
    return a > 1 ? 1 : a;
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
    if (ENABLE_TEXT_MASK) {
      rebuildMask();
    } else {
      maskA = null;
      maskB = null;
    }
  }

  // ====== Render ======
  const startAt = performance.now();

  function tick(now) {
    const t = (now - startAt) / 1000;

    // --- Story timing (time-delayed reveal) ---
    // LINE1 appears first, then LINE2. (Only used when ENABLE_TEXT_MASK is true.)
    if (ENABLE_TEXT_MASK) {
      const t1 = (t - STORY_DELAY_1) / STORY_REVEAL_1;
      const t2 = (t - (STORY_DELAY_1 + STORY_REVEAL_1 + STORY_GAP)) / STORY_REVEAL_2;
      storyA1 = ease01(t1);
      storyA2 = ease01(t2);

      // Tiny "breathing" only after the reveal settles (avoid flicker during fade-in)
      if (!REDUCE_MOTION && storyA2 > 0.95) {
        const breathe2 = 0.97 + 0.03 * Math.sin(t * 0.8);
        storyA1 *= breathe2;
        storyA2 *= breathe2;
      }
    } else {
      storyA1 = 0;
      storyA2 = 0;
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
        const alpha = BASE_ALPHA + (inMask ? (MASK_BOOST * mv) : 0);
        const glow = inMask ? (GLOW_BOOST * mv) : 0;

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

    // reset shadow for safety
    ctx.shadowBlur = 0;

    // Hidden message drops (rare, discoverable)
    updateAndDrawMessages(t);

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

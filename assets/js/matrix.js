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

  // ====== Hidden message rain (easter-egg) ======
  // Goal: Let meaningful phrases drift *inside* the rain without DOM overlays.
  // "Noticeable only when noticed" — rare, subtle, but real letters.
  // NOTE: Purely-canvas (no DOM). This preserves navigation + SEO.
  // We keep messages subtle and biased to peripheral vision.
  const SUBLIMINAL = {
    enabled: true,
    // Only spawn when the viewer is relatively still (reduces "banner" feeling).
    idleSeconds: 1.8,
    // Keep message frequency low to avoid feeling like UI text.
    firstMinuteMin: 14,
    firstMinuteMax: 28,
    min: 26,
    max: 65,
    // Peripheral bias: how often we avoid the center.
    peripheralBias: 0.72, // 0..1 higher = more often peripheral
  };

  // Tiered text (subliminal). Long lines are split automatically.
  const MSG_TIERS = {
    // 最後にだけ残る署名（比較的読める）
    signature: [
      'REMEMBER THIS.',
      'COLOR ARRIVES BEFORE WORDS.',
      'SAIREN COLOR ARCHIVE.'
    ],
    // 観測者の態度スイッチ（短く、読めそうで読めない）
    triggers: [
      'LOOK CLOSER.',
      'SLOW DOWN.',
      'LISTEN WITH YOUR EYES.'
    ],
    // 宣言（意味を掴ませてから沈める）
    manifesto: [
      'NOT A FEED. AN ARCHIVE.',
      'NOT ANSWERS. EXPERIENCE.',
      'COLOR AS TIME.',
      'COLOR IS MEMORY.',
      'MEANING, UNTRANSLATED.',
      'THE SIGNAL IS COLOR.'
    ],
    // 概念語群（日本語は“気配”として扱う）
    jpConcept: [
      'アカシックレコード',
      'タイムレコード',
      '文字レコード',
      '数字レコード',
      '神代文字',
      '古代文字'
    ],
    // 粒子（脳内補完を誘う断片）
    fragments: [
      'COLOR', 'TIME', 'MEMORY', 'SIGNAL', 'ARCHIVE', 'UNTRANSLATED'
    ],
    // 数学者/物理学者の公式・短い名言（外部JSONで上書き可能）
    archive: []
  };

  // Weighted tier choice: mostly fragments, sometimes triggers/manifesto, rarely signature.
  const MSG_TIER_WEIGHTS = [
    ['fragments', 0.41],
    ['jpConcept', 0.22],
    ['triggers', 0.17],
    ['manifesto', 0.13],
    // 偉人の公式・名言は「たまに流れる」くらいの頻度（増やしたい場合はここを上げる）
    ['archive', 0.05],
    ['signature', 0.02]
  ];

  // ====== Archive loader (optional external file) ======
  // /assets/data/matrix-archive.json が存在する場合、MSG_TIERS.archive を差し替える。
  // 形式例:
  // { "version": 1, "items": ["E=MC^2 — ALBERT EINSTEIN", ...] }
  const ARCHIVE_FALLBACK = [
    'E=MC^2 — ALBERT EINSTEIN',
    'F=MA — ISAAC NEWTON',
    'PV=NRT — IDEAL GAS LAW',
    'A^2+B^2=C^2 — PYTHAGORAS',
    'EI\u03c0+1=0 — LEONHARD EULER',
    '\u2207\u00b7E=\u03c1/\u03b5\u2080 — GAUSS',
    '\u2207\u00d7E= -\u2202B/\u2202T — FARADAY',
    '\u2207\u00d7B=\u03bc\u2080J+\u03bc\u2080\u03b5\u2080\u2202E/\u2202T — MAXWELL',
    'S=K LOG W — BOLTZMANN',
    'H\u03c8=E\u03c8 — SCHR\u00d6DINGER',
    '\u0394X\u00b7\u0394P\u2265\u210f/2 — HEISENBERG',
    'E=H\u03bd — PLANCK',
    'F=G M1 M2 / R^2 — GRAVITATION',
    'I^2=-1 — COMPLEX NUMBERS',
    'KNOWING IS NOT ENOUGH. WE MUST APPLY. — GOETHE',
    'NATURE IS WRITTEN IN THE LANGUAGE OF MATHEMATICS. — GALILEO'
  ];

  // Ensure it's never empty (prevents rare undefined message picks before async load)
  MSG_TIERS.archive = ARCHIVE_FALLBACK.slice();

  function normalizeArchiveItems(items) {
    if (!Array.isArray(items)) return [];
    return items
      .map(v => (typeof v === 'string' ? v : ''))
      .map(v => v.trim())
      .filter(Boolean);
  }

  async function loadArchiveIfPresent() {
    // Keep the site robust: if fetch fails, silently fall back.
    try {
      const res = await fetch('/assets/data/matrix-archive.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('not ok');
      const json = await res.json();
      const items = normalizeArchiveItems(json && json.items);
      MSG_TIERS.archive = items.length ? items : ARCHIVE_FALLBACK.slice();
    } catch (e) {
      MSG_TIERS.archive = ARCHIVE_FALLBACK.slice();
    }
  }

  function pickWeighted(pairs) {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < pairs.length; i++) {
      acc += pairs[i][1];
      if (r <= acc) return pairs[i][0];
    }
    return pairs[pairs.length - 1][0];
  }

  function pickTierLine() {
    const tier = pickWeighted(MSG_TIER_WEIGHTS);
    const arr = MSG_TIERS[tier] || [LINE1, LINE2];
    return arr[randInt(arr.length)];
  }

  // Viewer activity gate (idle detection)
  let lastActivityAt = performance.now();
  const markActivity = () => { lastActivityAt = performance.now(); };
  window.addEventListener('pointermove', markActivity, { passive: true });
  window.addEventListener('touchstart', markActivity, { passive: true });
  window.addEventListener('keydown', markActivity, { passive: true });
  window.addEventListener('scroll', markActivity, { passive: true });

  // Spawn cadence (seconds). First minute: slightly more likely, then slower.
  const MSG_FIRST_MIN = SUBLIMINAL.firstMinuteMin;
  const MSG_FIRST_MAX = SUBLIMINAL.firstMinuteMax;
  const MSG_MIN = SUBLIMINAL.min;
  const MSG_MAX = SUBLIMINAL.max;

  // Visual strength (alpha). Pulse is a brief clarity spike (bird-skin moment).
  const MSG_ALPHA_BASE = 0.12;
  const MSG_ALPHA_PULSE = 0.28;
  const MSG_PULSE_DUR = 0.35;          // seconds
  const MSG_PULSE_PROB = 0.90;         // chance that a spawned message gets a pulse

  // Motion & placement
  const MSG_SPEED_FACTOR_MIN = 0.88;   // relative to normal rain speed
  const MSG_SPEED_FACTOR_MAX = 0.95;
  const MSG_CENTER_BIAS = 0.55;        // legacy center bias (used only when not peripheral)

  let msgEvents = [];
  let nextMsgAt = 0;
  let lastNow = 0;

  function rand01() { return Math.random(); }
  function randRange(a, b) { return a + (b - a) * Math.random(); }

  function chooseMsgInterval(t) {
    // first 60s is slightly more frequent to ensure some visitors catch it
    const firstMinute = (t < 60);
    const a = firstMinute ? MSG_FIRST_MIN : MSG_MIN;
    const b = firstMinute ? MSG_FIRST_MAX : MSG_MAX;
    return randRange(a, b);
  }

  function biasedColumnStart(totalCols, textLen) {
    const step = Math.max(10, Math.floor(COL_SPACING));
    const maxStart = Math.max(0, totalCols - textLen - 1);
    if (maxStart <= 0) return 0;

    // Prefer peripheral placement for subliminal feel.
    if (SUBLIMINAL.enabled && Math.random() < SUBLIMINAL.peripheralBias) {
      // left or right band (avoid the center third)
      const leftMax = Math.max(0, Math.floor(maxStart * 0.33));
      const rightMin = Math.max(0, Math.floor(maxStart * 0.67));
      if (Math.random() < 0.5) return randInt(leftMax + 1);
      return rightMin + randInt(Math.max(1, maxStart - rightMin + 1));
    }

    // Blend of uniform + center-biased pick
    if (rand01() > MSG_CENTER_BIAS) return randInt(maxStart + 1);

    // Center around 55% width (where your main cards live)
    const targetX = W * 0.55;
    const targetCol = Math.round(targetX / step);
    // Gaussian-ish via sum of uniforms
    const spread = Math.max(6, Math.round(totalCols * 0.18));
    const g = (rand01() + rand01() + rand01() + rand01() - 2) * (spread / 2);
    return Math.max(0, Math.min(maxStart, targetCol + Math.round(g)));
  }

  function splitToFit(text, maxLen) {
    if (text.length <= maxLen) return [text];
    // Try to split on spaces first.
    if (text.indexOf(' ') !== -1) {
      const words = text.split(' ');
      const chunks = [];
      let cur = '';
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const next = cur ? (cur + ' ' + w) : w;
        if (next.length <= maxLen) {
          cur = next;
        } else {
          if (cur) chunks.push(cur);
          cur = w;
        }
      }
      if (cur) chunks.push(cur);
      return chunks.length ? chunks : [text.slice(0, maxLen)];
    }
    // Japanese/no-spaces: hard slice
    const out = [];
    for (let i = 0; i < text.length; i += maxLen) out.push(text.slice(i, i + maxLen));
    return out;
  }

  function spawnMessage(t) {
    if (REDUCE_MOTION) return;
    if (!SUBLIMINAL.enabled) return;

    // Only when idle
    const idle = (performance.now() - lastActivityAt) / 1000;
    if (idle < SUBLIMINAL.idleSeconds) return;

    const step = Math.max(10, Math.floor(COL_SPACING));
    const totalCols = Math.ceil(W / step) + 1;
    const maxLen = Math.max(6, totalCols - 2);

    // Pick a line, then split if needed; spawn one chunk (keeps it subtle)
    const chosen = pickTierLine();
    const chunks = splitToFit(chosen, maxLen);
    const text = chunks[randInt(chunks.length)];

    const colStart = biasedColumnStart(totalCols, text.length);
    const x = colStart * step;

    // Speed: match the rain update model (px/sec)
    const baseSpeed = rand(SPEED_MIN, SPEED_MAX);
    const factor = randRange(MSG_SPEED_FACTOR_MIN, MSG_SPEED_FACTOR_MAX);
    const pxPerFrame = (FONT_SIZE * 0.55) * baseSpeed * factor;
    const vy = pxPerFrame * 60; // approx convert to px/sec for dt-based update

    // Color: borrow a palette hue sometimes; otherwise random hue
    const pal = (COLOR_MODE === 'palette') ? PALETTE[randInt(PALETTE.length)] : null;
    const hue = pal ? pal.h : Math.random() * 360;
    const sat = pal ? pal.s : 0.55;
    const lit = pal ? pal.l : 0.56;
    const hueSpeed = rand(0.03, 0.10);

    const doPulse = (Math.random() < MSG_PULSE_PROB);
    const pulseAt = doPulse ? (t + randRange(0.8, 2.6)) : 1e9;

    msgEvents.push({
      text,
      x,
      y: -FONT_SIZE * randRange(2.0, 6.0),
      vy,
      hue, sat, lit,
      hueSpeed,
      phase: Math.random() * Math.PI * 2,
      pulseAt
    });
  }

  function drawMessages(t) {
    if (msgEvents.length === 0) return;

    const step = Math.max(10, Math.floor(COL_SPACING));

    for (let i = msgEvents.length - 1; i >= 0; i--) {
      const e = msgEvents[i];

      // Pulse window
      const pulseAge = t - e.pulseAt;
      const pulsing = (pulseAge >= 0 && pulseAge <= MSG_PULSE_DUR);
      const alpha = pulsing ? MSG_ALPHA_PULSE : MSG_ALPHA_BASE;

      // Slight hue drift like columns
      const drift = (t * e.hueSpeed * 60) + Math.sin(t * 0.7 + e.phase) * 6;
      const hue = (e.hue + drift + 360) % 360;

      ctx.shadowBlur = pulsing ? 6 : 0;
      ctx.shadowColor = `hsla(${hue}, ${(e.sat*100)}%, ${(e.lit*100)}%, ${alpha})`;
      ctx.fillStyle = `hsla(${hue}, ${(e.sat*100)}%, ${(e.lit*100)}%, ${alpha})`;

      // Draw each character in a column-like grid so it reads "in the rain"
      for (let j = 0; j < e.text.length; j++) {
        const ch = e.text[j];
        if (ch === ' ') continue;
        const x = e.x + j * step;
        ctx.fillText(ch, x, e.y);
      }

      // Advance (dt-based)
      // (we update y elsewhere; this function just draws)
    }

    ctx.shadowBlur = 0;
  }

  function updateMessages(dt) {
    if (msgEvents.length === 0) return;
    for (let i = msgEvents.length - 1; i >= 0; i--) {
      const e = msgEvents[i];
      e.y += e.vy * dt;
      if (e.y > H + FONT_SIZE * 6) msgEvents.splice(i, 1);
    }
  }

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
    rebuildMask();
  }

  // ====== Render ======
  const startAt = performance.now();

  function tick(now) {
    const t = (now - startAt) / 1000;

    const dt = lastNow ? ((now - lastNow) / 1000) : 0;
    lastNow = now;
        // --- Story timing (time-delayed reveal) ---
    // LINE1 appears first, then LINE2. Keep it subtle but readable.
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


    
    // --- Hidden message rain scheduling ---
    if (!nextMsgAt) nextMsgAt = t + randRange(4, 8);
    if (!REDUCE_MOTION && t >= nextMsgAt) {
      spawnMessage(t);
      nextMsgAt = t + chooseMsgInterval(t);
    }
    updateMessages(dt);
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

    
    // draw hidden message rain (letters within the rain)
    drawMessages(t);

// reset shadow for safety
    ctx.shadowBlur = 0;

    requestAnimationFrame(tick);
  }

  // ====== Start ======
  window.addEventListener('resize', () => {
    resize();
  }, { passive: true });

  // Load optional archive list (non-blocking; silently falls back on failure)
  loadArchiveIfPresent();

  // In case body isn't ready yet
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { resize(); requestAnimationFrame(tick); }, { once: true });
  } else {
    resize();
    requestAnimationFrame(tick);
  }
})();

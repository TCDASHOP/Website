/* SAIREN COLOR ARCHIVE — Matrix Rain (TextMask “inked into rain”)
   - Creates/uses <canvas id="sairen-matrix-canvas">
   - Renders two-line text as particle-shaped mask inside the rain (not a DOM overlay)
   - No deps
*/
(() => {
  "use strict";

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Canvas bootstrap -----------------------------------------------------
  const CANVAS_ID = "sairen-matrix-canvas";

  function ensureCanvas() {
    let c = document.getElementById(CANVAS_ID);
    if (!c) {
      c = document.createElement("canvas");
      c.id = CANVAS_ID;
      c.setAttribute("aria-hidden", "true");
      document.body.appendChild(c);
    }
    return c;
  }

  const canvas = ensureCanvas();
  const ctx = canvas.getContext("2d", { alpha: true });

  // ---- Tunables -------------------------------------------------------------
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+-=<>/?[]{}()";
  const BASE_COLOR = { r: 120, g: 215, b: 205 }; // soft teal
  const MASK_COLOR = { r: 235, g: 255, b: 255 }; // near-white

  // Mask resolution: lower = faster, higher = sharper
  const MASK_SCALE = 0.28; // ~28% res
  const MASK_POINT_STEP = 2; // sampling step in mask pixels
  const MASK_ALPHA_THRESHOLD = 40; // 0-255
  const MASK_MAX_POINTS = 12000;
  const MASK_POINTS_PER_FRAME = 1200;

  // Fade: higher alpha = longer trails
  const FADE_ALPHA = 0.08;

  // ---- State ----------------------------------------------------------------
  let W = 0,
    H = 0,
    DPR = 1;
  let fontSize = 16;
  let columns = 0;
  let drops = [];
  let mask = null; // { w,h,data,points: [{x,y}], seed }
  let raf = 0;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function randInt(n) {
    return (Math.random() * n) | 0;
  }

  function setCanvasSize() {
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Font size scales gently with width.
    fontSize = clamp(Math.round(W / 80), 14, 20);
    columns = Math.ceil(W / fontSize);

    drops = new Array(columns).fill(0).map(() => -randInt(H));
    buildMask();
  }

  // ---- Text mask building ---------------------------------------------------
  function buildMask() {
    const mw = Math.max(1, Math.floor(W * MASK_SCALE));
    const mh = Math.max(1, Math.floor(H * MASK_SCALE));

    const off = document.createElement("canvas");
    off.width = mw;
    off.height = mh;
    const o = off.getContext("2d");

    // Background transparent.
    o.clearRect(0, 0, mw, mh);

    // Copy (fixed per spec)
    const title = "Color arrives before words.";
    const subtitle = "An archive of works and the trail of creation.";

    // Compute font sizes (mask-space)
    let titlePx = clamp(Math.round(W * 0.10 * MASK_SCALE), 18, 44);
    let subPx = clamp(Math.round(W * 0.036 * MASK_SCALE), 10, 16);

    const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    // Fit title to width
    o.textAlign = "center";
    o.textBaseline = "alphabetic";
    o.fillStyle = "rgba(255,255,255,1)";

    function setTitleFont(px) {
      o.font = `700 ${px}px ${mono}`;
    }
    setTitleFont(titlePx);
    // Shrink if needed
    while (o.measureText(title).width > mw * 0.92 && titlePx > 14) {
      titlePx -= 1;
      setTitleFont(titlePx);
    }

    o.font = `700 ${titlePx}px ${mono}`;
    const y1 = Math.round(mh * 0.32);
    o.fillText(title, Math.round(mw * 0.5), y1);

    o.font = `400 ${subPx}px ${mono}`;
    // “間を空けて表示” = clear gap under title
    const y2 = y1 + Math.round(titlePx * 1.2);
    o.fillText(subtitle, Math.round(mw * 0.5), y2);

    const img = o.getImageData(0, 0, mw, mh);
    const data = img.data;

    // Build point cloud from alpha mask (this is the “inked” look)
    const points = [];
    // Reservoir-ish sampling to cap point count
    let seen = 0;
    for (let y = 0; y < mh; y += MASK_POINT_STEP) {
      for (let x = 0; x < mw; x += MASK_POINT_STEP) {
        const a = data[(y * mw + x) * 4 + 3];
        if (a > MASK_ALPHA_THRESHOLD) {
          seen++;
          const px = x / MASK_SCALE;
          const py = y / MASK_SCALE;

          if (points.length < MASK_MAX_POINTS) {
            points.push({ x: px, y: py });
          } else {
            // Replace existing points with decreasing probability
            const j = randInt(seen);
            if (j < MASK_MAX_POINTS) points[j] = { x: px, y: py };
          }
        }
      }
    }

    mask = { w: mw, h: mh, data, points, seed: randInt(999999) };
  }

  function maskAlphaAt(x, y) {
    if (!mask) return 0;
    const mx = Math.floor(x * MASK_SCALE);
    const my = Math.floor(y * MASK_SCALE);
    if (mx < 0 || my < 0 || mx >= mask.w || my >= mask.h) return 0;
    return mask.data[(my * mask.w + mx) * 4 + 3];
  }

  // ---- Render loop ----------------------------------------------------------
  function drawFrame() {
    // Fade
    ctx.fillStyle = `rgba(0,0,0,${FADE_ALPHA})`;
    ctx.fillRect(0, 0, W, H);

    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textBaseline = "top";

    // Normal rain
    for (let i = 0; i < columns; i++) {
      const x = i * fontSize;
      const y = drops[i];

      const ch = GLYPHS[randInt(GLYPHS.length)];
      const a = maskAlphaAt(x, y);

      if (a > MASK_ALPHA_THRESHOLD) {
        // “Text inside rain” — bright, a bit thicker glow
        ctx.shadowBlur = 14;
        ctx.shadowColor = "rgba(180,255,255,0.9)";
        ctx.fillStyle = `rgba(${MASK_COLOR.r},${MASK_COLOR.g},${MASK_COLOR.b},0.92)`;
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${BASE_COLOR.r},${BASE_COLOR.g},${BASE_COLOR.b},0.35)`;
      }

      ctx.fillText(ch, x, y);

      // Advance drop
      drops[i] = y + fontSize;

      // Reset with some randomness
      if (drops[i] > H + randInt(160)) {
        drops[i] = -randInt(H);
      }
    }

    // Point-cloud “ink” pass: makes letters readable & truly made of particles
    if (mask && mask.points && mask.points.length) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(180,255,255,0.85)";
      ctx.fillStyle = `rgba(${MASK_COLOR.r},${MASK_COLOR.g},${MASK_COLOR.b},0.85)`;

      mask.seed = (mask.seed + 9973) >>> 0;
      const len = mask.points.length;
      let idx = mask.seed % len;

      for (let k = 0; k < MASK_POINTS_PER_FRAME; k++) {
        const p = mask.points[idx];
        const ch = GLYPHS[(idx + k) % GLYPHS.length];
        // tiny jitter makes it “alive”
        const jx = (randInt(3) - 1) * 0.35;
        const jy = (randInt(3) - 1) * 0.35;
        ctx.fillText(ch, p.x + jx, p.y + jy);

        idx += 13;
        if (idx >= len) idx %= len;
      }
      ctx.restore();
    }

    raf = requestAnimationFrame(drawFrame);
  }

  function start() {
    cancelAnimationFrame(raf);
    setCanvasSize();

    // Initial clear
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, W, H);

    if (prefersReducedMotion) return; // keep a static black canvas
    raf = requestAnimationFrame(drawFrame);
  }

  // ---- Wire up --------------------------------------------------------------
  const debouncedResize = (() => {
    let t = 0;
    return () => {
      window.clearTimeout(t);
      t = window.setTimeout(start, 120);
    };
  })();

  window.addEventListener("resize", debouncedResize, { passive: true });

  // Ensure the canvas sits behind UI but above background.
  // CSS already targets #sairen-matrix-canvas in your style.css; this is a safe fallback.
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "0";

  start();
})();

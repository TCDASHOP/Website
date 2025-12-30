/* SAIREN COLOR ARCHIVE — Matrix Rain (TextMask integrated)
   - Fullscreen canvas background
   - Raindrops form the hero copy as a "text mask"
   - No external deps
*/
(() => {
  "use strict";

  const GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%&*+-=<>?/\\|[]{}()~";
  const BG_FADE = 0.08;     // background trail strength (0..1) higher = faster fade
  const BASE_SPEED = 0.85;  // baseline speed multiplier
  const DENSITY = 0.012;    // columns per px (smaller = fewer columns)
  const MASK_SCALE = 0.42;  // mask canvas resolution scale (performance)

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Create / reuse canvas
  let cv = document.getElementById("sairen-matrix-canvas");
  if (!cv) {
    cv = document.createElement("canvas");
    cv.id = "sairen-matrix-canvas";
    // keep it as first element so everything else stacks above naturally
    document.body.prepend(cv);
  }

  // Strong defaults (CSS can override but JS guarantees it works)
  Object.assign(cv.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "0"
  });

  const ctx = cv.getContext("2d", { alpha: true });

  // Offscreen mask canvas
  const mask = document.createElement("canvas");
  const mctx = mask.getContext("2d", { alpha: true });

  // Draw params
  let W = 0, H = 0, DPR = 1;
  let cols = 0, colW = 16;
  let drops = []; // y positions
  let speeds = []; // per-column speed
  let maskW = 0, maskH = 0, maskData = null;

  // Hero copy sources (hidden in DOM; used for mask text)
  function getHeroLines() {
    const l1 = document.querySelector('[data-hero-matrix="line1"]')?.textContent?.trim();
    const l2 = document.querySelector('[data-hero-matrix="line2"]')?.textContent?.trim();
    const h1 = document.querySelector("h1")?.textContent?.trim();
    const p  = document.querySelector("main p")?.textContent?.trim();

    // Prefer explicit data attributes, fallback to first h1/p
    const line1 = (l1 && l1.length) ? l1 : (h1 && h1.length ? h1 : "Color arrives before words.");
    const line2 = (l2 && l2.length) ? l2 : (p  && p.length  ? p  : "An archive of works and the trail of creation.");
    return [line1, line2];
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function resize() {
    DPR = window.devicePixelRatio || 1;
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);

    cv.width  = Math.floor(W * DPR);
    cv.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Column width based on viewport
    colW = clamp(Math.round(W * DENSITY) * 8, 14, 24); // 14..24
    cols = Math.floor(W / colW);
    drops = new Array(cols).fill(0).map(() => Math.random() * H);
    speeds = new Array(cols).fill(0).map(() => (0.6 + Math.random() * 1.1) * BASE_SPEED);

    // Build mask (lower-res)
    maskW = Math.max(1, Math.floor(W * MASK_SCALE));
    maskH = Math.max(1, Math.floor(H * MASK_SCALE));
    mask.width  = maskW;
    mask.height = maskH;

    buildMask();
  }

  function buildMask() {
    const [line1, line2] = getHeroLines();

    // Clear
    mctx.clearRect(0, 0, maskW, maskH);

    // Compute font sizes
    const scaleInv = 1 / MASK_SCALE;
    const baseSize = clamp(Math.round(W * 0.055), 26, 64); // roughly like your hero title
    const titleSize = Math.round(baseSize * MASK_SCALE);
    const subSize   = Math.round(baseSize * 0.32 * MASK_SCALE);

    // Position (near lower left / center area like original hero copy)
    const x = Math.round(36 * MASK_SCALE);
    const yBase = Math.round((H * 0.66) * MASK_SCALE);

    // Title
    mctx.save();
    mctx.textBaseline = "alphabetic";
    mctx.fillStyle = "rgba(255,255,255,1)";
    mctx.font = `700 ${titleSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    mctx.shadowColor = "rgba(255,255,255,0.75)";
    mctx.shadowBlur = Math.round(18 * MASK_SCALE);
    mctx.shadowOffsetX = 0;
    mctx.shadowOffsetY = 0;

    // Wrap title if needed
    const maxW = Math.round((W * 0.88) * MASK_SCALE);
    const titleLines = wrapText(mctx, line1, maxW);
    let y = yBase;
    for (const tl of titleLines) {
      mctx.fillText(tl, x, y);
      y += Math.round(titleSize * 1.05);
    }

    // Sub line (with a little gap)
    y += Math.round(titleSize * 0.35);
    mctx.shadowBlur = Math.round(10 * MASK_SCALE);
    mctx.font = `400 ${subSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    const subLines = wrapText(mctx, line2, maxW);
    for (const sl of subLines) {
      mctx.fillText(sl, x, y);
      y += Math.round(subSize * 1.55);
    }

    mctx.restore();

    // Snapshot alpha channel once (fast sampling in the render loop)
    try {
      maskData = mctx.getImageData(0, 0, maskW, maskH).data;
    } catch (e) {
      // iOS can throw if memory pressure; degrade gracefully (no mask)
      maskData = null;
    }
  }

  function wrapText(c, text, maxWidth) {
    const words = (text || "").split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    let line = words[0];
    const lines = [];
    for (let i = 1; i < words.length; i++) {
      const test = line + " " + words[i];
      if (c.measureText(test).width <= maxWidth) line = test;
      else { lines.push(line); line = words[i]; }
    }
    lines.push(line);
    return lines;
  }

  function sampleMaskAlpha(x, y) {
    if (!maskData) return 0;
    const mx = Math.floor(x * MASK_SCALE);
    const my = Math.floor(y * MASK_SCALE);
    if (mx < 0 || my < 0 || mx >= maskW || my >= maskH) return 0;
    const idx = (my * maskW + mx) * 4 + 3;
    return maskData[idx] / 255;
  }

  // Animation
  let t0 = performance.now();
  function tick(now) {
    if (prefersReduced) return;

    const dt = Math.min(48, now - t0);
    t0 = now;

    // Fade background to leave trails
    ctx.fillStyle = `rgba(0,0,0,${BG_FADE})`;
    ctx.fillRect(0, 0, W, H);

    // Draw rain
    ctx.font = `${Math.round(colW * 0.95)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    ctx.textBaseline = "top";

    for (let i = 0; i < cols; i++) {
      const x = i * colW;
      const y = drops[i];

      // Base alpha and highlight if inside mask
      const a = sampleMaskAlpha(x + colW * 0.5, y + colW * 0.5);
      const boost = a > 0.10 ? (0.25 + a * 0.95) : 0.10;

      // Slight tint shift (blue/green-ish) when masked
      const base = 0.18;
      const alpha = clamp(base + boost, 0, 0.95);

      // Random glyph
      const ch = GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);

      // Draw glow (masked areas glow more)
      if (a > 0.10) {
        ctx.shadowColor = "rgba(120,220,255,0.55)";
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowColor = "rgba(120,220,255,0.18)";
        ctx.shadowBlur = 2;
      }

      ctx.fillStyle = `rgba(210,235,255,${alpha})`;
      ctx.fillText(ch, x, y);

      // advance
      drops[i] += speeds[i] * (dt * 0.85) * (a > 0.10 ? 0.85 : 1.0);

      // reset when off screen
      if (drops[i] > H + colW) {
        drops[i] = -Math.random() * H * 0.25;
        speeds[i] = (0.6 + Math.random() * 1.1) * BASE_SPEED;
      }
    }

    requestAnimationFrame(tick);
  }

  // Boot
  function boot() {
    resize();
    requestAnimationFrame(tick);
  }

  // Rebuild mask on resize and on language switch (if your UI swaps text nodes)
  window.addEventListener("resize", () => {
    resize();
  }, { passive: true });

  // If you have a language selector that changes the DOM, call buildMask() again after it runs:
  // window.dispatchEvent(new Event("sairen:i18n"));

  window.addEventListener("sairen:i18n", () => {
    buildMask();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

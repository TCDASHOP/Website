// SAIREN COLOR ARCHIVE — main.js
(() => {
  // ----------------------------
  // Year
  // ----------------------------
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // ----------------------------
  // Copy deterrence (not absolute)
  // ----------------------------
  document.addEventListener("contextmenu", (e) => e.preventDefault(), { passive: false });

  // block common copy shortcuts
  document.addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && (k === "c" || k === "s" || k === "p" || k === "u" || k === "a")) {
      e.preventDefault();
    }
  });

  // stop image drag
  document.addEventListener("dragstart", (e) => e.preventDefault(), { passive: false });

  // long-press save image deterrence (iOS behavior varies)
  document.addEventListener("touchstart", () => {}, { passive: true });

  // ----------------------------
  // Generative background field (Canvas)
  // ----------------------------
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: true });
  let w = 0, h = 0, dpr = 1;

  const resize = () => {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener("resize", resize);
  resize();

  // Simple hash-noise
  const hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  // Flow points
  const P = [];
  const N = 70;
  for (let i = 0; i < N; i++) {
    P.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: 0,
      vy: 0,
      a: Math.random() * Math.PI * 2,
      s: 0.7 + Math.random() * 1.8
    });
  }

  let t = 0;
  const tick = () => {
    t += 0.006;

    // fade
    ctx.fillStyle = "rgba(5,6,8,0.07)";
    ctx.fillRect(0, 0, w, h);

    // subtle vignette
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.55, Math.max(w, h) * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // flow strokes
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const n = hash(p.x * 0.006 + t, p.y * 0.006 - t);
      const ang = n * Math.PI * 6.0;
      p.vx += Math.cos(ang) * 0.08 * p.s;
      p.vy += Math.sin(ang) * 0.08 * p.s;

      // damp
      p.vx *= 0.92;
      p.vy *= 0.92;

      const ox = p.x;
      const oy = p.y;

      p.x += p.vx;
      p.y += p.vy;

      // wrap
      if (p.x < -50) p.x = w + 50;
      if (p.x > w + 50) p.x = -50;
      if (p.y < -50) p.y = h + 50;
      if (p.y > h + 50) p.y = -50;

      // ink color (chromatic but dark)
      const hue = (n * 360 + i * 2.6) % 360;
      ctx.strokeStyle = `hsla(${hue}, 95%, 62%, 0.06)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    requestAnimationFrame(tick);
  };
  tick();

  // ----------------------------
  // Hero typography fracture (scroll + pointer)
  // ----------------------------
  const lines = [...document.querySelectorAll(".hero__type .t")];
  const coordA = document.getElementById("coordA");
  const coordB = document.getElementById("coordB");
  const coordC = document.getElementById("coordC");

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const applyFracture = (fx, fy, fz) => {
    // each line splits differently
    lines.forEach((el, idx) => {
      const d = (idx + 1) * 0.9;
      const x = fx * 34 * d;
      const y = fy * 18 * d;
      const r = fx * 3.2 * d;
      const s = 1 + fz * 0.012 * d;
      const blur = Math.abs(fx) * 1.2 + Math.abs(fy) * 0.8;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${r}deg) scale(${s})`;
      el.style.filter = `saturate(1.25) contrast(1.05) blur(${blur}px)`;
      el.style.opacity = `${0.92 - Math.abs(fx) * 0.12 - Math.abs(fy) * 0.06}`;
    });

    if (coordA) coordA.textContent = `x ${fx.toFixed(2)}`;
    if (coordB) coordB.textContent = `y ${fy.toFixed(2)}`;
    if (coordC) coordC.textContent = `z ${fz.toFixed(2)}`;
  };

  // scroll fracture baseline
  const onScroll = () => {
    const s = window.scrollY || 0;
    const fz = clamp(s / 900, 0, 1);        // 0..1
    applyFracture(0, 0, fz);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // pointer adds living offset
  const onMove = (e) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const fx = clamp((e.clientX - cx) / cx, -1, 1);
    const fy = clamp((e.clientY - cy) / cy, -1, 1);
    const s = window.scrollY || 0;
    const fz = clamp(s / 900, 0, 1);
    applyFracture(fx * 0.35, fy * 0.30, fz);
  };

  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  if (!isCoarse) {
    window.addEventListener("mousemove", onMove, { passive: true });
  } else {
    window.addEventListener("deviceorientation", (e) => {
      if (typeof e.beta !== "number" || typeof e.gamma !== "number") return;
      const fx = clamp(e.gamma / 35, -1, 1);
      const fy = clamp(e.beta / 35, -1, 1);
      const s = window.scrollY || 0;
      const fz = clamp(s / 900, 0, 1);
      applyFracture(fx * 0.35, fy * 0.30, fz);
    }, true);
  }
})();

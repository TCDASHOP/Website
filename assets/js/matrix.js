(() => {
  const canvas = document.getElementById("matrixCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  // Dense, high-contrast "matrix" set
  const letters = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+-/=";

  let w = 0,
    h = 0,
    cols = 0,
    drops = [],
    dpr = 1;

  // Boost mode used for page transitions / intro
  let boost = 0; // 0 or 1

  const setBoost = (on) => {
    boost = on ? 1 : 0;
    // stronger glow during boost
    ctx.shadowBlur = boost ? 14 : 8;
    ctx.shadowColor = boost ? "rgba(0,255,140,0.85)" : "rgba(0,255,140,0.55)";
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // smaller font => denser rain (looks more "matrix")
    const fontSize = w < 720 ? 12 : 14;
    canvas.dataset.fontSize = String(fontSize);

    cols = Math.floor(w / fontSize);
    drops = new Array(cols)
      .fill(0)
      .map(() => Math.floor(Math.random() * (h / fontSize)));

    // reset glow after resize
    setBoost(boost === 1);
  };

  const randChar = () => letters[(Math.random() * letters.length) | 0];

  // Mostly green, with subtle hue wobble to match your neon palette
  const randColor = () => {
    const hue = 128 + ((Math.random() * 28) | 0); // 128–155
    const light = boost ? 74 : 66;
    const alpha = boost ? 0.98 : 0.92;
    return `hsla(${hue}, 98%, ${light}%, ${alpha})`;
  };

  let last = 0;
  const draw = (t) => {
    // delta is not used directly, but keeping for future tuning
    last = t;

    const fontSize = Number(canvas.dataset.fontSize || 14);

    // Fade layer: smaller alpha => longer trails (stronger "matrix" feel)
    const fade = boost ? 0.035 : 0.070;
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, w, h);

    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;

    const speed = boost ? 2 : 1; // boost mode = faster rain

    for (let i = 0; i < drops.length; i++) {
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ctx.fillStyle = randColor();
      ctx.fillText(randChar(), x, y);

      // occasional second char to thicken density
      if (boost && Math.random() < 0.18) {
        ctx.fillText(randChar(), x, y + fontSize);
      }

      // reset
      if (y > h && Math.random() > (boost ? 0.90 : 0.975)) drops[i] = 0;
      drops[i] += speed;
    }

    requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });

  // Expose for transitions
  window.MatrixFX = { setBoost };

  requestAnimationFrame(draw);
})();

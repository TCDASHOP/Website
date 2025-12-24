(() => {
  const canvas = document.getElementById("matrixCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const letters = "アァカサタナハマヤャラワン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let w = 0, h = 0, cols = 0;
  let drops = [];
  let dpr = 1;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fontSize = w < 720 ? 14 : 16;
    canvas.dataset.fontSize = String(fontSize);
    cols = Math.floor(w / fontSize);
    drops = new Array(cols).fill(0).map(() => Math.floor(Math.random() * h / fontSize));
  };

  const randChar = () => letters[Math.floor(Math.random() * letters.length)];
  const randColor = () => {
    // neon palette similar to your "matrix" vibe but with slight variety
    const hues = [130, 145, 165, 190, 210, 300, 330, 40];
    const h = hues[(Math.random() * hues.length) | 0];
    return `hsla(${h}, 95%, 70%, 0.95)`;
  };

  let last = 0;
  const draw = (t) => {
    const dt = t - last;
    last = t;

    const fontSize = Number(canvas.dataset.fontSize || 16);
    // fade
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(0, 0, w, h);

    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;

    for (let i = 0; i < drops.length; i++) {
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      // head brighter
      ctx.fillStyle = randColor();
      ctx.fillText(randChar(), x, y);

      // trail control
      if (y > h && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }

    requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(draw);
})();

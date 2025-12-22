/* =========================
   SAIREN COLOR ARCHIVE - Main JS
   Home-only effects run only when body[data-page="home"]
   ========================= */

(function () {
  const body = document.body;
  const isHome = body && body.dataset && body.dataset.page === "home";
  if (!isHome) return;

  // Cursor glow
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);

  let gx = -999, gy = -999;
  window.addEventListener("pointermove", (e) => {
    gx = e.clientX - 120;
    gy = e.clientY - 120;
    glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
  }, { passive: true });

  // Pigment particles inside hero
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const layer = document.createElement("div");
  layer.className = "pigment-layer";
  hero.appendChild(layer);

  const count = Math.min(26, Math.max(14, Math.floor(window.innerWidth / 50)));

  function rand(min, max) { return Math.random() * (max - min) + min; }

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "pigment";

    const s = rand(10, 34);
    const o = rand(0.18, 0.72);

    p.style.setProperty("--s", `${s}px`);
    p.style.setProperty("--o", `${o}`);

    const x = rand(0, 100);
    const y = rand(0, 100);
    p.style.left = `${x}%`;
    p.style.top = `${y}%`;

    layer.appendChild(p);

    const dx = rand(-18, 18);
    const dy = rand(-22, 22);
    const drift = rand(5200, 9800);
    const delay = rand(0, 1800);

    p.animate(
      [
        { transform: `translate3d(0,0,0) scale(${rand(0.9, 1.1)})` },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${rand(0.95, 1.2)})` }
      ],
      { duration: drift, delay, direction: "alternate", iterations: Infinity, easing: "ease-in-out" }
    );
  }
})();

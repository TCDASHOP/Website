(() => {
  const $ = (sel, root=document) => root.querySelector(sel);

  // Active nav highlight
  const page = document.body?.dataset?.page || "";
  document.querySelectorAll("[data-nav]").forEach(a => {
    if (a.dataset.nav === page) a.classList.add("is-active");
  });

  // THEME toggle (subtle: swap accent colors)
  const themeBtn = $("#themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const r = document.documentElement;
      const mode = r.dataset.theme === "alt" ? "base" : "alt";
      r.dataset.theme = mode;

      if (mode === "alt") {
        r.style.setProperty("--accent1", "#00ffa8");
        r.style.setProperty("--accent2", "#7c5cff");
        r.style.setProperty("--accent3", "#ffcc00");
      } else {
        r.style.setProperty("--accent1", "#7c5cff");
        r.style.setProperty("--accent2", "#00ffa8");
        r.style.setProperty("--accent3", "#ff2d7a");
      }
    });
  }

  // Home-only intro effect: paint drips -> reveal page
  if (document.body.dataset.page === "home") {
    const overlay = document.createElement("div");
    overlay.className = "intro-overlay";
    overlay.innerHTML = `
      <div class="drips" id="drips"></div>
      <div class="noise"></div>
      <div class="scan"></div>
    `;
    document.body.appendChild(overlay);

    const drips = $("#drips", overlay);

    const colors = [
      "linear-gradient(180deg, rgba(124,92,255,.0), rgba(124,92,255,.55), rgba(0,255,168,.42))",
      "linear-gradient(180deg, rgba(0,255,168,.0), rgba(0,255,168,.52), rgba(255,45,122,.34))",
      "linear-gradient(180deg, rgba(255,45,122,.0), rgba(255,45,122,.50), rgba(124,92,255,.34))",
      "linear-gradient(180deg, rgba(255,204,0,.0), rgba(255,204,0,.38), rgba(0,255,168,.34))",
    ];

    const makeDrip = (i) => {
      const d = document.createElement("div");
      d.className = "drip";
      const left = Math.random() * 110 - 5; // -5%..105%
      const delay = 0.06 * i + Math.random() * 0.08;
      const dur = 1.3 + Math.random() * 0.6;

      d.style.left = `${left}%`;
      d.style.animationDelay = `${delay}s`;
      d.style.animationDuration = `${dur}s`;
      d.style.background = colors[Math.floor(Math.random()*colors.length)];
      d.style.opacity = "0";
      drips.appendChild(d);

      d.addEventListener("animationend", () => d.remove());
    };

    // burst
    const total = 11;
    for (let i = 0; i < total; i++) makeDrip(i);

    // second wave (lighter)
    setTimeout(() => {
      for (let i = 0; i < 7; i++) makeDrip(i + 20);
    }, 420);

    // turn overlay off and enable reveal
    setTimeout(() => {
      overlay.classList.add("is-off");
      setTimeout(() => overlay.remove(), 820);
    }, 1600);

    // Add reveal animation class to hero content
    const hero = $(".hero-inner");
    if (hero) hero.classList.add("reveal");
  }

})();

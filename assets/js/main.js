(() => {
  const $ = (s, r=document) => r.querySelector(s);

  // --- Theme (optional toggle hook) ---
  const THEME_KEY = "sca_theme";
  const applyTheme = (t) => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem(THEME_KEY, t);
  };
  const initTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);
  };

  // --- Language switch (folder based) ---
  const supported = ["ja","en","es","fr","ko","zh-hans"];
  const detectLangFromPath = () => {
    const parts = location.pathname.split("/").filter(Boolean);
    const maybe = parts[0] || "ja";
    return supported.includes(maybe) ? maybe : "ja";
  };
  const switchLang = (to) => {
    const parts = location.pathname.split("/").filter(Boolean);
    const file = parts[1] || "index.html"; // /{lang}/{file}
    location.href = `/${to}/${file}`;
  };

  // --- Mark active menu item ---
  const markActive = () => {
    const path = location.pathname.split("/").filter(Boolean);
    const file = (path[1] || "index.html").toLowerCase();
    document.querySelectorAll("[data-nav]").forEach(a => {
      a.classList.toggle("active", a.getAttribute("href").toLowerCase().endsWith(file));
    });
  };

  // --- Home FX: splash -> mix -> outline -> complete ---
  const homeFx = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const isHome = document.body.dataset.page === "home";
    if (!isHome) return;

    const fx = $(".homeFx");
    const cv = $("#fxCanvas");
    if (!fx || !cv) return;

    const hero = $(".hero");
    const outline = $(".heroOutline");
    if (!hero || !outline) return;

    // Ensure overlay matches hero card position for outline SVG viewBox
    const syncOutline = () => {
      const r = hero.getBoundingClientRect();
      outline.style.left = r.left + "px";
      outline.style.top = r.top + "px";
      outline.style.width = r.width + "px";
      outline.style.height = r.height + "px";
    };

    const ctx = cv.getContext("2d", { alpha: true });
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      cv.width = Math.floor(innerWidth * DPR);
      cv.height = Math.floor(innerHeight * DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
    };
    resize();
    syncOutline();

    window.addEventListener("resize", () => { resize(); syncOutline(); }, { passive:true });
    window.addEventListener("scroll", () => { syncOutline(); }, { passive:true });

    // Particles
    const rand = (a,b)=>a+Math.random()*(b-a);
    const splats = [];
    const colors = ["#7c3aed","#2563eb","#ef4444"];

    const addBurst = (x,y, n=34) => {
      for (let i=0;i<n;i++){
        const ang = rand(0, Math.PI*2);
        const spd = rand(2.2, 7.4);
        splats.push({
          x, y,
          vx: Math.cos(ang)*spd,
          vy: Math.sin(ang)*spd,
          r: rand(1.2, 5.6),
          life: rand(0.55, 1.25),
          max: 1,
          c: colors[(Math.random()*colors.length)|0],
          g: rand(0.10, 0.22),
          drip: Math.random() < 0.18
        });
      }
    };

    const clear = () => ctx.clearRect(0,0,innerWidth,innerHeight);

    let t0 = performance.now();
    let phase = 0; // 0 splash, 1 mix, 2 outline, 3 done
    let last = t0;

    // start
    fx.classList.add("on");

    // initial bursts around hero center
    const hr = hero.getBoundingClientRect();
    const cx = hr.left + hr.width*0.45;
    const cy = hr.top + hr.height*0.48;
    addBurst(cx, cy, 48);
    addBurst(cx + rand(-120,120), cy + rand(-90,90), 36);
    addBurst(cx + rand(-140,140), cy + rand(-110,110), 36);

    const step = (now) => {
      const dt = Math.min(0.033, (now - last)/1000);
      last = now;

      clear();

      // draw particles (splash)
      if (phase === 0){
        ctx.globalCompositeOperation = "lighter";
        for (let i=splats.length-1;i>=0;i--){
          const p = splats[i];
          p.life -= dt;
          if (p.life <= 0){ splats.splice(i,1); continue; }

          // physics
          p.vy += p.g*60*dt;
          p.x += p.vx;
          p.y += p.vy;

          // drip
          if (p.drip){
            p.vx *= 0.985;
            p.vy *= 0.995;
          }

          const a = Math.max(0, Math.min(1, p.life / p.max));
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(p.c, 0.55 * a);
          ctx.arc(p.x, p.y, p.r * (0.7 + (1-a)*0.9), 0, Math.PI*2);
          ctx.fill();

          // tiny tail
          ctx.strokeStyle = hexToRgba(p.c, 0.28 * a);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx*1.2, p.y - p.vy*1.2);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      }

      const elapsed = (now - t0)/1000;

      // phase timings
      if (phase === 0 && elapsed > 1.15){
        phase = 1;
        fx.classList.add("mix");
      }
      if (phase === 1 && elapsed > 2.15){
        phase = 2;
        fx.classList.add("outline");
      }
      if (phase === 2 && elapsed > 3.25){
        phase = 3;
        // fade out fx
        fx.classList.remove("outline");
        fx.classList.remove("mix");
        fx.classList.remove("on");
        clear();
        return; // stop loop
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);

    function hexToRgba(hex, a){
      const c = hex.replace("#","");
      const n = parseInt(c,16);
      const r = (n>>16)&255;
      const g = (n>>8)&255;
      const b = n&255;
      return `rgba(${r},${g},${b},${a})`;
    }
  };

  // --- Boot ---
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    markActive();

    // Language buttons
    const current = detectLangFromPath();
    document.querySelectorAll("[data-lang]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === current);
      btn.addEventListener("click", () => switchLang(btn.dataset.lang));
    });

    // Theme button (optional)
    const themeBtn = $("#themeBtn");
    if (themeBtn){
      themeBtn.addEventListener("click", () => {
        const cur = document.documentElement.dataset.theme || "dark";
        applyTheme(cur === "dark" ? "dark" : "dark"); // 今は固定。必要なら light を後で実装
      });
    }

    homeFx();
  });
})();

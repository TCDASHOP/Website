(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  // ===== Base path safe for GitHub Pages subdir =====
  // 例: https://tcdashop.github.io/Website/ja/ → base "/Website"
  const parts = location.pathname.split("/").filter(Boolean);
  const base = (parts[0] && parts[0].toLowerCase() === "website") ? "/Website" : "";
  window.SCA_BASE = base;

  // ===== Active nav =====
  const markActive = () => {
    const p = location.pathname.replace(base, "");
    const seg = p.split("/").filter(Boolean);
    const file = (seg[1] || "index.html").toLowerCase();
    $$("[data-nav]").forEach(a => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      a.classList.toggle("active", href.endsWith(file));
    });
  };

  // ===== Language switch (folder based) =====
  const supported = ["ja","en","fr","es","ko","zh-hans"];
  const detectLang = () => {
    const p = location.pathname.replace(base, "");
    const seg = p.split("/").filter(Boolean);
    const maybe = seg[0] || "ja";
    return supported.includes(maybe) ? maybe : "ja";
  };

  const switchLang = (to) => {
    const p = location.pathname.replace(base, "");
    const seg = p.split("/").filter(Boolean);
    const file = seg[1] || "index.html";
    location.href = `${base}/${to}/${file}`;
  };

  const initLangButtons = () => {
    const cur = detectLang();
    $$("[data-lang]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === cur);
      btn.addEventListener("click", () => switchLang(btn.dataset.lang));
    });
  };

  // ===== Soft copy-protection (cannot be perfect) =====
  const protect = () => {
    if (!document.body.classList.contains("protect")) return;

    // block right-click on images
    document.addEventListener("contextmenu", (e) => {
      if (e.target && (e.target.tagName === "IMG" || e.target.closest("img"))) e.preventDefault();
    });

    // block dragging images
    document.addEventListener("dragstart", (e) => {
      if (e.target && e.target.tagName === "IMG") e.preventDefault();
    });

    // block common save/print shortcuts (soft)
    document.addEventListener("keydown", (e) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["s","p","u"].includes(k)) e.preventDefault();
    });
  };

  // ===== Home FX: “splash → mix → outline → complete” =====
  const homeFx = () => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    if (document.body.dataset.page !== "home") return;

    const fx = $(".homeFx");
    const cv = $("#fxCanvas");
    if (!fx || !cv) return;

    const ctx = cv.getContext("2d", { alpha:true });
    const DPR = Math.min(2, devicePixelRatio || 1);

    const resize = () => {
      cv.width = Math.floor(innerWidth * DPR);
      cv.height = Math.floor(innerHeight * DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);
    };
    resize();
    addEventListener("resize", resize, {passive:true});

    fx.classList.add("on");

    const colors = ["#7c3aed","#2563eb","#ef4444"];
    const rand = (a,b)=>a+Math.random()*(b-a);

    const splats = [];
    const burst = (x,y,n=40) => {
      for (let i=0;i<n;i++){
        const ang = rand(0, Math.PI*2);
        const spd = rand(2.0, 8.0);
        splats.push({
          x,y,
          vx: Math.cos(ang)*spd,
          vy: Math.sin(ang)*spd,
          r: rand(1.2, 5.6),
          life: rand(0.55, 1.35),
          max: 1,
          c: colors[(Math.random()*colors.length)|0],
          g: rand(0.08, 0.18),
          drip: Math.random() < 0.18
        });
      }
    };

    // center-ish bursts
    burst(innerWidth*0.46, innerHeight*0.46, 52);
    burst(innerWidth*0.52, innerHeight*0.40, 36);
    burst(innerWidth*0.42, innerHeight*0.54, 36);

    let t0 = performance.now();
    let last = t0;

    const hexToRgba = (hex, a) => {
      const c = hex.replace("#","");
      const n = parseInt(c,16);
      const r = (n>>16)&255, g=(n>>8)&255, b=n&255;
      return `rgba(${r},${g},${b},${a})`;
    };

    const tick = (now) => {
      const dt = Math.min(0.033, (now-last)/1000);
      last = now;

      ctx.clearRect(0,0,innerWidth,innerHeight);

      // phase timing
      const t = (now - t0)/1000;
      // 0-1.1 splash
      // 1.1-2.1 mix veil
      // 2.1-3.2 outline / morph
      // 3.2 end fade
      if (t < 1.15){
        ctx.globalCompositeOperation = "lighter";
        for (let i=splats.length-1;i>=0;i--){
          const p = splats[i];
          p.life -= dt;
          if (p.life <= 0){ splats.splice(i,1); continue; }
          p.vy += p.g*60*dt;
          p.x += p.vx;
          p.y += p.vy;
          if (p.drip){ p.vx *= 0.985; p.vy *= 0.995; }

          const a = Math.max(0, Math.min(1, p.life/p.max));
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(p.c, 0.55*a);
          ctx.arc(p.x, p.y, p.r*(0.7+(1-a)*0.9), 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }

      // morph trigger (scroll-independent; reliable)
      if (t > 2.15) document.body.classList.add("morphB");
      else document.body.classList.remove("morphB");

      // fade out
      if (t > 3.25){
        fx.classList.remove("on");
        ctx.clearRect(0,0,innerWidth,innerHeight);
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  // ===== Scroll “classification morph” (gentle) =====
  const scrollMorph = () => {
    const isHome = document.body.dataset.page === "home";
    if (!isHome) return;
    const onScroll = () => {
      // near top = A, after scroll = B
      const y = scrollY || 0;
      document.body.classList.toggle("morphB", y > 120);
    };
    addEventListener("scroll", onScroll, {passive:true});
    onScroll();
  };

  // ===== Idle decay =====
  const idleDecay = () => {
    let t;
    const set = () => {
      clearTimeout(t);
      document.body.classList.remove("idle");
      t = setTimeout(() => document.body.classList.add("idle"), 22000);
    };
    ["mousemove","keydown","scroll","touchstart"].forEach(ev => addEventListener(ev, set, {passive:true}));
    set();
  };

  // ===== Modal viewer =====
  const modal = () => {
    const m = $("#modal");
    if (!m) return;
    const img = $("#modalImg");
    const title = $("#modalTitle");

    const close = () => m.classList.remove("on");
    $("#modalClose")?.addEventListener("click", close);
    m.addEventListener("click", (e) => { if (e.target === m) close(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    window.SCA_OPEN = (src, name) => {
      if (img) img.src = src;
      if (title) title.textContent = name || "WORK";
      m.classList.add("on");
    };
  };

  document.addEventListener("DOMContentLoaded", () => {
    markActive();
    initLangButtons();
    protect();
    homeFx();
    scrollMorph();
    idleDecay();
    modal();
  });
})();

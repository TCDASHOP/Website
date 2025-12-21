(() => {
  // ================
  // Year
  // ================
  const y = document.getElementById("y");
  if (y) y.textContent = String(new Date().getFullYear());

  // ================
  // i18n (JP/EN tabs)
  // ================
  const I18N = {
    ja: {
      brandTitle: "SAIREN COLOR ARCHIVE",
      brandSub: "これは服になる前の思考だ。",
      hudPhaseK: "phase",
      hudCountK: "count",
      helpText: "クリック/タップで再スプラッシュ。<b>1</b>=TEXT / <b>2</b>=RINGS / <b>R</b>=RESET",
      metaMailK: "Contact",
      noJs: "JavaScript が必要です。"
    },
    en: {
      brandTitle: "SAIREN COLOR ARCHIVE",
      brandSub: "This is thought before it becomes clothing.",
      hudPhaseK: "phase",
      hudCountK: "count",
      helpText: "Tap/Click to re-splash. <b>1</b>=TEXT / <b>2</b>=RINGS / <b>R</b>=RESET",
      metaMailK: "Contact",
      noJs: "JavaScript is required."
    }
  };

  const LANG_KEY = "sca_lang";
  const langBtns = Array.from(document.querySelectorAll(".lang-btn"));

  function setLang(lang){
    const use = I18N[lang] ? lang : "ja";
    document.documentElement.lang = use;
    localStorage.setItem(LANG_KEY, use);

    langBtns.forEach(btn => {
      const on = btn.dataset.lang === use;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    const dict = I18N[use];
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const val = dict[key];
      if (val == null) return;

      // helpTextのみHTML許可（<b>など）
      if (key === "helpText") el.innerHTML = val;
      else el.textContent = val;
    });
  }

  const saved = localStorage.getItem(LANG_KEY);
  const browser = (navigator.language || "ja").toLowerCase().startsWith("en") ? "en" : "ja";
  setLang(saved || browser);

  langBtns.forEach(btn => btn.addEventListener("click", () => setLang(btn.dataset.lang)));

  // ================
  // Canvas FX
  // ================
  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d", { alpha: false });

  const $t = document.getElementById("t");
  const $phase = document.getElementById("phase");
  const $count = document.getElementById("count");

  let W=0, H=0, DPR=1;

  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const lerp  = (a,b,t) => a + (b-a)*t;
  const rand  = (a,b) => a + Math.random()*(b-a);

  function resize(){
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);
    canvas.width  = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
    buildTargets();
  }
  window.addEventListener("resize", resize, { passive:true });

  // Background (true black fixed)
  function clearBg(){
    ctx.fillStyle = "#050507";
    ctx.fillRect(0,0,W,H);
  }

  // Palette (color splashes)
  const PALETTE = [
    [255,  51,  92], // neon red-pink
    [255, 195,   0], // yellow
    [  0, 180, 255], // cyan
    [118, 255,   0], // green
    [171,  62, 255], // purple
    [255, 122,   0], // orange
    [255, 255, 255], // white highlights
  ];
  function pickColor(){
    const c = PALETTE[(Math.random()*PALETTE.length)|0];
    const j = () => (Math.random()*14 - 7);
    const r = clamp((c[0]+j())|0, 0, 255);
    const g = clamp((c[1]+j())|0, 0, 255);
    const b = clamp((c[2]+j())|0, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  // Target shapes (forms)
  let targetMode = "TEXT"; // TEXT | RINGS
  let targets = [];
  let targetShift = 0;

  const off = document.createElement("canvas");
  const offCtx = off.getContext("2d");

  function buildTargets(){
    targets = [];
    targetShift = 0;

    off.width = W;
    off.height = H;
    offCtx.clearRect(0,0,W,H);

    if (targetMode === "TEXT"){
      const base = Math.min(W,H);
      const f1 = Math.max(44, Math.floor(base * 0.12));
      const f2 = Math.max(16, Math.floor(base * 0.040));

      offCtx.fillStyle = "#fff";
      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";

      offCtx.font = `900 ${f1}px ui-monospace, system-ui, sans-serif`;
      offCtx.fillText("SAIREN", W*0.5, H*0.47);

      offCtx.globalAlpha = 0.92;
      offCtx.font = `800 ${f2}px ui-monospace, system-ui, sans-serif`;
      offCtx.fillText("COLOR ARCHIVE", W*0.5, H*0.57);
      offCtx.globalAlpha = 1;

      const img = offCtx.getImageData(0,0,W,H).data;
      const step = Math.max(4, Math.floor(base / 170));
      for (let y=0; y<H; y+=step){
        for (let x=0; x<W; x+=step){
          const i = (y*W + x)*4;
          if (img[i+3] > 40) targets.push({x,y});
        }
      }
    } else {
      const cx = W*0.5;
      const cy = H*0.52;
      const base = Math.min(W,H);
      const rings = [
        { r: base*0.14, n: 180 },
        { r: base*0.23, n: 260 },
        { r: base*0.32, n: 360 },
      ];
      for (const rg of rings){
        for (let i=0; i<rg.n; i++){
          const t = (i/rg.n) * Math.PI*2;
          targets.push({ x: cx + Math.cos(t)*rg.r, y: cy + Math.sin(t)*rg.r });
        }
      }
    }

    // shuffle
    for (let i=targets.length-1; i>0; i--){
      const j = (Math.random()*(i+1))|0;
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
  }

  // Particles
  const particles = [];
  const MAX = 6500;

  function splash(x,y, power=1){
    const count = Math.floor(1100 * power);
    for (let i=0; i<count && particles.length < MAX; i++){
      const ang = rand(-Math.PI, Math.PI);
      const spd = rand(2.2, 16.0) * power;
      const r   = rand(1.1, 5.8);
      const drip = Math.random() < 0.28;

      particles.push({
        x: x + rand(-8,8),
        y: y + rand(-8,8),
        vx: Math.cos(ang)*spd + rand(-1.3,1.3),
        vy: Math.sin(ang)*spd + rand(-1.3,1.3),
        r,
        col: pickColor(),
        a: rand(0.70, 1.0),
        drag: rand(0.90, 0.985),
        grav: drip ? rand(0.08, 0.18) : rand(0.02, 0.06),
        life: rand(220, 520),
        lock: Math.random() < 0.60
      });
    }
  }

  // Phases
  let time = 0;
  let phase = "SPLASH"; // SPLASH -> COALESCE -> FORM
  let crystallize = 0;

  function setPhase(p){
    phase = p;
    if ($phase) $phase.textContent = p;
  }

  function reset(){
    particles.length = 0;
    time = 0;
    crystallize = 0;
    targetShift = 0;
    setPhase("SPLASH");

    const cx = W*0.5, cy = H*0.5;
    splash(cx, cy, 1.0);
    splash(cx - W*0.18, cy + H*0.05, 0.75);
    splash(cx + W*0.18, cy - H*0.05, 0.75);
  }

  // Interaction
  function onPointer(e){
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX ?? (e.touches && e.touches[0].clientX) ?? W/2) - rect.left;
    const y = (e.clientY ?? (e.touches && e.touches[0].clientY) ?? H/2) - rect.top;
    splash(x,y, 0.95);
    crystallize = Math.max(0, crystallize - 0.12);
    if (phase !== "SPLASH") setPhase("COALESCE");
  }
  window.addEventListener("pointerdown", onPointer, { passive:true });
  window.addEventListener("touchstart",  onPointer, { passive:true });

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === "r") reset();
    if (k === "1"){ targetMode = "TEXT";  buildTargets(); setPhase("COALESCE"); }
    if (k === "2"){ targetMode = "RINGS"; buildTargets(); setPhase("COALESCE"); }
  });

  // Draw helpers
  function fade(alpha){
    ctx.fillStyle = `rgba(5,5,7,${alpha})`;
    ctx.fillRect(0,0,W,H);
  }

  function drawGrid(){
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = "#e9eef6";
    ctx.lineWidth = 1;

    const step = Math.max(70, Math.floor(Math.min(W,H)/10));
    ctx.beginPath();
    for (let x=0; x<=W; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,H); }
    for (let y=0; y<=H; y+=step){ ctx.moveTo(0,y); ctx.lineTo(W,y); }
    ctx.stroke();

    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.moveTo(W/2,0); ctx.lineTo(W/2,H);
    ctx.moveTo(0,H/2); ctx.lineTo(W,H/2);
    ctx.stroke();

    ctx.restore();
  }

  // Step + Draw
  function step(dt){
    time += dt;

    // Phase progression
    if (phase === "SPLASH" && time > 1.05) setPhase("COALESCE");
    if (phase === "COALESCE"){
      crystallize = clamp(crystallize + dt*0.10, 0, 0.75);
      if (crystallize > 0.70) setPhase("FORM");
    } else if (phase === "FORM"){
      crystallize = clamp(crystallize + dt*0.12, 0, 1);
    }

    // micro new splashes at very beginning
    if (time < 0.9 && particles.length < MAX){
      const cx=W*0.5, cy=H*0.5;
      splash(cx + rand(-120,120), cy + rand(-70,70), 0.10);
    }

    const attract = 0.9 + crystallize*4.6;
    const willingBase = crystallize;

    // update particles
    for (let i=particles.length-1; i>=0; i--){
      const p = particles[i];

      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.grav;

      // small turbulence
      p.vx += Math.sin((p.x + time*90)*0.002) * 0.02;
      p.vy += Math.cos((p.y + time*70)*0.002) * 0.02;

      // attract to target
      if (targets.length){
        const idx = (targetShift + i) % targets.length;
        const tg = targets[idx];

        const willing = lerp(0.10, 1.0, willingBase) * (p.lock ? 1 : 0.65);
        const dx = tg.x - p.x;
        const dy = tg.y - p.y;
        const dist = Math.hypot(dx,dy) + 0.0001;

        const pull = (attract * willing) / (1 + dist*0.02);
        p.vx += (dx/dist) * pull;
        p.vy += (dy/dist) * pull;

        // settle when close
        if (dist < 10){ p.vx *= 0.82; p.vy *= 0.82; }
      }

      p.x += p.vx;
      p.y += p.vy;

      // bounds
      if (p.x < -40 || p.x > W+40 || p.y < -40 || p.y > H+70){
        p.vx *= 0.6; p.vy *= 0.6;
        p.x = clamp(p.x, -20, W+20);
        p.y = clamp(p.y, -20, H+40);
      }

      p.life -= 1;
      if (p.life <= 0) particles.splice(i,1);
    }

    // shift targets slowly (gives "forming" motion)
    if (phase !== "SPLASH"){
      targetShift = (targetShift + Math.floor(1 + crystallize*10)) % Math.max(1, targets.length);
    }

    if ($t) $t.textContent = `${time.toFixed(2)}s`;
    if ($count) $count.textContent = String(particles.length);
  }

  function draw(){
    // Black fixed base + trail
    fade(0.10 + crystallize*0.06);

    if (crystallize > 0.22) drawGrid();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let i=0; i<particles.length; i++){
      const p = particles[i];

      const sp = Math.hypot(p.vx,p.vy);
      const stretch = clamp(sp*0.55, 0, 10);
      const ang = Math.atan2(p.vy,p.vx);

      ctx.globalAlpha = clamp(p.a * (0.32 + crystallize*0.85), 0, 1);
      ctx.fillStyle = p.col;

      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(ang);

      // main splash blob
      ctx.beginPath();
      ctx.ellipse(0,0, p.r + stretch, p.r, 0, 0, Math.PI*2);
      ctx.fill();

      // droplets
      if (sp > 4.2 && Math.random() < 0.08){
        ctx.globalAlpha *= 0.7;
        ctx.beginPath();
        const n = 3 + ((Math.random()*4)|0);
        for (let k=0; k<n; k++){
          const ox = rand(-18,18);
          const oy = rand(-12,12);
          const rr = rand(0.8,2.2);
          ctx.moveTo(ox+rr, oy);
          ctx.arc(ox,oy,rr,0,Math.PI*2);
        }
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Loop
  let last = performance.now();
  function loop(now){
    const dt = clamp((now-last)/1000, 0, 0.033);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Start
  resize();
  clearBg();
  buildTargets();
  reset();
  requestAnimationFrame(loop);
})();

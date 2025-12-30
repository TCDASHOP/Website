/*!
 * SAIREN SPACE×MATH MATRIX (FULL SITE V1)
 * - deep space gradient is in CSS
 * - math symbol rain + starfield on canvas
 * - geometry overlay (svg)
 * - subtle page intro + link transition boost
 * - short scramble then settle for short labels (headers/cards/menu)
 */
(() => {
  "use strict";

  const CFG = {
    glyphs: "01∑∫πφ√⊗⊕ΔλΩψμν∞≈≠≤≥→↘︎⋯:.,",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    fontSize: 15,
    fade: 0.08,
    speedMin: 45,
    speedMax: 115,
    starCount: 120,
    introBoostMs: 650,
    transitionBoostMs: 520,
    transitionDelayMs: 380,
    scrambleMs: 420,
    maxScrambleChars: 64,
    neonA: [124,255,215],
    neonB: [120,180,255],
  };

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const now = ()=>performance.now();
  const rand = (a,b)=>a+Math.random()*(b-a);
  const pick = (s)=>s[Math.floor(Math.random()*s.length)];

  function injectLayers(){
    if(!document.getElementById("sairen-matrix-canvas")){
      const c = document.createElement("canvas");
      c.id = "sairen-matrix-canvas";
      c.setAttribute("aria-hidden","true");
      document.body.prepend(c);
    }
    if(!document.getElementById("sairen-geometry-overlay")){
      const d = document.createElement("div");
      d.id = "sairen-geometry-overlay";
      d.setAttribute("aria-hidden","true");
      d.style.backgroundImage = "url('/assets/images/ui/geometry-overlay.svg')";
      d.style.backgroundSize = "cover";
      d.style.backgroundPosition = "center";
      d.style.backgroundRepeat = "no-repeat";
      document.body.prepend(d);
    }
  }

  function scrambleTargets(){
    const sels = [
      ".brand-text",
      ".hero h1",
      ".tile-title",
      ".tile-hint",
      ".page-title",
      ".drawer a span:first-child"
    ];
    document.querySelectorAll(sels.join(",")).forEach(el=>{
      const raw = (el.textContent||"").trim();
      if(!raw) return;
      if(raw.length > CFG.maxScrambleChars) return;
      const end = now() + CFG.scrambleMs;
      const orig = raw;

      const step = ()=>{
        const t = now();
        const p = clamp(1 - (end - t) / CFG.scrambleMs, 0, 1);
        const keep = Math.floor(orig.length * p);
        let out = "";
        for(let i=0;i<orig.length;i++){
          out += (i<keep) ? orig[i] : pick(CFG.glyphs);
        }
        el.textContent = out;
        if(t < end) requestAnimationFrame(step);
        else el.textContent = orig;
      };
      requestAnimationFrame(step);
    });
  }

  function bindInternalTransitions(setBoost){
    document.addEventListener("click",(e)=>{
      const a = e.target.closest("a");
      if(!a) return;
      if(a.target === "_blank") return;
      if(!a.href) return;
      let u;
      try{ u = new URL(a.href, location.href); }catch{ return; }
      if(u.origin !== location.origin) return;
      if(u.pathname === location.pathname && u.hash) return;

      e.preventDefault();
      setBoost(CFG.transitionBoostMs);
      document.body.classList.add("sairen-transitioning");
      setTimeout(()=>location.href = a.href, CFG.transitionDelayMs);
    }, {capture:true});
  }

  function start(){
    injectLayers();
    const canvas = document.getElementById("sairen-matrix-canvas");
    const ctx = canvas.getContext("2d", {alpha:true});

    let w=0,h=0,dpr=1, stars=[], cols=[];

    function resize(){
      dpr = Math.max(1, window.devicePixelRatio||1);
      w = Math.floor(innerWidth);
      h = Math.floor(innerHeight);
      canvas.width = Math.floor(w*dpr);
      canvas.height = Math.floor(h*dpr);
      canvas.style.width = w+"px";
      canvas.style.height = h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);

      stars = Array.from({length:CFG.starCount}).map(()=>({
        x: Math.random()*w, y: Math.random()*h,
        r: rand(0.6,1.8), v: rand(0.02,0.09), a: rand(0.15,0.55)
      }));

      const count = Math.floor(w / CFG.fontSize);
      cols = Array.from({length:count}).map(()=>({
        y: rand(-900,0),
        speed: rand(CFG.speedMin, CFG.speedMax),
        phase: Math.random()*Math.PI*2
      }));
    
      rebuildTextMasks();
}
    resize();
    addEventListener("resize", resize);

    let boostUntil = 0;
    const setBoost = (ms)=>{ boostUntil = Math.max(boostUntil, now()+ms); };

    // intro
    setBoost(CFG.introBoostMs);
    scrambleTargets();
    bindInternalTransitions(setBoost);

    // re-scramble after i18n apply
    document.addEventListener("sairen:i18n-applied", ()=>scrambleTargets());

    let last = now();
    const startTime = last;
    function draw(t){
      const dt = Math.min(0.05, (t-last)/1000);
      last = t;

      // fade
      ctx.fillStyle = `rgba(5,6,11,${CFG.fade})`;
      ctx.fillRect(0,0,w,h);

      // stars
      for(const s of stars){
        s.y += s.v*(dt*60);
        if(s.y > h+4){ s.y=-4; s.x=Math.random()*w; }
        ctx.fillStyle = `rgba(255,255,255,${s.a})`;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      }

      const boost = (t < boostUntil) ? 1.65 : 1.0;

      // rain
      ctx.font = `${CFG.fontSize}px ${CFG.fontFamily}`;
      const colW = CFG.fontSize;
      for(let i=0;i<cols.length;i++){
        const c = cols[i];
        c.y += c.speed*dt*boost;
        if(c.y > h+200){
          c.y = rand(-900,-100);
          c.speed = rand(CFG.speedMin, CFG.speedMax);
          c.phase = Math.random()*Math.PI*2;
        }

        const x = i*colW;
        const mix = (Math.sin(c.phase + t*0.001)+1)/2;
        const r = Math.floor(CFG.neonA[0]*mix + CFG.neonB[0]*(1-mix));
        const g = Math.floor(CFG.neonA[1]*mix + CFG.neonB[1]*(1-mix));
        const b = Math.floor(CFG.neonA[2]*mix + CFG.neonB[2]*(1-mix));
        const alpha = 0.40*boost;

        for(let k=0;k<18;k++){
        const y = c.y - k * (fontSize * 1.4);

        // Reveal timing: line1 then line2
        const tSec = (t - startTime) / 1000;
        const r1 = smooth01((tSec - TEXT_MASK.reveal1Delay) / TEXT_MASK.revealDur);
        const r2 = smooth01((tSec - TEXT_MASK.reveal2Delay) / TEXT_MASK.revealDur);

        // Periodic dissolve/rebuild (subtle "collapse/restore")
        const cyc = tSec % TEXT_MASK.cycle;
        let morph = 1;
        if(cyc < TEXT_MASK.dissolve){
          morph = 1 - smooth01(cyc / TEXT_MASK.dissolve);
        }else if(cyc < TEXT_MASK.dissolve*2){
          morph = smooth01((cyc - TEXT_MASK.dissolve) / TEXT_MASK.dissolve);
        }

        // Transition boost (click / navigation)
        const boostPulse = t < boostUntil ? clamp01((boostUntil - t) / CFG.transitionBoostMs) : 0;
        morph = clamp01(morph + boostPulse * 0.35);

        const mx = c.x + fontSize * 0.15;
        const my = y;

        const a1 = maskAlphaAt(mask1, mx, my) * r1;
        const a2 = maskAlphaAt(mask2, mx, my) * r2;
        const mAlpha = Math.max(a1, a2) / 255;
        const maskStrength = clamp01(mAlpha) * morph;

        const trail = Math.max(0, 1 - k * 0.085);
        const baseA = 0.08 * boost * trail;
        const inA   = 0.55 * boost * trail * (0.25 + 0.75 * maskStrength);
        const a = baseA + inA;

        if(a <= 0.003) continue;

        const ch = glyphs[(Math.random() * glyphs.length) | 0];
        const hue = 185 + c.phase * 25;

        let r = Math.round(170 + 70*Math.sin((hue+0)*0.05));
        let g = Math.round(210 + 45*Math.sin((hue+40)*0.05));
        let b = Math.round(255);

        // Slight brighten inside the mask to make letters readable, but still "in" the rain
        const br = 0.35 * maskStrength;
        r = Math.round(r + (235 - r) * br);
        g = Math.round(g + (255 - g) * br);
        b = Math.round(b + (255 - b) * br);

        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fillText(ch, c.x, y);
      }
      }

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

    // --- Text mask: rain particles form the tagline (no separate overlay text) ---
    const TEXT_MASK = {
      line1: "Color arrives before words.",
      line2: "An archive of works and the trail of creation.",
      // Position roughly where the old hero copy lived (responsive)
      anchorX: 0.08,      // left padding as % of width
      anchorY: 0.56,      // top position as % of height
      lineGap: 0.018,     // gap ratio vs min(w,h)
      reveal1Delay: 0.25, // seconds
      reveal2Delay: 0.95, // seconds
      revealDur: 0.85,    // seconds per line
      cycle: 12.0,        // seconds between dissolve/rebuild cycles
      dissolve: 0.9       // seconds dissolve + rebuild
    };

    let mask1=null, mask2=null, maskW=0, maskH=0;
    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");

    function clamp01(v){ return v<0?0:(v>1?1:v); }
    function smooth01(t){ t=clamp01(t); return t*t*(3-2*t); }

    function rebuildTextMasks(){
      if(!maskCtx || !w || !h) return;
      maskW = w; maskH = h;
      maskCanvas.width = maskW;
      maskCanvas.height = maskH;

      const padX = Math.round(maskW * TEXT_MASK.anchorX);
      const topY = Math.round(maskH * TEXT_MASK.anchorY);

      const base = Math.min(maskW, maskH);
      const font1 = Math.max(28, Math.round(base * 0.085));
      const font2 = Math.max(14, Math.round(base * 0.028));
      const gap  = Math.max(10, Math.round(base * TEXT_MASK.lineGap));

      // line 1
      maskCtx.clearRect(0,0,maskW,maskH);
      maskCtx.fillStyle = "#fff";
      maskCtx.textBaseline = "top";
      maskCtx.font = `800 ${font1}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
      maskCtx.fillText(TEXT_MASK.line1, padX, topY);
      mask1 = maskCtx.getImageData(0,0,maskW,maskH).data;

      // line 2
      maskCtx.clearRect(0,0,maskW,maskH);
      maskCtx.fillStyle = "#fff";
      maskCtx.textBaseline = "top";
      maskCtx.font = `500 ${font2}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
      maskCtx.fillText(TEXT_MASK.line2, padX, topY + font1 + gap);
      mask2 = maskCtx.getImageData(0,0,maskW,maskH).data;
    }

    function maskAlphaAt(maskData, x, y){
      if(!maskData) return 0;
      const ix = x|0, iy = y|0;
      if(ix<0 || iy<0 || ix>=maskW || iy>=maskH) return 0;
      return maskData[(iy*maskW + ix)*4 + 3] || 0;
    }

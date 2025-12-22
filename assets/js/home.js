(function(){
  const prefersReduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.querySelector(".hero");
  const canvas = document.getElementById("paint");
  const skipBtn = document.getElementById("skipAnim");
  if(!hero || !canvas) return;

  const ctx = canvas.getContext("2d");
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  function resize(){
    const r = hero.getBoundingClientRect();
    canvas.width = Math.floor(r.width * DPR);
    canvas.height = Math.floor(r.height * DPR);
    canvas.style.width = r.width + "px";
    canvas.style.height = r.height + "px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize();
  window.addEventListener("resize", resize);

  // Paint palette: purple blue red
  const P = [
    {c:[124,58,237], a:0.92},
    {c:[37,99,235], a:0.88},
    {c:[239,68,68], a:0.86},
  ];

  function rgba(p, aMul=1){
    const [r,g,b]=p.c;
    return `rgba(${r},${g},${b},${p.a*aMul})`;
  }

  // Utility
  const rand = (a,b)=> a + Math.random()*(b-a);
  const clamp=(v,a,b)=> Math.max(a, Math.min(b,v));

  let running = true;
  let t0 = performance.now();
  let splats = [];
  let drips = [];

  // Create splats
  function makeSplat(){
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const x = rand(w*0.12, w*0.88);
    const y = rand(h*0.18, h*0.72);
    const p = P[Math.floor(rand(0,P.length))];
    const r = rand(26, 120);
    const sp = rand(0.4, 1.05);
    return {x,y,r,p,sp,life:0};
  }

  function makeDrip(color){
    const w = canvas.clientWidth;
    const x = rand(w*0.12, w*0.88);
    return {x, y: -30, vy: rand(2.2, 4.6), w: rand(6, 14), h: rand(40, 110), p:color};
  }

  function drawBlob(x,y,r,color){
    ctx.beginPath();
    ctx.fillStyle = color;
    // main circle
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
    // droplets
    const n = Math.floor(rand(6, 18));
    for(let i=0;i<n;i++){
      const a = rand(0, Math.PI*2);
      const rr = r*rand(0.12,0.32);
      const d = r*rand(0.82,1.35);
      const dx = Math.cos(a)*d;
      const dy = Math.sin(a)*d;
      ctx.beginPath();
      ctx.arc(x+dx, y+dy, rr, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function clear(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  function vignette(){
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const g = ctx.createRadialGradient(w*0.5, h*0.65, 10, w*0.5, h*0.55, Math.max(w,h)*0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);
  }

  function step(now){
    if(!running) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const t = (now - t0)/1000;

    clear();

    // 0.0 - 0.9 : splat
    // 0.6 - 1.6 : drip
    // 1.2 - 2.2 : mix (blur-ish)
    // 1.8 - 2.6 : outline reveal (handled by CSS class)
    // >2.6 : settle

    // Add splats early
    if(t < 1.1 && splats.length < 14 && Math.random() < 0.35){
      splats.push(makeSplat());
    }

    // Drips
    if(t > 0.55 && t < 1.55 && drips.length < 10 && Math.random() < 0.25){
      drips.push(makeDrip(P[Math.floor(rand(0,P.length))]));
    }

    // Draw splats
    splats.forEach(s=>{
      s.life += 0.016;
      const grow = 1 + Math.min(0.6, s.life*s.sp*0.9);
      const alpha = clamp(1 - (t-0.95)*0.35, 0.35, 1);
      drawBlob(s.x, s.y, s.r*grow, rgba(s.p, alpha));
    });

    // Draw drips
    drips.forEach(d=>{
      d.y += d.vy;
      ctx.fillStyle = rgba(d.p, 0.65);
      ctx.beginPath();
      ctx.roundRect(d.x, d.y, d.w, d.h, d.w/2);
      ctx.fill();
      // trailing
      ctx.fillStyle = rgba(d.p, 0.25);
      ctx.beginPath();
      ctx.roundRect(d.x-2, d.y-12, d.w+4, d.h+22, d.w/2);
      ctx.fill();
      d.h += 0.18;
    });

    // Mix phase: simulate wet blending using globalCompositeOperation + blur-ish pass
    if(t > 1.2){
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clamp((t-1.2)/1.1, 0, 0.55);
      // glow pass
      ctx.filter = "blur(14px)";
      ctx.drawImage(canvas, 0, 0, canvas.width/DPR, canvas.height/DPR);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = clamp((t-1.35)/1.0, 0, 0.35);
      ctx.filter = "blur(22px)";
      ctx.drawImage(canvas, 0, 0, canvas.width/DPR, canvas.height/DPR);
      ctx.restore();
    }

    vignette();

    // Outline trigger
    if(t > 1.85 && !hero.classList.contains("ready")){
      hero.classList.add("ready");
    }

    // Settle + stop
    if(t > 2.9){
      running = false;
    }else{
      requestAnimationFrame(step);
    }
  }

  function start(){
    if(prefersReduce){
      hero.classList.add("ready");
      return;
    }
    // lock scroll for the hero phase only
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const unlock = ()=>{ document.body.style.overflow = prev || ""; };

    const stop = ()=>{
      running = false;
      unlock();
      hero.classList.add("ready");
      ctx.clearRect(0,0,canvas.width,canvas.height);
    };

    skipBtn?.addEventListener("click", stop, {once:true});
    // click on hero to skip too
    hero.addEventListener("click", stop, {once:true});

    requestAnimationFrame(step);

    // unlock after animation ends even if user doesn't click
    setTimeout(unlock, 3200);
  }

  start();
})();

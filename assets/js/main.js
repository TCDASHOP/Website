(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  $$("[data-jump]").forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (href.startsWith("#")) {
        e.preventDefault();
        const target = $(href);
        if (target) target.scrollIntoView({behavior:"smooth", block:"start"});
      }
    });
  });

  // ===== 背景“色場” =====
  const canvas = $("#field");
  const ctx = canvas?.getContext?.("2d");
  let W=0,H=0, DPR=1;
  let mx=0.5,my=0.35, t0=performance.now();

  function resize(){
    if(!canvas || !ctx) return;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.width  = Math.floor(innerWidth * DPR);
    H = canvas.height = Math.floor(innerHeight * DPR);
    canvas.style.width = innerWidth+"px";
    canvas.style.height = innerHeight+"px";
  }
  function lerp(a,b,k){ return a + (b-a)*k; }

  function paintBlob(o, rgb, alpha){
    const g = ctx.createRadialGradient(o.x,o.y, 0, o.x,o.y, o.r);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);
  }

  function draw(now){
    if(!canvas || !ctx) return;
    const t = (now - t0) / 1000;

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "#07070a";
    ctx.fillRect(0,0,W,H);

    const gx = mx*W, gy = my*H;
    const a = {x: lerp(W*0.15, gx, 0.35) + Math.sin(t*0.7)*W*0.04, y: lerp(H*0.20, gy, 0.25) + Math.cos(t*0.9)*H*0.05, r: Math.min(W,H)*0.55};
    const b = {x: lerp(W*0.80, gx, 0.30) + Math.cos(t*0.6)*W*0.05, y: lerp(H*0.35, gy, 0.35) + Math.sin(t*0.8)*H*0.04, r: Math.min(W,H)*0.55};
    const c = {x: lerp(W*0.50, gx, 0.40) + Math.sin(t*0.5)*W*0.03, y: lerp(H*0.85, gy, 0.25) + Math.cos(t*0.7)*H*0.03, r: Math.min(W,H)*0.62};

    paintBlob(a, [255,60,170], 0.14);
    paintBlob(b, [60,220,255], 0.10);
    paintBlob(c, [255,170,60], 0.08);
    paintBlob({x:gx,y:gy,r:Math.min(W,H)*0.28}, [120,255,120], 0.08);

    requestAnimationFrame(draw);
  }

  function onMove(x,y){
    mx = x / innerWidth;
    my = y / innerHeight;
  }

  if(canvas && ctx){
    resize();
    addEventListener("resize", resize, {passive:true});
    addEventListener("mousemove", (e)=>onMove(e.clientX,e.clientY), {passive:true});
    addEventListener("touchmove", (e)=>{
      const p = e.touches?.[0];
      if(p) onMove(p.clientX,p.clientY);
    }, {passive:true});
    requestAnimationFrame(draw);
  }

  // ===== テレメトリ =====
  const tX = $("#tX"), tY = $("#tY"), tT = $("#tT");
  let start = performance.now();
  function tick(){
    const now = performance.now();
    const sec = (now-start)/1000;
    if(tT) tT.textContent = sec.toFixed(2)+"s";
    if(tX) tX.textContent = (mx*100).toFixed(2);
    if(tY) tY.textContent = (my*100).toFixed(2);
    requestAnimationFrame(tick);
  }
  if(tT || tX || tY) requestAnimationFrame(tick);

  // ===== 1) スクロールで分類名に変異 =====
  const morphTitle = $("#morphTitle");
  const marks = $$(".morphMark");
  const words = morphTitle?.dataset?.words?.split("|") || [];
  if (morphTitle && marks.length && words.length){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(ent=>{
        if(ent.isIntersecting){
          const w = ent.target.getAttribute("data-word");
          morphTo(w);
        }
      });
    }, {threshold: 0.55});

    marks.forEach((m,i)=>{
      m.setAttribute("data-word", words[i] || "構造。");
      io.observe(m);
    });

    let lock = false;
    function morphTo(next){
      if(lock || !next) return;
      lock = true;
      morphTitle.textContent = scrambleText(next);
      setTimeout(()=>{
        morphTitle.textContent = next;
        lock = false;
      }, 260);
    }
    function scrambleText(t){
      const chars = "█▓▒░<>/\\|—_";
      return t.split("").map((ch)=> (Math.random()>.55 ? chars[(Math.random()*chars.length)|0] : ch)).join("");
    }
  }

  // ===== 2) カード近接で色場反応 =====
  const grid = $("#worksGrid");
  function bindCardReact(){
    $$(".card").forEach(card=>{
      const set = (x,y)=>{
        const r = card.getBoundingClientRect();
        const mx2 = ((x - r.left) / r.width) * 100;
        const my2 = ((y - r.top) / r.height) * 100;
        card.style.setProperty("--mx", mx2+"%");
        card.style.setProperty("--my", my2+"%");
        onMove(x,y);
      };
      card.addEventListener("mousemove", (e)=>set(e.clientX,e.clientY), {passive:true});
      card.addEventListener("touchmove", (e)=>{
        const p = e.touches?.[0];
        if(p) set(p.clientX,p.clientY);
      }, {passive:true});
    });
  }

  // ===== 作品データ読み込み =====
  async function loadWorks(){
    if(!grid) return;
    try{
      const res = await fetch("./assets/data/works.json", {cache:"no-store"});
      const data = await res.json();
      renderWorks(data);
      bindCardReact();
    }catch(e){
      grid.innerHTML = `<div class="muted" style="grid-column:span 12; padding:14px 0;">works.json が見つからない / 形式が違う可能性があります。</div>`;
    }
  }
  function esc(s=""){ return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

  function renderWorks(items){
    const html = items.map((it, idx)=>{
      const n = String(it.id ?? idx+1).padStart(2,"0");
      const href = `./work.html?id=${encodeURIComponent(it.id ?? n)}`;
      const thumb = it.thumb || "";
      const cat = it.category || "artifact";
      const tags = (it.tags || []).slice(0,4).map(t=>`#${t}`).join(" ");
      const desc = it.oneLiner || "image pending";

      return `
      <a class="card" href="${href}" aria-label="${esc(it.title || "Work")}">
        <img class="card__img" src="${esc(thumb)}" alt="" loading="lazy" draggable="false"
             onerror="this.style.opacity=.2; this.style.filter='grayscale(1)';" />
        <div class="card__veil" aria-hidden="true"></div>
        <div class="card__body">
          <div class="card__kicker">${esc(cat.toUpperCase())} ${n}</div>
          <div class="card__title">${esc(it.title || "Untitled")}</div>
          <p class="card__desc">${esc(desc)}</p>
          <div class="card__tags">${esc(tags)}</div>
        </div>
      </a>`;
    }).join("");
    grid.innerHTML = html;
  }

  loadWorks();

  // ===== work.html 初期化（時間軸）=====
  async function initWorkPage(){
    const img = $("#workImg");
    const title = $("#workTitle");
    if(!img || !title) return;

    const params = new URLSearchParams(location.search);
    const id = params.get("id");

    const res = await fetch("./assets/data/works.json", {cache:"no-store"});
    const items = await res.json();
    const idx = Math.max(0, items.findIndex(x => String(x.id) === String(id)));
    const item = items[idx] || items[0];

    title.textContent = item.title || "Untitled";
    img.src = item.full || item.thumb || "";
    img.alt = item.title || "";

    const meta = $("#workMeta");
    const text = $("#workText");
    if(meta){
      meta.innerHTML = `
        <div>category : <b>${esc(item.category || "artifact")}</b></div>
        <div>year     : <b>${esc(item.year || "—")}</b></div>
        <div>id       : <b>${esc(item.id || "—")}</b></div>
      `;
    }
    if(text){
      const lines = [item.statement || "これは服になる前の思考だ。", item.caption || ""].filter(Boolean);
      text.innerHTML = lines.map(l=>`<p>${esc(l)}</p>`).join("");
    }

    const prev = $("#prevBtn");
    const next = $("#nextBtn");
    const prevItem = items[(idx - 1 + items.length) % items.length];
    const nextItem = items[(idx + 1) % items.length];
    if(prev) prev.href = `./work.html?id=${encodeURIComponent(prevItem.id)}`;
    if(next) next.href = `./work.html?id=${encodeURIComponent(nextItem.id)}`;

    const ticks = $("#ticks");
    if(ticks) ticks.innerHTML = [0, .25, .5, .75, 1].map(v=>`<span>${v.toFixed(2)}</span>`).join("");

    const label = $("#timelineLabel");
    const onScroll = ()=>{
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const p = scrollY / max;
      const tt = p * 9.99;
      if(label) label.textContent = `t = ${tt.toFixed(2)}`;
      onMove(innerWidth*(0.2+0.6*p), innerHeight*(0.25+0.5*(1-p)));
    };
    addEventListener("scroll", onScroll, {passive:true});
    onScroll();
  }
  initWorkPage();

  // ===== 3) 放置でUI崩壊 =====
  let idleTimer = null;
  const IDLE_MS = 24000;
  const wake = ()=>{
    document.body.classList.remove("decay");
    if(idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(()=>document.body.classList.add("decay"), IDLE_MS);
  };
  ["mousemove","mousedown","keydown","touchstart","touchmove","scroll"].forEach(ev=>{
    addEventListener(ev, wake, {passive:true});
  });
  wake();

  // ===== コピー抑止（右クリック/コピー/ドラッグ/一部ショートカット）=====
  const toast = $("#toast");
  let toastTimer = null;
  const showToast = (msg)=>{
    if(!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>toast.classList.remove("show"), 1200);
  };

  addEventListener("contextmenu", (e)=>{ e.preventDefault(); showToast("copy disabled"); });
  addEventListener("copy", (e)=>{ e.preventDefault(); showToast("copy disabled"); });
  addEventListener("cut", (e)=>{ e.preventDefault(); showToast("copy disabled"); });
  addEventListener("dragstart", (e)=>{ e.preventDefault(); showToast("drag disabled"); });

  addEventListener("keydown", (e)=>{
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["c","x","s","p","u","a"].includes(k)) {
      e.preventDefault();
      showToast("shortcut blocked");
    }
  });
})();

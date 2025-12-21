/* SAIREN COLOR ARCHIVE - main.js */

const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];

/* -------------------------
   1) コピー抑止（完全防止ではなく“抑止”）
   ※本気の人はスクショ等で取れる。Webの仕様上、完全防止は不可能。
------------------------- */
function softProtect() {
  document.addEventListener("contextmenu", (e) => e.preventDefault(), { passive:false });
  document.addEventListener("dragstart", (e) => e.preventDefault(), { passive:false });
  document.addEventListener("selectstart", (e) => e.preventDefault(), { passive:false });

  // iOS長押し抑止（完全ではない）
  document.addEventListener("touchstart", () => {}, { passive:true });
}

/* -------------------------
   2) HUD (x,y,t)
------------------------- */
function hud() {
  const mx = $("#mx"), my = $("#my"), mt = $("#mt");
  const start = performance.now();

  window.addEventListener("pointermove", (e) => {
    if (!mx || !my) return;
    const x = (e.clientX / window.innerWidth) * 1.0;
    const y = (e.clientY / window.innerHeight) * 1.0;
    mx.textContent = x.toFixed(2);
    my.textContent = y.toFixed(2);
  }, { passive:true });

  function loop(now){
    if (mt) mt.textContent = ((now - start)/1000).toFixed(2) + "s";
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* -------------------------
   3) HERO: スクロールで分類名に変異
      構造。→ アーティファクト → フィールドノート
------------------------- */
function scrambleTo(el, nextText, ms=520) {
  const chars = "░▒▓/\\|—_+*<>[]{}()01";
  const from = el.textContent;
  const max = Math.max(from.length, nextText.length);
  const start = performance.now();

  function frame(now){
    const t = Math.min(1, (now - start)/ms);
    const reveal = Math.floor(t * max);

    let out = "";
    for (let i=0; i<max; i++){
      const done = i < reveal;
      const target = nextText[i] || "";
      out += done ? target : chars[Math.floor(Math.random()*chars.length)];
    }
    el.textContent = out;

    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = nextText;
  }
  requestAnimationFrame(frame);
}

function morphLabel() {
  const label = $("#morphLabel");
  const sub = $("#morphSub");
  if (!label) return;

  const states = [
    { at: 0.00, label: "構造。", sub: "This is thought before it becomes clothing." },
    { at: 0.33, label: "アーティファクト。", sub: "Artifacts: archived visual logic." },
    { at: 0.66, label: "フィールドノート。", sub: "Field notes: instability captured." }
  ];

  let current = label.textContent;

  function onScroll(){
    const y = window.scrollY;
    const h = Math.max(1, document.body.scrollHeight - window.innerHeight);
    const p = y / h;

    const s = (p < states[1].at) ? states[0]
            : (p < states[2].at) ? states[1]
            : states[2];

    if (s.label !== current) {
      current = s.label;
      scrambleTo(label, s.label);
      if (sub) sub.textContent = s.sub;
    }

    // 微細な“動き”を常に入れる（トップ文字が生きる）
    const wobble = (Math.sin(p * Math.PI * 2) * 1.2);
    label.style.transform = `translateY(${wobble}px)`;
  }

  window.addEventListener("scroll", onScroll, { passive:true });
  onScroll();
}

/* -------------------------
   4) 背景：作品カードに近づくと色場が反応
------------------------- */
function setAccent(hex){
  document.documentElement.style.setProperty("--accent", hex);
}

async function loadWorksIntoGrid() {
  const grid = $("#worksGrid");
  if (!grid) return;

  try{
    const res = await fetch("/assets/data/works.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("works.json not found");
    const data = await res.json();
    const works = data.works || [];

    grid.innerHTML = works.map(w => {
      const badge = `${(w.category||"node").toUpperCase()} ${w.id} / ${w.year||""}`;
      const href = `/work.html?id=${encodeURIComponent(w.id)}`;
      const accent = w.accent || "#7b5cff";
      return `
        <a class="card" href="${href}" data-accent="${accent}">
          <img class="thumb" src="${w.image}" alt="${w.title}" loading="lazy" draggable="false">
          <div class="card__body">
            <div class="card__line">
              <span class="badge">${badge}</span>
              <span class="badge">NODE</span>
            </div>
            <h3 class="card__title">${w.title}</h3>
            <p class="card__caption">${w.caption || ""}</p>
          </div>
        </a>
      `;
    }).join("");

    // hover / proximity reaction
    $$(".card", grid).forEach(card => {
      card.addEventListener("pointerenter", () => {
        const hex = card.getAttribute("data-accent") || "#7b5cff";
        setAccent(hex);
        window.__FIELD && window.__FIELD.pulse(0.9);
      }, { passive:true });

      card.addEventListener("pointermove", () => {
        window.__FIELD && window.__FIELD.pulse(0.25);
      }, { passive:true });
    });

  } catch(e){
    grid.innerHTML = `<p style="color:rgba(255,255,255,.65)">works.json が読み込めていません（パス確認）。</p>`;
  }
}

/* -------------------------
   5) work.html：IDで個別ページ表示 + 時間軸演出
------------------------- */
function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

async function renderWorkPage(){
  const img = $("#workImg");
  const title = $("#workTitle");
  if (!img || !title) return; // index側

  const id = getParam("id") || "01";

  const res = await fetch("/assets/data/works.json", { cache: "no-cache" });
  const data = await res.json();
  const w = (data.works || []).find(x => String(x.id) === String(id));

  if (!w){
    title.textContent = "Not found";
    return;
  }

  document.title = `${w.title}｜SAIREN COLOR ARCHIVE`;
  setAccent(w.accent || "#7b5cff");

  img.src = w.image;
  img.alt = w.title;

  $("#workPill").textContent = `${(w.category||"node").toUpperCase()} ${w.id} / ${w.year||""}`;
  title.textContent = w.title;
  $("#workDesc").textContent = w.desc || "";

  const meta = $("#workMeta");
  meta.innerHTML = `
    <dt>category</dt><dd>${w.category || "-"}</dd>
    <dt>year</dt><dd>${w.year || "-"}</dd>
    <dt>id</dt><dd>${w.id}</dd>
  `;

  const toShop = $("#toShop");
  if (toShop){
    toShop.href = w.shopUrl || "https://www.tcda.shop/";
    toShop.textContent = w.shopUrl ? "Shop（該当商品へ）" : "Shop（TCDAへ）";
  }

  const notes = $("#workNotes");
  const arr = w.notes || [];
  notes.innerHTML = arr.length
    ? `<ul>${arr.map(s => `<li>${s}</li>`).join("")}</ul>`
    : `<p style="margin:0;color:rgba(255,255,255,.62)">—</p>`;

  // timeline tick
  const tick = $("#tick");
  const timeText = $("#timeText");
  function onScroll(){
    const h = Math.max(1, document.body.scrollHeight - innerHeight);
    const p = scrollY / h;
    if (tick){
      const top = 110 + p * (innerHeight - 220);
      tick.style.top = `${top}px`;
    }
    if (timeText){
      timeText.textContent = `t = ${(p * 1.00).toFixed(2)}`;
      timeText.style.top = `${Math.max(0, (p * 100))}%`;
    }
  }
  addEventListener("scroll", onScroll, { passive:true });
  onScroll();
}

/* -------------------------
   6) 放置でUIが静かに崩壊（IDLE）
------------------------- */
function idleDecay(){
  let t = null;
  const IDLE_MS = 12000;

  const reset = () => {
    document.body.classList.remove("is-idle");
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      document.body.classList.add("is-idle");
      window.__FIELD && window.__FIELD.pulse(1.0);
    }, IDLE_MS);
  };

  ["pointermove","scroll","keydown","touchstart","click"].forEach(ev => {
    addEventListener(ev, reset, { passive:true });
  });

  reset();
}

/* -------------------------
   7) 背景Canvas：色場（軽量）
------------------------- */
function fieldCanvas(){
  const c = $("#field");
  if (!c) return;

  const ctx = c.getContext("2d", { alpha: true });
  const dpr = Math.min(2, devicePixelRatio || 1);

  let w=0,h=0, pulse=0;

  function resize(){
    w = c.width  = Math.floor(innerWidth * dpr);
    h = c.height = Math.floor(innerHeight * dpr);
    c.style.width  = innerWidth + "px";
    c.style.height = innerHeight + "px";
  }
  resize();
  addEventListener("resize", resize, { passive:true });

  const state = {
    mx: 0.5, my: 0.5,
    pulse(v){ pulse = Math.min(1, pulse + v); }
  };
  window.__FIELD = state;

  addEventListener("pointermove", (e) => {
    state.mx = e.clientX / innerWidth;
    state.my = e.clientY / innerHeight;
  }, { passive:true });

  function draw(now){
    const acc = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7b5cff";
    const acc2 = getComputedStyle(document.documentElement).getPropertyValue("--accent2").trim() || "#00ffd5";

    ctx.clearRect(0,0,w,h);

    // base dark gradient
    const g0 = ctx.createLinearGradient(0,0,w,h);
    g0.addColorStop(0, "rgba(0,0,0,1)");
    g0.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g0;
    ctx.fillRect(0,0,w,h);

    // moving blobs
    const t = now/1000;
    const x = (state.mx * w);
    const y = (state.my * h);

    const r1 = (Math.min(w,h) * (0.55 + 0.10*Math.sin(t*0.7))) * (1 + pulse*0.35);
    const r2 = (Math.min(w,h) * (0.45 + 0.12*Math.cos(t*0.6))) * (1 + pulse*0.25);

    const g1 = ctx.createRadialGradient(x, y, 0, x, y, r1);
    g1.addColorStop(0, hexToRgba(acc, 0.18 + pulse*0.20));
    g1.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0,0,w,h);

    const x2 = w*(0.75 + 0.08*Math.sin(t*0.4));
    const y2 = h*(0.35 + 0.08*Math.cos(t*0.5));
    const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
    g2.addColorStop(0, hexToRgba(acc2, 0.10 + pulse*0.14));
    g2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0,0,w,h);

    // pulse decay
    pulse *= 0.92;

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

function hexToRgba(hex, a){
  const h = hex.replace("#","").trim();
  const n = parseInt(h.length===3 ? h.split("").map(x=>x+x).join("") : h, 16);
  const r = (n>>16)&255;
  const g = (n>>8)&255;
  const b = n&255;
  return `rgba(${r},${g},${b},${a})`;
}

/* -------------------------
   init
------------------------- */
function init(){
  softProtect();
  fieldCanvas();
  hud();
  morphLabel();
  idleDecay();
  loadWorksIntoGrid();
  renderWorkPage();

  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
}
document.addEventListener("DOMContentLoaded", init);

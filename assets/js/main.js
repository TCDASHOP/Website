/* SAIREN COLOR ARCHIVE - main.js */

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

function toast(msg){
  const t = $("#toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 2400);
}

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

async function loadJSON(path){
  const res = await fetch(path, {cache:"no-store"});
  if(!res.ok) throw new Error(`Failed: ${path}`);
  return await res.json();
}

function setActiveNav(){
  const path = location.pathname;
  $$(".menu a").forEach(a=>{
    const href = a.getAttribute("href");
    if(!href) return;
    if(path.endsWith(href) || path.endsWith(href.replace("./","/"))){
      a.classList.add("active");
    }
  });
}

function themeInit(){
  const saved = localStorage.getItem("sca_theme");
  if(saved){
    document.body.classList.remove("theme-a","theme-b","theme-c");
    document.body.classList.add(saved);
  }

  const switcher = $("#themeSwitcher");
  if(!switcher) return;

  $$("#themeSwitcher [data-theme]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const t = btn.dataset.theme;
      const cls = `theme-${t}`;
      document.body.classList.remove("theme-a","theme-b","theme-c");
      document.body.classList.add(cls);
      localStorage.setItem("sca_theme", cls);
      toast(`Theme ${t.toUpperCase()} applied`);
    });
  });
}

function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function renderWorksGrid(works, mount){
  mount.innerHTML = works.map(w => `
    <a class="card" href="./work.html?id=${encodeURIComponent(w.id)}" aria-label="${escapeHtml(w.title)}">
      <div class="cardMedia">
        <img loading="lazy" src="${w.formedThumb}" alt="${escapeHtml(w.title)}">
      </div>
      <div class="cardBody">
        <h3 class="cardTitle">${escapeHtml(w.title)}</h3>
        <div class="cardMeta">
          ${w.year ? `<span class="tag">${escapeHtml(w.year)}</span>` : ``}
          ${w.series ? `<span class="tag">${escapeHtml(w.series)}</span>` : ``}
          ${w.tags?.[0] ? `<span class="tag">${escapeHtml(w.tags[0])}</span>` : `<span class="tag">Formed</span>`}
        </div>
      </div>
    </a>
  `).join("");
}

async function pageWorks(){
  const mount = $("#worksGrid");
  if(!mount) return;

  const data = await loadJSON(`../assets/data/works.json`);
  const works = data.works || [];
  renderWorksGrid(works, mount);

  const count = $("#worksCount");
  if(count) count.textContent = String(works.length);
}

async function pageWorkDetail(){
  const mount = $("#workDetail");
  if(!mount) return;

  const id = getParam("id");
  const data = await loadJSON(`../assets/data/works.json`);
  const works = data.works || [];
  const w = works.find(x => x.id === id) || works[0];

  if(!w){
    mount.innerHTML = `<div class="panel"><p class="small">Work not found.</p></div>`;
    return;
  }

  document.title = `${w.title} | SAIREN COLOR ARCHIVE`;

  mount.innerHTML = `
    <div class="sectionHead">
      <div>
        <div class="kicker">${escapeHtml(w.series || "WORK")}${w.year ? ` / ${escapeHtml(w.year)}` : ""}</div>
        <h1 class="h1" style="margin:8px 0 0;font-size:22px;">${escapeHtml(w.title)}</h1>
      </div>
      <a class="btn small" href="./works.html">← Back</a>
    </div>

    <div class="split">
      <div class="panel">
        <div class="label">FORMED</div>
        <div style="margin-top:10px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.10)">
          <img src="${w.formedMain}" alt="${escapeHtml(w.title)} - formed">
        </div>
      </div>

      <div class="panel">
        <div class="label">COLOR</div>
        <div style="margin-top:10px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.10)">
          <img src="${w.rawMain}" alt="${escapeHtml(w.title)} - raw">
        </div>
      </div>
    </div>

    ${w.note ? `
      <div class="panel" style="margin-top:14px">
        <div class="label">NOTE</div>
        <div class="small">${escapeHtml(w.note)}</div>
      </div>` : ``}
  `;
}

async function pageLookbook(){
  const mount = $("#lookbookMount");
  if(!mount) return;

  const data = await loadJSON(`../assets/data/lookbook.json`);

  mount.innerHTML = `
    <div class="panel">
      <div class="label">LOOKBOOK</div>
      <div class="big">${escapeHtml(data.title || "LOOKBOOK")}</div>
      <p class="small">${escapeHtml(data.description || "")}</p>
      <div class="hr"></div>
      <a class="btn primary" href="${data.url}" target="_blank" rel="noopener">Open ↗</a>
      ${data.shopUrl ? `<a class="btn" href="${data.shopUrl}" target="_blank" rel="noopener">Shop ↗</a>` : ``}
    </div>
  `;
}

function mailtoPrefill(){
  const form = $("#contactForm");
  if(!form) return;

  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const name = $("#c_name").value.trim();
    const email = $("#c_email").value.trim();
    const subject = $("#c_subject").value.trim();
    const message = $("#c_message").value.trim();

    const to = "info@sairencolorarchive.com";
    const s = subject || "Inquiry from SAIREN COLOR ARCHIVE";
    const body =
`Name: ${name}
Email: ${email}

Message:
${message}
`;
    location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(body)}`;
  });
}

/* ===== ARTIST MOTION: hero parallax ===== */
function heroParallax(){
  const hero = $(".heroCard");
  const img = $(".heroMedia img");
  if(!hero || !img) return;

  let raf = null;
  let tx = 0, ty = 0;

  function apply(){
    raf = null;
    // clamp
    const x = Math.max(-10, Math.min(10, tx));
    const y = Math.max(-8, Math.min(8, ty));
    img.style.transform = `scale(1.12) translate3d(${x}px, ${y}px, 0)`;
  }

  hero.addEventListener("mousemove", (e)=>{
    const r = hero.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width - 0.5;
    const cy = (e.clientY - r.top) / r.height - 0.5;
    tx = cx * 16;
    ty = cy * 12;
    if(!raf) raf = requestAnimationFrame(apply);
  });

  hero.addEventListener("mouseleave", ()=>{
    img.style.transform = "";
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  setActiveNav();
  themeInit();
  mailtoPrefill();
  heroParallax();

  try{
    await pageWorks();
    await pageWorkDetail();
    await pageLookbook();
  }catch(err){
    console.error(err);
    toast("Load error (check paths / JSON).");
  }
});

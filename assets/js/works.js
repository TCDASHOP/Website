(async function(){
  const grid = document.getElementById("worksGrid");
  if(!grid) return;

  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbTitle = document.getElementById("lbTitle");
  const lbClose = document.getElementById("lbClose");

  const ASSETS = "../assets";

  async function loadWorks(){
    const res = await fetch(`${ASSETS}/data/works.json`, {cache:"no-store"});
    if(!res.ok) throw new Error("works.json not found");
    return await res.json();
  }

  function openLB(item){
    lbTitle.textContent = item.title || item.id;
    lbImg.src = item.full || item.thumb;
    lbImg.alt = item.alt || item.title || "";
    lb.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";
    lbClose.focus();
  }

  function closeLB(){
    lb.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
  }

  lbClose?.addEventListener("click", closeLB);
  lb?.addEventListener("click", (e)=>{
    if(e.target === lb) closeLB();
  });
  window.addEventListener("keydown", (e)=>{
    if(e.key === "Escape" && lb.getAttribute("aria-hidden")==="false") closeLB();
  });

  try{
    const items = await loadWorks();
    grid.innerHTML = "";
    items.forEach(item=>{
      const el = document.createElement("article");
      el.className = "work";
      el.tabIndex = 0;
      el.setAttribute("role","button");
      el.setAttribute("aria-label", item.title || item.id);
      el.innerHTML = `
        <img loading="lazy" src="${item.thumb}" alt="${item.alt || ""}">
        <div class="meta">
          <b>${item.title || item.id}</b>
          <small>${(item.year||"")}${item.tags?.length ? " · " + item.tags.join(" / ") : ""}</small>
        </div>
      `;
      el.addEventListener("click", ()=> openLB(item));
      el.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); openLB(item);} });
      grid.appendChild(el);
    });
  }catch(e){
    console.warn(e);
    grid.innerHTML = `
      <div class="tile" style="grid-column: 1 / -1">
        <b>works.json が読み込めません</b>
        <p>パス or JSON形式を確認してください。<br>（このテンプレでは <code>assets/data/works.json</code> が必須です）</p>
      </div>
    `;
  }
})();

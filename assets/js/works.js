(function(){
  const grid = document.querySelector("[data-works-grid]");
  if(!grid) return;

  const modal = document.querySelector("[data-modal]");
  const modalImg = modal?.querySelector("[data-modal-img]");
  const modalTitle = modal?.querySelector("[data-modal-title]");
  const modalSub = modal?.querySelector("[data-modal-sub]");
  const closeBtn = modal?.querySelector("[data-modal-close]");
  const btnRaw = modal?.querySelector("[data-show-raw]");
  const btnFormed = modal?.querySelector("[data-show-formed]");

  let current = null;

  const open = (item) => {
    current = item;
    if(modalTitle) modalTitle.textContent = item.title || item.id;
    if(modalSub) modalSub.textContent = item.id;
    showFormed();
    modal?.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    modal?.setAttribute("aria-hidden","true");
    document.body.style.overflow = "";
    current = null;
  };

  const setImg = (src) => {
    if(!modalImg) return;
    modalImg.src = src;
    modalImg.alt = (current?.title || current?.id || "work");
    modalImg.onerror = () => {
      // show nothing rather than a broken icon
      modalImg.removeAttribute("src");
    };
  };

  const showRaw = () => current && setImg(current.raw || current.thumb);
  const showFormed = () => current && setImg(current.formed || current.thumb);

  closeBtn?.addEventListener("click", close);
  modal?.addEventListener("click", (e) => {
    if(e.target === modal) close();
  });
  window.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && modal?.getAttribute("aria-hidden")==="false") close();
  });

  btnRaw?.addEventListener("click", (e)=>{ e.stopPropagation(); showRaw(); });
  btnFormed?.addEventListener("click", (e)=>{ e.stopPropagation(); showFormed(); });

  const render = (items) => {
    grid.innerHTML = "";
    items.forEach((w) => {
      const card = document.createElement("div");
      card.className = "work-card";
      card.setAttribute("role","button");
      card.setAttribute("tabindex","0");
      card.innerHTML = `
        <img loading="lazy" decoding="async" src="${w.thumb || w.formed || ""}" alt="${(w.title||w.id||"work").replace(/"/g,'&quot;')}">
        <div class="meta">
          <b>${w.id}</b>
          <span>tap</span>
        </div>
      `;
      const img = card.querySelector("img");
      img.onerror = ()=>{ img.removeAttribute("src"); };
      const go = () => open(w);
      card.addEventListener("click", go);
      card.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } });
      grid.appendChild(card);
    });
  };

  const fail = () => {
    grid.innerHTML = `<div class="mini" style="grid-column:1/-1">作品データが読み込めませんでした。<br><span>assets/data/works.json と画像パスを確認してください。</span></div>`;
  };

  fetch("/assets/data/works.json", {cache:"no-store"})
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(render)
    .catch(fail);
})();

(async function () {
  function qs(sel, root=document){ return root.querySelector(sel); }

  async function loadConfig(){
    const res = await fetch("/assets/site.config.json", { cache:"no-store" });
    return await res.json();
  }

  function escapeHtml(s){
    return String(s ?? "").replace(/[&<>"']/g, (m)=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[m]));
  }

  function renderWorks(list){
    const grid = qs("#worksGrid");
    if(!grid) return;

    grid.innerHTML = list.map((w)=>`
      <button class="work-card"
        data-title="${escapeHtml(w.title)}"
        data-raw="${escapeHtml(w.raw)}"
        data-main="${escapeHtml(w.main)}"
        data-alt="${escapeHtml(w.alt || w.title)}">
        <span class="work-card__label">${escapeHtml(w.title)}</span>
      </button>
    `).join("");
  }

  function initModal(){
    const modal = qs("#workModal");
    if(!modal) return;

    const img = qs("#workModalImg", modal);
    const title = qs("#workModalTitle", modal);
    const tabs = Array.from(modal.querySelectorAll(".tab[data-view]"));
    const closeEls = Array.from(modal.querySelectorAll("[data-close]"));

    let current = { raw:"", main:"", alt:"", title:"" };

    function setView(view){
      const src = view==="raw" ? current.raw : current.main;
      img.src = src;
      img.alt = current.alt || current.title || "";

      tabs.forEach((b)=>b.classList.toggle("is-active", b.dataset.view===view));

      // preload opposite
      const preload = new Image();
      preload.src = (view==="raw") ? current.main : current.raw;
    }

    function openModal(data){
      current = data;
      title.textContent = data.title || "";
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden","false");
      document.body.style.overflow="hidden";
      setView("main");
    }

    function closeModal(){
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden","true");
      document.body.style.overflow="";
      img.src="";
    }

    document.addEventListener("click",(e)=>{
      const btn = e.target.closest(".work-card");
      if(!btn) return;

      openModal({
        title: btn.dataset.title,
        raw: btn.dataset.raw,
        main: btn.dataset.main,
        alt: btn.dataset.alt
      });
    });

    tabs.forEach((b)=>b.addEventListener("click", ()=>setView(b.dataset.view)));
    closeEls.forEach((el)=>el.addEventListener("click", closeModal));

    document.addEventListener("keydown",(e)=>{
      if(e.key==="Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  const cfg = await loadConfig();
  if(Array.isArray(cfg.works)) renderWorks(cfg.works);
  initModal();
})();
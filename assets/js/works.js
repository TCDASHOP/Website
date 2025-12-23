(() => {
  const LANGS = ["ja", "en", "es", "fr", "ko", "zh-hans"];

  function assetPrefix() {
    // Works on:
    // - /ja/works.html            -> ../
    // - /Website/ja/works.html    -> ../
    // - /works.html              -> (not used here, but safe)
    const parts = location.pathname.split("/").filter(Boolean);
    const langIndex = parts.findIndex(p => LANGS.includes(p));
    if (langIndex >= 0 && langIndex === parts.length - 2) return "../";
    return "";
  }

  const PFX = assetPrefix();

  const grid = document.getElementById("worksGrid");
  const statusEl = document.getElementById("worksStatus");
  const modal = document.getElementById("workModal");
  const modalImg = document.getElementById("workModalImg");
  const modalTitle = document.getElementById("workModalTitle");
  const modalClose = document.getElementById("workModalClose");

  function setStatus(msg = "") {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.hidden = !msg;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function openModal(item) {
    if (!modal) return;
    modalTitle.textContent = item.title || item.id || "";
    modalImg.src = PFX + (item.formed || "");
    modalImg.alt = item.title || item.id || "work";
    modal.showModal();
  }

  function closeModal() {
    if (!modal) return;
    modal.close();
    modalImg.src = "";
  }

  async function load() {
    if (!grid) return;

    setStatus("Loading…");

    let data;
    try {
      const res = await fetch(PFX + "assets/data/works.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid JSON");
    } catch (e) {
      console.error(e);
      setStatus("Failed to load works data.");
      return;
    }

    grid.innerHTML = "";
    const frag = document.createDocumentFragment();

    data.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "work-card";
      btn.setAttribute("data-id", item.id || "");

      const fig = document.createElement("figure");
      fig.className = "work-figure";

      const img = document.createElement("img");
      img.className = "work-thumb";
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = item.title || item.id || "work";
      img.src = PFX + (item.formed || "");
      img.addEventListener("error", () => {
        btn.classList.add("is-missing");
        img.remove();
      });

      const cap = document.createElement("figcaption");
      cap.className = "work-caption";
      cap.innerHTML = `<span class="work-id">${esc(item.id || "")}</span>`;

      fig.appendChild(img);
      fig.appendChild(cap);
      btn.appendChild(fig);

      btn.addEventListener("click", () => openModal(item));
      frag.appendChild(btn);
    });

    grid.appendChild(frag);
    setStatus("");
  }

  // Modal events
  if (modal) {
    modal.addEventListener("click", (e) => {
      const rect = modal.getBoundingClientRect();
      const inDialog = rect.top <= e.clientY && e.clientY <= rect.bottom &&
                       rect.left <= e.clientX && e.clientX <= rect.right;
      if (!inDialog) closeModal();
    });
  }
  if (modalClose) modalClose.addEventListener("click", closeModal);

  load();
})();

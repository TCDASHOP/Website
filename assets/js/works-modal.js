/* WORKS modal (tap image to toggle RAW/MAIN) */
(function () {
  const glyph = (id) => document.getElementById(id);

  const overlay = glyph("worksModal");
  const backdrop = overlay ? overlay.querySelector(".modalBackdrop") : null;
  const img = glyph("modalImage");
  const grid = glyph("worksGrid");

  let works = [];
  let current = null;
  let mode = "main"; // "main" or "raw"

  function setImg() {
    if (!current || !img) return;
    const src = mode === "raw" ? current.raw : current.main;
    img.src = src;
    img.alt = current.alt || current.title || "WORK";
  }

  function openModal(work) {
    if (!overlay) return;
    current = work;
    mode = "main";
    setImg();

    overlay.classList.add("isOpen");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("noScroll");
  }

  function closeModal() {
    if (!overlay) return;
    overlay.classList.remove("isOpen");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("noScroll");
    current = null;
    if (img) {
      img.src = "";
      img.alt = "";
    }
  }

  function toggleMode() {
    if (!current) return;
    mode = mode === "main" ? "raw" : "main";
    setImg();
  }

  async function loadConfig() {
    try {
      const res = await fetch("/assets/site.config.json", { cache: "no-store" });
      const data = await res.json();
      works = Array.isArray(data.works) ? data.works : [];
      return works;
    } catch (e) {
      console.warn("Failed to load site.config.json", e);
      works = [];
      return works;
    }
  }

  function buildGrid() {
    if (!grid) return;
    grid.innerHTML = "";

    const frag = document.createDocumentFragment();
    works.forEach((w, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "workThumb";
      btn.setAttribute("aria-label", w.title || `WORK ${idx + 1}`);

      const imgEl = document.createElement("img");
      imgEl.loading = "lazy";
      imgEl.src = w.main || w.raw;
      imgEl.alt = w.alt || w.title || `WORK ${idx + 1}`;
      btn.appendChild(imgEl);

      btn.addEventListener("click", () => openModal(w));
      frag.appendChild(btn);
    });
    grid.appendChild(frag);
  }

  // Events
  if (backdrop) backdrop.addEventListener("click", closeModal);

  if (overlay) {
    // click outside inner closes
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  if (img) {
    img.addEventListener("click", (e) => {
      e.preventDefault();
      toggleMode();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && overlay.classList.contains("isOpen")) {
      closeModal();
    }
  });

  // Init
  document.addEventListener("DOMContentLoaded", async () => {
    await loadConfig();
    buildGrid();
  });
})();

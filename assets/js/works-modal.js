(() => {
  const grid = document.getElementById("worksGrid");
  const modal = document.getElementById("worksModal");
  const modalImg = document.getElementById("worksModalImg");

  if (!grid || !modal || !modalImg) return;

  const openModal = (src, alt) => {
    modalImg.src = src;
    modalImg.alt = alt || "WORK";
    modal.classList.add("isOpen");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    modal.classList.remove("isOpen");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    modalImg.removeAttribute("src");
  };

  // No close UI: background tap or image tap closes
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  modalImg.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("isOpen")) closeModal();
  });

  const render = (works) => {
    const frag = document.createDocumentFragment();

    works.forEach((w) => {
      // formed(main) only
      if (!w.main) return;

      const a = document.createElement("a");
      a.href = "#";
      a.className = "workCard";
      a.setAttribute("data-work-id", w.id);

      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = w.main;
      img.alt = w.alt || w.title || w.id;

      a.appendChild(img);

      a.addEventListener("click", (e) => {
        e.preventDefault();
        openModal(w.main, img.alt);
      });

      frag.appendChild(a);
    });

    grid.innerHTML = "";
    grid.appendChild(frag);
  };

  (async () => {
    try {
      const cfg = await Site.fetchConfig();
      const works = Array.isArray(cfg.works) ? cfg.works : [];
      render(works);
    } catch (e) {
      console.error(e);
    }
  })();
})();

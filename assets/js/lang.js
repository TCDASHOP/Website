(function(){
  const select = document.querySelector("[data-lang-select]");
  if(!select) return;

  const lang = document.body.dataset.lang || "ja";
  const page = document.body.dataset.page || "index";
  const pathOf = (langCode) => {
    const file = (page === "index") ? "index.html" : (page + ".html");
    return `/${langCode}/${file}`;
  };

  // set current
  [...select.options].forEach(o => {
    if(o.value === lang) o.selected = true;
  });

  select.addEventListener("change", () => {
    const to = select.value;
    window.location.href = pathOf(to);
  });
})();

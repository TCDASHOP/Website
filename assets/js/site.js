(function(){
  const KEY = "sca_theme";
  const root = document.documentElement;
  const btn = document.querySelector("[data-theme-toggle]");
  const init = () => {
    const saved = localStorage.getItem(KEY);
    if(saved === "B") root.setAttribute("data-theme","B");
    else root.removeAttribute("data-theme");
    if(btn){
      btn.setAttribute("aria-label", root.getAttribute("data-theme")==="B" ? "Theme B" : "Theme A");
    }
  };
  init();
  if(btn){
    btn.addEventListener("click", () => {
      const now = root.getAttribute("data-theme")==="B" ? "A" : "B";
      if(now==="B"){ root.setAttribute("data-theme","B"); localStorage.setItem(KEY,"B"); }
      else { root.removeAttribute("data-theme"); localStorage.setItem(KEY,"A"); }
      btn.setAttribute("aria-label", now==="B" ? "Theme B" : "Theme A");
    }, {passive:true});
  }
})();

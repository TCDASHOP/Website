(function(){
  function applyBrandColor(){
    const brand = document.querySelector(".brand");
    if(!brand) return;
    const h = Math.floor(Math.random()*360);
    brand.style.color = `hsl(${h} 85% 70%)`;
  }
  window.addEventListener("DOMContentLoaded", applyBrandColor);
})();
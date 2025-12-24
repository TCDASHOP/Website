(function(){
  const imgs = [
    "/assets/images/hero/hero-01.jpg",
    "/assets/images/hero/hero-02.jpg",
    "/assets/images/hero/hero-03.jpg",
  ];
  function exists(url){
    return fetch(url, {method:"HEAD"}).then(r=>r.ok).catch(()=>false);
  }
  async function setHeroBg(){
    const hero = document.querySelector(".hero--full");
    if(!hero) return;

    const available = [];
    for(const u of imgs){
      if(await exists(u)) available.push(u);
    }
    if(!available.length) return;

    const pick = available[Math.floor(Math.random()*available.length)];
    hero.style.backgroundImage = `url('${pick}')`;
    hero.style.backgroundSize = "cover";
    hero.style.backgroundPosition = "center";
  }
  window.addEventListener("DOMContentLoaded", setHeroBg);
})();
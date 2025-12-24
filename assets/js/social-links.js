(async function () {
  try{
    const res = await fetch("/assets/site.config.json", { cache:"no-store" });
    const cfg = await res.json();
    const ig = document.getElementById("igLinkSns");
    const tt = document.getElementById("ttLinkSns");
    if(ig && cfg?.sns?.instagramUrl) ig.href = cfg.sns.instagramUrl;
    if(tt && cfg?.sns?.tiktokUrl) tt.href = cfg.sns.tiktokUrl;
  }catch(_){}
})();
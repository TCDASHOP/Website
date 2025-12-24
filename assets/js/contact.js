(async function(){
  try{
    const res = await fetch("/assets/site.config.json", { cache:"no-store" });
    const cfg = await res.json();
    const email = cfg?.contact?.email;
    const a = document.getElementById("contactEmail");
    if(email && a){
      a.textContent = email;
      a.href = `mailto:${email}`;
    }
  }catch(_){}
})();
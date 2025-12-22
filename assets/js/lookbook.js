(async function(){
  const list = document.getElementById("lookbookList");
  if(!list) return;
  const ASSETS = "../assets";
  try{
    const res = await fetch(`${ASSETS}/data/lookbook.json`, {cache:"no-store"});
    const items = await res.json();
    list.innerHTML = "";
    items.forEach(it=>{
      const a = document.createElement("a");
      a.className = "btn primary";
      a.href = it.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = it.title;
      list.appendChild(a);
    });
  }catch(e){
    console.warn(e);
  }
})();

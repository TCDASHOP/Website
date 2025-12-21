/* SAIREN COLOR ARCHIVE – interactions
   1) Scroll morph title (構造 → 分類名)
   2) Hover card => background field reacts
   3) Idle => UI decays quietly
   + Copy deterrence (not absolute)
*/

(() => {
  document.documentElement.dataset.jsok = "1";
  // 以下そのまま…
   (function(){
  const $ = (q, el=document) => el.querySelector(q);
  const $$ = (q, el=document) => [...el.querySelectorAll(q)];

  // Year
  const y = new Date().getFullYear();
  $$("#yearNow").forEach(n => n.textContent = String(y));

  // Telemetry
  const mx = $("#mx"), my = $("#my"), mt = $("#mt");
  const start = performance.now();

  // Background field variables
  const root = document.documentElement;
  let px = 0.5, py = 0.4;

  function setField(x, y){
    root.style.setProperty("--fieldX", (x*100).toFixed(2) + "%");
    root.style.setProperty("--fieldY", (y*100).toFixed(2) + "%");
  }

  // Smooth pointer follow
  let targetX = 0.5, targetY = 0.4;
  window.addEventListener("pointermove", (e) => {
    targetX = e.clientX / window.innerWidth;
    targetY = e.clientY / window.innerHeight;
    if(mx) mx.textContent = targetX.toFixed(2);
    if(my) my.textContent = targetY.toFixed(2);
    bumpIdle();
  }, {passive:true});

  // Scroll => morph title + time
  const title = $(".hero__titleCore");
  const morphSrc = title?.dataset?.morph || "";
  const morphList = morphSrc.split("|").map(s => s.trim()).filter(Boolean);
  function morphByScroll(){
    const h = document.documentElement;
    const sc = h.scrollTop || document.body.scrollTop || 0;
    const max = Math.max(1, (h.scrollHeight - window.innerHeight));
    const p = Math.min(1, sc / max);

    // 4段階で変異（上で指定した配列を使う）
    if(title && morphList.length){
      const idx = Math.min(morphList.length - 1, Math.floor(p * morphList.length));
      const next = morphList[idx];
      if(title.textContent !== next){
        title.animate([
          { filter:"blur(0px)", opacity:1, transform:"translateY(0px)" },
          { filter:"blur(8px)", opacity:0.2, transform:"translateY(6px)" }
        ], { duration:180, easing:"ease-out" }).onfinish = () => {
          title.textContent = next;
          title.animate([
            { filter:"blur(8px)", opacity:0.2, transform:"translateY(-6px)" },
            { filter:"blur(0px)", opacity:1, transform:"translateY(0px)" }
          ], { duration:220, easing:"ease-out" });
        };
      }
    }

    // 背景もスクロールで微妙に呼吸
    root.style.setProperty("--fieldHue", String(180 + Math.round(p*140)));
    bumpIdle();
  }
  window.addEventListener("scroll", morphByScroll, {passive:true});

  // Card hover => field color
  $$(".card").forEach(card => {
    card.addEventListener("pointerenter", () => {
      const c = card.getAttribute("data-field");
      if(c) root.style.setProperty("--fieldA", "0.72");
      bumpIdle();
    });
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      targetX = 0.15 + x*0.70;
      targetY = 0.18 + y*0.62;

      // hue shift by card tone
      const tint = card.getAttribute("data-field") || "";
      if(tint.includes("255,100,160")) root.style.setProperty("--fieldHue", "330");
      else if(tint.includes("120,255,140")) root.style.setProperty("--fieldHue", "140");
      else root.style.setProperty("--fieldHue", "200");

      bumpIdle();
    });
    card.addEventListener("pointerleave", () => {
      root.style.setProperty("--fieldA", "0.55");
      bumpIdle();
    });
  });

  // RAF loop: smooth follow + time
  function loop(){
    px += (targetX - px) * 0.08;
    py += (targetY - py) * 0.08;
    setField(px, py);

    if(mt){
      const t = (performance.now() - start)/1000;
      mt.textContent = t.toFixed(2);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Work page: read query and set content
  function getParam(k){
    const u = new URL(location.href);
    return u.searchParams.get(k) || "";
  }
  const wImg = $("#wImg");
  if(wImg){
    const id = getParam("id") || "01";
    const cat = getParam("cat") || "artifact";
    const year = getParam("year") || "2025";
    const img = getParam("img") || "1.webp";

    $("#wId").textContent = id;
    $("#wCat").textContent = cat;
    $("#wYear").textContent = year;

    // ここは後で作品ごとの辞書にできる（20枚になってもOK）
    const titleMap = {
      "01":"Chromatic Silence",
      "02":"Moving Canvas",
      "03":"Field Notes",
    };
    $("#wTitle").textContent = titleMap[id] || ("Work " + id);

    wImg.src = "/assets/img/works/" + img;
    wImg.alt = "Work " + id;

    // 背景色場、カテゴリで変える
    const hue = cat === "lookbook" ? 330 : (cat === "fieldnote" ? 140 : 200);
    root.style.setProperty("--fieldHue", String(hue));

    // 次リンク（仮：id+1）
    const next = String(Number(id) + 1).padStart(2,"0");
    const nextLink = $("#nextLink");
    if(nextLink){
      nextLink.href = "./work.html?id=" + next + "&cat=" + cat + "&year=" + year + "&img=" + img;
    }
  }

  // ===== Idle decay =====
  let idle = 0; // seconds
  let last = performance.now();

  function bumpIdle(){ idle = 0; root.style.setProperty("--decay","0"); root.style.setProperty("--skew","0deg"); root.style.setProperty("--shake","0px"); }

  function idleLoop(now){
    const dt = (now - last)/1000;
    last = now;
    idle += dt;

    // 7秒から“崩れ始める”
    const d = Math.max(0, Math.min(1, (idle - 7) / 10));
    root.style.setProperty("--decay", d.toFixed(3));

    // 崩壊：わずかな歪みと揺れ
    const skew = (d * 0.9) * (Math.sin(now/1200) * 0.35);
    const shake = (d * 1.6) * (Math.sin(now/180) * 0.5);
    root.style.setProperty("--skew", skew.toFixed(3) + "deg");
    root.style.setProperty("--shake", shake.toFixed(2) + "px");

    requestAnimationFrame(idleLoop);
  }
  requestAnimationFrame(idleLoop);

  // ===== Copy deterrence =====
  // NOTE: 完全防止は不可能。だが一般ユーザーには十分効く。
  const block = (e) => { e.preventDefault(); bumpIdle(); return false; };

  // right click / context menu
  window.addEventListener("contextmenu", block);

  // select / copy
  window.addEventListener("selectstart", block);
  window.addEventListener("copy", block);

  // drag images
  window.addEventListener("dragstart", (e) => {
    const t = e.target;
    if(t && (t.tagName === "IMG" || t.closest("img"))) block(e);
  }, {capture:true});

  // mobile long press is mostly "touch-callout:none" + contextmenu block
  // screenshot保存までは仕様上止められない（OS機能）
})();

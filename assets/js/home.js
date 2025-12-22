(function(){
  const hero = document.querySelector("[data-hero]");
  if(!hero) return;
  const phaseEl = hero.querySelector("[data-phase]");
  const skipBtn = hero.querySelector("[data-skip]");
  const path = hero.querySelector("[data-scribble-path]");
  if(!phaseEl || !path) return;

  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Brush-like reveal for hero title (character-by-character)
	const inkify = (el) => {
		if(!el) return;
		const text = (el.textContent || "").replace(/\s+/g, " ");
		if(!text.trim()) return;
		// Keep accessibility
		el.setAttribute("aria-label", text.trim());
		if(reduced){
			el.classList.add("ink-static");
			return;
		}
		el.textContent = "";
		const frag = document.createDocumentFragment();
		let idx = 0;
		for (const ch of text){
			const span = document.createElement("span");
			span.className = "ink-char";
			span.textContent = ch === " " ? "\u00A0" : ch;
			span.style.setProperty("--d", (idx * 55 + Math.random()*25).toFixed(0) + "ms");
			frag.appendChild(span);
			idx++;
		}
		el.appendChild(frag);
		el.classList.add("ink-ready");
	};

	hero.querySelectorAll("[data-ink]").forEach(inkify);
  if(reduced){
    phaseEl.textContent = "輪郭 → 完成";
    return;
  }

  // stroke animation
  const len = path.getTotalLength();
  path.style.strokeDasharray = String(len);
  path.style.strokeDashoffset = String(len);

  const phases = [
    "紫・青・赤・緑・黄色の飛沫",
    "混色",
    "輪郭",
    "完成"
  ];
  let step = 0;

  const setPhase = (i) => {
    phaseEl.textContent = phases[i] + (i<3 ? " → " : "");
  };

  const animate = () => {
    setPhase(0);
    const t0 = performance.now();
    const dur = 2400;

    function frame(t){
      const p = Math.min(1, (t - t0)/dur);
      path.style.strokeDashoffset = String(len * (1 - p));
      if(p < 1){
        requestAnimationFrame(frame);
      }else{
        setPhase(3);
      }
    }
    requestAnimationFrame(frame);

    // phase stepping
    const timers = [
      setTimeout(()=>setPhase(1), 800),
      setTimeout(()=>setPhase(2), 1600),
      setTimeout(()=>setPhase(3), 2400),
    ];

    skipBtn?.addEventListener("click", () => {
      timers.forEach(clearTimeout);
      phaseEl.textContent = phases[3];
      path.style.strokeDashoffset = "0";
      skipBtn.remove();
    }, {once:true});
  };

  animate();
})();

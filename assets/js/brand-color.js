(function(){
  const PALETTE = [
    '#ff3b30','#ff9500','#ffcc00','#34c759','#00c7be','#32ade6','#5856d6','#af52de','#ff2d55'
  ];

  function randomColor(){
    return PALETTE[Math.floor(Math.random()*PALETTE.length)];
  }

  function wrapWords(el){
    const text = el.textContent || '';
    const parts = text.split(/(\s+)/);
    el.innerHTML = parts.map(p => {
      if(/^\s+$/.test(p)) return p;
      return `<span class="color-word">${escapeHtml(p)}</span>`;
    }).join('');
  }

  function wrapChars(el){
    const text = el.textContent || '';
    const chars = Array.from(text);
    el.innerHTML = chars.map(ch => {
      if(ch === ' ') return ' ';
      return `<span class="color-char">${escapeHtml(ch)}</span>`;
    }).join('');
  }

  function escapeHtml(str){
    return str
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function recolor(el){
    el.querySelectorAll('span.color-word, span.color-char').forEach(s => {
      s.style.color = randomColor();
      s.style.textShadow = `0 0 18px ${s.style.color}`;
    });
  }

  // Public: called from i18n.js after it updates text
  window.colorizeText = function(){
    document.querySelectorAll('[data-colorize="words"]').forEach(el => {
      wrapWords(el);
      recolor(el);
    });
    document.querySelectorAll('[data-colorize="chars"]').forEach(el => {
      wrapChars(el);
      recolor(el);
    });
  };

  function prefersReduced(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Initial paint
  window.colorizeText();

  // Slow re-coloring for a "living" title (disabled for reduced motion)
  if(!prefersReduced()){
    setInterval(() => {
      document.querySelectorAll('[data-colorize]').forEach(recolor);
    }, 6500);
  }
})();

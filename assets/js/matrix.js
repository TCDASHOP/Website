(function(){
  function prefersReduced(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Matrix-ish glyph set: katakana + latin + numbers + symbols
  const GLYPHS = (
    'アイウエオカキクケコサシスセソタチツテトナニヌネノ' +
    'ハヒフヘホマミムメモヤユヨラリルレロワヲン' +
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'αβγδεζηθλμνπρστυφχψω' +
    '.,;:+-*/=<>[]{}()$#@'
  ).split('');

  // Neon palette in HSL so we can keep a cohesive glow
  const PALETTE = [
    [132, 90, 60], // classic green
    [152, 85, 58],
    [195, 90, 60], // cyan
    [280, 85, 64], // purple
    [30, 95, 60]   // amber
  ];

  function pick(arr){
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function init(){
    const canvas = document.getElementById('matrixCanvas');
    if(!canvas) return;

    const ctx = canvas.getContext('2d');
    if(!ctx) return;

    let w = 0, h = 0, dpr = 1;
    let fontSize = 16;
    let columns = 0;
    let drops = [];
    let speeds = [];

    function resize(){
      dpr = window.devicePixelRatio || 1;
      w = Math.max(1, window.innerWidth);
      h = Math.max(1, window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dynamic font size based on viewport
      fontSize = Math.max(14, Math.min(22, Math.floor(w / 48)));
      ctx.font = fontSize + 'px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
      columns = Math.floor(w / fontSize);
      drops = new Array(columns).fill(0).map(function(){
        return Math.floor(Math.random() * (h / fontSize));
      });
      speeds = new Array(columns).fill(0).map(function(){
        return 0.6 + Math.random() * 1.6;
      });
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    let last = 0;
    let running = true;

    // Pause when tab is hidden
    document.addEventListener('visibilitychange', function(){
      running = !document.hidden;
      if(running) last = performance.now();
    });

    function frame(ts){
      if(!running){
        requestAnimationFrame(frame);
        return;
      }
      const dt = Math.min(48, ts - last || 16);
      last = ts;

      // Fade (trail)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, w, h);

      for(let i=0; i<columns; i++){
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const glyph = pick(GLYPHS);
        const c = pick(PALETTE);
        const alpha = 0.55 + Math.random() * 0.35;
        ctx.fillStyle = 'hsla(' + c[0] + ',' + c[1] + '%,' + c[2] + '%,' + alpha + ')';

        // occasional brighter head
        if(Math.random() < 0.03){
          ctx.shadowColor = 'hsla(' + c[0] + ',' + c[1] + '%,' + (c[2] + 10) + '%,' + 0.9 + ')';
          ctx.shadowBlur = 14;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillText(glyph, x, y);

        // Reset to top occasionally
        if(y > h && Math.random() > 0.975){
          drops[i] = 0;
          speeds[i] = 0.6 + Math.random() * 1.6;
        }

        drops[i] += speeds[i] * (dt / 16);
      }

      ctx.shadowBlur = 0;
      requestAnimationFrame(frame);
    }

    // Keep things light on very slow devices
    if(prefersReduced()){
      // Draw a single static frame
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(0,0,w,h);
      for(let i=0;i<columns;i++){
        const x = i * fontSize;
        const y = (i % 12) * fontSize * 2;
        const glyph = pick(GLYPHS);
        const c = pick(PALETTE);
        ctx.fillStyle = 'hsla(' + c[0] + ',' + c[1] + '%,' + c[2] + '%,0.35)';
        ctx.fillText(glyph, x, y);
      }
      return;
    }

    requestAnimationFrame(function(ts){
      last = ts;
      frame(ts);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

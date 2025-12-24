/* Matrix-ish text animation: subtle scramble pulses */
(function () {
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン#$%&*+?<>-_";

  function randGlyph() {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }

  function setOriginals() {
    document.querySelectorAll(".matrix-scramble").forEach((el) => {
      // if element contains child nodes, keep it simple: use textContent
      el.dataset.matrixOriginal = el.textContent || "";
    });
  }

  function scrambleOnce(el, duration = 650) {
    const original = el.dataset.matrixOriginal ?? el.textContent ?? "";
    if (!original.trim()) return;

    const start = performance.now();
    const len = original.length;

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const reveal = Math.floor(len * t);

      let out = "";
      for (let i = 0; i < len; i++) {
        const ch = original[i];
        if (ch === " " || ch === "　") {
          out += ch;
          continue;
        }
        out += i < reveal ? ch : randGlyph();
      }
      el.textContent = out;

      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = original;
    }
    requestAnimationFrame(frame);
  }

  function schedulePulses() {
    const els = Array.from(document.querySelectorAll(".matrix-scramble"));
    if (!els.length) return;

    function tick() {
      // pick 1-3 random elements
      const count = Math.min(3, Math.max(1, Math.floor(Math.random() * 3) + 1));
      for (let i = 0; i < count; i++) {
        const el = els[Math.floor(Math.random() * els.length)];
        scrambleOnce(el, 520 + Math.random() * 380);
      }
      const next = 2200 + Math.random() * 4200;
      setTimeout(tick, next);
    }
    setTimeout(tick, 1200);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setOriginals();
    schedulePulses();

    // Hover/focus pulse (tiles / nav)
    document.body.addEventListener("mouseenter", (e) => {
      const el = e.target.closest?.(".matrix-scramble");
      if (el) scrambleOnce(el, 420);
    }, true);

    document.body.addEventListener("focusin", (e) => {
      const el = e.target.closest?.(".matrix-scramble");
      if (el) scrambleOnce(el, 420);
    });

    document.addEventListener("sca:i18n:applied", () => {
      setOriginals();
    });
  });
})();

(() => {
  // Brush-like sequential reveal for the hero title.
  // - No splash / no SKIP.
  // - Random multi-color ink (per page load).

  const PALETTES = [
    ["#b79cff", "#66d9ff", "#ff4d8a", "#6dff9f", "#ffe66d"], // purple/blue/red/green/yellow
    ["#9b5cff", "#38b6ff", "#ff3d5a", "#2de2a6", "#ffd166"],
    ["#c4a3ff", "#4cc9f0", "#ff6b6b", "#80ffdb", "#ffe8a3"],
    ["#a78bfa", "#22d3ee", "#fb7185", "#34d399", "#fde047"],
  ];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function isWhitespace(ch){ return /\s/.test(ch); }

  function inkify(el) {
    const text = el.textContent || "";
    el.textContent = "";
    const palette = pick(PALETTES);
    let colorIndex = Math.floor(Math.random() * palette.length);

    [...text].forEach((ch, i) => {
      if (isWhitespace(ch)) {
        el.appendChild(document.createTextNode(ch));
        return;
      }
      const span = document.createElement("span");
      span.className = "ink-char";
      span.style.setProperty("--i", i);
      // subtle randomness per character
      if (Math.random() < 0.18) colorIndex = (colorIndex + 1) % palette.length;
      span.style.setProperty("--ink", palette[colorIndex]);
      span.textContent = ch;
      el.appendChild(span);
    });

    el.classList.add("is-inkified");
  }

  document.querySelectorAll("[data-ink]").forEach(inkify);
})();

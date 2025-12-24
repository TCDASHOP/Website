(() => {
  function init() {
    const btn = document.getElementById('navToggle');
    const drawer = document.getElementById('navDrawer');
    if (!btn || !drawer) return;

    const close = () => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden','true');
    };
    const open = () => {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden','false');
    };

    btn.addEventListener('click', () => {
      drawer.classList.contains('open') ? close() : open();
    });

    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.addEventListener('click', (e) => {
      if (!drawer.classList.contains('open')) return;
      const target = e.target;
      if (target === btn || drawer.contains(target)) return;
      close();
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
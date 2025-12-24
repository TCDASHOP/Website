(() => {
  const modal = document.getElementById('worksModal');
  const closeBtn = document.getElementById('worksModalClose');
  const img = document.getElementById('worksModalImage');
  const title = document.getElementById('worksModalTitle');

  if (!modal || !img) return;

  const getMainSrc = (w) => {
    // 優先: main → formed（もしキー名が違う場合に備えて） → raw（最後の保険）
    return w?.main || w?.formed || w?.raw || '';
  };

  const open = (w) => {
    const src = getMainSrc(w);
    if (!src) return;

    if (title) title.textContent = w?.title || '';
    img.src = src;
    img.alt = w?.alt || w?.title || 'WORK';

    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('isOpen');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('isOpen');
    document.body.style.overflow = '';
    // 次回の再描画を軽くする（任意）
    img.removeAttribute('src');
  };

  // 作品カードに data-work-id が付いてる前提
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-work-id]');
    if (!el) return;

    const id = el.getAttribute('data-work-id');
    const works = (window.SITE_DATA && window.SITE_DATA.works) ? window.SITE_DATA.works : [];
    const w = works.find(x => x.id === id);
    if (!w) return;

    e.preventDefault();
    open(w);
  });

  closeBtn?.addEventListener('click', close);

  // 背景クリックで閉じる
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  // ESCで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();

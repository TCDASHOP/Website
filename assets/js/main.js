// 右クリック無効
document.addEventListener("contextmenu", e => {
  e.preventDefault();
}, { passive: false });

// テキスト選択防止
document.addEventListener("selectstart", e => {
  e.preventDefault();
}, { passive: false });

// 画像ドラッグ防止
document.addEventListener("dragstart", e => {
  if (e.target.tagName === "IMG" || e.target.classList.contains("work-image")) {
    e.preventDefault();
  }
}, { passive: false });

// iOS 長押し対策
document.addEventListener("touchstart", e => {
  if (e.target.classList.contains("work-image")) {
    e.preventDefault();
  }
}, { passive: false });

// キー操作での保存抑止（Ctrl+S / Cmd+S）
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
  }
});

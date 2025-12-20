// 右クリック抑止（完全防止ではないが、一般ユーザーの保存は減る）
document.addEventListener("contextmenu", (e) => e.preventDefault());

// 画像ドラッグ抑止
document.addEventListener("dragstart", (e) => {
  const t = e.target;
  if (t && t.tagName === "IMG") e.preventDefault();
});

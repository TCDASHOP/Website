// Disable right-click
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Disable drag on images
document.addEventListener("dragstart", (e) => {
  const t = e.target;
  if (t && t.tagName === "IMG") e.preventDefault();
});

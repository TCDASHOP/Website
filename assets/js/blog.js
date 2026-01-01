/* BLOG list renderer
   - reads /assets/data/blog.json
   - renders cards into #blogList
*/
(async () => {
  "use strict";
  const listEl = document.getElementById("blogList");
  const emptyEl = document.getElementById("blogEmpty");
  if(!listEl) return;

  try{
    const res = await fetch("/assets/data/blog.json", { cache: "no-store" });
    if(!res.ok) throw new Error("blog.json not found");
    const data = await res.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    if(!posts.length){
      if(emptyEl) emptyEl.textContent = data.emptyText || "";
      return;
    }

    const lang = (document.documentElement.lang || "ja").toLowerCase();
    const langKey = (lang === "ja") ? "ja" : lang;

    const base = (langKey === "ja") ? "/" : `/${langKey}/`;

    listEl.innerHTML = "";
    posts.forEach(p => {
      const a = document.createElement("a");
      a.className = "blog-item";
      a.href = `${base}blog/${p.id}/`;

      const title = (p.title && (p.title[langKey] || p.title.ja || "")) || "";
      const summary = (p.summary && (p.summary[langKey] || p.summary.ja || "")) || "";
      const date = p.date || "";

      const tags = Array.isArray(p.tags) ? p.tags : [];
      const tagsHtml = tags.slice(0,5).map(t => `<span class="blog-tag">${t}</span>`).join("");

      a.innerHTML = `
        <div class="blog-item__meta">${date}</div>
        <div class="blog-item__title">${title}</div>
        <p class="blog-item__summary">${summary}</p>
        <div class="blog-item__actions">
          <div class="blog-tags">${tagsHtml}</div>
          <span class="news-readmore" data-i18n="blog.readmore">Read more</span>
        </div>
      `;
      listEl.appendChild(a);
    });

  }catch(err){
    if(emptyEl) emptyEl.textContent = "";
    console.warn(err);
  }
})();

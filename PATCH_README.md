# Patch ZIP (replace files)

This zip contains a minimal, clean rebuild that matches the latest request:

- Works: formed (main) only
- SNS: icon links only
- Home: WORKS / LOOKBOOK / ABOUT tiles
- No top-right header nav row (only logo + language selector + menu drawer)
- Same design on mobile / tablet / PC
- i18n driven by assets/site.config.json

## Replace targets

Copy these into your repo root (static site root):

- index.html
- works.html
- about.html
- sns.html
- contact.html
- license.html
- lookbook.html
- folders: /ja /en /es /fr /ko /zh-hans  (each contains the same pages)

and assets:
- assets/css/style.css
- assets/js/matrix.js
- assets/js/site.js
- assets/js/works-modal.js
- assets/site.config.json

## Important

Keep your existing images:
- assets/images/ui/logo.svg
- assets/images/social/Instagram-logo.png
- assets/images/social/TikTok-logo.png
- works images in assets/images/works/formed/...

If you already have a richer site.config.json (more works, better translations), you can merge its works list and i18n text into the one in this zip.

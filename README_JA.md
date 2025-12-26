# SAIREN COLOR ARCHIVE - SEOスコア改善パック（見た目変更なし）

目的:
- PageSpeed Insights の SEO 監査で落ちやすい「空リンク（アイコンだけ）」を減らす
- 多言語サイトとしての基本信号（hreflang/canonical）を入れやすくする
- sitemap/robots を確実に実在させる

---

## 1) どこに格納する？

このZIPを展開すると、あなたのリポジトリ構成にそのまま合わせています。

- /assets/css/seo-a11y.css
- /assets/js/seo-a11y.js
- /robots.txt
- /sitemap.xml
- /partials/head-seo-snippet.html（貼り付け用のスニペット）

---

## 2) まずやること（最短で効く）

### A. ファイルをアップロード（差し替え）
GitHub上でZIPの中身をアップロードして、同名ファイルは差し替えしてください。

### B. 全HTMLに2行追加（見た目は変わりません）
各HTMLファイルの <head> の最後あたり（CSS/JS読み込みの近く）に下の2行を追加:

<link rel="stylesheet" href="/assets/css/seo-a11y.css">
<script defer src="/assets/js/seo-a11y.js"></script>

対象（あなたのスクショにあるファイル）:
- /index.html
- /about.html
- /works.html
- /lookbook.html
- /sns.html
- /contact.html
- /license.html
- 各言語フォルダ内（/en/ /es/ /fr/ /ja/ /ko/ /zh-hans/）の index.html など

---

## 3) さらに上げたい場合（+α）

/partials/head-seo-snippet.html の内容を参考に、各ページごとに
- canonical（そのページ自身のURL）
- hreflang（各言語URL）
を設定してください。

※ canonical はページごとに変える必要があります（コピペのままだと逆効果）。

---

## 4) 反映確認
デプロイ後に以下を確認:
- https://sairencolorarchive.com/robots.txt
- https://sairencolorarchive.com/sitemap.xml

その後 PageSpeed Insights を再計測してください。

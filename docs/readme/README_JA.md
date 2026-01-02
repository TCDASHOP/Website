# SAIREN COLOR ARCHIVE（sairencolorarchive.com）

このリポジトリは SAIREN COLOR ARCHIVE の静的サイト（GitHub Pages）です。  
**スマホ/タブレット/PCで見た目・演出を同一に保つ（現行デザイン固定）**方針です。

## 言語フォルダ
- 日本語: `/`（ルート）
- English: `/en/`
- Español: `/es/`
- Français: `/fr/`
- 한국어: `/ko/`
- 简体中文: `/zh-hans/`

## 主要ファイル
- ルート直下: `index.html`, `works.html`, `about.html`, `sns.html`, `contact.html`, `license.html`, `lookbook.html`
- アセット: `/assets/`
- SEO: `/robots.txt`, `/sitemap.xml`

## 更新手順（iPadでもOK）
1. GitHub → **Add file** → **Upload files**
2. 追加/差し替えしたいファイルをアップロード
3. Commit
4. GitHub Pages のデプロイが完了したら本番URLで確認

## SEO（見た目を変えずに改善する）
- アイコンリンクに `aria-label` / sr-only を付与
- `robots.txt` と `sitemap.xml` を正しく維持
- 多言語は `hreflang` を head に入れる（各言語ページで相互参照）

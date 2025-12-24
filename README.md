# SAIREN COLOR ARCHIVE（Matrix Edition）

このリポジトリは **SAIREN COLOR ARCHIVE** の静的サイト一式です。  
全ページに「マトリックス風」アニメーション（Canvas）を重ね、ネオン/グリッドの世界観で統一しています。

---

## できること（仕様の要点）

- **全ページ：Matrix 背景（Canvas）** + 透明スモーク/グラデのレイヤー
- **多言語（ja / en / es / fr / ko / zh-hans）**
- **WORKS：最初から作品を表示** → タップでモーダル拡大  
  - 拡大後：**RAW / MAIN 切り替え**（閉じる等の文言は出さない）
- **SNS：Instagram / TikTok のアイコンのみ**（タップで外部リンク）
- LOOKBOOK：外部URLへ遷移（設定で変更）
- 余計なナビを増やさず、導線は最小に

---

## ディレクトリ構成

```
Website/
  index.html / works.html / about.html / sns.html / contact.html / license.html
  ja/ en/ es/ fr/ ko/ zh-hans/     ← 各言語のページ（同名のhtmlを持つ）
  assets/
    site.config.json              ← 設定の本体（i18n / works / urlなど）
    css/
      style.css
      works-modal.css
    js/
      matrix.js                   ← Matrixアニメーション（全ページ）
      i18n.js                     ← 翻訳適用（data-i18n を置換）
      nav.js
      works-modal.js              ← WORKSのモーダル表示・RAW/MAIN切替
      social-links.js
      theme-hero.js
      ...
    images/
      works/
        color/                    ← RAW 用画像
        formed/                   ← MAIN 用画像
      social/                     ← SNSアイコン（Instagram/TikTok 等）
      ui/                         ← UI素材
```

---

## よく触る場所（編集ポイント）

### 1) 文面・翻訳（i18n）
`assets/site.config.json` の `i18n` にすべて入っています。  
画面に `home.tiles.works.title` みたいな **キー名がそのまま出る**場合は、次を確認してください：

- その要素に `data-i18n="home.tiles.works.title"` が付いているか
- ページの末尾で `assets/js/i18n.js` が読み込まれているか
- `assets/site.config.json` のパスが相対参照で崩れていないか（例：言語フォルダ配下）

---

### 2) HOME のタイル表記（W / L → WORKS / LOOKBOOK）
HOME タイルは i18n のキーで表示します。例：

- `home.tiles.works.title` → `"WORKS"`
- `home.tiles.works.hint`  → `"タップして開く"`
- `home.tiles.lookbook.title` → `"LOOKBOOK"`
- `home.tiles.lookbook.hint`  → `"タップして開く"`

※ 各言語（en/es/fr/ko/zh-hans）にも同じキーを用意してください。

---

### 3) WORKS の追加・差し替え
**画像を置く → configに追記** の2手です。

**A. 画像を置く**
- RAW：`assets/images/works/color/`
- MAIN：`assets/images/works/formed/`

**B. `assets/site.config.json` の `works` 配列に追記**
例（1件）：
```json
{
  "id": "artifact-21",
  "title": "WORK 21",
  "raw": "/assets/images/works/color/artifact-21-raw.webp",
  "main": "/assets/images/works/formed/artifact-21-main.webp",
  "alt": "ARTIFACT 21"
}
```

> 画像パスは **先頭が `/assets/...`** になっていること（GitHub Pagesで安定します）

---

### 4) SNS（アイコンだけ・タップで外部へ）
- アイコン画像：`assets/images/social/` に配置  
- 遷移先URL：`assets/site.config.json` の `sns.instagramUrl` / `sns.tiktokUrl` を更新

---

## ローカル確認（PCがある場合）
静的サイトなので、どれでもOKです。

例（Python）：
```bash
cd Website
python -m http.server 8000
```
ブラウザで `http://localhost:8000` を開きます。

---

## GitHub Pages 反映（ざっくり）
1. `main` にコミット＆Push
2. GitHub → Settings → Pages  
   - Build and deployment が GitHub Actions か / root どちらでもOK（運用に合わせる）

---

## トラブルシュート

### Matrix が動かない
- 端末の「視差効果を減らす / Reduce Motion」系がONだと止める設計にしている場合があります  
- `assets/js/matrix.js` が読み込まれているか確認

### WORKS のモーダルが古い構造に戻る
- HTMLに旧モーダルが残っていると競合します  
  → **`works-modal.js` が生成する構造に統一**してください（HTML直書きは不要）

---

## メモ
- 追加のフォルダを増やす必要は基本ありません。増やすなら `assets/images/works/` 配下（作品が増える時）くらいです。
- 「完全マトリックス仕様」は **全ページで `matrix.js` を読み込む**ことが前提です。


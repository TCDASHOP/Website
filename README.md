# SAIREN COLOR ARCHIVE - Full Code (Multi-language)

このZIPは「全コード差し替え」用の完全セットです。

## 構成
- `Website/` があなたのリポジトリ内の `Website/` フォルダに対応します。
- ルートページは1セット（/index.html など）で動作し、言語は `?lang=` で切替。
- `Website/ja/` `Website/en/` ... は「各言語URL用のリダイレクトページ」です。
  - 例：`/en/index.html` → `/?lang=en` に自動転送

## 必ずやること（展開後）
1) このZIPの `Website/` を、あなたのリポジトリの `Website/` に **上書き**します。
2) `Website/assets/site.config.json` を編集
   - `sns.instagramUrl` と `sns.tiktokUrl`
   - `works` を20件ぶんに増やす（raw/main のパスはあなたの実ファイルに合わせる）
3) 画像の置き場所を確認（このZIPには画像そのものは含めません）
   - OGP: `Website/assets/og/og-home-1200x630.png`
   - SNS: `Website/assets/images/social/Instagram-logo.png` / `TikTok-logo.png`
   - favicon一式: `Website/assets/favicons/`

## 何が実現されるか
- 言語選択（ja/en/es/fr/ko/zh-hans）でサイト内表示を同期
- WORKS：タップでモーダル表示、RAW/MAIN切替
- 左上サイト名：クリックでHOME、色は毎回ランダム
- SNSアイコン追加（設定ファイルのURLに連動）
- OGP + favicon 設定済み

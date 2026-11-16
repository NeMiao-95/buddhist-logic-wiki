# 仏教論理学・認識論研究Wiki (Buddhist Logic Wiki)

> **公開サイト (Production)**: [https://nemiao-95.github.io/buddhist-logic-wiki/](https://nemiao-95.github.io/buddhist-logic-wiki/)
> **リポジトリ**: [NeMiao-95/buddhist-logic-wiki](https://github.com/NeMiao-95/buddhist-logic-wiki)

---

## 1. プロジェクト概要 (Project Overview)

本プロジェクトは、インド仏教認識論・論理学（プラマーナ学派：Diṅnāga / 陳那、Dharmakīrti / 法称、Dharmottara / 法上 等）の原典・文献学研究成果を体系的に集積し、Web上に公開するためのデジタルナレッジベース（Digital Garden）である。

孤立した用語集ではなく、**命題三つ組（SPO：主語・述語・目的語）**と**概念連関ネットワーク（Graph View）**を通じて、思想史・論理的推論構造を有機的に可視化することを目的とする。

---

## 2. 言語ポリシー (Language Policy)

- **主言語（Single Source of Truth）: 日本語 (`content/ja/`)**
  - 日本の仏教学・インド哲学研究の高度な文献学的水準に準拠した詳細な記述・典拠（原典テキスト）を第一に作成する。
- **派生言語: 英語 (`content/en/`) & 中国語 (`content/zh/`)**
  - 原則として「日本語版が完成・校閲された後に、AIによって翻訳・生成」するパイプラインを採用する（執筆時の精度低下・概念ブレの防止）。
- **サンスクリット転写**: IAST（国際サンスクリット転写字母：ā, ī, ū, ṛ, ṭ, ṣ 等）を標準表記とする。

---
## 3. ディレクトリ構造 (Directory Layout)

```text
buddhist-logic-wiki/
├── content/                    # コンテンツ本文 (Markdown)
│   ├── index.md                # サイトトップ (ポータル・言語スイッチャー)
│   ├── ja/                     # 【主】日本語詞条・概念カード
│   ├── en/                     # 【副】英語版 (Translated)
│   └── zh/                     # 【副】中国語版 (Translated)
├── quartz/                     # Quartz 5 コアシステム (TypeScript/TSX)
├── quartz.config.yaml          # サイト設定 (タイトル、ロケール ja-JP、テーマ)
├── quartz.layout.ts            # 画面レイアウト・サイドバー・グラフ設定
└── public/                     # ビルド成果物 (GitHub Pages に自動デプロイ)
```

---

## 4. 記事執筆・フォーマット仕様 (Article Standard)

すべての記事は以下の要素を基本構成とする：

1. **Frontmatter**:
   ```yaml
   ---
   title: 概念名 (IAST表記)
   tags: [認識論, プラマーナ, 原典]
   ---
   ```
2. **多言語ナビゲーションバー**（冒頭に配置）：
   ```markdown
   <div style="display: flex; gap: 12px; margin-bottom: 20px; font-size: 0.9em;">
     <span>🌐 他言語版:</span>
     <span>🇯🇵 日本語</span> · 
     <a href="/en/...">🇬🇧 English</a> · 
     <a href="/zh/...">🇨🇳 中文</a>
   </div>
   ```
3. **定義 (Lakṣaṇa)**：原典のサンスクリット原文、チベット訳、漢訳、主要注釈（法上等）を明記。
4. **論理推論図 (Mermaid)**：認識対象（所量）と認識手段（量）、因三相などの因明論理構造を図式化。
5. **双向リンク (`[[...]]`)**：関連概念へのリンクを必ず埋め込み、Graph View の小球ネットワークを成長させる。

---

## 5. 運用ワークフロー (Operation Workflow for AI & User)

### 新規文献・詞条の追加手順
1. **文献のインプット**: ユーザーからOCRテキスト、論文メモ、または指示が提供される。
2. **日本語母版の作成 (`content/ja/`)**: AIが命題を抽出し、論理構造を整理して `content/ja/概念名.md` を作成。
3. **英・中版の翻訳生成 (`content/en/`, `content/zh/`)**: 日本語母版をもとに正確な学術訳語を割り当ててファイルを配置。
4. **ビルド検証**: `npx quartz build` で構文エラー・リンク切れがないか確認。
5. **デプロイ**: Git でコミットし `main` ブランチへ push。GitHub Actions が自動ビルドし、約1分で本番サイトへ反映。

---

## 6. コマンドリファレンス

```bash
# 依存関係のインストール
npm install

# ローカル開発プレビュー (http://localhost:8080)
npx quartz build --serve

# 静的ファイルのビルド
npx quartz build

# 変更のコミットと本番反映
git add .
git commit -m "feat: add new entries"
git push origin main
```


## 7. 人物・著作資料庫

人物は年代順、著作・訳本はアルファベット順の独立検索入口を `east/` に設置する。主Wikiの概念記事と、外部資料から取り込んだ目録は別に保持する。

- `east-portal/`：静的な検索画面。人物・著作の二入口、IAST変音記号を省略した検索、相互参照。
- `east-data/catalog.json`：EASTの規範URLを単位とする52人物・268著作の目録。年代は明示された上下限のみを用い、未知4人物は別群とする。URL階層への帰属を著者・訳者と同一視しない。
- `east-data/archive/`：収集済み公開歴史頁の読み取り版と原HTML。重複版・旧版を含む3022頁であり、3022の独立文献を意味しない。
- `scripts/import-east.py`：原資料からの再生成と全バイト照合。Python標準ライブラリのみを使用する。
- `scripts/build-east.mjs`：UI・目録・収集頁を `public/east/` に配置する。元資料庫のDBや機械固有のパス、作業ログは公開物に含めない。

```bash
# 初回のみ、または収集資料を更新した場合（引数は実際の元資料庫の場所）
python3 scripts/import-east.py --source /path/to/EAST-offline
python3 scripts/import-east.py --source /path/to/EAST-offline --check

# 主Wikiと資料庫をまとめてビルドする
npm ci
npm run build:site

# 生成物をローカル閲覧する
python3 -m http.server 8080 --directory public
```

`npx quartz build` 単独では資料庫の配置を行わない。公開用生成物は `npm run build:site` の `public/` を用いる。プロジェクト下位パスでも相対リンクで動作する。

資料の出典・スナップショット日時は目録に保持し、画面では各項目の「詳細・出典」から参照できる。収集した歴史頁は時点が混在し、現行EASTの完全なバックエンドデータを意味しない。権利は原著者・原サイトに帰属し、WikiのコードのMITライセンスを外部本文に適用しない。

この変更はローカルの作業ブランチで準備したものであり、GitHub Pagesへ自動公開するワークフローの追加やpushを含まない。現在の公開出力は `gh-pages`、今回の変更基準はWiki本文のある `main`（`0c2227c`）である。公開時には既存の公開方法でビルド済み `public/` を反映する。

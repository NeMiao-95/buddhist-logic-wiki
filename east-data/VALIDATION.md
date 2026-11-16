# EAST 移入検証

結果：PASS。3022件のHTML読み取り版と3022件の原HTMLを、原ファイルからバイト単位で保存・照合した。原HTMLのSHA-256は全3022件でpages.jsonl記録値に一致した。

人物52件、著作268件。年代：完全44件、片側不明4件、両側不明4件。Persons索引と人物原頁の数値範囲は全件一致。未知の人物はdateStart=nullとして末尾に配置する。

原作以外の翻訳版を含む。人物URL階層は著者同定を意味しない。authorRawはh1のauthor要素だけを採用し、欠落時はnull。人物索引の列挙対象は191件、author要素が存在しない著作は75件。

氏名は人物頁h1、著作名はh1 span.titleから抽出し、書目内の近代研究者名は人物として採用しない。表示名は原表記を維持し、alphabetKeyのみUnicode NFD・結合変音除去・casefold・先頭記号除去で派生する。本文の改変、歴史情報の補筆、年代推測は行っていない。

取得元URL・Wayback URL・UTC取得日・ローカル読み取り版・原HTMLへのリンクを各レコードに保持した。原収集索引はarchive/source-index.html、読み取り版の戻り先archive/index.htmlは新目録へ接続する。SQLite・収集ログ・端末絶対パスを含む作業メタデータは移入しない。

資料の権利は原著者・原サイトに帰属する。公開履歴資料の回復であり、再配布許諾の確認を意味しない。元サイトの権利表示はarchive/original-html内の原頁で確認できる。

再現：`python3 scripts/import-east.py --source /path/to/EAST-offline`。検証：同コマンド末尾に`--check`を付す。依存はPython 3標準ライブラリのみ。manifest.jsonの相対パス・全ファイルSHA-256、catalog.jsonのハッシュ、validation.jsonを照合できる。

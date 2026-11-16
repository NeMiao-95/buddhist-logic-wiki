#!/usr/bin/env python3
"""EAST 公開歴史ページを決定論的に移入する（標準ライブラリのみ）。

Usage: python3 scripts/import-east.py --source /path/to/EAST-offline [--check]
--check は期待値を再計算して既存成果物の全バイトを検証し、変更しない。
原データ・ネットワークには書き込まない。公開・配備処理は含まない。
"""
import argparse
import hashlib
import json
import re
import shutil
import unicodedata
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children = []

    def text(self):
        return ''.join(c if isinstance(c, str) else c.text() for c in self.children)

    def find(self, tag=None, **attrs):
        return next(self.find_all(tag, **attrs), None)

    def find_all(self, tag=None, **attrs):
        for c in self.children:
            if isinstance(c, Node):
                if (tag is None or c.tag == tag) and all(
                    (v in c.attrs.get(k, '').split() if k == 'class' else c.attrs.get(k) == v)
                    for k, v in attrs.items()
                ):
                    yield c
                yield from c.find_all(tag, **attrs)


class DOM(HTMLParser):
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = self.current = Node()
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in self.VOID:
            self.current = node

    def handle_endtag(self, tag):
        node = self.current
        while node.parent:
            if node.tag == tag:
                self.current = node.parent
                return
            node = node.parent

    def handle_data(self, text):
        self.current.children.append(text)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def alphabet(value):
    """原表記は変更せず、検索・ソート用の派生値だけを作る。"""
    value = ''.join(c for c in unicodedata.normalize('NFD', value) if not unicodedata.combining(c)).casefold()
    return re.sub(r'^[\W_]+', '', value, flags=re.UNICODE)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'east-data')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    source, output = args.source, args.output
    rows = [json.loads(line) for line in (source / 'pages.jsonl').read_text().splitlines()]
    assert len(rows) == 3022 and len({r['url'] for r in rows}) == 3022
    by_hash = {r['id']: r for r in rows}
    assert len(by_hash) == 3022
    persons_rows = [r for r in rows if re.fullmatch(r'/data/\d+/', urlsplit(r['url']).path) and not urlsplit(r['url']).query]
    works_rows = [r for r in rows if re.fullmatch(r'/data/\d+/\d+/', urlsplit(r['url']).path) and not urlsplit(r['url']).query]
    assert len(persons_rows) == 52 and len(works_rows) == 268
    docs = {r['id']: DOM((source / r['html_file']).read_text()).root for r in persons_rows + works_rows}
    index_row = next(r for r in rows if r['url'] == 'https://east.ikga.oeaw.ac.at/data/persons/')
    index = DOM((source / index_row['html_file']).read_text()).root.find(id='notanaccordion')
    headings = {}
    for n, child in enumerate(index.children):
        if not isinstance(child, Node) or child.tag != 'h3':
            continue
        container = next(x for x in index.children[n + 1:] if isinstance(x, Node))
        person_link = next(container.find_all('a'))
        page = by_hash[Path(person_link.attrs['href']).stem]
        headings[page['id']] = (child.text(), {Path(a.attrs['href']).stem for a in container.find_all('a')})
    assert len(headings) == 52

    def provenance(row):
        ts = row['archive_timestamp']
        return dict(sourceUrl=row['url'], archiveUrl=row['archive_url'], archiveTimestamp=ts,
                    archiveDate=f'{ts[:4]}-{ts[4:6]}-{ts[6:8]}',
                    localUrl=f"archive/{row['html_file']}", originalHtmlUrl=f"archive/original-html/{row['id']}.html")

    persons, works = [], []
    for row in persons_rows:
        pid = urlsplit(row['url']).path.strip('/').split('/')[1]
        heading = docs[row['id']].find('h1').text()
        index_heading, linked = headings[row['id']]
        date_page = re.search(r'\([\d?]+-[\d?]+\)$', heading)
        date_index = re.search(r'\([\d?]+–[\d?]+\)', index_heading)
        assert date_page, heading
        dates_page = date_page.group()
        dates_index = date_index.group() if date_index else None
        if dates_index:
            assert dates_index.replace('–', '-') == dates_page
        dates = dates_index or dates_page
        start, end = dates[1:-1].replace('–', '-').split('-')
        start, end = (int(start) if start.isdecimal() else None), (int(end) if end.isdecimal() else None)
        name = heading[:date_page.start()].rstrip()
        assert name == row['title']
        work_ids = [urlsplit(w['url']).path.strip('/').removeprefix('data/') for w in works_rows if urlsplit(w['url']).path.split('/')[2] == pid]
        persons.append(dict(id=pid, name=name, dates=dates, dateStart=start, dateEnd=end,
                            chronologyStatus='complete' if start is not None and end is not None else 'partial' if start is not None or end is not None else 'unknown',
                            headingRaw=heading, personsIndexHeadingRaw=index_heading,
                            datesPageRaw=dates_page, datesIndexRaw=dates_index,
                            chronologySourceUrl=index_row['url'] if dates_index else row['url'],
                            chronologyLocalUrl=f"archive/{index_row['html_file']}" if dates_index else f"archive/{row['html_file']}",
                            workIds=sorted(work_ids), **provenance(row)))
    for row in works_rows:
        wid = urlsplit(row['url']).path.strip('/').removeprefix('data/')
        pid = wid.split('/')[0]
        doc = docs[row['id']]
        title = doc.find('h1').find('span', **{'class': 'title'})
        assert title is not None
        author = doc.find('h1').find('span', **{'class': 'author'})
        related = doc.find(**{'class': 'related-texts'})
        relations = []
        if related:
            for h in related.find_all('h2'):
                siblings = h.parent.children
                pos = siblings.index(h)
                listing = next((x for x in siblings[pos + 1:] if isinstance(x, Node)), None)
                relations.append(dict(labelRaw=h.text(), links=[dict(labelRaw=a.text(), href=a.attrs['href']) for a in listing.find_all('a')] if listing else []))
        works.append(dict(id=wid, personId=pid, name=title.text(), authorRaw=author.text() if author else None,
                          relationship='east-person-path', listedByPerson=row['id'] in headings[next(p['id'] for p in persons_rows if urlsplit(p['url']).path == f'/data/{pid}/')][1],
                          alphabetKey=alphabet(title.text()), headingRaw=doc.find('h1').text(),
                          relatedTexts=relations, **provenance(row)))
    persons.sort(key=lambda p: (p['dateStart'] is None, p['dateStart'] or 0, alphabet(p['name']), p['id']))
    works.sort(key=lambda w: (w['alphabetKey'], w['id']))
    person_ids = {p['id'] for p in persons}
    work_ids = {w['id'] for w in works}
    assert all(w['personId'] in person_ids for w in works)
    assert all(w in work_ids for p in persons for w in p['workIds'])
    timestamps = sorted(r['archive_timestamp'] for r in rows)
    catalog = dict(schemaVersion=1, source=dict(name='EAST — Epistemology and Argumentation in South Asia and Tibet',
                   url='https://east.ikga.oeaw.ac.at/', importedAt='2026-11-16', snapshotMin=timestamps[0], snapshotMax=timestamps[-1], pageCount=len(rows),
                   personsIndex=provenance(index_row)),
                   counts=dict(persons=len(persons), works=len(works), pages=len(rows)), persons=persons, works=works)
    expected = {'catalog.json': encode(catalog)}
    copied = {}
    for folder in ['pages', 'original-html']:
        files = sorted((source / folder).glob('*.html'))
        assert len(files) == 3022
        assert {p.stem for p in files} == set(by_hash)
        for path in files:
            rel = f'archive/{folder}/{path.name}'
            data = path.read_bytes()
            if folder == 'original-html':
                assert digest(data) == by_hash[path.stem]['sha256'], path.name
            copied[rel] = path
    for name in ['style.css', 'index.html', 'summary.json', 'failed-downloads.json', 'unavailable-linked-pages.json', 'README.md']:
        copied[f"archive/{'source-index.html' if name == 'index.html' else name}"] = source / name
    expected['archive/index.html'] = ('<!doctype html><html lang="ja"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=../index.html">'
        '<title>EAST 資料目録</title><p><a href="../index.html">EAST 資料目録に戻る</a></p>'
        '<p><a href="source-index.html">原収集索引（全3022ページ）</a></p></html>\n').encode()
    manifest = []
    for rel, path in sorted(copied.items()):
        data = path.read_bytes()
        manifest.append(dict(path=rel, sourcePath='index.html' if rel == 'archive/source-index.html' else rel.removeprefix('archive/'), bytes=len(data), sha256=digest(data)))
    expected['manifest.json'] = encode(dict(schemaVersion=1, algorithm='sha256', files=manifest,
        sourceMetadata=dict(pagesJsonlSha256=digest((source / 'pages.jsonl').read_bytes())),
        catalogSha256=digest(expected['catalog.json'])))
    statuses = dict(Counter(p['chronologyStatus'] for p in persons))
    report = dict(result='PASS', checks=dict(uniqueSourceUrls=len(rows), canonicalPersons=len(persons), canonicalWorks=len(works),
        chronologyStatus=statuses, unknownPersonIds=[p['id'] for p in persons if p['dateStart'] is None],
        partialPersonIds=[p['id'] for p in persons if p['chronologyStatus'] == 'partial'],
        pageAndRawCounts=3022, sourceRawHashesMatched=3022, copiedFiles=len(copied),
        listedWorks=sum(w['listedByPerson'] for w in works), worksWithoutAuthorSpan=sum(w['authorRaw'] is None for w in works),
        relationIntegrity=True, allDatesSupportedByExplicitHeadings=True),
        notes=['原表記と本文をAIで補完していない。', '人物のURL階層への帰属は翻訳者・著者の同定を意味しない。',
               '原作・翻訳版・同名異IDは別レコードとして保持した。', '年代はEASTが示す概算生存期間の上下限であり、片側不明を存命と解釈しない。',
               '複数時点の歴史的HTML収集であり、現在のサーバーデータベース全量ではない。',
               '権利は原著者・原サイトに帰属する。公開閲覧可能であることから再配布許諾を推定していない。',
               'archive/pagesとarchive/original-html、および原収集索引は元ファイルの全バイトを保持する。'])
    expected['validation.json'] = encode(report)
    expected['VALIDATION.md'] = (f'# EAST 移入検証\n\n結果：PASS。3022件のHTML読み取り版と3022件の原HTMLを、原ファイルからバイト単位で保存・照合した。'
        f'原HTMLのSHA-256は全3022件でpages.jsonl記録値に一致した。\n\n人物52件、著作268件。年代：完全44件、片側不明4件、両側不明4件。'
        f'Persons索引と人物原頁の数値範囲は全件一致。未知の人物はdateStart=nullとして末尾に配置する。\n\n'
        f'原作以外の翻訳版を含む。人物URL階層は著者同定を意味しない。authorRawはh1のauthor要素だけを採用し、欠落時はnull。'
        f'人物索引の列挙対象は{report["checks"]["listedWorks"]}件、author要素が存在しない著作は{report["checks"]["worksWithoutAuthorSpan"]}件。\n\n'
        '氏名は人物頁h1、著作名はh1 span.titleから抽出し、書目内の近代研究者名は人物として採用しない。'
        '表示名は原表記を維持し、alphabetKeyのみUnicode NFD・結合変音除去・casefold・先頭記号除去で派生する。'
        '本文の改変、歴史情報の補筆、年代推測は行っていない。\n\n'
        '取得元URL・Wayback URL・UTC取得日・ローカル読み取り版・原HTMLへのリンクを各レコードに保持した。'
        '原収集索引はarchive/source-index.html、読み取り版の戻り先archive/index.htmlは新目録へ接続する。'
        'SQLite・収集ログ・端末絶対パスを含む作業メタデータは移入しない。\n\n'
        '資料の権利は原著者・原サイトに帰属する。公開履歴資料の回復であり、再配布許諾の確認を意味しない。'
        '元サイトの権利表示はarchive/original-html内の原頁で確認できる。\n\n'
        '再現：`python3 scripts/import-east.py --source /path/to/EAST-offline`。'
        '検証：同コマンド末尾に`--check`を付す。依存はPython 3標準ライブラリのみ。'
        'manifest.jsonの相対パス・全ファイルSHA-256、catalog.jsonのハッシュ、validation.jsonを照合できる。\n').encode()
    failures = []
    for rel, path in copied.items():
        target = output / rel
        if args.check:
            if not target.is_file() or target.read_bytes() != path.read_bytes():
                failures.append(rel)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
    for rel, data in expected.items():
        target = output / rel
        if args.check:
            if not target.is_file() or target.read_bytes() != data:
                failures.append(rel)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    assert not failures, f'一致しない成果物: {failures}'
    print(json.dumps(dict(result='PASS', mode='check' if args.check else 'import', persons=52, works=268, pages=3022,
                          copiedFiles=len(copied), deterministicFiles=len(expected)), ensure_ascii=False))


if __name__ == '__main__':
    main()

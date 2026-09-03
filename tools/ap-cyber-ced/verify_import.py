#!/usr/bin/env python3
"""
verify_import.py - prove a Matrixify page import actually landed.

Usage:
    python3 verify_import.py <sheet.csv> [<live.json>]

With one argument it fetches the live page itself. With two it reads a saved
GET /pages/<handle>.json, so a verification is reproducible offline.

Exit 1 means the live page is NOT what the sheet said. Exit 0 means it is,
allowing for the two things Shopify changes on save.

    WHY A BYTE COMPARISON IS THE WRONG CHECK

Shopify normalises a page body when it stores it, in two ways that look like
damage and are not. Both were measured on the WO-3 Topic 1.1 import, 2026-08-27,
where the stored body came back 556 bytes shorter than the sheet:

  1. HTML ENTITIES ARE DECODED. `&#9733;` is stored as a star, `&bull;` as a
     bullet, `&ldquo;` as a left quotation mark. Entities are longer than the
     characters they encode, so the body shrinks.

     This does not retire the pure-ASCII authoring rule. That rule exists
     because on 2026-08-07 an import double-encoded 2202 characters across five
     pages, and the rule protects the TRANSPORT. Shopify decoding a clean entity
     into a clean character on the far side is the rule working, not failing.
     What this script checks is that the decode was clean: same text, and no
     double-encoded sequences anywhere in the result.

  2. A NEWLINE IS INSERTED between a block element and an inline child that
     opens immediately after it, so `<div class="x"><strong>` comes back as
     `<div class="x">` newline `<strong>`.

So the comparison that means something is: decode the entities on the sheet
side, collapse that inserted whitespace on both, then require equality. A
difference that survives both normalisations is real and this script fails.

The DOM nesting check is here rather than in validate_csv.py because it is the
check that found the original defect. The live Topic 1.1 page had a section that
never closed, and naive tag arithmetic could not see it: a leftover comment held
a <div> that was not markup, which made a broken page look one tag short in
exactly the way a sound page would. Parse it, do not count it.
"""
import csv
import html
import json
import os
import re
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import urllib.request
from html.parser import HTMLParser

csv.field_size_limit(sys.maxsize)

# The four that must survive as entities, or the markup changes meaning.
STRUCTURAL = ('&amp;', '&lt;', '&gt;', '&quot;')

# Structural detection, not a pattern list. What was here was four literal
# strings under a comment claiming they were written as escapes so the
# repository encoding guard would not flag this file. They were literals, the
# comment described an intention nobody implemented, and the corrected guard
# flagged this file on its first run. None of the four could match a corrupted
# emoji. See tools/ap-cyber-ced/mojibake.py.
import mojibake as _mojibake

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'source', 'track', 'wbr'}


def decode_entities(s):
    """Unescape everything except the four structural entities."""
    for i, e in enumerate(STRUCTURAL):
        s = s.replace(e, '%d' % i)
    s = html.unescape(s)
    for i, e in enumerate(STRUCTURAL):
        s = s.replace('%d' % i, e)
    return s


def collapse_tag_gaps(s):
    """Remove the newline Shopify inserts between a block tag and an inline child."""
    return re.sub(r'>\s*\n\s*<', '><', s)


class Nesting(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stack, self.errors = [], []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append('stray </%s>' % tag)
            return
        if self.stack[-1] != tag:
            self.errors.append('expected </%s>, got </%s>' % (self.stack[-1], tag))
            for i in range(len(self.stack) - 1, -1, -1):
                if self.stack[i] == tag:
                    del self.stack[i:]
                    return
            return
        self.stack.pop()


def nesting_report(body):
    p = Nesting()
    # blank out script and style bodies: a "<" inside JS is not markup
    p.feed(re.sub(r'(<(script|style)[^>]*>)[\s\S]*?(</\2>)', r'\1\3', body))
    return p.errors, p.stack


#  Cloudflare 403s the default Python-urllib User-Agent. It also blocks the
#  non-www host outright. Both cost a session once; neither is worth
#  rediscovering.
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0 Safari/537.36')


def read_live(handle, path=None):
    if path:
        return json.load(open(path, encoding='utf-8'))['page']
    url = 'https://www.apcsexamprep.com/pages/%s.json' % handle
    req = urllib.request.Request(url, headers={'User-Agent': UA,
                                               'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)['page']
    except urllib.error.HTTPError as e:
        raise SystemExit(
            'GET %s returned %s.\n'
            'If this is 403, the request did not carry a browser User-Agent or went\n'
            'to the non-www host. Otherwise fetch it yourself and pass the file:\n'
            '  ./fetch_pages.sh ./verify\n'
            '  python3 verify_import.py <sheet.csv> ./verify/%s.json'
            % (url, e.code, handle))


def main():
    if len(sys.argv) < 2:
        print(__doc__.strip().split('\n\n')[1])
        return 2
    rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8-sig')))
    live_path = sys.argv[2] if len(sys.argv) > 2 else None

    failed = 0
    for row in rows:
        handle = row.get('Handle', '?')
        sent = row.get('Body HTML') or ''
        if not sent:
            print('SKIP  %s   row updates no body' % handle)
            continue

        page = read_live(handle, live_path)
        live = page['body_html']
        notes = ['updated_at %s' % page.get('updated_at'),
                 'sheet %d bytes, live %d bytes' % (len(sent), len(live))]
        bad = []

        a = collapse_tag_gaps(decode_entities(sent))
        b = collapse_tag_gaps(live)
        if a != b:
            n = min(len(a), len(b))
            i = 0
            while i < n and a[i] == b[i]:
                i += 1
            bad.append('bodies differ after normalisation, first at offset %d\n'
                       '        sheet: %r\n        live : %r'
                       % (i, a[i - 80:i + 160], b[i - 80:i + 160]))

        hits = _mojibake.analyze(live, cap=3)
        if hits:
            bad.append('double-encoded sequence in the live body: '
                       + ', '.join('%r should be %r' % (h['chunk'], h['fixed']) for h in hits))

        errors, unclosed = nesting_report(live)
        if errors or unclosed:
            bad.append('DOM nesting: %d error(s), %d unclosed: %s'
                       % (len(errors), len(unclosed), (errors + unclosed)[:4]))

        print(('PASS  ' if not bad else 'FAIL  ') + handle)
        for n in notes:
            print('        note  ' + n)
        for x in bad:
            print('        ' + x)
        failed += bool(bad)

    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())

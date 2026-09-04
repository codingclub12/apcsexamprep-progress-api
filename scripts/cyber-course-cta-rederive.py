#!/usr/bin/env python3
"""Re-derive the course practice band from the sheet, independently of the generator.

Nothing here imports the generator. The sheet is parsed back from bytes and diffed
against the captured live bodies, and the claim under test is ORDINAL rather than
existential: the practice hub must move from absent or last to the front of each
page's anchor list. "The page links the practice hub" was already true of the
course guide, from anchor 247 of 247, so a presence check would have reported a
fix that had not happened.

    python3 scripts/cyber-course-cta-rederive.py [<sheet.csv> <fixtures-dir>]
"""
import csv
import difflib
import json
import re
import sys
from pathlib import Path

csv.field_size_limit(10 ** 9)
ROOT = Path(__file__).resolve().parent.parent
checks, fails = [], []

EM_DASH = '—'
MARK = '<!-- apcs-course-practice-cta -->'
HUB = 'ap-cybersecurity-practice'
EXAM = 'ap-cybersecurity-practice-exam'
TOP_N = 4


def ok(label, cond, detail=''):
    checks.append(cond)
    print(f"  {'ok  ' if cond else 'FAIL'}  {label}{f'  [{detail}]' if detail and not cond else ''}")
    if not cond:
        fails.append(label)


def anchors(s):
    return re.findall(r'href="[^"]*/pages/([^"\'#?]+)', s)


sheet_path = Path(sys.argv[1] if len(sys.argv) > 1
                  else ROOT / 'imports/2026-09-04e/cyber-course-practice-cta-pages.csv')
fixtures = Path(sys.argv[2] if len(sys.argv) > 2
                else ROOT / 'smoke/fixtures/live-bodies')

raw = sheet_path.read_bytes()
ok('the sheet is written with a BOM', raw.startswith(b'\xef\xbb\xbf'))
rows = list(csv.DictReader(raw.decode('utf-8-sig').splitlines(True)))
ok('two rows, one per course page', len(rows) == 2, len(rows))
ok('both are MERGE', all(r['Command'] == 'MERGE' for r in rows))
ok('the sheet has no column but Handle, Command and Body HTML, so none is blanked',
   all(list(r.keys()) == ['Handle', 'Command', 'Body HTML'] for r in rows),
   list(rows[0].keys()))
ok('it targets the two course entry pages',
   sorted(r['Handle'] for r in rows)
   == ['ap-cybersecurity', 'ap-cybersecurity-complete-course-guide'],
   [r['Handle'] for r in rows])

bank = json.loads((ROOT / 'config/cyber-exam-items.json').read_text(encoding='utf-8'))
mcq = len(bank['items'])

# -- the ordinal claim, page by page -----------------------------------------
#  Where the hub sat before, stated per page so a silent regression on either
#  one is visible rather than averaged away.
EXPECTED_BEFORE = {
    'ap-cybersecurity': None,                              # absent
    'ap-cybersecurity-complete-course-guide': 'last',      # 247 of 247
}

for row in rows:
    h = row['Handle']
    new = row['Body HTML']
    live = (fixtures / f'{h}.html').read_text(encoding='utf-8')
    a_live, a_new = anchors(live), anchors(new)
    at_live = a_live.index(HUB) if HUB in a_live else -1
    at_new = a_new.index(HUB) if HUB in a_new else -1

    want = EXPECTED_BEFORE[h]
    if want is None:
        ok(f'{h}: the live body did not link the practice hub at all', at_live == -1,
           f'found at {at_live + 1} of {len(a_live)}')
    else:
        ok(f'{h}: the live body linked it last, {len(a_live)} of {len(a_live)}',
           at_live == len(a_live) - 1, f'{at_live + 1} of {len(a_live)}')

    ok(f'{h}: the new body links it inside the first {TOP_N} anchors',
       0 <= at_new < TOP_N, f'{at_new + 1} of {len(a_new)}')

    # -- nothing deleted, by diff ---------------------------------------------
    sm = difflib.SequenceMatcher(None, live, new, autojunk=False)
    ops = sm.get_opcodes()
    dels = [(i1, i2) for tag, i1, i2, _a, _b in ops if tag in ('delete', 'replace')]
    ins = [(j1, j2) for tag, _a, _b, j1, j2 in ops if tag in ('insert', 'replace')]
    ok(f'{h}: not one character of the live body was deleted or replaced', not dels,
       '; '.join(f'{live[a:b][:70]!r}' for a, b in dels[:2]))
    ok(f'{h}: there is exactly one insertion, the band', len(ins) == 1, ins)
    ok(f'{h}: the insertion accounts for the whole size change',
       sum(b - a for a, b in ins) == len(new) - len(live))

    # -- the band itself ------------------------------------------------------
    ok(f'{h}: the band carries its marker exactly once', new.count(MARK) == 1, new.count(MARK))
    band = new[new.index(MARK):new.index(MARK) + 900]
    ok(f'{h}: the band links the practice hub and the full practice exam',
       f'/pages/{HUB}' in band and f'/pages/{EXAM}' in band)
    ok(f'{h}: the band states the item bank\'s own question count',
       f'{mcq} multiple choice' in band, mcq)
    ok(f'{h}: the band adds exactly two anchors',
       len(re.findall(r'<a\b', new, re.I)) - len(re.findall(r'<a\b', live, re.I)) == 2)

    # -- markup only ----------------------------------------------------------
    ok(f'{h}: no stylesheet was added, removed or edited',
       re.findall(r'<style[\s\S]*?</style>', new) == re.findall(r'<style[\s\S]*?</style>', live))
    ok(f'{h}: no script was added, removed or edited',
       re.findall(r'<script[\s\S]*?</script>', new) == re.findall(r'<script[\s\S]*?</script>', live))
    ok(f'{h}: div tags still balance',
       len(re.findall(r'<div\b', new)) - len(re.findall(r'</div>', new))
       == len(re.findall(r'<div\b', live)) - len(re.findall(r'</div>', live)))

    # -- content rules on the band only --------------------------------------
    ok(f'{h}: the band carries no em-dash', EM_DASH not in band)
    ok(f'{h}: the band carries no EK code', not re.search(r'\b\d\.\d\.[A-Z]\.\d\b', band))
    ok(f'{h}: the band states no per-unit exam weighting',
       not re.search(r'\b\d{1,2}\s?%|\bpercent\b', band))

print()
if fails:
    print(f'FAIL - {len(fails)} of {len(checks)} re-derived checks did not hold')
    for f in fails:
        print(f'  - {f}')
    sys.exit(1)
print(f'OK - {len(checks)} checks re-derived from the sheet by diff, independently of the generator')

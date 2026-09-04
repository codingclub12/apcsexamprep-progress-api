#!/usr/bin/env python3
"""Re-derive the practice hub repair from the sheet, independently of the generator.

The generator proves "nothing was lost" by checking a list of markers it declares.
That is a list, and a list cannot report that it has stopped covering the page: it
is the same shape as the stale-count patterns that let two wrong numbers onto the
practice exam earlier today.

So this proves the stronger property a different way, by DIFF. Every character of
the live body must still be present in the sheet's body, in the same order, and
every difference must be an insertion. One deletion of any size fails, whether or
not anybody thought to declare a marker for it.

    python3 scripts/cyber-hub-spokes-rederive.py [<sheet.csv> <live-body.html>]
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


def ok(label, cond, detail=''):
    checks.append(cond)
    print(f"  {'ok  ' if cond else 'FAIL'}  {label}{f'  [{detail}]' if detail and not cond else ''}")
    if not cond:
        fails.append(label)


sheet_path = Path(sys.argv[1] if len(sys.argv) > 1
                  else ROOT / 'imports/2026-09-04d/cyber-practice-hub-spokes-pages.csv')
live_path = Path(sys.argv[2] if len(sys.argv) > 2
                 else ROOT / 'smoke/fixtures/live-bodies/ap-cybersecurity-practice.html')

raw = sheet_path.read_bytes()
ok('the sheet is written with a BOM', raw.startswith(b'\xef\xbb\xbf'))
rows = list(csv.DictReader(raw.decode('utf-8-sig').splitlines(True)))
ok('one row, so a MERGE touches one page', len(rows) == 1, len(rows))
row = rows[0]
ok('it targets ap-cybersecurity-practice',
   row['Handle'] == 'ap-cybersecurity-practice', row['Handle'])
ok('the command is MERGE', row['Command'] == 'MERGE', row['Command'])
ok('the sheet has no column but Handle, Command and Body HTML, so none is blanked',
   list(row.keys()) == ['Handle', 'Command', 'Body HTML'], list(row.keys()))

new = row['Body HTML']
live = live_path.read_text(encoding='utf-8')
ok('the Body HTML cell is not empty, which under MERGE erases the page', len(new) > 10000, len(new))

# -- THE PROPERTY THAT MATTERS, BY DIFF RATHER THAN BY MARKER LIST ------------
sm = difflib.SequenceMatcher(None, live, new, autojunk=False)
ops = sm.get_opcodes()
deletions = [(i1, i2) for tag, i1, i2, _j1, _j2 in ops if tag in ('delete', 'replace')]
insertions = [(j1, j2) for tag, _i1, _i2, j1, j2 in ops if tag in ('insert', 'replace')]
ok('not one character of the live body was deleted or replaced',
   not deletions,
   '; '.join(f'live[{a}:{b}] = {live[a:b][:90]!r}' for a, b in deletions[:3]))
ok('the new body is exactly the live body plus insertions',
   sum(b - a for a, b in insertions) == len(new) - len(live),
   f'{sum(b - a for a, b in insertions)} inserted, {len(new) - len(live)} net')
ok('there are exactly two insertions, the stylesheet and the link block',
   len(insertions) == 2, [(a, b) for a, b in insertions])

# -- and the same diff against the sheet that was already sitting in imports/ --
stale_path = ROOT / 'imports/2026-09-04/cyber-practice-hub-links-pages.csv'
if stale_path.exists():
    stale_rows = list(csv.DictReader(
        stale_path.read_bytes().decode('utf-8-sig').splitlines(True)))
    stale = next((r['Body HTML'] for r in stale_rows
                  if r['Handle'] == 'ap-cybersecurity-practice'), None)
    ok('the stale sheet still carries a row for this handle', stale is not None)
    if stale is not None:
        s_ops = difflib.SequenceMatcher(None, live, stale, autojunk=False).get_opcodes()
        s_del = [(i1, i2) for tag, i1, i2, _a, _b in s_ops if tag in ('delete', 'replace')]
        ok('THE FINDING, re-derived: that sheet DOES delete part of the live body',
           bool(s_del),
           'no deletion found, which would contradict the whole change')
        lost = sum(b - a for a, b in s_del)
        ok('and what it deletes is a Question of the Day block of about 722 characters',
           700 <= lost <= 740 and any('practice-kind="daily"' in live[a:b] for a, b in s_del),
           f'{lost} characters')

# -- the edge this exists to add ---------------------------------------------
spokes = [f'ap-cybersecurity-unit-{n}-practice' for n in range(1, 6)]
ok('the live body links none of the five spokes, which is the defect',
   not any(s in live for s in spokes), [s for s in spokes if s in live])
ok('the new body links all five',
   all(f'/pages/{s}' in new for s in spokes), [s for s in spokes if f'/pages/{s}' not in new])
ok('each anchor is labelled with its unit, not with a bare handle',
   all(re.search(rf'/pages/{s}"[^>]*>Unit {n} practice: ', new)
       for n, s in enumerate(spokes, 1)))
ok('and no spoke is linked twice',
   all(new.count(f'/pages/{s}"') == 1 for s in spokes),
   {s: new.count(f'/pages/{s}"') for s in spokes})

# -- the block is well formed -------------------------------------------------
ok('div tags balance across the insertion',
   len(re.findall(r'<div\b', new)) - len(re.findall(r'</div>', new))
   == len(re.findall(r'<div\b', live)) - len(re.findall(r'</div>', live)),
   f"{len(re.findall(r'<div', new))}/{len(re.findall(r'</div>', new))}")
ok('the script count did not change, so nothing was inserted into one',
   len(re.findall(r'<script', new)) == len(re.findall(r'<script', live)))
ok('the authored block carries no em-dash',
   '—' not in new[len(live) - 1:])
ok('and no mojibake lead followed by a continuation character',
   not re.search(r'[Â-ô][-¿€‘’“”–—•]',
                 new[len(live) - 1:]))

print()
if fails:
    print(f'FAIL - {len(fails)} of {len(checks)} re-derived checks did not hold')
    for f in fails:
        print(f'  - {f}')
    sys.exit(1)
print(f'OK - {len(checks)} checks re-derived from the sheet by diff, independently of the generator')

#!/usr/bin/env python3
"""Re-derive the 1.2 quiz badge repair from the sheet, independently of the generator.

The generator writes the CSV with its own quoting and then checks its own output
with its own string logic. That proves the two halves agree with each other and
nothing more. This reads the file the way an importer does, with a different
language's CSV parser, and asks the only question that matters:

    is this sheet the live body plus exactly two substitutions, and nothing else?

That is a stronger claim than any marker list, because it cannot go stale. A
marker list has to be told what to look for; a reconstruction fails on a change
nobody anticipated.

    python3 scripts/cyber-12-quiz-badge-rederive.py [<sheet.csv> [<live-body.html>]]

ON READING THE FILE. The Body HTML cell holds embedded newlines, so the text has
to reach the csv reader with its line terminators intact. Splitting it with a
bare splitlines() first drops them and invents 277 phantom deletions, which is
exactly what the first draft of this check reported.
"""
import csv
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

csv.field_size_limit(10 ** 9)
ROOT = Path(__file__).resolve().parent.parent
HANDLE = 'ap-cyber-unit-1-lesson-2-quiz'
PAGE_ID = '132288872663'
fails = []


def ok(label, cond, detail=''):
    print(f"  {'ok  ' if cond else 'FAIL'}  {label}{f'  [{detail}]' if detail and not cond else ''}")
    if not cond:
        fails.append(label)


sheet_path = Path(sys.argv[1] if len(sys.argv) > 1
                  else ROOT / 'imports/2026-09-09-cyber-12-quiz-badge/Pages cyber-12-quiz-badge.csv')
live_path = Path(sys.argv[2] if len(sys.argv) > 2
                 else ROOT / 'smoke/fixtures/live-bodies' / f'{HANDLE}.html')

print(f'REDERIVE {sheet_path.name}')

raw = sheet_path.read_bytes()
ok('the sheet is written with a BOM', raw.startswith(b'\xef\xbb\xbf'))
ok('the sheet is written with CRLF line endings', b'\r\n' in raw)

rows = list(csv.DictReader(raw.decode('utf-8-sig').splitlines(True)))
ok('one row, so a MERGE touches one page', len(rows) == 1, len(rows))
row = rows[0]
ok(f'it targets {HANDLE}', row['Handle'] == HANDLE, row['Handle'])
ok('it carries the live page id', row['ID'] == PAGE_ID, row['ID'])
ok('the command is MERGE', row['Command'] == 'MERGE', row['Command'])

new = row['Body HTML']
live = live_path.read_text(encoding='utf-8')
ok('the Body HTML cell is not empty, which under MERGE erases the page', len(new) > 30000, len(new))

# -- THE LOAD-BEARING CLAIM --------------------------------------------------
#  Rebuild the sheet from live by hand and require byte equality. Every other
#  assertion below is a named reason, useful when this one fails; none of them
#  can substitute for it.
SUBS = [('>12 Questions<', '>5 Questions<'), ('>~25 min<', '>~10 min<')]
rebuilt = live
for old, repl in SUBS:
    ok(f'{old!r} appears exactly once in the live body', live.count(old) == 1, live.count(old))
    rebuilt = rebuilt.replace(old, repl)
ok('the sheet IS the live body plus exactly those two substitutions', rebuilt == new)

sm = difflib.SequenceMatcher(None, live, new, autojunk=False)
edits = [op for op in sm.get_opcodes() if op[0] != 'equal']
ok('the differ finds exactly two edits', len(edits) == 2, len(edits))
for tag, i1, i2, j1, j2 in edits:
    print(f'        {tag:<8} {live[i1:i2]!r} -> {new[j1:j2]!r}  @{i1}')

# -- WHAT THE PAGE NOW SAYS --------------------------------------------------
ok('the badge advertises 5 Questions', '>5 Questions<' in new)
ok('the badge advertises ~10 min', '>~10 min<' in new)
ok('no stale count survived', '>12 Questions<' not in new)
ok('no stale duration survived', '>~25 min<' not in new)
ok('the blurb it is being reconciled to is still there',
   '5 questions, about 10 minutes' in new)

# -- THE MOUNT IS WHAT MAKES THE TEACHER'S LOCK REAL -------------------------
#  Assert its SHAPE, not a substring. 'data-apcs-quiz' is a substring of
#  'data-apcs-quizX', and the first draft of this rule passed a mount that had
#  been renamed out from under it.
MOUNT = re.compile(r'data-apcs-quiz(?=[\s>])[^>]*?data-course="ap-cybersecurity"'
                   r'[^>]*?data-lesson="1\.2"[^>]*?data-activity="quiz"')
ok('the live page carries exactly one 1.2 quiz mount', len(MOUNT.findall(live)) == 1)
ok('and the sheet still carries exactly one, unmoved', len(MOUNT.findall(new)) == 1)

# -- THE SERVER IS THE AUTHORITY ON THE COUNT --------------------------------
#  Ask it. A sheet that advertises a number the bank does not hold is the same
#  defect as the one being repaired, pointed the other way. curl, because
#  urllib's own User-Agent draws a 403 from this host.
try:
    pool = json.loads(subprocess.check_output(
        ['curl', '-sS', '--max-time', '20',
         'https://progress.apcsexamprep.com/api/quiz/ap-cybersecurity/unit-1/1.2/quiz'],
        stderr=subprocess.DEVNULL))['pool']
except Exception as exc:                                   # noqa: BLE001
    pool = None
    print(f'  ....  the quiz API could not be reached ({exc.__class__.__name__}), '
          f'so the count is unconfirmed against the server')
if pool is not None:
    ok(f'the sheet advertises the count the server serves (pool={pool})',
       f'>{pool} Questions<' in new)

print()
print(f'{len(fails)} check(s) failed.' if fails else 'REDERIVE OK')
sys.exit(1 if fails else 0)

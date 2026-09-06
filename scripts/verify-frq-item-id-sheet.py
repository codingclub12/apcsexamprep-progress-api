#!/usr/bin/env python3
"""Re-derive the FRQ attribute sheet from the raw artifact, in another language.

    python3 scripts/verify-frq-item-id-sheet.py

scripts/cyber-frq-item-id-sheet.js writes the sheet AND checks it, with a parser
it wrote for the purpose. That proves the two halves agree with each other and
nothing more, which is the failure this repo keeps paying for. So this reads the
same two files with Python's own csv module, knows nothing about the generator,
and answers one question from scratch: is the body in this sheet exactly the live
body it was built from, minus one attribute?

Offline on purpose. It works from the committed before-body rather than fetching
the page, so it still answers years from now, and so a network failure cannot make
it pass by finding nothing. Whether the LIVE page changed is a different question,
and the deploy gate's live check is where that belongs.

No em-dashes, per repo convention.
"""
import csv
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BASE = os.path.join(ROOT, 'imports', '2026-09-06', 'cyber-unit1-frq-item-id-pages')
HANDLE = 'ap-cyber-unit-1-frq-practice'
ATTR = ' data-item-id="unit-1-frq"'

# A page body runs well past the default field cap.
csv.field_size_limit(10 ** 9)

problems = []


def check(label, condition, detail=''):
    print(('  [PASS] ' if condition else '  [FAIL] ') + label + (('  ' + detail) if detail else ''))
    if not condition:
        problems.append(label)


def main():
    with io.open(BASE + '.before.json', encoding='utf-8') as fh:
        before = json.load(fh)[HANDLE]
    with io.open(BASE + '.csv', encoding='utf-8-sig', newline='') as fh:
        rows = list(csv.reader(fh))

    print('re-derive: ' + os.path.relpath(BASE + '.csv', ROOT))
    check('the sheet has a header and exactly one data row', len(rows) == 2, str(len(rows)) + ' rows')
    if len(rows) != 2:
        return 1

    header, row = rows[0], rows[1]
    check('the columns are the three Matrixify knows',
          header == ['Handle', 'Command', 'Body HTML'], str(header))
    check('the row addresses the right page', row[0] == HANDLE, row[0])
    check('the command is MERGE', row[1] == 'MERGE', row[1])

    body = row[2]

    # The whole claim, stated as an equality rather than as a search. A search
    # for the removed attribute would pass on a body that lost other things too.
    check('the sheet body is the live body with the attribute removed, byte for byte',
          body == before.replace(ATTR, '', 1),
          '%d chars vs %d' % (len(body), len(before)))

    check('the live body carried the attribute exactly once',
          before.count('data-item-id') == 1, str(before.count('data-item-id')))
    check('the sheet body carries no data-item-id at all',
          'data-item-id' not in body, str(body.count('data-item-id')))
    check('exactly the attribute is gone, no more and no less',
          len(before) - len(body) == len(ATTR),
          'delta %d, attribute %d' % (len(before) - len(body), len(ATTR)))

    # The things that must SURVIVE. A body rewrite that quietly dropped the
    # wrapper, the timer or the self-score copy would satisfy every check above.
    for marker in ('<div id="cfrq"', 'data-course="ap-cybersecurity"',
                   'data-lesson-id="unit-1-frq"', 'data-activity="frq"',
                   'self-score', '50:00'):
        check('kept: ' + marker, marker in body)

    print('')
    if problems:
        print('%d PROBLEM(S): %s' % (len(problems), '; '.join(problems)))
        return 1
    print('RE-DERIVED OK: sheet body == live body minus %r, %d chars' % (ATTR, len(body)))
    return 0


if __name__ == '__main__':
    sys.exit(main())

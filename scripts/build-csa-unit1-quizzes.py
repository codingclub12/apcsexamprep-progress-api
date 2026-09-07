#!/usr/bin/env python3
"""
Rebuild the AP CSA Unit 1 topic quizzes from the live lesson pages.

    node scripts/extract-csa-quiz-items.js > items.json
    python3 scripts/build-csa-unit1-quizzes.py items.json <outdir>

WHY THE SHIPPED QUIZZES CANNOT BE REPAIRED IN PLACE
All fifteen print their multiple-choice stems with NO ANSWER OPTIONS. Topic 1.7
question 1 reads "Which of these is a behavior?" and stops; the teacher key says
"Answer: C" of a list that is not on the page. A student cannot answer it and a
teacher cannot grade it. Items 4 to 7 are worse: they read "Explain why this is
wrong: <heading>", and those headings hold the TRUE rule, so the sheet asks a
student to refute "A constructor has no return type" and "String immutability".

The options were never in the documents, so there is nothing to recover. They are
on the lesson pages, where the same students meet the auto-graded version, so the
quiz is rebuilt from the page.

THIS IS A REPLACEMENT, NOT A RESTORATION
The page's items are not the old key's items: live 1.7 question 1 is a different
stem answered B where the old key says C. The old keys do not carry over. What
this buys, besides a usable quiz, is that the header line becomes true: the
printed questions really are the ones auto-graded at that handle.

WHAT IS DROPPED, AND WHY IT HAS TO BE
An item whose options are not distinguishable ON PAPER is unanswerable in print
even when it is fine on screen. 1.3 has one: options C and D are the same three
lines differing only by a trailing newline, invisible once printed. Those items
are excluded and named in the report rather than silently kept or silently
dropped.

No em-dashes, per repo convention.
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from csa_kit.notes import build_quiz

WANT = 6


def usable(item):
    """An item a teacher can print and a student can answer."""
    opts = [o.strip() for o in item['options']]
    if len(opts) < 3:
        return False, 'fewer than three options'
    if len(set(opts)) != len(opts):
        return False, 'two options are identical once printed'
    if not item['stem'].strip():
        return False, 'no stem'
    if not (0 <= item['answer_index'] < len(opts)):
        return False, 'answer index out of range'
    if not item['why'].strip():
        return False, 'no rationale for the key'
    return True, ''


def main():
    src, outdir = sys.argv[1], sys.argv[2]
    data = json.load(open(src, encoding='utf-8'))
    report = []
    for topic in sorted(data, key=lambda t: float(t.split('.')[1])):
        v = data[topic]
        kept, dropped = [], []
        for k, it in enumerate(v['items'], 1):
            ok, why = usable(it)
            if ok and len(kept) < WANT:
                kept.append(it)
            elif not ok:
                dropped.append((k, it.get('item_id') or '?', why))
        if not kept:
            report.append((topic, 0, dropped, 'NO USABLE ITEMS'))
            continue
        qs = [{'stem': i['stem'], 'options': i['options'],
               'answer_index': i['answer_index'], 'why': i['why']} for i in kept]
        d = os.path.join(outdir, 'Lesson_%s' % topic, 'Quiz')
        os.makedirs(d, exist_ok=True)
        for key_edition, name in ((False, 'Quiz_STUDENT.docx'), (True, 'Quiz_KEY.docx')):
            build_quiz(os.path.join(d, name), topic, v['title'], v['handle'], qs, key_edition)
        report.append((topic, len(kept), dropped, ''))

    print('%-7s %-6s %s' % ('topic', 'items', 'excluded'))
    total = 0
    for topic, n, dropped, err in report:
        total += n
        note = err or ('' if not dropped else '; '.join('#%d %s' % (k, w) for k, _, w in dropped))
        print('  %-7s %-6d %s' % (topic, n, note))
    print()
    print('%d questions written across %d topics' % (total, len(report)))


if __name__ == '__main__':
    main()

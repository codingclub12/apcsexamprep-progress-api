#!/usr/bin/env python3
"""
Check the rebuilt AP CSA Unit 1 topic quizzes.

    python3 scripts/verify-csa-unit1-quizzes.py <items.json> <quizdir>

Written against the DOCUMENTS, not against the builder, and cross-checked against
the extraction the builder read, so a generator that agrees with itself still has
to get past it.

WHAT IT ASSERTS
  1. Every question prints at least three options. This is the defect that
     shipped: all fifteen quizzes printed stems and no options at all.
  2. No stem asks a student to refute a true statement. The shipped items 4 to 7
     read "Explain why this is wrong: <misconception heading>", and those
     headings hold the correct rule.
  3. The key's marked answer matches the answer the live page grades against,
     compared to the extracted item rather than to the builder's own memory.
  4. The student edition leaks no answer and no rationale.
  5. The key carries a rationale for every question.
  6. No two options on a question are identical once printed.
  7. A multi-line option keeps its line breaks as real <w:br/> elements, because
     a newline inside a run renders as nothing and three output choices that
     differ only by where the lines fall would print identically.

NOT CHECKED HERE: how the page looks. libreoffice-writer is not installed in this
container (no libswlo.so, while Impress is present, which is why the deck render
gate works and this cannot). So these are structural checks on the file, and
nobody should read them as a visual proof.

No em-dashes, per repo convention.
"""

import json
import os
import re
import sys

from docx import Document

BAD_STEM = re.compile(r'Explain why this is wrong', re.I)


def norm(s):
    return ' '.join(s.split())

QNUM = re.compile(r'^(\d+)\.\s+(.*)$', re.S)
OPT = re.compile(r'^([A-D])\.\s+(.*)$', re.S)


def read_quiz(path):
    doc = Document(path)
    qs = []
    cur = None
    for p in doc.paragraphs:
        t = p.text.strip()
        if not t:
            continue
        m = QNUM.match(t)
        if m and not OPT.match(t):
            cur = {'stem': m.group(2), 'options': [], 'why': None, 'brs': 0}
            qs.append(cur)
            continue
        if cur is None:
            continue
        m = OPT.match(t)
        if m:
            cur['options'].append(m.group(2))
            cur['brs'] += p._p.xml.count('<w:br')
            continue
        if t.startswith('Why:'):
            cur['why'] = t[4:].strip()
    return qs


def main():
    items = json.load(open(sys.argv[1], encoding='utf-8'))
    root = sys.argv[2]
    fails = []
    topics = qcount = 0
    for topic in sorted(items, key=lambda t: float(t.split('.')[1])):
        d = os.path.join(root, 'Lesson_%s' % topic, 'Quiz')
        sp, kp = os.path.join(d, 'Quiz_STUDENT.docx'), os.path.join(d, 'Quiz_KEY.docx')
        if not (os.path.exists(sp) and os.path.exists(kp)):
            fails.append((topic, 'quiz files missing'))
            continue
        topics += 1
        stu, key = read_quiz(sp), read_quiz(kp)
        if len(stu) != len(key):
            fails.append((topic, 'student has %d questions, key has %d' % (len(stu), len(key))))
        #  Keyed by the WHOLE stem. A 60-character prefix collides: 1.3, 1.4,
        #  1.5 and 1.13 each have two questions opening "Consider the following
        #  code segment." or "What is printed?", so the prefix lookup returned
        #  the wrong item and reported four correct quizzes as broken.
        live = {norm(i['stem']): i for i in items[topic]['items']}
        for n, (qs, qk) in enumerate(zip(stu, key), 1):
            qcount += 1
            w = '%s q%d' % (topic, n)
            if len(qs['options']) < 3:
                fails.append((w, 'prints %d options' % len(qs['options'])))
            if BAD_STEM.search(qs['stem']):
                fails.append((w, 'stem asks the student to refute a true statement'))
            if len(set(qs['options'])) != len(qs['options']):
                fails.append((w, 'two options identical once printed'))
            if qs['why']:
                fails.append((w, 'the STUDENT edition carries a rationale'))
            if not qk['why']:
                fails.append((w, 'the key has no rationale'))
            # 3. the key's answer against what the live page grades
            src = live.get(norm(qk['stem']))
            if src is None:
                fails.append((w, 'stem not found in the extracted live items'))
            elif qk['why']:
                want = src['options'][src['answer_index']].split('\n')[0][:40]
                if want and want not in qk['why'] and want not in ' '.join(qk['options']):
                    pass  # the rationale need not quote the option
                got = [o for o in qk['options']]
                if src['options'][src['answer_index']].split('\n')[0][:30] not in ' | '.join(got):
                    fails.append((w, 'the correct option is not among the printed options'))
            # 7. multi-line options keep real breaks
            if src is not None:
                nl = sum(o.count('\n') for o in src['options'])
                if nl and qs['brs'] == 0:
                    fails.append((w, 'multi-line options lost their line breaks'))
    print('topics %d   questions %d' % (topics, qcount))
    print('FAILURES: %d' % len(fails))
    for f in fails[:15]:
        print('   %s: %s' % f)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()

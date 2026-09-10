#!/usr/bin/env python3
"""
Verify the 15 rendered AP CSA Unit 1 teacher guides.

    python3 smoke/csa-unit1-guides.py build/csa-unit1-guides

A SECOND READER, ON PURPOSE. The builder has its own validate(), and it runs
over the assembled content dict. This runs over the .docx that a teacher will
actually open, and it reads word/document.xml straight out of the zip rather
than through python-docx, so a renderer bug cannot pass both.

That is not paranoia, it is the finding. The builder's validate() was green on
all 15 while the rendered file printed the "Guided practice on the live lesson
page" heading with nothing underneath it: the content was in the dict and the
renderer had no branch for it. No check over the input could have seen that.
Rule 6 exists because of it.
"""

import os
import re
import sys
import zipfile

FOLDERS = [
    'Lesson_1.1_Intro_to_Algorithms', 'Lesson_1.2_Variables_and_Data_Types',
    'Lesson_1.3_Expressions_and_Output', 'Lesson_1.4_Assignment_and_Input',
    'Lesson_1.5_Casting_and_Range', 'Lesson_1.6_Compound_Assignment',
    'Lesson_1.7_API_and_Libraries', 'Lesson_1.8_Documentation_Comments',
    'Lesson_1.9_Method_Signatures', 'Lesson_1.10_Calling_Class_Methods',
    'Lesson_1.11_Math_Class', 'Lesson_1.12_Objects_Instances',
    'Lesson_1.13_Object_Creation', 'Lesson_1.14_Calling_Instance_Methods',
    'Lesson_1.15_String_Manipulation',
]
TOPICS = ['1.%d' % n for n in range(1, 16)]

TIMING = re.compile(r'\(\s*\d+\s*min\s*\)', re.I)
PHANTOM = re.compile(r'\bhandout\b|\bon this sheet\b|\bscenario cards\b', re.I)
# "whole class" is NOT a marker and the hyphenated "whole-class" is. The
# unhyphenated form is Java: "decide whether the whole class compiles" is about
# a class definition, and the theme repo hit the same false positive in topics
# 3.3 and 3.8. The mutation suite asserts it as a negative case, so widening
# this back turns that case red rather than passing quietly.
DIRECTIONAL = re.compile(
    r'\b\d+\s*min(?:ute)?s?\b|\bin pairs\b|\bas pairs\b|\bwith a partner\b'
    r'|\bas a class\b|\bwhole-class\b|\bcold[- ]call\b|\bin groups\b'
    r'|\bon the board\b|\bthe board\b|\bask the class\b|\bask students\b'
    r'|\bhave students\b|\btell students\b|\btake a vote\b|\bshow of hands\b'
    r'|\bdo it live\b|\bmove the class\b|\bmove to the live\b|\bout loud\b'
    r'|\btake a hand count\b|\bcollect answers\b|\bcollect predictions\b'
    r'|\bpush until\b|\btrade with a neighbor\b|\bfind a neighbor\b', re.I)

HERE = os.path.dirname(os.path.abspath(__file__))
SEG = re.compile(r'^(?P<label>.+?)\s*\((?P<min>\d+)\s*min\)$')
STRUCTURAL = ('bell ringer', 'objectives and guided', 'worked',
              'guided practice', 'independent practice', 'exit ticket',
              'misconception check', 'stop and think')


def declared_repairs(topic):
    """The (find, replace) pairs unit1_repairs.py declares for this topic."""
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'scripts'))
        from csa_kit import unit1_repairs
    except ImportError:
        return []
    return unit1_repairs.REPLACE.get(topic, [])


def teaching_bullets(path):
    """The body lines of the teaching segments in a rescued guide.

    Only the teaching segments. The bell ringer, the worked example and the
    lesson-page block were deliberately rewritten, so requiring those to survive
    would be requiring the repair not to have happened.
    """
    with open(path, encoding='utf-8') as fh:
        raw = fh.read()
    out, keep = [], False
    for block in re.split(r'\n\s*\n', raw):
        lines = [re.sub(r'\\([.*_<>!=\\-])', r'\1', l.strip())
                 for l in block.strip().split('\n') if l.strip()]
        if not lines:
            continue
        m = SEG.match(lines[0])
        if m:
            label = m.group('label').strip().lower()
            keep = not any(label.startswith(p) for p in STRUCTURAL)
            continue
        if lines[0] in ('Traps this topic sets', 'Differentiation', 'Homework',
                        'Support', 'Stretch', 'Exit ticket, with answers'):
            keep = False
            continue
        if re.match(r'^Day \d+$', lines[0]):
            keep = False
            continue
        if keep:
            out.append(' '.join(lines))
    return out


P_SPLIT = re.compile(r'<w:p[ >]')
TEXT = re.compile(r'<w:t[^>]*>(.*?)</w:t>', re.S)
TAG = re.compile(r'<[^>]+>')


def paragraphs(path):
    """Text per paragraph, read out of the zip without python-docx."""
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml').decode('utf-8')
    out = []
    for chunk in P_SPLIT.split(xml)[1:]:
        body = chunk.split('</w:p>')[0]
        text = ''.join(TEXT.findall(body))
        text = TAG.sub('', text)
        text = (text.replace('&amp;', '&').replace('&lt;', '<')
                    .replace('&gt;', '>').replace('&quot;', '"')
                    .replace('&apos;', "'"))
        if text.strip():
            out.append(text.strip())
    return out


def diff_span(paras):
    """The Differentiation block, which the voice rule deliberately skips."""
    try:
        a = paras.index('Differentiation')
    except ValueError:
        return (len(paras), len(paras))
    for b in range(a, len(paras)):
        if paras[b].startswith('On the website'):
            return (a, b)
    return (a, len(paras))


def check(root):
    fails = []

    def bad(msg):
        fails.append(msg)

    for topic, folder in zip(TOPICS, FOLDERS):
        path = os.path.join(root, folder, 'Teacher_Guide.docx')
        # rule 1: the file is where a teacher's folder already is
        if not os.path.exists(path):
            bad(f'rule 1  {topic}: no Teacher_Guide.docx in {folder}')
            continue
        paras = paragraphs(path)
        joined = '\n'.join(paras)
        lo, hi = diff_span(paras)

        for i, p in enumerate(paras):
            # rule 2: no printed timings
            m = TIMING.search(p)
            if m:
                bad(f'rule 2  {topic}: printed timing {m.group(0)!r} in {p[:50]!r}')
            # rule 3: nothing promised that the bundle does not contain
            m = PHANTOM.search(p)
            if m:
                bad(f'rule 3  {topic}: phantom material {m.group(0)!r} in {p[:50]!r}')
            # rule 4: informational, outside Differentiation
            if not lo <= i < hi:
                m = DIRECTIONAL.search(p)
                if m:
                    bad(f'rule 4  {topic}: directional {m.group(0)!r} in {p[:50]!r}')

        # rule 5: every exit-ticket item resolves to an answer a teacher can read
        try:
            start = paras.index('Exit ticket, with answers')
        except ValueError:
            bad(f'rule 5  {topic}: no exit ticket section')
            start = None
        if start is not None:
            end = next((j for j in range(start, len(paras))
                        if paras[j] == 'Traps this topic sets'), len(paras))
            block = paras[start:end]
            items = [j for j, p in enumerate(block) if re.match(r'^\d+\. ', p)]
            if len(items) < 3:
                bad(f'rule 5  {topic}: {len(items)} exit items, expected at least 3')
            for k, j in enumerate(items):
                stop = items[k + 1] if k + 1 < len(items) else len(block)
                body = block[j:stop]
                opts = [b for b in body if re.match(r'^[A-D]\. ', b)]
                marked = [b for b in body if '<-- answer' in b]
                free = [b for b in body if b.startswith('Answer:')]
                if opts:
                    if len(opts) < 3:
                        bad(f'rule 5  {topic} item {k + 1}: {len(opts)} options')
                    if len(marked) != 1:
                        bad(f'rule 5  {topic} item {k + 1}: {len(marked)} options '
                            f'marked as the answer, expected exactly 1')
                elif not free:
                    bad(f'rule 5  {topic} item {k + 1}: no options and no '
                        f'written answer, so the key names nothing')

        # rule 6: a heading with no content under it is the defect that started
        # this rule. Every generated section heading has to be followed by text.
        for heading in ('Guided practice on the live lesson page',
                        'Independent practice'):
            if heading not in paras:
                bad(f'rule 6  {topic}: no "{heading}" section')
                continue
            j = paras.index(heading)
            after = paras[j + 1:j + 2]
            if not after or len(after[0]) < 30 or after[0] in (
                    'Independent practice', 'Exit ticket'):
                bad(f'rule 6  {topic}: "{heading}" heading prints with nothing '
                    f'under it')

        # rule 7: the CED objective codes are this topic's, not another's
        codes = set(re.findall(r'\b(\d+\.\d+)\.[A-Z]\b', joined))
        if topic not in codes:
            bad(f'rule 7  {topic}: no learning objective code for this topic')
        for other in codes:
            if other != topic:
                bad(f'rule 7  {topic}: carries a {other} objective code')

        # rule 8: a misconception bullet must not restate the heading above it
        for j, p in enumerate(paras):
            if p.startswith('Misconception check: ') and j + 1 < len(paras):
                name = p.split(': ', 1)[1].strip().rstrip('.').lower()
                nxt = paras[j + 1].strip().lower()
                if name and nxt.startswith(name):
                    bad(f'rule 8  {topic}: the misconception bullet repeats its '
                        f'own heading, printing the label twice')

        # rule 9: the trademark line every document in the bundle carries
        if not any(p.startswith('AP is a trademark') for p in paras):
            bad(f'rule 9  {topic}: no College Board trademark line')

        # rule 10: the teaching content survived. This is a repair, not a
        # rewrite, so every teaching bullet the shipped guide carried has to
        # still be in the rebuilt one. Without it the other nine rules are
        # satisfiable by a document that is clean because it is empty, which is
        # the failure mode this repo keeps finding: a check that passes on the
        # wrong thing.
        rescued = os.path.join(
            os.path.dirname(HERE), 'docs', 'rescued',
            'csa-unit1-teacher-guides', f'{topic}.txt')
        if os.path.exists(rescued):
            missing = []
            for b in teaching_bullets(rescued):
                if b in joined:
                    continue
                # A bullet may differ from the shipped one ONLY where
                # unit1_repairs.py declares a replacement for it. That makes
                # the check stronger rather than weaker: the difference between
                # the shipped teaching content and the rebuilt teaching content
                # has to be exactly the declared set, and a line that quietly
                # went missing has nothing to point at.
                repaired = b
                for find, repl, _n in declared_repairs(topic):
                    repaired = repaired.replace(find, repl)
                if repaired != b and repaired in joined:
                    continue
                missing.append(b)
            if missing:
                bad(f'rule 10 {topic}: {len(missing)} teaching bullet(s) changed '
                    f'or lost with no declared repair, first: '
                    f'{missing[0][:60]!r}')

    return fails


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else 'build/csa-unit1-guides'
    fails = check(root)
    if fails:
        for f in fails[:40]:
            print('FAIL ' + f)
        if len(fails) > 40:
            print(f'... and {len(fails) - 40} more')
        print(f'\n{len(fails)} failures')
        return 1
    print(f'10 rules, 15 guides, 0 failures   ({root})')
    return 0


if __name__ == '__main__':
    sys.exit(main())

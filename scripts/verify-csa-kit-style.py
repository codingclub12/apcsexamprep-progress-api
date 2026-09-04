#!/usr/bin/env python3
"""
House-style guard for the AP CSA teacher kit.

Three rules, all of which were BROKEN IN SHIPPED DECKS and found by Tanner
reading the output rather than by any check in this repo. That is why they are
a suite now: each one passes every other check we have, because none of them
is a crash, a compile error or an overflow.

  1. US spelling. The Unit 2-4 content was written with British forms
     (initialise, behaviour, recognise, defence, labelled, towards). 102 of
     them shipped. The audience is American teachers sitting an American exam.

  2. The bell ringer must not print its own answer on the slide face. The
     teacher edition used to render draw_out in a green "WORTH DRAWING OUT"
     card, and a teacher projects the teacher edition, so Topic 2.2 day 1 put
     "b > c is false, so the whole and is false" directly under the question
     asking exactly that. draw_out belongs in the speaker notes, which is what
     the title slide already promises.

  3. A cloze line must cut at a word boundary. The student guided notes cut on
     a raw character count, producing "one of two value", "|| m" and "the
     inpu". A student cannot tell a truncation from a typo.

Usage:
    python3 scripts/verify-csa-kit-style.py
"""

import glob
import importlib
import inspect
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# British -> US. Only forms that actually differ; "exercise" and "promise" are
# the same either side of the Atlantic and must not be flagged.
BRITISH = re.compile(
    r'\b('
    r'initialis\w*|recognis\w*|summaris\w*|minimis\w*|maximis\w*|emphasis\w*|'
    r'normalis\w*|organis\w*|realis(e|ed|es|ing)|categoris\w*|prioritis\w*|'
    r'utilis(e|ed|es|ing)|apologis\w*|specialis\w*|analys(e|ed|es|ing)|'
    r'behaviour\w*|neighbour\w*|favour(s|ed|ing|ite)?|labour\w*|honour\w*|'
    r'centre(s|d)?|metre(s)?|theatre(s)?|'
    r'labell(ed|ing)|modell(ed|ing)|travell(ed|ing)|cancell(ed|ing)|'
    r'practis(e|ed|es|ing)|licence|defence|offence|'
    r'judgement|acknowledgement|towards|grey|colour\w*'
    r')\b', re.I)

FAILED = []


def ok(label, cond, detail=''):
    print(('  [PASS] ' if cond else '  [FAIL] ') + label + ('' if cond else f'  {detail}'))
    if not cond:
        FAILED.append(label)


def load_topics(unit):
    topics = []
    for suffix in ('', 'b', 'c', 'd', 'e'):
        try:
            topics.extend(importlib.import_module(
                f'csa_kit.content_unit{unit}{suffix}').TOPICS)
        except ModuleNotFoundError:
            continue
    return topics


def main():
    print('1. US spelling across the kit source')
    hits = []
    for f in sorted(glob.glob(os.path.join(HERE, 'csa_kit', '*.py'))):
        for i, line in enumerate(open(f, encoding='utf-8'), 1):
            for m in BRITISH.finditer(line):
                hits.append(f'{os.path.basename(f)}:{i} {m.group(0)}')
    ok(f'no British spellings in scripts/csa_kit ({len(hits)} found)',
       not hits, hits[:6])

    print('2. The bell ringer does not print its answer on the slide face')
    from csa_kit.deck import Deck
    src = inspect.getsource(Deck.warmup)
    # Strip the docstring before matching. The first version of this check
    # scanned the whole source and failed on warmup's OWN docstring, which
    # quotes the banned label while explaining why it was removed. A guard
    # that cannot tell an explanation from the thing it forbids is worse than
    # no guard, so this compares against the code only.
    doc = Deck.warmup.__doc__ or ''
    body = src.replace(doc, '') if doc else src
    ok('warmup() draws no card from draw_out',
       'WORTH DRAWING OUT' not in body, 'the green answer card is back')
    ok('warmup() still sends draw_out to the speaker notes',
       '_note(s, draw_out)' in src)
    ok('warmup() accepts a code block', 'code=None' in src)

    print('3. Cloze lines cut at a word boundary')
    from csa_kit.notes import _cloze_head, TRUNCATE_AT, TRUNCATE_FLOOR

    def boundary_ok(head, src_sentence):
        if head == src_sentence.rstrip():
            return True
        rest = src_sentence[len(head):]
        return (rest.startswith(' ') or rest.lstrip(',;:.').startswith(' ')
                or rest.lstrip(',;:.') == '')

    total = 0
    bad = []
    for unit in (2, 3, 4):
        for t in load_topics(unit):
            for d in t['days']:
                for _name, ideas in d.get('sections', []):
                    for idea in ideas:
                        total += 1
                        head = _cloze_head(idea)
                        if boundary_ok(head, idea):
                            continue
                        # The hard character cut is excused ONLY when the source
                        # offers no word boundary to cut at, which is the single
                        # documented fallback. Excusing every head of length
                        # TRUNCATE_AT instead, as the first version did, made
                        # this rule hollow: reverting _cloze_head to the raw
                        # sentence[:58] left the suite green, because every head
                        # was then exactly TRUNCATE_AT and every one was
                        # forgiven. Caught by mutation, not by reading.
                        window = idea[:TRUNCATE_AT + 1]
                        if ' ' not in window[TRUNCATE_FLOOR:]:
                            continue
                        bad.append(f"{t['topic']} d{d['day']}: ...{head[-28:]!r}")
    ok(f'all {total} cloze cuts land on a word boundary', not bad, bad[:4])
    ok('a cloze head never ends on dangling punctuation',
       not _cloze_head('The relational operators compare two values: <, >, <=, >=, and more.')
       .endswith((',', ';', ':')))

    print('4. Code in a warm-up is a code block, not part of the sentence')
    inline = []
    blocks = 0
    STATEMENT = re.compile(r'(\b(int|double|boolean|String|char)(\[\])?\s+\w+\s*=|'
                           r'\b(for|while|if)\s*\([^)]*\)\s*\{|System\.out\.print|'
                           r'\bpublic\s+\w+\s+\w+\s*\()')
    for unit in (2, 3, 4):
        for t in load_topics(unit):
            for d in t['days']:
                w = d['warmup']
                if len(w) > 3 and w[3]:
                    blocks += 1
                if STATEMENT.search(w[1]):
                    inline.append(f"{t['topic']} d{d['day']}")
    ok(f'no Java statement is buried in a warm-up prompt ({blocks} code blocks)',
       not inline, inline[:5])

    print('5. The teacher guide carries the topic\'s actual teaching content')
    import tempfile
    from docx import Document
    from csa_kit.notes import build_teacher_guide
    required = 0
    absent = []
    with tempfile.TemporaryDirectory() as tmp:
        for unit in (2, 3, 4):
            for t in load_topics(unit):
                out = os.path.join(tmp, f"g{t['topic']}.docx")
                build_teacher_guide(out, t['topic'], t['title'], t['handle'],
                                    t['days'], t['vocab'], t['quiz'], 'x')
                text = '\n'.join(p.text for p in Document(out).paragraphs)
                for d in t['days']:
                    for _name, ideas in d.get('sections', []):
                        for idea in ideas:
                            required += 1
                            if idea not in text:
                                absent.append(f"{t['topic']} d{d['day']}: {idea[:44]}")
                for q in t['quiz']:
                    required += 1
                    if q['stem'] not in text:
                        absent.append(f"{t['topic']} quiz: {q['stem'][:44]}")
    ok(f'all {required} key ideas and quiz stems reach the guide', not absent, absent[:4])

    print()
    if FAILED:
        print(f'{len(FAILED)} FAILED: ' + '; '.join(FAILED))
        sys.exit(1)
    print('kit house style is clean.')


if __name__ == '__main__':
    main()

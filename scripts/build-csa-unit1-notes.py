#!/usr/bin/env python3
"""
Rebuild the AP CSA Unit 1 guided notes from the decks.

    python3 scripts/build-csa-unit1-notes.py <deckdir> <outdir>

WHY THE SHIPPED NOTES CANNOT BE REPAIRED IN PLACE
Every note-taking prompt in the Unit 1 student notes is cut at exactly 60
characters with no regard for where a word ends, so students are handed lines
like these, verbatim:

    Classes in Java libraries are grouped into packages. A packa ______
    Every class has two kinds of members. Attributes are the dat ______
    The short version for now: a primitive holds the value itsel ______
    Names cannot be Java reserved words, and they are case sensi ______

Confirmed on 1.2, 1.3 and 1.7 and systematic in all three. The kit cuts at a word
boundary, which is what these should always have done.

The notes also close with an exit ticket whose multiple-choice questions have no
options, the same defect as the shipped quizzes: "Which of these is a behavior?"
with a blank line, and a key that says "Answer: C" of a list nobody printed. The
kit's notes have no exit ticket, so rebuilding drops that section rather than
trying to reconstruct options that were never written down.

EVERYTHING COMES FROM THE DECKS, WHICH ARE ALREADY CORRECT
The section prose on the slides is the same prose the notes truncate, and it is
there in full. Vocabulary comes from the deck's KEY VOCABULARY slide, the handle
from lib/csa-nav.js, and the fill-in-the-blank section from the kit's own
vocabulary derivation. So no part of this is retyped and no part is invented.

Run the decks through the repair passes first. This reads what is on the slides,
so a deck still carrying a false caption would hand that text to the notes.

No em-dashes, per repo convention.
"""

import argparse
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from csa_kit.notes import build_notes

EXTRACT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       'extract-csa-unit1-content.py')


def handles():
    out = subprocess.run(
        ['node', '-e',
         "const{UNITS}=require('./lib/csa-nav.js');"
         "console.log(JSON.stringify(UNITS['unit-1'].lessons.map(l=>[l.id,l.lessonHandle,l.title])))"],
        capture_output=True, text=True,
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return {r[0]: (r[1], r[2]) for r in json.loads(out.stdout)}


SENT = re.compile(r'(?<=[.!?])\s+(?=[A-Z(])')


def _ideas(text):
    """One section's prose as the list of statements a student fills in."""
    out = []
    for line in str(text).split('\n'):
        line = line.strip()
        if not line:
            continue
        for part in SENT.split(line):
            part = part.strip()
            if len(part) > 25:
                out.append(part)
    return out


def blanks_from_vocab(vocab):
    """The kit's own derivation, so these packets match every other unit."""
    out = []
    for term, definition in vocab[:5]:
        first = definition[0].lower() + definition[1:]
        out.append((('{} is ' + first.rstrip('.') + '.'), term))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('deckdir')
    ap.add_argument('outdir')
    a = ap.parse_args()

    sys.path.insert(0, os.path.dirname(EXTRACT))
    from importlib.machinery import SourceFileLoader
    ex = SourceFileLoader('ex', EXTRACT).load_module()

    hmap = handles()
    made = 0
    rows = []
    for d in sorted(os.listdir(a.deckdir),
                    key=lambda x: float(re.search(r'1\.(\d+)', x).group(1))
                    if re.search(r'1\.(\d+)', x) else 99):
        dp = os.path.join(a.deckdir, d)
        if not os.path.isdir(dp):
            continue
        m = re.match(r'Lesson_(\d+\.\d+)_', d)
        if not m:
            continue
        topic = m.group(1)
        if topic not in hmap:
            rows.append((topic, '-', 'no handle in csa-nav'))
            continue
        handle, title = hmap[topic]
        for fn in sorted(os.listdir(dp)):
            dm = re.match(r'Day(\d+)_Deck_TEACHER\.pptx$', fn)
            if not dm:
                continue
            day = int(dm.group(1))
            r = ex.extract(os.path.join(dp, fn))
            #  build_notes wants (name, [idea, idea, ...]). The extractor
            #  joins a section's slides into one string for its own report, and
            #  passing that straight through makes the builder iterate
            #  CHARACTERS: the first run of this produced 56 files reading
            #  "A", "l", "i", "b", "r", "a", "r", "y" one per line. Split it
            #  back into the sentences the slides actually carry.
            sections = [(name, _ideas(text))
                        for name, text in (r['days'][0].get('sections') or [])]
            sections = [(n, i) for n, i in sections if i]
            vocab = r.get('vocab') or []
            if not sections:
                rows.append((topic, day, 'no sections on the deck, skipped'))
                continue
            if not vocab:
                #  a later day often reuses day 1's vocabulary slide
                first = os.path.join(dp, 'Day1_Deck_TEACHER.pptx')
                if os.path.exists(first):
                    vocab = ex.extract(first).get('vocab') or []
            outdir = os.path.join(a.outdir, d, 'Guided_Notes')
            os.makedirs(outdir, exist_ok=True)
            blanks = blanks_from_vocab(vocab)
            for key_edition, name in ((False, 'Day%d_Notes_STUDENT.docx' % day),
                                      (True, 'Day%d_Notes_KEY.docx' % day)):
                build_notes(os.path.join(outdir, name), topic, title, day,
                            handle, sections, vocab, blanks, key_edition)
            made += 2
            rows.append((topic, day, '%d sections, %d vocab' % (len(sections), len(vocab))))

    print('%-7s %-5s %s' % ('topic', 'day', 'built from'))
    for t, d, note in rows:
        print('  %-7s %-5s %s' % (t, d, note))
    print()
    print('%d notes documents written' % made)


if __name__ == '__main__':
    main()

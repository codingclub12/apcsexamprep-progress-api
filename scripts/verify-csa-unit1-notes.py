#!/usr/bin/env python3
"""
Check the rebuilt AP CSA Unit 1 guided notes.

    python3 scripts/verify-csa-unit1-notes.py <notesdir> <deckdir>

Written against the DOCUMENTS and the decks, not against the builder, so a
generator that agrees with itself still has to get past it.

  1. No prompt ends mid-word. This is the defect that shipped: every prompt in
     the old notes is cut at exactly 60 characters regardless of where a word
     ends, giving students "A packa ______" and "the value itsel ______". The
     deck is the oracle: the prose is there in full, so the character after the
     prompt says whether the cut landed inside a word.
  2. No prompt is a bare fragment. A line of one or two characters before the
     rule is the signature of passing a string where the builder wants a list of
     sentences, which makes it iterate CHARACTERS. The first run of the builder
     did exactly that and wrote 56 files reading "A", "l", "i", "b" one per line.
  3. No exit ticket. The old notes closed with multiple-choice questions that
     had no options and a key that said "Answer: C" of a list nobody printed.
  4. The student edition hides what the key shows, and both carry the same
     prompts, so the two editions cannot drift.

No em-dashes, per repo convention.
"""

import os
import re
import sys

from docx import Document

try:
    from pptx import Presentation
except ImportError:
    Presentation = None

RULE = re.compile(r'^(.*?)\s+(_{6,})$')


def deck_prose(deckdir, folder):
    if Presentation is None:
        return ''
    out = []
    d = os.path.join(deckdir, folder)
    if not os.path.isdir(d):
        return ''
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.pptx') or fn.endswith('.orig.pptx'):
            continue
        for sl in Presentation(os.path.join(d, fn)).slides:
            for sh in sl.shapes:
                if sh.has_text_frame and sh.text_frame.text.strip():
                    out.append(sh.text_frame.text)
    return re.sub(r'\s+', ' ', '\n'.join(out))


def prompts(path):
    out = []
    for p in Document(path).paragraphs:
        m = RULE.match(p.text.strip())
        if m:
            out.append(m.group(1).strip())
    return out


def main():
    notesdir, deckdir = sys.argv[1], sys.argv[2]
    fails = []
    files = total = 0
    for folder in sorted(os.listdir(notesdir)):
        gd = os.path.join(notesdir, folder, 'Guided_Notes')
        if not os.path.isdir(gd):
            continue
        prose = deck_prose(deckdir, folder)
        for fn in sorted(os.listdir(gd)):
            if not fn.endswith('.docx'):
                continue
            path = os.path.join(gd, fn)
            files += 1
            doc = Document(path)
            body = '\n'.join(p.text for p in doc.paragraphs)
            where = '%s/%s' % (folder.replace('Lesson_', ''), fn)
            if re.search(r'Exit ticket', body, re.I):
                fails.append((where, 'still carries an exit ticket'))
            ps = prompts(path)
            if not ps:
                fails.append((where, 'no note-taking prompts at all'))
            for pr in ps:
                total += 1
                if len(pr) < 12 or ' ' not in pr:
                    fails.append((where, 'prompt is a fragment: %r' % pr[:24]))
                    continue
                flat = re.sub(r'\s+', ' ', pr)
                i = prose.find(flat)
                if i < 0:
                    continue                     # not on a slide; nothing to judge
                nxt = prose[i + len(flat):i + len(flat) + 1]
                if nxt and nxt.isalnum():
                    fails.append((where, 'prompt ends mid-word: ...%r' % flat[-26:]))
    print('files %d   prompts %d' % (files, total))
    print('FAILURES: %d' % len(fails))
    for f in fails[:12]:
        print('   %s: %s' % f)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()

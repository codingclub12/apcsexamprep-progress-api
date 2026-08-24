#!/usr/bin/env python3
"""
Build the AP CSA teacher kit for a unit.

Produces, per topic, exactly the file set the Unit 1 pilot ships, so a teacher
who has used Unit 1 finds the same folder in front of them:

    Lesson_<topic>_<Slug>/
        Teacher_Guide.docx                 (lesson map, one page)
        Slide_Decks/    Day<N>_Deck_TEACHER.pptx, Day<N>_Deck_STUDENT.pptx
        Guided_Notes/   Day<N>_Notes_STUDENT.docx, Day<N>_Notes_KEY.docx
        Quiz/           Quiz_STUDENT.docx, Quiz_KEY.docx

Usage:
    python3 scripts/build-csa-teacher-kit.py --unit 2 --out build/csa-kit

Content comes from scripts/csa_kit/content_unit<N>.py and nothing is invented
here. Every deck is generated from the same dict that generates the notes and
the quiz, so the three surfaces cannot drift apart.
"""

import argparse
import importlib
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))

from csa_kit.deck import Deck
from csa_kit.notes import build_notes, build_quiz, build_lesson_map

PREPARED = ('Prepared for the May 2027 AP CSA exam '
            '(2025 Course and Exam Description, four-unit structure).')


def slug(title):
    s = re.sub(r'[^A-Za-z0-9 ]', '', title).strip().replace(' ', '_')
    return s


def build_deck(t, day, edition, path):
    d = Deck(t['topic'], t['title'], day['day'], len(t['days']), edition, t['subtitle'])
    d.title_slide(PREPARED,
                  note=f"Day {day['day']} of {len(t['days'])}. The Lesson Map in the Teacher Guide "
                       f"has a suggested time for each section if you want one.")
    warm_head, warm_prompt, warm_draw = day['warmup']
    d.warmup(warm_head, warm_prompt, warm_draw)
    d.notes_preview([(name, ideas[0]) for name, ideas in day['sections']])
    d.objectives(day['objectives'])
    for i, (name, ideas) in enumerate(day['sections'], 1):
        d.section_divider(i, name)
        # Split long sections across two slides so nothing overflows the card.
        if len(ideas) > 3:
            d.section_content(i, name, ideas[:2], part='1 of 2')
            d.section_content(i, name, ideas[2:], part='2 of 2')
        else:
            d.section_content(i, name, ideas)
    w = day['worked']
    d.worked_example(w['heading'], w['code'], w['notice'], w['output'],
                     w.get('caption', 'Complete and runnable as shown.'), w.get('note'))
    b = day['break_it']
    d.now_break_it(b['change'], b['happens'], b['why'], b.get('note'))
    m = day['misconception']
    d.misconception(m['heading'], m['think'], m['truth'], m.get('note'))
    d.vocabulary(t['vocab'])
    d.discussion(day['discussion'], note=' '.join(day.get('notes', [])[:1]))
    d.end_of_day(day['learned'], day['up_next'], day['extra'])
    d.save(path)
    return d.n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--unit', required=True)
    ap.add_argument('--out', default='build/csa-kit')
    ap.add_argument('--topic', help='build only this topic, e.g. 2.3')
    args = ap.parse_args()

    # Unit content may be split across several part files for readability.
    all_topics = []
    for suffix in ('', 'b', 'c'):
        try:
            m = importlib.import_module(f'csa_kit.content_unit{args.unit}{suffix}')
        except ModuleNotFoundError:
            continue
        all_topics.extend(m.TOPICS)
    all_topics.sort(key=lambda t: [int(x) for x in t['topic'].split('.')])
    topics = [t for t in all_topics if not args.topic or t['topic'] == args.topic]
    if not topics:
        sys.exit(f'no topics matched for unit {args.unit}')

    made = 0
    for t in topics:
        root = os.path.join(args.out, f"Unit_{args.unit}",
                            f"Lesson_{t['topic']}_{slug(t['title'])}")
        decks = os.path.join(root, 'Slide_Decks')
        notes = os.path.join(root, 'Guided_Notes')
        quiz = os.path.join(root, 'Quiz')
        for d in (decks, notes, quiz):
            os.makedirs(d, exist_ok=True)

        for day in t['days']:
            n = day['day']
            for edition, suffix in (('TEACHER', 'TEACHER'), ('STUDENT', 'STUDENT')):
                p = os.path.join(decks, f'Day{n}_Deck_{suffix}.pptx')
                slides = build_deck(t, day, edition, p)
                made += 1
            for key_edition, suffix in ((False, 'STUDENT'), (True, 'KEY')):
                build_notes(
                    os.path.join(notes, f'Day{n}_Notes_{suffix}.docx'),
                    t['topic'], t['title'], n, t['handle'],
                    day['sections'], t['vocab'],
                    blanks_for(t, day), key_edition)
                made += 1

        for key_edition, suffix in ((False, 'STUDENT'), (True, 'KEY')):
            build_quiz(os.path.join(quiz, f'Quiz_{suffix}.docx'),
                       t['topic'], t['title'], t['handle'], t['quiz'], key_edition)
            made += 1

        build_lesson_map(os.path.join(root, 'Teacher_Guide.docx'),
                         t['topic'], t['title'], t['handle'], t['days'],
                         '6 checks for understanding, 1 code exercise, 1 debugging exercise, the topic quiz')
        made += 1
        print(f"  built {t['topic']}  {t['title']}  ({slides} slides per deck)")

    print(f"\n{made} files written under {args.out}")


def blanks_for(t, day):
    """Fill-in-the-blank sentences. Authored per day when present; otherwise
    derived from the vocabulary so every packet has the section."""
    if 'blanks' in day:
        return day['blanks']
    out = []
    for term, definition in t['vocab'][:5]:
        first = definition[0].lower() + definition[1:]
        out.append((('{} is ' + first.rstrip('.') + '.'), term))
    return out


if __name__ == '__main__':
    main()

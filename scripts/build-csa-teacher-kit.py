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
import json
import importlib
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))

from csa_kit.deck import Deck
from csa_kit.notes import (build_notes, build_quiz, build_teacher_guide,
                          build_frq)
from csa_kit.course_docs import build_course_docs

# The 53 free-response items, exported from seed/csa-frq. Read once.
_FRQ_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                         'config', 'csa-frq-kit.json')
try:
    with open(_FRQ_PATH, encoding='utf-8') as _fh:
        FRQ_ITEMS = json.load(_fh)['items']
except FileNotFoundError:
    # Not fatal: the kit still builds without FRQ packets, and saying so beats
    # a traceback that looks like the whole builder is broken.
    print('note: config/csa-frq-kit.json missing, no FRQ packets will be built.'
          ' Run: node scripts/csa-frq-export.js')
    FRQ_ITEMS = {}

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
    # A warm-up is [heading, prompt, draw_out] and may carry a fourth element,
    # a code fragment to set as a real code block instead of running it into
    # the prompt sentence. Unpacked by length so the 70 warm-ups that carry no
    # code need no edit.
    warm = day['warmup']
    warm_head, warm_prompt, warm_draw = warm[0], warm[1], warm[2]
    warm_code = warm[3] if len(warm) > 3 else None
    d.warmup(warm_head, warm_prompt, warm_draw, warm_code)
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
    for suffix in ('', 'b', 'c', 'd', 'e'):
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

        # The lesson's free-response practice item, student packet and key.
        # Content comes from config/csa-frq-kit.json, exported from
        # seed/csa-frq by scripts/csa-frq-export.js. A lesson with no item
        # simply gets no FRQ folder rather than an empty one.
        frq_item = FRQ_ITEMS.get(t['topic'])
        if frq_item:
            frq_dir = os.path.join(root, 'FRQ')
            os.makedirs(frq_dir, exist_ok=True)
            for key_edition, suffix in ((False, 'STUDENT'), (True, 'KEY')):
                build_frq(os.path.join(frq_dir, f'FRQ_{suffix}.docx'),
                          frq_item, key_edition)
                made += 1

        build_teacher_guide(os.path.join(root, 'Teacher_Guide.docx'),
                            t['topic'], t['title'], t['handle'], t['days'],
                            t['vocab'], t['quiz'],
                            '6 checks for understanding, 1 code exercise, '
                            '1 debugging exercise, the topic quiz')
        made += 1
        print(f"  built {t['topic']}  {t['title']}  ({slides} slides per deck)")

    # Course-level documents. Written on every unit build rather than behind a
    # flag, because they are cheap, identical each time, and a kit missing its
    # Start_Here because somebody forgot the flag is worse than four rewritten
    # files. Day counts are COUNTED from the units actually present on disk, so
    # a partial build says so in the table instead of claiming units it has not
    # built.
    day_counts = {}
    for unit_dir in sorted(os.listdir(args.out)):
        m = re.match(r'Unit_(\d+)$', unit_dir)
        if not m:
            continue
        n = 0
        for lesson in os.listdir(os.path.join(args.out, unit_dir)):
            decks = os.path.join(args.out, unit_dir, lesson, 'Slide_Decks')
            if os.path.isdir(decks):
                n += len([f for f in os.listdir(decks)
                          if f.endswith('_Deck_TEACHER.pptx')])
        day_counts[m.group(1)] = n
    made += build_course_docs(args.out, day_counts)

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

#!/usr/bin/env python3
"""
Build the 38 AP CSA Units 2-4 Teacher_Guide.docx files.

    python3 scripts/build-csa-units-2-4-teacher-guides.py --out build/csa-u234-guides
    python3 scripts/build-csa-units-2-4-teacher-guides.py --check   # validate only
    python3 scripts/build-csa-units-2-4-teacher-guides.py --out /tmp/x --topic 2.3

WHY THIS EXISTS SEPARATELY FROM build-csa-teacher-kit.py
That builder writes a whole unit, decks and guided notes and quizzes included,
from content_unit<N>.py. This writes the one document per lesson that needed
repairing and touches nothing else, the same trade
build-csa-unit1-teacher-guides.py makes for Unit 1.

WHAT WAS WRONG WITH THE 38 IN DRIVE
Measured 2026-09-17 against the files themselves, not against the generator:

  190  headings printing with nothing under them
        76  Objectives and guided-notes preview, two per guide
        38  Guided practice on the live lesson page
        38  Independent practice
        38  Exit ticket
       content_unit2/3/4 carry no lesson_page and no independent AT ALL, and no
       note for the other two rows, so the renderer had nothing to render on
       38 of 38 topics. The renderer branches were fine.
  114  objective rows attaching a CED code to a sentence College Board did not
       write. "2.3.A | I can write an if statement that runs a block only when
       its condition is true." A teacher reading that column reasonably
       believes it is the CED's wording.

WHAT THIS FIXES, AND THE SIX IT DOES NOT
32 of the 38 topics get the objectives, lesson page and independent practice
from config/csa-units-2-4-guide-content.json, which is exported from the theme
repo's own lesson specs and carries College Board's wording. All 38 get the two
structural rows, because those name the guided-notes packet and the exit ticket
section, which every guide already has.

SIX UNIT 4 TOPICS GET NO OVERLAY, and that is the most important thing in this
file. The theme specs numbered 4.6, 4.7, 4.13, 4.14, 4.15 and 4.17 describe
RETIRED lessons: the site renumbered Unit 4 onto the 2025 CED and those six
specs were left behind. Joining the two trees on the topic number therefore put
another lesson's objectives into six guides, which is worse than the empty
heading it replaced, because an empty heading is visibly empty and a wrong
objectives table reads as authoritative.

The live storefront is what settles it. Every one of the six theme handles is a
301 to a different page, and 4.13's redirects to 4.14's lesson, so the numbers
are not even off by a consistent amount. The generator's header carries the
measurement. There is no CED wording for those six anywhere in either repo, so
they keep the kit's own rows and their two practice headings stay bare. The
expected end state is 12 bare headings, not 0, and the verifier asserts exactly
that rather than allowing "some".

Everything else, the days, the sections, the bell ringers, the worked examples,
the misconceptions, the vocabulary and the quiz, still comes from
content_unit<N>.py untouched.
"""

import argparse
import importlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))

from csa_kit.notes import build_teacher_guide            # noqa: E402
from csa_kit.guide_sections import OBJECTIVES_NOTE, EXIT_NOTE   # noqa: E402

CONTENT = os.path.join(ROOT, 'config', 'csa-units-2-4-guide-content.json')
GRADED_LINE = ('6 checks for understanding, 1 code exercise, '
               '1 debugging exercise, the topic quiz')

UNIT_MODULES = {
    2: ['content_unit2', 'content_unit2b', 'content_unit2c'],
    3: ['content_unit3', 'content_unit3b'],
    4: ['content_unit4', 'content_unit4b', 'content_unit4c', 'content_unit4d',
        'content_unit4e'],
}
UNIT_TITLES = {2: 'Selection_and_Iteration', 3: 'Class_Creation',
               4: 'Data_Collections'}

# The same marker sets the Unit 1 build enforces, and for the same reason: the
# bundle says what is in the lesson, it does not run the room. Differentiation
# is exempt and only Differentiation, because csa_kit/differentiation.py sets
# its house style as concrete classroom moves.
VOICE = [
    ('pacing', re.compile(r'\b\d+\s*min(?:ute)?s?\b', re.I)),
    ('grouping', re.compile(
        r'\bin pairs\b|\bas pairs\b|\bwith a partner\b|\bas a class\b'
        r'|\bwhole-class\b|\bcold[- ]call\b|\bin groups\b', re.I)),
    ('staging', re.compile(
        r'\bon the board\b|\bask the class\b|\bask students\b|\bhave students\b'
        r'|\btell students\b|\bout loud\b|\bshow of hands\b|\bdo it live\b', re.I)),
]
PHANTOM = re.compile(r'\bhandout\b|\bon this sheet\b|\bscenario cards\b', re.I)


def fail(msg):
    raise SystemExit('csa-u234-guides: ' + msg)


def slug(title):
    return re.sub(r'[^A-Za-z0-9 ]', '', title).strip().replace(' ', '_')


def load_kit():
    topics = {}
    for unit, mods in UNIT_MODULES.items():
        for m in mods:
            try:
                mod = importlib.import_module(f'csa_kit.{m}')
            except ImportError:
                continue
            for t in mod.TOPICS:
                topics[t['topic']] = (unit, t)
    return topics


def assemble(topic, unit, kit, extra):
    """The kit topic with the two structural rows filled, and, where the export
    covers this topic, its objectives, lesson page and independent practice
    replaced from the theme export.

    extra is None for the six topics whose theme spec describes a retired
    lesson. They take the structural rows and nothing else.
    """
    days = [dict(d) for d in kit['days']]

    if extra:
        # The CED objectives go on day 1; the renderer dedupes across days.
        days[0]['objectives'] = [(o['text'], o['code']) for o in extra['objectives']]
        for d in days[1:]:
            d['objectives'] = []

    filled = {'lesson_page': 0, 'independent': 0, 'objectives_note': 0,
              'exit_note': 0}
    for n, d in enumerate(days, start=1):
        labels = [str(lab).lower() for _m, lab in d.get('schedule', [])]
        d['objectives_note'] = OBJECTIVES_NOTE.format(day=n)
        filled['objectives_note'] += 1
        if extra and any(l.startswith('guided practice') for l in labels):
            d['lesson_page'] = extra['lesson_page']
            filled['lesson_page'] += 1
        if extra and any(l.startswith('independent practice') for l in labels):
            d['independent'] = extra['independent']
            filled['independent'] += 1
        if any(l.startswith('exit ticket') for l in labels):
            d['exit_note'] = EXIT_NOTE.format(n=len(kit.get('quiz', [])))
            filled['exit_note'] += 1

    # Every row that printed bare has to be accounted for, either filled or
    # named as one of the six. A topic whose schedule names a guided-practice
    # segment, which the export covers, and which got no lesson page is exactly
    # the defect this build exists to remove.
    bare = []
    for n, d in enumerate(days, start=1):
        for label, field in (('guided practice', 'lesson_page'),
                             ('independent practice', 'independent'),
                             ('exit ticket', 'exit_note')):
            named = any(str(lab).lower().startswith(label)
                        for _m, lab in d.get('schedule', []))
            if not named or d.get(field):
                continue
            if extra:
                fail(f'{topic} day {n}: the schedule names "{label}" and '
                     f'nothing filled {field}, so that heading would print bare')
            bare.append(f'day {n} {label}')

    return {
        'topic': topic, 'unit': unit, 'title': kit['title'],
        'handle': (extra or kit)['handle'], 'days': days,
        'vocab': kit.get('vocab', []), 'quiz': kit.get('quiz', []),
        'i_can': (extra or {}).get('iCan') or None,
        'overlaid': bool(extra), 'filled': filled, 'bare': bare,
        'folder': f"Lesson_{topic}_{slug(kit['title'])}",
    }


def validate(t):
    topic = t['topic']
    if not t['quiz']:
        fail(f'{topic}: no exit-ticket items')

    if t['overlaid']:
        if not t['days'][0]['objectives']:
            fail(f'{topic}: no CED objectives')
        for text, code in t['days'][0]['objectives']:
            if not re.match(r'^(LO )?' + re.escape(topic) + r'\.[A-Z]$', code):
                fail(f'{topic}: objective code {code!r} is not a {topic} code')
            if text.lower().startswith('i can'):
                fail(f'{topic}: the Objective column holds an I-can line rather '
                     f'than CED wording: {text[:60]!r}')
        if len(t['i_can'] or []) < 3:
            fail(f'{topic}: {len(t["i_can"] or [])} I-can lines')

    def walk(v, path, key=None):
        if isinstance(v, str):
            if key in ('code', 'output'):
                return
            for kind, rx in VOICE:
                m = rx.search(v)
                if m:
                    fail(f'{topic} {path} is directional ({kind}): '
                         f'{m.group(0)!r} in {v[:70]!r}')
            m = PHANTOM.search(v)
            if m:
                fail(f'{topic} {path} promises material the bundle does not '
                     f'contain: {m.group(0)!r}')
        elif isinstance(v, (list, tuple)):
            for i, x in enumerate(v):
                walk(x, f'{path}[{i}]', key)
        elif isinstance(v, dict):
            for k, x in v.items():
                walk(x, f'{path}.{k}' if path else k, k)

    # The voice rule runs over WHAT THIS BUILD INTRODUCES and nothing else: the
    # CED objectives, the I-can lines, the lesson page, the independent-practice
    # text and the two structural notes.
    #
    # It deliberately does NOT run over the kit's own bell ringers, worked
    # examples and teaching sections, which carry 98 directional lines across
    # the 38 topics. That is a real defect and it is not fixed here, because the
    # obvious fix is wrong: the theme specs hold the same lessons with far fewer
    # such lines, but their segment titles differ from the kit's, so importing
    # them would give a teacher a guide describing a different lesson from the
    # slide deck and guided notes in the same folder. The guide has to match the
    # deck. Repairing the kit's own wording is the fix, and it is authoring
    # across 38 topics rather than an import.
    #
    # Scoping the rule this way keeps it honest: everything this build adds is
    # clean, and it does not pretend to have cleaned what it left alone.
    if t['i_can']:
        walk(t['i_can'], 'i_can')
    for n, d in enumerate(t['days'], start=1):
        for field in ('lesson_page', 'independent', 'objectives_note', 'exit_note'):
            if d.get(field):
                walk(d[field], f'days[{n}].{field}')
    if t['overlaid']:
        walk([list(o) for o in t['days'][0]['objectives']], 'objectives')
    return t


def render(t, out_root):
    d = os.path.join(out_root, f"Unit_{t['unit']}_{UNIT_TITLES[t['unit']]}",
                     t['folder'])
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, 'Teacher_Guide.docx')
    kw = {'i_can': t['i_can']} if t['i_can'] else {}
    build_teacher_guide(p, t['topic'], t['title'], t['handle'], t['days'],
                        t['vocab'], t['quiz'], GRADED_LINE, **kw)
    return p


def load_content():
    with open(CONTENT, encoding='utf-8') as fh:
        raw = json.load(fh)
    prov = raw.get('_provenance') or {}
    extra = {k: v for k, v in raw.items() if not k.startswith('_')}
    return (extra, prov.get('excluded') or {},
            prov.get('live_handle_override') or {})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='build/csa-u234-guides')
    ap.add_argument('--topic')
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    extra, excluded, moved = load_content()
    kit = load_kit()

    # The closure check. Every one of the 38 kit topics is either overlaid, with
    # a handle that MATCHES the kit's, or named in the export's excluded map.
    # Nothing falls through in silence, and a spec that gets fixed upstream shows
    # up here as a topic in both sets rather than as a guide nobody looked at.
    #
    # Matching on the handle is the whole point. The number matched for all 38
    # and six of them were different lessons.
    for topic in sorted(kit):
        _u, k = kit[topic]
        if topic in extra and topic in excluded:
            fail(f'{topic} is both overlaid and excluded; the export and its '
                 f'excluded map disagree')
        if topic in extra:
            h = extra[topic]['handle']
            # The one declared exception is a topic whose handle MOVED: 3.6 is
            # the same lesson under two slug spellings and the kit's is the one
            # that 404s, so the export carries the live handle on purpose and
            # the guide prints a URL that resolves.
            if h != k['handle'] and moved.get(topic) != h:
                fail(f'{topic}: the export carries handle {h!r} and the kit has '
                     f'{k["handle"]!r}. A topic number is not an identity; see '
                     f'scripts/export-csa-units-2-4-guide-content.js')
        elif topic not in excluded:
            fail(f'{topic}: no exported content and not named as excluded')
        else:
            # The excluded map names the page this lesson is actually served at,
            # and the guide prints it. If the kit ever moves a handle, that shows
            # up here rather than as a URL a teacher clicks and gets a 404.
            live = (excluded[topic] or {}).get('live_handle')
            if live != k['handle']:
                fail(f'{topic}: the export records live handle {live!r} and the '
                     f'kit has {k["handle"]!r}')
    for topic in sorted(set(extra) - set(kit)):
        fail(f'{topic}: exported content for a topic the kit does not have')

    order = sorted(kit, key=lambda s: (int(s.split('.')[0]), int(s.split('.')[1])))
    topics = [x for x in order if not args.topic or x == args.topic]
    if args.topic and not topics:
        fail(f'{args.topic} is not a Units 2-4 topic')

    total = {'lesson_page': 0, 'independent': 0, 'objectives_note': 0,
             'exit_note': 0}
    objs = 0
    bare = []
    for topic in topics:
        unit, k = kit[topic]
        t = validate(assemble(topic, unit, k, extra.get(topic)))
        objs += len(t['days'][0]['objectives']) if t['overlaid'] else 0
        for key in total:
            total[key] += t['filled'][key]
        bare += [f'{topic} {b}' for b in t['bare']]
        note = '' if t['overlaid'] else '   retired spec, structural rows only'
        if args.check:
            print(f"  {topic:<5} ok   {len(t['days'])}d  "
                  f"{len(t['days'][0]['objectives']) if t['overlaid'] else 0} "
                  f"CED objectives  {len(t['quiz'])} exit  {t['title']}{note}")
        else:
            p = render(t, args.out)
            print(f"  {topic:<5} {os.path.relpath(p, args.out)}{note}")

    verb = 'validated' if args.check else 'written'
    n_over = sum(1 for x in topics if x in extra)
    print(f'\n{len(topics)} Units 2-4 teacher guides {verb}, {n_over} overlaid')
    print(f'  {objs} CED objectives, and the rows that used to print bare: '
          f"{total['lesson_page']} lesson pages, {total['independent']} "
          f"independent, {total['objectives_note']} objectives rows, "
          f"{total['exit_note']} exit rows")
    if bare:
        print(f'  {len(bare)} headings stay bare, on the retired-spec topics '
              f'only: ' + ', '.join(bare))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Build the 15 AP CSA Unit 1 Teacher_Guide.docx files.

    python3 scripts/build-csa-unit1-teacher-guides.py --out build/csa-unit1-guides
    python3 scripts/build-csa-unit1-teacher-guides.py --out /tmp/x --topic 1.3
    python3 scripts/build-csa-unit1-teacher-guides.py --check     # validate, write nothing

WHY THIS EXISTS SEPARATELY FROM build-csa-teacher-kit.py
That builder writes a whole unit: decks, guided notes, quizzes and the guide,
from content_unit<N>.py. Unit 1 has content for exactly one topic there, 1.6,
and rebuilding its decks is board 255. This writes the ONE document Unit 1 is
missing and touches nothing a teacher already has.

WHERE THE CONTENT COMES FROM
  docs/rescued/csa-unit1-teacher-guides/   the shipped guides, verbatim
  csa_kit/unit1_repairs.py                 every change made to them, and why
  config/csa-unit1-lesson-pages.json       the lesson-page block, from the theme
                                           repo's already repaired exercises

Three sources, so what the original said, what we decided to change, and what
the live page actually offers stay separate things that can each be checked.

THE CHECKS RUN ON THE OUTPUT, NOT THE INPUT
validate() reads the assembled content, which is the only place the three
sources meet. A rule that passes on the repairs file and never sees the merged
result is the shape of check this repo has been caught by five times.
"""

import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))

from csa_kit import unit1_repairs as R           # noqa: E402
from csa_kit.notes import build_teacher_guide    # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util                            # noqa: E402
_spec = importlib.util.spec_from_file_location(
    'parse_guides', os.path.join(ROOT, 'scripts', 'parse-csa-unit1-guides.py'))
parse_guides = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(parse_guides)

LESSON_PAGES = os.path.join(ROOT, 'config', 'csa-unit1-lesson-pages.json')
GRADED_LINE = ('6 checks for understanding, 1 code exercise, '
               '1 debugging exercise, the topic quiz')

HANDLES = {
    '1.1': 'ap-csa-lesson-1-1-intro-algorithms',
    '1.2': 'ap-csa-lesson-1-2-variables-data-types',
    '1.3': 'ap-csa-lesson-1-3-expressions-assignment',
    '1.4': 'ap-csa-lesson-1-4-assignment-statements-input',
    '1.5': 'ap-csa-lesson-1-5-casting-range',
    '1.6': 'ap-csa-lesson-1-6-compound-assignment',
    '1.7': 'ap-csa-lesson-1-7-api-libraries',
    '1.8': 'ap-csa-lesson-1-8-documentation-comments',
    '1.9': 'ap-csa-lesson-1-9-method-signatures',
    '1.10': 'ap-csa-lesson-1-10-calling-class-methods',
    '1.11': 'ap-csa-lesson-1-11-math-class',
    '1.12': 'ap-csa-lesson-1-12-objects-instances',
    '1.13': 'ap-csa-lesson-1-13-object-creation',
    '1.14': 'ap-csa-lesson-1-14-calling-instance-methods',
    '1.15': 'ap-csa-lesson-1-15-string-manipulation',
}

# The Drive folder each guide belongs in. Taken from the folder names that are
# already there rather than derived from the title: 1.1's folder is
# Lesson_1.1_Intro_to_Algorithms and its title is "Introduction to Algorithms,
# Programming, and Compilers", so a derived name lands beside the lesson
# instead of in it.
FOLDERS = {
    '1.1': 'Lesson_1.1_Intro_to_Algorithms',
    '1.2': 'Lesson_1.2_Variables_and_Data_Types',
    '1.3': 'Lesson_1.3_Expressions_and_Output',
    '1.4': 'Lesson_1.4_Assignment_and_Input',
    '1.5': 'Lesson_1.5_Casting_and_Range',
    '1.6': 'Lesson_1.6_Compound_Assignment',
    '1.7': 'Lesson_1.7_API_and_Libraries',
    '1.8': 'Lesson_1.8_Documentation_Comments',
    '1.9': 'Lesson_1.9_Method_Signatures',
    '1.10': 'Lesson_1.10_Calling_Class_Methods',
    '1.11': 'Lesson_1.11_Math_Class',
    '1.12': 'Lesson_1.12_Objects_Instances',
    '1.13': 'Lesson_1.13_Object_Creation',
    '1.14': 'Lesson_1.14_Calling_Instance_Methods',
    '1.15': 'Lesson_1.15_String_Manipulation',
}

# ── the rules the assembled guide has to pass ────────────────────────────────
#
# The marker sets are the theme bundle's, from lib/spec.js validateVoice, plus
# the idioms that pass survived on: a hand count, a show of hands, collecting
# predictions, "out loud". They are narrow on purpose. A first draft that
# flagged "the whole class" would have caught Java rather than a grouping, and
# a rule that cries wolf gets switched off inside a week.
VOICE = [
    ('pacing', re.compile(r'\b\d+\s*min(?:ute)?s?\b|\byou have \d+ minutes\b', re.I)),
    ('grouping', re.compile(
        r'\bin pairs\b|\bas pairs\b|\bwith a partner\b|\bas a class\b'
        r'|\bwhole-class\b|\bcold[- ]call\b|\bin groups\b|\bboth partners\b'
        r'|\bpartners must\b|\btrade with a neighbor\b|\bfind a neighbor\b', re.I)),
    ('staging', re.compile(
        r'\bon the board\b|\bthe board\b|\bask the class\b|\bask students\b'
        r'|\bhave students\b|\btell students\b|\btake a vote\b|\btake a hand count\b'
        r'|\bshow of hands\b|\bdo it live\b|\bmove the class\b|\bmove to the live\b'
        r'|\bdo not skip\b|\bdo not reveal\b|\bcollect answers\b'
        r'|\bcollect predictions\b|\bpush until\b|\bout loud\b', re.I)),
]

# Material a teacher does not have. "handout" is the whole word rather than a
# phrase, because the originals promise one in four different wordings.
PHANTOM = re.compile(r'\bhandout\b|\bon this sheet\b|\bscenario cards\b', re.I)

# Differentiation is exempt from the voice rule and only from the voice rule.
# csa_kit/differentiation.py sets the house style as concrete classroom moves a
# teacher can run tomorrow, and took that style from the Unit 1 Topic 1.3 guide.
# A Support item that refuses to say what to do is not informational, it is
# empty. Phantom material is still refused here.
VOICE_EXEMPT = ('support', 'stretch')


def fail(msg):
    raise SystemExit('csa-unit1-guides: ' + msg)


def strings(obj, path='', key=None, skip=()):
    """Every prose string in the assembled topic, with where it came from."""
    out = []
    if isinstance(obj, str):
        if key not in ('code', 'output'):
            out.append((path, obj))
    elif isinstance(obj, (list, tuple)):
        for i, v in enumerate(obj):
            out += strings(v, f'{path}[{i}]', key, skip)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k in skip:
                continue
            out += strings(v, f'{path}.{k}' if path else k, k, skip)
    return out


# The structural headings carry their own staging, and one of them carries the
# phantom material outright: "Independent practice: nine scenario cards" names
# nine cards that do not exist in any folder. A heading is not prose we can edit
# around, so the four generated ones are normalized and the descriptive ones,
# the teaching segments, are left exactly as the source wrote them.
def heading(label, topic, day):
    low = label.lower()
    if low.startswith('bell ringer'):
        return 'Bell ringer: ' + R.WARMUP[topic][day][0]
    if low.startswith('worked'):
        return 'Worked example'
    if low.startswith('independent practice'):
        return 'Independent practice'
    if low.startswith('exit ticket'):
        return 'Exit ticket'
    if low.startswith('misconception check:'):
        name = label.split(':', 1)[1].strip()
        return 'Misconception check: ' + name[:1].upper() + name[1:]
    return label


def apply_replacements(topic, guide):
    """Apply this topic's REPLACE pairs, each an exact number of times."""
    pairs = R.REPLACE.get(topic, [])
    counts = [0] * len(pairs)

    def walk(v):
        if isinstance(v, str):
            for i, (find, repl, _n) in enumerate(pairs):
                if find in v:
                    counts[i] += v.count(find)
                    v = v.replace(find, repl)
            return v
        if isinstance(v, list):
            return [walk(x) for x in v]
        if isinstance(v, dict):
            return {k: walk(x) for k, x in v.items()}
        return v

    out = walk(guide)
    for (find, _repl, want), got in zip(pairs, counts):
        if got != want:
            fail(f'{topic}: replacement expected {want} match(es), found {got}. '
                 f'The source has moved under it: {find[:60]!r}')
    return out


def assemble(topic, guide, lesson_pages):
    """One parsed guide plus its repairs, in the shape build_teacher_guide reads."""
    for name, table in (('WARMUP', R.WARMUP), ('WORKED', R.WORKED),
                        ('EXIT', R.EXIT), ('INDEPENDENT', R.INDEPENDENT),
                        ('HOMEWORK', R.HOMEWORK)):
        if topic not in table:
            fail(f'{topic}: no {name} repair authored')

    guide = apply_replacements(topic, guide)
    days = []
    for d in guide['days']:
        n = d['day']
        if n not in R.WARMUP[topic]:
            fail(f'{topic} day {n}: no bell ringer authored')
        if n not in R.WORKED[topic]:
            fail(f'{topic} day {n}: no worked example authored')

        schedule, sections, misconception, stopthink = [], [], None, []
        for s in d['segments']:
            low = s['label'].lower()
            schedule.append((s['minutes'], heading(s['label'], topic, n)))
            if low.startswith('misconception'):
                head = s['label'].split(':', 1)[1].strip() if ':' in s['label'] else s['label']
                head = head[:1].upper() + head[1:]
                body = ' '.join(s['body'])
                # The segment body is "Heading: truth". Take the truth half by
                # the heading it already carries rather than by splitting on the
                # first colon, which lands inside "Cast scope: the cast grabs".
                if body.lower().startswith(head.lower() + ':'):
                    body = body[len(head) + 1:].strip()
                misconception = {'heading': head, 'truth': body}
                over = R.MISCONCEPTION.get(topic, {}).get(n)
                if over:
                    misconception = {'heading': over[0], 'truth': over[1]}
            elif low.startswith('stop and think'):
                stopthink = R.STOPTHINK.get(topic, {}).get(
                    n, [x for x in s['body'] if x.strip()])
            elif not any(low.startswith(p) for p in
                         ('bell ringer', 'objectives and guided', 'worked',
                          'guided practice', 'independent practice', 'exit ticket')):
                sections.append((s['label'], s['body']))

        day = {
            'day': n,
            'focus': d['focus'],
            'schedule': schedule,
            'sections': sections,
            'warmup': R.WARMUP[topic][n],
            'worked': {'note': R.WORKED[topic][n]},
            'independent': R.INDEPENDENT[topic],
            'discussion': stopthink,
        }
        if misconception:
            day['misconception'] = misconception
        if n == len(guide['days']):
            day['lesson_page'] = lesson_pages[topic]
        if n == 1:
            day['objectives'] = [(o['text'], o['code']) for o in guide['objectives']]
        days.append(day)

    quiz = []
    authored = R.EXIT[topic]
    if len(authored) != len(guide['exitTicket']):
        fail(f'{topic}: {len(guide["exitTicket"])} exit stems, '
             f'{len(authored)} authored answers')
    for parsed, a in zip(guide['exitTicket'], authored):
        if a.get('free'):
            quiz.append({'stem': parsed['stem'], 'options': [], 'answer_index': -1,
                         'free_answer': parsed['answer'], 'why': a['why']})
            continue
        opts, idx = a['options'], a['answer_index']
        letter = parsed['answer'].strip()
        if not re.fullmatch(r'[A-D]', letter):
            fail(f'{topic} exit {parsed["n"]}: authored options against a '
                 f'non-letter answer {letter!r}')
        if 'ABCD'.index(letter) != idx:
            fail(f'{topic} exit {parsed["n"]}: the shipped key says {letter}, '
                 f'the authored options put the answer at '
                 f'{"ABCD"[idx]}. The two documents would disagree.')
        quiz.append({'stem': parsed['stem'], 'options': opts,
                     'answer_index': idx, 'why': a['why']})

    return {
        'topic': topic, 'title': guide['title'], 'handle': HANDLES[topic],
        'days': days, 'quiz': quiz, 'traps': guide['traps'],
        'i_can': guide['iCan'], 'homework': R.HOMEWORK[topic],
        'support': guide['support'], 'stretch': guide['stretch'],
    }


def validate(t):
    topic = t['topic']
    for path, text in strings(t, skip=('handle',)):
        head = path.split('.')[0].split('[')[0]
        if head not in VOICE_EXEMPT:
            for kind, rx in VOICE:
                m = rx.search(text)
                if m:
                    fail(f'{topic} {path} is directional ({kind}): {m.group(0)!r} '
                         f'in {text[:70]!r}')
        m = PHANTOM.search(text)
        if m:
            fail(f'{topic} {path} promises material the bundle does not '
                 f'contain: {m.group(0)!r} in {text[:70]!r}')

    for q in t['quiz']:
        if q['answer_index'] < 0:
            if not q.get('free_answer'):
                fail(f'{topic}: a free-response exit item with no answer')
            continue
        if len(q['options']) < 3:
            fail(f'{topic}: exit item with {len(q["options"])} options')
        if not 0 <= q['answer_index'] < len(q['options']):
            fail(f'{topic}: exit answer index out of range')
        if not q.get('why'):
            fail(f'{topic}: exit item with no explanation')

    if len(t['traps']) < 3:
        fail(f'{topic}: {len(t["traps"])} traps')
    if len(t['i_can']) < 3:
        fail(f'{topic}: {len(t["i_can"])} I can lines')
    if not t['support'] or not t['stretch']:
        fail(f'{topic}: differentiation half missing')

    # Nothing inside one topic may print twice. The source ran 1.5's day 3 on
    # day 2's bell ringer and worked example, and its "Cast scope" misconception
    # check on two separate days, so a teacher reading the guide met the same
    # paragraph three times.
    for field, get in (('bell ringer', lambda d: d['warmup'][1]),
                       ('worked example', lambda d: d['worked']['note']),
                       ('misconception', lambda d: (d.get('misconception') or {}).get('truth')),
                       ('wrap-up note', lambda d: ' '.join(d.get('discussion') or []))):
        seen = set()
        for d in t['days']:
            v = get(d)
            if not v:
                continue
            if v in seen:
                fail(f'{topic} day {d["day"]}: repeats an earlier day\'s {field}, '
                     f'so the same paragraph prints twice')
            seen.add(v)
        mins = sum(m for m, _ in d['schedule'])
        if not 50 <= mins <= 70:
            fail(f'{topic} day {d["day"]}: {mins} min of content')
    return t


def render(t, out_root):
    from csa_kit import differentiation as D
    D.DIFFERENTIATION[t['topic']] = {'support': t['support'], 'stretch': t['stretch']}

    quiz = t['quiz']
    traps = list(t['traps'])

    d = os.path.join(out_root, FOLDERS[t['topic']])
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, 'Teacher_Guide.docx')
    build_teacher_guide(path, t['topic'], t['title'], t['handle'], t['days'],
                        [], quiz, GRADED_LINE,
                        i_can=t['i_can'], traps=traps,
                        homework=t['homework'])
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='build/csa-unit1-guides')
    ap.add_argument('--topic')
    ap.add_argument('--check', action='store_true',
                    help='assemble and validate, write nothing')
    args = ap.parse_args()

    with open(LESSON_PAGES, encoding='utf-8') as fh:
        lesson_pages = {k: v for k, v in json.load(fh).items()
                        if not k.startswith('_')}

    guides = parse_guides.build()
    topics = [t for t in parse_guides.TOPICS
              if (not args.topic or t == args.topic) and t in R.WARMUP]
    if args.topic and not topics:
        fail(f'{args.topic}: no repairs authored yet')

    built = 0
    for topic in topics:
        t = validate(assemble(topic, guides[topic], lesson_pages))
        if args.check:
            print(f"  {topic:<5} ok   {len(t['days'])}d  {len(t['quiz'])} exit  "
                  f"{len(t['traps'])} traps  {t['title']}")
        else:
            p = render(t, args.out)
            print(f"  {topic:<5} {os.path.relpath(p, args.out)}")
        built += 1

    verb = 'validated' if args.check else 'written'
    print(f'\n{built} of 15 Unit 1 teacher guides {verb}')
    if built < 15:
        missing = [t for t in parse_guides.TOPICS if t not in R.WARMUP]
        print('still to author: ' + ', '.join(missing))


if __name__ == '__main__':
    main()

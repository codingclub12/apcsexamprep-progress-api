#!/usr/bin/env python3
"""
Parse the rescued AP CSA Unit 1 teacher guides into structured JSON.

    python3 scripts/parse-csa-unit1-guides.py            # all 15, to stdout summary
    python3 scripts/parse-csa-unit1-guides.py --json out.json

WHAT THIS IS
Mechanical extraction from docs/rescued/csa-unit1-teacher-guides/*.txt, which
are the verbatim text of the 15 Teacher_Guide.docx files in Drive. It reads
structure and changes nothing: the repairs live in
config/csa-unit1-guide-repairs.json and are applied by
build-csa-unit1-guide-content.py, so that what the source said and what we
decided to change about it stay two separate, diffable things.

WHY IT CAN BE MECHANICAL
The guides were generated, so their shape is regular. A teaching segment is any
block whose first line ends in "(N min)", which is unambiguous: no prose line in
any of the 15 ends that way. Everything between one such heading and the next
belongs to it. That single rule carries the whole parse, and the assertions at
the bottom of build() are what say it held.

The Drive text rendering escapes markdown, so "1\\." arrives for "1." and "\\*"
for "*". Those escapes are stripped here rather than in the rescue, because the
rescue is verbatim by contract.
"""

import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'docs', 'rescued', 'csa-unit1-teacher-guides')

TOPICS = ['1.%d' % n for n in range(1, 16)]

SEG_RE = re.compile(r'^(?P<label>.+?)\s*\((?P<min>\d+)\s*min\)$')
TOPIC_RE = re.compile(r'^Topic (?P<topic>\d+\.\d+): (?P<title>.+)$')
DAYLINE_RE = re.compile(r'^(?P<days>\d+) days? \|')
OBJ_RE = re.compile(r'^\|\s*(?P<code>\d+\.\d+\.[A-Z])\s*\|\s*(?P<text>.+?)\s*\|$')
ANSWER_RE = re.compile(r'^Answer:\s*(?P<answer>.+)$')

SECTIONS = ('Learning objectives', 'Students will be able to', 'How the days run',
            'Exit ticket, with answers', 'Traps this topic sets', 'Differentiation',
            'Support', 'Stretch', 'Homework')


def unescape(s):
    """Undo the markdown escaping the Drive text rendering adds."""
    return re.sub(r'\\([.*_<>!=\\-])', r'\1', s)


def blocks(text):
    """Split into blank-line separated blocks, each a list of lines."""
    out, cur = [], []
    for raw in text.split('\n'):
        line = unescape(raw.rstrip())
        if line.strip():
            cur.append(line)
        elif cur:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def parse(topic, text):
    bs = blocks(text)
    g = {'topic': topic, 'objectives': [], 'iCan': [], 'days': [],
         'exitTicket': [], 'traps': [], 'support': [], 'stretch': [], 'homework': []}

    section = None
    day = None
    seg = None

    for b in bs:
        head = b[0]

        m = TOPIC_RE.match(head)
        if m:
            g['title'] = m.group('title')
            assert m.group('topic') == topic, f'{topic}: file says {m.group("topic")}'
            continue
        m = DAYLINE_RE.match(head)
        if m:
            g['dayCount'] = int(m.group('days'))
            continue

        if head in SECTIONS:
            section = head
            day = None
            seg = None
            continue
        if head.startswith('AP is a trademark') or head.startswith('APCSExamPrep.com'):
            section = None
            continue
        if head == 'TEACHER GUIDE':
            continue

        if section == 'Learning objectives':
            for line in b:
                m = OBJ_RE.match(line)
                if m:
                    g['objectives'].append({'code': m.group('code'), 'text': m.group('text')})
            continue

        if section == 'Students will be able to':
            g['iCan'].append(' '.join(b))
            continue

        if section == 'How the days run':
            m = re.match(r'^Day (\d+)$', head)
            if m:
                day = {'day': int(m.group(1)), 'focus': None, 'segments': []}
                g['days'].append(day)
                seg = None
                continue
            if day is None:
                continue
            m = SEG_RE.match(head)
            if m:
                seg = {'label': m.group('label').strip(), 'minutes': int(m.group('min')),
                       'body': []}
                day['segments'].append(seg)
                continue
            if seg is not None:
                seg['body'].append(' '.join(b))
            elif day['focus'] is None:
                day['focus'] = ' '.join(b)
            continue

        if section == 'Exit ticket, with answers':
            m = ANSWER_RE.match(head)
            if m and g['exitTicket']:
                g['exitTicket'][-1]['answer'] = m.group('answer')
                continue
            m = re.match(r'^(\d+)\.\s*(.*)$', head)
            if m:
                stem = [m.group(2)] + b[1:]
                g['exitTicket'].append({'n': int(m.group(1)),
                                        'stem': '\n'.join(x for x in stem if x.strip()),
                                        'answer': None})
            continue

        if section == 'Traps this topic sets':
            g['traps'].append(' '.join(b))
            continue
        if section == 'Support':
            g['support'].append(' '.join(b))
            continue
        if section == 'Stretch':
            g['stretch'].append(' '.join(b))
            continue
        if section == 'Homework':
            g['homework'].append(' '.join(b))
            continue

    return g


def build():
    out = {}
    for t in TOPICS:
        p = os.path.join(SRC, f'{t}.txt')
        with open(p, encoding='utf-8') as fh:
            g = parse(t, fh.read())
        # Assertions, not warnings. A parse that half worked is worse than one
        # that failed, because the missing half is invisible downstream.
        assert g.get('title'), f'{t}: no title'
        assert g['objectives'], f'{t}: no learning objectives'
        assert len(g['iCan']) >= 3, f'{t}: {len(g["iCan"])} iCan lines'
        assert len(g['days']) == g['dayCount'], \
            f'{t}: day line says {g["dayCount"]}, found {len(g["days"])}'
        for d in g['days']:
            assert d['focus'], f'{t} day {d["day"]}: no focus line'
            assert d['segments'], f'{t} day {d["day"]}: no segments'
        assert len(g['exitTicket']) >= 3, f'{t}: {len(g["exitTicket"])} exit items'
        for q in g['exitTicket']:
            assert q['answer'], f'{t} exit {q["n"]}: no answer'
        assert len(g['traps']) >= 3, f'{t}: {len(g["traps"])} traps'
        assert g['support'] and g['stretch'], f'{t}: differentiation half missing'
        assert g['homework'], f'{t}: no homework'
        out[t] = g
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--json', help='write the parsed structure here')
    args = ap.parse_args()

    guides = build()
    if args.json:
        with open(args.json, 'w', encoding='utf-8') as fh:
            json.dump(guides, fh, indent=1, ensure_ascii=False)
        print(f'wrote {args.json}')

    segs = sum(len(d['segments']) for g in guides.values() for d in g['days'])
    days = sum(len(g['days']) for g in guides.values())
    print(f'{len(guides)} guides, {days} days, {segs} segments')
    for t in TOPICS:
        g = guides[t]
        print(f"  {t:<5} {len(g['days'])}d  {len(g['objectives'])} LO  "
              f"{len(g['iCan'])} iCan  {len(g['exitTicket'])} exit  "
              f"{len(g['traps'])} traps  {len(g['support'])}/{len(g['stretch'])} diff  "
              f"{g['title']}")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Write config/csa-slide-days.json from the teacher-kit content source.

WHY THIS EXISTS. config/csa-slide-manifest.js needs one day count per lesson so
decksForLesson knows how many days to look up. The authority for that number is
scripts/csa_kit/content_unit<N>.py, which is Python, and the manifest is
JavaScript. Rather than have a human retype 38 numbers into a JS file and let
them rot, this reads the content modules and emits JSON that the manifest
requires directly.

It reads the CONTENT SOURCE, never build/csa-kit. The built kit is gitignored,
so a manifest derived from it would be correct on the machine that ran the
build and unreproducible everywhere else.

Usage:
    python3 scripts/csa-deck-days-from-content.py            # write
    python3 scripts/csa-deck-days-from-content.py --check    # refuse a drift
"""

import argparse
import importlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

OUT = os.path.join(ROOT, 'config', 'csa-slide-days.json')


def load_unit(unit):
    topics = []
    for suffix in ('', 'b', 'c', 'd', 'e'):
        try:
            m = importlib.import_module(f'csa_kit.content_unit{unit}{suffix}')
        except ModuleNotFoundError:
            continue
        topics.extend(m.TOPICS)
    return topics


def build():
    days = {}
    titles = {}
    for unit in (2, 3, 4):
        for t in load_unit(unit):
            key = t['topic'].replace('.', '-')
            n = len(t['days'])
            if n < 1:
                raise SystemExit(f"topic {t['topic']} has no days")
            days[key] = n
            titles[key] = t['title']
    return days, titles


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    days, titles = build()
    payload = {
        '_comment': [
            'GENERATED FILE. Do not hand-edit.',
            'Regenerate with: python3 scripts/csa-deck-days-from-content.py',
            'Verify with:     npm run smoke:csadeckdays',
            '',
            'One entry per AP CSA lesson that has an authored teacher-kit deck set.',
            'The value is the number of TEACHING DAYS for that lesson, which is the',
            'number of Day<N>_Deck_*.pptx pairs the kit builder emits. Read out of',
            'scripts/csa_kit/content_unit<N>.py, which is the authored source.',
            '',
            'UNIT 1 IS ABSENT ON PURPOSE. Its decks were authored before the kit',
            'builder existed and live only in Google Drive, so this file cannot',
            'derive them and must not guess. config/csa-slide-manifest.js keeps its',
            'own Unit 1 table.',
        ],
        'source': 'scripts/csa_kit/content_unit{2,3,4}*.py',
        'titles': titles,
        'days': days,
    }
    text = json.dumps(payload, indent=2) + '\n'

    if args.check:
        if not os.path.exists(OUT):
            raise SystemExit(f"{OUT} does not exist; run without --check")
        cur = open(OUT).read()
        if cur != text:
            raise SystemExit(
                "config/csa-slide-days.json is out of date with the content "
                "source. Run: python3 scripts/csa-deck-days-from-content.py")
        print(f"csa-slide-days.json matches the content source "
              f"({len(days)} lessons, {sum(days.values())} days)")
        return

    open(OUT, 'w').write(text)
    per = {}
    for k, v in days.items():
        per.setdefault(k.split('-')[0], 0)
        per[k.split('-')[0]] += v
    print(f"wrote {OUT}")
    print(f"  {len(days)} lessons, {sum(days.values())} teaching days")
    for u in sorted(per):
        print(f"  unit {u}: {per[u]} days")


if __name__ == '__main__':
    main()

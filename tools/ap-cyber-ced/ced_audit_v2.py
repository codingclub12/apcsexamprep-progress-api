#!/usr/bin/env python3
"""
ced_audit_v2.py - AP Cybersecurity CED-alignment auditor for ANY unit.

Usage:
    python3 ced_audit_v2.py [dir_of_page_json] [--unit N]

Expects one <handle>.json per page, each the raw Shopify
GET /pages/<handle>.json response, as fetch_pages.sh writes.

    WHY THIS EXISTS AND WHAT IT FIXES IN ced_audit.py

ced_audit.py hard-codes a term list built for Unit 1 and labels it "terms that
are NOT in the Fall 2026 CED at all". That description is wrong for eleven of
its twenty-seven terms. Checked against the CED PDF on 2026-08-27:

    credential stuffing  Unit 4      rainbow table    Unit 4
    password spraying    Unit 4      keylogger        Units 2 and 4
    brute force          Unit 4      honeypot         Unit 5
    man-in-the-middle    Unit 3      rogue access pt  Unit 3
    wpa3                 Unit 3      shoulder surfing Unit 2
    dumpster diving      Unit 2

Every one of those is real CED content that simply does not belong to Unit 1.
Running the Unit 1 list against Units 2 through 5 therefore reports correct
material as a violation, which is the most expensive kind of false positive:
it sends someone to rewrite a page that was right.

So the term list is no longer hard-coded per unit. `ced_term_index.json` maps
each term to the set of CED units whose framework section contains it, built
from the PDF itself, and this script asks a different question per term:

  OFF-CED     the term appears in NO unit framework and nowhere else in the
              CED, and the CED has no other name for the concept. Real
              off-syllabus content.
  WRONG-TERM  the CED teaches this concept under a DIFFERENT name. Teaching
              "mantrap" when the CED says "vestibule" costs a student the
              exam item even though they learned the idea. Listed in RENAMES.
  WRONG-UNIT  the term is CED content owned by a different unit. Sometimes a
              deliberate callback, sometimes a topic taught in the wrong
              place. Always needs a human to read the context.

    THREE PLACES TEXT HIDES

Carried over from ced_audit.py, and still the point. BODY is prose outside
script and style. JS is text inside non-JSON-LD <script>, which on the
activity pages is student-facing content that happens to be rendered by code
and counts exactly as much as BODY. META is JSON-LD, which is search metadata
and never the urgent hit. A count printed as 12+3 means 12 in BODY, 3 in JS.

Matching is punctuation-insensitive on both sides. The CED's PDF text carries
hyphenation artifacts from line breaks ("network- based firewalls" appears
verbatim in LO 3.4.A), so a word-boundary regex over the raw extract misses
real hits and reports terms as absent when they are present. Squashing both
the CED and the page to [a-z0-9] before comparing is what makes the index
trustworthy; an earlier run of this file without it called 85 terms absent,
and 27 of those were extraction damage rather than content.
"""
import sys
import os
import re
import json
import glob
import html

HERE = os.path.dirname(os.path.abspath(__file__))

# The CED teaches the concept, under another name. Left side is what pages say,
# right side is the CED's own wording. Verified against the PDF 2026-08-27.
RENAMES = {
    'mantrap': 'vestibule (2.3)',
    'access vestibule': 'vestibule (2.3)',
    'cctv': 'camera (2.3, 2.4)',
    'surveillance': 'camera (2.3, 2.4)',
    'dns spoofing': 'DNS poisoning (3.1)',
    'arp spoofing': 'ARP poisoning (3.1)',
    'packet sniffing': 'sniffing (3.1)',
    'input validation': 'input sanitization (5.5.B)',
    'audit log': 'log file',
    'event log': 'log file',
    'cia triad': 'confidentiality, integrity, availability (the CED never says "CIA triad")',
    'kill chain': 'phases of a cyberattack (2.1.C, six phases)',
    'weaponization': 'phases of a cyberattack (2.1.C, six phases)',
    'actions on objectives': 'phases of a cyberattack (2.1.C, six phases)',
}

# Inflections the CED covers under a different form. NOT defects; listed so the
# report can stay quiet about them instead of a human re-deciding each run.
BENIGN_VARIANTS = {
    'preventive': 'preventative',
    'salting': 'salt',
    'biometrics': 'biometric',
}


def flatten(b):
    b = re.sub(r'<!--.*?-->', '', b, flags=re.S)
    return html.unescape(re.sub(r'<[^>]+>', ' ', b))


def regions(b):
    """Split a body into (body_prose, script_text, jsonld_text)."""
    ld = ' '.join(re.findall(
        r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', b, flags=re.S))
    rest = re.sub(
        r'<script[^>]*application/ld\+json[^>]*>.*?</script>', ' ', b, flags=re.S)
    js = ' '.join(re.findall(r'<script[^>]*>(.*?)</script>', rest, flags=re.S))
    prose = re.sub(r'<script.*?</script>', ' ', rest, flags=re.S)
    prose = re.sub(r'<style.*?</style>', ' ', prose, flags=re.S)
    return flatten(prose), flatten(js), flatten(ld)


def squash(s):
    return re.sub(r'[^a-z0-9]+', '', s.lower())


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    basedir = args[0] if args else '.'
    want = None
    for a in sys.argv[1:]:
        if a.startswith('--unit'):
            want = a.split('=')[-1] if '=' in a else None

    with open(os.path.join(HERE, 'ced_term_index.json')) as fh:
        index = json.load(fh)

    for f in sorted(glob.glob(os.path.join(basedir, '*.json'))):
        handle = os.path.basename(f)[:-5]
        try:
            page = json.load(open(f))['page']
        except Exception:
            continue
        m = re.search(r'unit-(\d)', handle)
        unit = m.group(1) if m else None
        if want and unit != want:
            continue

        prose, js, ld = regions(page['body_html'])
        sp, sj = squash(prose), squash(js)
        off, rename, wrong = {}, {}, {}
        for term, info in index.items():
            st = squash(term)
            if not st:
                continue
            n, j = sp.count(st), sj.count(st)
            if not (n or j):
                continue
            if term in BENIGN_VARIANTS:
                continue
            if term in RENAMES:
                rename[term] = (RENAMES[term], n, j)
            elif not info['units'] and not info['nonframework']:
                off[term] = (n, j)
            elif info['units'] and unit and unit not in info['units']:
                wrong[term] = (','.join(info['units']), n, j)

        lid = sorted(set(re.findall(
            r'data-lesson-id=["\']([^"\']+)', page['body_html'])))
        print(f'\n=== [u{unit or "?"}] {handle}  '
              f'({len(prose)} chars prose, {len(js)} in JS)  lesson-id={lid or "MISSING"}')

        def fmt(a, b_):
            return f'{a}+{b_}' if b_ else str(a)

        if off:
            print('   OFF-CED   :', ', '.join(
                f'{k}x{fmt(*v)}' for k, v in
                sorted(off.items(), key=lambda x: -(x[1][0] + x[1][1]))))
        if rename:
            print('   WRONG-TERM:', ', '.join(
                f'{k}x{fmt(v[1], v[2])} -> CED says {v[0]}' for k, v in
                sorted(rename.items(), key=lambda x: -(x[1][1] + x[1][2]))))
        if wrong:
            print('   WRONG-UNIT:', ', '.join(
                f'{k}(U{v[0]})x{fmt(v[1], v[2])}' for k, v in
                sorted(wrong.items(), key=lambda x: -(x[1][1] + x[1][2]))[:14]))
        if not lid and re.search(r'lesson-\d-(exercise|lab|quiz)', handle):
            print('   NO data-lesson-id: this activity cannot report progress.')
        if not (off or rename or wrong):
            print('   clean')


if __name__ == '__main__':
    main()

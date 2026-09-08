#!/usr/bin/env python3
"""A SECOND IMPLEMENTATION, WRITTEN TO DISAGREE.

CLAUDE.md asks a deploy to pass three independent kinds of check, and one of
them is a re-derivation: a separate program reaching the same conclusion from
the raw artifact. This reads the generated Matrixify sheet and the captured
fixtures and rebuilds every number the JavaScript reported, without importing
any of it.

Deliberately different where it can be:

  the JS walks lesson groups by id="ucn-lN" and slices between them;
  this one walks the <span|div class="ucn-steps" id="ucn-sN"> containers, which
  is the other half of the same structure. If the rail's shape is not what
  either program assumes, the two disagree instead of agreeing on a fiction.

  the JS decides a step is disabled with a regex over the whole attribute run;
  this one parses the style attribute into properties and reads opacity.

  the JS gets its lesson handles from config/cyber-topics.json through a
  helper; this one reads the CED extract text directly and pairs topic numbers
  with the handles the sheet uses, so a corrupted taxonomy file cannot make
  both agree.

Run: python3 scripts/cyber-u1-nav-rederive.py
"""

import csv
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'imports', '2026-09-08', 'cyber-u1-nav-repair-pages.csv')
FIX = os.path.join(ROOT, 'smoke', 'fixtures', 'live-bodies', 'cyber-u1-nav')

LABELS = ['Lesson', 'Ex 1', 'Ex 2', 'Lab', 'Quiz']

fails = []
passes = []


def ok(label, cond, detail=''):
    (passes if cond else fails).append(label)
    print('  %s  %s%s' % ('ok  ' if cond else 'FAIL', label, ('' if cond else ': ' + str(detail))))


def steps_by_container(body):
    """Lesson number -> list of (tag, attrs, text), found via the ucn-steps
    containers rather than by slicing between lesson anchors."""
    out = {}
    for m in re.finditer(r'<(span|div)\s+class="ucn-steps[^"]*"\s+id="ucn-s(\d)"\s*>', body):
        n = int(m.group(2))
        # walk forward to the matching close of this container
        depth = 0
        i = m.start()
        tag = m.group(1)
        for t in re.finditer(r'<(/?)%s\b[^>]*>' % tag, body[m.start():]):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                i = m.start() + t.end()
                break
        seg = body[m.end():i]
        nodes = []
        for s in re.finditer(r'<(a|span)\b([^>]*)>([^<]*)</\1>', seg):
            attrs = s.group(2)
            cls = re.search(r'class="([^"]*)"', attrs)
            if not cls or cls.group(1).split()[0] != 'ucn-step':
                continue
            nodes.append((s.group(1), attrs, s.group(3).strip()))
        out[n] = nodes
    return out


def style_props(attrs):
    m = re.search(r'style="([^"]*)"', attrs)
    if not m:
        return {}
    props = {}
    for part in m.group(1).split(';'):
        if ':' not in part:
            continue
        k, v = part.split(':', 1)
        props[k.strip().lower()] = v.strip().lower().replace('!important', '').strip()
    return props


def href_of(attrs):
    m = re.search(r'href="([^"]*)"', attrs)
    return m.group(1) if m else None


# ---------------------------------------------------------------------------
# The five lesson handles, read from the CED extract rather than the taxonomy
# JSON, so a corrupted taxonomy cannot make both programs agree.
def ced_titles():
    p = os.path.join(ROOT, 'tools', 'ap-cyber-ced', 'CED-UNIT1-EXTRACT.txt')
    text = open(p, encoding='utf-8').read()
    # The CED wraps a topic title over two or three lines and ends it at the
    # "Required Course Content" heading. Reading a single line gets you "Best
    # Practices for" and a check that looks strict and is not.
    out = {}
    for m in re.finditer(r'TOPIC\s+1\.(\d)\s*\n(.*?)Required Course Content', text, re.S):
        out['1.%s' % m.group(1)] = ' '.join(m.group(2).split())
    return out


print('\ncyber unit 1 navigator, re-derived\n')

rows = {}
commands = set()
# utf-8-sig: the writer emits a BOM for Excel, and a reader that does not strip
# it silently renames the first column to \ufeffHandle.
with open(SHEET, encoding='utf-8-sig', newline='') as fh:
    for r in csv.DictReader(fh):
        rows[r['Handle']] = r['Body HTML']
        commands.add(r['Command'])
ok('the sheet carries 10 rows', len(rows) == 10, len(rows))
ok('every row is a MERGE', commands == {'MERGE'}, sorted(commands))

before = {}
for f in os.listdir(FIX):
    if f.endswith('.html'):
        before[f[:-5]] = open(os.path.join(FIX, f), encoding='utf-8').read()
ok('28 fixtures were captured', len(before) == 28, len(before))
ok('every sheet row has a captured before', all(h in before for h in rows))

# The canonical target table, rebuilt here from the sheet's own majority.
votes = {}
for h, body in list(before.items()):
    for n, nodes in steps_by_container(body).items():
        for tag, attrs, text in nodes:
            if tag != 'a':
                continue
            hv = href_of(attrs)
            if hv:
                votes.setdefault('%d|%s' % (n, text), {}).setdefault(hv, 0)
                votes['%d|%s' % (n, text)][hv] += 1
table = {k: max(v.items(), key=lambda kv: kv[1])[0] for k, v in votes.items()}

ok('the majority puts 1.3 Lesson on wireless-security',
   table.get('3|Lesson') == '/pages/ap-cybersecurity-unit-1-wireless-security', table.get('3|Lesson'))
ok('the majority puts 1.4 Lesson on ai-driven-threats',
   table.get('4|Lesson') == '/pages/ap-cybersecurity-unit-1-ai-driven-threats', table.get('4|Lesson'))

titles = ced_titles()
ok('the CED text calls topic 1.3 Best Practices for Public Networks',
   'best practices for public networks' in titles.get('1.3', '').lower(), titles.get('1.3'))
ok('the CED text calls topic 1.4 an AI-based attacks topic',
   'ai' in titles.get('1.4', '').lower(), titles.get('1.4'))

# ---------------------------------------------------------------------------
# Re-derive the defect counts from the BEFORE bodies.
disabled_before = 0
disabled_pages = set()
crossed_before = 0
wrong_href_before = 0
for h, body in before.items():
    for n, nodes in steps_by_container(body).items():
        for tag, attrs, text in nodes:
            if tag == 'span' and style_props(attrs).get('opacity') == '0.4':
                disabled_before += 1
                disabled_pages.add(h)
            elif tag == 'a':
                want = table.get('%d|%s' % (n, text))
                if want and href_of(attrs) != want:
                    wrong_href_before += 1
    for m in re.finditer(r'<a\b([^>]*)\bid="ucn-l(\d)"([^>]*)>', body):
        n = int(m.group(2))
        want = table.get('%d|Lesson' % n)
        if want and href_of(m.group(1) + m.group(3)) != want:
            crossed_before += 1

ok('26 steps were disabled before', disabled_before == 26, disabled_before)
ok('they sat on 2 pages', len(disabled_pages) == 2, sorted(disabled_pages))
ok('20 lesson tabs were crossed before', crossed_before == 20, crossed_before)
ok('71 step hrefs were wrong before', wrong_href_before == 71, wrong_href_before)

# ---------------------------------------------------------------------------
# And confirm the AFTER bodies in the sheet fix exactly those.
disabled_after = 0
wrong_after = 0
crossed_after = 0
labels_held = True
for h, body in rows.items():
    b4 = steps_by_container(before[h])
    now = steps_by_container(body)
    for n, nodes in now.items():
        if [t for _, _, t in nodes] != [t for _, _, t in b4.get(n, [])]:
            labels_held = False
        for tag, attrs, text in nodes:
            if tag == 'span' and style_props(attrs).get('opacity') == '0.4':
                disabled_after += 1
            elif tag == 'a':
                want = table.get('%d|%s' % (n, text))
                if want and href_of(attrs) != want:
                    wrong_after += 1
    for m in re.finditer(r'<a\b([^>]*)\bid="ucn-l(\d)"([^>]*)>', body):
        n = int(m.group(2))
        want = table.get('%d|Lesson' % n)
        if want and href_of(m.group(1) + m.group(3)) != want:
            crossed_after += 1

ok('no step is disabled after', disabled_after == 0, disabled_after)
ok('no step href is wrong after', wrong_after == 0, wrong_after)
ok('no lesson tab is crossed after', crossed_after == 0, crossed_after)
ok('the step labels are unchanged', labels_held)

# Nothing outside the rail moved.
outside_held = True
for h, body in rows.items():
    a = re.search(r'<div class="ucn-rail"', before[h])
    b = re.search(r'<div class="ucn-rail"', body)
    if not a or not b or before[h][:a.start()] != body[:b.start()]:
        outside_held = False
ok('every byte before the rail is unchanged', outside_held)

print('\n  %d passed, %d failed\n' % (len(passes), len(fails)))
sys.exit(1 if fails else 0)

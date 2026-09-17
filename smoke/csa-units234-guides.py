#!/usr/bin/env python3
"""
Verify the 38 rendered AP CSA Units 2-4 teacher guides.

    python3 smoke/csa-units234-guides.py build/csa-u234-guides

A SECOND READER, like its Unit 1 sibling: it reads word/document.xml out of the
zip rather than through python-docx, and it reuses that module's paragraph
shaping so the two suites cannot disagree about what a heading is.

TWO RULES EARN THEIR PLACE BY HAVING CAUGHT SOMETHING

Rule 2 is the defect the repair is against: 190 headings across these 38
documents printed over nothing.

Rule 11 is the one that matters more, because the first cut of this suite was
GREEN while six guides carried another lesson's objectives. The builder joined
the kit and the theme export on the topic number, the number matched on all 38,
and six of those numbers name different lessons on the two sides. Every rule
here passed, because each one compared a document against the same wrong source
that built it. Rule 11 compares the lesson-page URL the document PRINTS against
the handle of the content block it printed, so the two sources have to agree
about which lesson this is.

THE EXPECTED END STATE IS 12 BARE HEADINGS, NOT 0
The six topics whose theme spec describes a retired lesson keep their own rows,
so their guided-practice and independent-practice headings stay bare. Rule 2
asserts that count exactly, and names the topics, because "some bare headings
are fine" is how a rule stops meaning anything. A spec fixed upstream shows up
here as a failure asking for the exception to be removed.

WHAT IT DELIBERATELY DOES NOT CHECK
The kit's own bell ringers, worked examples and teaching sections still carry 98
directional lines, and no rule here pretends otherwise. See the note in
scripts/build-csa-units-2-4-teacher-guides.py for why importing the theme's
cleaner wording would be the wrong fix.
"""

import importlib.util
import json
import os
import re
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

_spec = importlib.util.spec_from_file_location(
    'u1smoke', os.path.join(HERE, 'csa-unit1-guides.py'))
u1 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(u1)

CONTENT = os.path.join(ROOT, 'config', 'csa-units-2-4-guide-content.json')
TIMING = re.compile(r'\(\s*\d+\s*min\s*\)', re.I)
# Same three as Unit 1's rule, and for the same reason: the bundle a teacher
# downloads is Start_Here, a deck, guided notes and a quiz. There is no
# handout and there are no cards, so a guide telling them to hand one out is
# promising material that does not exist. All three read zero across the 38
# today, which is what makes the rule safe to state as an absolute.
PHANTOM = re.compile(r'\bhandout\b|\bon this sheet\b|\bscenario cards\b', re.I)
OBJ_ROW = re.compile(r'\b(?:LO )?(\d+\.\d+)\.([A-Z])\b')
URL_ROW = re.compile(r'^apcsexamprep\.com/pages/([a-z0-9-]+)$')

# The two headings that stay bare on a retired-spec topic, and nowhere else.
BARE_OK = ('Guided practice', 'Independent practice')


def cells(path):
    """Table cell text, for the objectives table. Read from the XML like the
    paragraphs are, rather than through python-docx."""
    with zipfile.ZipFile(path) as z:
        xml = z.read('word/document.xml').decode('utf-8')
    out = []
    for tc in xml.split('<w:tc>')[1:]:
        body = tc.split('</w:tc>')[0]
        text = u1.TAG.sub('', ''.join(u1.TEXT.findall(body)))
        text = (text.replace('&amp;', '&').replace('&lt;', '<')
                    .replace('&gt;', '>').replace('&quot;', '"')
                    .replace('&apos;', "'")).strip()
        out.append(text)
    return out


def check(root):
    fails = []

    def bad(msg):
        fails.append(msg)

    with open(CONTENT, encoding='utf-8') as fh:
        raw = json.load(fh)
    prov = raw.get('_provenance') or {}
    content = {k: v for k, v in raw.items() if not k.startswith('_')}
    # topic -> the handle the storefront serves for the RETIRED spec's target.
    retired = prov.get('excluded') or {}
    expected = set(content) | set(retired)

    found = {}
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            if f == 'Teacher_Guide.docx':
                m = re.search(r'Lesson_(\d+\.\d+)_', dirpath)
                if m:
                    found[m.group(1)] = os.path.join(dirpath, f)

    # rule 1: one guide per topic, overlaid or not
    for topic in sorted(expected):
        if topic not in found:
            bad(f'rule 1  {topic}: no Teacher_Guide.docx')
    for topic in sorted(set(found) - expected):
        bad(f'rule 1  {topic}: a guide for a topic the export does not account '
            f'for, neither overlaid nor named as a retired spec')
    if len(found) != 38:
        bad(f'rule 1  found {len(found)} guides, expected 38')

    bare_seen = []
    for topic, path in sorted(found.items()):
        if topic not in expected:
            continue
        want = content.get(topic)
        paras = u1.paragraphs(path)
        joined = '\n'.join(paras)
        shape = u1.shaped(path)

        # rule 2: no heading prints with nothing under it, except the two
        # practice rows on a retired-spec topic.
        for j, (kind, text) in enumerate(shape):
            if kind != 'heading' or text in u1.CONTAINER_HEADINGS \
                    or u1.DAY_HEADING.match(text):
                continue
            nxt = shape[j + 1] if j + 1 < len(shape) else None
            if nxt is not None and nxt[0] != 'heading':
                continue
            if want is None and text.startswith(BARE_OK):
                bare_seen.append(f'{topic} {text[:28]}')
                continue
            bad(f'rule 2  {topic}: "{text[:46]}" is a heading with nothing '
                f'under it')

        tc = cells(path)
        for i, c in enumerate(tc):
            m = OBJ_ROW.fullmatch(c.strip())
            if not m or i + 1 >= len(tc):
                continue
            obj = tc[i + 1].strip()
            # rule 3: the Objective column holds CED wording, not an I-can line.
            # Only where the export covers the topic: the six keep the kit's own
            # rows and repairing those needs CED text neither repo has.
            if want is not None and obj.lower().startswith('i can'):
                bad(f'rule 3  {topic}: the Objective column holds an I-can '
                    f'line: {obj[:50]!r}')
            # rule 4: the code belongs to this topic
            if m.group(1) != topic:
                bad(f'rule 4  {topic}: carries a {m.group(1)} objective code')

        # rule 11: the document's own lesson-page URL agrees with the handle of
        # the content block that filled it. This is the identity check; every
        # other rule compares the document against the source that built it.
        urls = [u.group(1) for u in (URL_ROW.match(p) for p in paras) if u]
        handle = (want or {}).get('handle') or retired[topic]['live_handle']
        if not urls:
            bad(f'rule 11 {topic}: no lesson-page URL in the document')
        elif urls[0] != handle:
            bad(f'rule 11 {topic}: prints /pages/{urls[0]} and carries the '
                f'content of /pages/{handle}')

        if want is None:
            # rule 12: a retired-spec topic must carry NO other topic's exported
            # content. This is the shape of the defect rule 11 caught, asserted
            # from the other side.
            for other, v in content.items():
                if v['lesson_page']['intro'] in joined \
                        or v['independent'] in joined:
                    bad(f'rule 12 {topic}: carries topic {other} exported '
                        f'content')
        else:
            # rule 5: every exported objective reached the page
            for o in want['objectives']:
                if o['text'] not in joined:
                    bad(f'rule 5  {topic}: exported objective {o["code"]} is '
                        f'not in the document: {o["text"][:45]!r}')

            # rule 6: the lesson page rendered, intro and every activity
            if want['lesson_page']['intro'] not in joined:
                bad(f'rule 6  {topic}: the lesson-page intro is not in the '
                    f'document')
            for a in want['lesson_page']['activities']:
                if a not in joined:
                    bad(f'rule 6  {topic}: a lesson-page activity is missing: '
                        f'{a[:45]!r}')
            if want['independent'] not in joined:
                bad(f'rule 6  {topic}: the independent-practice text is missing')

        # rule 7: every exit-ticket item resolves to an answer a teacher can read
        if 'Exit ticket, with answers' not in paras:
            bad(f'rule 7  {topic}: no exit ticket section')
        else:
            s = paras.index('Exit ticket, with answers')
            e = next((j for j in range(s, len(paras))
                      if paras[j] in ('Traps this topic sets', 'Vocabulary',
                                      'Differentiation', 'Homework')), len(paras))
            blk = paras[s:e]
            idx = [j for j, t in enumerate(blk) if re.match(r'^\d+\. ', t)]
            if len(idx) < 3:
                bad(f'rule 7  {topic}: {len(idx)} exit items')
            for k, j in enumerate(idx):
                stop = idx[k + 1] if k + 1 < len(idx) else len(blk)
                body = blk[j:stop]
                opts = [b for b in body if re.match(r'^[A-D]\. ', b)]
                marked = [b for b in body if '<-- answer' in b]
                if opts and len(marked) != 1:
                    bad(f'rule 7  {topic} item {k + 1}: {len(marked)} options '
                        f'marked as the answer, expected 1')
                if not opts and not any(b.startswith('Answer:') for b in body):
                    bad(f'rule 7  {topic} item {k + 1}: no options and no '
                        f'written answer')

        # rule 8: no printed timings
        m = TIMING.search(joined)
        if m:
            bad(f'rule 8  {topic}: printed timing {m.group(0)!r}')

        # rule 9: nothing promised that the bundle does not contain
        m = PHANTOM.search(joined)
        if m:
            bad(f'rule 9  {topic}: phantom material {m.group(0)!r}')

        # rule 10: the trademark line
        if not any(p.startswith('AP is a trademark') for p in paras):
            bad(f'rule 10 {topic}: no College Board trademark line')

    # rule 2, the other half: the exception is a fixed number, not a licence.
    if len(found) == 38 and len(bare_seen) != 2 * len(retired):
        bad(f'rule 2  {len(bare_seen)} bare practice headings on retired-spec '
            f'topics, expected {2 * len(retired)}: ' + ', '.join(sorted(bare_seen)))

    return fails


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else 'build/csa-u234-guides'
    fails = check(root)
    if fails:
        for f in fails[:40]:
            print('FAIL ' + f)
        if len(fails) > 40:
            print(f'... and {len(fails) - 40} more')
        print(f'\n{len(fails)} failures')
        return 1
    print(f'12 rules, 38 guides, 0 failures   ({root})')
    return 0


if __name__ == '__main__':
    sys.exit(main())

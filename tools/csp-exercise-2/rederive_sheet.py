#!/usr/bin/env python3
"""
rederive_sheet.py - a SECOND opinion on the board 163 publish sheet.

Usage:
  python3 tools/csp-exercise-2/rederive_sheet.py \
      imports/2026-09-02/csp-exercise-2-publish-17-pages.csv \
      smoke/fixtures/csp-exercise-2-live-status.jsonl

WHY THIS EXISTS AND WHY IT IS PYTHON

scripts/csp-pages-csv.js decides what goes in the sheet and then says the sheet
is fine. That is one program grading its own homework, and this repo has already
paid for that twice: a CSP sheet lost 90 bytes a page while every semantic check
passed, and a rewriter reformatted 23 live pages while every test passed. Both
were caught by a check of a DIFFERENT KIND, reading the raw artifact.

So this reads only two files that are already on disk, in a different language,
with a different CSV reader, and reaches the same conclusion or refuses:

    the sheet     imports/.../csp-exercise-2-publish-17-pages.csv
    the storefront smoke/fixtures/csp-exercise-2-live-status.jsonl

It never imports the generator, never imports lib/csp-course-pages.js, and never
asks Node anything. Every number below is recomputed from bytes.

THE ONE CHECK THAT MATTERS MOST

Every row of a pages sheet carries Body HTML, and a Body HTML written over a
handle that already resolves is a rewrite of a live page, not a publish. So the
handle set in the sheet has to be EXACTLY the set of exercise-2 handles the
storefront answered 404 for. Not a subset, which would silently drop a page
somebody counted; not a superset, which would overwrite one.

Exit 0 if the sheet is what it claims to be, 1 otherwise.
"""

import csv
import io
import json
import re
import sys

HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At',
          'SEO Title', 'SEO Description']

# A handle in this family. Derived from the naming the board item states and
# checked against every row rather than assumed for any of them.
HANDLE_RX = re.compile(r'^ap-csp-course-bi[1-5]-[a-z0-9-]+-exercise-2$')

# The two CED code shapes this site can emit. AP CSP uses a Big Idea prefix,
# AP Cybersecurity uses a bare topic number. 218 of the second shape reached
# students on the rebuilt Topic 1.1 lesson, which is why both are counted.
CED_CSP_RX = re.compile(r'\b(?:CRD|DAT|AAP|CSN|IOC)-\d+\.[A-Z](?:\.\d+)?\b')
CED_CYBER_RX = re.compile(r'\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?\b')

SCRIPT_RX = re.compile(r'<script[\s\S]*?</script>', re.I)
HREF_RX = re.compile(r'href="/pages/([a-z0-9-]+)"')

QUESTIONS_PER_PAGE = 6
MIN_BODY_BYTES = 2000

problems = []
notes = []


def bad(msg):
    problems.append(msg)


def main(sheet_path, status_path):
    raw = open(sheet_path, 'rb').read()

    # ---- the file envelope, checked as bytes ------------------------------
    if not raw.startswith(b'\xef\xbb\xbf'):
        bad('no UTF-8 BOM. Matrixify reads a BOM-less file as the wrong encoding '
            'and mangles every non-ASCII byte silently.')
    if b'\r\n' not in raw:
        bad('no CRLF anywhere, so records are not separated the way Matrixify expects')
    text = raw.decode('utf-8-sig')

    # QUOTE_ALL: the first record must open with a quote and every field on the
    # header line must be quoted. A single unquoted field is where a body full of
    # commas starts eating the next column.
    first_line = text.split('\r\n', 1)[0]
    if not first_line.startswith('"') or '","' not in first_line:
        bad('the header row is not fully quoted, so QUOTE_ALL was not used')

    rows = list(csv.reader(io.StringIO(text, newline='')))
    rows = [r for r in rows if len(r) > 1]
    head, body = rows[0], rows[1:]

    if head != HEADER:
        bad('header is %r, expected %r' % (head, HEADER))
        return  # every index below depends on this

    col = {name: i for i, name in enumerate(head)}

    # ---- the storefront measurement, parsed independently ------------------
    status = {}
    for line in open(status_path, encoding='utf-8'):
        line = line.strip()
        if not line:
            continue
        r = json.loads(line)
        status[r['handle']] = r

    dead = sorted(h for h, r in status.items()
                  if HANDLE_RX.match(h) and r.get('status') == 404 and not r.get('unresolved'))
    live = sorted(h for h, r in status.items()
                  if HANDLE_RX.match(h) and r.get('status') == 200)
    notes.append('storefront file: %d exercise-2 handles 404, %d live 200'
                 % (len(dead), len(live)))

    handles = [r[col['Handle']] for r in body]
    notes.append('sheet: %d row(s)' % len(handles))

    # ---- the set identity, which is the whole safety argument --------------
    if sorted(handles) != dead:
        missing = sorted(set(dead) - set(handles))
        extra = sorted(set(handles) - set(dead))
        bad('the sheet is not the 404 set. %d handle(s) measured 404 and absent from '
            'the sheet %r; %d handle(s) in the sheet that were not measured 404 %r'
            % (len(missing), missing[:4], len(extra), extra[:4]))
    if len(set(handles)) != len(handles):
        bad('a handle appears twice, so the second row silently overwrites the first')

    for h in handles:
        if not HANDLE_RX.match(h):
            bad('%s is not a well formed exercise-2 handle' % h)
        r = status.get(h)
        if r is None:
            bad('%s has no measurement at all in the status file' % h)
        elif r.get('unresolved'):
            bad('%s was never answered by the storefront, and a throttle is not a 404' % h)
        elif r.get('status') != 404:
            bad('%s answers HTTP %s already, so this row is a REWRITE of a live page'
                % (h, r.get('status')))

    # ---- the columns that destroy content when they are wrong --------------
    pubs = {r[col['Published At']] for r in body}
    if len(pubs) != 1:
        bad('Published At is not one fixed value: %r' % sorted(pubs)[:4])
    else:
        pub = pubs.pop()
        if not re.match(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$', pub):
            bad('Published At %r is not a literal timestamp' % pub)
        elif pub >= '2026-09-01':
            bad('Published At %r is at or after today, which is a live server time and '
                'reorders the whole /pages listing on every import' % pub)
        notes.append('Published At: %s, fixed and past dated' % pub)

    for r in body:
        h = r[col['Handle']]
        if r[col['Command']] != 'MERGE':
            bad('%s: Command is %r, not MERGE' % (h, r[col['Command']]))
        if r[col['Published']] != 'TRUE':
            bad('%s: Published is %r' % (h, r[col['Published']]))
        if not r[col['Title']].strip():
            bad('%s: empty Title' % h)

    # ---- the bodies --------------------------------------------------------
    seen_seo_desc = {}
    for r in body:
        h = r[col['Handle']]
        b = r[col['Body HTML']]
        n = len(b.encode('utf-8'))

        if n == 0:
            bad('%s: EMPTY Body HTML, which erases the page and reports as success' % h)
            continue
        if n < MIN_BODY_BYTES:
            bad('%s: body is %d bytes, under the %d byte floor for a finished page'
                % (h, n, MIN_BODY_BYTES))

        try:
            b.encode('ascii')
        except UnicodeEncodeError as e:
            bad('%s: body is not pure ASCII at offset %d' % (h, e.start))
        if '—' in b or '�' in b:
            bad('%s: body carries an em-dash or a replacement character' % h)

        h1 = len(re.findall(r'<h1[\s>]', b))
        if h1 != 1:
            bad('%s: %d h1 tags, must be exactly 1' % (h, h1))

        items = b.count('class="mcq-item"')
        acts = b.count('data-activity="exercise-2"')
        if items != QUESTIONS_PER_PAGE:
            bad('%s: %d graded item(s), expected %d' % (h, items, QUESTIONS_PER_PAGE))
        if acts != QUESTIONS_PER_PAGE:
            bad('%s: %d data-activity="exercise-2" marker(s), expected %d'
                % (h, acts, QUESTIONS_PER_PAGE))
        # The trap the renderer's own header calls out: the shared checkMCQ
        # hardcodes activity:'quiz'. One of those on this page files a graded
        # answer under the lesson's real quiz rollup.
        if "activity:'quiz'" in b or 'activity: "quiz"' in b:
            bad('%s: body hardcodes a quiz activity, which corrupts a real grade' % h)

        for tag in ('div', 'style', 'script'):
            o = len(re.findall(r'<%s[\s>]' % tag, b))
            c = b.count('</%s>' % tag)
            if o != c:
                bad('%s: %d <%s> open vs %d close' % (h, o, tag, c))

        # CED codes. Read from the markup with script blocks removed, because an
        # href or a string inside a script is not something a student reads and a
        # scan that forgets this has already reported 141 phantom dead links here.
        markup = SCRIPT_RX.sub(' ', b)
        codes = CED_CSP_RX.findall(markup) + CED_CYBER_RX.findall(markup)
        if codes:
            bad('%s: %d CED Essential Knowledge code(s) a student would read, first %r'
                % (h, len(codes), codes[0]))

        # Links. Every internal target has to be something the storefront answered
        # 200 for, or this sheet publishes a page with its own dead links.
        for target in sorted(set(HREF_RX.findall(markup))):
            t = status.get(target)
            if t is None:
                bad('%s: links /pages/%s, which was never measured' % (h, target))
            elif t.get('unresolved'):
                bad('%s: links /pages/%s, which the storefront never answered for' % (h, target))
            elif t.get('status') != 200:
                bad('%s: links /pages/%s, which returns HTTP %s' % (h, target, t.get('status')))

        st, sd = r[col['SEO Title']], r[col['SEO Description']]
        if not (1 <= len(st) <= 70):
            bad('%s: SEO Title is %d chars' % (h, len(st)))
        if not (70 <= len(sd) <= 160):
            bad('%s: SEO Description is %d chars' % (h, len(sd)))
        if sd in seen_seo_desc:
            bad('%s: SEO Description is identical to %s' % (h, seen_seo_desc[sd]))
        seen_seo_desc[sd] = h

    total_items = sum(r[col['Body HTML']].count('class="mcq-item"') for r in body)
    notes.append('%d graded questions across %d page(s)' % (total_items, len(body)))


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
    print('')
    for n in notes:
        print('  %s' % n)
    if problems:
        print('\n  %d PROBLEM(S). The sheet is not what it claims to be:\n' % len(problems))
        for p in problems[:40]:
            print('    %s' % p)
        if len(problems) > 40:
            print('    ... and %d more' % (len(problems) - 40))
        print('')
        sys.exit(1)
    print('\n  REDERIVED INDEPENDENTLY: the sheet is exactly the 404 set, '
          'every body is whole, every link is live.\n')

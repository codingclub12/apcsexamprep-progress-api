#!/usr/bin/env python3
"""A SECOND opinion about mojibake, for the `rederive` slot in the deploy gate.

Why this exists, and what it is actually independent OF.

lib/mojibake.js reverses mojibake through a cp1252 table that a person typed
into that file. If the table is wrong, every JavaScript check in this repo is
wrong in the same direction and they all agree with each other. That is exactly
the shape of the failure this change was written to fix: on 2026-09-03 the
Matrixify preflight and its own smoke suite both built the latin-1 flavor of a
corrupted bullet, so the guard and its test shared one blind spot and the suite
was green while the form that reaches a live page walked through.

So this script does not import that table, or any JavaScript. It uses PYTHON's
own `cp1252` and `latin-1` codecs, which ship with the interpreter, and derives
the run lengths from the UTF-8 specification rather than from a list of samples.
Then it scans the same files and asserts the two implementations reach the same
verdict, file by file.

What it is NOT independent of: the PLAUSIBLE ranges. Those are a policy about
what this store's content can contain, not a fact about encodings, so they are
re-stated here and COMPARED rather than re-derived. A disagreement about a range
is a real disagreement and this script will say so; agreement on them is not
evidence of anything except that both files say the same thing.

Run:
    python3 scripts/mojibake-rederive.py            # scan the repo, compare
    python3 scripts/mojibake-rederive.py --score    # score the OLD rule too
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCAN_EXT = {'.html', '.js', '.md', '.json', '.css', '.yml', '.yaml',
            '.txt', '.py', '.csv', '.liquid'}
SKIP_DIRS = {'node_modules', '.git', 'coverage', 'dist', 'build'}

# Derived from the UTF-8 specification: 0xC0 and 0xC1 can never be a legal lead
# and nothing above 0xF4 can either, so a run can only begin in this range.
LEAD_MIN, LEAD_MAX = 0xC2, 0xF4

# Policy, restated for comparison. See the module docstring.
PLAUSIBLE = [
    (0x00A0, 0x00FF), (0x2000, 0x206F), (0x20A0, 0x20BF), (0x2100, 0x214F),
    (0x2190, 0x21FF), (0x2200, 0x22FF), (0x2500, 0x259F), (0x25A0, 0x25FF),
    (0x2600, 0x27BF), (0x2B00, 0x2BFF), (0xFE0F, 0xFE0F), (0x1F000, 0x1FAFF),
]


def plausible(chsr):
    cp = ord(chsr)
    return any(lo <= cp <= hi for lo, hi in PLAUSIBLE)


def run_length(lead_byte):
    """The UTF-8 lead byte states the character's total length. No guessing."""
    if lead_byte >= 0xF0:
        return 4
    if lead_byte >= 0xE0:
        return 3
    return 2


def to_bytes(run, codec):
    """The bytes this run was before something read them with `codec`.

    Python's own codec does the work. It raises the moment a character cannot
    have come from that codec, which is what stops legitimate text being
    "repaired", and it is the reason this file needs no table of its own.
    """
    try:
        raw = run.encode(codec)
    except UnicodeEncodeError:
        return None
    return raw if len(raw) == len(run) else None


def reverse_run(run):
    """The single character `run` means, or None if it is healthy text."""
    for codec in ('cp1252', 'latin-1'):
        raw = to_bytes(run, codec)
        if raw is None:
            continue
        try:
            decoded = raw.decode('utf-8')
        except UnicodeDecodeError:
            continue
        if len(decoded) == 1:
            return decoded
    return None


def lead_byte(chsr):
    """The byte this character came from under either codec, or -1."""
    for codec in ('cp1252', 'latin-1'):
        raw = to_bytes(chsr, codec)
        if raw is not None and len(raw) == 1:
            return raw[0]
    return -1


def scan(text):
    hits, suspects = [], []
    i = 0
    n = len(text)
    while i < n:
        lead = lead_byte(text[i])
        if lead < LEAD_MIN or lead > LEAD_MAX:
            i += 1
            continue
        width = run_length(lead)
        if i + width > n:
            i += 1
            continue
        run = text[i:i + width]
        fixed = reverse_run(run)
        if fixed is None:
            i += 1
            continue
        (hits if plausible(fixed) else suspects).append(
            {'index': i, 'run': run, 'fixed': fixed})
        i += width
    return {'hits': hits, 'suspects': suspects}


# ---------------------------------------------------------------- the old rule
OLD_LEADS = {'Â', 'Ã', 'â'}


def old_rule_detect(text):
    """The detector this repo carried until 2026-09-03, reproduced to be scored.

    Leads {U+00C2, U+00C3, U+00E2}, widths 3 then 2, reversed through latin-1
    only. Kept here so the claim "it missed the reported forms" is a measurement
    rather than an assertion.
    """
    hits = []
    i = 0
    while i < len(text):
        if text[i] not in OLD_LEADS:
            i += 1
            continue
        matched = False
        for width in (3, 2):
            run = text[i:i + width]
            if len(run) < width:
                continue
            try:
                raw = run.encode('latin-1')
            except UnicodeEncodeError:
                continue
            try:
                decoded = raw.decode('utf-8')
            except UnicodeDecodeError:
                continue
            if len(decoded) == 1:
                hits.append({'index': i, 'run': run, 'fixed': decoded})
                i += width
                matched = True
                break
        if not matched:
            i += 1
    return hits


def walk():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if os.path.splitext(name)[1] in SCAN_EXT:
                yield os.path.join(dirpath, name)


def js_verdict():
    """Ask lib/mojibake.js for its verdict on every file, as JSON."""
    script = r'''
const fs = require('fs'), path = require('path');
const moji = require('./lib/mojibake.js');
const out = {};
for (const rel of JSON.parse(process.argv[1])) {
  let text;
  try {
    const raw = fs.readFileSync(rel);
    text = raw.toString('utf8');
    if (Buffer.compare(Buffer.from(text, 'utf8'), raw) !== 0) continue;
  } catch (e) { continue; }
  const s = moji.scan(text);
  out[rel] = { hits: s.hits.length, suspects: s.suspects.length,
    chars: s.hits.map((h) => h.fixed.codePointAt(0)) };
}
process.stdout.write(JSON.stringify(out));
'''
    rels = [os.path.relpath(f, ROOT) for f in walk()]
    res = subprocess.run([  'node', '-e', script, json.dumps(rels)],
                         cwd=ROOT, capture_output=True, text=True)
    if res.returncode != 0:
        sys.stderr.write(res.stderr)
        raise SystemExit('could not get the JavaScript verdict')
    return json.loads(res.stdout)


def main():
    score_only = '--score' in sys.argv

    print('\nSCORING THE OLD RULE AGAINST THE FORMS REPORTED ON A LIVE PAGE')
    print('  Each fixture is built here, by encoding the real character to UTF-8')
    print('  and decoding those bytes with the wrong codec. No table is involved.\n')
    fixtures = [
        ('cp1252 bullet   THE REPORTED FAILURE', 0x2022, 'cp1252'),
        ('cp1252 emoji    THE REPORTED FAILURE', 0x1F3AF, 'cp1252'),
        ('latin-1 bullet', 0x2022, 'latin-1'),
        ('latin-1 emoji', 0x1F3AF, 'latin-1'),
        ('latin-1 up triangle, the 2026-08-07 incident', 0x25B2, 'latin-1'),
        ('cp1252 right single quote', 0x2019, 'cp1252'),
        ('latin-1 section sign, 12 in the CED extract', 0x00A7, 'latin-1'),
    ]
    old_missed, new_missed = [], []
    for label, cp, codec in fixtures:
        raw = chr(cp).encode('utf-8')
        corrupted = ''.join(
            bytes([b]).decode(codec, errors='replace') for b in raw)
        if '�' in corrupted:
            corrupted = raw.decode('latin-1')
        old = len(old_rule_detect(corrupted))
        new = len(scan(corrupted)['hits'])
        if not old:
            old_missed.append(label)
        if not new:
            new_missed.append(label)
        print('    old %s   new %s   %s'
              % ('MISS' if not old else 'catch',
                 'MISS' if not new else 'catch', label))
    print('\n  old rule missed %d of %d, new rule missed %d of %d'
          % (len(old_missed), len(fixtures), len(new_missed), len(fixtures)))

    problems = []
    if not old_missed:
        problems.append('the old rule missed nothing, so this script is not '
                        'reproducing the detector it claims to be scoring')
    if new_missed:
        problems.append('this independent implementation MISSES: '
                        + ', '.join(new_missed))

    if not score_only:
        print('\nCOMPARING THE TWO IMPLEMENTATIONS FILE BY FILE')
        js = js_verdict()
        checked = 0
        disagreements = []
        for rel, expected in sorted(js.items()):
            path = os.path.join(ROOT, rel)
            try:
                with open(path, 'rb') as fh:
                    raw = fh.read()
                text = raw.decode('utf-8')
            except (UnicodeDecodeError, OSError):
                continue
            checked += 1
            mine = scan(text)
            if (len(mine['hits']) != expected['hits']
                    or len(mine['suspects']) != expected['suspects']):
                disagreements.append(
                    '%s: python %d hit(s)/%d suspect(s), node %d/%d'
                    % (rel, len(mine['hits']), len(mine['suspects']),
                       expected['hits'], expected['suspects']))
        print('  compared %d files' % checked)
        if checked < 100:
            problems.append('only %d files compared, which is too few to mean '
                            'anything' % checked)
        if disagreements:
            problems.extend(disagreements)
        else:
            print('  the two implementations agree on every file')

    print()
    if problems:
        for p in problems:
            print('  PROBLEM: ' + p)
        print('\nREDERIVE FAILED')
        return 1
    print('REDERIVE OK - an independent implementation agrees, '
          'and the old rule is measurably blind')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

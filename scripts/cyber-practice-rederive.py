#!/usr/bin/env python3
"""Re-derive the cyber practice hub and spoke from the SHEET, not from the config.

A second implementation, in a different language, reading the raw artifact. It
shares no code with the generator: a different CSV parser, a different idea of
what an anchor is, and its asset expectations come from the live sitemap
inventory rather than from config/cyber-practice-hubs.json. If the generator
and its own config were both wrong in the same way, this is what notices.

The house rule it serves: generation is not evidence that generation worked.
The CSP sheet lost 90 bytes a page while every semantic check passed, and a
parse-back diff is what caught it.

The package ships as TWO sheets, because a blank cell in a Matrixify import
means "set this column to empty" rather than "leave it alone", so the five new
pages and the two extended hubs cannot travel in one file. Both are read here:
the edges span them, and checking either alone would report every cross-sheet
edge as missing.

Run: python3 scripts/cyber-practice-rederive.py <live-handles.txt> <sheet.csv>...
"""
import csv
import re
import sys
from collections import defaultdict

ANCHOR = re.compile(r'href\s*=\s*["\'](?:https?://[^/"\']*apcsexamprep\.com)?/pages/([^"\'#?]+)')
UNITS = [1, 2, 3, 4, 5]

# The same asset shapes the builder uses, written independently here so that a
# typo in one is not a typo in both.
KIND_PATTERNS = {
    'quiz':      lambda u: re.compile(rf'^ap-cyber-unit-{u}-lesson-\d+-quiz$'),
    'exercise':  lambda u: re.compile(rf'^ap-cyber-unit-{u}-lesson-\d+-exercise-\d+$'),
    'lab':       lambda u: re.compile(rf'^ap-cyber-unit-{u}-lesson-\d+-(?:terminal-)?lab$'),
    'named_lab': lambda u: re.compile(rf'^ap-cyber-unit-{u}-lab-[a-z-]+$'),
    'case_file': lambda u: re.compile(rf'^ap-cyber-unit-{u}-case-file-\d+$'),
    'scenario':  lambda u: re.compile(rf'^ap-cyber-unit-{u}-scenario-practice$'),
    'frq':       lambda u: re.compile(rf'^ap-cyber-unit-{u}-frq-practice$'),
    'exam':      lambda u: re.compile(rf'^ap-cyber-unit-{u}-(?:practice-)?exam$'),
    'project':   lambda u: re.compile(rf'^ap-cyber-unit-{u}-project$'),
}


def assets_for(unit, live):
    """Every live handle that belongs to this unit, classified once."""
    claimed, out = set(), []
    for _, mk in KIND_PATTERNS.items():
        rx = mk(unit)
        for h in sorted(live):
            if rx.match(h) and h not in claimed:
                claimed.add(h)
                out.append(h)
    return out


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    handles_path, sheet_paths = sys.argv[1], sys.argv[2:]

    with open(handles_path, encoding='utf-8') as fh:
        live = {ln.strip() for ln in fh if ln.strip()}

    rows = []
    for sp in sheet_paths:
        with open(sp, encoding='utf-8-sig', newline='') as fh:
            rows.extend(csv.DictReader(fh))

    by_handle = {r['Handle']: r for r in rows}
    links = {h: set(ANCHOR.findall(r.get('Body HTML') or '')) for h, r in by_handle.items()}

    fails = []
    checks = 0

    def check(label, cond, detail=''):
        nonlocal checks
        checks += 1
        if cond:
            print(f'  ok    {label}')
        else:
            fails.append(f'{label}{": " + detail if detail else ""}')
            print(f'  FAIL  {label}{": " + detail if detail else ""}')

    umbrella = 'ap-cybersecurity-practice'
    topics = 'ap-cybersecurity-topics'
    spokes = [f'ap-cybersecurity-unit-{u}-practice' for u in UNITS]

    check('the sheet carries seven rows', len(rows) == 7, str(len(rows)))
    check('every expected handle is present',
          all(h in by_handle for h in spokes + [umbrella, topics]))
    check('no row has an empty Body HTML, which a MERGE would import as a deletion',
          all((r.get('Body HTML') or '').strip() for r in rows))

    # The connection claims, re-derived from the emitted HTML.
    check('the concept hub reaches the practice hub',
          umbrella in links.get(topics, set()))
    check('the practice hub reaches all five unit spokes',
          all(s in links.get(umbrella, set()) for s in spokes),
          str(sorted(set(spokes) - links.get(umbrella, set()))))

    # Coverage, from the sitemap rather than from the generator's config.
    total = 0
    for u in UNITS:
        handle = f'ap-cybersecurity-unit-{u}-practice'
        want = set(assets_for(u, live))
        got = links.get(handle, set())
        total += len(want)
        missing = want - got
        check(f'unit {u} spoke links all {len(want)} of its own live practice assets',
              not missing, f'missing {sorted(missing)[:4]}')
        # Nothing from another unit.
        others = set()
        for v in UNITS:
            if v != u:
                others |= set(assets_for(v, live))
        stray = got & others
        check(f'unit {u} spoke links nothing belonging to another unit',
              not stray, f'stray {sorted(stray)[:4]}')

    check('the five spokes account for 129 practice assets between them',
          total == 129, str(total))

    # Every internal link resolves, against the live set plus what this sheet creates.
    resolvable = live | set(spokes)
    dead = defaultdict(list)
    for h, targets in links.items():
        for t in targets:
            if t not in resolvable:
                dead[h].append(t)
    check('every internal link resolves to a live handle or one this sheet creates',
          not dead, '; '.join(f'{k} -> {v[:3]}' for k, v in list(dead.items())[:3]))

    print()
    if fails:
        print(f'FAILED ({len(fails)})')
        for f in fails:
            print(f'  {f}')
        return 1
    print(f'OK - {checks} checks re-derived from the sheet, independently of the generator')
    return 0


if __name__ == '__main__':
    sys.exit(main())

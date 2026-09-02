#!/usr/bin/env python3
"""Check a dead-link repair sheet WITHOUT running the code that wrote it.

The generator records spans and reverses them. This does something else
entirely: it blanks every href out of the before body and out of the after
body and requires what is left to be identical. That is a single statement
that nothing outside a link attribute moved, and it does not care how the
edit was made. Then it looks at the hrefs pairwise and requires each change
to be one of the two rules, with the new target present in the live sets.

    python3 scripts/verify-dead-link-sheet.py --sheet <sheet.csv> \\
        --bodies <dir> --handles <live-handles.txt> --blogs <live-blogs.txt>

Exit 0 and print a one-line summary, or exit 1 and print what is wrong.
No em-dashes, per repo convention.
"""
import argparse
import csv
import io
import os
import re
import sys

HREF = re.compile(r'href="([^"]*)"')
PAGES = re.compile(r"^/pages/([^?#]*)([?#].*)?$")
BLOGS = re.compile(r"^/blogs/([^?#]*)([?#].*)?$")
LEGAL = re.compile(r"^[a-z0-9-]+$")

#  This file does NOT carry a copy of the generator's retarget map, because 22
#  hand-copied pairs would be 22 chances to copy one wrong. It re-derives the
#  property most of them rest on instead: the target is the only live handle
#  that extends the dead one at a hyphen. An entry that does not satisfy that
#  has to be named here, by hand, with a person having looked at it.
BY_HAND = {
    "ap-csa-daily-practice": "daily-practice",
    "ap-csa-unit-4-study-guide": "ap-csa-unit-4-data-collections-study-guide",
}


def unique_extension(dead, live):
    """The one live handle that is `dead` plus something, or None."""
    ext = [h for h in live if h.startswith(dead + "-")]
    return ext[0] if len(ext) == 1 else None


def blank_hrefs(body):
    """Every href replaced by a fixed token, so only the surrounding markup is left."""
    return HREF.sub('href="#"', body)


def strip_illegal(handle):
    decoded = re.sub(r"%(0[Aa]|0[Dd]|09|20)", lambda m: chr(int(m.group(1), 16)), handle)
    return re.sub(r"[^a-z0-9-]", "", decoded.lower())


def read_sheet(path, problems):
    raw = open(path, "rb").read()
    if not raw.startswith(b"\xef\xbb\xbf"):
        problems.append(f"{path}: no UTF-8 BOM")
    if b"\r\n" not in raw:
        problems.append(f"{path}: rows are not CRLF terminated")
    text = raw.decode("utf-8-sig")
    #  newline="" matters and is not style. A page body contains bare newlines,
    #  which are legal inside a quoted CSV field. Splitting the text into lines
    #  first drops those separators and csv rejoins them as \r\n, so every
    #  body comes back with different line endings and every row reads as
    #  "something outside a href changed". That is what this file said the
    #  first time it ran, and the generator was right.
    rows = list(csv.DictReader(io.StringIO(text, newline="")))
    if rows:
        extra = set(rows[0]) - {"Handle", "Command", "Body HTML"}
        if extra:
            problems.append(f"{path}: unexpected columns {sorted(extra)}")
        for r in rows:
            for k, v in r.items():
                if not v:
                    problems.append(f"{path}:{r.get('Handle')}: blank {k}, and a blank cell is an erase")
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sheet", required=True)
    ap.add_argument("--bodies", required=True)
    ap.add_argument("--handles", required=True)
    ap.add_argument("--blogs", required=False)
    a = ap.parse_args()

    live = {l.strip() for l in open(a.handles, encoding="utf-8") if l.strip()}
    if len(live) < 100:
        print(f"refusing: only {len(live)} live handles, that is not the sitemap")
        return 1

    problems = []
    rows = read_sheet(a.sheet, problems)
    changed = 0
    for r in rows:
        handle = r.get("Handle", "")
        after = r.get("Body HTML", "")
        where = f"{handle}"
        if r.get("Command") != "MERGE":
            problems.append(f"{where}: command is {r.get('Command')!r}, not MERGE")
        src = os.path.join(a.bodies, handle + ".html")
        if not os.path.exists(src):
            problems.append(f"{where}: no stored body to compare against")
            continue
        before = open(src, encoding="utf-8").read()
        if before == after:
            problems.append(f"{where}: the row changes nothing")
            continue

        #  One statement covering everything that is not a link.
        if blank_hrefs(before) != blank_hrefs(after):
            problems.append(f"{where}: something outside a href attribute changed")
            continue

        b_hrefs = HREF.findall(before)
        a_hrefs = HREF.findall(after)
        if len(b_hrefs) != len(a_hrefs):
            problems.append(f"{where}: the number of links moved, {len(b_hrefs)} to {len(a_hrefs)}")
            continue

        edits = 0
        for b, aa in zip(b_hrefs, a_hrefs):
            if b == aa:
                continue
            edits += 1
            bm = PAGES.match(b)
            if not bm:
                problems.append(f"{where}: rewrote a href that is not a /pages/ link: {b!r}")
                continue
            if bm.group(1) in live:
                problems.append(f"{where}: rewrote {b!r}, which already resolved")
                continue
            am = PAGES.match(aa)
            bl = BLOGS.match(aa)
            tail = bm.group(2) or ""
            if am:
                cleaned = strip_illegal(bm.group(1))
                by_hand = BY_HAND.get(bm.group(1))
                extension = unique_extension(bm.group(1), live)
                if am.group(1) == cleaned and cleaned != bm.group(1):
                    #  Rule one, a typo. Illegal characters deleted.
                    if cleaned not in live:
                        problems.append(f"{where}: {b!r} -> {aa!r}, and that page is not live")
                elif by_hand is not None and am.group(1) == by_hand:
                    #  A retarget a person looked at, named on both sides.
                    if by_hand not in live:
                        problems.append(f"{where}: {b!r} -> {aa!r}, and that page is not live")
                elif extension is not None and am.group(1) == extension:
                    #  The target is the ONLY live handle extending the dead one.
                    pass
                else:
                    problems.append(
                        f"{where}: {b!r} -> {aa!r} is not the illegal characters deleted, "
                        f"is not the only live handle extending it, and is not named by hand here")
                if (am.group(2) or "") != tail:
                    problems.append(f"{where}: {b!r} -> {aa!r} changed the query or fragment")
            else:
                problems.append(f"{where}: {b!r} -> {aa!r} is not a /pages/ link")
        if not edits:
            problems.append(f"{where}: the body differs but no href does")
        changed += edits

    if problems:
        print(f"\n  {len(problems)} problems\n")
        for p in problems[:40]:
            print("    " + p)
        return 1
    print(f"SHEET VERIFIED {len(rows)} pages, {changed} hrefs repaired, "
          f"nothing outside a link attribute moved")
    return 0


if __name__ == "__main__":
    sys.exit(main())

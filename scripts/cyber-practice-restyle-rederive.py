#!/usr/bin/env python3
"""Re-derive the practice spoke restyle from the raw artifact, in another language.

WHY THIS EXISTS AND WHAT MAKES IT INDEPENDENT
=============================================
The JavaScript side builds the sheet and then checks the thing it just built.
That is one implementation agreeing with itself, and this repo has already been
burned by exactly that: the CSP sheet lost 90 bytes a page while every semantic
check passed, and a parse-back diff in a second implementation is what caught it.

So this shares NO code with the generator. It has its own CSV reader, its own
notion of what the page should say, and it works from two raw inputs:

    imports/2026-09-06/cyber-practice-restyle-pages.csv   what will be imported
    smoke/fixtures/live-bodies/*.html                     what is live today

It never imports the generator, never reads config/cyber-practice-hubs.json
through the JS spec module, and does not know how spokeBody() is written. If the
generator and this file agree about the sheet, two different programs reading
different sources reached the same conclusion.

THE ONE CHECK THAT MATTERS MOST
===============================
A Matrixify MERGE republishes the whole Body HTML cell, so the risk in this
change is not an ugly page, it is a link that quietly stops existing. Every
/pages/ anchor on the live body has to still be on the new body. That is
re-derived here from the two raw files by set difference, with no reference to
what the generator thought it was preserving.

Run: python3 scripts/cyber-practice-restyle-rederive.py [sheet.csv] [bodies-dir]
"""

import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEET = ROOT / "imports" / "2026-09-06" / "cyber-practice-restyle-pages.csv"
BODIES = ROOT / "smoke" / "fixtures" / "live-bodies"

# Deliberately hardcoded rather than read from the JS spec. A re-derivation that
# imports the thing it is checking is not one. Five spokes, and their handles
# are stable public URLs.
SPOKES = [f"ap-cybersecurity-unit-{n}-practice" for n in range(1, 6)]

LINK = re.compile(r"""href\s*=\s*["'](?:https?://[^/"']*apcsexamprep\.com)?/pages/([^"'#?]+)""")
HEADING = re.compile(r"<h([1-6])\b")
REM = re.compile(r"[\d.]+rem")
SCRIPT_OR_STYLE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.S | re.I)
TAG = re.compile(r"<[^>]+>")

checks = []


def ok(label, cond, detail=""):
    checks.append((bool(cond), label, detail))


def read_csv(path):
    """A CSV reader written for this file, not borrowed from the writer.

    Matrixify sheets here are utf-8-sig, CRLF, QUOTE_ALL with doubled quotes.
    Body HTML runs to tens of kilobytes and contains commas, quotes and
    newlines, so a split(',') reader would silently shred it.
    """
    text = path.read_text(encoding="utf-8-sig")
    rows, row, field, quoted, i = [], [], [], False, 0
    while i < len(text):
        c = text[i]
        if quoted:
            if c == '"' and i + 1 < len(text) and text[i + 1] == '"':
                field.append('"')
                i += 2
                continue
            if c == '"':
                quoted = False
                i += 1
                continue
            field.append(c)
            i += 1
            continue
        if c == '"':
            quoted = True
            i += 1
            continue
        if c == ",":
            row.append("".join(field))
            field = []
            i += 1
            continue
        if c == "\r" and i + 1 < len(text) and text[i + 1] == "\n":
            row.append("".join(field))
            rows.append(row)
            row, field = [], []
            i += 2
            continue
        if c == "\n":
            row.append("".join(field))
            rows.append(row)
            row, field = [], []
            i += 1
            continue
        field.append(c)
        i += 1
    if field or row:
        row.append("".join(field))
        rows.append(row)
    header = rows[0] if rows else []
    return header, [dict(zip(header, r)) for r in rows[1:]]


def visible(body):
    """Text a student reads. Script and style come out first: the breadcrumb
    JSON carries page titles and the stylesheet carries hex colours, and
    neither is prose."""
    return html.unescape(TAG.sub(" ", SCRIPT_OR_STYLE.sub(" ", body)))


def main(argv):
    sheet = pathlib.Path(argv[0]) if argv else SHEET
    bodies = pathlib.Path(argv[1]) if len(argv) > 1 else BODIES

    header, rows = read_csv(sheet)

    ok("the sheet is Handle, Command, Body HTML and nothing else",
       header == ["Handle", "Command", "Body HTML"], str(header))
    ok("five rows", len(rows) == 5, str(len(rows)))
    ok("every row is a MERGE", all(r.get("Command") == "MERGE" for r in rows))
    ok("the five rows are the five spokes",
       sorted(r.get("Handle", "") for r in rows) == sorted(SPOKES))
    # A row for either live hub page would republish it from a stale body. The
    # umbrella has gained a Question of the Day card since those were captured.
    ok("neither live hub page is in the sheet",
       not any(r.get("Handle") in ("ap-cybersecurity-practice", "ap-cybersecurity-topics")
               for r in rows))

    for row in rows:
        handle = row.get("Handle", "")
        new = row.get("Body HTML", "")
        unit = handle.split("-")[3] if len(handle.split("-")) > 3 else "?"
        live_path = bodies / f"{handle}.html"
        if not live_path.exists():
            ok(f"unit {unit} has a live body to compare against", False, str(live_path))
            continue
        live = live_path.read_text(encoding="utf-8")

        # ── THE MERGE GUARD, re-derived by set difference on the raw files ──
        before, after = set(LINK.findall(live)), set(LINK.findall(new))
        ok(f"unit {unit} loses no link a MERGE would republish over",
           not (before - after), ", ".join(sorted(before - after)))

        # ── THE EXAM CARD ──
        # The online unit exam shares no items with the paper unit test a
        # teacher grades, so it belongs here. Calling it "the full unit test"
        # told a student it was the same instrument.
        ok(f"unit {unit} drops the false 'full unit test' claim",
           "the full unit test" not in new.lower())
        ok(f"unit {unit} carried that claim before, so this is a real change",
           "the full unit test" in live.lower())
        ok(f"unit {unit} says the exam is not the graded instrument",
           "not the questions on the test your teacher grades" in new)
        # The class on the DIV. Matching the bare string would pass on the
        # stylesheet, which defines .grp--exam a few hundred bytes earlier.
        ok(f"unit {unit} marks the exam card apart on the element",
           'class="grp grp--exam"' in new)

        # ── THE TYPE SCALE ──
        # The theme sets html font-size to 62.5%, so a rem here is about 10px.
        ok(f"unit {unit} states no length in rem", not REM.search(new),
           ", ".join(sorted(set(REM.findall(new)))[:3]))
        ok(f"unit {unit} did use rem before", bool(REM.search(live)))

        # ── THE OUTLINE ──
        levels = [int(m) for m in HEADING.findall(new)]
        ok(f"unit {unit} has exactly one h1", levels.count(1) == 1, str(levels.count(1)))
        ok(f"unit {unit} skips no heading level",
           all(b - a <= 1 for a, b in zip(levels, levels[1:])), ",".join(map(str, levels)))

        # ── THE SCHEMA ──
        # The theme emits one BreadcrumbList per page naming AP Computer
        # Science A as the parent. Without one of its own, that was the only
        # structured data on an AP Cybersecurity page.
        ok(f"unit {unit} supplies its own BreadcrumbList", '"BreadcrumbList"' in new)
        ok(f"unit {unit} names the cyber course guide in it",
           "ap-cybersecurity-complete-course-guide" in new)
        ok(f"unit {unit} names no CSA hub", "ap-csa-exam-prep" not in new)

        # ── HOUSE PROSE RULES, on what a student reads ──
        text = visible(new)
        # chr(), not the character. A literal em-dash here would be a real
        # em-dash in a tracked file, which is the defect this line checks for.
        ok(f"unit {unit} shows no em-dash", chr(0x2014) not in text)
        # EK codes are teacher knowledge. N.N.L.N, e.g. 1.1.A.2.
        eks = re.findall(r"\b\d\.\d\.[A-Z]\.\d\b", text)
        ok(f"unit {unit} shows no CED Essential Knowledge code", not eks, ", ".join(eks[:3]))
        # College Board publishes no per-unit weighting, so any is fabricated.
        pct = re.search(r"\b\d{1,3}\s?%[^.]{0,40}\bexam\b|\bexam\b[^.]{0,40}\b\d{1,3}\s?%", text, re.I)
        ok(f"unit {unit} states no per-unit exam weighting", not pct, pct.group(0) if pct else "")

        # ── THE LABEL THAT READ AS A SLUG ──
        if f"/pages/ap-cyber-unit-{unit}-frq-practice" in new:
            ok(f"unit {unit} labels the FRQ page in capitals",
               f"Unit {unit} FRQ practice" in new)
            ok(f"unit {unit} no longer writes it lower case",
               f"Unit {unit} frq practice" not in new)

    failed = [(l, d) for good, l, d in checks if not good]
    for good, label, detail in checks:
        if not good:
            print(f"  FAIL  {label}" + (f": {detail}" if detail else ""))
    if failed:
        print(f"\n{len(checks) - len(failed)} passed, {len(failed)} failed\n")
        return 1
    print(f"OK - {len(checks)} checks re-derived from the sheet and the live bodies,"
          " independently of the generator")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

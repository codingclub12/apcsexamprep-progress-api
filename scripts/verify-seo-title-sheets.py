#!/usr/bin/env python3
"""Check the CSA SEO title sheets WITHOUT running the code that wrote them.

The generator works forwards: read the stored title, repair it, write a row.
This works backwards. It reads a finished row, undoes every declared
substitution, and requires what is left to be the article handle's own topic
slug, title-cased. A wrong unit, a wrong day, a dropped word, a word quietly
reworded, or a substitution nobody declared all fail that round trip, and none
of them can fail it by agreeing with a bug in the generator, because nothing
here imports the generator.

    python3 scripts/verify-seo-title-sheets.py \\
        smoke/fixtures/csa-daily-practice-live-titles.tsv \\
        imports/2026-09-02/csa-seo-title-repair-blog-posts.csv \\
        imports/2026-09-02/csa-seo-title-missing-blog-posts.csv

Exit 0 and print a one-line summary, or exit 1 and print what is wrong.
No em-dashes, per repo convention.
"""
import csv
import re
import sys

BLOG = "ap-csa-daily-practice"
SHAPE = re.compile(r"^AP CSA Unit ([1-4]) Day (\d{1,2}): (.+) \| Daily Practice$")
THEME = " | APCSExamPrep.com"

#  Undone longest first, and the parenthesised forms before the bare ones, so
#  that indexOf(String) is not eaten by indexOf.
REVERSE = [
    ("(&& with ||)", "Andand With"),
    ("(&& before ||)", "Andand Before"),
    ("substring(start,end)", "Substringstartend"),
    ("substring(length-3)", "Substringlength 3"),
    ("indexOf(String)", "Indexofstring"),
    ("equals vs equalsIgnoreCase", "Equals Ignorecase"),
    ("equals vs ==", "Equals Vs Doubleequals"),
    ("I/II/III", "Iii"),
    ("Else-If", "Elseif"),
    #  The one substitution with two possible sources, "Demorgans" and
    #  "De Morgans". Both sides are folded to the same token instead.
    ("De Morgan's", "\x00DEMORGAN"),
    ("compareTo", "Compareto"),
    ("toUpperCase", "Touppercase"),
    ("toLowerCase", "Tolowercase"),
    ("toString", "Tostring"),
    ("indexOf", "Indexof"),
    ("charAt", "Charat"),
    ("nextInt", "Nextint"),
    ("parseInt", "Parseint"),
    ("valueOf", "Valueof"),
    ("ArrayList", "Arraylist"),
    ("StringBuilder", "Stringbuilder"),
]


def title_case_slug(slug):
    out = []
    for word in slug.split("-"):
        out.append(word[:-1] + "D" if re.fullmatch(r"\d+d", word) else word[:1].upper() + word[1:])
    return " ".join(out)


def fold_surname(text):
    for spelling in ("De Morgans", "Demorgans"):
        text = text.replace(spelling, "\x00DEMORGAN")
    return text


def read_sheet(path, problems):
    raw = open(path, "rb").read()
    if not raw.startswith(b"\xef\xbb\xbf"):
        problems.append(f"{path}: no UTF-8 BOM, so Excel and Matrixify may misread it")
    if b"\r\n" not in raw:
        problems.append(f"{path}: rows are not CRLF terminated")
    if b"Body HTML" in raw:
        problems.append(f"{path}: carries a Body HTML column, which would rewrite article bodies")
    text = raw.decode("utf-8-sig")
    for n, line in enumerate(text.split("\r\n")):
        if not line:
            continue
        if not re.fullmatch(r'"[^"]*"(,"[^"]*")*', line):
            problems.append(f"{path}: line {n + 1} is not fully quoted")
        if re.search(r'(^|,)""(,|$)', line):
            problems.append(f"{path}: line {n + 1} has a blank cell, and a blank cell is an erase")
    return list(csv.DictReader(text.splitlines()))


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    fixture, sheets = argv[0], argv[1:]
    before = {}
    for line in open(fixture, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line:
            continue
        handle, live = line.split("\t", 1)
        before[handle] = live[: -len(THEME)] if live.endswith(THEME) else live

    problems = []
    seen = {}
    for path in sheets:
        rows = read_sheet(path, problems)
        for row in rows:
            handle = row.get("Handle", "")
            title = row.get("Metafield: global.title_tag [single_line_text_field]", "")
            where = f"{path}:{handle}"
            if row.get("Blog: Handle") != BLOG:
                problems.append(f"{where}: wrong blog {row.get('Blog: Handle')!r}")
            if row.get("Command") != "MERGE":
                problems.append(f"{where}: command is {row.get('Command')!r}, not MERGE")
            if handle in seen:
                problems.append(f"{where}: this handle also appears in {seen[handle]}")
            seen[handle] = path
            if handle not in before:
                problems.append(f"{where}: not an article the live store served")
                continue
            if title == before[handle]:
                problems.append(f"{where}: the row changes nothing")

            m = SHAPE.match(title)
            if not m:
                problems.append(f"{where}: {title!r} is not the target shape")
                continue
            unit, day, topic = m.group(1), m.group(2), m.group(3)

            hm = re.search(r"-day-(\d+)-(.+)$", handle)
            if not hm:
                problems.append(f"{where}: handle has no -day-N- segment")
                continue
            if hm.group(1) != day:
                problems.append(f"{where}: title says day {day}, handle says {hm.group(1)}")
            hu = re.search(r"(?:^|[^a-z])unit-?(\d)(?:-|$)", handle)
            if hu and hu.group(1) != unit:
                problems.append(f"{where}: title says unit {unit}, handle says {hu.group(1)}")
            if not hu and not re.search(r"-u(\d)-c\d-", handle):
                problems.append(f"{where}: nothing in the handle names a unit")
            hu2 = re.search(r"-u(\d)-c\d-", handle)
            if hu2 and hu2.group(1) != unit:
                problems.append(f"{where}: title says unit {unit}, handle says {hu2.group(1)}")

            undone = topic
            for after, source in REVERSE:
                undone = undone.replace(after, source)

            #  Where the expected topic comes from depends on what the article
            #  had before. An article with a broken SEO title has its topic in
            #  the handle slug, title-cased, which is where the generator that
            #  broke it got the topic from in the first place. An article with
            #  NO SEO title has its topic in the article Title, which is what
            #  the storefront was serving and is closer to what a person wrote:
            #  /unit-4-day-20-arraylist-vs-array is titled "Arraylist vs. Array"
            #  and the slug cannot tell you about that full stop.
            am = re.match(r"^Unit \d Day \d+ (.+)$", before[handle])
            if before[handle].startswith("AP CSA"):
                expected, source_of = fold_surname(title_case_slug(hm.group(2))), "handle"
            elif am:
                expected, source_of = fold_surname(am.group(1)), "article Title"
            else:
                problems.append(f"{where}: no SEO title and an unreadable article Title")
                continue
            if undone != expected:
                problems.append(
                    f"{where}: undoing the declared substitutions does not give the "
                    f"topic from the {source_of}\n"
                    f"        from the sheet {undone!r}\n"
                    f"        expected       {expected!r}")

    missing = sorted(set(before) - set(seen))
    if missing:
        problems.append(f"{len(missing)} live articles are in no sheet, first: {missing[:3]}")

    if problems:
        print(f"\n  {len(problems)} problems\n")
        for p in problems[:40]:
            print("    " + p)
        return 1
    print(f"SHEETS VERIFIED {len(seen)} rows across {len(sheets)} sheets, "
          f"every title round trips to its own handle")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

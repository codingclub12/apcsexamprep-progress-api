#!/usr/bin/env python3
"""Check the daily-practice code repair sheet WITHOUT running the code that wrote it.

The generator works by regular expression: substitute the mangled span away,
substitute the surviving spans away, keep the rest. This works by scanning. It
walks each code block one tag at a time, parses each span's attributes, decides
what that span is from its class, and rebuilds the block from the pieces. Then
it requires the result to be byte-identical to the Body HTML the sheet carries.

Two implementations of a deletion can only agree on the same bytes if the
deletion is right, and nothing here imports the generator, so this cannot agree
with a bug in it. The scanner is also stricter than the regex in a way that
matters: it requires each mangled span to be followed by the stranded "&gt;"
rather than assuming it, and it refuses a span whose class it does not
recognise instead of leaving it in place.

    python3 scripts/verify-code-repair-sheet.py \\
        smoke/fixtures/csa-daily-practice-code \\
        imports/2026-09-02/csa-daily-practice-code-repair-blog-posts.csv

Exit 0 and print a one-line summary, or exit 1 and print what is wrong.
No em-dashes, per repo convention.
"""
import csv
import io
import os
import re
import sys

BLOG = "ap-csa-daily-practice"
BLOCK = re.compile(r"<pre><code>.*?</code></pre>", re.S)
TAG = re.compile(r"</?[a-zA-Z][^>]*>")
CLASS = re.compile(r'\bclass="([^"]*)"')
MANGLED_CLASS = "&lt;span"
HIGHLIGHT = re.compile(r"^apcs-[a-z]+$")
CONTENT = re.compile(r'^"(apcs-[a-z]+)"$')


def scan(block, where, problems):
    """Rebuild one code block by walking its tags rather than substituting."""
    out = []
    i = 0
    while i < len(block):
        m = TAG.search(block, i)
        if not m:
            out.append(block[i:])
            break
        out.append(block[i:m.start()])
        tag = m.group(0)
        name = tag[1:].lstrip("/").split(" ")[0].split(">")[0].lower()
        if name != "span":
            #  pre, code and anything else the block legitimately holds.
            out.append(tag)
            i = m.end()
            continue
        if tag.startswith("</"):
            problems.append("%s: a </span> with no opener" % where)
            return None
        cls = CLASS.search(tag)
        if not cls:
            problems.append("%s: a <span> with no class attribute" % where)
            return None
        close = block.find("</span>", m.end())
        if close == -1:
            problems.append("%s: a <span> that never closes" % where)
            return None
        inner = block[m.end():close]
        if "<span" in inner:
            problems.append("%s: nested spans, so this close tag is not that open tag's" % where)
            return None
        after = close + len("</span>")
        if cls.group(1) == MANGLED_CLASS:
            #  The mangle. Its content must be the quoted class name the rewrite
            #  moved there, and the stranded "&gt;" must follow, or this is some
            #  other defect and the sheet should not have touched it.
            hit = CONTENT.match(inner)
            if not hit:
                problems.append("%s: a mangled span whose content is %r, not a quoted class name" % (where, inner))
                return None
            if not block.startswith("&gt;", after):
                problems.append("%s: a mangled span not followed by the stranded &gt;" % where)
                return None
            i = after + len("&gt;")
            continue
        if HIGHLIGHT.match(cls.group(1)):
            #  A span the mangling did not reach. Unwrap it: keep the text, drop
            #  the tags.
            out.append(inner)
            i = after
            continue
        problems.append("%s: a span with an unrecognised class %r" % (where, cls.group(1)))
        return None
    return "".join(out)


def rederive(body, handle, problems):
    pieces = []
    last = 0
    for m in BLOCK.finditer(body):
        pieces.append(body[last:m.start()])
        rebuilt = scan(m.group(0), handle, problems)
        if rebuilt is None:
            return None
        pieces.append(rebuilt)
        last = m.end()
    pieces.append(body[last:])
    return "".join(pieces)


def read_sheet(path, problems):
    raw = open(path, "rb").read()
    if not raw.startswith(b"\xef\xbb\xbf"):
        problems.append("%s: no UTF-8 BOM" % path)
    text = raw.decode("utf-8-sig")
    if not text.endswith("\r\n"):
        problems.append("%s: does not end with CRLF" % path)
    #  Give csv the whole string with newline="" so an embedded LF inside a
    #  quoted body is not rewritten on the way in. Splitting into lines first
    #  silently turns every one of them into CRLF and the comparison then fails
    #  for a reason that has nothing to do with the repair.
    rows = list(csv.DictReader(io.StringIO(text, newline="")))
    if rows and list(rows[0].keys()) != ["Blog: Handle", "Handle", "Command", "Body HTML"]:
        problems.append("%s: unexpected columns %r" % (path, list(rows[0].keys())))
    return rows


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    bodies_dir, sheet_path = argv[1], argv[2]
    problems = []

    live = {}
    for name in sorted(os.listdir(bodies_dir)):
        if not name.endswith(".html") or name.startswith("CONTROL-"):
            continue
        live[name[:-5]] = open(os.path.join(bodies_dir, name), encoding="utf-8").read()

    rows = read_sheet(sheet_path, problems)
    seen = set()
    checked = 0
    deleted = 0
    for row in rows:
        handle = row["Handle"]
        if handle in seen:
            problems.append("%s: appears twice in the sheet" % handle)
        seen.add(handle)
        if row["Blog: Handle"] != BLOG:
            problems.append("%s: wrong blog %r" % (handle, row["Blog: Handle"]))
        if row["Command"] != "MERGE":
            problems.append("%s: command is %r, not MERGE" % (handle, row["Command"]))
        if handle not in live:
            problems.append("%s: the sheet carries a body for an article with no live fixture" % handle)
            continue
        before = live[handle]
        want = rederive(before, handle, problems)
        if want is None:
            continue
        got = row["Body HTML"]
        if got != want:
            k = 0
            while k < len(got) and k < len(want) and got[k] == want[k]:
                k += 1
            problems.append("%s: the sheet body and the rederived body differ at offset %d\n"
                            "      sheet    : %r\n"
                            "      rederived: %r"
                            % (handle, k, got[max(0, k - 40):k + 60], want[max(0, k - 40):k + 60]))
            continue
        #  The repair has to actually have done something, and the result has to
        #  carry no trace of the defect.
        if got == before:
            problems.append("%s: the sheet body is identical to the live body" % handle)
        if MANGLED_CLASS in got:
            problems.append("%s: an escaped span survives in the sheet body" % handle)
        deleted += before.count('<span class="&lt;span">')
        checked += 1

    missing = sorted(set(live) - seen)
    if missing:
        problems.append("%d live mangled articles are not in the sheet: %s" % (len(missing), " ".join(missing[:5])))

    if problems:
        print("SHEET REFUSED, %d problems" % len(problems))
        for p in problems:
            print("  " + p)
        return 1
    print("SHEET VERIFIED %d rows, %d mangled spans deleted, rederived by an independent scanner"
          % (checked, deleted))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

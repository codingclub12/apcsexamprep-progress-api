#!/usr/bin/env python3
"""Re-derive the Unit 3 exam key fix from the raw artifact, in another language.

WHY THIS EXISTS
===============
The JavaScript tool rewrites the body and then checks the thing it just wrote.
That is one implementation agreeing with itself. This repo has been burned by
exactly that: the CSP sheet lost 90 bytes a page while every semantic check
passed, and a parse-back in a second implementation is what caught it.

So this shares no code with the rebalancer. Its own CSV reader, its own regexes,
its own arithmetic, working from two raw files:

    imports/2026-09-08/cyber-u3-exam-key-pages.csv    what will be imported
    smoke/fixtures/live-bodies/ap-cyber-unit-3-exam.html   what is live today

THE CLAIM IT IS RE-DERIVING
===========================
Two halves, and the second is the one that makes the change safe to ship:

    1. the key that ships is not guessable: balanced, no dead letter, no long
       run, and NOT PERIODIC
    2. no question changed its answer. For all twenty, the option TEXT that was
       correct on the live page is the option text that is correct on the new
       one, and the same four options are offered

Half 2 is checked here by matching option text between the two files, with no
reference to what the rewriter believed it preserved.

WHY PERIODICITY IS CHECKED AND NOT ASSUMED
==========================================
The first target key the rewriter produced was ABCDABCDABCDABCDABCD. Balanced
five ways, longest run 1, best single-letter score 5/20, and a student who spots
the cycle scores 20/20. Counting and run-length checks both pass it. This file
would have passed it too if it only counted letters, so it does not.

Run: python3 scripts/cyber-u3-exam-key-rederive.py [sheet.csv] [live-body.html]
"""

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEET = ROOT / "imports" / "2026-09-08" / "cyber-u3-exam-key-pages.csv"
LIVE = ROOT / "smoke" / "fixtures" / "live-bodies" / "ap-cyber-unit-3-exam.html"

HANDLE = "ap-cyber-unit-3-exam"
LETTERS = "ABCD"

# Written for this file rather than copied. The handler carries the question
# number, the option's own index, and the correct index repeated on every option.
OPT = re.compile(
    r'<li onclick="qzu3exam\(this,(\d+),(\d+),(\d+)\)" data-idx="(\d+)">(.*?)</li>',
    re.S,
)
ITEM = re.compile(r'<div class="cfu-item" id="u3exam-q(\d+)">(.*?)</div>\s*</div>', re.S)
CORR = re.compile(r"var CORR=\[([^\]]*)\]")

# The caps this fix is judged against, restated rather than imported.
MAX_PER_LETTER = 7
MAX_RUN = 2
MAX_GUESS = 7
MAX_LAG_MATCH = 0.55

checks = []


def ok(label, cond, detail=""):
    checks.append((bool(cond), label, detail))


def read_csv(path):
    """utf-8-sig, CRLF, QUOTE_ALL with doubled quotes. The Body HTML cell is 38 KB
    and full of commas, quotes and newlines, so a split(',') reader shreds it."""
    text = path.read_text(encoding="utf-8-sig")
    rows, row, field, quoted, i = [], [], [], False, 0
    while i < len(text):
        c = text[i]
        if quoted:
            if c == '"' and i + 1 < len(text) and text[i + 1] == '"':
                field.append('"'); i += 2; continue
            if c == '"':
                quoted = False; i += 1; continue
            field.append(c); i += 1; continue
        if c == '"':
            quoted = True; i += 1; continue
        if c == ",":
            row.append("".join(field)); field = []; i += 1; continue
        if c == "\r" and i + 1 < len(text) and text[i + 1] == "\n":
            row.append("".join(field)); rows.append(row); row, field = [], []; i += 2; continue
        if c == "\n":
            row.append("".join(field)); rows.append(row); row, field = [], []; i += 1; continue
        field.append(c); i += 1
    if field or row:
        row.append("".join(field)); rows.append(row)
    header = rows[0] if rows else []
    return header, [dict(zip(header, r)) for r in rows[1:]]


def parse(body):
    """-> (list of [option_html x4] per question, list of correct indices)."""
    questions, keys = [], []
    for m in ITEM.finditer(body):
        opts = OPT.findall(m.group(2))
        corrs = {int(o[2]) for o in opts}
        questions.append([o[4] for o in opts])
        keys.append(corrs.pop() if len(corrs) == 1 else None)
    declared = [int(x.strip()) for x in CORR.search(body).group(1).split(",")]
    return questions, keys, declared


def key_report(key):
    counts = [key.count(i) for i in range(4)]
    longest, run = 0, 0
    for i, k in enumerate(key):
        run = run + 1 if i and k == key[i - 1] else 1
        longest = max(longest, run)
    worst_lag, worst_rate = 0, 0.0
    for lag in range(1, len(key) // 2 + 1):
        hits = sum(1 for i in range(lag, len(key)) if key[i] == key[i - lag])
        rate = hits / (len(key) - lag)
        if rate > worst_rate:
            worst_lag, worst_rate = lag, rate
    return {
        "counts": counts,
        "longest": longest,
        "guess": max(counts),
        "lag": worst_lag,
        "rate": worst_rate,
        "letters": "".join(LETTERS[k] for k in key),
    }


def main(argv):
    sheet_path = pathlib.Path(argv[0]) if argv else SHEET
    live_path = pathlib.Path(argv[1]) if len(argv) > 1 else LIVE

    header, rows = read_csv(sheet_path)
    ok("the sheet is Handle, Command, Body HTML and nothing else",
       header == ["Handle", "Command", "Body HTML"], str(header))
    ok("one row", len(rows) == 1, str(len(rows)))
    ok("it is the unit 3 exam", rows and rows[0].get("Handle") == HANDLE)
    ok("MERGE", rows and rows[0].get("Command") == "MERGE")

    new = rows[0]["Body HTML"]
    live = live_path.read_text(encoding="utf-8")

    old_q, old_k, old_declared = parse(live)
    new_q, new_k, new_declared = parse(new)

    ok("twenty questions on the live page", len(old_q) == 20, str(len(old_q)))
    ok("twenty questions on the new page", len(new_q) == 20, str(len(new_q)))
    ok("every question offers four options, before and after",
       all(len(q) == 4 for q in old_q + new_q))
    ok("every option of a question agrees on one correct index, before and after",
       all(k is not None for k in old_k + new_k))
    ok("the live handlers and the live CORR array agree", old_k == old_declared,
       f"{old_k} vs {old_declared}")
    ok("the new handlers and the new CORR array agree", new_k == new_declared,
       f"{new_k} vs {new_declared}")

    # ── HALF 1: the key that ships is not guessable ─────────────────────────
    before, after = key_report(old_k), key_report(new_k)
    ok("the live key really is the guessable one this fixes",
       before["guess"] == 16 and before["counts"][3] == 0,
       f"{before['letters']} guess={before['guess']} D={before['counts'][3]}")
    ok("the new key uses every letter", all(c > 0 for c in after["counts"]),
       str(after["counts"]))
    ok("no letter is over the cap", max(after["counts"]) <= MAX_PER_LETTER,
       str(after["counts"]))
    ok("no run longer than two", after["longest"] <= MAX_RUN, str(after["longest"]))
    ok("bubbling one letter scores no more than seven",
       after["guess"] <= MAX_GUESS, str(after["guess"]))
    ok("the key is not periodic at any lag", after["rate"] <= MAX_LAG_MATCH,
       f"lag {after['lag']} at {after['rate']:.0%}")

    # ── HALF 2: no question changed its answer ──────────────────────────────
    same_answer = 0
    same_set = 0
    for i, (oq, nq) in enumerate(zip(old_q, new_q)):
        if oq[old_k[i]] == nq[new_k[i]]:
            same_answer += 1
        else:
            ok(f"q{i + 1} keeps its answer", False,
               f"was {oq[old_k[i]][:50]!r}, now {nq[new_k[i]][:50]!r}")
        if sorted(oq) == sorted(nq):
            same_set += 1
        else:
            ok(f"q{i + 1} offers the same four options", False, "the option set changed")
    ok("all twenty questions keep the same correct option text", same_answer == 20,
       f"{same_answer}/20")
    ok("all twenty offer the identical four options", same_set == 20, f"{same_set}/20")
    moved = sum(1 for a, b in zip(old_k, new_k) if a != b)
    ok("and the fix actually moved something", moved > 0, str(moved))

    # ── Everything outside the option lists is untouched ────────────────────
    # BLANK THE OPTION LISTS ONLY. The first version of this blanked the whole
    # <div class="cfu-item"> block, which contains the stem as well, so
    # "stems are byte-identical" compared two strings with no stems in them.
    # Mutation caught it: editing a question stem from "switch" to "ROUTER"
    # passed clean. A check that blanks its own subject is not a check.
    OPTS_UL = re.compile(r"<ul class=\"cfu-opts\">.*?</ul>", re.S)

    def blank(body):
        return CORR.sub("@@CORR@@", OPTS_UL.sub("@@OPTS@@", body))

    ok("stems, explanations and the grader script are byte-identical",
       blank(live) == blank(new))

    failed = [(l, d) for good, l, d in checks if not good]
    for good, label, detail in checks:
        if not good:
            print(f"  FAIL  {label}" + (f": {detail}" if detail else ""))
    if failed:
        print(f"\n{len(checks) - len(failed)} passed, {len(failed)} failed\n")
        return 1
    print(f"OK - {len(checks)} checks re-derived from the sheet and the live body,"
          " independently of the rewriter")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

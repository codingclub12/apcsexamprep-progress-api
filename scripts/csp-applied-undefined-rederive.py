#!/usr/bin/env python3
"""A second reading of the four sheets, from the raw CSV bytes and the live pages.

Written against the artifact rather than against the generator. It does not
import anything from scripts/build-csp-applied-undefined-sheets.js, does not
read its constants, and does not reuse its CSV parser: Python's own csv module
reads the file the way a spreadsheet would.

The question it answers is the only one that matters for a MERGE: does each row
differ from the body that is live right now in exactly one place, and is that
place the Applied Challenge subtitle.

It re-derives the expected question count independently too, by fetching each
card's own target and counting the graded items there, so a number agreed on by
both implementations is a number two separate fetches produced.

Run:  python3 scripts/csp-applied-undefined-rederive.py imports/2026-09-22
No em-dashes, per repo convention.
"""
import csv
import difflib
import json
import os
import re
import subprocess
import time
import sys

STORE = os.environ.get("STORE_ORIGIN", "https://www.apcsexamprep.com").rstrip("/")
PACE = float(os.environ.get("REDERIVE_PACE", "2.0"))

# No User-Agent. The storefront's bot management has blocked the spoof and
# allowed the honest client since 2026-09-03, and a wrong header here produces
# a plausible false report rather than an error.
def fetch(path, attempts=6):
    # Shopify sheds load with 429 on a walk this long, and a 429 body is the
    # "Verifying your connection" interstitial rather than an error: it parses
    # as neither JSON nor a page, which is exactly why the markers above are a
    # refusal and not a warning. A verifier that goes red at random is one that
    # gets ignored, so it is retried with a growing wait and then refused.
    last = ""
    for i in range(attempts):
        # Paced on EVERY call, not once per page. Two fetches happen per row and
        # pacing only the outer loop still bursts hard enough to trip the limit,
        # which is how the first run of this script sat in backoff for fifteen
        # minutes and looked like a hang rather than a rate limit.
        time.sleep(PACE + 4.0 * i)
        out = subprocess.run(
            ["curl", "-sS", "-L", "--compressed", "--max-time", "45", STORE + path],
            capture_output=True, text=True, check=True,
        ).stdout
        # A rendered storefront page always carries both of these and the
        # challenge interstitial carries neither. Refuse anything else rather
        # than measure it.
        if path.endswith(".json"):
            if out.lstrip().startswith("{"):
                return out
            last = "not JSON"
            continue
        if "Shopify.theme" in out and "/cdn/shopifycloud/" in out:
            return out
        last = "no rendered-page marker"
    raise SystemExit("refused: %s did not come back as a page (%s)" % (path, last))


CARD = re.compile(
    r'<a class="ex wide"\s+href="([^"]+)"\s*>\s*Applied Challenge\s*<span>([^<]*)</span>\s*</a>'
)


def live_body(handle):
    raw = fetch("/pages/%s.json" % handle)
    page = json.loads(raw)["page"]
    return page["body_html"]


def graded_items(href):
    body = fetch(href if href.startswith("/") else "/pages/" + href)
    if 'id="csp-x2"' not in body:
        raise SystemExit("refused: %s is not the exercise-2 renderer" % href)
    return len(re.findall(r'class="mcq-item"', body))


def main(argv):
    d = argv[0] if argv else "imports/2026-09-22"
    files = sorted(
        f for f in os.listdir(d)
        if f.startswith("csp-applied-challenge-undefined-bi") and f.endswith(".csv")
    )
    if not files:
        raise SystemExit("no sheets in " + d)

    seen = {}
    failures = []
    rows_total = 0

    for name in files:
        path = os.path.join(d, name)
        blob = open(path, "rb").read()
        if not blob.startswith(b"\xef\xbb\xbf"):
            failures.append("%s: no UTF-8 BOM" % name)
        if b"\r\n" not in blob:
            failures.append("%s: no CRLF between records" % name)
        text = blob.decode("utf-8-sig")
        # QUOTE_ALL: every field in every record is quoted.
        for line_no, line in enumerate(text.split("\r\n")):
            if line and not line.startswith('"'):
                # Continuation lines of a quoted body are expected; only a line
                # that starts a record matters, and records are separated by
                # CRLF outside quotes. Cheap proxy: the header must be quoted.
                if line_no == 0:
                    failures.append("%s: header is not quoted" % name)
                break

        rows = list(csv.reader(text.splitlines(True)))
        header, body_rows = rows[0], rows[1:]
        if header != ["Handle", "Command", "Body HTML"]:
            failures.append("%s: unexpected header %r" % (name, header))
            continue
        if "Published At" in header:
            failures.append("%s: carries a Published At column" % name)

        for handle, command, after in body_rows:
            rows_total += 1
            if handle in seen:
                failures.append("%s: %s also appears in %s" % (name, handle, seen[handle]))
                continue
            seen[handle] = name
            if command != "MERGE":
                failures.append("%s: %s command is %r" % (name, handle, command))

            before = live_body(handle)

            # One difference, and it is the subtitle.
            sm = difflib.SequenceMatcher(None, before, after, autojunk=False)
            edits = [op for op in sm.get_opcodes() if op[0] != "equal"]
            if len(edits) != 1:
                failures.append("%s: %s has %d edit regions, expected 1"
                                % (name, handle, len(edits)))
                continue
            tag, i1, i2, j1, j2 = edits[0]
            removed, added = before[i1:i2], after[j1:j2]

            m_before = CARD.search(before)
            m_after = CARD.search(after)
            if not m_before or not m_after:
                failures.append("%s: %s is missing the Applied Challenge card" % (name, handle))
                continue

            n = graded_items(m_after.group(1))
            checks = [
                ("the live subtitle says undefined",
                 m_before.group(2).startswith("undefined questions")),
                ("the new subtitle states the measured count",
                 m_after.group(2) == "%d questions, and every answer is recorded for your teacher" % n),
                ("the card still points at the same page",
                 m_before.group(1) == m_after.group(1)),
                ("the edit removed the word undefined",
                 "undefined" in removed and "undefined" not in added),
                ("the edit is inside the subtitle",
                 removed in before[m_before.start():m_before.end()]),
                ("no undefined questions survives anywhere",
                 "undefined questions" not in after),
                ("nothing non-ASCII was added",
                 all(ord(c) < 128 for c in added)),
                ("byte delta equals the string delta",
                 len(after) - len(before) == len(added) - len(removed)),
            ]
            for msg, passed in checks:
                if not passed:
                    failures.append("%s: %s: %s" % (name, handle, msg))

            print("  %-52s %-8s %d questions  %s"
                  % (handle, "ok" if not failures or failures[-1].find(handle) == -1 else "FAIL",
                     n, name))

    print("\n  %d row(s) across %d sheet(s), %d unique handle(s)."
          % (rows_total, len(files), len(seen)))
    if failures:
        print("\n  %d FAILURE(S):" % len(failures))
        for f in failures:
            print("    " + f)
        return 1
    print("  Every row differs from the body that is live right now in exactly "
          "one place, and that place is the subtitle.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

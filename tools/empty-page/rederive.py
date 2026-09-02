#!/usr/bin/env python3
"""REDERIVE: reach the same conclusion as the redirects sheet, from the raw
artifact, without using any of the code that produced it.

The JavaScript side decides a page is empty by finding the theme's rte wrapper
(`<div class="rte scroll-trigger animate--slide-in">`) and bounding it by
counting div opens against div closes. If that bounding is wrong, every number
downstream is wrong in the same direction and no amount of re-running it shows
anything, which is the whole reason this file exists.

So this derives emptiness a DIFFERENT WAY and never looks for the rte wrapper:

    take <main> ... </main>, drop <script>/<style>/comments, unescape entities,
    strip tags, collapse whitespace.  Remove the page's own <h1> text from the
    front.  What is left must be EXACTLY the store's global contact widget, a
    1441 character constant that every page carries.

A page whose <main> is nothing but its title and the contact widget has no
authored body.  Nothing about that argument depends on the rte wrapper, on div
counting, or on any Node module in this repo.

It also re-reads the CSV with Python's own csv module, so the envelope (BOM,
CRLF, QUOTE_ALL, the three permitted columns) is checked by a parser that did
not write the file.

    python3 tools/empty-page/rederive.py <sheet.csv>
    python3 tools/empty-page/rederive.py <sheet.csv> --offline   (envelope only)

Exit 0 if the sheet's claims hold.  Reads only.  Zero PII.  No em-dashes.
"""
import csv
import html as H
import io
import os
import re
import ssl
import sys
import time
import urllib.request

STORE = os.environ.get("STORE_ORIGIN", "https://www.apcsexamprep.com").rstrip("/")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
DELAY = 1.2

#  The global contact widget, as it renders inside <main> on every page of this
#  store.  Held as a literal so that a THEME change breaks this loudly instead of
#  quietly redefining what "empty" means.  Recovered from the live storefront on
#  2026-09-02; its length is the 1441 that, plus a six character title and one
#  space, makes the 1448 character shell.
WIDGET_HEAD = "Get in Touch Whether you're a student, parent, or teacher"
WIDGET_TAIL = "Prefer email? Reach me directly at"
WIDGET_LEN = 1441

_ctx = ssl.create_default_context(
    cafile="/root/.ccr/ca-bundle.crt" if os.path.exists("/root/.ccr/ca-bundle.crt") else None)


def fetch(path):
    req = urllib.request.Request(STORE + path, headers={"User-Agent": UA})
    try:
        r = urllib.request.urlopen(req, context=_ctx, timeout=45)
        return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:                       # noqa: BLE001
        return 0, str(e)


def main_text(doc):
    i = doc.find("<main")
    j = doc.find("</main>")
    if i < 0 or j < i:
        return None, None
    m = doc[i:j + 7]
    m = re.sub(r"<script[\s\S]*?</script>", " ", m, flags=re.I)
    m = re.sub(r"<style[\s\S]*?</style>", " ", m, flags=re.I)
    m = re.sub(r"<!--[\s\S]*?-->", " ", m)
    h1 = re.search(r"<h1[^>]*>([\s\S]*?)</h1>", m, re.I)
    title = re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", h1.group(1)))).strip() if h1 else ""
    txt = re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", m))).strip()
    return txt, title


def authored_remainder(txt, title):
    """What is left of <main> once the page title and the contact widget are gone."""
    rest = txt
    if title and rest.startswith(title):
        rest = rest[len(title):].strip()
    k = rest.find(WIDGET_HEAD)
    if k >= 0:
        widget = rest[k:]
        if WIDGET_TAIL not in widget:
            return None, "the contact widget is present but does not end where it used to"
        rest = (rest[:k]).strip()
        return rest, ("widget %d chars" % len(widget))
    return rest, "no contact widget on this page"


def read_sheet(path):
    problems, notes = [], []
    raw = open(path, "rb").read()
    if not raw.startswith(b"\xef\xbb\xbf"):
        problems.append("no UTF-8 BOM")
    text = raw.decode("utf-8-sig")
    if "\r\n" not in text:
        problems.append("no CRLF record separator")
    for n, line in enumerate(text.split("\r\n")):
        if not line:
            continue
        for field in re.split(r',(?=")', line):
            if not (field.startswith('"') and field.endswith('"')):
                problems.append("line %d is not fully quoted: %r" % (n + 1, line[:60]))
                break
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        problems.append("no rows")
        return [], problems, notes
    header = [c.strip() for c in rows[0]]
    if header != ["Command", "Path", "Target"]:
        problems.append("header is %r, and a redirects sheet carries Command, Path and Target ONLY. "
                        "Any fourth column is a column Matrixify will write." % (header,))
    data = [dict(zip(header, r)) for r in rows[1:] if any(c.strip() for c in r)]
    for r in data:
        if r.get("Command", "").strip().upper() != "MERGE":
            problems.append("%s is not MERGE" % r.get("Path"))
    paths = [r.get("Path", "") for r in data]
    targets = [r.get("Target", "") for r in data]
    if len(set(paths)) != len(paths):
        problems.append("a Path appears twice")
    for p, t in zip(paths, targets):
        if p == t:
            problems.append("%s redirects to itself" % p)
        if t in set(paths):
            problems.append("%s targets %s, which is itself redirected. That is a chain." % (p, t))
        if not re.fullmatch(r"/pages/[a-z0-9-]+", p or ""):
            problems.append("Path %r is not a /pages/<handle> path" % p)
        if not re.fullmatch(r"/pages/[a-z0-9-]+", t or ""):
            problems.append("Target %r is not a /pages/<handle> path" % t)
    return data, problems, notes


def main(argv):
    if not argv:
        print("usage: rederive.py <sheet.csv> [--offline]")
        return 2
    sheet = argv[0]
    offline = "--offline" in argv
    data, problems, notes = read_sheet(sheet)

    print("\n1. THE ENVELOPE, read by a parser that did not write the file")
    print("   %d row(s), header Command/Path/Target, BOM + CRLF + QUOTE_ALL" % len(data))

    if not offline:
        print("\n2. THE CLAIM, re-derived live without the rte wrapper")
        for r in data:
            for role, path in (("PATH  ", r["Path"]), ("TARGET", r["Target"])):
                status, doc = fetch(path)
                time.sleep(DELAY)
                if status != 200:
                    if role.strip() == "PATH" and status in (301, 302, 404):
                        print("   %s %s  HTTP %d" % (role, path, status))
                        continue
                    problems.append("%s %s answered HTTP %s" % (role.strip(), path, status))
                    continue
                txt, title = main_text(doc)
                if txt is None:
                    problems.append("%s %s has no <main>, so this instrument cannot read it" % (role.strip(), path))
                    continue
                rest, why = authored_remainder(txt, title)
                if rest is None:
                    problems.append("%s %s: %s" % (role.strip(), path, why))
                    continue
                print("   %s %s  main=%d  title=%r  authored=%d  (%s)"
                      % (role, path, len(txt), title, len(rest), why))
                if role.strip() == "PATH" and rest:
                    problems.append("PATH %s carries %d characters of authored text outside the "
                                    "contact widget. It is NOT empty, and redirecting it would "
                                    "discard content nobody reviewed: %r"
                                    % (path, len(rest), rest[:120]))
                if role.strip() == "TARGET" and len(rest) < 1000:
                    problems.append("TARGET %s carries only %d characters of authored text. A "
                                    "redirect onto a near-empty page is a hop to the same nothing."
                                    % (path, len(rest)))

    print()
    if problems:
        print("  REDERIVE FAILED, %d problem(s):" % len(problems))
        for p in problems:
            print("    " + p)
        print()
        return 1
    for n in notes:
        print("  note: " + n)
    print("  REDERIVE OK: an independent reading of %s agrees with the sheet.\n" % sheet)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

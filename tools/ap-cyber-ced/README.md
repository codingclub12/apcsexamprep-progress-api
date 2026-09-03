# AP Cybersecurity CED alignment tooling

Scripts for checking AP Cybersecurity page bodies against the Course and Exam
Description effective Fall 2026, plus cleaned text dumps of the framework
sections for Unit 1 and for Units 2 through 5.

**Use `ced_audit_v2.py` for any unit.** `ced_audit.py` is kept for reference but
its `OFF` list is a Unit 1 exclusion list mislabelled as a course-wide one:
eleven of its terms are real CED content owned by Units 2-5 (credential
stuffing, password spraying, brute force and rainbow table in Unit 4;
man-in-the-middle, rogue access point and WPA3 in Unit 3; shoulder surfing and
dumpster diving in Unit 2; keylogger in 2 and 4; honeypot in Unit 5). Run against
those units it flags correct pages, which is the false positive that costs the
most, because someone then rewrites a page that was right. v2 reads
`ced_term_index.json` instead, which records the units each term belongs to.

They arrived in the `ap-cyber-unit1-handoff` bundle on 2026-08-27 and are
vendored here because the work they gate is not finished: WO-3 shipped, WO-4
through WO-8 have not, and the same checks are wanted against Units 2 through 5.
A tool that lives in a zip file gets rebuilt from memory by the next session.

## The source of truth is the PDF

`ap-cybersecurity-course-and-exam-description__1_.pdf`, effective Fall 2026.
`CED-UNIT1-EXTRACT.txt` is a cleaned text dump of the Unit 1 framework section
for grepping. Where the two disagree, the PDF wins. Do not use the older AP
Cybersecurity framework PDF; it is not the CED.

## Usage

```
./fetch_pages.sh ./pages                    # pull all 23 Unit 1 page bodies as JSON
python3 ced_audit_v2.py ./pages --unit=3    # off-CED / wrong-term / wrong-unit, any unit
python3 ced_audit.py ./pages                # Unit 1 ONLY, see the warning above
python3 validate_csv.py out.csv --baseline ./pages   # pre-import gate; exit 1 means DO NOT import
#   ... a human imports the sheet via Matrixify ...
python3 verify_import.py out.csv            # post-import gate; exit 1 means it did NOT land
```

`fetch_pages.sh` needs the `www` subdomain. Non-www is blocked by Cloudflare, and
so is a request without a browser User-Agent. From inside a Claude Code container
a User-Agent alone is not enough either: Cloudflare returns a "Verifying your
connection" interstitial with HTTP 200, so the file looks fetched and is HTML.
Send `Accept`, `Accept-Language` and `Sec-Fetch-Mode: navigate` as well, and check
that the body starts with `{"page":` before trusting it.

The CED PDF is not vendored here: it is copyrighted and 5.9 MB. Download it from
`https://apcentral.collegeboard.org/media/pdf/ap-cybersecurity-course-and-exam-description.pdf`.
It is AES-encrypted with an empty user password, so extraction needs `pypdf` with
`cryptography` present and a `reader.decrypt('')` call first. Its text also
carries hyphenation artifacts across line breaks (LO 3.4.A reads "network- based
firewalls"), so match punctuation-insensitively or the index will report present
terms as absent. That mistake cost a full pass here on 2026-08-27.

## Always pass --baseline

Every check in `validate_csv.py` is absolute: it asks whether the sheet is in a
good state, not whether the sheet makes anything worse. Those are different
questions, and Topic 1.1 Exercise 1 is where the difference bit. That page has no
`data-lesson-id` and never has, so it reports no progress at all. A sheet fixing
something else entirely still failed `has_lesson_id`, which under this script's
own contract reads as DO NOT IMPORT.

Weakening the check would lose a real signal: four Unit 1 pages are missing that
attribute and that is a genuine defect, tracked separately. Injecting the
attribute is chat-side work, not this repo's.

So point `--baseline` at a directory of live page JSON, as `fetch_pages.sh`
writes. A check that fails on the sheet **and** on what is already live is
reported as PRE-EXISTING and does not block. A check that passes live and fails
on the sheet is a regression this import would cause, and still fails. Without
`--baseline` nothing changes.

## The audit reads three regions, and you want all three

`ced_audit.py` used to strip `<script>` before counting, the way you strip
markup. On the activity pages that is badly wrong: Exercise 1 renders all seven
of its red flags out of a JavaScript array, so every word a student reads lives
inside a script block. The audit called that page **clean** while it was teaching
Authority as a psychological tactic, which is EK 2.1.A.3 and belongs to Unit 2,
in front of a live class.

It now reports separately:

| Region | What it is | How much it matters |
|---|---|---|
| BODY | prose outside script and style | what a reader sees directly |
| JS | text inside non-JSON-LD `<script>` | student-facing content that happens to be rendered by code, and it counts exactly as much as BODY |
| META | `<script type="application/ld+json">` | search metadata, worth fixing when it advertises material the CED lacks, never the urgent hit |

A count printed as `12+3` means 12 in BODY and 3 in JS. Anything with a JS number
was invisible to every earlier run, so treat a previously "clean" or "low"
activity page as **unmeasured** rather than fine.

Scanning raw JavaScript does match identifiers. The first run of this version
proved it: `mitm` fired on three clean pages because the grading engine defines
`cfuSubmitMCQ` and `cfuSubmitMatch`, and "subMITMatch" lowercases to contain it.
Every term is matched on a word boundary now. Terms that are deliberate prefixes,
like `dumpster div` catching "dumpster diving", are listed in `PREFIX` and get a
leading boundary only.

## Do not verify an import with a byte comparison

Shopify normalises a page body when it stores it, and the stored body will never
equal the sheet. On the WO-3 Topic 1.1 import the live body came back **556 bytes
shorter** than what was sent, and nothing was wrong:

- **HTML entities are decoded.** `&#9733;` is stored as a star, `&bull;` as a
  bullet. Entities are longer than the characters they encode, so the body
  shrinks. This does not retire the pure-ASCII authoring rule: that rule protects
  the transport, which is where the 2026-08-07 double-encoding incident happened.
  A clean entity decoded into a clean character on the far side is the rule
  working.
- **A newline is inserted** between a block element and an inline child opening
  directly after it, so `<div class="x"><strong>` comes back with a newline
  between the two.

`verify_import.py` normalises both, then requires equality, so a difference that
survives is real. It also parses the result for nesting errors rather than
counting tags, because tag arithmetic is what missed the original defect.

## Reading the audit

`OFF-CED` and `WRONG-UNIT` are exact string matches and are the authoritative
signals. `MISSING EK` is a regex heuristic over paraphrasable wording and throws
false positives when a page states an EK correctly in its own words.

An off-CED hit is not automatically a defect. Naming a term while telling
students it is not assessed is allowed and is what the Topic 1.1 enrichment
section does. Teaching it as something to learn, sort or classify is not. The
count alone cannot tell those apart, so read the context of every hit:

```
python3 -c "import json,re,html,sys; \
b=json.load(open(sys.argv[1]))['page']['body_html']; \
t=re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>',' ',b))); \
[print('...'+t[max(0,m.start()-100):m.start()+120]+'...') \
 for m in re.finditer(sys.argv[2], t, re.I)]" pages/<handle>.json vishing
```

The question to ask of each hit: is a student being asked to learn this, or
being told not to.

## Two corrections made when this was vendored

Both were false failures on a page that was fine, and both are documented in
`validate_csv.py`'s docstring.

- **`div_balanced`** counted `<div` against `</div>` across the raw body,
  comments included. The live Topic 1.1 lesson carried a leftover instruction
  comment holding a `<div ...>` that was never real markup, so a sound page read
  as one tag short. Comments are stripped before counting now. A comment cannot
  contain markup, so this is the correct count rather than a weaker one, and a
  genuinely severed tag still fails.
- **`activity_nav_start` / `activity_nav_end`** accepted only
  `APCYBER-ACTIVITY-NAV-*`. Exercise, lab and quiz pages use those markers.
  Lesson pages use `APCYBER-LESSON-NAV-*`, and hub pages have neither. Either
  marker is accepted now, under the names `nav_strip_start` / `nav_strip_end`.

## Where the work stands

See `docs/ap-cyber-unit1-ced-realignment.md` for the work orders, the per-page
damage table, and what has shipped.

## The extract was mojibaked, and is not any more (2026-09-03)

`CED-UNIT1-EXTRACT.txt` carried **65 corrupted runs**: 10 right single quotes, 28
en spaces, 13 middle dots, 12 section signs and 2 em dashes. Each was a character
whose UTF-8 bytes had been read as latin-1 and re-encoded, so "they don't comply"
was stored with the apostrophe replaced by the three characters
U+00E2 U+0080 U+0099, which render as punctuation-shaped noise and mean nothing.

Nothing caught it for as long as the file has existed, for a dull reason:
`smoke/encoding-guard.js` did not scan `.txt`. It does now, which is how this was
found. The repair used `repair()` from `lib/mojibake.js`, which reverses the
misreading rather than retyping the text, and the arithmetic closes exactly: 65
runs, 105 characters recovered, 17599 down to 17494.

Re-check it at any time:

```
npm run smoke:encoding                   # red if any run comes back
python3 scripts/mojibake-rederive.py     # the same verdict, from Python's codecs
```

This matters more than a formatting nit, because
`docs/ap-cyber-unit1-ced-realignment.md` names this file as the authority for
Unit 1. Every semantic check in this repo passed while it said the wrong thing,
which is the failure mode `lib/mojibake.js` exists to close: corrupted text is
still valid UTF-8, so it parses, it lints, it serves, and only the meaning is
wrong.

**Reported, but NOT verifiable from this repo:** that the source
`ap-cybersecurity-course-and-exam-description__1_.pdf` in the chat project is
extracted UTF-8 text carrying a `.pdf` extension, with no `%PDF` header and no
`/Root`, so `pdftotext` and `pdfplumber` fail on it. That file is not in this
repository, so this paragraph is a pointer rather than a checked fact. A session
that cannot open it should suspect the file, not conclude the CED is unavailable.

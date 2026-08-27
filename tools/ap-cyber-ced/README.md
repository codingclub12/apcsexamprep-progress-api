# AP Cybersecurity CED alignment tooling

Three scripts for checking AP Cybersecurity page bodies against the Course and
Exam Description effective Fall 2026, plus a cleaned text dump of the Unit 1
framework section.

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
./fetch_pages.sh ./pages           # pull all 23 Unit 1 page bodies as JSON
python3 ced_audit.py ./pages       # off-CED / wrong-unit / missing-EK report
python3 validate_csv.py out.csv    # pre-import gate; exit 1 means DO NOT import
```

`fetch_pages.sh` needs the `www` subdomain. Non-www is blocked by Cloudflare.

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

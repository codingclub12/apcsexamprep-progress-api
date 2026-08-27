# 2026-08-27, Claude Code: AP Cyber Units 2-5 CED audit

Asked to check Units 2 through 5 lesson pages against the CED, then check whether
the exercises, labs, quizzes and exams align with their lessons. This is the
follow-on the Unit 1 realignment doc asked for at the end of its work orders.

Audit only. **No page was changed and nothing was imported.**

## What changed in the repo

- `docs/ap-cyber-units-2-5-ced-audit.md`, the findings and a suggested order.
- `tools/ap-cyber-ced/CED-UNITS-2-5-EXTRACT.txt`, 136 KB ASCII dump of the Unit
  2-5 framework, the counterpart to the existing Unit 1 extract.
- `tools/ap-cyber-ced/ced_term_index.json`, 176 security terms mapped to the CED
  units whose framework contains them.
- `tools/ap-cyber-ced/ced_audit_v2.py`, unit-agnostic auditor.
- Corrections to `docs/ap-cyber-unit1-ced-realignment.md`,
  `tools/ap-cyber-ced/README.md` and `tools/ap-cyber-ced/ced_audit.py`.

## Evidence

CED PDF downloaded from apcentral.collegeboard.org 2026-08-27, 192 pages,
"Fall 2026", "(c) 2026 College Board". Extraction validated against the Unit 1
ground truth already in the repo before it was trusted: "digital avatar" present
and "deepfake" absent, evil twin present, spear phishing and vishing absent, all
as `docs/ap-cyber-unit1-ced-realignment.md` says.

127 live page bodies pulled from `www.apcsexamprep.com/pages/<handle>.json`, all
HTTP 200. Page inventory taken from the Shopify Admin API rather than guessed
from handle patterns, which is what surfaced the orphaned Unit 2 legacy set.

## Findings, shortest form

- The CED has 24 topics. The site teaches **2.5, 3.6 and 4.5, none of which
  exist** in it.
- **Unit 3's 3.3 and 3.4 are swapped** against the CED. Site 3.3 is Firewalls
  (CED 3.4), site 3.4 is Segmentation (CED 3.3). CED 3.2 has no lesson.
- Unit 2's five **pre-realignment lesson pages are still published**, four of them
  declaring the same `data-lesson-id` as the live CED-aligned page for the topic.
- **All four 5.3 activities test hashing**; the 5.3 lesson teaches symmetric
  encryption and never mentions it. The 5.2 quiz is a cryptography quiz on a
  managerial-controls lesson.
- The **3.5 lab grades the Lockheed seven-stage kill chain**. The CED's model is
  six phases (EK 2.1.C.1) and shares exactly one of them.
- **Twenty Unit 5 activity pages carry no `data-lesson-id`** and cannot report.

## What was learned

**The Unit 1 off-CED list is a Unit 1 list.** It is labelled as course-wide in
three places and eleven of its terms are real CED content owned by Units 2-5.
Running it unchanged would have condemned correct pages. Corrected in all three
places rather than only worked around here, because the next session would hit it
again. This is the second time a tool in this directory measured the wrong thing
and read as authoritative; the first was the pre-`regions()` version calling
JS-rendered pages clean.

**Two open board tasks rest on premises the CED contradicts.** #99 says LO 3.1.C
does not exist; it exists with six EKs. #98 says LO 4.1.D has no EKs; it has four.
Both were filed against teacher guides that were right.

**Verify the extractor before the content.** The first term index called 85 terms
absent from the CED. 27 of those were PDF hyphenation artifacts: the CED's own
text reads "network- based firewalls" mid-sentence, so word-boundary regex misses
real hits. Squashing to `[a-z0-9]` on both sides fixed it. A CED audit that says
"this term is not in the CED" is only as good as its ability to find terms that
are.

## Still open

Nothing is fixed. Eight work items are listed in the findings doc in suggested
order, the first three being the Unit 3 renumbering, the 5.3 activity set and the
5.2 quiz. The renumbering is the one that needs a plan rather than a CSV: it
touches the decks, the teacher guides, the manifest and every internal link, and
`docs/cyber-unit3-tier1-split-spec.md` is already written against CED numbering
while the pages are not.

Not looked at: Units 2-5 case files, projects, scenario practice beyond a term
scan, the per-unit exams beyond term counts, and whether the teacher decks match
the CED anywhere except Unit 3.

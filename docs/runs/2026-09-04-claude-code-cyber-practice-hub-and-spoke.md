# Cyber practice hub and spoke, and the connection to the course

**Date:** 2026-09-04 · **Board:** #207 · **Branch:** `claude/cyber-hub-audit-remediation-fx9tkn`

The ask was to build the cyber practice hub and spoke and connect it to the full
course, without cannibalising what already ranks.

## What was actually wrong, measured rather than assumed

AP Cyber ran two content layers that did not touch each other. Measured against
the storefront on 2026-09-04, body zone only, chrome excluded:

| page | links concept spokes | links course pages |
|---|---|---|
| `ap-cybersecurity-topics` | 46 | 0 |
| `ap-cybersecurity-complete-course-guide` | 13 | 130 |
| `ap-cybersecurity-practice` | 7 | 2 |

So a student on a concept page could not reach the practice for that unit, and a
student on the practice hub could not reach the course. The topics hub linked no
practice page at all.

Underneath that, 129 pieces of practice were live and hubbed nowhere: 27 lesson
quizzes, 54 exercises, 32 labs, 5 case files, 5 unit exams, 2 projects and 4
scenario and FRQ sets. Reachable through the course guide or by typing the URL,
and by nothing else.

The practice hub itself already existed. `ap-cybersecurity-practice`,
`-frq-practice` and `-labs` shipped under board #114 and are live. What was
missing was the middle: no per-unit spoke, and no edge in either direction
between practice and the rest of the site.

## The cannibalisation question, and what CSP actually does

Tanner's read was that CSP mostly avoided this. It did, and the mechanism is
worth stating because the first answer I measured was wrong.

CSP looks like it has no course spine, because nothing matches `-lesson-N`. It
has 101 course pages, namespaced `ap-csp-course-*`:

```
ap-csp-bi2-binary-numbers            the public concept page, keyword intent
ap-csp-course-bi2-binary-numbers     the course lesson, enrolled intent
```

Only 4 of the 101 share a slug stem with a public page. So CSP keeps the bare
keyword URLs for the SEO layer and puts the course under its own namespace.

Cyber's course spine is `ap-cyber-unit-N-lesson-M`, which carries no keyword at
all, so it does not compete either. **The cyber cannibalisation is not the
course layer. It is the `ap-cybersecurity-unit-N-<slug>` legacy pages**, and the
2026-09-03 audit found 13 CED topics carrying more than one page in the public
namespace. The pattern in those 13 is clean and worth keeping in view:

- Multiple *sub-concept* spokes on one topic are fine and deliberate. CED 3.1
  carries ddos, dns-poisoning, mac-flooding, man-in-the-middle and
  network-attacks, and those are five different searches.
- The real duplicates are pairs like `ap-cybersecurity-defense-in-depth` against
  `ap-cybersecurity-unit-2-defense-in-depth`, or `-access-controls` against
  `-unit-2-access-controls`. Same keyword, two pages.

Every one of those duplicates is a page the topics hub does not link. The
cannibalising set and the orphaned set are the same set, which is a useful thing
to know before anyone retires anything. Nothing was retired here.

## What shipped

Five new per-unit practice spokes, plus two edges that did not exist.

```
ap-cybersecurity-topics ──> ap-cybersecurity-practice        (new edge)
ap-cybersecurity-practice ──> ap-cybersecurity-unit-N-practice  (five new edges)
ap-cybersecurity-unit-N-practice ──> its unit study page, the course guide,
                                     its unit's lesson pages, and its 22 to 31
                                     practice assets
```

Anti-cannibalisation is a validator rule rather than a convention, because this
repo has twice proved that a convention does not survive a busy afternoon. P1
requires a practice page to say "Practice" in its Title and H1, and refuses one
that carries a CED topic title anywhere in its heading. A future session that
writes a practice page called "Firewalls" gets a red suite.

Built the house way: canonical data, a generator, a validator, a sheet.

| file | what it is |
|---|---|
| `config/cyber-practice-hubs.json` | canonical data, BUILT not typed |
| `tools/ap-cyber-ced/build-practice-hubs.js` | builds it from the live sitemap |
| `lib/cyber-practice-spec.js` | the reader, and the 41 required edges |
| `tools/ap-cyber-ced/practice-validator.js` | 11 rules, 6 reused from the topic validator |
| `tools/ap-cyber-ced/generate-practice-sheet.js` | the two sheets |
| `smoke/cyber-practice-hub.js` | 17 checks, 13 mutations |
| `scripts/cyber-practice-rederive.py` | second implementation, different language |

## Two things the work found that the plan did not predict

**The shared topic validator was reporting CSS as a fabricated exam weighting.**
`flatten()` strips tags, but a `<style>` body sits *between* tags, so every CSS
declaration stayed in the text rules 1 and 2 read. `EXAM_WORDS` matches
"weight", which is in every `font-weight:`, and the percent pattern matches the
`0%` and `100%` in every gradient. Thirteen R2 failures on two live hub bodies,
all of them CSS. The rules are about student-visible text and nobody reads a
stylesheet, so `flatten` now drops `<style>` and `<script>` bodies. It cannot
hollow the rules: it only removes candidates that never rendered, and rules 3
and 7 read the raw column value anyway. Both existing suites stay green, all
seven rules still independently provable red, and the fix has its own mutation
in the gate plus a positive case asserting R2 still fires on real text.

**My eleven rules passed a sheet that would have unpublished the topics hub.**
The first version was one file with all seven rows. A blank cell in a Matrixify
import does not mean "leave this column alone", it means "set this column to
empty", so the two hub rows carried blank Title, Published and SEO columns.
`scripts/matrixify-preflight.js` refused it and named all six problems. That is
a property of the file rather than of any row, which is exactly why no row rule
saw it. The package now ships as two sheets, and the preflight is part of the
suite, including a check that the single-sheet shape is still refused.

Worth saying plainly: the validator I wrote was green on a sheet that would have
damaged a live page, and a check that already existed caught it. The lesson is
the one CLAUDE.md already states about verifying what a check covers by running
it rather than by reading it.

## Evidence

- `npm run smoke:cyberpractice` - 17 checks, 13 mutations, every one caught by
  the rule that claims it, all 11 rules proven red independently.
- `npm run smoke:cybersheet` and `smoke:cybersheetmutation` - unchanged and
  green after the `flatten` fix, all 7 rules still provable red.
- `node scripts/deploy-gate.js deploy-gates/2026-09-04-cyber-practice-hub-and-spoke.json --pre`
  - suite, rederive and mutation all agree.
- `python3 scripts/cyber-practice-rederive.py ...` - 17 checks re-derived from
  the CSV by a different parser in a different language, expectations taken from
  the live sitemap rather than from the generator's own config.
- `node scripts/matrixify-preflight.js` on both sheets - clear to import.
- Full offline suite green.

## Still open

- **The sheets are not imported.** Both are generated, preflighted and clear.
  A Matrixify import is a human action. Import
  `imports/2026-09-04/cyber-practice-new-pages.csv` FIRST, then
  `cyber-practice-hub-links-pages.csv`: the hub links point at the five new
  handles, so the reverse order publishes two hubs linking five 404s.
- **The live check is deferred and is named in the gate.** After the import: the
  five handles return 200, `ap-cybersecurity-topics` contains
  `ap-cybersecurity-practice`, and `ap-cybersecurity-practice` contains all five
  spoke handles. All three are false today, so they assert something the change
  made true rather than something already true.
- **Course pages do not link back to their unit's practice spoke.** This pass is
  hub-down, which `docs/internal-linking.md` argues is the right first move:
  editing the hub rescues every spoke beneath it. The 128 course pages linking
  onward to practice is the internal-link pipeline's job and a separate sheet.
- **Two dead links in the course guide**, found while measuring and not fixed
  here: `ap-cyber-unit-1-lesson-1` and `ap-cybersecurity-study-guides`, both in
  `ap-cybersecurity-complete-course-guide`. Board #209.
- **The shared handle snapshot is stale.** `smoke/fixtures/live-page-handles.txt`
  is a strict subset of the live sitemap, missing 18 pages, nothing removed. Its
  sha256 is pinned in `config/cyber-topics.json`, so refreshing it means
  rebuilding the taxonomy and was left alone. This package uses its own dated
  snapshot instead. Board #210.
- The audit's two 404 handles were confirmed independently against the sitemap:
  `ap-cybersecurity-unit-1-exam` and `-unit-1-project` do not exist, and
  `ap-cyber-unit-1-exam` and `-project` do. Not fixed here; the affected bodies
  are Unit 1 and Unit 3 lesson pages, and three Unit 1 pages are held by another
  session's claim.

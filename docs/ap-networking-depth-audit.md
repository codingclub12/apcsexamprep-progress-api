# AP Networking depth audit

Measured 2026-08-17 against the 22 live topic pages. Denominators added
2026-08-19 from the published framework PDF.

## What this is and what it is not

This measures the published AP Networking pages against College Board's own
course framework. It answers "where is the depth thin", with real denominators.

**Updated 2026-08-19.** The original 2026-08-17 pass could only report FLOORS:
`apcentral.collegeboard.org` was blocked by the agent proxy, so the framework PDF
could not be read and there was no denominator. Egress was opened on 2026-08-19,
the PDF was retrieved and parsed, and every number below is now measured rather
than inferred.

The correction matters and is worth stating plainly: the original pass inferred
**53** missing Essential Knowledge codes from breaks in the sequences the pages
themselves cited. The real figure is **118 of 284**. The floor was a genuine
floor, and it was less than half the truth.

`scripts/networking-ek-coverage.js` reproduces this against the live pages at any
time. The denominator lives in `config/networking-framework-ek.json`, extracted
from the 102-page framework PDF and pinned by sha256 so a revision is detectable
rather than silently moving the goalposts.

## The structure is already right

Four units, 22 topics, 4 / 6 / 6 / 6. That matches the published framework, whose
units are Managing My Connections, Managing My Shared Connections, Managing Many
Connections, and Managing Our Global Connections. Topic titles track College
Board's own ("Fixing What's Slowing Me Down: Troubleshooting Issues on My
Device" is topic 1.1).

So the question "should we publish more pages in case they match" is already
answered by the pages that exist. There is no coverage gap at the topic level.
Every finding below is about depth inside topics that are already there.

## Coverage against the framework

| Topic | Framework EK | Cited | Coverage |
|-------|-------------:|------:|---------:|
| 1.1 | 18 | 9 | 50% |
| 1.2 | 8 | 3 | **38%** |
| 1.3 | 9 | 4 | 44% |
| 1.4 | 15 | 5 | **33%** |
| 2.1 | 9 | 3 | **33%** |
| 2.2 | 22 | 10 | 45% |
| 2.3 | 13 | 8 | 62% |
| 2.4 | 9 | 5 | 56% |
| 2.5 | 9 | 8 | 89% |
| 2.6 | 9 | 4 | 44% |
| 3.1 | 11 | 9 | 82% |
| 3.2 | 18 | 9 | 50% |
| 3.3 | 22 | 9 | **41%** |
| 3.4 | 16 | 11 | 69% |
| 3.5 | 13 | 6 | 46% |
| 3.6 | 17 | 17 | 100% |
| 4.1 | 9 | 4 | 44% |
| 4.2 | 10 | 7 | 70% |
| 4.3 | 12 | 7 | 58% |
| 4.4 | 12 | 6 | 50% |
| 4.5 | 16 | 16 | 100% |
| 4.6 | 7 | 6 | 86% |

**Overall: 166 of 284 = 58.5%.** 118 Essential Knowledge codes are uncited.

By unit, and the gradient is the whole story:

| Unit | Coverage |
|------|---------:|
| 1 | 21/50 = **42%** |
| 2 | 38/71 = 54% |
| 3 | 61/97 = 63% |
| 4 | 46/66 = **70%** |

## Finding 1: coverage rises monotonically by unit, and Unit 1 is the floor

42, 54, 63, 70. Each unit is better covered than the one before it, which is the
signature of a course written front to back with the craft improving as it went,
and then never revisited.

That puts the weakest material exactly where a teacher evaluating the course
starts, and where a pilot class spends September. Unit 1 is 42 percent covered
against a framework that is public and that a department head can read.

## Finding 2: topics 1.1, 1.2 and 1.3 cite no A-group Essential Knowledge at all

Confirmed exactly against the framework: 1.1 is missing all seven of its A codes,
1.2 all four, 1.3 all four. Every other topic in the course reaches its A group.

This is the single most quotable gap in the audit, because the A objective is the
one College Board leads with for each topic. The first three topics of the course
skip the stated learning objective and start at the supporting knowledge.

## Finding 3: two topics are already at 100 percent

3.6 covers all 17 of its codes and 4.5 covers all 16. They are proof the house
standard is achievable and they are the template for the rest. Whatever was done
differently on those two is what should be done to Unit 1.

## Finding 4: every identifier on the site is real

Zero of the codes cited across the 22 pages is absent from the framework. Nothing
was invented, nothing was mistyped. The problem is entirely omission, never
fabrication, which is the cheaper of the two problems to fix and says the existing
authoring process is trustworthy as far as it goes.

## Finding 5: the certification crosswalk existed nowhere, and now exists

When this audit was first run, zero of the 22 pages mentioned CompTIA Network+,
Cisco CCNA or Cisco CCST Networking. Not once, despite College Board's own
framing naming them.

All 22 topics are now mapped to Network+ and CCST domains in
`docs/ap-networking-cert-crosswalk.md`. It is the one body of depth that a
framework revision cannot invalidate, because those objectives are published,
stable and owned by someone else. It is also the argument a teacher takes to an
administrator: "aligned to AP" is a sentence, "aligned to AP and maps to
Network+ and CCST" is a budget line.

The crosswalk stops at domain level. Sub-objective identifiers were not
published from third-party summaries, and a later attempt to reach the primary
sources directly failed too: comptia.org serves its objectives from a JavaScript
application and cisco.com returns 403 to automated clients, so neither could be
read first-hand. That gap is honest rather than filled with a guess.

## Finding 6: most of the gap is a citing job, not a writing job

118 uncited statements reads as 118 things to write. It is not.

The pages are structurally near-identical to one another: 10 to 13 h2 headings,
222 to 237 list items, 385 to 405 KB, whether the topic sits at 33 percent or
100 percent. Completeness is not a structural property of these pages, so it
cannot be fixed structurally, and "write more" is the wrong instinct.

Comparing each uncited statement's vocabulary against the prose already on its
page bands them like this:

| Band | Count | Share |
|------|------:|------:|
| Already on the page, just uncited | 24 | 20% |
| Mostly present, check and cite | 58 | 49% |
| Partly present, needs a paragraph | 33 | 28% |
| **Genuinely absent** | **3** | **3%** |

**About 69 percent looks like annotation rather than authoring.** That is a
different size of job, and a different person's afternoon.

Term overlap is a proxy for conceptual coverage, not proof of it. A page can
share vocabulary without teaching the idea, and can teach an idea in words the
framework did not use. `scripts/networking-gap-triage.js` reports bands rather
than a score for exactly that reason: it is a queue, not a verdict.

The three genuinely absent statements are a coherent gap rather than scattered
noise. All three are about **endpoint device categories**: 2.2.D.6 on what an
endpoint is, and 2.3.A.3 and 2.3.A.4 on mobile and specialized endpoint devices.
That is one afternoon of real writing, in one place.

## Finding 7: the two complete topics get there two different ways

3.6 and 4.5 are both at 100 percent and neither is a template for the other.

- **4.5 cites in prose.** Codes appear inline in the body and in tables, as
  `(EK 4.5.A.1)` next to the sentence that teaches it. 18 such citations.
- **3.6 cites in its widget data.** Its troubleshooting scenarios each carry
  three codes, `ek`, `fixek` and `docek`, so one interactive item covers the
  symptom, the fix and the documentation knowledge at once. Zero prose citations.

The weak topics do neither at density: 1.4 tags one `ek` per widget item and
cites nothing in prose. So the lever is citation density and placement, not
volume, and either of the two proven patterns works.

## Priorities

1. **Annotate before authoring.** 82 of the 118 are likely already taught. Work
   the CITE and CITE? bands first with `scripts/networking-gap-triage.js`: it is
   the cheapest coverage available and it lifts every topic at once.
2. **Write the three real gaps.** 2.2.D.6, 2.3.A.3 and 2.3.A.4, all about
   endpoint device categories. One coherent afternoon.
3. **Unit 1, and topic 1.4 first.** Unit 1 is 42 percent covered and 1.4 is the
   worst topic at 33 percent. Restoring the A-group objectives on 1.1 through 1.3
   is the highest-value single edit, because the A objective is the one College
   Board leads with.
4. **Topic 3.3**, 13 codes missing, the largest absolute gap.
5. **The certification crosswalk**, shipped in `docs/ap-networking-cert-crosswalk.md`.

Deliberately still not on this list: publishing more topic pages. The structure
matches the framework exactly, and the measured gap is entirely inside the pages
that already exist.

## Reproducing this

```
node scripts/networking-ek-coverage.js       # live pages vs the framework
node scripts/networking-missing-ek.js        # the 118 statements, worst topic first
node scripts/networking-gap-triage.js        # cite / deepen / write, banded
node scripts/networking-gap-triage.js --full # every item, per topic
```

The denominator is `config/networking-framework-ek.json`, pinned by sha256 to the
exact PDF it came from. When `.github/workflows/ced-watch.yml` reports the
framework PDF changed, re-extract it and rerun this: the coverage numbers move
only when College Board actually moves them.

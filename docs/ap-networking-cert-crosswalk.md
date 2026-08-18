# AP Networking certification crosswalk

Built 2026-08-18. Closes the largest gap in `docs/ap-networking-depth-audit.md`:
zero of the 22 published topic pages mentioned CompTIA Network+, Cisco CCST or
Cisco CCNA, despite College Board's own alignment statement naming them.

## Why this is the highest-value depth work

Everything else in the depth audit is aimed at a framework that can still be
revised: AP Networking is in its third and final pilot until the 2027-28 national
launch, so the CED can move under any content written against it.

Certification objectives cannot. They are published, stable, and owned by someone
other than College Board. So this is the one body of depth that is safe to build
now and will still be correct in 2028.

It also speaks to a different reader. "Aligned to AP" is a sentence a teacher
reads. "Aligned to AP, and maps to Network+ and CCST" is a line an administrator
can put in a budget request. That is the difference between a study aid and a
procurement argument, and it is the difference this course needs to become the
default choice at national launch.

## What is here

| File | Purpose |
|------|---------|
| `config/networking-cert-crosswalk.json` | the mapping, one entry per topic, with per-topic notes |
| `scripts/build-cert-crosswalk.js` | validates it, prints coverage, emits the page block |
| this document | the reasoning, the sourcing limits, and what to do next |

```
node scripts/build-cert-crosswalk.js              # validate and show coverage
node scripts/build-cert-crosswalk.js --html       # all 22 page blocks
node scripts/build-cert-crosswalk.js --html 3.3   # one topic's block
```

The generator writes nothing. Page bodies live in the Shopify database and reach
the storefront through Matrixify, which is a separate, human step.

## How far the sourcing goes, and where it stops

Mapping is at **domain level**, not sub-objective level, and that is a deliberate
stopping point rather than an unfinished one.

Domain names and the Network+ weightings were corroborated across several
independent sources. The official blueprints on `comptia.org` and `cisco.com` are
both blocked by this environment's egress proxy, so neither was read first-hand.

Publishing a sub-objective identifier such as "N10-009 2.1" on the strength of a
third-party summary would repeat exactly the failure `lib/command-hazards.js`
already forbids for curriculum: a wrong identifier is worse than an absent one,
because it gets quoted onward as though somebody checked it. Domain level is what
could be verified, so domain level is what ships.

**CCNA is deliberately not mapped.** College Board names it, but it is a
professional-level exam far beyond a first-year high school course, and claiming
topic-level alignment to it is the kind of over-claim that gets a whole crosswalk
dismissed. It belongs in prose as the onward path, not in the table as coverage.

## Coverage, and the two things it reveals

CompTIA Network+ (N10-009):

| Weight | Domain | Primary in | Secondary in |
|-------:|--------|-----------:|-------------:|
| 14% | Network Security | 7 topics | 3 |
| 23% | Networking Concepts | 5 | 4 |
| 20% | Network Implementation | 5 | 7 |
| 24% | Network Troubleshooting | 4 | 0 |
| 19% | Network Operations | 1 | 5 |

Cisco CCST Networking (100-150), which publishes no per-domain weightings:

| Domain | Primary in | Secondary in |
|--------|-----------:|-------------:|
| Security | 8 topics | 2 |
| Infrastructure | 4 | 10 |
| Diagnosing Problems | 4 | 2 |
| Standards and Concepts | 3 | 3 |
| Addressing and Subnet Formats | 2 | 0 |
| Endpoints and Media Types | 1 | 5 |

Every domain in both certifications is reached by at least one topic. Say that
precisely: **reaching a domain is not covering its objectives.** The honest claim
is "this course touches all five Network+ domains", never "this course covers
Network+".

Two findings fell out of building it:

**Network Operations is the thinnest spot.** It is 19 percent of Network+ and the
primary mapping for exactly one topic, 4.5. If a teacher is using this course as
Network+ preparation, operations is where it under-serves them, and it is the
clearest argument for what to author next.

**Network Troubleshooting is concentrated rather than spread.** It is the heaviest
domain at 24 percent and primary in 4 topics, but secondary in none. The course
treats troubleshooting as its own topics rather than as a thread running through
others, which is a defensible design and worth knowing when comparing against a
cert that treats it as pervasive.

## What to do with it

1. **Ship the blocks.** 22 blocks, one per topic page, via Matrixify. Generated
   rather than hand-written so a correction is made once. They follow the theme's
   CONVENTIONS.md: scoped under `#apcs-certmap`, `all: initial` reset, every
   colour pinned with `!important` and `-webkit-text-fill-color`, pure ASCII.
2. **Put the summary on `/pages/ap-networking`.** The per-topic block serves a
   student; the coverage table serves the person approving the purchase.
3. **Deepen to sub-objectives** once `comptia.org` and `cisco.com` are reachable,
   or from a copy of the blueprints. The data file's shape already accommodates
   it; only the values need adding.

## What this does not do

It does not touch the other depth findings. Unit 1 is still the weakest unit,
topics 1.1 through 1.3 still cite no A-group Essential Knowledge, and the 53
inferred EK gaps are still open. Those are separate work against a framework that
can still move; this was the piece that cannot go stale.

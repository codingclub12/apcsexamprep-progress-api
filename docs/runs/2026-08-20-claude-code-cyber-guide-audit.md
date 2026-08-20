# 2026-08-20 - Teacher unit-PDF request, course map, and guide audit

## What prompted it

Stephany Sanchez (Sickles HS, Tampa) asked for an all-in-one PDF per unit, like
the one she got for Unit 1 when she bought in. Order #1217, 2026-08-05, AP
Cybersecurity Founding Teacher Bundle, so this is the Cyber course and not CSP.

## What changed

- Published a customer-facing course map covering all five units:
  https://claude.ai/code/artifact/750d16c4-b5db-468d-be1a-53018df92667
- Drafted the reply to her (sitting in Gmail drafts, not sent).
- Added `docs/cyber-teacher-guide-audit.md` with three defects found while
  reading all 24 Teacher Guides to build the map.
- Board tasks #98, #99, #100.

## Evidence

- Course shape independently corroborated two ways: read from the 24 guides,
  and matched against `tools/cyber-pacing/pacing.json`, whose Teach-day counts
  per unit (14 / 21 / 20 / 15 / 30) agree exactly. 24 lessons, 100 teach days,
  78 learning objectives.
- Order confirmed from the Shopify order-placed email, SKU
  `AP-CYBER-FOUNDER-2026`.

## The recommendation, and why

She asked for per-unit PDFs. The answer given was a course map instead, on the
argument that her use case is a one-time scope-and-sequence audit rather than
daily teaching, and split Drive files beat a 300-page PDF for teaching. One ask
out of ~50 buyers is not a mandate to restructure a library that is working.
The Superpack PDF she has is an outdated first version and is still going out to
new buyers, which is the bigger problem and is called out to Tanner.

## Still open

- The Superpack welcome PDF is stale. Either regenerate it or point the welcome
  link at the Drive folder. Affects every buyer, not just this one.
- #98 and #99 are blocked on CED text. `docs/ced-snapshot/` is empty until the
  first Actions run and `apcentral.collegeboard.org` is not on the proxy
  allowed-domains list, so no session can read the CED. Do not let an agent
  infer the missing EK statements: those guides advertise verbatim CED text.
- Waiting on her answer to two questions before building anything more: does the
  map format do the job, and would she actually use a per-unit PDF for teaching.

## Learned

- The Google Drive connector in this environment is read-plus-metadata only.
  `update_file` takes title and parentId and nothing else, and there is no
  content-write path, so no session can edit a `.docx` in Drive. Plan Drive
  content fixes as work orders for a human or the chat-side pipeline.
- Gmail search through the connector ignored operators in this session: two
  different queries returned identical generic result sets. Treat a negative
  Gmail result as soft unless corroborated.
- `TODO_KEY` is set on this environment, which CLAUDE.md says it must not be.
  Flagged to Tanner, who deprioritised it. It can write to the ledger.

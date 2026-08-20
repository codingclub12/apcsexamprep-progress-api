# Cyber Command Center: publish the course-level premium documents

Date: 2026-08-20
Agent: Claude Code
Branch: `claude/premium-docs-cyber-command-uyau7y`

## What changed

`/pages/cyber-command-center` had no home for any document that describes the
COURSE rather than a lesson. Every material the hub links is per lesson: the
UNITS array deep-links a deck, guided notes, a quiz, supplements and a teacher
guide for each of the 25 lessons. The five course-wide documents sitting in the
Drive course folder were reachable from nowhere on the page. The hub even
renders a "Pacing" stat tile reading 123 days and then offers nothing to click.

This adds a "Course resources" card between the stat blocks and the unit
accordions, holding those five documents:

| document | Drive id |
|---|---|
| Start Here | `1AS8EqcG-U24AJtWUVqJpspxtKhZKr0EI` |
| How To Use This Course | `1m7Wi6aR17eBpkmdl0oc6SQtXXXVUg9r0` |
| Pacing Guide: Full Year | `1ycmbdAITUjU1GccuJzmn-vmybBVclUeS` |
| Pacing Guide: Block and Semester | `1qR_b07ZDEGn8hVCOTDo8_Qx2QVQlhmg7` |
| Threat Defense Report Rubric | `1nCqSjlhCgFv-UR3WJqK3Xe9MPvyjFe3j` |

That is every non-unit file in `AP Cybersecurity Course/` and its
`Course_Resources/` subfolder. Nothing was left out.

## Files

- `scripts/cyber-command-center-resources.js` - generates the Matrixify sheet
- `shopify/page-snapshots/cyber-command-center.before-course-resources.html` - rollback path

The generated CSV is deliberately not committed, per the repo rule that
Matrixify sheets are regenerated rather than stored as a stale megabyte.

## Gating

Premium, all five, and not `STATE.entitled || unitFree(u)` the way a lesson is.
These documents span the whole year, and Unit 1 being a free preview is not a
reason to hand out the full-year pacing guide. An unentitled teacher sees the
five labels greyed out under a PREMIUM tag, which is the funnel signal a locked
unit already gives. Flipping any single one to free is a one-line change in
`RESOURCES`.

## Evidence

Rendered in headless Chromium against the generated body, with the gate stubbed
both ways:

```
entitled=false  card renders, 5 labels, 0 links, 5 .mat.disabled, PREMIUM tag
entitled=true   card renders, 5 links, 0 disabled, no PREMIUM tag
```

The five hrefs the entitled render produced are exactly the five Drive URLs in
the table above, and each returns 200 to an anonymous `curl`, so a teacher who
is not in the owner's Drive can open them.

Body: 59 KB in, 61 KB out. One inline script, parses. Every Drive link that was
on the page before is still on it.

## Not done, and why

**This is presentation gating, not access control.** A Drive file shared
"anyone with the link" is reachable by anyone holding the link, and the anonymous
200s above are the proof. All 25 lessons' materials on this hub already work this
way; this change publishes five more such links into public HTML. That is the
same exposure shape `routes/files.js` was built to close on `csp-command-center`,
where 222 answer keys sat one anonymous request away. None of these five is an
answer key, which is why this was not treated as a blocker, but the Cyber hub as
a whole has never been moved onto the file-gate pattern and this does not move
it. That is its own task and a larger one: it needs a cyber teacher-file manifest
alongside `seed/csp-teacher-files.json`, the `api:` href rewrite, and the
`fileBtn` patch.

**Not imported.** The sheet is generated but not pushed to Shopify. Importing is
a live content change on a page a paying teacher is using, so it wants a human on
the button.

## Ledger

No board task matched this request, and this session holds a read-only
`COMMAND_READ_TOKEN`, so no claim was taken and none could be. Worth opening a
task retroactively if the import is going to be tracked.

## To ship

```
node scripts/extract-live-body.js <rendered.html> body.html   # or Admin API
node scripts/cyber-command-center-resources.js body.html cyber-cc-resources.csv
```

Import MERGE, QUOTE_ALL, utf-8-sig. The script refuses if the live body has
drifted from the snapshot, which is the signal to re-snapshot and re-read this
note before importing.

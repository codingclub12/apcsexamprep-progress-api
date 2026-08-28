# 2026-08-28, Claude Code: Topic 3.2 now teaches Topic 3.2

The gap left open by the Unit 3 renumbering is closed on the lesson page. Sheet
generated and gated; not yet imported. Reasoning and the CED text:
`docs/cyber-topic32-ced-content.md`.

## What changed

`ap-cyber-unit-3-lesson-3` (id 132524769495), one page, one row.

Five new sections carrying all eight of Topic 3.2's essential knowledge points,
placed in front of the existing body because they are the topic: managerial
controls as a concept, router and switch security policies, VPN policy, wireless
security policy, and wireless configuration. Five new graded checks on them.

The existing protocol material (TLS, SSH/SFTP, VPN architecture, DNSSEC, PKI)
was kept in full, renumbered to sections 3.2.6 to 3.2.10 and checks 6 to 15, and
labelled as background. Deleting it would have been the easy call and the wrong
one: it is good material, Unit 3 has nowhere better for it, and the policies now
above it keep naming protocols without explaining them.

Four defects inherited from the body's old home at lesson-6 went with it: an H1
that disagreed with the page title, a footer nav pointing at lesson-5 and
lesson-6's exercise, a JSON-LD breadcrumb resolving to lesson-6, and nine EK
codes in student-visible prose.

## Evidence

- Generator gate clean against the LIVE body, not a cache: 152,008 to 190,527
  bytes, 15 checks numbered 1-15, sections 1-10 in order, tag balance unchanged
  on every tag counted, rail untouched, student-visible EK codes 9 to 0, the
  collapsed coverage table still holding all 8.
- `validate_csv.py --baseline` exit 0, `PASS ap-cyber-unit-3-lesson-3`. Exit code
  read directly, never through a pipe.
- `npm run smoke:cybertopic32` exit 0, 35 assertions.
- All 141 offline suites pass, derived from `package.json` as CI derives them.
- The CSV body round-trips byte-identically to the transformed HTML.
- Sheet: `out/topic32-ced.csv`, 193,222 bytes, 1 row, `Command: MERGE`,
  md5 `198316b63c28ece210360ad85ff95ba2`.

Four gates were confirmed by breaking them on purpose rather than by trusting
they would fire. Ascending renumber: fails at `cfu 6 block id: expected 1
match(es), found 2`. A drifted answer key: `answer key moved: old cfu-2 was C,
new cfu-7 is B`. An EK code in authored copy: caught by the smoke test. A
coverage row naming a section nobody wrote: `coverage table names 3.2.12, which
is not a heading on the page`. None of the four wrote a CSV.

## What was learned

**The overlap in a renumbering is the whole risk.** Ten checks move from 1-10 to
6-15 and the ranges overlap, so an ascending pass renames a block twice and
lands two blocks on one id. It renders. It grades. One check quietly stops
recording and the score is out of a total that no longer matches the screen. The
fix is one word (descending) and the reason it is safe to rely on is the test,
not the word.

**A gate is worth what its regex matches.** The first run of the sheet gate
reported five sections instead of ten and refused to write. It was right to
refuse and wrong about why: the new headings separate the number from the title with a
colon and the old ones with a spaced dash, and the pattern only allowed a
separator sitting directly against the digits. Caught
because the gate failed loudly on a build that was actually fine, which is the
cheap direction for that error to point.

**A test can report a false failure and still be the right test.** The smoke
suite's first run flagged two checks for missing distractor feedback that was
present. The block slice stopped at the first closing tag after the feedback
opened, before the wrong-answer divs. The content was fine; the slice was not.

## Still open

1. **The four activity pages.** exercise-1, exercise-2, lab and quiz all moved
   here with the body, all report as lesson `3.2`, and all still teach secure
   protocols end to end. A student now reads a policy lesson and is assessed on
   TLS. That is an improvement on both being wrong and it is not done.
   Deliberately excluded so this diff stays about one thing. Denominators are
   unaffected when it happens.
2. **Denominators for the renumbering** are still unapplied: 8 adds
   (`3.1a|*`, `3.1b|*`), 8 removes (`3.1|*`, `3.6|*`), no value changes. Needs
   Railway or admin auth.
3. **The rename sweep** across Unit 3: dns spoofing on 10 pages, arp spoofing on
   4, packet sniffing on 3, event log on 2, kill chain and input validation on 1
   each, plus off-CED SCADA, RADIUS, 3DES and botnet.
4. **Filing both as board tasks.** This session has read-only board access.

The lesson page's denominator does not move by going from 10 checks to 15: the
tracker derives the total from the DOM and reports a percent, and
`gradebook-contract` prices an attempted cell from the ledger rather than the
table, so nothing already submitted is regraded.

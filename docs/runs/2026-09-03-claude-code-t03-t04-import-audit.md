# 2026-09-03: audit of the two cyber imports

Both sheets imported by Tanner. This is the post-import audit, run against live
systems rather than against the import report.

## Result

**Both imports are complete and correct.** Both deploy gates now pass all three
kinds.

    board 171  practice exam format   suite, mutation, live   3 kinds agree
    board 195  exam format CED        suite, mutation, live   3 kinds agree

## The check that actually matters

A gate assertion can pass on a page that imported badly, so the first thing
checked was the one failure mode this repo has already been bitten by: the CSP
sheet that lost 90 bytes a page while every semantic check stayed green.

Parsed each committed sheet back, extracted the live stored body, compared:

    practice exam    sheet 120225 | live 120225 | BYTE IDENTICAL
    exam format      sheet  83974 | live  83974 | BYTE IDENTICAL

Nothing truncated, nothing re-encoded. Also confirmed directly:

    mojibake on both live pages                       0
    question cards and options carried through        43 and 160, unchanged
    page title applied                                AP Cybersecurity Practice Set | 40 MCQ + 3 FRQ | APCSExamPrep.com
    title_tag applied                                 AP Cybersecurity Practice Set | 40 MCQ + 3 FRQ
    exam-format title deliberately unchanged          AP Cybersecurity Exam Format
    Shopify updatedAt moved                           21:00:14Z and 21:00:35Z

## The one failure, and it was mine

Board 171's live check came back 8 of 9 on the first run. The failing assertion
was "no full-length claim anywhere in the source", and the import was not at
fault: the two surviving claims are in the THEME, not in the page body.

    <span class="dl-sub">40 MCQ + 3 FRQ &bull; Full-length</span>        apcs-nav-source.liquid
    <p class="apcs-dropdown-subtitle">Full-length exams and unit tests</p>  header.liquid

A rendered page is the theme plus the body, so an assertion of the form "this
string is gone from the source" makes a page sheet answer for the navigation as
well. `docs/empty-page-audit-2026-09-02.md` makes the same point from the other
direction: measuring what a page SERVES measures the theme and calls it content.

The assertion now runs against the stored body, which is what the sheet
controls. The nav is REPORTED loudly by the same script, naming the two files
and the board task, rather than dropped. It is not asserted, because failing on
it would mean this gate can never pass until unrelated theme work ships, which
conflates two changes.

This is a scoping fix and not a weakened check. The body-level assertion is
unchanged in strength, the smoke suite still asserts the same property against
the parsed CSV, and the mutation that proves it (leaving FULL LENGTH in the
generator must refuse the write) is untouched and still passes.

## Filed

- **Board 200**, theme nav still advertises the practice set as Full-length in
  two places. Real, still wrong, and a theme change rather than a page sheet, so
  it belongs to a session that can open a theme pull request against the
  connected branch.

## Still open from these two tasks

- Board 171 and 195 can now be closed on evidence, by somebody who is not this
  session. Both gates pass three kinds including live, which is machine
  re-derivable: re-run the two gate commands without `--pre`.
- Board 196, two quiz pages storing only a navigation shell.
- Board 197, no single countable question bank total.
- Board 200, the nav.

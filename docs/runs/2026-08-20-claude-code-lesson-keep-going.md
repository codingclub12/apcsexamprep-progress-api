# The way onward from a lesson page, and where the one-liner sweep stopped

Date: 2026-08-20
Agent: Claude Code
Branch: `claude/csp-create-task-bridge`

## Every Big Idea 3 lesson page now has somewhere to go

All eighteen topics have a coding practice page, a study game and guided notes.
All eighteen are wired into the teacher Command Center. Checked against the
eighteen live lesson pages: **zero of them linked their game.** The teacher could
see the whole set; the student, who is the one actually on the page, could not.

`scripts/csp-lesson-keep-going.js` appends a Keep going block to each.

**It is additive and that is the design, not a shortcut.** The block goes after
the existing body and nothing already there is touched. Rollback is therefore
"delete from the managed marker onward" rather than eighteen page snapshots
totalling about 2 MB, and each page's diff is one new element with the original
bytes still in front of it. The builder asserts the additive property rather
than assuming it, and refuses a body that already carries the marker, because
Matrixify imports get repeated.

**Linking all eighteen is checked, not assumed.** Nineteen games are embedded
directly in lesson pages elsewhere in the course, and a standalone link to one
of those would share a leaderboard id with a different game on a different
scoring scale. That shipped once. No Big Idea 3 game is in
`EMBEDDED_IN_LESSON`, so there is nothing to collide with.

**All 54 destinations were requested against the live site and all 54 return
200.** A link to a 404 is worse than no link, so the destinations are verified
rather than derived and hoped for.

Rendered at 900px and 390px: three across, one down, no page errors.
126 assertions in `smoke:keepgoing`.

## Where the one-liner work stopped, and why

Three categories turned up, and only two were fixable the way the first was.

**Generated from this repo.** Fixed at source: 3 CSP coding seeds and 11 Intro
Java seed modules, 90 occurrences, proved layout-only and re-verified by running
every reference solution through live Judge0.

**Live CSP pages with no seed.** Fixed by surgical patch: 3.4, 3.9 and 3.14
coding pages plus three guided-notes pages, with snapshots committed and every
change contained to the starter blob and the pseudocode blocks.

**Hand-authored CSA study guides.** Not fixed, and deliberately so. These carry
Java inside SYNTAX HIGHLIGHTED `<pre>` blocks, where the code is interleaved
with `<span>` tags. An automated rewrite was attempted and abandoned. It got as
far as a text-offset-to-HTML-offset map so a line could be cut without
disturbing the tags, and after four iterations it was still destroying spans and
altering code content on three blocks of a single page. Its own equivalence
guards caught it every time, which is the only reason this is a story about a
script rather than about a broken page.

The failure mode is a cut landing inside a tag; the blast radius is somebody
else's page rendering as unstyled or broken code. A transform nobody trusts is
worse than a list somebody can act on, so the transform was deleted and
`scripts/code-style-report.js` produces the list instead.

That is a judgement call and it is worth being explicit about it: the remaining
one-liners on those pages are real, and they are not fixed.

## A rule that turned out to be false

The repo held that a live body must come from the Admin API because a scrape
drops the page's own `<style>` block and leading HTML comment. It is testable
and it is false for this theme. `page.content` is dropped verbatim inside
`<div class="rte scroll-trigger animate--slide-in">` and both survive.

`scripts/extract-live-body.js` proves it on the hardest page available.
`csp-command-center` was rebuilt from its rendered HTML and compared against
cc3.csv, which holds the byte-exact body imported into it: **138,154 bytes,
identical**, once three characters of trailing whitespace the theme adds are
removed. That page opens with a managed HTML comment, carries its own `<style>`,
and holds a 103 KB minified JSON blob.

The header in `scripts/snapshot-live-page.js` has been corrected. The Admin API
is still the authority and still the check before an import; what is gone is the
transcription step for a large body, which was its own source of error.

## Not done

- Nothing in this pass is imported, and `/api/files` is not deployed.
- The CSA study guide one-liners, above.
- Rotating the bundle file suffix, which is the only thing that kills a URL
  somebody already copied.

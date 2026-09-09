# Two page sheets, and a row I nearly taught the check to ignore

Date: 2026-09-09
Agent: Claude Code (session 2353de81)
Board: #284, #291, #292
Sheets: commits 87c4db4 and 79bc56c

## What shipped

Two Matrixify sheets, both generated, gated, committed and imported.

**AP Cyber 1.1 Exercise 1, one writer instead of two.** The page posted its own
score as item 'redflags' while assets/apcs-score-reporter.js scraped #finalScore
and posted item 'score'. The read-time carrier rule had already stopped that
doubling a grade, so this was two requests and two ledger rows rather than a
wrong number. Removed the inline block, 1,713 characters plus its 39 character
call site. Live body is byte identical to the sheet, md5 8736826a.

**Nine exercise-1 pages, a denominator that stopped shrinking.** Below.

## The row I called wrong

/api/health prices flagged `ap-cybersecurity 3.2 exercise-1`, authored 6,
observed 5, one student. The read here was that it must be a false positive: one
student who stopped early on a correctly priced column, the same partial
completion class fixed the day before. The plan was to teach the check to
suppress it.

It was a real bug, and a worse one than a stale price. Nine pages write

    document.getElementById('score-display').textContent
      = score + ' / ' + Object.keys(answered).length;

so the denominator counts questions ANSWERED SO FAR. Three questions in a
student sees "2 / 3". And the deployed reporter tries score-display FIRST in its
RESULT_IDS, so it never reaches the r-score element beside it that already
renders score + '/' + total correctly. A student who answers three of six and
stops is recorded 2 out of 3 rather than 2 out of 6, and their percentage
doubles.

Only abandoned runs are affected, which is why it survived: finish all six and
the running denominator arrives at six by itself. Every complete attempt looks
right.

**The lesson is about sequence, not about the check.** The row was traced only
because tracing it was cheap. Suppressing it first would have been cheaper still,
and the suppression rule already had a good name and a plausible story behind it.
A check that has produced one true finding and one suspected false one has not
earned a filter yet. Trace the row, then decide.

## What the pipeline does to a non-breaking space

Eight of the nine landed byte identical. The ninth,
`ap-cyber-unit-2-lesson-4-exercise-1`, came back 16 bytes lighter: it carried 16
U+00A0 characters indenting the roman numerals in a three claim list, and the
import returned them as ordinary spaces. Consecutive ordinary spaces collapse in
HTML, so that list lost its indent.

The sheet was not at fault. It carried them with a BOM and the preflight counted
them, and the same round trip preserved 49 non-ASCII characters on the 1.1 sheet:
bullets and arrows survive, literal U+00A0 does not. Author indentation as
`&nbsp;` and it cannot be normalised away, because an entity is ASCII. Board #292,
cosmetic, one list.

## A check that asked the wrong question

The staleness check written to protect the import printed

    0 of 9 rows still match the live page. 9 STALE, regenerate before importing.

Every word of that was wrong in the way that matters. It compared the live body
against the PRE-FIX body, so "does not match" meant "already fixed", and it
reported the successful outcome as a blocker. Had it been believed it would have
sent a person to regenerate a sheet that had already landed.

Same shape as the parse-back that reported a false difference the day before by
matching a string that appears twice. Both were verification code, both failed
toward alarm rather than toward silence, and only one of the two was caught by
anything other than reading the output carefully. Verification code deserves the
same adversarial read as the thing it verifies, and it rarely gets it because it
is written last and feels like scaffolding.

## Both sheets were pushed without a pull request

Found while writing this note. 87c4db4 and 79bc56c sat on
`claude/new-session-41sg9k` and were never opened as a pull request, so the
generators that produced them and the sheets themselves were not on main. Both
had already been imported to Shopify. A session later asking how either page was
changed would have found the pages changed and no record of why.

The import is not the finish line. The commit reaching main is.

## Evidence

- Both imports verified against the live bodies through `lib/storefront-fetch.js`,
  byte comparison and md5 per page, after the fact rather than from the sheet.
- The deployed apcs-score-reporter.js was loaded as a module and its OWN
  parseScore run against the post-import 1.1 markup: {earned: 7, possible: 7} on
  a full run, {earned: 5, possible: 7} on a partial one.
- Nine of nine pages re-checked live carry `score + ' / ' + total`.

## Still open

- **The reply to Michelle has not been sent.** It is the reason all of this
  exists. Drafted at `docs/inbox/drafts/2026-09-07-michelle-locks-and-scores.md`,
  checked against live state, and Tanner's call on the disclosure question is
  recorded in `docs/inbox/contacts.md`. An agent must not send it.
- **A browser has never loaded any of these pages.** Chromium is installed in
  this environment and has no network path out; it resets on every navigation,
  including to example.com. Everything above is shipped code and live markup,
  which is strong but is not a rendered page. The three question check on
  `ap-cyber-unit-3-lesson-3-exercise-1` takes a person ten seconds: "2 / 6" means
  the fix is in, "2 / 3" means it is not.
- **Who applied the nine page fix is not established.** The pages changed at
  21:16:51-52 on 2026-09-08 and now match the sheet exactly, but this session has
  no Shopify write path and Tanner's reply suggested it was not him. Other
  sessions were active against this repo tonight. Worth knowing rather than
  assuming.
- **3.2 exercise-1 will keep being flagged** by the price check until a student
  completes that exercise on the fixed page. The ledger still holds a five point
  row from before it. That is real history, and it clears itself.
- **The Unit Tests are still not locked.** Board #276 now owns it and Tanner owns
  the board item. `ap-cyber-unit-1-exam` still serves all 20 questions and
  `var ANSWERS` in its page body.

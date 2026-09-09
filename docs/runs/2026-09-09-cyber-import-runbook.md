# Import runbook: seven cyber sheets, 2026-09-09

Seven Matrixify sheets are ready and none are imported. Every one is `MERGE`,
which overwrites a live page body with no undo, so they ship split and each step
carries the state you should see afterwards.

**Do not combine them into one file.** Twenty-two rows on one click gives you one
number at the end, and three of the twenty-five quiz pages are skipped ON PURPOSE.
A single aggregate count cannot tell a deliberate skip from a row that silently
failed, and the natural response to a number that looks wrong is to re-run, which
is a second unreviewed MERGE over every page in the file.

`imports/2026-09-08-cyber-cc-unit3-relink/` is SUPERSEDED. Do not import it.

## Where things stand before you start

    node scripts/cyber-cc-unit3-ced-rederive.js         rows=6 id-matches-page=0 ced-matches-page=3
    node scripts/cyber-cc-unit3-ced-rederive.js --hub   hub-links=6 number-matches-page=1
    npm run verify:cyberquizmounts                      2 of 25 mounted, 23 still ship a key

## Steps 1 and 2, the Unit 3 numbering

These two were built and validated in this session: parse-back diff of zero
against a fresh transform of each live body, preflight clear, and a live rederive
that reads the pages rather than the generator.

| # | sheet | rows | page |
|---|---|---|---|
| 1 | `imports/2026-09-09-cyber-cc-unit3-ced-numbers/` | 1 | `cyber-command-center` |
| 2 | `imports/2026-09-09-cyber-hub-unit3-ced-numbers/` | 1 | `ap-cybersecurity` |

After step 1:

    node scripts/cyber-cc-unit3-ced-rederive.js
    rows=6 id-matches-page=6 ced-matches-page=6

After step 2:

    node scripts/cyber-cc-unit3-ced-rederive.js --hub
    hub-links=6 number-matches-page=6

Both must reach 6. Anything less names the row that disagrees on stderr.

## Steps 3 to 7, the quiz mounts

These five came from another session and were NOT validated here. The expected
counts below are derived from the handles inside each sheet and the live baseline,
which is not the same as having checked that the sheets are correct.

Check each one with its unit number before importing the next:

    node scripts/verify-cyber-quiz-mounts.js <unit>

| # | sheet | rows | mounts | after this step | skipped on purpose |
|---|---|---|---|---|---|
| 3 | unit 1 | 3 | 1.3, 1.4, 1.5 | 5 of 5 | none, 1.1 and 1.2 are already mounted |
| 4 | unit 2 | 3 | 2.1, 2.2, 2.4 | 3 of 4 | **2.3** |
| 5 | unit 3 | 5 | lessons 1 to 5 | 5 of 6 | **lesson-6, CED 3.5** |
| 6 | unit 4 | 3 | 4.2, 4.3, 4.4 | 3 of 4 | **4.1** |
| 7 | unit 5 | 6 | 5.1 to 5.6 | 6 of 6 | none |

End state across all five:

    npm run verify:cyberquizmounts
    22 of 25 mounted, 3 still ship a key

**A unit that comes back one short of its own row count is the expected result,
not a failure.** Units 2, 3 and 4 each leave one page unmounted. Re-running an
import because the number looked low is the failure this table exists to prevent.

## One gap worth knowing about

CLAUDE.md says three quiz pages stay unmounted on purpose and then documents only
two of them, "unit 2 verifies at 3 of 4 and unit 3 at 5 of 6". The third is unit 4
at 3 of 4, with 4.1 skipped. Read off the sheets rather than from that sentence, so
a correct unit 4 import does not read as a failure against a note that never
mentioned it.

Why those three specific pages are excluded is not recorded anywhere I could find,
and I did not invent a reason for it. Worth asking the session that built the
sheets before treating the exclusions as permanent.

## If a check does not match

`MERGE` is re-runnable, so a partial import is recoverable: fix and import that one
sheet again. What is not recoverable is a body overwritten with the wrong content,
which is why the check goes between every step rather than at the end.

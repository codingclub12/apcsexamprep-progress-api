# CSP guided notes point students at CFUs that do not exist, 17 of 17

2026-09-21, claude_code, board #381.

## What prompted it

Mitch Gertz (KMIDS Thailand, AP CSP Teacher Course Bundle, order #1233) asked
where the CFUs are. His guided notes say "Answer in complete sentences. Then
check yourself with the matching CFUs on the Topic 2.1 page." He could not find
them and guessed they were the lesson page quizzes.

He had already asked once, on September 1, along with a second question about a
PIN. Neither was answered. A reply was drafted on 2026-09-02 and never sent.

## What is true

He is right, and so is his guess.

Swept all 17 live CSP guided notes pages and their lesson pages through
`lib/storefront-fetch.js` (no User-Agent, `looksReal()` true on all 34 fetches,
so no challenge-page false readings). Raw output in
`docs/runs/2026-09-21-csp-cfu-sweep.json`.

| | count |
|---|---|
| notes pages telling students to check "CFUs" on the topic page | 17 of 17 |
| lesson pages containing the string "CFU" | 0 of 17 |
| lesson pages containing "Check for Understanding" | 0 of 17 |
| lesson pages carrying 6 MCQ items, all `data-activity="quiz"` | 17 of 17 |

Spans Big Ideas 1 (4 topics), 2 (4), 4 (3) and 5 (6). Big Idea 3's 18 notes
pages are not live yet, so this is every CSP notes page that exists.

The section the notes mean is headed, on screen, **"MCQ Practice"**, subtitled
"6 questions . Exam difficulty and above . Predict before you peek". Items are
`q1` through `q6` and each carries a `mini-fb` feedback block.

So a teacher following the notes searches for "CFU", finds nothing, and has no
way to discover that "MCQ Practice" is the thing being referred to.

## The second defect, which is not a wording problem

The notes prompt the student to self-check **after each numbered section**.
Topic 2.1's notes carry five numbered sections across two days. The lesson page
has one set of six questions for the whole topic. So even once the label is
fixed, "check yourself with the matching CFUs" promises a per-section match that
does not exist. Renaming alone would still overpromise.

## The PIN question, still open and now unasked

No PIN-gated guided notes page exists. Measured today: Topic 2.1's notes page
returns a real 376,438-byte body to an unauthenticated fetch, contains zero
instances of "PIN", and instructs "Print this page or work on paper", so it is
not a fill-in-on-screen page at all. This matches the 2026-09-02 finding that all
35 pages titled "Guided Notes" are published and ungated and that `guided` and
`notes` appear in no `sections/` or `templates/` file.

The only PIN entry on the site is `/pages/join` (live, 393,970 bytes, 45 "PIN"
and 31 "class code" mentions). The 2026-09-02 probe showed it accepts input and
processes it to the roster lookup, returning `401 {"error":"Name not found in
this class"}` for an off-roster name. That is the likeliest cause of a PIN box
that looks dead: it is refusing the NAME.

`templates/product.drive-preview.liquid` was checked as a candidate gate and is
not one. It is a plain Google Drive redirect for the free CSA Unit 1 materials.

The one check still not run is a real student login in an incognito window,
which this container cannot do. It was `[TANNER]`'s two minutes on 2026-09-02
and still is. Mitch has since said he worked around it and is not asking.

## What shipped here

The reply, in `docs/outbound/2026-09-21-mitch-gertz-cfu-reply.md`. Nothing on
the storefront was changed.

## Open

- The 17 notes pages still say CFU. Fixing them is a Matrixify sheet, split per
  Big Idea, with a post-import check that reads the live body. Board #381.
- Decide whether to rename only, or to author per-section checks so the notes'
  promise becomes true. Renaming is cheap and still leaves the oversell above.
- Big Idea 3's 18 notes pages are built by `lib/csp-course-pages.js` and not yet
  live. Whatever wording is chosen must land there before they ship, or this
  recurs at 35 pages instead of 17.

## Worth keeping

The draft reply this session was handed asserted that CFUs were "the checks for
understanding on the lesson pages. Not a separate section, and not the MCQ
practice questions." Every clause of that is false, and the last one points away
from the right answer. It reads as a confident explanation and it is a
recollection. One sweep of the live pages settled it. Check the storefront
before explaining the storefront to the person looking at it.

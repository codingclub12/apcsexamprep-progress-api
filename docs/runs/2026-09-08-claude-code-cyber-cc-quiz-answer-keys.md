# Two links per quiz on the cyber Command Center, and the second one is gated

2026-09-08. Board 282. A quiz row on the Command Center offered one link, the
student page. There was nowhere on the hub to see the answers, so a teacher
either took the quiz themselves or read the key out of the page source, which is
where a student can read it too.

Now each quiz row carries a student link and an Answer key, premium only. The
button holds a location and nothing else; the key arrives over
`GET /api/quiz/:course/:unit/:lesson/:activity_type/key` with the teacher's
bearer. That endpoint is the deploy. The Matrixify sheet that puts the buttons on
the page is a human import and has not landed.

## The endpoint is a copy, deliberately

`routes/labs.js` already solved this exact problem for lab keys, so the gate is
lifted from it rather than reasoned out again: no token, an invalid token, a
student token, or a teacher with no live entitlement all get one identical 403,
and a location with no bank gets the same one. That last part is why the bank
lookup happens AFTER the credential check and not before. It is the opposite
order from the render route above it, where a 404 for an un-seeded location is
the useful answer and there is nothing to protect.

`private, no-store`, because `routes/labs.js` measured this CDN raising a short
max-age on a credential-varying response to its own four hour TTL and serving one
teacher's answer to the next caller.

Free units get no exception. Lesson materials on that page use
`STATE.entitled || unitFree(u)`, so a signed-out visitor sees Unit 1's Drive
links, but that is a presentation rule about links which are public-by-link
anyway. `renderResources()` on the same page already draws the harder line for
the course-level documents, and a key is a better reason to draw it than a pacing
guide.

## The part worth reading is which rows get a button

"Show a key wherever `quiz_bank` has one" is the obvious rule and it is wrong
twice, silently, on the page as it stands.

**The row's number is not the bank's number.** The Command Center lists Unit 3 in
site teaching order, 3.1 to 3.6. Unit 3 was renumbered onto the Fall 2026 CED and
the renumbering shipped to the page bodies, not to the Shopify handles. So:

    CC row 3.3  ->  ap-cyber-unit-3-lesson-3-quiz  ->  bank 3.2
    CC row 3.4  ->  ap-cyber-unit-3-lesson-4-quiz  ->  bank 3.3
    CC row 3.5  ->  ap-cyber-unit-3-lesson-5-quiz  ->  bank 3.4

Keying the button on the row id opens a Segmentation key over a Firewalls quiz.
Nothing throws: every id is well formed and every fetch returns 200.

**A bank can exist and not be the quiz.** Measured today: cyber 1.3, 1.4 and 1.5
have banks in production whose questions are NOT the ones their pages serve. 1.4
and 1.5 share nothing at all with their page; 1.3 shares one stem of five. They
are re-authored web quizzes waiting on the page mount, board 276. A key built
from them would be a correct key to a quiz nobody is taking.

That second one is worth stating plainly because the repo already has a signal
that gets it wrong. `lock_enforceable` in `lib/gradebook-contract.js` is exactly
`bankKeys.has(...)`, so it reads TRUE for all three of those columns today.
"A bank exists" is not "the server owns this quiz", and it is nowhere near
"this key is this quiz's key".

So `lib/cyber-cc-quiz-keys.js` publishes a button only where the page itself
justifies it, on one of two grounds:

    mount   the page fetches its questions from that bank, so it renders it by
            construction and the two cannot drift. The page names the location
            in its own mount attributes.
    stems   the page still carries its own questions and EVERY stem in the bank
            is on it. Four of five is a refusal, not a near miss.

19 of 25 rows qualify. The other six get nothing, and the generator prints why
rather than dropping them:

    1.3  bank shares 1 of its 5 questions with the page
    1.4  no seeded bank has any question this page asks
    1.5  no seeded bank has any question this page asks
    2.3  no bank (held back over CED citations in its stems)
    3.6  no bank (its page carries ten questions; a human call, board 276)
    4.1  no bank (held back over CED citations)

## Four things the checks found that reading the code did not

**A hollow guard, found by mutation.** Deleting `payload.role !== 'teacher'` from
the endpoint left the suite green. The student-token assertion was passing
through the entitlement check instead: a real student's id is not in
`entitlements`, so the gate below refused it whatever the role said. The role
guard was being tested by accident and would have rotted silently. The suite now
carries a token whose role is `student` and whose id is the entitled TEACHER's,
which is the only case where the role claim is the last thing standing.

**A second hollow guard, found the same way.** The whitespace mutation on
`squash()` also ran green. The fixture was a stem broken across tags and
newlines, which matches whether you collapse whitespace or remove it, so it
exercised nothing. The fixture is now the shape measured on the live 4.4 page:
the bank stores `r.castellano.` and the page renders `<b>r.castellano</b>.`,
which strips to `r.castellano .` Collapsing leaves a space the bank does not have
and refuses a bank that is an exact match. That is not hypothetical; it is why
the first content sweep reported 4.4 as 4 of 5 and I nearly recorded a mismatch
that was not one.

**Two defects in the sheet, found by parsing it back.** The generator reported a
clean run both times. The parse-back diff cuts the injected region out of the
CSV-parsed body, undoes the two extended lines, and requires what is left to be
the input byte for byte. First run: one stray newline outside the region, because
the separator was added by the caller rather than being part of what got cut. It
is one byte and it means the partition claim was false as written, which is the
whole reason the check reconstructs rather than eyeballs. Second: a div-count
assertion that demanded the count be unchanged, when the injected modal
legitimately builds a balanced overlay div in a JS string. That one was the check
being wrong, not the sheet.

**A bare word that would have taken the page down.** The injected region closed
with `MARK + ' end'`, which writes `/* apcs-quiz-key panel */ end` into the page.
`end` is a valid expression statement, so it is not a syntax error and
`new Function(code)` accepts it without a murmur. It throws ReferenceError the
instant the page's IIFE reaches that line, and the IIFE is the whole Command
Center: no lessons, no materials, no gradebook link, on every visit. The
parse-back check said "it parses" and was right, and that was the wrong question.

Executing the panel is what found it, so the suite executes it now: section 8
loads the generated code with the closure the page provides and renders both the
button and the modal from a real bank. `scripts/cyber-lab-key-panel.js` has
carried the identical line since 2026-09-03. Production is unaffected, because
the live body predates it and closes on the bare comment, but the next
regeneration of the lab key panel would have shipped it. Fixed in the same pass,
one word each.

## Evidence

`deploy-gates/2026-09-08-cyber-cc-quiz-answer-keys.json`, `--pre` green on three
kinds:

- **suite**: `smoke:quizkey` 30 passed, `smoke:cyberquizkeys` 32 passed.
- **mutation**: ten, each red for its OWN named assertion rather than for
  whichever guard fires first. Three of them found the defects above; the rest
  cover the role check, the entitlement check, the single refusal string,
  `no-store`, the correct-option projection, the out-of-range refusal, keying on
  the row id, and accepting a partial bank match.
- **rederive**: two. The crosswalk is derived a second time from
  `lib/cyber-quiz-lesson.js`, which reads `config/cyber-topics.json` and the
  page's own h1 and never looks at a question. Two methods, no shared input
  beyond the handle: **15 rows confirmed by both, 0 conflicts**, and all five of
  Unit 3's off-by-one rows are among the 15. The taxonomy cannot answer for Unit
  1 and most of Unit 2, whose handles it does not know on pages that print no
  topic number; those are reported unconfirmed rather than guessed, which is the
  same refusal that caught the original mis-filing. The second is the sheet
  parse-back, 27 passed.

The `live` checks are written and deferred. They assert the endpoint answers 403
where it answered `404 Route not found` before the merge (measured, all three),
that all refusals are one indistinguishable string, and that the render path
still reports `pool: 5` with no `correct_index`.

## Still open

- **The Matrixify sheet is NOT imported.** Until it lands, the endpoint is live
  and nothing on the page calls it. That is the safe order: the page must not
  call a route that does not exist, and unlike the quiz mount there is no
  failure mode where importing early blanks something a student needs.
- **cyber 1.3, 1.4 and 1.5 have banks that are not their pages' quizzes**, and
  `lock_enforceable` reads true for all three. Board 276 owns the mount that
  makes them agree. Worth saying that this is a sharper version of the gap that
  run note already flagged for units 2 to 5, where the bank was extracted FROM
  the page and does match.
- **Three Unit 3 rows open a page about something else.** Found on the way and
  measured against the live h1 of all six, not inferred from the numbering:

        CC row 3.3  Firewalls & Packet Filtering        opens  3.2 Network Security Policies & Wireless
        CC row 3.5  IDS, IPS & SIEM                     opens  3.4 Firewalls & Packet Filtering
        CC row 3.6  Network Security Policies & Wireless opens 3.5 IDS, IPS & SIEM

  Rows 3.1, 3.2 and 3.4 are correct, so it is a three-way rotation among
  positions 3, 5 and 6 rather than a clean off-by-one, and that is exactly why
  it survived: the row a reader is most likely to spot-check is the one that
  agrees. A teacher clicking Firewalls lands on Wireless, before they ever reach
  an answer key. Out of scope here; filed as board 283.

  This does NOT affect the keys shipped above. The crosswalk is derived from the
  page each row links to rather than from the row's title, so row 3.3's key is
  the key to the Wireless quiz that row actually opens. The pairing is right and
  the label above it is wrong, which is the honest state until 283 lands.
- The lab key panel renders its button on Unit 1 for a signed-out visitor,
  because it gates on `unlocked` rather than `entitled`, so clicking it can only
  fail. Not copied here, not fixed here.

# Leaderboard names: the server half of the game-page XSS

Board 389. Branch `claude/loving-maxwell-33iyr4`. Claim 332, lock `api:routes/game.js`.

The 13:06 addendum to the morning triage ranked a server-side fix first, ahead of
the 29 page imports, on the grounds that it closes the hole for every page at
once including pages a future generator has not cloned yet. That is what this is.
It does not replace board 383, which is still 29 live page bodies with a
collapsed `esc()` in them.

## What was actually wrong

Not what the addendum guessed, and the difference matters for anyone fixing the
next one of these.

This repo already has a name cleaner that works. `utils.sanitize()` strips
control characters and the tag characters `<` and `>`, and turns bare quotes into
typographic ones. Every student display name goes through it at join, so a
signed-in student has never been able to put markup on a leaderboard.

`routes/game.js` had its own copy for anonymous play, and the copy had drifted:
control characters and nothing else. So the exposure was anonymous play only, and
it was total. The 16 character cap reads like a second line of defense and is not
one:

    '<svg onload=x()>'   is exactly 16 characters and came through whole

A payload split across two rows also survives, because the row markup between
them lands inside the attribute the first half opened. Scores decide adjacency
and the attacker picks the scores.

So the shape of this bug is the one this repo keeps finding: a second opinion
about a rule, living next to the module that owns it, quietly out of date. Same
shape as the three hardcoded mojibake lead pairs in `matrixify-preflight.js`.

## The value question the addendum left open

It asked whether `POST /api/game/score` accepts a non-numeric `value`, and said
the answer decides whether the second sink, `fmt()`, is live or latent.

Latent. The route ran `Number()` then `Number.isFinite()` plus the registry
bounds, so a string never reached the column through that endpoint.

Two things turned up underneath that answer, and neither was in the report:

**Coercion was accepting types no client sends.** `Number([])` is 0 and
`Number(true)` is 1, both inside `[0, 10000]`, so an array or a boolean landed on
a board as a real score. Not a security problem. Still wrong, and refusing them
costs nothing.

**SQLite's REAL affinity does not reject text, it stores what it cannot
convert.** `value REAL NOT NULL` will hold the string `<img src=x>`, and `MAX()`
sorts text above every number, so such a row ranks first on the board it is in.
`POST /score` can no longer create one. The column can still hold one. That is
what makes pinning the value to a number on the way out load bearing rather than
decoration, and it is asserted as such.

## What changed

`routes/game.js`, three edits:

1. `sanitizeName()` delegates to `utils.sanitize()` instead of keeping its own
   copy. The cap, the whitespace collapse and the profanity mask stay where they
   were. A name that was nothing but markup now cleans to empty and is refused by
   the caller's existing "a name is required" path.
2. The leaderboard read path cleans the name it serves and pins the value to a
   number. Rows written before this fix are still in the table and a backfill is
   a migration, which is on the never-auto list, so the read path neutralizes
   them instead. It also means a page whose own escaping is broken cannot be
   handed markup by this API.
3. `value` is refused rather than coerced unless it is a number or a string that
   is entirely a number.

## Evidence

**Live, before the change.** All 47 registry boards, all-time, top 50 each: 47 of
47 reachable, 89 rows, zero names carrying a tag character and zero non-numeric
values. The hole was real and had not been found by anyone. That is also the
reason nothing here needed a backfill.

**Suite.** `npm run smoke:gamename`, 23 assertions in four sections. Section 4 is
the one worth reading: it runs the broken row builder, `esc()` and `fmt()` copied
byte for byte off a live `ap-csp-game-*` body, over what this API now returns, and
asserts that every tag in the output is one the builder itself wrote. That is a
different claim from "the server strips `<`" and it is the claim that matters.

**Mutation.** `npm run smoke:gamenamemutation`, five mutations, each required to
turn the suite red on its own assertion. The fifth is the one that keeps this from
rotting: break `utils.sanitize()` and the suite must go red, because if it does
not, the route has grown a private copy again and the original bug is back in a
shape the other four cannot see.

**Live, after the deploy.** Merged as `a4ed254`, PR #761. Railway was a merge
behind when the first poll ran and was serving `252ce6c`, which is PR #759, so the
check waited for `/api/health` to report `a4ed254` before sending anything. That
gate is not ceremony: every assertion below is a REJECTION, and a rejection sent
to the old code is a 200 that writes a row to a live board.

Against `a4ed254`, four requests, all refused, nothing stored:

    name '<<<>>>'      400  A name is required for anonymous play.
    value []           400  value must be a number between 0 and 10000
    value true         400  value must be a number between 0 and 10000
    value ''           400  value must be a number between 0 and 10000

Every one of those returned 200 and stored a row beforehand. `<<<>>>` carries no
control character, so the old sanitizer passed it through untouched; `[]`, `true`
and `''` all coerce to a number inside the registry bounds, so they landed as
scores of 0, 1 and 0. So each assertion is false before the deploy and true
after, which is the standard the deploy gate asks for.

The busiest board reads 38 rows, every served name free of tag characters and
every served value a number, and no row named by this check, which is the
second confirmation that a refused request writes nothing.

This check was run by the session that wrote the change, so under rule 4 it is
evidence for a verifier rather than a verification. Task 389 is left unverified
on purpose.

## Still open

- **Board 383 stands.** 29 CSP game pages still carry a no-op `esc()`. This change
  means there is currently nothing for them to render, which buys time; it does
  not make them correct.
- **The addendum's fourth recommendation is still the better page-side fix.**
  Port the `createElement`/`textContent` row builder that is already live on the
  10 Networking pages rather than repairing the string-building version. Escaping
  on read is one typo away from being a no-op again, which is exactly how this
  started. `textContent` cannot be.
- **Nothing was imported and no page body was touched.** No sheet was generated
  either. The three `leaderboard-xss-fix-*.csv` files under `imports/2026-09-21/`
  are another session's work and have not been checked here.
- **No backfill.** Deliberately. Nothing in the table needs one today, and if
  that changes it is a migration and a human's call.

## What to remember

A cap is not a sanitizer. Sixteen characters sounds too small to matter and
`<svg onload=x()>` is exactly sixteen.

And when a repo already owns a rule in a module, the bug is usually not in the
module. It is in the copy somebody made of it.

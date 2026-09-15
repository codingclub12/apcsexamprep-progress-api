# AP Cyber slide decks: all 70 are unshared, and that is why teachers keep requesting access

Board #336. 2026-09-15.

## How it surfaced

A teacher emailed Tanner about something else and mentioned in passing that the
blue "Get my slide decks" button on the cyber 1.3 lesson page, under the lesson
summary, opens a panel, and that pressing Teacher there asks them to request
access. They already own the bundle, so they shrugged and moved on. Tanner's
read was that this is the link now sitting on every cyber lesson page, and that
it explains the access requests he has been getting.

That read is right, and the problem is bigger than the one button they pressed.

## What is actually true

Every one of the 70 converted AP Cybersecurity decks answers 401 to an
anonymous fetch of its embed URL. Not the teacher decks. All of them, teacher
and student, every lesson in Units 1 and 2.

    node scripts/verify-slide-sharing.js ap-cybersecurity

    controls
      known-shared deck   -> 200   ok
      nonexistent file id -> 404   ok

    decks with an id in the config: 70   (generated 2026-08-27)
    reachable anonymously : 0/70

      401 exists, not shared : 70
      404 no such file       : 0

The two controls are what make that worth reading. A known-shared CSP deck
returned 200 through the same proxy in the same run, and a syntactically valid
but nonexistent id returned 404, so this is neither blocked egress nor a
permissive proxy answering 200 for everything.

The 401 rather than 404 is the diagnosis. The files exist. Google is asking for
a sign-in, which renders as "You need access" with a Request access button, and
a teacher who presses it sends a request to whoever owns the file. Those
requests cannot be granted the right way even in principle: the gating is
supposed to be the APCSExamPrep teacher token, not a Google account, which is
the whole reason these decks are meant to be shared to anyone with the link.

AP CSP is fine: 224 of 224 reachable, converted 2026-08-24. That contrast is
what rules out a Google-wide policy change or a domain restriction. Both
conversion scripts call the same setSharing(ANYONE_WITH_LINK, VIEW). It is
these files.

Confirmed the rendered shape too, on 1-3 day 1 teacher:

    http=401 size=9148, body contains ServiceLogin and "Sign in"

## What I could not establish

Why the sharing is not set. That needs Drive, and a session cannot reach it.
The two candidates worth checking first are an admin setting that forbids link
sharing on whatever drive these live in, and a conversion run where setSharing
threw and nothing read it back. The repair script's diagnose() is built to tell
those apart, because the fix is completely different in each case.

I also cannot say whether this has been broken since 2026-08-27 or broke later.
Nothing recorded the reachable state at any point, which is its own finding.

## What shipped

Nothing here fixes the decks. The fix needs Tanner's Google account. What
shipped is the tooling to do it in one pass and the guard so it cannot happen
silently again.

- `scripts/cyber-slides-reshare.gs`, generated, pasted into script.google.com.
  Sets sharing on the 70 existing files by id and reads every one back.
  preview() first, which changes nothing, then start().
- `scripts/build-cyber-reshare-gs.js` generates it from
  `config/cyber-slide-embeds.js`, with `--check` refusing a hand-edit. A file id
  is access here, so the list is derived rather than retyped: an id typed into
  the wrong slot would re-share some other file, leave the intended deck locked,
  and report success.
- `smoke/cyber-reshare-gs.js`, 23 assertions, five mutations each red on their
  own: a one-character id change, a deleted row, two ids swapped, the permission
  hand-edited to EDIT, and the read-back removed.
- `.github/workflows/slide-sharing-watch.yml`, daily at 11:30 UTC, both courses,
  reporting to the command center as source drive, check_id slide-sharing.
- `scripts/verify-slide-sharing.js` now splits 401 from 404 and says what each
  one means.

## The advice that was wrong, and would have cost a day

The verifier used to end with "Re-run the Apps Script; it is idempotent." That
is exactly backwards for this failure. `cyber-slides-conversion.gs` skips any
deck the map sheet already records as OK, and all 70 are recorded OK, because
the copy worked and only the sharing did not stick. Re-running start() would
log "0 to convert, 70 already done" and exit green, which reads like a fix and
is not one. Clearing the sheet to force it through would be worse: it mints 70
new file ids and invalidates the embeds config, turning a permission fix into a
re-conversion plus a config regeneration plus a deploy.

Idempotent means "skip work already done", and that is the wrong behaviour when
the work needs redoing.

## What was learned

The check existed the whole time and was wired to nothing. `verify-slide-
sharing.js` is well built, it has real controls, and it would have caught this
on any day anyone ran it. It was in package.json as `verify:sharing` and in no
workflow. Nineteen days of teachers hitting a wall, and the detector that
finally fired was a customer being polite about it in an email about something
else.

Everything else was green the whole time, and correctly so. The conversion
recorded 70 OK. The config is well-formed. routes/slides.js hands the ids out
correctly and filters variants correctly. The theme gate renders exactly what
comes back. Nothing was wrong in any of them, which is why no amount of testing
those layers harder would have found it. The failure lived in a permission on
someone else's service, and the only way to see it is to look from outside with
no credentials.

The second lesson is smaller and sharper: a write that is not read back is a
claim, not a result. The conversion called setSharing and moved on. That single
missing read-back is the entire bug, and it is why the repair script reads every
file back and refuses to count a deck fixed on the strength of a clean write.

## Still open

- The repair itself. Tanner runs preview() then start(), then
  `npm run verify:sharing ap-cybersecurity` must print 70/70. Until that number
  moves, this is diagnosed and not fixed.
- Why it happened. diagnose() answers it, and the answer decides whether the
  repair holds or gets undone again next month.
- Units 3, 4 and 5 have no converted decks at all, deliberately, per the
  conversion script's header. Unrelated to this, but a teacher on a Unit 3
  lesson page sees the "still being prepared" panel rather than decks.

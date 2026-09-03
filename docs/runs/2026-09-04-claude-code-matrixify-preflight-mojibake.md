# 2026-09-04: the last consumer with its own opinion about mojibake

Two sessions were fixing the same bug at the same time and neither knew. This
note is mostly about that, because the code change left at the end of it is small
and the process failure is the expensive part.

## What I was asked to do, and what happened to it

Asked to fix the mojibake rule before it shipped: the handoff drafts described
DOUBLE-pass corruption while the form reported on a live page was single-pass, so
the validator would have been hollow.

That was right, and I confirmed something worse: this repo held THREE detectors
and all three missed the reported forms, for two compounding reasons (latin-1
only reversal, so the cp1252 flavour a spreadsheet produces was invisible; and
widths 3 and 2 only, so no 4-byte character could be detected at any width). I
built `lib/mojibake.js`, moved every consumer onto it, repaired 65 corrupted runs
in `tools/ap-cyber-ced/CED-UNIT1-EXTRACT.txt`, wrote a Python rederive and a
seven-mutation gate, and opened PR #484.

While I was doing that, another session did the same thing and merged first.
PR #482 landed `lib/mojibake.js`, `scripts/mojibake-rederive.js`,
`smoke/mojibake-parity.js`, `tools/ap-cyber-ced/mojibake.py`, a gate manifest,
the same rewiring of `smoke/encoding-guard.js` and `lib/site-crawl.js`, and the
same 65-run repair of the same CED file. Same diagnosis, same prescription,
arrived at independently, roughly the same hour.

**Their version is better in the place that matters, and I dropped mine for it.**
The hard part of this problem is not detection, it is the false positive that
widening the lead set to C2-F4 creates: Shopify's own Nordic locale files carry
sort labels that reverse cleanly to U+0156 and U+0596 and are entirely legitimate
text. Both of us found that by running a detector over the theme repo. My fix was
a `PLAUSIBLE` list of the character ranges this store's content is allowed to
contain, which works and which I had to document as needing to be widened the day
the store ships a Nordic locale. Theirs is structural: mojibake is a WHOLE-TEXT
transformation, so it corrupts every non-ASCII character around it, and an
ISOLATED width-2 run whose lead sits outside U+00C2 to U+00C3 is therefore real
text rather than corruption. `acceptRuns` keeps such a run only when it touches
another accepted one, propagated to a fixpoint. No list, no locale caveat, and it
generalises to cases neither of us has seen. That is the better answer.

So this branch was reduced to main's implementation plus the one thing PR #482
missed.

## What was actually left to do

`scripts/matrixify-preflight.js`. PR #482 moved `smoke/encoding-guard.js`,
`lib/site-crawl.js`, `validate_csv.py` and `verify_import.py` onto the module and
missed this one, and it is the consumer that matters most: **every Shopify page
change ships as a Matrixify sheet**, so this preflight is the gate between
authored content and a live page body. It was still carrying

    U+00E2 U+0080    a 3-byte character, latin-1
    U+00C3 U+00A2    the same, corrupted a second time
    U+00F0 U+009F    a 4-byte character, latin-1

three hardcoded latin-1 lead pairs of its own. A sheet out of Excel carries the
cp1252 flavour, where those leads read U+00E2 U+20AC and U+00F0 U+0178, so none of
the three matched and the exact corruption reported on a live page would have been
imported without complaint.

Its own smoke fixture was built the same wrong way, from the latin-1 bullet, so
the guard and its test shared one blind spot and agreed with each other. That is
the whole lesson of this two-day episode repeating one directory over: a fixture
written from memory encodes the same misunderstanding as the rule it tests.

Now it calls `mojibake.analyze()`, and the refusal names the run count, the
flavour and the recovered code point, because a sheet is refused hours before
anyone reads why and "mojibake sequence present" sends somebody hunting through a
270,000 character body.

## Evidence

`deploy-gates/2026-09-04-matrixify-preflight-mojibake.json`, at `--pre`:

| kind | check | result |
|---|---|---|
| suite | `smoke:preflight` | 59 passed, 0 failed |
| suite | `smoke:encoding` | 54 passed, 0 failed |
| mutation | preflight counts instead of refusing | red on the cp1252 sheet body |
| mutation | refusal stops naming the character | red on the naming assertion |
| mutation | `isExotic` stops dropping isolated leads | red on the Nordic sort label |
| rederive | `scripts/mojibake-rederive.js` | REDERIVE AGREES |
| rederive | `smoke:mojibakeparity`, JS against Python | 6 passed, 0 failed |

The third mutation targets `lib/mojibake.js` rather than the preflight on
purpose. The preflight now has no opinion of its own, so the only thing standing
between it and refusing legitimate sheets is `isExotic`, and a gate that blocks
real work is a gate somebody switches off.

**The gate refused its own first draft**, which is worth recording. My second
mutation left unbalanced parentheses, so the whole preflight threw and an EARLIER
assertion went red instead of the one it was aimed at. The gate reported
subsumption and refused to ship: "the suite went red, but NOT for ... Another
guard caught this mutation, so the one it targets is still unproven." A mutation
that breaks the file proves nothing about the guard it was pointed at, and without
that check I would have counted it as evidence.

## What I could not confirm, and what I got wrong

**The live sighting is still unreproduced.** Through `lib/storefront-fetch.js`,
which refuses any body without both storefront markers: 60 page bodies proven
rendered, 23,947,084 characters, 55 of the 60 carrying non-ASCII as a positive
control, and zero runs by either the current or the retired detector. 60 pages is
4.4% of the 1362 in the sitemap, so this does not disprove the report; the page
may already have been repaired, or it may have been seen in a sheet rather than on
a served page. The case for the fix does not rest on it.

**My first attempt at that measurement was worthless and I nearly reported it.**
It sent a browser-like User-Agent and reported 0 runs over 200 pages. The
storefront's bot management inverted the same day: a browser User-Agent gets a 403
"Verifying your connection" body, and `looksLikeChallenge` in `lib/site-crawl.js`
does not match that string. "No mojibake found" is a NEGATIVE assertion and a
negative assertion passes on an empty page. I only caught it because merging main
brought in the `lib/storefront-fetch.js` convention.

**The 25 to 40 per-skill-category band is still unverified from this repo.** The
CED is not here. I did not commit it as fact, and the `.pdf` extension warning is
covered better in main's CLAUDE.md than in the note I had written, as a check to
run rather than a fact about a path.

**I never claimed a lock.** Rule 2 of the four rules exists precisely to stop two
sessions writing the same file, `apcs claim <id> --lock repo:path` would have
turned this into a 409 naming the holder, and I opened no claim because I had no
board access this run. Two sessions, two full implementations, one thrown away.
The lock was not bureaucracy.

## What was learned

The thing worth keeping is not the detector, it is that **a fixture built from a
remembered byte pattern encodes the same misunderstanding as the rule it tests,
so the guard and its test agree with each other and the suite goes green.** That
happened three times in this episode: in `smoke/encoding-guard.js`, in
`smoke/matrixify-preflight.js`, and in the handoff draft that started it. Corrupt
a real character and assert on the result instead.

Second: when a module lands and consumers are migrated onto it, the migration is
the change, not the module. PR #482 was careful, well tested and well documented,
and it still left the highest-consequence consumer holding the old rule. Grep for
the retired pattern before calling a consolidation finished.

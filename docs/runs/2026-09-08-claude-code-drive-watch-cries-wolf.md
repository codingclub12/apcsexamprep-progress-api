# The Drive watcher works, and would have started lying next Monday

2026-09-08. Board 280, 281. Follows PR #610 and #614, which built
`scripts/drive-watch.js` and got it through its first successful run.

## What was asked

"This entire google drive folder now needs to be connected to the command
center." That landed in #610. This note is about what the first two real runs
showed, which is that connecting it was the easy half.

## The loop closed by itself, which is the part that worked

Run 1 (34189648884) failed on a 503 after 33 downloads. The board picked it up
with no human in the path:

    drive/drive-watch  state fail   first_failed_at 05:18:07   task 280 opened

Run 2 (34191151634) passed, and the same machinery closed it:

    drive/drive-watch  state pass   last_pass_at 05:54:02      task 280 done

853 files in `AP CSA Teacher Bundle`, 261 in `AP CSA Unit 1 Course Preview_`,
matching two independent local walks done before the workflow existed.

## Three defects the runs exposed

### 1. It would have opened a "a teacher bundle changed" PR every week, forever

This is the one that mattered. `captured` was stamped with today's date on every
run and written into the file the workflow diffs, so
`git status --porcelain -- docs/drive-snapshot` was dirty on every run no matter
what the bundle did. Next Monday would have opened a pull request titled "Drive
watch: a teacher bundle changed" whose own body read "Byte-identical to the last
capture. 853 files."

Not a prediction. The sibling watcher already does it: ced-watch PR #591 has been
open since 2026-09-07 saying "CED watch: nothing changed (15 sources)" in its own
body. Its diff shows two causes, `checked_at` moving 09-01 to 09-07, and `bytes`
moving on 4 of 15 sources while every single `hash` stayed identical. Filed as
board 281 with that evidence; it is a different script and wants its own look,
particularly the question of why `bytes` disagrees with `hash`.

`captured` now means the date the CONTENT was first seen, and the file is not
rewritten at all on a run that found nothing. When we last looked was never
lost: it is in the job summary and in `last_seen_at` on the board's check, which
is where it belongs.

### 2. A handout converted to a Google Doc was invisible

`diff()` reported a file as changed only when both sides carried a sha256. Native
files carry none by design, so a `.docx` converted to a Google Doc kept its path,
lost its digest, and reported as no change. That gap was harmless while the file
was rewritten unconditionally and merely cosmetic in the report. It stops being
harmless the moment the write is gated on the diff, because then a real change to
what a teacher downloads would be swallowed silently. Fixed in the same pass as
the gate, deliberately, rather than after it.

### 3. Nineteen minutes of a thirty minute cap

Run 2's read step took 19m07s. The walk was fully serial and a bundle is about
960 downloads at roughly a second each of waiting on Google. Eleven minutes of
margin on a weekly job whose runtime is set by somebody else's latency is thin,
and the failure shape is bad: a job that hits `timeout-minutes` is CANCELLED, not
failed, which reads as nothing being wrong. The offline suite did exactly this on
2026-09-03 and the pull request was simply unmergeable with nothing red anywhere.

Downloads now run six at a time, which took the same 961 files from 19m07s to
3m46s. Six rather than twenty because the constraint is Google's patience, not
ours: run 1 took a 503 at a concurrency of ONE, so the retry budget was always
doing the real work. At six it needed none, with 961 downloads and no errors.

Concurrency cost one property the snapshot had been getting for free. Insertion
order was walk order, which was deterministic; with a pool it is completion
order, which reshuffles every run. Left alone that would have produced a 5435
line diff of pure reordering every Monday, which is defect 1 wearing a different
hat. Paths are sorted on the way out, and that is pinned.

## Evidence

    suite     smoke:drivewatch 15 checks to 29, all passing. deploy-reporting
              117, volumepaths and encoding clean.

    mutation  13 rules broken one at a time, each required to go red for ITS OWN
              test rather than for any test. Control green, restore green.
              TWO were hollow on the first pass and both were fixed:
                - the fail-fast test read its counter at the moment Promise.all
                  rejected, which is small whether or not the pool stopped. It
                  now reads after giving the other runners time to drain.
                - the Boolean coercion in the retype test had no case that
                  needed it, because a plain file has no `native` key at all.
                  It only bites when a snapshot spells the absence out as
                  `native: false`, so that is what the test asserts now.

    rederive  the concurrent walk against the live preview bundle produced
              digests byte-identical to the runner's SERIAL walk, all 261 files.
              Two different implementations, same conclusion, and the reference
              was produced by a machine that is not this one.

    live      the fixed script run end to end against BOTH live bundles with
              the committed baseline in place. 961 downloads, no errors,
              exit 0, and both reports reading "Byte-identical to the last
              capture" at 853 and 261 files. Both md5s unchanged across the
              run, 538d23b2063425d4c2edc41e51b1f053 and
              e926fc244c37eab45181f1cd1301986b, and git reporting neither
              snapshot modified. Under the old code that same run rewrites
              both files and opens a pull request.

              It also re-derived all 961 digests against the re-sorted
              baseline and matched every one, so the hand-landed baseline is
              verified against live rather than merely reformatted carefully.

              Wall time 3m46s, against the runner's 19m07s serial, and that
              3m46s is through the agent proxy so a runner will be quicker.

## The baseline had to be landed by hand, and the reason generalises

Run 2 opened PR #617 with the baseline. It cannot be merged. A pull request
opened with `secrets.GITHUB_TOKEN` does not trigger workflows, by GitHub's
design, so no check ever appears on it and the ruleset's required
`Offline smoke suites` status can never go green: `mergeable_state: blocked`,
`total_count: 0` check runs. ced-watch's own baseline PR #430 merged on
2026-09-02, so this is a constraint that arrived with the ruleset rather than
one anybody designed around.

So the baseline comes in here instead, re-sorted into the canonical form on the
way. That re-sort was proven a pure key reorder before it was committed: same key
set, same count, same value for every key, and an order-independent content
fingerprint unchanged on both files.

#617 is superseded and closed.

## Still open

- Board 281, ced-watch. Same disease, different script, its own investigation.
- A week where a bundle really does change still produces a PR nobody can merge
  by machine. That is acceptable for this watcher, since the whole point is that
  a person looks, but it should be a decision rather than a surprise.
- 153 Google-native Slides carry no digest and cannot, so a slide edited in place
  is invisible to this watcher. The bundle's `.pptx` copies are covered.
- 3 `.DS_Store` files ship inside `AP CSA Unit 1 Course Preview_`, one of them
  at its root. None in the teacher bundle. Cosmetic, and the preview tree has a
  larger question hanging over it anyway (below).
- The preview tree is still publicly link-shared, and the snapshot answers the
  question that could not be answered on 2026-09-07 by opening folders. The two
  trees share **not one byte**:

        teacher bundle digests   700
        course preview digests   261
        shared by both             0

  19 filenames appear in both and every one of them differs. The teacher bundle
  keeps Unit 1 in `Unit 1/` (202 files); the preview keeps it in
  `Unit_1_Using_Objects_and_Methods/` (259 files). These are not two views of
  one folder, they are two different copies of the unit, and only one of them
  got the 2026-09-07 repairs. Which link the purchaser received is still a
  question for Tanner, and it is now a question with a measurable answer.

# What is actually in the Drive bundles

One JSON file per watched bundle, written by `scripts/drive-watch.js` and
committed, so git history is the record of what a teacher could download and
when. The watch list is `config/drive-bundles.json`.

Each file is the whole tree, keyed by path inside the bundle:

    "Unit 1/Lesson_1.1_Intro_to_Algorithms/Quiz/Quiz_KEY.docx": {
      "id": "1qjK...",        the Drive file id
      "bytes": 39240,
      "sha256": "5baad74a..."  content digest, the change signal
    }

Google-native files (Docs, Sheets, Slides) carry `"native": true` and **no
digest**. There are no stored bytes to hash: every export re-renders, so a
digest would move on runs where nothing changed, and a watcher that cries every
week is one nobody reads. 153 native Slides live under
`AP CSA Slides (converted)`.

## Two fields that are not what they look like

`captured` is the date this CONTENT was first seen, not the date we last looked.
Those are different questions and only one of them can live in a file that gets
diffed. A "last looked" stamp rewrites itself on every run, so the file is dirty
every week whatever the bundle did, the workflow opens "a teacher bundle
changed" because it keys on `git status`, and the report inside says
byte-identical. The sibling watcher does exactly this: ced-watch PR #591 sat
open with "nothing changed (15 sources)" in its own body. When we last looked is
recorded where it costs nothing, in the job summary and in `last_seen_at` on the
board's `drive/drive-watch` check.

Paths are stored **sorted**, and that is load-bearing rather than tidy. Files are
downloaded several at a time, so insertion order is completion order and
reshuffles every run. Written out as-is it would produce a five thousand line
diff of pure reordering every Monday.

## Why this exists

Unit 1 was repaired four times on 2026-09-07 and the repairs sat in a zip.
Whether they had reached Drive was answerable only by a person opening folders,
and on 2026-09-08 that produced a wrong answer twice in ten minutes: the same
lesson existed in two separately shared trees, one carrying the repairs and one
still holding exercises with no code. Nothing anywhere said which was which.

A bundle that has been repaired in a zip is not a bundle that has been fixed.

## The baseline

Built by the first `drive-watch` run on 2026-09-08: 853 files in the teacher
bundle, 261 in the course preview. That run opened PR #617, which could not be
merged, and the reason is worth knowing before writing another watcher. A pull
request opened with `secrets.GITHUB_TOKEN` does not trigger workflows, by
design, so no check ever appears on it and the required `Offline smoke suites`
status can never go green. The baseline was landed by hand instead, re-sorted
into the canonical form on the way in and proven a pure key reorder.

So a week where a bundle really does change still produces a PR that a person
has to merge deliberately. That is the right posture for this one, since the
whole point is that somebody looks.

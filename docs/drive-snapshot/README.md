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
week is one nobody reads. 152 native Slides live under
`AP CSA Slides (converted)`.

## Why this exists

Unit 1 was repaired four times on 2026-09-07 and the repairs sat in a zip.
Whether they had reached Drive was answerable only by a person opening folders,
and on 2026-09-08 that produced a wrong answer twice in ten minutes: the same
lesson existed in two separately shared trees, one carrying the repairs and one
still holding exercises with no code. Nothing anywhere said which was which.

A bundle that has been repaired in a zip is not a bundle that has been fixed.

## The first file appears on the first run

The baseline is built by the first `drive-watch` run, which opens a snapshot PR.
Until that merges this directory holds only this README, and that is expected
rather than a missing file.

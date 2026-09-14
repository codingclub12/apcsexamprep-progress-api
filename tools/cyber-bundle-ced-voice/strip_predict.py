"""
Remove the per-question "Predict first" prompt from the quizzes and unit tests.

WHAT IT TARGETS, AND WHAT IT LEAVES
  Exactly one shape:

      Predict first: write your answer before reading the choices -> ______

  a standalone paragraph sitting between a question stem and its options, 206 of
  them across 22 lesson quizzes and 5 unit tests, all in STUDENT copies. The KEY
  copies never carried it, so removing it brings the two closer rather than
  pulling them apart.

  The word "predict" appears 316 times in this bundle and most of them are
  content: "consistent, predictable traffic patterns", an answer option about
  predicting hardware failures, "their unpredictable rounds create time
  pressure". A looser match would eat answer options, so the pattern is anchored
  at the start of the paragraph and requires the full sentence.

  THREE OTHER "Predict first" SHAPES ARE DELIBERATELY LEFT ALONE, because they
  are not a line and removing them is a different decision:
    - 47 exercise headings, each owning a separate instruction paragraph under it
    - 14 "Step 1 - Predict first" rows in a numbered Step/What-to-do table, where
      dropping the row leaves Steps 2 to 4 misnumbered
    - 2 "Predict First" entries in a Day 4 notes list headed "Use All Three
      Moves", which would then name two

  python3 strip_predict.py <in-root> <out-root>
"""
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze, docxedit  # noqa: E402

# Anchored at the paragraph start and requiring the whole sentence: the arrow and
# the blank vary (-> or a real arrow, 4 to 8 underscores) but the lead does not.
PREDICT = re.compile(r'^Predict first\s*:\s*write your answer before reading the choices\b')


def plan(root):
    """{relative path: [paragraph indexes to delete]} plus the text found."""
    found = {}
    for dirpath, _, names in os.walk(root):
        for n in sorted(names):
            if not n.endswith('.docx'):
                continue
            path = os.path.join(dirpath, n)
            rel = os.path.relpath(path, root)
            hits = [i for i, t in enumerate(analyze.paragraphs(path))
                    if PREDICT.match(re.sub(r'\s+', ' ', t).strip())]
            if hits:
                found[rel] = hits
    return found


def main(src, out):
    hits = plan(src)
    total = sum(len(v) for v in hits.values())
    print(f"documents carrying the line : {len(hits)}")
    print(f"lines to remove             : {total}")

    copied = 0
    for dirpath, _, names in os.walk(src):
        for n in sorted(names):
            if not n.endswith('.docx'):
                continue
            path = os.path.join(dirpath, n)
            rel = os.path.relpath(path, src)
            dst = os.path.join(out, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            if rel in hits:
                paras = analyze.paragraphs(path)
                edits = [{'index': i, 'old': paras[i], 'new': None} for i in hits[rel]]
                docxedit.apply_edits(path, dst, edits)
            else:
                shutil.copyfile(path, dst)
                copied += 1
    print(f"files rewritten             : {len(hits)}")
    print(f"files copied unchanged      : {copied}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))

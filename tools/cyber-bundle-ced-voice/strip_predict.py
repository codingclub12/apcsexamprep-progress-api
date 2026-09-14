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

  TWO MORE SHAPES GO TOO, on Tanner's call of 2026-09-14, and each is a different
  edit rather than a bigger version of the same one:

    CALLOUT   47 "Predict first" blocks. These are not headings in flowing text:
              each is a 1x1 table used as a styled box, holding exactly the label
              and the instruction under it ("Before you answer Part A, write one
              sentence: ..."). The whole BOX goes. Deleting its two paragraphs
              would leave an empty bordered box on the page, and Word treats a
              cell with no paragraph as corrupt, so that route is refused outright.

    STEP ROW  14 "Step 1 - Predict first" rows in a Step/What-to-do table. The
              whole ROW goes, not just the label, or the page keeps an empty row.
              Every one of these tables has exactly 3 steps, so the survivors are
              renumbered 2->1 and 3->2. Nothing outside the table refers to a
              "Step N" (checked: zero prose references), so renumbering is
              self-contained.

  ONE SHAPE IS STILL LEFT ALONE: the 2 "Predict First" entries in a Day 4 notes
  list headed "Use All Three Moves", which would then name two. Guided notes were
  never in scope for this bundle work, and Tanner left them out.

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
HEADING = re.compile(r'^Predict first$', re.I)
HEADING_BODY = re.compile(r'^Before you answer Part [A-Z],', re.I)
STEP_PREDICT = re.compile(r'^Step 1 - Predict first', re.I)
STEP_LABEL = re.compile(r'^Step ([2-9]) - (.+)$')


def norm(t):
    return re.sub(r'\s+', ' ', t).strip()


def plan_file(path):
    """
    Edits for one document: [{index, old, new, scope}], plus a per-shape count.
    Raises if a shape does not look the way it is supposed to, rather than
    guessing at a document it does not recognise.
    """
    paras = analyze.paragraphs(path)
    edits = []
    counts = {'line': 0, 'heading': 0, 'step_row': 0, 'renumber': 0}

    for i, raw in enumerate(paras):
        t = norm(raw)

        if PREDICT.match(t):
            edits.append({'index': i, 'old': raw, 'new': None})
            counts['line'] += 1

        elif HEADING.match(t):
            nxt = norm(paras[i + 1]) if i + 1 < len(paras) else ''
            if not HEADING_BODY.match(nxt):
                raise ValueError(f"{path} [{i}]: 'Predict first' label is not "
                                 f"followed by its instruction paragraph, got: {nxt[:70]!r}")
            edits.append({'index': i, 'old': raw, 'new': None, 'scope': 'table',
                          'expect': [raw, paras[i + 1]]})
            counts['heading'] += 1

        elif STEP_PREDICT.match(t):
            edits.append({'index': i, 'old': raw, 'new': None, 'scope': 'row'})
            counts['step_row'] += 1
            # Renumber the steps that follow, in this table only. They are the
            # next "Step N" labels in document order; the tables are three rows
            # and never nested, checked across all 14.
            seen = 0
            for j in range(i + 1, min(i + 40, len(paras))):
                m = STEP_LABEL.match(norm(paras[j]))
                if not m:
                    continue
                edits.append({'index': j, 'old': paras[j],
                              'new': norm(paras[j]).replace(f'Step {m.group(1)} - ',
                                                            f'Step {int(m.group(1)) - 1} - ', 1)})
                counts['renumber'] += 1
                seen += 1
                if seen >= 2:
                    break
            if seen != 2:
                raise ValueError(f"{path} [{i}]: expected 2 following steps to "
                                 f"renumber, found {seen}")
    return edits, counts


def plan(root):
    """{relative path: edits} for every document that needs one."""
    found = {}
    for dirpath, _, names in os.walk(root):
        for n in sorted(names):
            if not n.endswith('.docx'):
                continue
            path = os.path.join(dirpath, n)
            edits, _ = plan_file(path)
            if edits:
                found[os.path.relpath(path, root)] = edits
    return found


def main(src, out):
    hits = plan(src)
    tally = {'line': 0, 'heading': 0, 'step_row': 0, 'renumber': 0}
    for dirpath, _, names in os.walk(src):
        for n in sorted(names):
            if n.endswith('.docx'):
                _, c = plan_file(os.path.join(dirpath, n))
                for k in tally:
                    tally[k] += c[k]
    print(f"documents to change         : {len(hits)}")
    print(f"per-question lines removed  : {tally['line']}")
    print(f"heading blocks removed      : {tally['heading']} (2 paragraphs each)")
    print(f"step rows removed           : {tally['step_row']}")
    print(f"step labels renumbered      : {tally['renumber']}")

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
                docxedit.apply_edits(path, dst, hits[rel])
            else:
                shutil.copyfile(path, dst)
                copied += 1
    print(f"files rewritten             : {len(hits)}")
    print(f"files copied unchanged      : {copied}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))

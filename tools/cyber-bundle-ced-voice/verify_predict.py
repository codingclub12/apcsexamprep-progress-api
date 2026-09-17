"""
Check the Predict removal without trusting strip_predict.py.

  package    every output opens, and no table lost all its rows or a cell all its
             paragraphs (Word calls that corrupt)
  removed    none of the three targeted shapes survives anywhere
  only       THE IMPORTANT ONE. Diff the before and after paragraph sequences and
             require every difference to be explainable: a deleted run must be a
             quiz line, a callout box pair, or a step row; a changed paragraph
             must be a step renumber and nothing else; and nothing may be
             inserted. This is computed from the diff, not from the plan, so a
             planner that deleted the right NUMBER of the wrong paragraphs fails
             here. Counting deletions would not notice.
  renumber   each table that lost its Predict step now reads Step 1, Step 2 with
             the descriptions its old Step 2 and Step 3 carried
  spared     the Day 4 notes "Use All Three Moves" entry is untouched
  intact     option letters, correct-answer checkmarks, and no framework voice
             back in a student copy

  python3 verify_predict.py <in-root> <out-root>
"""
import difflib
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze, pairing, scope, voice  # noqa: E402
from strip_predict import PREDICT, HEADING, HEADING_BODY, STEP_PREDICT  # noqa: E402

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
OPTION = re.compile(r'^\s*([A-E])\.\s')
CHECK = re.compile(r'[✓✔]')
STEP_ANY = re.compile(r'^Step (\d) - (.+)$')
NOTES_MOVE = re.compile(r'^Predict First\s*[—–-]\s*Before reading', re.I)
# The "what to do" cell of a Step 1 - Predict first row. Seven wordings across the
# 14 tables ("Before analyzing...", "Before classifying...", "Anchor your gut read
# of the gap..."), and the one thing all of them say is "gut read". Anchoring on
# the sentence opening instead missed one and the check caught it.
WHATTODO = re.compile(r'\bgut read\b', re.I)


def norm(t):
    return re.sub(r'\s+', ' ', t).strip()


# The five paragraph shapes this job is allowed to remove. Anything else showing
# up as deleted means the tool touched something it should not have.
DELETABLE = (
    ('quiz line', lambda t: bool(PREDICT.match(t))),
    ('callout label', lambda t: bool(HEADING.match(t))),
    ('callout body', lambda t: bool(HEADING_BODY.match(t))),
    ('step label', lambda t: bool(STEP_PREDICT.match(t))),
    ('step body', lambda t: bool(WHATTODO.search(t))),
)


def is_renumber(old, new):
    """new is old with its step number decremented and its description unchanged."""
    mo, mw = STEP_ANY.match(norm(old)), STEP_ANY.match(norm(new))
    return bool(mo and mw and mo.group(2) == mw.group(2)
                and int(mw.group(1)) == int(mo.group(1)) - 1)


def reconcile(olds, news):
    """
    Account for one differing span WITHOUT assuming how the differ grouped it.

    Removing a step row and renumbering the rows after it lands as a single
    "replace 3 with 1" rather than a delete plus two replaces, so matching on
    opcode shape rejected correct output. Instead: every surviving paragraph must
    be an unchanged or renumbered version of one that was there, and every
    paragraph left over must be a shape this job is allowed to delete.

    Returns (errors, removed_texts, renumbered_count).
    """
    remaining = list(olds)
    errors, renumbered = [], 0
    for w in news:
        hit = next((o for o in remaining if o == w), None)
        if hit is None:
            hit = next((o for o in remaining if is_renumber(o, w)), None)
            if hit is not None:
                renumbered += 1
        if hit is None:
            errors.append(f"a paragraph appeared that was not there before "
                          f"and is not a step renumber: {norm(w)[:80]}")
        else:
            remaining.remove(hit)
    for o in remaining:
        t = norm(o)
        if not any(fn(t) for _, fn in DELETABLE):
            errors.append(f"deleted something that is not a Predict shape: {t[:80]}")
    return errors, remaining, renumbered


def run(src, out):
    fails, checks = [], 0
    counts = {'line': 0, 'callout': 0, 'step_row': 0, 'renumber': 0}
    spared = 0

    for dirpath, _, names in os.walk(src):
        for n in sorted(names):
            if not n.endswith('.docx'):
                continue
            path = os.path.join(dirpath, n)
            rel = os.path.relpath(path, src)
            dst = os.path.join(out, rel)
            if not os.path.exists(dst):
                fails.append(('package', f"{rel}: missing from output"))
                continue

            # package
            checks += 1
            try:
                z = zipfile.ZipFile(dst)
                if z.testzip() is not None:
                    fails.append(('package', f"{rel}: corrupt member"))
                root = ET.fromstring(z.read('word/document.xml'))
            except Exception as exc:
                fails.append(('package', f"{rel}: will not open ({exc})"))
                continue
            for tbl in root.iter(W + 'tbl'):
                if not [k for k in tbl if k.tag == W + 'tr']:
                    fails.append(('package', f"{rel}: a table has no rows left"))
                for tc in tbl.iter(W + 'tc'):
                    if not [k for k in tc if k.tag == W + 'p']:
                        fails.append(('package', f"{rel}: a table cell has no paragraph"))

            before, after = analyze.paragraphs(path), analyze.paragraphs(dst)

            # removed
            checks += 1
            for label, rx in (('quiz line', PREDICT), ('callout label', HEADING),
                              ('step row', STEP_PREDICT)):
                left = [t for t in after if rx.match(norm(t))]
                if left:
                    fails.append(('removed', f"{rel}: {len(left)} {label} survive"))

            # only
            checks += 1
            sm = difflib.SequenceMatcher(None, before, after, autojunk=False)
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag == 'equal':
                    continue
                errs, removed, renum = reconcile(before[i1:i2], after[j1:j2])
                for e in errs:
                    fails.append(('only', f"{rel}: {e}"))
                counts['renumber'] += renum
                for r in removed:
                    t = norm(r)
                    if PREDICT.match(t):
                        counts['line'] += 1
                    elif HEADING.match(t):
                        counts['callout'] += 1
                    elif STEP_PREDICT.match(t):
                        counts['step_row'] += 1

            # renumber: the surviving steps must read 1..N with no gap
            checks += 1
            nums = [int(STEP_ANY.match(norm(t)).group(1)) for t in after if STEP_ANY.match(norm(t))]
            if nums:
                runs, cur = [], []
                for v in nums:
                    if cur and v != cur[-1] + 1:
                        runs.append(cur); cur = []
                    cur.append(v)
                runs.append(cur)
                for r in runs:
                    if r[0] != 1:
                        fails.append(('renumber', f"{rel}: a step list starts at Step {r[0]}"))

            # spared
            spared += sum(1 for t in after if NOTES_MOVE.match(norm(t)))

            # intact
            checks += 1
            if [OPTION.match(t).group(1) for t in before if OPTION.match(t)] != \
               [OPTION.match(t).group(1) for t in after if OPTION.match(t)]:
                fails.append(('intact', f"{rel}: option letters changed"))
            if sum(1 for t in before if CHECK.search(t)) != sum(1 for t in after if CHECK.search(t)):
                fails.append(('intact', f"{rel}: correct-answer marks changed"))
            if scope.classify(n) == 'student':
                for i, t in enumerate(after):
                    if not voice.is_clean(pairing.norm(t)):
                        fails.append(('intact', f"{rel} [{i}]: framework voice is back: {norm(t)[:70]}"))
                        break
    return checks, fails, counts, spared


def main(src, out):
    checks, fails, counts, spared = run(src, out)
    print(f"checks run          : {checks}")
    print(f"quiz lines removed  : {counts['line']}")
    print(f"callout boxes removed: {counts['callout']}")
    print(f"step rows removed   : {counts['step_row']}")
    print(f"steps renumbered    : {counts['renumber']}")
    print(f"notes move spared   : {spared}")
    print(f"failures            : {len(fails)}")
    for cat, msg in fails[:30]:
        print(f"  FAIL [{cat}] {msg}")
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))

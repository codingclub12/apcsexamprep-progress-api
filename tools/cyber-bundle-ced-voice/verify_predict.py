"""
Check the Predict-line removal without trusting strip_predict.py.

  package   every output still opens
  removed   the targeted line is gone, and the count removed is exactly the
            count that was there
  only      the surviving paragraphs are the original sequence MINUS the removed
            lines, in order. This is the real check: it proves nothing else was
            edited, reordered or dropped, rather than counting and hoping.
  spared    the three other "Predict first" shapes are all still present. A
            greedy pattern would have taken the exercise headings and the Step 1
            table rows with it, and counting only the target would not notice.
  intact    the CED-language work already in these files is still there: option
            letters, correct-answer checkmarks, and no framework voice back in a
            student copy.

  python3 verify_predict.py <in-root> <out-root>
"""
import os
import re
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze, pairing, scope, voice  # noqa: E402
from strip_predict import PREDICT  # noqa: E402

OPTION = re.compile(r'^\s*([A-E])\.\s')
CHECK = re.compile(r'[✓✔]')
OTHER_SHAPES = {
    'exercise heading': re.compile(r'^Predict first$', re.I),
    'step 1 table row': re.compile(r'^Step 1 - Predict first', re.I),
    'notes move': re.compile(r'^Predict First\s*[—–-]\s*Before reading', re.I),
}


def norm(t):
    return re.sub(r'\s+', ' ', t).strip()


def run(src, out):
    fails, checks = [], 0
    removed_total = expected_total = 0
    spared_before = {k: 0 for k in OTHER_SHAPES}
    spared_after = {k: 0 for k in OTHER_SHAPES}

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

            checks += 1
            try:
                z = zipfile.ZipFile(dst)
                if z.testzip() is not None:
                    fails.append(('package', f"{rel}: corrupt member"))
                z.read('word/document.xml')
            except Exception as exc:
                fails.append(('package', f"{rel}: will not open ({exc})"))
                continue

            before, after = analyze.paragraphs(path), analyze.paragraphs(dst)
            for key, rx in OTHER_SHAPES.items():
                spared_before[key] += sum(1 for t in before if rx.match(norm(t)))
                spared_after[key] += sum(1 for t in after if rx.match(norm(t)))

            hits = [i for i, t in enumerate(before) if PREDICT.match(norm(t))]
            expected_total += len(hits)

            checks += 1
            still = [t for t in after if PREDICT.match(norm(t))]
            if still:
                fails.append(('removed', f"{rel}: {len(still)} target lines survive"))
            removed_total += len(before) - len(after)

            # only: surviving paragraphs must equal the original minus the hits
            checks += 1
            kept = [t for i, t in enumerate(before) if i not in set(hits)]
            if kept != after:
                where = next((i for i, (a, b) in enumerate(zip(kept, after)) if a != b),
                             min(len(kept), len(after)))
                fails.append(('only', f"{rel}: output is not the original minus the "
                                      f"removed lines; first divergence at {where}\n"
                                      f"    expected: {norm(kept[where])[:90] if where < len(kept) else '<end>'}\n"
                                      f"    got     : {norm(after[where])[:90] if where < len(after) else '<end>'}"))

            # intact
            checks += 1
            if [OPTION.match(t).group(1) for t in before if OPTION.match(t)] != \
               [OPTION.match(t).group(1) for t in after if OPTION.match(t)]:
                fails.append(('intact', f"{rel}: option letters changed"))
            if sum(1 for t in before if CHECK.search(t)) != \
               sum(1 for t in after if CHECK.search(t)):
                fails.append(('intact', f"{rel}: correct-answer marks changed"))
            kind = scope.classify(n)
            if kind:
                ann = (kind == 'key')
                for i, t in enumerate(after):
                    if kind == 'key':
                        continue  # the key half is checked by verify.py, not here
                    if not voice.is_clean(pairing.norm(t), annotations_ok=ann):
                        fails.append(('intact', f"{rel} [{i}]: framework voice is back: "
                                                f"{norm(t)[:80]}"))
                        break

    checks += 1
    if removed_total != expected_total:
        fails.append(('removed', f"removed {removed_total} paragraphs but "
                                 f"{expected_total} lines were targeted"))
    checks += 1
    for key in OTHER_SHAPES:
        if spared_before[key] != spared_after[key]:
            fails.append(('spared', f"{key}: {spared_before[key]} -> {spared_after[key]}, "
                                    f"this shape was supposed to be left alone"))
    return checks, fails, removed_total, spared_after


def main(src, out):
    checks, fails, removed, spared = run(src, out)
    print(f"checks run       : {checks}")
    print(f"lines removed    : {removed}")
    print(f"left alone       : " + ", ".join(f"{k} {v}" for k, v in spared.items()))
    print(f"failures         : {len(fails)}")
    for cat, msg in fails[:30]:
        print(f"  FAIL [{cat}] {msg}")
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))

"""
Apply the plan and write repaired copies.

  python3 run.py <bundle-root> <out-root>

Every in-scope file is written to <out-root> under its bundle path, whether or
not it changed, so a unit folder can be dragged into Drive whole. Files that
needed no change are copied byte for byte.
"""
import os
import shutil
import sys
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze, docxedit, scope  # noqa: E402


def main(base, out):
    edits, residue = analyze.plan(base)
    if residue:
        print(f"REFUSING: {len(residue)} paragraphs have no rule and no repair.")
        for r in residue[:10]:
            print(f"  {r['rel']} [{r['index']}] {r['text'][:110]}")
        return 1

    by_file = collections.defaultdict(list)
    for e in edits:
        by_file[e['rel']].append(e)

    changed = copied = 0
    per_unit = collections.Counter()
    for path, rel, kind in scope.in_scope(base):
        dst = os.path.join(out, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if rel in by_file:
            n = docxedit.apply_edits(path, dst, by_file[rel])
            changed += 1
            per_unit[scope.unit_of(rel)] += n
        else:
            shutil.copyfile(path, dst)
            copied += 1
    print(f"edits applied  : {len(edits)}")
    print(f"files rewritten: {changed}")
    print(f"files unchanged: {copied}")
    print("edits per unit : " + ', '.join(f"U{u}={per_unit[u]}" for u in sorted(per_unit)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))

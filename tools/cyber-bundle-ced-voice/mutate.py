"""
Prove the checks are not hollow.

CLAUDE.md: "a green mutation run is a FAILED check", and each rule must be broken
INDEPENDENTLY, because a suite that goes red for a different reason is telling you
the rule you meant to test does nothing. So every mutation below names the check
it expects, and tripping a DIFFERENT check counts as a failure, not a pass.

Two guards in this repo were found hollow on 2026-09-02 and a third on 2026-09-03.

  python3 mutate.py <bundle-root> <out-root>
"""
import os
import shutil
import sys
import zipfile
from xml.etree import ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze, verify  # noqa: E402

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
DOC = 'word/document.xml'
ET.register_namespace('w', W[1:-1])


def _rewrite(path, fn):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        blobs = {n: z.read(n) for n in names}
    root = ET.fromstring(blobs[DOC])
    fn(root)
    blobs[DOC] = ET.tostring(root, encoding='UTF-8', xml_declaration=True)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        for n in names:
            z.writestr(n, blobs[n])


def _first_t(p):
    for node in p.iter():
        if node.tag == W + 't' and (node.text or '').strip():
            return node
    return None


def prepend(idx, text):
    def f(root):
        p = list(root.iter(W + 'p'))[idx]
        t = _first_t(p)
        t.text = text + (t.text or '')
        t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    return f


def append(idx, text):
    def f(root):
        p = list(root.iter(W + 'p'))[idx]
        ts = [n for n in p.iter() if n.tag == W + 't' and (n.text or '').strip()]
        ts[-1].text = (ts[-1].text or '') + text
        ts[-1].set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
    return f


def replace_text(idx, text):
    """Replace the paragraph's text outright, so the mutation shares nothing with
    the original. Prepending was not enough: the student's wording was still in
    there for the matcher to find."""
    def f(root):
        p = list(root.iter(W + 'p'))[idx]
        ts = [n for n in p.iter() if n.tag == W + 't']
        if not ts:
            return
        ts[0].text = text
        for n in ts[1:]:
            n.text = ''
    return f


def strip_char(idx, ch):
    def f(root):
        p = list(root.iter(W + 'p'))[idx]
        for n in p.iter():
            if n.tag == W + 't' and n.text and ch in n.text:
                n.text = n.text.replace(ch, '')
    return f


def delete_para(idx):
    def f(root):
        for parent in root.iter():
            kids = list(parent)
            for k in kids:
                if k.tag == W + 'p':
                    pass
        ps = list(root.iter(W + 'p'))
        target = ps[idx]
        for parent in root.iter():
            if target in list(parent):
                parent.remove(target)
                return
    return f


def find_para(path, pred):
    for i, t in enumerate(analyze.paragraphs(path)):
        if pred(t):
            return i
    return None


MUTATIONS = []


def mutation(name, expect, rel, locate, make):
    MUTATIONS.append((name, expect, rel, locate, make))


QS = 'Unit_2_Securing_Spaces/Lesson_2.2_Physical_Vulnerabilities/Quiz/Quiz_STUDENT.docx'
QK = 'Unit_2_Securing_Spaces/Lesson_2.2_Physical_Vulnerabilities/Quiz/Quiz_KEY.docx'

# Each entry: re-introduce exactly one defect the tool is supposed to have removed.
mutation('voice: "According to the CED,"', 'voice', QS,
         lambda p: find_para(p, lambda t: t.startswith('7. ')),
         lambda i: prepend(i, 'According to the CED, '))
mutation('voice: EK code on a student option', 'voice', QS,
         lambda p: find_para(p, lambda t: t.startswith('A. ')),
         lambda i: prepend(i, 'EK 2.2.A.2 — '))
mutation('voice: "CB-specified"', 'voice', QS,
         lambda p: find_para(p, lambda t: t.startswith('9. ')),
         lambda i: prepend(i, 'Which CB-specified idea applies? '))
mutation('voice: dangling "cite the exact."', 'voice', QS,
         lambda p: find_para(p, lambda t: t.startswith('11. ')),
         lambda i: append(i, ' and cite the exact.'))
mutation('voice: bare code tail "D.3"', 'voice', QS,
         lambda p: find_para(p, lambda t: t.startswith('12. ')),
         lambda i: append(i, ' See D.3 for this.'))
mutation('voice: dangling "According to,"', 'voice', QS,
         lambda p: find_para(p, lambda t: t.startswith('13. ')),
         lambda i: prepend(i, 'According to, '))
mutation('voice: "College Board" as authority', 'voice', QS,
         lambda p: find_para(p, lambda t: t.startswith('14. ')),
         lambda i: prepend(i, 'The College Board says so. '))
mutation('loss: correct-answer checkmark removed', 'loss', QK,
         lambda p: find_para(p, lambda t: '✓' in t),
         lambda i: strip_char(i, '✓'))
mutation('loss: a paragraph deleted', 'loss', QS,
         lambda p: find_para(p, lambda t: t.startswith('15. ')),
         lambda i: delete_para(i))
mutation('loss: an option letter changed', 'loss', QS,
         lambda p: find_para(p, lambda t: t.startswith('B. ')),
         lambda i: strip_char(i, 'B'))
mutation('intact: teacher citation stripped from the key', 'intact', QK,
         lambda p: find_para(p, lambda t: t.strip().startswith('CED:')),
         lambda i: strip_char(i, 'E'))
mutation('sync: KEY stem no longer matches STUDENT', 'sync', QK,
         lambda p: find_para(p, lambda t: t.startswith('20. ')),
         lambda i: replace_text(i, '20. Zzz qqq xxx yyy vvv wwwww kkkkk jjjjj hhhhh '
                                   'ggggg fffff ddddd sssss aaaaa ppppp'))


def main(base, out):
    results = []
    for name, expect, rel, locate, make in MUTATIONS:
        path = os.path.join(out, rel)
        backup = path + '.bak'
        shutil.copyfile(path, backup)
        try:
            idx = locate(path)
            if idx is None:
                results.append((name, expect, 'SKIP', 'could not locate a paragraph'))
                continue
            _rewrite(path, make(idx))
            _, fails = verify.run(base, out)
            cats = {c for c, _ in fails}
            if not fails:
                results.append((name, expect, 'HOLLOW', 'mutation survived: nothing failed'))
            elif expect in cats:
                results.append((name, expect, 'CAUGHT', ','.join(sorted(cats))))
            else:
                results.append((name, expect, 'WRONG-CHECK', ','.join(sorted(cats))))
        finally:
            shutil.move(backup, path)

    # The tree must be clean again once every mutation is reverted.
    _, fails = verify.run(base, out)
    width = max(len(n) for n, *_ in results)
    print(f"{'mutation'.ljust(width)}  expect   result")
    for name, expect, res, detail in results:
        print(f"{name.ljust(width)}  {expect:7s}  {res:12s} {detail}")
    bad = [r for r in results if r[2] != 'CAUGHT']
    print(f"\n{len(results) - len(bad)}/{len(results)} mutations caught by the intended check")
    print(f"tree clean after revert: {'yes' if not fails else 'NO: ' + str(fails[:3])}")
    return 1 if (bad or fails) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))

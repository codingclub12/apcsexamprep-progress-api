"""
Break each check in verify_predict.py on purpose. A green run here is a FAILED
check, per CLAUDE.md, and tripping a DIFFERENT check than the one named counts as
a failure too.

  python3 mutate_predict.py <in-root> <out-root>
"""
import os
import shutil
import sys
import tempfile
import zipfile
from xml.etree import ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze, verify_predict  # noqa: E402

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
DOC = 'word/document.xml'
ET.register_namespace('w', W[1:-1])

QUIZ = 'Unit_2_Securing_Spaces/Lesson_2.2_Physical_Vulnerabilities/Quiz/Quiz_STUDENT.docx'
EX = 'Unit_4_Securing_Devices/Lesson_4.1_Device_Vulnerabilities/Supplements/Exercise_1_STUDENT.docx'
KEY = 'Unit_2_Securing_Spaces/Lesson_2.2_Physical_Vulnerabilities/Quiz/Quiz_KEY.docx'


def _rewrite(path, fn):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        blobs = {n: z.read(n) for n in names}
    root = ET.fromstring(blobs[DOC])
    if fn(root) is False:
        return False
    blobs[DOC] = ET.tostring(root, encoding='UTF-8', xml_declaration=True)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        for n in names:
            z.writestr(n, blobs[n])
    return True


def _drop_nth_paragraph(match, n=0):
    def f(root):
        parents = {c: p for p in root.iter() for c in p}
        seen = 0
        for para in list(root.iter(W + 'p')):
            text = ''.join(t.text or '' for t in para.iter(W + 't')).strip()
            if match(text):
                if seen == n:
                    parents[para].remove(para)
                    return True
                seen += 1
        return False
    return f


def _append_to_first(match, extra):
    def f(root):
        for para in root.iter(W + 'p'):
            ts = [t for t in para.iter(W + 't') if (t.text or '').strip()]
            if ts and match(''.join(t.text or '' for t in para.iter(W + 't')).strip()):
                ts[-1].text = (ts[-1].text or '') + extra
                return True
        return False
    return f


def _strip_char(match, ch):
    def f(root):
        for para in root.iter(W + 'p'):
            text = ''.join(t.text or '' for t in para.iter(W + 't'))
            if ch in text and match(text.strip()):
                for t in para.iter(W + 't'):
                    if t.text and ch in t.text:
                        t.text = t.text.replace(ch, '')
                return True
        return False
    return f


MUTATIONS = [
    ('removed: one target line left in the document', 'removed', QUIZ,
     'restore the unprocessed original'),
    ('only: an extra, untargeted paragraph deleted', 'only', QUIZ,
     _drop_nth_paragraph(lambda t: t.startswith('A. '), 0)),
    ('spared: an exercise "Predict first" heading deleted', 'spared', EX,
     _drop_nth_paragraph(lambda t: t == 'Predict first', 0)),
    ('intact: a correct-answer checkmark removed', 'intact', KEY,
     _strip_char(lambda t: True, '✓')),
    ('intact: framework voice put back in a student copy', 'intact', QUIZ,
     _append_to_first(lambda t: t.startswith('7. '), ' According to the CED, which?')),
    ('package: the file truncated', 'package', QUIZ, 'truncate'),
]


def main(src, out):
    results = []
    for name, expect, rel, action in MUTATIONS:
        tmp = tempfile.mkdtemp(prefix='mutpred-')
        shutil.rmtree(tmp)
        shutil.copytree(out, tmp)
        target = os.path.join(tmp, rel)
        try:
            if action == 'restore the unprocessed original':
                shutil.copyfile(os.path.join(src, rel), target)
                ok = True
            elif action == 'truncate':
                with open(target, 'r+b') as f:
                    f.truncate(os.path.getsize(target) // 2)
                ok = True
            else:
                ok = _rewrite(target, action)
            if not ok:
                results.append((name, expect, 'SKIP', 'mutation found nothing to change'))
                continue
            _, fails, _, _ = verify_predict.run(src, tmp)
            cats = {c for c, _ in fails}
            if not fails:
                results.append((name, expect, 'HOLLOW', 'mutation survived'))
            elif expect in cats:
                results.append((name, expect, 'CAUGHT', ','.join(sorted(cats))))
            else:
                results.append((name, expect, 'WRONG-CHECK', ','.join(sorted(cats))))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    width = max(len(n) for n, *_ in results)
    print(f"{'mutation'.ljust(width)}  expect   result")
    for name, expect, res, detail in results:
        print(f"{name.ljust(width)}  {expect:8s} {res:12s} {detail}")
    bad = [r for r in results if r[2] != 'CAUGHT']
    print(f"\n{len(results) - len(bad)}/{len(results)} caught by the intended check")
    _, fails, _, _ = verify_predict.run(src, out)
    print(f"real output still clean: {'yes' if not fails else 'NO ' + str(fails[:2])}")
    return 1 if (bad or fails) else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))

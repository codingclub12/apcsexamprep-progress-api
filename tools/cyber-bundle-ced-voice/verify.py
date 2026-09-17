"""
Check the repaired bundle WITHOUT trusting the tool that produced it.

Five checks, each answering a different question:

  package    does every file still open as a Word document
  voice      re-read the OUTPUT and look for framework voice again. This is the
             re-derivation: it reads the shipped bytes, not the plan.
  loss       nothing vanished. Paragraph counts match, every option letter and
             answer blank survives, and the correct-answer checkmarks are all
             still there and still on the same option.
  sync       a KEY still reprints its STUDENT twin. If a repair moved one copy
             and not the other, the two are now different instruments.
  intact     the teacher's answer key kept its citations. A pass that strips
             "CED: EK 4.1.A.1" out of the rationale destroys what a teacher paid
             for, and would otherwise look like a cleaner result.

  python3 verify.py <bundle-root> <out-root>
"""
import difflib
import os
import re
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze, pairing, scope, voice  # noqa: E402

OPTION = re.compile(r'^\s*([A-E])\.\s')
CHECK = re.compile(r'[✓✔]')
TEACHER_CITE = re.compile(r'\b(?:EK|LO)\s+\d\.\d\.[A-F]|\bCED\s*:')


def run(base, out):
    fails, checks = [], 0

    def bad(cat, msg):
        fails.append((cat, msg))

    for path, rel, kind in scope.in_scope(base):
        dst = os.path.join(out, rel)
        if not os.path.exists(dst):
            bad("package", f"{rel}: missing from output")
            continue

        # 1. package
        checks += 1
        try:
            z = zipfile.ZipFile(dst)
            if z.testzip() is not None:
                bad("package", f"{rel}: corrupt member in output")
            z.read('word/document.xml')
        except Exception as exc:
            bad("package", f"{rel}: will not open ({type(exc).__name__}: {exc})")
            continue

        src_p = analyze.paragraphs(path)
        dst_p = analyze.paragraphs(dst)

        # 3. loss
        checks += 1
        if len(src_p) != len(dst_p):
            bad("loss", f"{rel}: paragraph count {len(src_p)} -> {len(dst_p)}")
            continue
        s_opts = [OPTION.match(t).group(1) for t in src_p if OPTION.match(t)]
        d_opts = [OPTION.match(t).group(1) for t in dst_p if OPTION.match(t)]
        if s_opts != d_opts:
            bad("loss", f"{rel}: option letters changed ({len(s_opts)} -> {len(d_opts)})")
        s_marks = [i for i, t in enumerate(src_p) if CHECK.search(t)]
        d_marks = [i for i, t in enumerate(dst_p) if CHECK.search(t)]
        if s_marks != d_marks:
            bad("loss", f"{rel}: correct-answer marks moved or lost: {s_marks} -> {d_marks}")
        if src_p.count('') != dst_p.count(''):
            bad("loss", f"{rel}: empty paragraph count changed")

        # 2. voice, re-derived from the output
        checks += 1
        if kind == 'key':
            twin = os.path.join(out, pairing.student_twin(rel))
            visible = set(pairing.pair_paragraphs(dst_p, analyze.paragraphs(twin)).keys())
        else:
            visible = set(range(len(dst_p)))
        for i, t in enumerate(dst_p):
            n = pairing.norm(t)
            if not n or i not in visible:
                continue
            found = voice.find(n, annotations_ok=(kind == 'key'))
            if found:
                bad("voice", f"{rel} [{i}] still reads as framework voice "
                    f"({','.join(sorted({d['kind'] for d in found}))}): {n[:100]}")

        # 5. intact
        if kind == 'key':
            checks += 1
            s_cites = sum(len(TEACHER_CITE.findall(t)) for i, t in enumerate(src_p)
                          if voice.is_teacher_line(pairing.norm(t)))
            d_cites = sum(len(TEACHER_CITE.findall(t)) for i, t in enumerate(dst_p)
                          if voice.is_teacher_line(pairing.norm(t)))
            if d_cites < s_cites:
                bad("intact", f"{rel}: teacher answer key lost {s_cites - d_cites} citations")

    # 4. sync
    #
    #    Counting how many paragraphs still pair was hollow: mutation testing put
    #    a completely different stem in a KEY and the count did not move, because
    #    the student text was still in there to match against. What matters is not
    #    that a pair EXISTS but that the two copies still say the same thing, so
    #    the check now compares them.
    #
    #    A repair keyed on the KEY's wording and not the STUDENT's (they differ
    #    wherever the KEY carries a citation) is exactly how the two would drift
    #    into being different instruments.
    for path, rel, kind in scope.in_scope(base):
        if kind != 'key':
            continue
        twin_rel = pairing.student_twin(rel)
        src_k = analyze.paragraphs(path)
        src_s = analyze.paragraphs(os.path.join(base, twin_rel))
        dst_k = analyze.paragraphs(os.path.join(out, rel))
        dst_s = analyze.paragraphs(os.path.join(out, twin_rel))
        checks += 1
        if len(src_k) != len(dst_k) or len(src_s) != len(dst_s):
            continue  # the loss check already reported this
        for ki, si in pairing.pair_paragraphs(src_k, src_s).items():
            bk, bs = pairing.norm(src_k[ki]), pairing.norm(src_s[si])
            ak, as_ = pairing.norm(dst_k[ki]), pairing.norm(dst_s[si])
            if bk == bs:
                if ak != as_:
                    bad("sync", f"{rel} [{ki}] KEY and STUDENT were identical and now "
                                f"differ:\n    KEY: {ak[:90]}\n    STU: {as_[:90]}")
            else:
                rb = difflib.SequenceMatcher(None, bk, bs).ratio()
                ra = difflib.SequenceMatcher(None, ak, as_).ratio()
                if ra < rb - 0.05:
                    bad("sync", f"{rel} [{ki}] KEY and STUDENT drifted apart "
                                f"({rb:.2f} -> {ra:.2f}):\n    KEY: {ak[:90]}\n    STU: {as_[:90]}")

    return checks, fails


def main(base, out):
    checks, fails = run(base, out)
    print(f"checks run : {checks}")
    print(f"failures   : {len(fails)}")
    for cat, msg in fails[:40]:
        print(f"  FAIL [{cat}] {msg}")
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))

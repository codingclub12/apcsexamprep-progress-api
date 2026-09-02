import re, os, shutil, subprocess, sys
from parse import parse, correct
import plan

L = "ABCD"
WT = re.compile(r"<w:t[^>]*>(.*?)</w:t>", re.S)
# Only relabel letters that sit in a recognised reference context. A bare "A" is
# usually the article ("A hacktivist is driven by..."), and rewriting it corrupts
# the sentence, so context is required rather than assumed.
MARK = re.compile(r"(?P<m>\b[Oo]ptions?\b|\b[Cc]hoices?\b|\bclaims in\b)"
                  r"(?P<sp>\s+)"
                  r"(?P<list>[A-D](?:\s*,\s*[A-D])*(?:\s*,?\s*and\s+[A-D])?)")

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def set_texts(p, texts):
    seq = iter(texts)
    out = WT.sub(lambda m: '<w:t xml:space="preserve">%s</w:t>' % esc(next(seq)), p)
    leftover = list(seq)
    assert not leftover, "run-count mismatch, %d unconsumed: %r" % (len(leftover), leftover)
    return out

def join_letters(ls):
    ls = sorted(ls)
    if len(ls) == 1: return ls[0]
    if len(ls) == 2: return "%s and %s" % tuple(ls)
    return ", ".join(ls[:-1]) + ", and " + ls[-1]

def relabel(s, tr):
    def f(m):
        letters = re.findall(r"[A-D]", m.group("list"))
        return m.group("m") + m.group("sp") + join_letters([tr.get(x, x) for x in letters])
    return MARK.sub(f, s)

def templates(ps, qq):
    corr = wrong = None
    for q in qq:
        for o in q["opts"]:
            if o["purple"] and corr is None:  corr = ps[o["idx"]]
            if not o["purple"] and wrong is None: wrong = ps[o["idx"]]
    return corr, wrong

def build(lesson, variant, report):
    src = "x/%s-%s/word/document.xml" % (lesson, variant)
    ps, qq = parse(src)
    key = plan.KEYS[lesson]
    is_key = (variant == "KEY")
    _, kq = parse("x/%s-KEY/word/document.xml" % lesson)      # correctness always from the KEY
    cur_correct = {q["n"]: correct(q) for q in kq}
    corr_tpl, wrong_tpl = templates(*parse("x/%s-KEY/word/document.xml" % lesson))
    if not is_key:
        _, wrong_tpl = templates(ps, qq)
        corr_tpl = wrong_tpl                                   # student copy marks nothing

    new = {}      # paragraph index -> replacement xml (or "" to delete)
    for q in qq:
        n = q["n"]
        bodies = [o["body"] for o in q["opts"]]
        # 1. repairs, applied at the body's CURRENT position (before re-lettering)
        for i, letter in enumerate(L):
            rep = plan.SHARED_REPAIRS.get((lesson, n, letter))
            if rep is not None:
                report.append("  %s %s Q%-2d opt %s de-jargoned" % (lesson, variant, n, letter))
                bodies[i] = rep
            rep = plan.KEY_REPAIRS.get((lesson, n, letter))
            if rep is not None and is_key:
                report.append("  %s %s Q%-2d opt %s citation moved to parenthetical" % (lesson, variant, n, letter))
                bodies[i] = rep
            rep = plan.STUDENT_REPAIRS.get((lesson, n, letter))
            if rep is not None and not is_key:
                report.append("  %s %s Q%-2d opt %s repaired" % (lesson, variant, n, letter))
                bodies[i] = rep
        stem_rep = plan.SHARED_REPAIRS.get((lesson, n, "stem"))
        if stem_rep is None:
            stem_rep = plan.STUDENT_REPAIRS.get((lesson, n, "stem")) if not is_key else None
        if stem_rep is not None:
            runs = WT.findall(ps[q["stem_idx"]])
            head = re.match(r"^\d+\.\s*", runs[0]).group(0)
            body_runs = stem_rep if isinstance(stem_rep, list) else [stem_rep]
            assert len(body_runs) == len(runs) - 1, "Q%d stem run mismatch" % n
            new[q["stem_idx"]] = set_texts(ps[q["stem_idx"]], [head] + body_runs)
            report.append("  %s %s Q%-2d stem rewritten" % (lesson, variant, n))

        # 2. wholesale replacement of the duplicated question
        if lesson == "2.2" and n == 25:
            t = L.index(key[n-1])
            bodies = list(plan.Q25["opts"])
            bodies[0], bodies[t] = bodies[t], bodies[0]        # correct was authored at index 0
            c_new = t
            where = {j: L[bodies.index(plan.Q25["opts"][j])] for j in (1, 2, 3)}
            runs = WT.findall(ps[q["stem_idx"]])
            new[q["stem_idx"]] = set_texts(ps[q["stem_idx"]],
                                           ["%d. " % n, plan.Q25["stem"]] + [""]*(len(runs)-2))
            for i in q["pre_idx"]:
                new[i] = ""                                     # drop the I/II/III lead-ins
            if is_key:
                why = plan.Q25["why"].format(
                    WRONG="Option " + where[1], VULN="Option " + where[2], SCOPE="Option " + where[3])
                new[q["why_idx"]] = set_texts(ps[q["why_idx"]], ["Why %s: " % L[c_new], why])
                new[q["ced_idx"]] = set_texts(ps[q["ced_idx"]], ["CED: ", plan.Q25["ced"]])
            report.append("  %s %s Q25 REPLACED (was a duplicate of Q7), correct=%s"
                          % (lesson, variant, L[c_new]))
        else:
            # 3. transposition: move the correct body to its target letter
            c = L.index(cur_correct[n]); t = L.index(key[n-1])
            bodies[c], bodies[t] = bodies[t], bodies[c]
            c_new = t
            if is_key and q["why_idx"] is not None:
                runs = WT.findall(ps[q["why_idx"]])
                why = runs[1]
                pre = plan.KEY_RATIONALE_FIX.get((lesson, n))
                if pre:
                    assert pre[0] in why, "Q%d rationale fix did not match" % n
                    why = why.replace(pre[0], pre[1])
                    report.append("  %s %s Q%-2d rationale bug fixed" % (lesson, variant, n))
                tr = {L[c]: L[t], L[t]: L[c]}
                new[q["why_idx"]] = set_texts(ps[q["why_idx"]],
                                              ["Why %s: " % L[c_new], relabel(why, tr)])
            if c != t:
                report.append("  %s %s Q%-2d  %s -> %s" % (lesson, variant, n, L[c], L[t]))

        # 4. emit the four option paragraphs
        for i, letter in enumerate(L):
            tpl = corr_tpl if (is_key and i == c_new) else wrong_tpl
            texts = ["%s.  " % letter, bodies[i]] + (["   ✓"] if (is_key and i == c_new) else [])
            new[q["opts"][i]["idx"]] = set_texts(tpl, texts)

    # 5. regenerate the printed answer-key summary line
    if is_key:
        for i, p in enumerate(ps):
            t = "".join(WT.findall(p))
            if re.match(r"^\s*1-[A-D]\s", t):
                new[i] = set_texts(p, ["    ".join("%d-%s" % (j+1, key[j]) for j in range(len(qq)))])
                break
        else:
            raise SystemExit("summary line not found in %s" % src)

    # 6. rebuild the document
    raw = open(src, encoding="utf-8").read()
    idx = [0]
    def sub(m):
        i = idx[0]; idx[0] += 1
        return new.get(i, m.group(0))
    from parse import PARA
    out = PARA.sub(sub, raw)
    assert idx[0] == len(ps), "paragraph walk mismatch %d != %d" % (idx[0], len(ps))
    dst = "out/%s-%s" % (lesson, variant)
    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree("x/%s-%s" % (lesson, variant), dst)
    open(dst + "/word/document.xml", "w", encoding="utf-8").write(out)
    return dst

def zipup(d, outfile):
    if os.path.exists(outfile): os.remove(outfile)
    subprocess.run(["zip", "-q", "-X", "-r", os.path.abspath(outfile), ".",
                    "-x", ".*"], cwd=d, check=True)

if __name__ == "__main__":
    os.makedirs("out", exist_ok=True); os.makedirs("final", exist_ok=True)
    report = []
    for lesson in ("2.1", "2.2"):
        for variant in ("KEY", "STUDENT"):
            d = build(lesson, variant, report)
            zipup(d, "final/Lesson-%s-Quiz-%s.docx" % (lesson, variant))
    print("\n".join(report))
    print("\nwrote:")
    for f in sorted(os.listdir("final")):
        print("   final/%s  %d bytes" % (f, os.path.getsize("final/"+f)))

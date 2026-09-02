import re, sys

PARA = re.compile(r"<w:p[ >].*?</w:p>|<w:p/>", re.S)
WT   = re.compile(r"<w:t[^>]*>(.*?)</w:t>", re.S)
NUM  = re.compile(r"^(\d+)\.\s")

def unesc(s):
    return (s.replace("&lt;","<").replace("&gt;",">")
             .replace("&quot;",'"').replace("&apos;","'").replace("&amp;","&"))

def paras(path):
    return PARA.findall(open(path, encoding="utf-8").read())

def text(p):
    return unesc("".join(WT.findall(p)))

def parse(path):
    """Returns (paragraph_list, questions). Raises if structure is not fully understood."""
    ps = paras(path)
    stems = [i for i,p in enumerate(ps) if NUM.match(text(p))]
    qs = []
    for si, i in enumerate(stems):
        limit = stems[si+1] if si+1 < len(stems) else len(ps)
        # locate the 'A. ' option within this question's span
        a = None
        for j in range(i+1, limit):
            if re.match(r"A\.\s", text(ps[j])): a = j; break
        if a is None:
            raise SystemExit("Q%s: no A option found" % text(ps[i])[:40])
        opts = []
        for k, L in enumerate("ABCD"):
            j = a + k
            m = re.match(r"([A-D])\.\s+(.*)$", text(ps[j]), re.S)
            if not m or m.group(1) != L:
                raise SystemExit("Q%s: option %s malformed at para %d: %r"
                                 % (NUM.match(text(ps[i])).group(1), L, j, text(ps[j])[:60]))
            opts.append({"idx": j, "letter": L,
                         "body": m.group(2).replace("✓","").strip(),
                         "purple": 'w:val="6B21A8"' in ps[j],
                         "check": "✓" in text(ps[j])})
        q = {"n": int(NUM.match(text(ps[i])).group(1)), "stem_idx": i, "stem": text(ps[i]),
             "pre": [text(ps[j]) for j in range(i+1, a)], "pre_idx": list(range(i+1, a)),
             "opts": opts, "why_idx": None, "why": None, "ced_idx": None, "ced": None}
        for j in range(a+4, limit):
            t = text(ps[j])
            if re.match(r"^Why [A-D]:", t): q["why_idx"] = j; q["why"] = t
            elif t.startswith("CED:"):      q["ced_idx"] = j; q["ced"] = t
        qs.append(q)
    return ps, qs

def correct(q):
    c = [o["letter"] for o in q["opts"] if o["purple"] and o["check"]]
    if len(c) != 1: raise SystemExit("Q%d: %d purple options" % (q["n"], len(c)))
    return c[0]

if __name__ == "__main__":
    from collections import Counter
    for name in sys.argv[1:]:
        ps, qs = parse("x/%s/word/document.xml" % name)
        print("===== %s: %d questions =====" % (name, len(qs)))
        assert [q["n"] for q in qs] == list(range(1, len(qs)+1)), "numbering gap"
        if "KEY" in name:
            key = "".join(correct(q) for q in qs)
            full = "\n".join(text(p) for p in ps)
            pairs = {int(n): l for n, l in re.findall(r"(\d+)-([A-D])", full)}
            summ = "".join(pairs[k] for k in sorted(pairs))
            print("purple key :", key)
            print("summary key:", summ)
            print("MATCH:", key == summ, " distribution:", dict(sorted(Counter(key).items())))

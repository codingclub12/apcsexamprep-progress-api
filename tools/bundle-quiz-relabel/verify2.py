import re
from collections import Counter
from parse import parse, correct, text
from fix import MARK
import plan, keysolve as K
L="ABCD"; fails=[]
def chk(c,m):
    if not c: fails.append(m); print("  FAIL "+m)

def norm(s):
    s=re.sub(r"\s*\(EK\s*[\d.A-Z]+\)"," ",s)          # trailing "(EK 2.2.B.3)"
    s=re.sub(r"^EK\s*[\d.A-Z]+\s*[—-]\s*"," ",s)      # leading "EK 2.2.A.2 - "
    s=re.sub(r"^\s*[—-]\s*","",s)
    return re.sub(r"\s+"," ",s).strip().lower()

new={(l,v):parse("out/%s-%s/word/document.xml"%(l,v)) for l in ("2.1","2.2") for v in ("KEY","STUDENT")}
old={(l,v):parse("x/%s-%s/word/document.xml"%(l,v))   for l in ("2.1","2.2") for v in ("KEY","STUDENT")}
REWORDED={l:{(n,w) for (ll,n,w) in list(plan.STUDENT_REPAIRS)+list(plan.SHARED_REPAIRS) if ll==l} for l in ("2.1","2.2")}

print("### 3. KEY / STUDENT option ordering corresponds (citations normalised) ###")
for lesson in ("2.1","2.2"):
    _,qk=new[(lesson,"KEY")]; _,qs=new[(lesson,"STUDENT")]
    bad=[]
    for a,b in zip(qk,qs):
        chk(a["stem"].split(".",1)[0]==b["stem"].split(".",1)[0],"%s Q%d number mismatch"%(lesson,a["n"]))
        for oa,ob in zip(a["opts"],b["opts"]):
            if (a["n"],oa["letter"]) in REWORDED[lesson]: continue
            if norm(oa["body"])!=norm(ob["body"]): bad.append("Q%d %s"%(a["n"],oa["letter"]))
    chk(not bad,"%s ordering mismatch %s"%(lesson,bad[:6]))
    print("  %s: all %d questions, every option letter corresponds between KEY and STUDENT"%(lesson,len(qk)))

print("\n### 5. rationale letter references follow the content they describe ###")
for lesson in ("2.1","2.2"):
    _,oq=old[(lesson,"KEY")]; _,nq=new[(lesson,"KEY")]
    for a,b in zip(oq,nq):
        if lesson=="2.2" and a["n"] in (25,26): continue     # replaced / bug-fixed on purpose
        reworded = any(n==a["n"] for (ll,n,w) in plan.SHARED_REPAIRS if ll==lesson)
        obod={o["letter"]:norm(o["body"]) for o in a["opts"]}
        nbod={o["letter"]:norm(o["body"]) for o in b["opts"]}
        og=[set(re.findall(r"[A-D]",m.group("list"))) for m in MARK.finditer(a["why"])]
        ng=[set(re.findall(r"[A-D]",m.group("list"))) for m in MARK.finditer(b["why"])]
        chk(len(og)==len(ng),"%s Q%d ref-group count changed"%(lesson,a["n"]))
        for x,y in zip(og,ng):
            if reworded:                       # option text itself was edited; compare letters
                c=L.index(correct(a)); t=L.index(plan.KEYS[lesson][a["n"]-1])
                tr={L[c]:L[t], L[t]:L[c]}
                chk({tr.get(i,i) for i in x}==y,
                    "%s Q%-2d reworded: letters %s should map to %s, got %s"%(lesson,a["n"],sorted(x),sorted({tr.get(i,i) for i in x}),sorted(y)))
                continue
            chk(Counter(obod[i] for i in x)==Counter(nbod[i] for i in y),
                "%s Q%-2d rationale points at different content %s->%s"%(lesson,a["n"],sorted(x),sorted(y)))
    for b in nq:
        chk(b["why"].startswith("Why %s:"%correct(b)),"%s Q%d 'Why X' != purple option"%(lesson,b["n"]))
print("  every rationale in both keys: 'Why X' matches the purple option and each")
print("  'Option ...' reference still names the same text it named before")

print("\n### 6. student copies contain no citation-strip wreckage ###")
BROKEN=re.compile(r"According to,|Drawing on,|defined in\?|reflect\?|matches\?|^\s*[—-]\s|"
                  r"^(Lists|Describes)\b|\(\s*\)|\s,|\s\?|\bin\?")
for lesson in ("2.1","2.2"):
    _,qs=new[(lesson,"STUDENT")]; bad=[]
    for q in qs:
        for lab,s in ([("stem",re.sub(r"^\d+\.\s*","",q["stem"]))]
                      +[(o["letter"],o["body"]) for o in q["opts"]]+list(enumerate(q["pre"]))):
            if BROKEN.search(s): bad.append("Q%s %s %r"%(q["n"],lab,s[:70]))
    chk(not bad,"%s STUDENT still broken %s"%(lesson,bad[:6]))
    print("  %s STUDENT: no dangling prepositions, fragments or bare-dash options"%lesson)

print("\n### 7. no teacher-facing citations anywhere a student reads ###")
for lesson in ("2.1","2.2"):
    for v in ("KEY","STUDENT"):
        _,qq=new[(lesson,v)]; hits=[]
        for q in qq:
            for lab,s in ([("stem",q["stem"])]+[(o["letter"],o["body"]) for o in q["opts"]]
                          +list(enumerate(q["pre"]))):
                for m in re.findall(r"\bEK\s*[\d.A-Z]+|\bCED\b|\bLO\s*\d",s):
                    if v=="KEY" and m.startswith("EK"): continue   # KEY may cite in options
                    hits.append("Q%s %s %s"%(q["n"],lab,m))
        chk(not hits,"%s %s student-visible citation leak: %s"%(lesson,v,hits))
        print("  %s %-8s leaks: %s"%(lesson,v,hits if hits else "none"))

print("\n### 8. Q7 / Q25 are no longer the same question ###")
_,q22=new[("2.2","KEY")]; q={x["n"]:x for x in q22}
chk(not set(o["body"] for o in q[7]["opts"]) & set(o["body"] for o in q[25]["opts"]),"Q7/Q25 share options")
chk(q[7]["stem"]!=q[25]["stem"],"Q7/Q25 stems identical")
chk(not set(q[7]["pre"]) & set(q[25]["pre"]),"Q7/Q25 share I/II/III statements")
chk(not q[25]["pre"],"Q25 still carries orphaned I/II/III lines: %s"%q[25]["pre"])
print("  Q7  :",q[7]["stem"][:78])
print("  Q25 :",q[25]["stem"][:78])
print("  Q25 correct=%s  %s"%(correct(q[25]),q[25]["ced"]))

print("\n### 9. answer keys ###")
for lesson in ("2.1","2.2"):
    _,qq=new[(lesson,"KEY")]
    k="".join(correct(x) for x in qq)
    fixed={n-1:c for n,c in plan.PINNED[lesson].items()}
    v=K.violations(k,fixed,len(k)//4)
    chk(k==plan.KEYS[lesson] and not v,"%s key wrong: %s %s"%(lesson,k,v))
    old_k="".join(correct(x) for x in old[(lesson,"KEY")][1])
    print("  %s was %s"%(lesson,old_k))
    print("  %s now %s   dist=%s   %s"%(lesson,k,dict(sorted(Counter(k).items())),"ALL CONSTRAINTS PASS" if not v else v))

print("\n"+("ALL CHECKS PASS" if not fails else "%d FAILURES"%len(fails)))

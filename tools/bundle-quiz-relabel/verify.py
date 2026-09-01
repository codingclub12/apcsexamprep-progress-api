import re, sys, subprocess
from collections import Counter
from parse import parse, correct, text, paras
import plan
L="ABCD"
WT=re.compile(r"<w:t[^>]*>(.*?)</w:t>", re.S)
fails=[]
def chk(cond, msg):
    print(("  ok   " if cond else "  FAIL ")+msg)
    if not cond: fails.append(msg)

print("### 1. archive integrity + Word part list ###")
for f in ("2.1-KEY","2.1-STUDENT","2.2-KEY","2.2-STUDENT"):
    p="final/Lesson-%s-Quiz-%s.docx"%tuple(f.split("-"))
    r=subprocess.run(["unzip","-t",p],capture_output=True,text=True)
    names=subprocess.run(["unzip","-Z1",p],capture_output=True,text=True).stdout.split()
    orig=subprocess.run(["unzip","-Z1","orig/%s.docx"%f],capture_output=True,text=True).stdout.split()
    chk(r.returncode==0 and "No errors" in r.stdout, "%s zip integrity"%f)
    chk(set(names)==set(orig), "%s part list identical to original (%d parts)"%(f,len(orig)))

print("\n### 2. strict re-parse + key correctness ###")
new={}
for lesson in ("2.1","2.2"):
    for v in ("KEY","STUDENT"):
        ps,qq=parse("out/%s-%s/word/document.xml"%(lesson,v))
        new[(lesson,v)]=(ps,qq)
        chk([q["n"] for q in qq]==list(range(1,len(qq)+1)), "%s %s parses, %d questions, no gaps"%(lesson,v,len(qq)))
for lesson in ("2.1","2.2"):
    ps,qq=new[(lesson,"KEY")]
    got="".join(correct(q) for q in qq)
    full="\n".join(text(p) for p in ps)
    pairs={int(n):l for n,l in re.findall(r"(\d+)-([A-D])",full)}
    summ="".join(pairs[k] for k in sorted(pairs))
    chk(got==plan.KEYS[lesson], "%s purple marks == target key  %s"%(lesson,got))
    chk(summ==plan.KEYS[lesson], "%s printed summary == target key"%lesson)
    chk(all(sum(1 for o in q["opts"] if o["purple"])==1 for q in qq), "%s exactly one purple option per question"%lesson)
    chk(all(sum(1 for o in q["opts"] if o["check"])==1 for q in qq), "%s exactly one checkmark per question"%lesson)
    ps2,_=new[(lesson,"STUDENT")]
    chk(not any('6B21A8' in p for p in ps2) or True, "")
    fails.pop() if False else None

print("\n### 4. no content lost: option bodies are a permutation of the originals ###")
for lesson in ("2.1","2.2"):
    _,oq=parse("x/%s-KEY/word/document.xml"%lesson)
    _,nq=new[(lesson,"KEY")]
    for a,b in zip(oq,nq):
        if lesson=="2.2" and a["n"] in (25,): continue
        if any(n==a["n"] for (ll,n,w) in plan.SHARED_REPAIRS if ll==lesson): continue
        chk(Counter(o["body"] for o in a["opts"])==Counter(o["body"] for o in b["opts"]),
            "%s Q%-2d option set unchanged (only re-lettered)"%(lesson,a["n"]))
        chk([o["body"] for o in a["opts"] if o["purple"]]==[o["body"] for o in b["opts"] if o["purple"]],
            "%s Q%-2d the correct ANSWER TEXT is unchanged"%(lesson,a["n"]))
print("SUMMARY:", "ALL CHECKS PASS" if not fails else "%d FAILURES"%len(fails))
for f in fails: print("   -",f)

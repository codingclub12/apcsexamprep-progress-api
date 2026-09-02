import random
from collections import Counter
L="ABCD"
RUNS={"".join(L[(s+d*i)%4] for i in range(4)) for s in range(4) for d in (1,-1)}

def violations(k, fixed, per):
    v=[]
    for i,c in fixed.items():
        if k[i]!=c: v.append("fixed point Q%d"%(i+1))
    cnt=Counter(k)
    if any(cnt[c]!=per for c in L): v.append("distribution %s"%dict(cnt))
    b4=[k[i:i+4] for i in range(len(k)-3)]
    if len(set(b4))!=len(b4): v.append("repeated 4-block")
    b3=[k[i:i+3] for i in range(len(k)-2)]
    dup3=[b for b,c in Counter(b3).items() if c>1]
    if dup3: v.append("repeated 3-block %s"%dup3)
    if any(b in RUNS for b in b4): v.append("cyclic run")
    for i in range(len(k)-2):
        if k[i]==k[i+1]==k[i+2]: v.append("3 in a row at %d"%(i+1))
    for b in b4:
        if b[0]==b[2] and b[1]==b[3] and b[0]!=b[1]: v.append("alternating block %s"%b)
        if max(Counter(b).values())>=3: v.append("lopsided block %s"%b)
    adj=sum(1 for i in range(len(k)-1) if k[i]==k[i+1])
    if adj>1: v.append("too many adjacent repeats (%d)"%adj)
    return v

def gen(n, fixed, seed):
    per=n//4
    rng=random.Random(seed)
    pool=list(L*per)
    for _ in range(2000000):
        rng.shuffle(pool)
        k=list(pool)
        bad=False
        for i,c in fixed.items():
            if k[i]!=c:
                swap=[j for j in range(n) if k[j]==c and j not in fixed]
                if not swap: bad=True; break
                j=rng.choice(swap); k[i],k[j]=k[j],k[i]
        if bad: continue
        s="".join(k)
        if not violations(s, fixed, per):
            return s
    return None

if __name__=="__main__":
    jobs={"2.1": (16,"ACBDABCDBCDABCDA",{}),
          "2.2": (28,"CADBCADBCADBCADBCABDBCDADACD",{1:"A",6:"D",21:"C"})}
    for name,(n,cur,fixed) in jobs.items():
        s=gen(n,fixed,seed=20260901)
        print("== %s =="%name)
        print("  current:",cur)
        print("  target :",s)
        print("  changes: %d of %d"%(sum(1 for a,b in zip(s,cur) if a!=b), n))
        print("  dist   :",dict(sorted(Counter(s).items())))
        print("  blocks :"," ".join(s[i:i+4] for i in range(0,n,4)))
        print("  adj rpt:",sum(1 for i in range(n-1) if s[i]==s[i+1]))
        print("  checks :","ALL PASS" if not violations(s,fixed,n//4) else violations(s,fixed,n//4))
        open("key-%s.txt"%name,"w").write(s)

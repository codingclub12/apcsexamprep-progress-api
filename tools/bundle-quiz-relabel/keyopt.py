import sys
from collections import Counter
L="ABCD"
RUNS={"".join(L[(s+d*i)%4] for i in range(4)) for s in range(4) for d in (1,-1)}

def solve(cur, fixed, maxadj=1):
    n=len(cur); per=n//4
    best=[None]
    def rec(i, k, cnt, seen3, adj, cost, budget):
        if cost>budget: return False
        if i==n:
            best[0]="".join(k); return True
        cands=[cur[i]]+[c for c in L if c!=cur[i]]
        if i in fixed: cands=[fixed[i]]
        for c in cands:
            nc=cost+(0 if c==cur[i] else 1)
            if nc>budget: continue
            if cnt[c]+1>per: continue
            na=adj+(1 if i>0 and k[i-1]==c else 0)
            if na>maxadj: continue
            if i>=2 and k[i-2]==k[i-1]==c: continue
            b3=None
            if i>=2:
                b3=k[i-2]+k[i-1]+c
                if b3 in seen3: continue
            if i>=3:
                b4=k[i-3]+k[i-2]+k[i-1]+c
                if b4 in RUNS: continue
                if b4[0]==b4[2] and b4[1]==b4[3] and b4[0]!=b4[1]: continue
                if max(Counter(b4).values())>=3: continue
            k.append(c); cnt[c]+=1
            if b3: seen3.add(b3)
            if rec(i+1,k,cnt,seen3,na,nc,budget): return True
            k.pop(); cnt[c]-=1
            if b3: seen3.discard(b3)
        return False
    for budget in range(0,n+1):
        if rec(0,[],Counter(),set(),0,0,budget):
            return budget,best[0]
    return None,None

if __name__=="__main__":
    jobs={"2.1": ("ACBDABCDBCDABCDA",{}),
          "2.2": ("CADBCADBCADBCADBCABDBCDADACD",{1:"A",6:"D",21:"C"})}
    for name,(cur,fixed) in jobs.items():
        d,s=solve(cur,fixed)
        n=len(cur)
        print("== %s =="%name)
        print("   current:",cur)
        print("   target :",s)
        print("   changes: %d of %d   (provably minimal)"%(d,n))
        print("   dist   :",dict(sorted(Counter(s).items())))
        print("   blocks :"," ".join(s[i:i+4] for i in range(0,n,4)))
        print("   diff   :"," ".join("Q%d %s>%s"%(i+1,a,b) for i,(a,b) in enumerate(zip(cur,s)) if a!=b))
        open("key-%s.txt"%name,"w").write(s)

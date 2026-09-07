#!/usr/bin/env python3
"""Independent check of the REPAIRED decks. Written against the artifact, not
against the repair script: it re-reads every deck, recompiles every code panel,
and asserts the surviving claims are true."""
import os,sys,re,json,zipfile,subprocess,tempfile,shutil
from pptx import Presentation
ROOT=sys.argv[1]
BAD_CAPTION='Complete and runnable as shown.'
BAD_NOTE='A complete, runnable program.'
NOISE='Picked up JAVA_TOOL_OPTIONS'
DECL=re.compile(r'^\s*(?:public\s+|final\s+|abstract\s+)*class\s+(\w+)',re.M)
work=tempfile.mkdtemp(prefix='v')
def runs(code):
    m=DECL.search(code)
    if not m: return False
    n=m.group(1); d=os.path.join(work,'c%d'%(abs(hash(code))%10**12)); os.makedirs(d,exist_ok=True)
    open(os.path.join(d,n+'.java'),'w').write(code)
    if subprocess.run(['javac','-nowarn',n+'.java'],capture_output=True,cwd=d,timeout=120).returncode!=0: return False
    if not re.search(r'static\s+void\s+main\s*\(',code): return False
    return subprocess.run(['java','-cp','.',n],capture_output=True,cwd=d,timeout=30).returncode==0

fail=[]; kept_cap=0; kept_note=0; files=0; slides=0; nobak=[]
for d in sorted(os.listdir(ROOT)):
    dp=os.path.join(ROOT,d)
    if not os.path.isdir(dp): continue
    for fn in sorted(os.listdir(dp)):
        if not fn.endswith('.pptx') or fn.endswith('.orig.pptx'): continue
        p=os.path.join(dp,fn); files+=1
        with open(p,'rb') as fh:
            if fh.read(4)!=b'PK\x03\x04': fail.append((p,'not a zip')); continue
        if zipfile.ZipFile(p).testzip() is not None: fail.append((p,'corrupt zip')); continue
        prs=Presentation(p); slides+=len(prs.slides)
        for i,sl in enumerate(prs.slides,1):
            code=[];texts=[]
            for sh in sl.shapes:
                if not sh.has_text_frame: continue
                t=sh.text_frame.text
                if not t.strip(): continue
                texts.append(t)
                if any(r.font.name=='Courier New' for pp in sh.text_frame.paragraphs for r in pp.runs):
                    code.append(t)
            if not code: continue
            nt=sl.notes_slide.notes_text_frame.text if sl.has_notes_slide else ''
            hascap=BAD_CAPTION in texts; hasnote=BAD_NOTE in nt
            if not (hascap or hasnote): continue
            ok=runs('\n'.join(code))
            if hascap:
                if ok: kept_cap+=1
                else: fail.append((f'{d}/{fn} s{i}','caption still claims complete+runnable but code does not run'))
            if hasnote:
                if ok: kept_note+=1
                else: fail.append((f'{d}/{fn} s{i}','note still claims a complete runnable program but code does not run'))
        if not os.path.exists(p.replace('.pptx','.orig.pptx')): nobak.append(fn)
shutil.rmtree(work,ignore_errors=True)
print(f'files {files}  slides {slides}')
print(f'surviving TRUE captions: {kept_cap}   surviving TRUE notes: {kept_note}')
print(f'decks with no .orig.pptx backup: {len(nobak)} (decks with no edits need none)')
print(f'FAILURES: {len(fail)}')
for f in fail[:10]: print('  ',f)
sys.exit(1 if fail else 0)

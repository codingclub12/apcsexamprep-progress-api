#!/usr/bin/env python3
"""
ced_audit.py - AP Cybersecurity Unit 1 CED-alignment auditor.

Usage:
    python3 ced_audit.py [dir_of_page_json]

Expects one <handle>.json per page, each the raw Shopify
GET /pages/<handle>.json response.

Reports, per page:
  OFF-CED     terms with ZERO occurrences in the Fall 2026 CED
  WRONG-UNIT  terms that exist in the CED but belong to another unit
  MISSING EK  required Topic 1.x anchors not found

MISSING EK is a heuristic (regex on paraphrasable wording) and produces
false positives. OFF-CED and WRONG-UNIT are exact string matches and are
the authoritative signals. Verify every finding against
CED-UNIT1-EXTRACT.txt before acting.

    THREE PLACES TEXT HIDES, AND WHY THAT MATTERS

This script used to strip <script> before counting, the way you strip markup.
On a page whose prose is prose, that is right. On the activity pages it is
badly wrong: Exercise 1 renders all seven of its red flags out of a JavaScript
array, so every word a student reads lives inside a <script> block. The audit
called that page CLEAN while it was teaching Authority as a psychological
tactic, which is EK 2.1.A.3 and belongs to Unit 2.

So the scan now covers three regions and reports them separately, because a hit
in each one means something different and calls for a different fix:

  BODY   prose outside script and style. What a reader sees directly.
  JS     text inside <script> blocks other than JSON-LD. On these pages this
         is student-facing content that happens to be rendered by code, and it
         counts exactly as much as BODY does.
  META   text inside <script type="application/ld+json">. Search metadata, not
         content a student reads. Still worth fixing when it advertises the
         page as covering material the CED does not, but it is never the
         urgent hit.

A count printed as 12+3 means 12 in BODY and 3 in JS. Anything with a JS
number was invisible to every earlier run of this tool, so treat a previously
"clean" or "low" activity page as unmeasured rather than fine.

Scanning raw JavaScript does match identifiers, and the first run of this
version proved it: `mitm` fired on three clean pages because the grading engine
defines cfuSubmitMCQ and cfuSubmitMatch, and "subMITMatch" lowercases to
contain it. So every term is matched on a word boundary now, which is what the
old prose-only scan never needed. Terms that are deliberate prefixes, meant to
catch "dumpster diving" from "dumpster div", are listed in PREFIX and get a
leading boundary only.
"""
import sys
BASEDIR = sys.argv[1] if len(sys.argv) > 1 else '.'

import json,re,os,glob,html  # noqa: E401

# terms that are NOT in the Fall 2026 CED at all
OFF = ['spear phishing','spear-phishing','vishing','smishing','whaling','baiting',
       'quid pro quo','tailgating','shoulder surf','dumpster div','watering hole',
       'credential stuffing','password spraying','brute force','rainbow table',
       'keylogger','wep','wpa2','wpa3','deepfake','honeypot','man-in-the-middle',
       'mitm','packet sniff','rogue access point','bluejacking','bluesnarf']
#  Terms written as prefixes on purpose: "dumpster div" is meant to catch
#  "dumpster diving", so it gets a leading word boundary and no trailing one.
PREFIX = {'shoulder surf','dumpster div','packet sniff','bluesnarf'}

def term_re(k):
    return r'\b'+re.escape(k)+('' if k in PREFIX else r'\b')

# terms belonging to OTHER units
OTHER_UNIT = {'pretexting':'2.1.A.2','authority':'2.1.A.3','consensus':'2.1.A.5',
              'scarcity':'2.1.A.6','familiarity':'2.1.A.7','script kiddie':'2.1.B.1',
              'hacktivist':'2.1.B.2','cia triad':'2.x','defense in depth':'2.x',
              'confidentiality, integrity':'2.x'}
# required CED anchors per topic
REQ = {
 '1.1': ['intimidation','urgency','elicitation','one-time password|otp|authentication code','malware','challenge question'],
 '1.2': ['failed attempt|failed login','unusual time','unknown device','password manager','passphrase','multifactor|mfa','dictionary'],
 '1.3': ['low-skilled|low skill','high-skilled|high skill','zero day|zero-day','evil twin','ssid','jamming','denial of service|dos','war driving|wardriving','vpn','https'],
 '1.4': ['digital avatar|voice clon|impersonat','large language model|llm','prompt','training set|training data','reconnaissance','shared secret','multifactor|mfa'],
 '1.5': ['firewall rule|access control','application code|code analysis','detection rule','digital events|millions of','alert','threat detection|threat-detection'],
}
TOPIC_OF = {
 'ap-cybersecurity-unit-1-social-engineering':'1.1',
 'ap-cybersecurity-unit-1-password-attacks':'1.2',
 'ap-cybersecurity-unit-1-wireless-security':'1.3',
 'ap-cybersecurity-unit-1-ai-driven-threats':'1.4',
 'ap-cybersecurity-unit-1-ai-cyber-defense':'1.5',
}
for n in range(1,6):
    for s in ['exercise-1','exercise-2','lab','quiz']:
        TOPIC_OF[f'ap-cyber-unit-1-lesson-{n}-{s}']=f'1.{n}'

def flatten(b):
    b=re.sub(r'<!--.*?-->','',b,flags=re.S)
    return html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',b))).lower()

def regions(b):
    """Split a body into (body_prose, script_text, jsonld_text)."""
    ld=' '.join(re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>',b,flags=re.S))
    rest=re.sub(r'<script[^>]*application/ld\+json[^>]*>.*?</script>',' ',b,flags=re.S)
    js=' '.join(re.findall(r'<script[^>]*>(.*?)</script>',rest,flags=re.S))
    prose=re.sub(r'<script.*?</script>',' ',rest,flags=re.S)
    prose=re.sub(r'<style.*?</style>',' ',prose,flags=re.S)
    return flatten(prose), flatten(js), flatten(ld)

def text(b):
    """Kept for callers that want only the prose region."""
    return regions(b)[0]

rows=[]
for f in sorted(glob.glob(os.path.join(BASEDIR,'*.json'))):
    h=os.path.basename(f)[:-5]
    try: p=json.load(open(f))['page']
    except Exception: continue
    t,js,ld=regions(p['body_html'])
    topic=TOPIC_OF.get(h,'--')
    def tally(terms):
        out={}
        for k in terms:
            rx=term_re(k)
            a=len(re.findall(rx,t)); b_=len(re.findall(rx,js))
            if a or b_: out[k]=(a,b_)
        return out
    off=tally(OFF)
    ou={k:(OTHER_UNIT[k],a,b_) for k,(a,b_) in tally(OTHER_UNIT).items()}
    meta=[k for k in OFF if re.search(term_re(k),ld)]
    #  A required anchor counts wherever a student can read it, prose or JS.
    both=t+' '+js
    miss=[]
    if topic in REQ:
        for r in REQ[topic]:
            if not re.search(r,both): miss.append(r.split('|')[0])
    rows.append((topic,h,len(t),len(js),off,ou,meta,miss))

def fmt(a,b_):
    return f'{a}+{b_}' if b_ else str(a)

hidden=0
for topic,h,ln,jsln,off,ou,meta,miss in sorted(rows):
    print(f'\n=== [{topic}] {h}  ({ln} chars prose, {jsln} in JS)')
    if off:
        print('   OFF-CED :', ', '.join(f'{k}x{fmt(a,b_)}'
              for k,(a,b_) in sorted(off.items(),key=lambda x:-(x[1][0]+x[1][1]))))
    if ou:
        print('   WRONG-UNIT:', ', '.join(f'{k}(->{o})x{fmt(a,b_)}' for k,(o,a,b_) in ou.items()))
    if meta:
        print('   META-ONLY:', ', '.join(meta), '  (JSON-LD description, not student-facing)')
    if miss:
        print('   MISSING EK:', ', '.join(miss))
    js_only=[k for k,(a,b_) in off.items() if b_ and not a] + \
            [k for k,(o,a,b_) in ou.items() if b_ and not a]
    if js_only:
        hidden+=1
        print('   >> INVISIBLE TO EARLIER RUNS, rendered from JS:', ', '.join(js_only))
    if not off and not ou and not meta and not miss: print('   clean')

if hidden:
    print(f'\n{hidden} page(s) carry hits that only appear inside <script>. Any earlier')
    print('"clean" or "low" rating for those pages was measuring the wrong region.')

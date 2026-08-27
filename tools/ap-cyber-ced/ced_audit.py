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
"""
import sys
BASEDIR = sys.argv[1] if len(sys.argv) > 1 else '.'

import json,re,os,glob,html

# terms that are NOT in the Fall 2026 CED at all
OFF = ['spear phishing','spear-phishing','vishing','smishing','whaling','baiting',
       'quid pro quo','tailgating','shoulder surf','dumpster div','watering hole',
       'credential stuffing','password spraying','brute force','rainbow table',
       'keylogger','wep','wpa2','wpa3','deepfake','honeypot','man-in-the-middle',
       'mitm','packet sniff','rogue access point','bluejacking','bluesnarf']
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

def text(b):
    b=re.sub(r'<script.*?</script>','',b,flags=re.S)
    b=re.sub(r'<style.*?</style>','',b,flags=re.S)
    b=re.sub(r'<!--.*?-->','',b,flags=re.S)
    return html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',b))).lower()

rows=[]
for f in sorted(glob.glob(os.path.join(BASEDIR,'*.json'))):
    h=os.path.basename(f)[:-5]
    try: p=json.load(open(f))['page']
    except Exception: continue
    t=text(p['body_html'])
    topic=TOPIC_OF.get(h,'--')
    off={k:len(re.findall(re.escape(k),t)) for k in OFF}
    off={k:v for k,v in off.items() if v}
    ou={k:(v,len(re.findall(re.escape(k),t))) for k,v in OTHER_UNIT.items() if re.search(re.escape(k),t)}
    miss=[]
    if topic in REQ:
        for r in REQ[topic]:
            if not re.search(r,t): miss.append(r.split('|')[0])
    rows.append((topic,h,len(t),off,ou,miss))

for topic,h,ln,off,ou,miss in sorted(rows):
    print(f'\n=== [{topic}] {h}  ({ln} chars)')
    if off: print('   OFF-CED :', ', '.join(f'{k}x{v}' for k,v in sorted(off.items(),key=lambda x:-x[1])))
    if ou:  print('   WRONG-UNIT:', ', '.join(f'{k}(->{v[0]})x{v[1]}' for k,v in ou.items()))
    if miss:print('   MISSING EK:', ', '.join(miss))
    if not off and not ou and not miss: print('   clean')

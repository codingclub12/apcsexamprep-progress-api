#!/usr/bin/env python3
"""Re-derive the practice exam replica from the sheet, independently of the generator.

Nothing here imports tools/ap-cyber-ced/*. The sheet is parsed back from bytes, the
24 topic numbers are re-derived from the College Board CED text extracts rather than
from config/cyber-topics.json, and the questions are diffed against the item bank
JSON, which is the source the generator renders rather than the generator itself.

The point is that a second reading of the raw artifact reaches the same conclusion.
Generation is not evidence that generation worked, and the CSP sheet lost 90 bytes a
page while every semantic check passed.

    python3 scripts/cyber-exam-replica-rederive.py <sheet.csv> [<live-body.html>]
"""
import csv
import html
import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

csv.field_size_limit(10 ** 9)
ROOT = Path(__file__).resolve().parent.parent
checks, fails = [], []

EM_DASH = '—'


def ok(label, cond, detail=''):
    checks.append(cond)
    mark = 'ok  ' if cond else 'FAIL'
    extra = f'  [{detail}]' if detail and not cond else ''
    print(f'  {mark}  {label}{extra}')
    if not cond:
        fails.append(label)


def text_of(fragment):
    """Visible text: drop tags, unescape entities, squeeze whitespace."""
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', fragment))).strip()


# -- the sheet ---------------------------------------------------------------
sheet = Path(sys.argv[1] if len(sys.argv) > 1
             else 'imports/2026-09-04c/cyber-practice-exam-replica-pages.csv')
raw = sheet.read_bytes()
ok('the sheet is written with a BOM, which is what keeps the bullets intact',
   raw.startswith(b'\xef\xbb\xbf'))
rows = list(csv.DictReader(raw.decode('utf-8-sig').splitlines(True)))
ok('the sheet is one row, so a MERGE touches one page', len(rows) == 1, len(rows))
row = rows[0]
ok('it targets ap-cybersecurity-practice-exam, the ranking URL, not a new one',
   row['Handle'] == 'ap-cybersecurity-practice-exam', row['Handle'])
ok('the command is MERGE, so columns absent from the sheet are left alone',
   row['Command'] == 'MERGE', row['Command'])
ok('there is no Title column and no meta description column, so one SERP variable moves',
   'Title' not in row and 'SEO Description' not in row, ','.join(row.keys()))
body = row['Body HTML']
ok('the Body HTML cell is not empty, which under MERGE would erase the page',
   len(body.strip()) > 50000, len(body))

# -- the 24 topics, re-derived from the CED text, not from our own config -----
ced = ''
for name in ('CED-UNIT1-EXTRACT.txt', 'CED-UNITS-2-5-EXTRACT.txt'):
    ced += (ROOT / 'tools' / 'ap-cyber-ced' / name).read_text(encoding='utf-8')
ced_topics = sorted({m.group(1) for m in re.finditer(r'\bTOPIC\s+(\d\.\d)\b', ced)},
                    key=lambda t: (int(t[0]), int(t[2])))
ok('the CED text yields exactly 24 topics, read from the extract not from config',
   len(ced_topics) == 24, f'{len(ced_topics)}: {",".join(ced_topics)}')
ok('and it has no 2.5, no 3.6 and no 4.5, the three the site teaches anyway',
   not {'2.5', '3.6', '4.5'} & set(ced_topics))

# -- the multiple choice section ---------------------------------------------
CARD = re.compile(
    r'<div class="pq-card" data-correct="([A-D])" data-qid="(\d+)">'
    r'(.*?)(?=<div class="pq-card"|<div class="pq-unit-div"|$)', re.S)
cards = list(CARD.finditer(body))
ok('the body carries 60 scored cards', len(cards) == 60, len(cards))
qids = [int(m.group(2)) for m in cards]
ok('their qids run 1 to 60 with no gap and no repeat', qids == list(range(1, 61)),
   f'{min(qids)}..{max(qids)}, {len(set(qids))} distinct')

parsed = []
for m in cards:
    letter, qid, inner = m.group(1), int(m.group(2)), m.group(3)
    qnum = text_of(re.search(r'<p class="pq-qnum">(.*?)</p>', inner, re.S).group(1))
    topic = re.search(r'Topic (\d\.\d)', qnum).group(1)
    stem = text_of(re.search(r'<p class="pq-stem">(.*?)</p>', inner, re.S).group(1))
    opts = {}
    for om in re.finditer(r'<div class="pq-opt" data-val="([A-D])">(.*?)</div>', inner, re.S):
        opts[om.group(1)] = text_of(
            re.sub(r'<span class="pq-opt-letter">[A-D]</span>', '', om.group(2)))
    parsed.append({'qid': qid, 'answer': letter, 'topic': topic,
                   'stem': stem, 'options': opts})

ok('every card carries exactly the four options A to D',
   all(sorted(p['options']) == list('ABCD') for p in parsed),
   Counter(len(p['options']) for p in parsed))
ok('every card names a topic the CED actually has',
   all(p['topic'] in ced_topics for p in parsed),
   sorted({p['topic'] for p in parsed} - set(ced_topics)))
ok('all 24 CED topics are assessed, none skipped',
   {p['topic'] for p in parsed} == set(ced_topics),
   sorted(set(ced_topics) - {p['topic'] for p in parsed}))

key = Counter(p['answer'] for p in parsed)
ok('no answer letter is rarer than 15 percent or commoner than 35 percent',
   all(0.15 <= key[c] / 60 <= 0.35 for c in 'ABCD'), dict(key))
letters = ''.join(p['answer'] for p in parsed)
longest = max(len(m.group(0)) for m in re.finditer(r'(.)\1*', letters))
ok('no letter repeats more than twice in a row', longest <= 2, longest)

# -- the sheet against the item bank ------------------------------------------
bank = json.loads((ROOT / 'config' / 'cyber-exam-items.json').read_text(encoding='utf-8'))
ok('the bank holds 60 items', len(bank['items']) == 60, len(bank['items']))
mismatch = []
for p, it in zip(parsed, bank['items']):
    if p['topic'] != it['topic']:
        mismatch.append(f"q{p['qid']} topic {p['topic']} vs {it['topic']}")
    if p['stem'] != text_of(it['stem']):
        mismatch.append(f"q{p['qid']} stem")
    if sorted(p['options'].values()) != sorted(text_of(o) for o in it['options']):
        mismatch.append(f"q{p['qid']} option set")
ok('every rendered card matches the item bank: topic, stem and option set',
   not mismatch, '; '.join(mismatch[:6]))

key_mismatch = []
for p, it in zip(parsed, bank['items']):
    want = it['answer'] if isinstance(it['answer'], str) else 'ABCD'[it['answer']]
    if p['answer'] != want:
        key_mismatch.append(f"q{p['qid']} rendered {p['answer']} bank {want}")
    idx = 'ABCD'.index(p['answer'])
    if p['options'][p['answer']] != text_of(it['options'][idx]):
        key_mismatch.append(f"q{p['qid']} key points at different text")
ok('the letter the page will mark correct is the letter the bank names, for all 60',
   not key_mismatch, '; '.join(key_mismatch[:6]))

skills = Counter(it['skill'] for it in bank['items'])
ok('each skill category carries 25 to 40 percent of the multiple choice, the CED band',
   all(15 <= skills[s] <= 24 for s in (1, 2, 3)), dict(skills))
ok('skill category 4, Collaborate, is not in the multiple choice at all',
   4 not in skills, dict(skills))

# -- the free response --------------------------------------------------------
frq = bank['frq']
ok('the free response is the CED task, Device Security Analysis',
   frq['name'] == 'Device Security Analysis' and f"<h2>{frq['name']}</h2>" in body,
   frq['name'])
sources = [int(s) for s in re.findall(r'<p class="pq-qnum">Source (\d+):', body)]
ok('it supplies six sources, as the CED sample does', sources == [1, 2, 3, 4, 5, 6], sources)
parts = re.findall(r'<p class="pq-qnum">Part ([A-E])', body)
ok('and parts A through E', parts == list('ABCDE'), parts)
ok('every part is assessed on skill 2 or 3, the only two on the free response',
   all(p['skill'] in (2, 3) for p in frq['parts']), [p['skill'] for p in frq['parts']])
ok('one part asks the student to write a command, as CED part C (iii) does',
   any('chmod' in json.dumps(p) for p in frq['parts']))
ok('Section II is stated at 50 minutes and 30 percent',
   'Suggested time: 50 minutes' in body and 'Section II is 30 percent' in body)

# -- nothing states a count the bank cannot justify ---------------------------
per_unit = Counter(it['topic'].split('.')[0] for it in bank['items'])
WORDS = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7,
         'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
         'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
         'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60}
NOUN = re.compile(
    r'\b(\d{1,3}|' + '|'.join(WORDS) + r')[\s-]+'
    r'(?:(?:scenario-based|interactive|practice|multiple|choice|new|more|other|of|the|our|these)'
    r'[\s-]+){0,4}'
    r'(free-response questions?|free-response|questions?|mcqs?|frqs?|items?)\b', re.I)
MCQ_OK = {1, len(bank['items'])} | set(per_unit.values()) | set(skills.values())
CROSS = [('ap-cybersecurity-practice-questions', 15)]


def unjustified(text):
    out = []
    for m in NOUN.finditer(text):
        tok = m.group(1).lower()
        n = int(tok) if tok.isdigit() else WORDS[tok]
        allowed = {1} if re.match(r'(?i)^(frqs?|free-response)', m.group(2)) else MCQ_OK
        if n in allowed:
            continue
        window = text[max(0, m.start() - 260):m.end() + 260]
        if any(n == c and h in window for h, c in CROSS):
            continue
        out.append(m.group(0))
    return out


bad = unjustified(body)
ok('no phrase in the body states a count the item bank cannot justify', not bad, bad[:8])

if len(sys.argv) > 2:
    live = Path(sys.argv[2]).read_text(encoding='utf-8')
    stale = unjustified(live)
    ok('and the same scan finds 27 such phrases in the body this replaced, so it is not vacuous',
       len(stale) == 27, f'{len(stale)}: {stale[:6]}')

# -- the SERP package ---------------------------------------------------------
ok('the SEO title states the new shape',
   '60 MCQ' in row['SEO Title'] and '40' not in row['SEO Title'], row['SEO Title'])
ok('the body carries no em-dash and no EK code in student-visible text',
   EM_DASH not in body and not re.search(r'\b\d\.\d\.[A-Z]\.\d\b', text_of(body)))
ok('the body is valid UTF-8 and normalises unchanged, so nothing was double encoded',
   unicodedata.normalize('NFC', body) == body)

print()
if fails:
    print(f'FAIL - {len(fails)} of {len(checks)} re-derived checks did not hold')
    for f in fails:
        print(f'  - {f}')
    sys.exit(1)
print(f'OK - {len(checks)} checks re-derived from the sheet, independently of the generator')

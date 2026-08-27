#!/usr/bin/env python3
"""
validate_csv.py - pre-import gate for Matrixify page CSVs.

Usage:  python3 validate_csv.py <file.csv>

Blocks the import if any check fails. Every check here corresponds to a
failure that has actually shipped to production on this site before.

Provenance: arrived in the ap-cyber-unit1-handoff bundle on 2026-08-27. Two
corrections were made when it was vendored into the repo, both because a real
page failed the gate for a reason that was not a defect:

  div_balanced        counted "<div" and "</div>" across the raw body,
                      comments included. The live Topic 1.1 lesson carries a
                      leftover instruction comment,
                        <!-- Phishing block: <div class="attack-block" ...> -->
                      whose <div> is not markup, so a structurally sound page
                      read as one tag short. Comments are stripped first now. A
                      comment cannot contain real markup, so counting outside
                      them is not a weaker check, it is the correct one.

  activity_nav_*      only accepted APCYBER-ACTIVITY-NAV-START/END. Exercise,
                      lab and quiz pages use those markers; LESSON pages use
                      APCYBER-LESSON-NAV-START/END instead, and hub pages have
                      neither. Either marker is accepted now. The check still
                      does the job it was written for, which is to catch a
                      splice that severs the nav strip.
"""
import csv, sys, re, json

csv.field_size_limit(sys.maxsize)
OFF_CED = ['spear phishing','vishing','smishing','whaling','baiting','quid pro quo',
           'tailgating','shoulder surf','dumpster div','credential stuffing',
           'password spraying','brute force','rainbow table','deepfake',
           'man-in-the-middle','rogue access point','business email compromise']
MOJIBAKE = ['\u00e2\u20ac','\u00c3\u00a2','\u00c3\u00b0','\u00e2\u0080\u00a2']

def strip_comments(html):
    # A comment cannot contain markup, so tag counting must happen outside it.
    return re.sub(r'<!--.*?-->', '', html, flags=re.S)


def check(path):
    rows = list(csv.DictReader(open(path, encoding='utf-8-sig')))
    if not rows:
        print('FAIL  csv has no rows'); return False
    allok = True
    for r in rows:
        h = r.get('Handle','?'); b = r.get('Body HTML','') or ''
        c = {}
        nc = strip_comments(b)
        c['command_is_MERGE']   = r.get('Command') == 'MERGE'
        c['body_present']       = len(b) > 1000
        c['style_balanced']     = len(re.findall(r'<style[ >]', nc)) == nc.count('</style>')
        c['script_balanced']    = len(re.findall(r'<script[ >]', nc)) == nc.count('</script>')
        c['div_balanced']       = nc.count('<div') == nc.count('</div>')
        c['no_mojibake']        = not any(m in b for m in MOJIBAKE)
        c['ucnav_preserved']    = 'id="ucnav"' in b
        c['nav_strip_start']    = ('APCYBER-ACTIVITY-NAV-START' in b
                                   or 'APCYBER-LESSON-NAV-START' in b
                                   or 'introduction-to-security' in h)
        c['nav_strip_end']      = ('APCYBER-ACTIVITY-NAV-END' in b
                                   or 'APCYBER-LESSON-NAV-END' in b
                                   or 'introduction-to-security' in h)
        c['has_lesson_id']      = 'data-lesson-id=' in b
        c['no_publishedat_col'] = 'Published At' not in r

        low = b.lower()
        stray = {t: low.count(t) for t in OFF_CED if low.count(t)}
        # Off-CED terms are NOT auto-failed: a rewritten page may legitimately
        # name them while telling students they are not assessed. This is a
        # WARNING. A human must confirm every hit is explanatory, never
        # content students are asked to learn or classify.

        # embedded question bank, if present
        m = re.search(r'var Q=(\[.*?\]);\n', b, re.S)
        if m:
            Q = json.loads(m.group(1))
            c['keys_in_range']  = all(0 <= q['key'] < len(q['opts']) for q in Q)
            c['all_have_fb']    = all(q.get('fb','').strip() for q in Q)
            c['no_all_of_above']= not any(re.search(r'all of the above|none of the above', o, re.I)
                                          for q in Q for o in q['opts'])
            four = [q['key'] for q in Q if len(q['opts']) == 4]
            if four:
                from collections import Counter
                worst = max(Counter(four).values()) / len(four)
                c['key_balance_under_35pct'] = worst <= 0.35
                run = mx = 1
                for a, bb in zip(four, four[1:]):
                    run = run + 1 if a == bb else 1
                    mx = max(mx, run)
                c['no_3_consecutive_same'] = mx < 3

        bad = [k for k, v in c.items() if not v]
        print(('PASS  ' if not bad else 'FAIL  ') + h + (('   -> ' + ', '.join(bad)) if bad else ''))
        if stray:
            print('        WARN off-CED strings present, confirm each is explanatory:', stray)
            print('             grep -o \'.\\{80\\}vishing.\\{60\\}\' to inspect context')
        allok = allok and not bad
    return allok

if __name__ == '__main__':
    sys.exit(0 if check(sys.argv[1]) else 1)

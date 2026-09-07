#!/usr/bin/env python3
"""
Draft a Unit 1 topic's kit content out of its old deck.

    python3 scripts/extract-csa-unit1-content.py <Day1_Deck_TEACHER.pptx>

WHAT THIS IS FOR
Unit 1's 15 topics were built before scripts/csa_kit/ and their teaching content
lives only inside 56 .pptx files. Rebuilding the unit through the kit needs that
content in content_unit1.py, and retyping it from slides is how transcription
errors get in. This reads it out instead.

WHAT IT IS NOT
It is a DRAFTING AID, never a source of truth, and the difference is not
academic. Round-tripped against the hand-authored 1.6 entry on 2026-09-07:

    MATCH    topic, title, worked code, worked heading, worked output, up_next,
             and the item counts for sections, objectives, discussion, learned
    DIFFER   subtitle, the worked-example notice lines, break_it, vocab count

Every difference was the author IMPROVING on the deck rather than the extractor
losing something, and one of them was a correction. The old 1.6 break-it slide
says "Write steps =+ 3 instead of steps += 3" about a program whose statement is
steps *= 3, so it names a line the program does not contain. The authored entry
fixes it to =+ 10 against the real steps += 10. Ship the extraction unread and
that error ships with it.

So: extract, then edit. The fields that always need a human are the subtitle
(the deck's is a mechanical join of the section names), the notice lines (the
deck writes "x - explanation", the kit writes sentences), break_it, and the
misconception, whose WHAT STUDENTS THINK panel holds the TRUE statement in most
of these decks and is worse than useless.

WHAT THE REBUILD BUYS, measured across all 15 Day 1 decks
    worked-example slides   41 -> 21
    section slides          84 -> 43
    61 slides removed, and none of the remaining code is split mid-class.

No em-dashes, per repo convention.
"""
import os, re, sys, glob
from pptx import Presentation

DECL = re.compile(r'^\s*(?:public\s+|final\s+|abstract\s+)*class\s+(\w+)', re.M)
PART = re.compile(r'^(.*?)(?:,\s*PART\s*(\d+)(?:\s+OF\s+\d+)?)?$')
NOF  = re.compile(r'^(.*?)\s*\((\d+)\s+of\s+(\d+)\)\s*$', re.I)

def is_code(sh):
    return any(r.font.name == 'Courier New'
               for p in sh.text_frame.paragraphs for r in p.runs)

def slide_data(sl):
    shapes = [sh for sh in sl.shapes if sh.has_text_frame and sh.text_frame.text.strip()]
    out = {'heads': [], 'texts': [], 'code': [], 'notes': ''}
    for sh in shapes:
        t = sh.text_frame.text
        if 'APCSExamPrep.com' in t or 'AP is a trademark' in t:
            continue
        if is_code(sh):
            out['code'].append(t)
        elif t.isupper() and len(t) < 70:
            out['heads'].append(t)
        else:
            out['texts'].append(t)
    if sl.has_notes_slide:
        out['notes'] = sl.notes_slide.notes_text_frame.text or ''
    return out

#  Acronyms the CSA vocabulary actually uses. Kept as a list rather than a
#  heuristic: "IDE" and "API" are indistinguishable from short words by shape.
ACRONYMS = {'API', 'IDE', 'JVM', 'ASCII', 'HTML', 'CSS', 'SQL', 'AP', 'CED'}


def _term(t):
    words = [w for w in t.split() if w]
    return ' '.join(w.upper() if w.upper() in ACRONYMS else w.title() for w in words)


def body_of(code):
    i = code.find('{')
    if i < 0: return None
    d = 0
    for j in range(i, len(code)):
        if code[j] == '{': d += 1
        elif code[j] == '}':
            d -= 1
            if d == 0: return code[i+1:j]
    return None

def rejoin_code(blocks):
    """Two halves of one class concatenate. The same class declared twice
    (1. THE CLASS / 2. USING IT) has to have its MEMBERS unioned instead, which
    is the shape that makes the second half not compile on its own."""
    names = [DECL.search(b).group(1) for b in blocks if DECL.search(b)]
    if len(names) > 1 and len(set(names)) == 1:
        bodies = []
        for b in blocks:
            if not DECL.search(b):        # a continuation fragment
                bodies.append(b); continue
            bd = body_of(b)
            if bd is None: return '\n'.join(blocks)
            bodies.append(bd)
        return 'public class %s\n{\n%s\n}' % (names[0], '\n'.join(bodies))
    return '\n'.join(blocks)

def extract(path):
    prs = Presentation(path)
    S = [slide_data(sl) for sl in prs.slides]
    d = {}
    # ---- title slide
    t0 = S[0]
    d['title'] = t0['texts'][1] if len(t0['texts']) > 1 else ''
    d['subtitle'] = t0['texts'][2] if len(t0['texts']) > 2 else ''
    m = re.search(r'Topic\s+([\d.]+)', t0['texts'][0] if t0['texts'] else '')
    d['topic'] = m.group(1) if m else ''

    day = {}
    sections, worked_code, worked_notice, worked_head, output = [], [], [], '', []
    for s in S:
        H = ' | '.join(s['heads'])
        T = s['texts']
        if 'WARM-UP' in H and T:
            day['warmup'] = (T[0], T[1] if len(T) > 1 else '',
                             T[2] if len(T) > 2 else '')
        elif 'LESSON OBJECTIVES' in H:
            los = [h for h in s['heads'] if h.startswith('LO ')]
            day['objectives'] = [(T[i+1], los[i] if i < len(los) else '')
                                 for i in range(len(T) - 1)]
        elif re.search(r'SECTION \d\d', H) and T:
            name = T[0]
            mm = NOF.match(name)
            idea = T[2] if len(T) > 2 else (T[1] if len(T) > 1 else '')
            if mm:
                base, part = mm.group(1).strip(), int(mm.group(2))
                if part == 1: sections.append([base, [idea]])
                elif sections and sections[-1][0] == base: sections[-1][1].append(idea)
                else: sections.append([base, [idea]])
            else:
                sections.append([name, [idea]])
        elif 'WORKED EXAMPLE' in H:
            if T: worked_head = T[0]
            worked_code += s['code']
            for t in T:
                if ' - ' in t and t.count('\n') >= 1:
                    worked_notice = [l.strip() for l in t.split('\n') if l.strip()]
            if 'OUTPUT' in H:
                # the OUTPUT panel is the short non-code text after the notice
                cands = [t for t in T if t and len(t) < 120 and ' - ' not in t]
                if cands: output = cands[-1].split('\n')
        elif 'NOW BREAK IT' in H:
            day['break_it'] = {'change': T[1] if len(T) > 1 else '',
                               'happens': T[2] if len(T) > 2 else '',
                               'why': T[3] if len(T) > 3 else ''}
        elif 'KEY VOCABULARY' in H:
            terms = [h for h in s['heads'] if h != 'KEY VOCABULARY']
            defs = T[2:] if len(T) > 2 else []
            #  The slide gives the term in caps, so title() is right for a word
            #  and wrong for an acronym: it turned API into "Api" and IDE into
            #  "Ide", which then printed that way on the vocabulary table of
            #  every rebuilt notes packet.
            d['vocab'] = [(_term(t), defs[i]) for i, t in enumerate(terms) if i < len(defs)]
        elif 'CHECK YOUR UNDERSTANDING' in H:
            day['discussion'] = [t for t in T[1:] if not t.isdigit()]
        elif 'END OF DAY' in H:
            if len(T) > 1: day['learned'] = [l for l in T[1].split('\n') if l.strip()]
            if len(T) > 2: day['up_next'] = T[2].split('\n')[0]
    day['sections'] = [(n, ' '.join(p)) for n, p in sections]
    if worked_code:
        day['worked'] = {'heading': worked_head, 'code': rejoin_code(worked_code),
                         'notice': worked_notice, 'output': output}
    d['days'] = [day]
    return d

if __name__ == '__main__':
    import json
    r = extract(sys.argv[1])
    day = r['days'][0]
    print('topic   ', r['topic'], '|', r['title'])
    print('subtitle', r['subtitle'][:70])
    print('vocab   ', len(r.get('vocab', [])), 'terms')
    for k in ('warmup','objectives','sections','worked','break_it','discussion','learned','up_next'):
        v = day.get(k)
        n = len(v) if hasattr(v,'__len__') else '-'
        print(f'  {k:11} {"present" if v else "MISSING":8} ({n})')
    if day.get('worked'):
        w = day['worked']
        print('\nworked heading:', w['heading'])
        print('worked code   :', len(w['code'].split('\n')), 'lines')
        print('worked notice :', len(w['notice']), 'items')
        print('worked output :', w['output'])
        print('\n' + w['code'])

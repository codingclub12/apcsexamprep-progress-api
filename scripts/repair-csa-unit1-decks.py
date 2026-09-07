#!/usr/bin/env python3
"""
Repair the false "complete and runnable" claims in the AP CSA Unit 1 bundle.

    python3 scripts/repair-csa-unit1-decks.py <dir-of-Lesson_*-folders> [--dry-run]

WHY A TEXT REPAIR RATHER THAN A REBUILD
Unit 1's 56 decks were built before scripts/csa_kit/ existed, by a generator with
no fit guard. Regenerating through the kit is the better end state and is board
255, but it changes every slide of a preview already shown to people. Every
defect here is a STRING, so this fixes the falsehoods and touches nothing else.

WHAT IS ACTUALLY WRONG, MEASURED RATHER THAN ASSUMED
A worked example is split across two slides when it does not fit. Each half is
captioned "Complete and runnable as shown." That caption appears 28 times. It is
TRUE on 2 of them and FALSE on the other 26, and the speaker note making the same
promise is true on 7 of 27. So a blanket replace would turn nine true statements
into hedges, which is why this script decides per slide by COMPILING the code on
that slide and asking javac, rather than by matching the caption text.

The split is not only mislabeled, it is invisible. On the "2. USING IT" slides
both halves declare the same class: slide 12 is "public class Geometry" holding
area and perimeter, slide 13 is "public class Geometry" holding only main, which
calls Geometry.area. A student who types slide 13 gets "cannot find symbol".
Nothing on either slide says the main belongs INSIDE the class above. Union the
members and all of it compiles and runs, so the programs are right and only the
presentation is wrong. That is what the new captions say.

HOW IT DECIDES
For every panel in Courier New (the code font), the code is written to a file and
compiled. RUNS means the caption's claim is true and the slide is left alone.
Anything else picks a caption from the slide's own section heading.

HOW IT EDITS
python-pptx, run level. A paragraph's runs are replaced by setting the first
run's text and blanking the rest, so the run's formatting survives rather than
being rebuilt from a guess. Every file is copied to <name>.orig.pptx before it is
touched, and --dry-run reports without writing.

NOT repaired: the split itself, the type sizes, and the WHAT TO NOTICE panel
repeated across the halves. Those need the rebuild, board 255.

No em-dashes, per repo convention.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile

try:
    from pptx import Presentation
except ImportError:
    sys.exit('needs python-pptx')

CODE_FONT = 'Courier New'
BAD_CAPTION = 'Complete and runnable as shown.'
BAD_NOTE_SENTENCE = 'A complete, runnable program.'
NOISE = 'Picked up JAVA_TOOL_OPTIONS'
DECL = re.compile(r'^\s*(?:public\s+|final\s+|abstract\s+)*class\s+(\w+)', re.M)
HAS_MAIN = re.compile(r'static\s+void\s+main\s*\(')

#  Caption by section heading, used only where javac says the claim is false.
#  "the class above" is literal: both halves declare the same class, so the
#  second half's members belong inside the first half's braces.
CAPTIONS = [
    (re.compile(r'^1\. THE CLASS, PART 1$'),
     'First half of the class. The rest is on the next slide.'),
    (re.compile(r'^1\. THE CLASS, PART 2$'),
     'Second half of the class. It goes inside the braces opened on the previous slide.'),
    (re.compile(r'^1\. THE CLASS$'),
     'The class on its own. It compiles, but nothing runs until main calls it.'),
    (re.compile(r'^2\. USING IT, PART 1$'),
     'First half of main. The rest is on the next slide.'),
    (re.compile(r'^2\. USING IT, PART 2$'),
     'Second half of main. It goes inside the braces opened on the previous slide.'),
    (re.compile(r'^2\. USING IT$'),
     'main goes inside the same class as the methods above, not in a class of its own.'),
    (re.compile(r'^THE (COMPLETE )?PROGRAM, PART 1$'),
     'First half of the program. The rest is on the next slide.'),
    (re.compile(r'^THE (COMPLETE )?PROGRAM, PART 2$'),
     'Second half of the program. It goes inside the braces opened on the previous slide.'),
]

NOTES = [
    (re.compile(r'PART 1$'), 'The first half of the program, split to stay readable.'),
    (re.compile(r'PART 2$'), 'The second half, which joins the code on the previous slide.'),
    (re.compile(r'^1\. THE CLASS$'), 'The class by itself. It compiles; there is no main here to run.'),
    (re.compile(r'^2\. USING IT$'), 'The main for the class above, and it belongs inside that same class.'),
]

#  Headings that say "COMPLETE" while the slide holds a half. Repaired so the
#  heading does not contradict the caption underneath it.
HEAD_FIX = [
    (re.compile(r'^THE COMPLETE PROGRAM, PART (\d)$'), r'THE PROGRAM, PART \1 OF 2'),
]


def clean(s):
    return '\n'.join(l for l in (s or '').splitlines() if NOISE not in l).strip()


def shape_is_code(sh):
    for p in sh.text_frame.paragraphs:
        for r in p.runs:
            if r.font.name == CODE_FONT:
                return True
    return False


def compile_verdict(code, workdir):
    """RUNS only if this code alone compiles and runs. That is what the caption claims."""
    m = DECL.search(code)
    if not m:
        return 'NOT_COMPILABLE'
    name = m.group(1)
    d = os.path.join(workdir, 'c%d' % (abs(hash(code)) % 10 ** 12))
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, name + '.java'), 'w') as fh:
        fh.write(code)
    r = subprocess.run(['javac', '-nowarn', name + '.java'],
                       capture_output=True, text=True, cwd=d, timeout=120)
    if r.returncode != 0:
        return 'NOT_COMPILABLE'
    if not HAS_MAIN.search(code):
        return 'NOT_RUNNABLE'
    rr = subprocess.run(['java', '-cp', '.', name],
                        capture_output=True, text=True, cwd=d, timeout=30)
    return 'RUNS' if rr.returncode == 0 else 'NOT_RUNNABLE'


def join_wrapped_call(tf, apply=True):
    """Rejoin a println whose closing ");" the generator pushed onto its own line.

    Topic 1.1 slide 10 is the first worked example in the bundle and it reads as
    broken code. The join is refused unless the previous line ends in a quote, so
    a deliberately indented ");" closing a multi-line argument list is left alone.
    """
    joined = []
    paras = list(tf.paragraphs)
    for i, p in enumerate(paras[1:], start=1):
        if para_text(p).strip() != ');':
            continue
        prev = paras[i - 1]
        if not para_text(prev).rstrip().endswith('"') or not prev.runs:
            continue
        if apply:
            prev.runs[-1].text = prev.runs[-1].text.rstrip() + ');'
            p._p.getparent().remove(p._p)
            joined.append(para_text(prev).strip())
        else:
            joined.append((para_text(prev).rstrip() + ');').strip())
    return joined


def para_text(p):
    return ''.join(r.text for r in p.runs)


def set_para(p, text):
    if not p.runs:
        return False
    p.runs[0].text = text
    for r in p.runs[1:]:
        r.text = ''
    return True


def section_head(texts):
    for t in texts:
        s = t.strip()
        if s.isupper() and len(s) < 70 and 'APCSEXAM' not in s and 'WORKED' not in s:
            for rx, _ in CAPTIONS:
                if rx.match(s):
                    return s
    for t in texts:
        s = t.strip()
        if s.isupper() and len(s) < 70 and 'APCSEXAM' not in s and 'WORKED' not in s:
            return s
    return ''


def repair_deck(path, workdir, dry):
    prs = Presentation(path)
    edits = []
    for idx, sl in enumerate(prs.slides, start=1):
        shapes = [sh for sh in sl.shapes if sh.has_text_frame and sh.text_frame.text.strip()]
        code = '\n'.join(sh.text_frame.text for sh in shapes if shape_is_code(sh))
        if not code.strip():
            continue
        texts = [sh.text_frame.text for sh in shapes]
        for sh in shapes:
            if shape_is_code(sh):
                for j in join_wrapped_call(sh.text_frame, apply=not dry):
                    edits.append((idx, 'codewrap', ');', j))
        code = '\n'.join(sh.text_frame.text for sh in shapes if shape_is_code(sh))
        verdict = compile_verdict(code, workdir)
        if verdict == 'RUNS':
            continue                      # the claim is true; leave it alone
        head = section_head(texts)

        new_caption = None
        for rx, txt in CAPTIONS:
            if rx.match(head):
                new_caption = txt
                break

        for sh in shapes:
            for p in sh.text_frame.paragraphs:
                t = para_text(p).strip()
                if t == BAD_CAPTION and new_caption:
                    edits.append((idx, 'caption', t, new_caption))
                    if not dry:
                        set_para(p, new_caption)
                elif t == head:
                    for rx, rep in HEAD_FIX:
                        if rx.match(t):
                            nh = rx.sub(rep, t)
                            edits.append((idx, 'heading', t, nh))
                            if not dry:
                                set_para(p, nh)

        if sl.has_notes_slide:
            tf = sl.notes_slide.notes_text_frame
            if BAD_NOTE_SENTENCE in tf.text:
                repl = None
                for rx, txt in NOTES:
                    if rx.search(head):
                        repl = txt
                        break
                if repl:
                    for p in tf.paragraphs:
                        t = para_text(p)
                        if BAD_NOTE_SENTENCE in t:
                            nt = t.replace(BAD_NOTE_SENTENCE, repl)
                            edits.append((idx, 'note', BAD_NOTE_SENTENCE, repl))
                            if not dry:
                                set_para(p, nt)
    if edits and not dry:
        backup = path.replace('.pptx', '.orig.pptx')
        if not os.path.exists(backup):
            shutil.copy2(path, backup)
        prs.save(path)
    return edits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('root')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    work = tempfile.mkdtemp(prefix='u1repair')
    total = 0
    per_kind = {}
    try:
        for d in sorted(os.listdir(a.root)):
            dp = os.path.join(a.root, d)
            if not os.path.isdir(dp):
                continue
            for fn in sorted(os.listdir(dp)):
                if not fn.endswith('.pptx') or fn.endswith('.orig.pptx'):
                    continue
                edits = repair_deck(os.path.join(dp, fn), work, a.dry_run)
                if not edits:
                    continue
                print('%s / %s' % (d.replace('Lesson_', ''), fn.replace('_Deck', '').replace('.pptx', '')))
                for slide, kind, old, new in edits:
                    print('   s%-3d %-8s %s' % (slide, kind, new))
                    per_kind[kind] = per_kind.get(kind, 0) + 1
                    total += 1
    finally:
        shutil.rmtree(work, ignore_errors=True)
    print()
    print('%d edits%s' % (total, ' (dry run, nothing written)' if a.dry_run else ''))
    print('  ' + ', '.join('%s %d' % (k, v) for k, v in sorted(per_kind.items())))


if __name__ == '__main__':
    main()

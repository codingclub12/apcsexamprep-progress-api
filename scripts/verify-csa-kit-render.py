#!/usr/bin/env python3
"""
Render the teacher-kit decks and check that nothing overflows its slide.

WHY THIS EXISTS
The worked-example slides for long programs were badly broken and every other
check passed. The Java compiled, the OUTPUT panels matched what Java printed,
the files opened cleanly in python-pptx, and the slides were still unusable:
a PowerPoint text frame does not clip, so a 35 line program at a fixed point
size was drawn straight over the slide title and past the footer.

Nothing short of looking at the rendered page can catch that, and looking at
one deck per unit is how it survived. This script looks at all of them.

WHAT IT CHECKS
Each deck is converted to PDF with LibreOffice and every page inspected:

  1. No text may fall outside the printable area of the slide. Text drawn off
     the edge is text a projector will not show.
  2. No single text block may be taller than MAX_BLOCK_IN. Nothing in this
     deck design legitimately spans most of the slide vertically, so a block
     that does is a text frame that has outgrown its panel. This is the exact
     shape of the bug that prompted the script.

Both are heuristics rather than a layout engine. They catch content that has
escaped its container, which is the failure that actually happened, and they
will not catch two panels overlapping while both stay in bounds.

Usage:
    python3 scripts/verify-csa-kit-render.py --kit build/csa-kit
    python3 scripts/verify-csa-kit-render.py --kit build/csa-kit --unit 4
    python3 scripts/verify-csa-kit-render.py --kit build/csa-kit --all-editions

By default only TEACHER decks are rendered: they carry strictly more content
than the student editions on the same geometry, so they fail first.
"""

import argparse
import glob
import os
import subprocess
import sys
import tempfile

SLIDE_W_IN = 13.333
SLIDE_H_IN = 7.5
PT_PER_IN = 72.0

# Printable area. A little tolerance at each edge for glyph bearings and for
# the full-bleed accent rule at the top of every slide.
LEFT_IN, RIGHT_IN = 0.10, SLIDE_W_IN - 0.10
TOP_IN, BOTTOM_IN = 0.10, SLIDE_H_IN - 0.05

# No legitimate text block in this design is taller than this.
MAX_BLOCK_IN = 5.2


def soffice_to_pdf(pptx, outdir):
    env = dict(os.environ)
    env.setdefault('HOME', '/tmp/lohome')
    os.makedirs(env['HOME'], exist_ok=True)
    r = subprocess.run(
        ['soffice', '--headless', '--norestore', '--convert-to', 'pdf',
         '--outdir', outdir, pptx],
        capture_output=True, text=True, env=env, timeout=300)
    pdf = os.path.join(outdir, os.path.splitext(os.path.basename(pptx))[0] + '.pdf')
    if not os.path.exists(pdf):
        raise RuntimeError(f'conversion produced no pdf: {r.stderr.strip()[:200]}')
    return pdf


def check_pdf(pdf, label):
    import pymupdf
    problems = []
    doc = pymupdf.open(pdf)
    for i, page in enumerate(doc, 1):
        sx = SLIDE_W_IN / page.rect.width
        sy = SLIDE_H_IN / page.rect.height
        for block in page.get_text('blocks'):
            x0, y0, x1, y1, text = block[0], block[1], block[2], block[3], block[4]
            if not text.strip():
                continue
            l, t, r, b = x0 * sx, y0 * sy, x1 * sx, y1 * sy
            snippet = ' '.join(text.split())[:44]
            if l < LEFT_IN or r > RIGHT_IN or t < TOP_IN or b > BOTTOM_IN:
                problems.append(
                    f'{label} slide {i}: text outside the slide '
                    f'(x {l:.2f} to {r:.2f}, y {t:.2f} to {b:.2f}): {snippet!r}')
            elif (b - t) > MAX_BLOCK_IN:
                problems.append(
                    f'{label} slide {i}: text block {b - t:.2f}in tall, over the '
                    f'{MAX_BLOCK_IN}in limit, so it has outgrown its panel: {snippet!r}')
    doc.close()
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kit', default='build/csa-kit')
    ap.add_argument('--unit')
    ap.add_argument('--all-editions', action='store_true')
    ap.add_argument('--limit', type=int)
    args = ap.parse_args()

    pattern = os.path.join(args.kit, f'Unit_{args.unit}' if args.unit else 'Unit_*',
                           '*', 'Slide_Decks', '*.pptx')
    decks = sorted(glob.glob(pattern))
    if not args.all_editions:
        decks = [d for d in decks if d.endswith('TEACHER.pptx')]
    if args.limit:
        decks = decks[:args.limit]
    if not decks:
        sys.exit(f'no decks matched {pattern}')

    print(f'rendering {len(decks)} deck(s)')
    problems, rendered, pages = [], 0, 0
    with tempfile.TemporaryDirectory() as tmp:
        for deck in decks:
            label = os.path.relpath(deck, args.kit).replace('/Slide_Decks', '')
            try:
                pdf = soffice_to_pdf(deck, tmp)
            except Exception as exc:
                problems.append(f'{label}: {exc}')
                continue
            import pymupdf
            with pymupdf.open(pdf) as d:
                pages += len(d)
            problems.extend(check_pdf(pdf, label))
            os.remove(pdf)
            rendered += 1
            if rendered % 10 == 0:
                print(f'  {rendered}/{len(decks)}')

    print(f'\nrendered {rendered} deck(s), {pages} slide(s)')
    if problems:
        print(f'\n{len(problems)} problem(s):')
        for p in problems[:40]:
            print('  - ' + p)
        if len(problems) > 40:
            print(f'  ... and {len(problems) - 40} more')
        sys.exit(1)
    print('every slide keeps its content inside the slide, and no text block '
          'has outgrown its panel.')


if __name__ == '__main__':
    main()

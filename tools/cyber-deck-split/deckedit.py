"""Helpers for authoring per-day slides into a split AP Cybersecurity deck.

These decks were generated programmatically: one blank DEFAULT layout, and all
design carried by the slide's own shapes. That is what makes cloning safe here.
A cloned slide keeps every colour, font, size and position because it keeps the
shapes; only the text is rewritten. Nothing depends on a layout placeholder, so
a slide can even be cloned between decks in this family.
"""
import copy
import re


def clone_slide(dst_prs, src_slide):
    """Deep-copy src_slide (any deck in this family) onto the end of dst_prs."""
    layout = dst_prs.slide_layouts[0]
    new = dst_prs.slides.add_slide(layout)
    # add_slide seeds the layout's placeholders; the source carries its own.
    for shp in list(new.shapes):
        shp._element.getparent().remove(shp._element)
    for shp in src_slide.shapes:
        new.shapes._spTree.append(copy.deepcopy(shp._element))
    if src_slide.has_notes_slide:
        new.notes_slide.notes_text_frame.text = (
            src_slide.notes_slide.notes_text_frame.text)
    return new


def move_slide(prs, old_index, new_index):
    """Reorder by moving the sldId entry, which is the only ordering there is."""
    lst = prs.slides._sldIdLst
    entries = list(lst)
    lst.remove(entries[old_index])
    lst.insert(new_index, entries[old_index])


def drop_shapes(slide, indices):
    """Remove shapes by position. Take indices from a dump of the same slide."""
    shapes = list(slide.shapes)
    for i in sorted(indices, reverse=True):
        shapes[i]._element.getparent().remove(shapes[i]._element)


def set_text(shape, text):
    """Replace a shape's text, keeping the first run's character formatting.

    Writing to shape.text_frame.text drops run properties and leaves the slide
    in the theme's default font, which on these decks is visibly wrong. Reusing
    the existing run keeps size, colour, weight and the -webkit-safe fill.
    """
    tf = shape.text_frame
    para = tf.paragraphs[0]
    if para.runs:
        para.runs[0].text = text
        for extra in para.runs[1:]:
            extra._r.getparent().remove(extra._r)
    else:
        para.add_run().text = text
    for extra in tf.paragraphs[1:]:
        extra._p.getparent().remove(extra._p)


def set_bullets(shape, lines):
    """Replace a multi-paragraph shape, cloning paragraph 1 for its formatting."""
    tf = shape.text_frame
    template = copy.deepcopy(tf.paragraphs[0]._p)
    for p in list(tf.paragraphs):
        p._p.getparent().remove(p._p)
    for line in lines:
        node = copy.deepcopy(template)
        tf._txBody.append(node)
        para = tf.paragraphs[-1]
        if para.runs:
            para.runs[0].text = line
            for extra in para.runs[1:]:
                extra._r.getparent().remove(extra._r)
        else:
            para.add_run().text = line


def sub_everywhere(slide, pattern, repl):
    """Regex-replace inside every run on a slide. Returns the number of hits."""
    n = 0
    for shape in slide.shapes:
        if not shape.has_text_frame:
            continue
        for para in shape.text_frame.paragraphs:
            for run in para.runs:
                new, k = re.subn(pattern, repl, run.text)
                if k:
                    run.text = new
                    n += k
    return n


def renumber_footers(prs, lesson):
    """Footers restart per day in this course: Slide N of <this day's total>.

    Unit 1 Lesson 1.1 Day 2 reads "Slide N of 12", not a continuation of Day 1.
    Getting this wrong is invisible in a diff and obvious to a teacher.
    """
    total = len(prs.slides)
    for i, slide in enumerate(prs.slides, 1):
        sub_everywhere(slide, r'Slide\s+\d+\s+of\s+\d+', f'Slide {i} of {total}')
        sub_everywhere(slide, r'Lesson\s+[\d.]+\s*(?=·|$)', f'Lesson {lesson}  ')
    return total

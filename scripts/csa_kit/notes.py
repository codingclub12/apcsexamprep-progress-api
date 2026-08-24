"""
Guided-notes builder, student and key editions.

Format copied from the Unit 1 packets that already ship
(Day1_Notes_STUDENT.docx): a vocabulary table with the definitions blank, the
day's key ideas truncated mid-sentence so students complete them while the
slide is up, and a closing fill-in-the-blank section where a single term is
removed from each sentence.

The two editions come from one content source. The STUDENT edition blanks the
answers; the KEY edition prints them underlined so a teacher can grade at a
glance. That is why they can never drift apart.

No em-dashes anywhere in generated text.
"""

from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

BLANK = '_' * 22
NAVY = RGBColor(0x10, 0x24, 0x3A)
ACCENT = RGBColor(0x2C, 0x6B, 0xAF)
MUTED = RGBColor(0x5A, 0x6B, 0x7B)

TRADEMARK = ("AP is a trademark of the College Board, which was not involved in "
             "the production of, and does not endorse, this resource.")

# How much of a key-idea sentence the student sees before the blank starts.
TRUNCATE_AT = 58


def _p(doc, text='', size=11, bold=False, color=None, space_after=6, align=None):
    p = doc.add_paragraph()
    if align is not None:
        p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    r = p.add_run(text)
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.name = 'Calibri'
    if color is not None:
        r.font.color.rgb = color
    return p


def _heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text)
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.name = 'Cambria'
    r.font.color.rgb = NAVY
    return p


def _cloze_line(doc, sentence, key_edition):
    """A key idea, truncated so the student finishes writing it."""
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(10)
    if key_edition:
        r = p.add_run(sentence)
        r.font.size = Pt(11)
        r.font.name = 'Calibri'
    else:
        head = sentence[:TRUNCATE_AT]
        r = p.add_run(head)
        r.font.size = Pt(11)
        r.font.name = 'Calibri'
        r2 = p.add_run('  ' + BLANK)
        r2.font.size = Pt(11)
        r2.font.name = 'Calibri'
    return p


def _fill_blank(doc, template, answer, key_edition):
    """template contains {} where the term is removed."""
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(10)
    parts = template.split('{}')
    for i, part in enumerate(parts):
        r = p.add_run(part)
        r.font.size = Pt(11)
        r.font.name = 'Calibri'
        if i < len(parts) - 1:
            a = p.add_run(answer if key_edition else '_' * 14)
            a.font.size = Pt(11)
            a.font.name = 'Calibri'
            a.font.underline = True
            if key_edition:
                a.font.bold = True
                a.font.color.rgb = ACCENT
    return p


def build_notes(path, topic, title, day, handle, sections, vocab, blanks, key_edition):
    doc = Document()
    for s in doc.sections:
        s.top_margin = s.bottom_margin = Inches(0.7)
        s.left_margin = s.right_margin = Inches(0.8)

    _p(doc, 'GUIDED NOTES' + ('  |  ANSWER KEY' if key_edition else ''),
       size=10, bold=True, color=ACCENT, space_after=2)
    _p(doc, f'Topic {topic}: {title}', size=16, bold=True, color=NAVY, space_after=2)
    _p(doc, f'Day {day}  |  Name: ' + '_' * 26, size=11, space_after=4)
    _p(doc, f'Practice online: apcsexamprep.com/pages/{handle}   Your work there is scored automatically.',
       size=9.5, color=MUTED, space_after=10)

    # ── vocabulary ───────────────────────────────────────────────────────────
    _heading(doc, 'Vocabulary')
    table = doc.add_table(rows=1, cols=2)
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    hdr = table.rows[0].cells
    for cell, text in zip(hdr, ('Term', 'Definition' if key_edition else 'Definition (fill in)')):
        cell.text = ''
        r = cell.paragraphs[0].add_run(text)
        r.font.bold = True
        r.font.size = Pt(10.5)
        r.font.name = 'Calibri'
    for term, definition in vocab:
        cells = table.add_row().cells
        r = cells[0].paragraphs[0].add_run(term)
        r.font.size = Pt(10.5)
        r.font.name = 'Calibri'
        r.font.bold = True
        if key_edition:
            r2 = cells[1].paragraphs[0].add_run(definition)
            r2.font.size = Pt(10)
            r2.font.name = 'Calibri'
        else:
            cells[1].text = ''

    # ── the day's key ideas, truncated ───────────────────────────────────────
    for name, ideas in sections:
        _heading(doc, name)
        for idea in ideas:
            _cloze_line(doc, idea, key_edition)

    # ── fill in the blanks ───────────────────────────────────────────────────
    _heading(doc, 'Fill in the blanks')
    for template, answer in blanks:
        _fill_blank(doc, template, answer, key_edition)

    _p(doc, '', space_after=10)
    _p(doc, TRADEMARK, size=7.5, color=MUTED, space_after=2)
    _p(doc, f'APCSExamPrep.com   Topic {topic} day {day}', size=8, color=MUTED)
    doc.save(path)


def build_quiz(path, topic, title, handle, questions, key_edition):
    """Short end-of-topic quiz, student and key editions. questions is a list of
    dicts: {stem, options[], answer_index, why}."""
    doc = Document()
    for s in doc.sections:
        s.top_margin = s.bottom_margin = Inches(0.7)
        s.left_margin = s.right_margin = Inches(0.8)

    _p(doc, 'TOPIC QUIZ' + ('  |  ANSWER KEY' if key_edition else ''),
       size=10, bold=True, color=ACCENT, space_after=2)
    _p(doc, f'Topic {topic}: {title}', size=16, bold=True, color=NAVY, space_after=2)
    if not key_edition:
        _p(doc, 'Name: ' + '_' * 30 + '     Score: ____ / ' + str(len(questions)),
           size=11, space_after=4)
    _p(doc, f'The same questions are auto-graded at apcsexamprep.com/pages/{handle}',
       size=9.5, color=MUTED, space_after=12)

    for i, q in enumerate(questions, 1):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(f'{i}. {q["stem"]}')
        r.font.size = Pt(11)
        r.font.bold = True
        r.font.name = 'Calibri'
        for j, opt in enumerate(q['options']):
            letter = 'ABCD'[j]
            op = doc.add_paragraph()
            op.paragraph_format.left_indent = Inches(0.35)
            op.paragraph_format.space_after = Pt(2)
            run = op.add_run(f'{letter}. {opt}')
            run.font.size = Pt(10.5)
            run.font.name = 'Calibri'
            if key_edition and j == q['answer_index']:
                run.font.bold = True
                run.font.color.rgb = ACCENT
        if key_edition:
            wp = doc.add_paragraph()
            wp.paragraph_format.left_indent = Inches(0.35)
            wp.paragraph_format.space_after = Pt(12)
            wr = wp.add_run('Why: ' + q['why'])
            wr.font.size = Pt(9.5)
            wr.font.italic = True
            wr.font.name = 'Calibri'
            wr.font.color.rgb = MUTED
        else:
            _p(doc, '', space_after=8)

    _p(doc, TRADEMARK, size=7.5, color=MUTED, space_after=2)
    _p(doc, f'APCSExamPrep.com   Topic {topic} quiz', size=8, color=MUTED)
    doc.save(path)


def build_lesson_map(path, topic, title, handle, days, graded_line):
    """One page: what happens, in what order, on each day."""
    doc = Document()
    for s in doc.sections:
        s.top_margin = s.bottom_margin = Inches(0.7)
        s.left_margin = s.right_margin = Inches(0.8)

    _p(doc, 'LESSON MAP', size=10, bold=True, color=ACCENT, space_after=2)
    _p(doc, f'Topic {topic}: {title}', size=16, bold=True, color=NAVY, space_after=2)
    _p(doc, 'One page. What happens, in what order, on each day.', size=10.5,
       color=MUTED, space_after=10)

    for d in days:
        _heading(doc, f"Day {d['day']}")
        _p(doc, d['focus'], size=11, color=MUTED, space_after=6)
        table = doc.add_table(rows=1, cols=2)
        table.style = 'Table Grid'
        hdr = table.rows[0].cells
        for cell, text in zip(hdr, ('Time', 'What happens')):
            cell.text = ''
            r = cell.paragraphs[0].add_run(text)
            r.font.bold = True
            r.font.size = Pt(10.5)
            r.font.name = 'Calibri'
        total = 0
        for minutes, what in d['schedule']:
            cells = table.add_row().cells
            for cell, text in zip(cells, (f'{minutes} min', what)):
                cell.text = ''
                r = cell.paragraphs[0].add_run(text)
                r.font.size = Pt(10.5)
                r.font.name = 'Calibri'
            total += minutes
        cells = table.add_row().cells
        for cell, text in zip(cells, (f'= {total} min', 'Full period')):
            cell.text = ''
            r = cell.paragraphs[0].add_run(text)
            r.font.size = Pt(10.5)
            r.font.bold = True
            r.font.name = 'Calibri'
        _p(doc, '', space_after=4)
        for note in d.get('notes', []):
            _p(doc, note, size=10, color=MUTED, space_after=6)

    _heading(doc, 'On the website (students)')
    _p(doc, 'Everything on this page is auto-graded and reports to your gradebook the '
            'moment a student submits. Send students here rather than reading answers '
            'off paper: it is where the scores come from.', size=10.5, space_after=6)
    table = doc.add_table(rows=0, cols=2)
    table.style = 'Table Grid'
    for label, value in (('Lesson page', f'apcsexamprep.com/pages/{handle}'),
                         ('Auto-graded on that page', graded_line),
                         ('Your gradebook', 'apcsexamprep.com/pages/cyber-dashboard')):
        cells = table.add_row().cells
        for cell, text, bold in ((cells[0], label, True), (cells[1], value, False)):
            cell.text = ''
            r = cell.paragraphs[0].add_run(text)
            r.font.size = Pt(10.5)
            r.font.bold = bold
            r.font.name = 'Calibri'

    _heading(doc, 'How the three surfaces fit together')
    for label, purpose in (('Slides', 'The daily instruction you project'),
                           ('This folder', 'What you print: notes, exercises, quiz, and the keys'),
                           ('The website', 'Where students practice, and the only place scores are recorded')):
        _p(doc, f'{label}: {purpose}', size=10.5, space_after=4)

    _p(doc, '', space_after=10)
    _p(doc, TRADEMARK, size=7.5, color=MUTED, space_after=2)
    _p(doc, f'APCSExamPrep.com   Topic {topic} lesson map', size=8, color=MUTED)
    doc.save(path)

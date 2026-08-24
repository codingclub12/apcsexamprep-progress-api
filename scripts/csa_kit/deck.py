"""
CSA teacher-kit deck builder.

Design system extracted directly from the Unit 1 decks that already ship
(Day1_Deck_TEACHER.pptx), so generated units are visually identical to the
pilot rather than a lookalike. Every colour, font, size and position below was
read out of that file; none of it is invented.

Slide grammar, in the order a day uses it:
    title -> warmup -> notes_preview -> objectives
    -> [section_divider -> section_content ...]
    -> worked_example -> now_break_it -> misconception
    -> vocabulary -> discussion -> end_of_day

Teacher and student editions are the same deck. The teacher edition adds
speaker notes and the answer text inside the teaching callouts; the student
edition omits both. Nothing else differs, so a teacher projecting either one
sees the same slide numbers.

No em-dashes anywhere in generated text.
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

# ── palette ──────────────────────────────────────────────────────────────────
NAVY_BG     = RGBColor(0x10, 0x24, 0x3A)   # title and section-divider ground
NAVY_CHIP   = RGBColor(0x1B, 0x3A, 0x57)   # chip behind TEACHER EDITION
ACCENT      = RGBColor(0x2C, 0x6B, 0xAF)   # rules, eyebrows, key-idea labels
TINT        = RGBColor(0xF2, 0xF7, 0xFD)   # card fill
GREEN       = RGBColor(0x1E, 0x7A, 0x45)   # output / "actually true"
GREEN_TINT  = RGBColor(0xF0, 0xF7, 0xF2)
ORANGE      = RGBColor(0xC1, 0x74, 0x1C)   # misconception
ORANGE_TINT = RGBColor(0xFD, 0xF6, 0xEC)
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)
BODY        = RGBColor(0x1F, 0x29, 0x37)
MUTED       = RGBColor(0x5A, 0x6B, 0x7B)
FINEPRINT   = RGBColor(0x9A, 0xA7, 0xB4)
ON_NAVY     = RGBColor(0xCA, 0xDC, 0xFC)
ON_NAVY_DIM = RGBColor(0x9C, 0xC3, 0xE6)
TRADE_NAVY  = RGBColor(0x7F, 0x98, 0xB8)

CODE_BG     = RGBColor(0x0F, 0x22, 0x33)
CODE_TEXT   = RGBColor(0xE5, 0xED, 0xFF)
CODE_KW     = RGBColor(0x7F, 0xB4, 0xFF)
CODE_NUM    = RGBColor(0xF0, 0xC6, 0x74)
CODE_STR    = RGBColor(0x9B, 0xD1, 0x9B)
CODE_COMMENT= RGBColor(0x7F, 0x98, 0xB8)

DISPLAY = "Cambria"
UI      = "Calibri"
MONO    = "Courier New"

TRADEMARK = ("AP is a trademark of the College Board, which was not involved in "
             "the production of, and does not endorse, this resource.")

# ── geometry, in inches ──────────────────────────────────────────────────────
W, H       = 13.333, 7.5
MARGIN     = 0.50
CONTENT_W  = 12.33
FOOT_Y     = 6.94
TRADE_Y    = 7.16

# Code-block sizing. Courier New is ~0.6 em wide per character, and a line of
# text occupies ~1.18 times its point size once leading is counted.
CODE_MAX_PT = 12.0
# Above this many lines a worked example takes the wide two-column layout
# and moves its annotations to a second slide.
SINGLE_SLIDE_LINES = 20
CODE_MIN_PT = 7.0
LINE_FACTOR = 1.18
CHAR_FACTOR = 0.60

JAVA_KEYWORDS = {
    'abstract','boolean','break','byte','case','catch','char','class','const',
    'continue','default','do','double','else','enum','extends','final','finally',
    'float','for','if','implements','import','instanceof','int','interface','long',
    'new','package','private','protected','public','return','short','static',
    'super','switch','this','throw','throws','try','void','while','null','true','false',
}


def _shape(slide, x, y, w, h, fill=None):
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.oxml.ns import qn
    sh = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.line.fill.background()
    sh.shadow.inherit = False
    # python-pptx attaches a theme style to every autoshape, which is where the
    # drop shadow on text comes from. The template has none, so drop it.
    style = sh._element.find(qn('p:style'))
    if style is not None:
        sh._element.remove(style)
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    tf = sh.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    return sh


def _text(slide, x, y, w, h, runs, size=12, font=UI, color=BODY, bold=False,
          align=PP_ALIGN.LEFT, space_after=0, line=None, anchor=MSO_ANCHOR.TOP):
    """runs: a string, or a list of paragraphs where each paragraph is a string
    or a list of (text, color, bold) tuples."""
    sh = _shape(slide, x, y, w, h)
    tf = sh.text_frame
    tf.vertical_anchor = anchor
    paras = runs if isinstance(runs, list) else [runs]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if space_after:
            p.space_after = Pt(space_after)
        if line:
            p.line_spacing = line
        pieces = para if isinstance(para, list) else [(para, color, bold)]
        for piece in pieces:
            txt, c, b = (piece if isinstance(piece, tuple) else (piece, color, bold))
            r = p.add_run()
            r.text = txt
            r.font.name = font
            r.font.size = Pt(size)
            r.font.bold = b
            r.font.color.rgb = c
    return sh


def _bg(slide, color):
    """Set a solid slide background. python-pptx has no API for this, so the
    <p:bg> element is built and inserted as the first child of <p:cSld>."""
    from lxml import etree
    from pptx.oxml.ns import qn
    P_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main'
    A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
    hexval = '%02X%02X%02X' % (color[0], color[1], color[2])
    xml = (
        '<p:bg xmlns:p="%s" xmlns:a="%s">'
        '<p:bgPr><a:solidFill><a:srgbClr val="%s"/></a:solidFill>'
        '<a:effectLst/></p:bgPr></p:bg>'
    ) % (P_NS, A_NS, hexval)
    bg = etree.fromstring(xml)
    cSld = slide._element.find(qn('p:cSld'))
    cSld.insert(0, bg)


class Deck:
    def __init__(self, topic, title, day, days, edition, subtitle):
        self.p = Presentation()
        self.p.slide_width = Emu(int(W * 914400))
        self.p.slide_height = Emu(int(H * 914400))
        self.topic = topic
        self.title = title
        self.day = day
        self.days = days
        self.edition = edition          # 'TEACHER' or 'STUDENT'
        self.subtitle = subtitle
        self.n = 0

    @property
    def teacher(self):
        return self.edition == 'TEACHER'

    def _new(self, navy=False):
        s = self.p.slides.add_slide(self.p.slide_layouts[6])
        self.n += 1
        if navy:
            _bg(s, NAVY_BG)
        _shape(s, 0, 0, W, 0.08, ACCENT)
        return s

    def _foot(self, s, navy=False):
        label = 'Teacher Edition' if self.teacher else 'Student Edition'
        _text(s, MARGIN, FOOT_Y, CONTENT_W, 0.24,
              f"APCSExamPrep.com  |  Topic {self.topic}  |  Day {self.day}  |  Slide {self.n}  |  {label}",
              size=9, color=(ON_NAVY_DIM if navy else MUTED))
        _text(s, MARGIN, TRADE_Y, CONTENT_W, 0.22, TRADEMARK,
              size=7.5, color=(TRADE_NAVY if navy else FINEPRINT))

    def _note(self, s, text):
        if self.teacher and text:
            s.notes_slide.notes_text_frame.text = text

    def _head(self, s, eyebrow, heading, sub=None, accent=ACCENT):
        _text(s, MARGIN, 0.30, CONTENT_W, 0.28, eyebrow.upper(), size=11, bold=True, color=accent)
        _text(s, MARGIN, 0.62, CONTENT_W, 0.90, heading, size=30, font=DISPLAY, bold=True,
              color=RGBColor(0x10, 0x24, 0x3A))
        if sub:
            _text(s, MARGIN, 1.42, CONTENT_W, 0.46, sub, size=13, color=MUTED)

    def _card(self, s, x, y, w, h, label, fill=TINT, rule=ACCENT):
        _shape(s, x, y, w, h, fill)
        _shape(s, x, y, w, 0.18, rule)
        if label:
            _text(s, x + 0.30, y + 0.38, w - 0.60, 0.28, label.upper(),
                  size=10.5, bold=True, color=rule)

    # ── slide 1 ──────────────────────────────────────────────────────────────
    def title_slide(self, prepared, note=None):
        s = self._new(navy=True)
        _shape(s, 0, 0, W, 0.10, ACCENT)
        chips = [('TEACHER EDITION' if self.teacher else 'STUDENT EDITION'), f'DAY {self.day} OF {self.days}']
        for i, c in enumerate(chips):
            x = 0.60 + i * 2.25
            _shape(s, x, 0.62, 2.05, 0.36, NAVY_CHIP)
            _text(s, x, 0.62, 2.05, 0.36, c, size=10, bold=True, color=ON_NAVY_DIM,
                  align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
        _text(s, 0.60, 1.35, 12.10, 0.32,
              f"Unit {self.topic.split('.')[0]}  |  Topic {self.topic}  |  Day {self.day} of {self.days}",
              size=13, color=ON_NAVY_DIM)
        _text(s, 0.60, 1.80, 12.10, 1.60, self.title, size=40, font=DISPLAY, bold=True, color=WHITE)
        _text(s, 0.60, 3.50, 11.40, 0.90, self.subtitle, size=16, color=ON_NAVY)
        _shape(s, 0.60, 4.62, 2.40, 0.05, ACCENT)
        _text(s, 0.60, 4.90, 11.40, 0.60, prepared, size=12, color=ON_NAVY_DIM)
        _text(s, 0.60, 5.62, 11.40, 0.50,
              ("Teacher edition. Speaker notes carry the answers and the misconceptions for each slide."
               if self.teacher else
               "Student edition. Fill in your guided notes as we go."),
              size=12.5, color=ON_NAVY)
        _text(s, 0.60, 6.60, 5.00, 0.30, "APCSExamPrep.com", size=11, bold=True, color=WHITE)
        _text(s, 0.60, 6.94, 12.10, 0.40, TRADEMARK, size=7.5, color=TRADE_NAVY)
        self._note(s, note)

    # ── warm-up ──────────────────────────────────────────────────────────────
    def warmup(self, heading, prompt, draw_out=None):
        s = self._new()
        self._head(s, 'WARM-UP', heading)
        self._card(s, MARGIN, 1.98, CONTENT_W, 1.90, 'ON THE BOARD')
        _text(s, MARGIN + 0.30, 2.80, CONTENT_W - 0.60, 1.00, prompt, size=15, color=BODY,
              space_after=6, line=1.25)
        if self.teacher and draw_out:
            self._card(s, MARGIN, 4.14, CONTENT_W, 2.20, 'WORTH DRAWING OUT', GREEN_TINT, GREEN)
            _text(s, MARGIN + 0.30, 4.96, CONTENT_W - 0.60, 1.30, draw_out, size=13.5,
                  color=BODY, space_after=5, line=1.2)
        self._foot(s)
        self._note(s, draw_out)

    # ── guided notes preview ─────────────────────────────────────────────────
    def notes_preview(self, sections):
        s = self._new()
        self._head(s, 'GUIDED NOTES', 'What you will be filling in',
                   "The sections of today's guided notes packet, in the order they appear.")
        n = max(1, len(sections))
        w = (CONTENT_W - 0.30 * (n - 1)) / n
        for i, (name, blurb) in enumerate(sections):
            x = MARGIN + i * (w + 0.30)
            self._card(s, x, 2.10, w, 4.10, f'SECTION {i + 1}')
            _text(s, x + 0.28, 2.52, w - 0.56, 0.80, name, size=17, font=DISPLAY, bold=True,
                  color=RGBColor(0x10, 0x24, 0x3A))
            _text(s, x + 0.28, 3.40, w - 0.56, 2.50, blurb, size=12.5, color=BODY, line=1.2)
        self._foot(s)
        self._note(s, "The sections of today's guided notes packet, in the order they appear.")

    # ── objectives ───────────────────────────────────────────────────────────
    def objectives(self, items):
        s = self._new()
        self._head(s, 'LESSON OBJECTIVES', 'By the end of today you will be able to',
                   'The CED learning objectives for this topic, with their codes.')
        y = 2.10
        for text, code in items:
            self._card(s, MARGIN, y, CONTENT_W, 1.28, 'CB REQUIRED')
            _text(s, MARGIN + 0.30, y + 0.66, CONTENT_W - 2.20, 0.54, text, size=14.5, color=BODY)
            _text(s, W - MARGIN - 1.70, y + 0.38, 1.40, 0.30, code, size=10.5, bold=True,
                  color=ACCENT, align=PP_ALIGN.RIGHT)
            y += 1.44
        self._foot(s)
        self._note(s, 'The CED learning objectives for this topic, with their codes.')

    # ── section divider ──────────────────────────────────────────────────────
    def section_divider(self, index, name):
        s = self._new(navy=True)
        _text(s, 0.60, 2.30, 3.00, 1.40, f"{index:02d}", size=76, font=DISPLAY, bold=True, color=ACCENT)
        _text(s, 0.60, 3.70, 11.40, 0.34, 'SECTION', size=12, bold=True, color=ON_NAVY_DIM)
        _text(s, 0.60, 4.06, 11.40, 1.20, name, size=34, font=DISPLAY, bold=True, color=WHITE)
        _text(s, 0.60, 5.50, 11.40, 0.34, f"Topic {self.topic}  |  Day {self.day}", size=12, color=ON_NAVY_DIM)
        self._foot(s, navy=True)

    # ── section content ──────────────────────────────────────────────────────
    def section_content(self, index, name, ideas, part=None, note=None):
        s = self._new()
        heading = name if not part else f"{name} ({part})"
        self._head(s, f'SECTION {index:02d}', heading, f'Guided notes, section {index}.')
        self._card(s, MARGIN, 2.00, CONTENT_W, 4.42, 'KEY IDEA')
        y = 2.80
        for idea in ideas:
            h = 0.36 + 0.30 * max(1, len(idea) // 95)
            _text(s, MARGIN + 0.30, y, CONTENT_W - 0.60, h, idea, size=15, color=BODY, line=1.22)
            y += h + 0.18
        _text(s, MARGIN + 0.30, 6.02, CONTENT_W - 0.60, 0.30,
              f"Topic {self.topic}  |  Section {index}", size=9, color=MUTED)
        self._foot(s)
        self._note(s, note or 'Where students go quiet here it is usually the vocabulary rather than the concept.')

    # ── worked example ───────────────────────────────────────────────────────
    def worked_example(self, heading, code, notice, output, caption='Complete and runnable as shown.', note=None):
        """One slide for a short program, two for a long one.

        The pilot deck's example was a twelve line Greeting class, and the
        panel was sized for it. Real worked examples in this course are whole
        classes: constructors, getters and a main, routinely thirty lines and
        occasionally fifty. Rendering those into the original panel pushed the
        code over the slide title and past the footer, because a PowerPoint
        text frame does not clip.

        Shrinking the type was not the answer either. Nobody reads 6pt Java
        from the back of a room. So a long program gets the full slide width in
        two columns, and its annotations move to a second slide the teacher
        flips to. Short programs keep the original single-slide layout, which
        is better when it fits.
        """
        lines = code.split('\n')
        if len(lines) <= SINGLE_SLIDE_LINES:
            self._worked_compact(heading, code, notice, output, caption, note)
        else:
            self._worked_wide(heading, code, notice, output, caption, note)

    def _worked_compact(self, heading, code, notice, output, caption, note):
        s = self._new()
        self._head(s, 'WORKED EXAMPLE', heading)
        self._card(s, MARGIN, 1.98, 7.55, 4.34, 'THE COMPLETE PROGRAM')
        _shape(s, 0.80, 2.78, 6.95, 3.03, CODE_BG)
        self._code(s, 0.94, 2.90, 6.67, 2.80, code)
        _text(s, 0.80, 5.90, 6.95, 0.28, caption, size=9, color=MUTED)
        self._card(s, 8.38, 1.98, 4.40, 2.70, 'WHAT TO NOTICE')
        y = 2.76
        for item in notice:
            _text(s, 8.68, y, 0.18, 0.56, '\u2022', size=12, color=ACCENT)
            _text(s, 8.90, y, 3.58, 0.56, item, size=11.5, color=BODY, line=1.12)
            y += 0.62
        self._card(s, 8.38, 4.86, 4.40, 1.46, 'OUTPUT', GREEN_TINT, GREEN)
        y = 5.62
        for line in output:
            _text(s, 8.68, y, 3.80, 0.26, line, size=11.5, font=MONO, color=BODY)
            y += 0.25
        self._foot(s)
        self._note(s, note or 'A complete, runnable program. The annotations are on the next slide.')

    def _worked_wide(self, heading, code, notice, output, caption, note):
        # Slide one: the program, full width, two columns.
        s = self._new()
        self._head(s, 'WORKED EXAMPLE', heading)
        self._card(s, MARGIN, 1.90, CONTENT_W, 4.60, 'THE COMPLETE PROGRAM')
        # The card label occupies 2.28 to 2.56, so the panel starts below it.
        _shape(s, 0.72, 2.62, 11.89, 3.56, CODE_BG)

        lines = code.split('\n')
        half = (len(lines) + 1) // 2
        left, right = lines[:half], lines[half:]
        colw = 5.72
        size_l = self._code(s, 0.90, 2.72, colw, 3.36, '\n'.join(left))
        size_r = self._code(s, 6.86, 2.72, colw, 3.36, '\n'.join(right), force=size_l)
        _text(s, 0.72, 6.24, CONTENT_W, 0.26,
              caption + '  Continues in the right column.', size=9, color=MUTED)
        self._foot(s)
        self._note(s, note or 'A complete, runnable program. The annotations are on the next slide.')

        # Slide two: what to notice, and the output.
        s2 = self._new()
        self._head(s2, 'WORKED EXAMPLE', heading, 'What to notice in the program on the previous slide.')
        self._card(s2, MARGIN, 2.10, 7.55, 4.10, 'WHAT TO NOTICE')
        y = 2.92
        for item in notice:
            _text(s2, 0.80, y, 0.20, 0.60, '\u2022', size=14, color=ACCENT)
            _text(s2, 1.06, y, 6.65, 0.60, item, size=14, color=BODY, line=1.15)
            y += 0.78
        self._card(s2, 8.38, 2.10, 4.40, 4.10, 'OUTPUT', GREEN_TINT, GREEN)
        y = 2.92
        for line in output:
            _text(s2, 8.68, y, 3.80, 0.28, line, size=13, font=MONO, color=BODY)
            y += 0.30
        self._foot(s2)
        self._note(s2, 'The output the program on the previous slide produces.')

    def _code(self, s, x, y, w, h, code, force=None):
        """Render a code block, sized to fit its panel.

        A PowerPoint text frame does not clip, so code that is too long does
        not get cut off: it bleeds over the slide title and past the footer.
        The point size is therefore computed from the block rather than
        assumed, against BOTH constraints:

          height  lines * size * LINE_FACTOR must fit h
          width   longest line * size * CHAR_FACTOR must fit w

        Courier New is monospaced at roughly 0.6 em per character, and a line
        occupies about 1.18 times its point size once leading is included.
        Below CODE_MIN_PT the code stops being readable from the back of a
        room, so the builder raises rather than shipping a slide nobody can
        read: that is a signal to shorten the example or widen the layout.

        force pins the size, so the two columns of a wide worked example share
        one point size instead of each fitting itself independently.
        """
        lines = code.split('\n')
        longest = max((len(l) for l in lines), default=1)

        by_height = (h * 72.0) / (max(len(lines), 1) * LINE_FACTOR)
        by_width = (w * 72.0) / (max(longest, 1) * CHAR_FACTOR)
        size = force if force else min(CODE_MAX_PT, by_height, by_width)

        if size < CODE_MIN_PT:
            raise ValueError(
                f'code block needs {size:.1f}pt to fit ({len(lines)} lines, '
                f'longest {longest} chars) but the floor is {CODE_MIN_PT}pt. '
                'Shorten the worked example rather than shrinking the type.')

        sh = _shape(s, x, y, w, h)
        tf = sh.text_frame
        tf.word_wrap = False
        for i, raw in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = PP_ALIGN.LEFT
            p.line_spacing = 1.0
            p.space_after = Pt(0)
            for txt, col in _tokenize(raw):
                r = p.add_run()
                r.text = txt
                r.font.name = MONO
                r.font.size = Pt(size)
                r.font.color.rgb = col
        return size

    # ── now break it ─────────────────────────────────────────────────────────
    def now_break_it(self, change, happens, why, note=None):
        s = self._new()
        self._head(s, 'NOW BREAK IT  |  ONE CHANGE', 'Change one line and run it again')
        self._card(s, MARGIN, 1.98, 6.00, 2.30, 'THE CHANGE')
        _text(s, MARGIN + 0.30, 2.78, 5.40, 1.30, change, size=14.5, color=BODY, line=1.2)
        self._card(s, 6.83, 1.98, 6.00, 2.30, 'WHAT HAPPENS', ORANGE_TINT, ORANGE)
        _text(s, 7.13, 2.78, 5.40, 1.30, happens, size=14.5, color=BODY, line=1.2)
        self._card(s, MARGIN, 4.50, CONTENT_W, 1.80, 'WHY THIS MATTERS', GREEN_TINT, GREEN)
        _text(s, MARGIN + 0.30, 5.30, CONTENT_W - 0.60, 0.90, why, size=14, color=BODY, line=1.2)
        self._foot(s)
        self._note(s, note or 'One change to the program on the previous slide. This is the error pattern the exam tests on this topic.')

    # ── misconception ────────────────────────────────────────────────────────
    def misconception(self, heading, think, truth, note=None):
        s = self._new()
        self._head(s, 'COMMON MISCONCEPTION', heading, accent=ORANGE)
        self._card(s, MARGIN, 2.00, 6.00, 4.10, 'WHAT STUDENTS THINK', ORANGE_TINT, ORANGE)
        _text(s, MARGIN + 0.30, 2.80, 5.40, 3.00, think, size=15, color=BODY, line=1.25)
        self._card(s, 6.83, 2.00, 6.00, 4.10, 'WHAT IS ACTUALLY TRUE', GREEN_TINT, GREEN)
        _text(s, 7.13, 2.80, 5.40, 3.00, truth, size=15, color=BODY, line=1.25)
        _text(s, MARGIN, 6.30, CONTENT_W, 0.30, f"Topic {self.topic}", size=9, color=MUTED)
        self._foot(s)
        self._note(s, note or 'This is the misconception that costs the most marks on this topic.')

    # ── vocabulary ───────────────────────────────────────────────────────────
    def vocabulary(self, terms):
        s = self._new()
        self._head(s, 'KEY VOCABULARY', 'Words you need to use precisely',
                   'The terms the exam uses in its question stems.')
        cols, colw = 3, (CONTENT_W - 0.60) / 3
        for i, (term, definition) in enumerate(terms[:6]):
            cx = MARGIN + (i % cols) * (colw + 0.30)
            cy = 2.05 + (i // cols) * 2.20
            self._card(s, cx, cy, colw, 2.00, term)
            _text(s, cx + 0.28, cy + 0.76, colw - 0.56, 1.10, definition, size=11.5, color=BODY, line=1.15)
        self._foot(s)
        self._note(s, 'The vocabulary for this topic as the CED uses it.')

    # ── discussion ───────────────────────────────────────────────────────────
    def discussion(self, questions, note=None):
        s = self._new()
        self._head(s, 'TALK IT THROUGH', 'Discussion')
        y = 2.10
        for i, q in enumerate(questions, 1):
            self._card(s, MARGIN, y, CONTENT_W, 1.45, None)
            _text(s, MARGIN + 0.30, y + 0.40, 0.50, 0.60, str(i), size=24, font=DISPLAY,
                  bold=True, color=ACCENT)
            _text(s, MARGIN + 1.00, y + 0.48, CONTENT_W - 1.40, 0.80, q, size=14.5, color=BODY, line=1.2)
            y += 1.60
        self._foot(s)
        self._note(s, note)

    # ── end of day ───────────────────────────────────────────────────────────
    def end_of_day(self, learned, up_next, extra, note=None):
        s = self._new()
        self._head(s, f'END OF DAY {self.day}  |  DAY {self.day} OF {self.days}', f'End of day {self.day}')
        self._card(s, MARGIN, 2.00, 7.30, 4.10, 'TODAY YOU LEARNED')
        y = 2.80
        for item in learned:
            _text(s, MARGIN + 0.30, y, 6.70, 0.80, item, size=13, color=BODY, line=1.18)
            y += 0.90
        self._card(s, 8.10, 2.00, 4.73, 2.10, 'UP NEXT')
        _text(s, 8.40, 2.80, 4.13, 1.10, up_next, size=13, color=BODY, line=1.2)
        self._card(s, 8.10, 4.30, 4.73, 1.80, 'EXTRA PRACTICE', GREEN_TINT, GREEN)
        _text(s, 8.40, 5.10, 4.13, 0.90, extra, size=12.5, color=BODY, line=1.2)
        self._foot(s)
        self._note(s, note or 'The objectives restated as outcomes, plus what the next day covers.')

    def save(self, path):
        self.p.save(path)


def _tokenize(line):
    """Very small Java tokenizer, matching the highlight colours the Unit 1
    decks use: keywords blue, numbers amber, strings green, comments grey."""
    out, i, n = [], 0, len(line)
    stripped = line.lstrip()
    if stripped.startswith('//'):
        return [(line, CODE_COMMENT)]
    buf = ''
    while i < n:
        ch = line[i]
        if ch == '"':
            if buf:
                out.append((buf, CODE_TEXT)); buf = ''
            j = i + 1
            while j < n and line[j] != '"':
                j += 1
            out.append((line[i:min(j + 1, n)], CODE_STR))
            i = j + 1
            continue
        if ch.isalpha() or ch == '_':
            j = i
            while j < n and (line[j].isalnum() or line[j] == '_'):
                j += 1
            word = line[i:j]
            if word in JAVA_KEYWORDS:
                if buf:
                    out.append((buf, CODE_TEXT)); buf = ''
                out.append((word, CODE_KW))
            else:
                buf += word
            i = j
            continue
        if ch.isdigit():
            j = i
            while j < n and (line[j].isdigit() or line[j] == '.'):
                j += 1
            if buf:
                out.append((buf, CODE_TEXT)); buf = ''
            out.append((line[i:j], CODE_NUM))
            i = j
            continue
        buf += ch
        i += 1
    if buf:
        out.append((buf, CODE_TEXT))
    return out or [(' ', CODE_TEXT)]

"""
CED VOICE: find the course-framework language a student should not be reading.

THE RULE, from CLAUDE.md
  The CED code is teacher knowledge. So is the CED itself. A student answering a
  quiz question does not need to be told that the answer is what College Board
  says it is; they need to answer it. Write "Which statement best describes a
  server?", not "According to the CED, which statement best describes a server?".

WHAT THIS FINDS THAT lib/cyber-ek-density.js DOES NOT
  That module finds CODES (1.1.C.2) in live page HTML. This finds the wider
  class Tanner reported on 2026-09-11: the framework named as the AUTHORITY in a
  student-facing stem. "According to the CED", "the CB malware type", "Everything
  maps to CB Learning Objectives 4.1.A". A stem can carry no code at all and
  still be pure teacher voice.

WHY A SEPARATE CATEGORY FOR DANGLING DAMAGE
  Someone has already run a naive strip over some of these files. It deleted the
  citation and left the sentence: "sort the control to its CED category ... and
  cite the exact." Cite the exact WHAT? tools/bundle-quiz-relabel/README.md
  records the same thing happening to the 2.2 student copy, which is why that
  tool carries a STUDENT_REPAIRS table of hand-written sentences.

  So a deletion-only fix is not just imperfect here, it is the bug. Every rule in
  rules.py rewrites to a whole sentence, and DANGLING below exists to find the
  places where the previous pass did not.

PROTECTED PLACEMENTS
  A KEY document is two documents interleaved: the student's instrument reprinted
  verbatim (stem, options) and the teacher's answer key under it (Why A:, CED:).
  The second is a teacher-facing answer key, which CLAUDE.md names as a placement
  where a code EARNS its place. Stripping those would destroy what the teacher
  bought. is_teacher_line() is the whole of that distinction.
"""
import re

# ── the marks of framework voice ────────────────────────────────────────────
PATTERNS = [
    ('ced_word',      re.compile(r'\bCEDs?\b')),
    ('college_board', re.compile(r'\bCollege\s*Board\b', re.I)),
    ('cb_abbrev',     re.compile(r'\bCB\b')),
    ('ek_label',      re.compile(r'\bEKs?\b')),
    ('lo_label',      re.compile(r'\bLOs?\b|\bLearning\s+Objectives?\b', re.I)),
    ('essential_kn',  re.compile(r'\bEssential\s+Knowledge\b', re.I)),
    ('skill_cat',     re.compile(r'\bSkill\s+Categor(?:y|ies)\b', re.I)),
    # A three-part code (4.1.C, 2.2.A.8). Two-part topic numbers ("Topic 4.3",
    # "Lesson 1.2") are how the course names its own lessons and must survive.
    ('ek_code',       re.compile(r'\b\d\.\d\.[A-F](?:\.\d+)?\b')),
    # The bare tail of a code, left parenthesised in prose: "unpatched software (C.1)".
    ('bare_code',     re.compile(r'\((?:EK\s*)?[A-F]\.\d+\)')),
    # The same tail with the parentheses gone too, which is what an earlier strip
    # left behind in "consistent with, D.3, and D.4?". Bounded so it cannot match
    # inside a word or a full code.
    ('code_tail',     re.compile(r'(?<![\w.(])[A-F]\.\d+(?![\w.])')),
]

# A teacher's scoring tag, embedded in a line the student also reads:
#   STUDENT   Q1 (6 pts) Case 1 (the invoice attachment) ...
#   KEY       Q1 [EK 4.1.B.2] (6 pts) Case 1 (the invoice attachment) ...
# The bracket is the teacher's, the sentence is shared. CLAUDE.md protects a code
# in a teacher-facing answer key, so inside a KEY these survive; inside a STUDENT
# copy they are never legitimate.
# Two shapes, both the teacher's: the bracketed scoring tag in front of an
# exercise question, and the trailing parenthetical on a KEY option. The second is
# the convention Q20/Q21/Q24 of the 2.2 quiz already use and that KEY_REPAIRS in
# tools/bundle-quiz-relabel/plan.py writes deliberately, so it is correct output,
# not a finding.
ANNOTATION = re.compile(r'\[(?:EK|LO)\b[^\]]*\]|\[Enrichment\]', re.I)

# The trailing form is allowed only where the convention actually applies: an
# ANSWER OPTION, or an exercise question line. Allowing it on any paragraph
# protected "Part A - Classify each incident (LO 1.4.A)" in the KEY while the
# student's identical heading lost it, which quietly made the two copies differ.
ANNOTATION_TRAIL = re.compile(r'\s*\((?:EK|LO)\s+\d\.\d\.[A-F](?:\.\d+)?\)\s*$', re.I)
OPTION_OR_Q = re.compile(r'^\s*(?:[A-E]\.\s|Q\d)')

# Wreckage from an earlier deletion-only pass. Each of these is a sentence that
# lost its object and kept its preposition.
DANGLING = [
    ('dangling_cite',   re.compile(r'\bcite the exact\s*[.;]')),
    ('dangling_dash',   re.compile(r'\b(?:the\s+)?matching[–—-][A-F]\b')),
    ('dangling_in',     re.compile(r'\bin[–—-][A-F]\.\d')),
    ('dangling_orphan', re.compile(r'(?<![\w.])[–—-][A-F]\.\d+\b')),
    # "(with its)": a parenthetical whose noun was deleted out of it.
    ('dangling_paren',  re.compile(r'\(\s*(?:(?:with|and|per|see|from|under|in)\s+)?'
                                   r'(?:its|the)\s*\)')),
    # A preposition whose object was deleted out from under it: "consistent with,".
    ('dangling_prep',   re.compile(r'\b(?:According to|consistent with|described in|'
                                   r'defined in|Per)\s*,', re.I)),
    # "D. — logging in successfully from a known device": the option's leading
    # citation was deleted and its em-dash separator left behind.
    ('dangling_optdash', re.compile(r'^[A-E]\.\s*[—–-]\s+')),
]

# Lines belonging to the teacher's answer key, inside a KEY document.
TEACHER_LINE = re.compile(
    r'^\s*(?:Why\s+[A-E]\b|CED\s*:|Answer\s+key\b|Distribution\b|Teacher\s+copy\b'
    r'|Rationale\s*:|Scoring\b|Look[- ]fors?\b|Common\s+error\b|Teacher\s+note\b)',
    re.I)


def is_teacher_line(text):
    """True when this paragraph is the teacher's key rather than the student's
    instrument. Only meaningful inside a *_KEY.docx."""
    return bool(TEACHER_LINE.match(text or ''))


def find(text, include_dangling=True, annotations_ok=False):
    """
    Every framework-voice span in one paragraph, as {start,end,kind,text}.

    annotations_ok blanks the teacher's bracketed scoring tags before looking, so
    a KEY keeps "Q1 [EK 4.1.B.2]" while the sentence after it is still held to the
    student standard. Blanked rather than removed, so offsets stay usable for the
    patcher.
    """
    text = text or ''
    if annotations_ok:
        blank = lambda m: ' ' * len(m.group(0))
        text = ANNOTATION.sub(blank, text)
        if OPTION_OR_Q.match(text):
            text = ANNOTATION_TRAIL.sub(blank, text)
    out = []
    pats = PATTERNS + (DANGLING if include_dangling else [])
    for kind, rx in pats:
        for m in rx.finditer(text):
            out.append({'start': m.start(), 'end': m.end(),
                        'kind': kind, 'text': m.group(0)})
    out.sort(key=lambda d: (d['start'], -d['end']))
    return out


def is_clean(text, include_dangling=True, annotations_ok=False):
    return not find(text, include_dangling, annotations_ok)

"""Which files are in scope, and which paragraphs inside them a student sees."""
import os, re

# The instruments Tanner named on 2026-09-11: quiz, test, exercise, discussion.
STUDENT_DOCS = ('Quiz_STUDENT.docx', 'Exercise_1_STUDENT.docx',
                'Exercise_2_STUDENT.docx', 'Discussion.docx')
KEY_DOCS = ('Quiz_KEY.docx', 'Exercise_1_KEY.docx', 'Exercise_2_KEY.docx')


def classify(filename):
    """'student', 'key', or None for out of scope."""
    if filename in STUDENT_DOCS or re.match(r'_Unit_\d_Test_STUDENT\.docx$', filename):
        return 'student'
    if filename in KEY_DOCS or re.match(r'_Unit_\d_Test_KEY\.docx$', filename):
        return 'key'
    return None


def in_scope(base):
    """Yield (abs_path, rel_path, kind) for every in-scope docx under base."""
    for root, _, files in os.walk(base):
        for f in sorted(files):
            kind = classify(f)
            if kind:
                p = os.path.join(root, f)
                yield p, os.path.relpath(p, base), kind


def unit_of(rel):
    m = re.match(r'Unit_(\d)_', rel)
    return m.group(1) if m else '?'


def lesson_of(rel):
    m = re.search(r'Lesson_(\d\.\d)', rel)
    return m.group(1) if m else 'UNIT_TEST'

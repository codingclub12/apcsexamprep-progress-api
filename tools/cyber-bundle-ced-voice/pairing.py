"""
Which paragraphs of a KEY document does a student actually read?

WHY NOT A LINE-PREFIX REGEX
  The first attempt matched "Why A:", "CED:" and friends. It missed "KEY: Case 1
  is a virus (EK 4.1.B.2)" and "Q1 [EK 4.1.B.2] (6 pts)", so 2377 teacher-only
  annotations read as student text and would have been stripped out of the
  teacher's answer key. The prefix list was a proxy for the real question and, as
  in lib/cyber-ek-density.js, the proxy was wrong in a way that looked right.

THE STRUCTURAL ANSWER
  A KEY is its STUDENT twin with teacher material interleaved. So a KEY paragraph
  is student-visible exactly when the STUDENT file also contains it. That is
  derived from the pair on every run rather than maintained by hand, and it
  cannot drift the way a prefix list does.

  Near-match, not equality, for two reasons: the correct option carries a "✓" the
  student copy does not, and an earlier citation strip damaged some STUDENT stems
  so they no longer match their KEY (2.2 Q7 "correctly reflect?" against the
  KEY's "correctly reflect EK 2.2.B.1?"). Those near-misses are precisely the
  repairs this tool has to make, so they must pair, not fall through.
"""
import difflib
import re

CHECK = re.compile(r'\s*[✓✔]\s*$')


def trailing_mark(t):
    """The correct-answer marker a KEY option carries, or ''. It is stripped for
    comparison and MUST be put back on write: it is the only thing on the line
    that says which answer is right."""
    m = CHECK.search(t or '')
    return m.group(0) if m else ''


def norm(t):
    return CHECK.sub('', re.sub(r'\s+', ' ', t or '')).strip()


def student_twin(rel):
    """The STUDENT path for a KEY path, or None."""
    if '_KEY.docx' in rel:
        return rel.replace('_KEY.docx', '_STUDENT.docx')
    return None


def pair_paragraphs(key_paras, stu_paras, cutoff=0.72):
    """
    Map each KEY paragraph index to the STUDENT index it reprints, or None when
    it is teacher-only. Order-aware: a KEY walks its student copy start to end,
    so matching is a sequence alignment rather than a global nearest-neighbour
    search, which stops the four near-identical option lines of one question from
    pairing with the wrong question's.
    """
    kn = [norm(t) for t in key_paras]
    sn = [norm(t) for t in stu_paras]
    out = {}
    cursor = 0
    for i, k in enumerate(kn):
        if not k:
            continue
        best, best_j = 0.0, None
        # Look ahead only: a reprint never appears before the previous one.
        for j in range(cursor, min(cursor + 40, len(sn))):
            s = sn[j]
            if not s:
                continue
            if s == k:
                best, best_j = 1.0, j
                break
            # Cheap length gate before the expensive ratio.
            if abs(len(s) - len(k)) > max(40, 0.5 * max(len(s), len(k))):
                continue
            r = difflib.SequenceMatcher(None, k, s).ratio()
            if r > best:
                best, best_j = r, j
        if best_j is not None and best >= cutoff:
            out[i] = best_j
            cursor = best_j + 1
    return out

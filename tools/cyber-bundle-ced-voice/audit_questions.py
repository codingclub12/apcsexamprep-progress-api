"""
Read every question I changed and ask whether it is still a good question.

A grammar gate proves a sentence parses. It cannot tell you that "Which statement
best matches that definition?" lost the sentence that said WHICH definition, or
that a stem now promises four channels and lists three. Those are the ways a
citation strip actually ruins an item, and they are what this looks for.

THE CHECKS, and the failure each is chasing:

  orphan      a demonstrative whose antecedent went out with the citation:
              "that definition", "those patterns", "that essential knowledge".
              Flagged when the noun does not appear earlier in the stem itself.
  count       the stem names a number ("all four channels", "the three criteria")
              that no longer matches what the item supplies.
  dangling    "both", "each of these", "the former" with nothing to point at.
  drift       the answer key's rationale quotes stem or option wording that the
              edit changed, so the teacher is reading a different item.
  register    the stem asks for a "statement" but the options are noun phrases,
              or vice versa. Introduced when "Which EK best explains" became
              "Which statement best explains".
  grammar     the mechanical residue: lowercase sentence start, doubled word,
              trailing preposition.

Every flag is a question for a human to read, not a verdict. The report prints
the whole item so it can be judged rather than guessed at.

  python3 audit_questions.py <before-root> <after-root> [--all]
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze, scope  # noqa: E402

STEM = re.compile(r'^(\d+)\.\s+(.*)')
OPT = re.compile(r'^([A-E])\.\s+(.*)')
WHY = re.compile(r'^Why\s+([A-E])\s*:\s*(.*)')
QLINE = re.compile(r'^(Q\d+)\s*(\[[^\]]*\])?\s*\(([\d.]+) pts\)\s*(.*)')
NUMWORD = {'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8}
ABSTRACT = (r'definition|category|categories|factor|pattern|patterns|framework|'
            r'statement|idea|goal|result|position|reasoning|principle|criterion|'
            r'criteria|knowledge|list|rule|term|terms|wording|level|levels')


def norm(t):
    return re.sub(r'\s+', ' ', t).strip()


def parse(path):
    """Questions in a KEY document: stem, options, marked answer, rationales."""
    qs, cur = {}, None
    for raw in analyze.paragraphs(path):
        n = norm(raw)
        if not n:
            continue
        m = OPT.match(n)
        if m and cur is not None:
            body = m.group(2)
            if '✓' in body or '✔' in body:
                qs[cur]['mark'] = m.group(1)
            qs[cur]['opts'][m.group(1)] = body.replace('✓', '').replace('✔', '').strip()
            continue
        m = STEM.match(n)
        if m:
            cur = f"Q{m.group(1)}"
            qs[cur] = {'stem': m.group(2), 'opts': {}, 'why': {}, 'mark': None, 'extra': []}
            continue
        m = QLINE.match(n)
        if m:
            cur = m.group(1)
            qs[cur] = {'stem': m.group(4), 'opts': {}, 'why': {}, 'mark': None, 'extra': []}
            continue
        if cur is None:
            continue
        m = WHY.match(n)
        if m:
            qs[cur]['why'][m.group(1)] = m.group(2)
        else:
            qs[cur]['extra'].append(n)
    return qs


def flags_for(before, after):
    """Everything worth a human reading, for one question."""
    out = []
    stem = after['stem']
    opts = after['opts']
    low = stem.lower()

    # orphan: a demonstrative whose noun is not introduced in the stem
    for m in re.finditer(r'\b(that|those|this|these|the same)\s+(' + ABSTRACT + r')\b', low):
        noun = m.group(2)
        head = low[:m.start()]
        if noun not in head and noun.rstrip('s') not in head:
            out.append(('orphan', f'"{m.group(0)}" has no antecedent in the stem'))

    # count: a number word against what the stem or options supply
    for m in re.finditer(r'\b(all\s+)?(' + '|'.join(NUMWORD) + r')\s+([a-z-]+)\b', low):
        want = NUMWORD[m.group(2)]
        noun = m.group(3)
        listed = len(re.findall(r'[;,]|\band\b', stem[m.end():])) + 1
        if noun in ('channels', 'criteria', 'terms', 'behaviors', 'principles',
                    'controls', 'techniques', 'weaknesses', 'statements', 'steps'):
            if want != len(opts) and want > listed:
                out.append(('count', f'stem promises {m.group(0)!r} but supplies about {listed}'))

    # dangling pronoun
    for w in ('both', 'each of these', 'the former', 'the latter', 'all three'):
        if re.search(r'\b' + re.escape(w) + r'\b', low):
            subject = low.split(w)[0]
            if len(re.findall(r'\band\b|,', subject)) == 0 and not opts:
                out.append(('dangling', f'"{w}" with nothing plural before it'))

    # drift: the rationale quotes wording the edit changed
    for letter, why in after['why'].items():
        for phrase in re.findall(r"'([^']{12,60})'", why) + re.findall(r'"([^"]{12,60})"', why):
            hay = (stem + ' ' + ' '.join(opts.values())).lower()
            if phrase.lower() not in hay and phrase.lower() in (
                    before['stem'] + ' ' + ' '.join(before['opts'].values())).lower():
                out.append(('drift', f'rationale {letter} quotes "{phrase}" which the edit removed'))

    # register: "Which statement" against noun-phrase options
    if opts and re.search(r'\bwhich statement\b', low):
        clausey = sum(1 for v in opts.values()
                      if re.search(r'\b(is|are|was|were|can|does|do|will|has|have|lets|'
                                   r'allows|means|requires|causes|makes|gives)\b', v.lower()))
        if clausey <= len(opts) // 3:
            out.append(('register', 'asks for a "statement" but the options are noun phrases'))

    # grammar residue
    if re.match(r'^[a-z]', stem):
        out.append(('grammar', 'stem starts lowercase'))
    if re.search(r'\b(\w+)\s+\1\b', low):
        out.append(('grammar', 'a word is doubled'))
    if re.search(r'\b(the|a|an|of|to|its|for|with|per|under)\s*[.?!]\s*$', low):
        out.append(('grammar', 'stem ends on a dangling word'))
    if '  ' in stem:
        out.append(('grammar', 'double space'))
    return out


def main(before_root, after_root, show_all=False):
    rows = []
    examined = 0
    for dirpath, _, names in os.walk(before_root):
        for n in sorted(names):
            if scope.classify(n) != 'key':
                continue
            rel = os.path.relpath(os.path.join(dirpath, n), before_root)
            after_path = os.path.join(after_root, rel)
            if not os.path.exists(after_path):
                continue
            b, a = parse(os.path.join(before_root, rel)), parse(after_path)
            for q in a:
                if q not in b:
                    continue
                if b[q]['stem'] == a[q]['stem'] and b[q]['opts'] == a[q]['opts'] and not show_all:
                    continue
                examined += 1
                f = flags_for(b[q], a[q])
                if f or show_all:
                    rows.append((rel, q, b[q], a[q], f))
    flagged = [r for r in rows if r[4]]
    print(f"questions I changed : {examined}")
    print(f"questions flagged   : {len(flagged)}")
    kinds = {}
    for *_, f in rows:
        for k, _m in f:
            kinds[k] = kinds.get(k, 0) + 1
    for k, v in sorted(kinds.items(), key=lambda x: -x[1]):
        print(f"   {k:9s} {v}")
    print()
    for rel, q, b, a, f in flagged:
        print('=' * 78)
        print(f"{rel}  {q}")
        for k, msg in f:
            print(f"   [{k}] {msg}")
        print(f"   BEFORE: {b['stem'][:300]}")
        print(f"   AFTER : {a['stem'][:300]}")
        for L in sorted(a['opts']):
            mark = ' *' if a['mark'] == L else '  '
            print(f"     {mark}{L}. {a['opts'][L][:150]}")
    return 0


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], '--all' in sys.argv)

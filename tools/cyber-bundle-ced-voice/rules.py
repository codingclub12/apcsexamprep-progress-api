"""
The mechanical half of the rewrite.

A rule lives here only when it produces a GRAMMATICAL sentence for every case it
matches. Everything else goes in repairs.json, hand-written, because a deletion
that leaves "and cite the exact." is the defect this whole tool exists to undo.

Ordering matters: the leading-clause rules run before the modifier rules, so
"According to the CED, which CB malware type..." loses the clause first and then
the modifier, rather than the modifier rule stranding a comma.
"""
import re

# ── helpers ─────────────────────────────────────────────────────────────────
# Item numbering ("12. ", "Question 1. ") sits in front of a stem, so a
# leading-clause rule has to look past it and recapitalise after it.
LEAD = r'^(\s*(?:Question\s+)?\d+[.)]\s+|\s*)'


def _cap_after(m, rest):
    """Re-capitalise the sentence that just lost its opening clause."""
    rest = rest.lstrip()
    if rest and rest[0].islower():
        rest = rest[0].upper() + rest[1:]
    return m.group(1) + rest


def _drop_lead(rx):
    def f(text):
        m = re.match(LEAD + rx, text, re.I)
        if not m:
            return text
        return _cap_after(m, text[m.end():])
    return f


def _drop_clause(rx_str):
    """
    Remove a citation clause wherever it sits, and recapitalise the word that now
    opens the sentence. Most stems put the scenario first and the citation second:
      "... run on battery power. According to the CED, what category are these?"
    so a start-anchored rule never sees them.

    Recapitalisation happens ONLY at the point of removal. An earlier version
    re-ran a global "capitalise after a period" pass over the whole paragraph
    every time any clause rule was consulted, which turned "at 2 a.m. the building
    is empty" into "at 2 a.m. The building is empty" in text it had not otherwise
    touched.
    """
    rx = re.compile(r'(?:(?<=^)|(?<=[.!?])\s+|(?<=[.!?][\u2019\u201d"\'])\s+|(?<=:)\s+)'
                    + rx_str, re.I)

    def f(text):
        out = text
        while True:
            m = rx.search(out)
            if not m:
                return out
            whole = m.group(0)
            lead = whole[:len(whole) - len(whole.lstrip())]
            rest = out[m.end():]
            if rest and rest[0].islower():
                rest = rest[0].upper() + rest[1:]
            out = out[:m.start()] + lead + rest
    return f


def _sub(pattern, repl, flags=re.I):
    rx = re.compile(pattern, flags)
    return lambda text: rx.sub(repl, text)


# Verbs seen following "the CED" / "the College Board" in this bundle. When one
# of these is next, the framework is the SUBJECT of the sentence and removing it
# leaves "does the say ...". Those stems need rewriting, not deleting, so they
# are pushed to residue for a hand-written repair.
VERB_AFTER = (
    r'say|says|said|describe|describes|define|defines|list|lists|call|calls|'
    r'classify|classifies|state|states|recommend|recommends|emphasize|emphasizes|'
    r'name|names|rate|rates|suggest|suggests|treat|treats|require|requires|'
    r'frame|frames|associate|associates|place|places|specify|specifies|'
    r'include|includes|expect|expects|tell|tells|note|notes|indicate|indicates|'
    r'mean|means|refer|refers|group|groups|distinguish|distinguishes|'
    r'identify|identifies|allow|allows|warn|warns|advise|advises|assign|assigns|'
    r'apply|applies|cover|covers|address|addresses|show|shows|give|gives|'
    r'provide|provides|make|makes|set|sets|use|uses|consider|considers|'
    r'separate|separates|prohibit|prohibits|permit|permits|report|reports'
)

# ── the rules ───────────────────────────────────────────────────────────────
RULES = [
    # 1. Opening citation clauses. The question underneath is unchanged.
    ('lead_according',  _drop_lead(r"According to the CED(?:'s [\w\s-]+?)?,\s*")),
    ('lead_per',        _drop_lead(r"Per the CED,\s*")),
    ('lead_incedterms', _drop_lead(r"In CED terms,\s*")),
    ('lead_cbframe',    _drop_lead(r"According to the CB framework,\s*")),

    # 2. Trailing / parenthetical citation clauses.
    ('tail_perced',     _sub(r',\s*per the CED\b', '')),
    ('tail_accordingto', _sub(r',\s*according to the CED\b', '')),
    ('tail_citingced',  _sub(r',?\s*citing the CED\b', '')),
    ('tail_alignsced',  _sub(r'\baligns with the CED\b', 'is correct')),

    # 3. The framework as a modifier in front of a noun it does not change.
    #    "the CB malware type" is just "the malware type": the taxonomy is the
    #    lesson's content, and naming its owner adds nothing a student can use.
    ('mod_the_ced',     _sub(r"\bthe\s+(?:CED|CB)(?:'s)?\s+"
                             r"(malware|device|password|detection|risk|attack|vulnerabilit|"
                             r"categor|term|control|defen|weakness|criteri|indicator|IoC|"
                             r"name|type|three|four|seven|illustrative)", r'the \1')),
    ('mod_bare_ced',    _sub(r"\b(?:CED|CB)\s+"
                             r"(malware type|device vulnerabilit\w*|device weakness|"
                             r"password attack|detection method|risk level|attack|"
                             r"vulnerabilit\w*|categor\w+|terms?|controls?|defenses?|"
                             r"name|type|criteria|IoC type|indicator types?)", r'\1')),
    ('mod_exact_ced',   _sub(r'\bthe exact\s+(?:CED|CB)\s+', 'the exact ')),
    ('mod_correct_ced', _sub(r'\bthe correct\s+(?:CED|CB)\s+', 'the correct ')),
    ('mod_its_ced',     _sub(r"\bits\s+(?:CED|CB)\s+(name|type|categor\w+|attack name)", r'its \1')),
    ('mod_each_ced',    _sub(r'\beach\s+(?:CED|CB)\s+(attack|control|method)', r'each \1')),
    ('mod_a_ced',       _sub(r'\ba\s+(?:CED|CB)\s+(risk level|malware type)', r'a \1')),
    ('mod_which_ced',   _sub(r'\bwhich\s+(?:CED|CB)\s+', 'which ')),
    ('mod_two_ced',     _sub(r'\b(two|three|four|five|six|seven)\s+(?:CED|CB)\s+', r'\1 ')),

    # 4. Course-navigation labels. The distinction is real and useful to a
    #    student; only the insider name for it is not.
    ('track_standard',  _sub(r'\bCB Standard\b', 'Standard')),
    ('track_enrich',    _sub(r'\bbeyond CB-required content\b',
                             'beyond what the AP exam requires')),
    ('track_notreq',    _sub(r'\bNOT required by the CED\b', 'NOT required')),
    ('track_notreq2',   _sub(r'\bnot required by the CED\b', 'not required')),
    ('track_beyondced', _sub(r'\bbeyond the CED-required content\b',
                             'beyond what the AP exam requires')),
    ('scenario_cb',     _sub(r'\bCB Scenario\b', 'Scenario')),
    ('scenario_official', _sub(r'\bthe official College Board scenario\b',
                               'the official course scenario')),

    # 5. Curriculum-mapping metadata. A student cannot act on an LO number.
    ('drop_lo_map',     _sub(r'\s*(?:Everything|Both parts|All of it)\s+maps?\s+to\s+'
                             r'CB\s+Learning\s+Objectives?.*?\.(?=\s|$)', '')),
    # The whole sourcing clause goes, verb included. Dropping only its object
    # leaves "...and first-match-wins ordering follow." on a student handout.
    ('drop_ek_source',  _sub(r';\s*[^;]*?\bfollows?\s+the\s+(?:College\s+Board\s+)?AP\s+'
                             r'Cybersecurity\s+Course\s+and\s+Exam\s+Description\s*'
                             r'\(Effective\s+Fall\s+\d{4}\)\s*\.', '.')),
    ('vocab_ced',       _sub(r'\busing the CED vocabulary\b', 'using precise security vocabulary')),

    # 6. Bare code tails parenthesised into a list a student reads aloud in a
    #    discussion: "unpatched software (C.1), weak authentication (C.2)".
    #    The names are the content; the letters are the filing system.
    ('drop_bare_code',  _sub(r'\s*\((?:EK\s*)?[A-F]\.\d+\)', '')),
    ('drop_code_number', _sub(r'\b(the exact vulnerability)\s+\d\.\d\.[A-F]\s+number\b', r'\1')),
    ('drop_citing_eks', _sub(r'\bciting the EKs\b', 'citing the evidence')),
    ('drop_cite_ek',    _sub(r'\bcite the matching\s+EK\s*[\d.A-F–—\s-]*', 'cite the matching control ')),

    # 7. A code cited as the authority, same shape as "According to the CED".
    ('lead_according_ek', _drop_lead(r'According to EK\s+[\d.A-F]+'
                                     r'(?:\s*(?:and|,|/|–|—|-)\s*[A-F0-9.]+)*\s*,\s*')),
    ('lead_per_ek',       _drop_lead(r'Per EK\s+[\d.A-F]+'
                                     r'(?:\s*(?:and|,|/|–|—|-)\s*[A-F0-9.]+)*\s*,\s*')),
    ('tail_per_ek',     _sub(r',\s*per\s+EK\s+[\d.A-F]+(?:\s*(?:and|,|/|–|—|-)\s*[A-F0-9.]+)*'
                             r'(?=[?.])', '')),
    ('drop_paren_ek',   _sub(r'\s*\((?:EK|LO)\s+[\d.A-F][\d.A-F,/–—\s-]*\)', '')),
    ('drop_comma_lo',   _sub(r',\s*(?:EK|LO)\s+[\d.A-F][\d.A-F,/–—\s-]*(?=\))', '')),
    ('eks_plural',      _sub(r'\bcite both EKs\b', 'cite both pieces of evidence')),
    ('eks_two',         _sub(r'\btwo EKs\b', 'two ideas')),

    # 8. Any remaining "the CED/CB/College Board <common noun>" modifier. Anchored
    #    on a lowercase next word so "the CB Learning Objectives" is left to
    #    drop_lo_map rather than being turned into "the Learning Objectives".
    ('mod_generic_ced', _sub(r"\bthe\s+(?:CED|CB)(?:'s)?\s+(?!(?:" + VERB_AFTER + r")\b)(?=[a-z])", 'the ')),
    ('mod_generic_board', _sub(r"\bthe\s+College\s+Board(?:'s)?\s+(?!(?:" + VERB_AFTER + r")\b)(?=[a-z])", 'the ')),
    ('mod_cb_required', _sub(r'\bthe\s+CB-required\b', 'the required')),
    ('mod_cb_hyphen',   _sub(r'\bCB-required\b', 'required')),

    # 9. The same citation clause, but sitting mid-paragraph after the scenario
    #    rather than opening the stem. This is the commonest shape in the bundle.
    ('clause_according', _drop_clause(r"According to the CED(?:'s [\w\s-]+?)?,\s*")),
    ('clause_per',       _drop_clause(r"Per the CED,\s*")),
    ('clause_inced',     _drop_clause(r"In CED terms,\s*")),
    ('from_the_ced',    _sub(r'\s+from the CED\b', '')),

    # 10. Whatever is left of the framework standing in front of a common noun.
    #     Anchored on a lowercase next word, so the capitalised proper names
    #     ("CB Standard", "CB Scenario 3B", "CB Learning Objectives") are left to
    #     their own rules above rather than being silently decapitated.
    ('mod_bare_generic', _sub(r'\b(?:CED|CB)\s+(?!(?:' + VERB_AFTER + r')\b)(?=[a-z])', '')),
    ('drop_code_number2', _sub(r'(?<!EK )\s+\d\.\d\.[A-F]\s+number\b', '')),
    ('drop_paren_code',  _sub(r'\s*\(\d\.\d\.[A-F](?:\.\d+)?\)', '')),

    # 11. Hyphenated framework adjectives: "CB-specified technique".
    ('adj_correct',     _sub(r'\b(?:CED|CB)-correct\b', 'correct')),
    ('adj_standard',    _sub(r'\b(?:CED|CB)-standard\b', 'standard')),
    ('adj_drop',        _sub(r'\b(?:CED|CB)-(?:specified|based|recommended|named|aligned)\s+', '')),

    # 12. The citation as a trailing tag rather than an opening clause.
    ('tail_described',  _sub(r'\s+(?:as\s+)?described\s+(?:in|by)\s+the\s+CED\b', '')),
    ('tail_accordingto2', _sub(r'\s+according to the CED\b', '')),
    ('tail_inthe_ced',  _sub(r'\s+in the CED\b', '')),
    ('tail_matches_ced', _sub(r'\s+matches the CED\b', ' is correct')),

    # 13. Curriculum mapping without the "CB" prefix ("Both map to Learning
    #     Objectives 1.2.A, 1.2.B, and 1.2.C.").
    ('drop_lo_map2',    _sub(r'\s*(?:Everything|Both parts|Both|All of it)\s+maps?\s+to\s+'
                             r'(?:CB\s+)?Learning\s+Objectives?.*?\.(?=\s|$)', '')),
    ('drop_lo_drawn',   _sub(r'\s+drawn from (?:LO|EK)\s+[\d.A-F]+', '')),

    # 14. The CED named as the source of a scenario or a log pattern.
    ('drop_ced_title',  _sub(r'\s*,?\s*(?:and\s+)?(?:aligned to|named in|listed in|follows?|following)?\s*'
                             r'the\s+AP\s+Cybersecurity\s+Course\s+and\s+Exam\s+Description'
                             r'\s*\(Effective\s+Fall\s+\d{4}\)'
                             r'(?:\s*,?\s*(?:and\s+)?(?:LO|EK)?\s*[\d]\.[\d]\.[A-F][\d.A-F–—-]*)*', '')),

    # 15. A bare code standing in as an adjective: "the 3.2.A policy",
    #     "what 1.2.C defense", "Unencrypted drive A.1".
    ('code_adj_pair',   _sub(r'(?<!EK )\b\d\.\d\.[A-F]\s+or\s+\d\.\d\.[A-F]\s+(?=[a-z])', '')),
    ('code_adj',        _sub(r'(?<!EK )\b\d\.\d\.[A-F](?:\.\d+)?\s+(?=[a-z])', '')),
    ('code_tail_item',  _sub(r'(?<!EK )\s+[A-F]\.\d+(?=\s*[,)])', '')),
    ('drop_its_paren',  _sub(r'\s*\((?:with\s+)?its\)', '')),

    # 16. The EK code cited as the authority, mid-paragraph, after the scenario.
    #     The commonest shape in Units 2 and 3.
    ('clause_per_ek2',   _drop_clause(r'Per EK\s+[\d.A-F]+(?:\s*(?:and|,|/|–|—|-)\s*[A-F0-9.]+)*\s*,\s*')),
    ('clause_acc_ek2',   _drop_clause(r'According to EK\s+[\d.A-F]+(?:\s*(?:and|,|/|–|—|-)\s*[A-F0-9.]+)*\s*,\s*')),
    ('clause_using_ek',  _drop_clause(r'Using EK\s+[\d.A-F]+\s*,\s*')),
    ('clause_drawing_ek', _drop_clause(r'Drawing on EK\s+[\d.A-F]+\s*,\s*')),

    # 17. The code as a trailing qualifier on a stem.
    ('tail_as_described', _sub(r',?\s*as described in EK\s*[\d.A-F]*', '')),
    ('tail_as_defined',  _sub(r',?\s*as defined in EK\s*[\d.A-F]*', '')),
    ('tail_from_ek',     _sub(r'\s+from EK\b(?!\s*\d)', '')),
    ('tail_with_eks',    _sub(r'\s+with EKs\b', '')),
    ('tail_using_ced',   _sub(r'\bUsing the CED,\s*', '')),

    # 18. "Which EK best explains ...?" asks a student to name a code. The
    #     established answer, from tools/bundle-quiz-relabel/plan.py, is to ask
    #     for the statement instead: the question survives, the filing system does
    #     not.
    ('which_ek',        _sub(r'\bWhich EK\b', 'Which statement')),
    ('the_ek_that',     _sub(r'\bthe EK that\b', 'the statement that')),
    ('matches_ek',      _sub(r'\bmatches EK\s+[\d.A-F]+', 'matches that definition')),
    ('reflect_ek',      _sub(r'\bcorrectly reflect EK\s+[\d.A-F]+', 'are correct')),
    ('explains_ek',     _sub(r'\b(best (?:explains|supports|describes|captures))\s+EK\s+[\d.A-F]+', r'\1')),
    ('tail_per_ek2',    _sub(r'\s+per\s+EK\s+[\d.A-F]+(?:\s*,?\s*(?:and|or|/)\s*[A-F0-9.]+)*', '')),
    ('tail_from_ek2',   _sub(r'\s+from\s+EK\s+[\d.A-F]+', '')),

    # 19. The citation clause whose code an earlier strip already removed, leaving
    #     "8. According to, a vulnerability is best defined as ...". The clause is
    #     what has to go; the question underneath is intact.
    ('clause_accord_bare', _drop_clause(r'According to,\s*')),
    ('lead_accord_bare',   _drop_lead(r'According to,\s*')),
    ('tail_described_bare', _sub(r',\s*as described in,\s*', ' ')),
    ('tail_defined_bare',  _sub(r',\s*as defined in,\s*', ' ')),

    # 20. A parenthesised list of bare code tails: "(B.6, B.7)".
    ('drop_bare_code_list', _sub(r'\s*\((?:EK\s*)?[A-F]\.\d+(?:\s*,\s*[A-F]\.\d+)+\)', '')),
]

# Bare-code stripping is the least specific thing in this file and must run LAST.
# Run early, it eats the codes out of "Per EK 4.2.D.4 and D.5, which two settings
# ...?" and leaves "Per EK and, which two settings ...?" for the clause rule that
# was about to remove the whole citation cleanly.
_LAST = ('drop_bare_code', 'drop_code_number', 'drop_comma_lo', 'drop_code_number2',
         'drop_paren_code', 'code_adj_pair', 'code_adj', 'code_tail_item')
RULES = ([r for r in RULES if r[0] not in _LAST]
         + [r for r in RULES if r[0] in _LAST])

# ── KEY-only: a leading code on an option moves to a trailing parenthetical ──
# The student reads "A. Manipulating an authorized person into granting access";
# the teacher reads the same sentence with "(EK 2.2.A.2)" after it. That is the
# convention already used by Q20/Q21/Q24 of the 2.2 quiz and by KEY_REPAIRS in
# tools/bundle-quiz-relabel/plan.py, so the two copies stay the same instrument.
OPTION_CODE = re.compile(r'^([A-E]\.\s+)(?:EK\s+)?(\d\.\d\.[A-F](?:\.\d+)?)\s*[—–-]\s*(\S)')

# The same option line after an earlier strip took the code and left the dash:
#   KEY      D. EK 1.2.A.2 — logging in successfully from a known device
#   STUDENT  D. — logging in successfully from a known device
# Only the student copies carry this, which is why it never showed up beside the
# KEY's own citation.
OPTION_DASH = re.compile(r'^([A-E]\.\s*)[—–-]\s+(\S)')


def option_dash(text):
    m = OPTION_DASH.match(text)
    if not m:
        return text
    rest = text[m.end() - 1:]
    return m.group(1) + rest[0].upper() + rest[1:]


def option_code(text, kind):
    m = OPTION_CODE.match(text)
    if not m:
        return text
    body = text[m.end() - 1:]
    body = body[0].upper() + body[1:]
    if kind == 'key':
        return f'{m.group(1)}{body} (EK {m.group(2)})'
    return f'{m.group(1)}{body}'


# ── whitespace and punctuation left behind by a deletion ────────────────────
CLEANUPS = [
    (re.compile(r'[ \t]{2,}'), ' '),
    (re.compile(r'\s+([,.;:?!])'), r'\1'),
    (re.compile(r'\(\s+'), '('),
    (re.compile(r'\s+\)'), ')'),
    (re.compile(r'\.\s*\.'), '.'),
    (re.compile(r',\s*,'), ','),
    (re.compile(r'^\s*[,;]\s*'), ''),
]


# A rewrite that introduces any of these has broken the sentence. The tool refuses
# it and reports the paragraph instead, because a half-stripped stem shipped to a
# paying teacher is the exact defect being repaired here: "and cite the exact."
DAMAGE = [
    ('dangling_tail', re.compile(r'\b(?:the|a|an|of|to|its|their|exact|matching|under|'
                                 r'from|with|per|and|or|for|both)\s*[.?!]\s*$', re.I)),
    ('double_space',  re.compile(r'  ')),
    ('space_punct',   re.compile(r'\s[.,;:?!]')),
    ('dup_word',      re.compile(r'\b(\w+)\s+\1\b', re.I)),
    ('empty_paren',   re.compile(r'\(\s*\)')),
    ('dangling_comma', re.compile(r',\s*[.?!]')),
    ('double_punct',  re.compile(r'\.{2,}|\?\s*\?')),
    ('orphan_dash',   re.compile(r'[—–]\s*[.?!]|[—–]\s*$')),
    ('starts_lower',  re.compile(r'^\d+\.\s+[a-z]')),
    ('orphan_ek',     re.compile(r'\bEKs?\s+(?:and|or|,|\.)')),
]


def introduces_damage(old, new):
    """Damage patterns present in the rewrite that were NOT already in the source."""
    old_n = re.sub(r'\s+', ' ', old).strip()
    return [name for name, rx in DAMAGE if rx.search(new) and not rx.search(old_n)]


# The trailing citation option_code() just created is the teacher's, and the
# code-dropping rules below would immediately strip it back off. Park it behind a
# sentinel for the duration rather than reordering twenty rules around one case.
SENTINEL = '\u0001EKCITE\u0001'


def rewrite(text, kind='student'):
    """Returns (new_text, [rule ids applied])."""
    applied = []
    out = option_code(text, kind)
    if out != text:
        applied.append('option_code')
    dashed = option_dash(out)
    if dashed != out:
        out = dashed
        applied.append('option_dash')
    parked = None
    m = re.search(r'\s*\(EK\s+[\d.A-F]+\)$', out)
    if 'option_code' in applied and kind == 'key' and m:
        parked = m.group(0)
        out = out[:m.start()] + SENTINEL
    for rid, fn in RULES:
        before = out
        out = fn(out)
        if out != before:
            applied.append(rid)
    if applied:
        for rx, repl in CLEANUPS:
            out = rx.sub(repl, out)
        out = out.strip() if text.strip() == text else out
    if parked is not None:
        out = out.replace(SENTINEL, '') + parked
    # Refuse our own output rather than ship a broken sentence.
    if applied and introduces_damage(text, out):
        return text, []
    return out, applied

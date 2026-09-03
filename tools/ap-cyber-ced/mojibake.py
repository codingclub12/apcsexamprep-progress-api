"""Mojibake detection for the CED tooling.

PORT OF lib/mojibake.js. Read that file for why any of this is shaped the way
it is; the reasoning is not repeated here, because a second copy of the
reasoning is how the two drift apart. smoke/mojibake-parity.js runs both
implementations over the same corpus and fails if their verdicts differ, so a
change to one that is not made here goes red rather than going unnoticed.

WHAT THIS REPLACES, AND WHY IT WAS NOT ENOUGH. Both CED tools carried a list of
four literal strings:

    validate_csv.py   patterns written as escapes, which was right
    verify_import.py  the same patterns written as raw characters, under a
                      comment claiming they were escapes so the repository
                      encoding guard would not flag the file. They were not
                      escapes, the comment described an intention nobody
                      implemented, and the corrected guard flagged the file on
                      its first run.

Neither list could see a corrupted emoji. A 4 byte character corrupted through
cp1252 begins with an eth, not an a-circumflex, and matches none of the four
patterns. validate_csv.py gates CED CSV imports into the live store, so that
blindness is one import away from corrupted text on a student page.

A list of literals also cannot tell you it has stopped working. This is
structural instead: it derives the sequence width from the lead byte and
reverses through both single byte codecs. No em-dashes, per repo convention.
"""

# cp1252 in 0x80-0x9F, where latin-1 puts C1 controls. The five slots cp1252
# leaves formally undefined are included as pass-through, matching WHATWG.
CP1252_HIGH = {
    0x80: 0x20AC, 0x81: 0x0081, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
    0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030,
    0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8D: 0x008D, 0x8E: 0x017D,
    0x8F: 0x008F, 0x90: 0x0090, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
    0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC,
    0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9D: 0x009D,
    0x9E: 0x017E, 0x9F: 0x0178,
}
CP1252_TO_BYTE = {chr(cp): b for b, cp in CP1252_HIGH.items()}

CODECS = ('latin1', 'cp1252')   # order sets attribution, not coverage
LEAD_MIN = 0xC2                 # 0xC0 and 0xC1 are never legal UTF-8 leads
LEAD_MAX = 0xF4                 # 0xF5 and above are never legal either
MAX_DEPTH = 8


def _to_byte(ch, codec):
    cp = ord(ch)
    if codec == 'cp1252':
        b = CP1252_TO_BYTE.get(ch)
        if b is not None:
            return b
        return cp if (cp <= 0x7F or 0xA0 <= cp <= 0xFF) else None
    return cp if cp <= 0xFF else None


def width_for_lead(lead):
    if lead <= 0xDF:
        return 2
    if lead <= 0xEF:
        return 3
    return 4


def analyze(text, cap=None):
    """Return one hit per corrupted character, in order."""
    hits = []
    i = 0
    n = len(text)
    while i < n:
        if cap is not None and len(hits) >= cap:
            break
        lead = ord(text[i])
        if lead < LEAD_MIN or lead > LEAD_MAX:
            i += 1
            continue
        w = width_for_lead(lead)
        if i + w > n:
            i += 1
            continue

        hit = None
        for codec in CODECS:
            raw = bytearray()
            usable = True
            for k in range(w):
                b = _to_byte(text[i + k], codec)
                # Every byte after the lead must be a continuation byte, or the
                # detector would read straight across a word boundary.
                if b is None or (k > 0 and not (0x80 <= b <= 0xBF)):
                    usable = False
                    break
                raw.append(b)
            if not usable:
                continue
            raw = bytes(raw)
            try:
                decoded = raw.decode('utf-8')
            except UnicodeDecodeError:
                continue
            # Exactly one character. Python's strict UTF-8 decoder already
            # raises on overlong forms and surrogates, so the re-encode check
            # that used to sit here went out with its JavaScript counterpart:
            # no mutation could kill it. smoke/mojibake-parity.js pins both.
            if len(decoded) != 1:
                continue
            hit = {'index': i, 'width': w, 'codec': codec,
                   'chunk': text[i:i + w], 'fixed': decoded}
            break

        if hit:
            hits.append(hit)
            i += w
        else:
            i += 1
    return _accept_runs(hits)


SAFE_LEAD_MIN = 0xC2
SAFE_LEAD_MAX = 0xC3


def _is_exotic(h):
    if h['width'] != 2:
        return False
    lead = ord(h['chunk'][0])
    return lead < SAFE_LEAD_MIN or lead > SAFE_LEAD_MAX


def _accept_runs(hits):
    """Drop 2 byte candidates with an exotic lead that stand alone.

    Part of the definition rather than a technique, so lib/mojibake.js carries
    the identical rule and smoke/mojibake-parity.js fails if they diverge. A
    capital O-diaeresis followed by an en dash is valid UTF-8 for a Hebrew
    accent, and it is also just ordinary Finnish. What separates real mojibake
    is that it corrupts everything it touches, so it arrives in runs.
    """
    keep = [not _is_exotic(h) for h in hits]
    changed = True
    while changed:
        changed = False
        for i, h in enumerate(hits):
            if keep[i]:
                continue
            prev_ok = (i > 0 and keep[i - 1]
                       and hits[i - 1]['index'] + hits[i - 1]['width'] == h['index'])
            next_ok = (i + 1 < len(hits) and keep[i + 1]
                       and h['index'] + h['width'] == hits[i + 1]['index'])
            if prev_ok or next_ok:
                keep[i] = True
                changed = True
    return [h for i, h in enumerate(hits) if keep[i]]


def repair_once(text):
    hits = analyze(text)
    if not hits:
        return text, hits
    out = []
    at = 0
    for h in hits:
        out.append(text[at:h['index']])
        out.append(h['fixed'])
        at = h['index'] + h['width']
    out.append(text[at:])
    return ''.join(out), hits


def repair(text):
    """Reverse the damage until it stops changing. Bounded, never a while loop."""
    cur = text
    depth = 0
    while depth < MAX_DEPTH:
        nxt, hits = repair_once(cur)
        if not hits:
            break
        cur = nxt
        depth += 1
    return {'text': cur, 'depth': depth, 'truncated': depth == MAX_DEPTH}


def has_mojibake(text):
    return bool(analyze(text, cap=1))

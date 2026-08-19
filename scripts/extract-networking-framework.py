"""Column-aware extraction of AP Networking EK statements.

The framework is a two-column layout: learning objectives at x0 ~70, essential
knowledge at x0 ~225. A naive linear text extraction interleaves them and, on
some pages, emits statement text BEFORE its code, which silently attributes the
wrong text to a code. Splitting by x-coordinate and walking each column top to
bottom removes the ambiguity.
"""
import re, json, sys
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LAParams

# A code box sometimes carries the first word of its statement, for example
# "4.3.A.6 cd" or "4.4.C.1 traceroute", where a monospace command merged into the
# code's box. So match the code at the START and keep the remainder as text.
EK_CODE = re.compile(r'^([1-4]\.[1-6]\.[A-F]\.\d+)(?![\d.])\s*(.*)$')
LO_CODE = re.compile(r'^([1-4]\.[1-6]\.[A-F])(?![\d.])\s*(.*)$')
COL_SPLIT = 200      # x0 below this is the LO column, above is the EK column
FOOTER_Y = 40        # page furniture sits below this

def clean(s):
    s = s.replace('\x08', ' ')
    s = re.sub(r'[\u2000-\u200b\u00a0]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    # Topic-start pages render their first row TWICE in the PDF, so a box can
    # arrive as "4.2.A.1 4.2.A.1" or "Network Network protocols define ...".
    # Collapse a whole-string doubling first, then a doubled leading word.
    half = len(s) // 2
    if len(s) % 2 == 1 and s[half] == ' ' and s[:half] == s[half + 1:]:
        s = s[:half]
    s = re.sub(r'^(\S+) \1(?=\s)', r'\1', s)
    return s.strip()


def column_split(boxes):
    """Where the LO column ends and the EK column begins, ON THIS PAGE.

    The framework uses at least two page geometries: LO at x0~70 with EK at
    x0~225, and LO at x0~201 with EK at x0~355. A single hardcoded split puts
    both columns on the same side for one of them, which silently swallows the
    first essential knowledge statement of a topic. So the split is derived from
    where the codes actually sit on each page.
    """
    lo_x = [b.x0 for b in boxes if LO_CODE.match(clean(b.get_text()))]
    ek_x = [b.x0 for b in boxes if EK_CODE.match(clean(b.get_text()))]
    if lo_x and ek_x and min(ek_x) > min(lo_x):
        return (min(lo_x) + min(ek_x)) / 2
    return COL_SPLIT


def run(path):
    ek, lo = {}, {}
    for layout in extract_pages(path, laparams=LAParams(detect_vertical=False)):
        boxes = [b for b in layout if isinstance(b, LTTextContainer) and b.y1 > FOOTER_Y]
        split = column_split(boxes)
        for want_ek, store, code_re in ((False, lo, LO_CODE), (True, ek, EK_CODE)):
            sel = [b for b in boxes if (b.x0 >= split) == want_ek]
            sel.sort(key=lambda b: (-b.y1, b.x0))
            current, buf = None, []
            for b in sel:
                s = clean(b.get_text())
                if not s:
                    continue
                m = code_re.match(s)
                if m:
                    if current:
                        store.setdefault(current, []).extend(buf)
                    rest = m.group(2).strip()
                    current, buf = m.group(1), ([rest] if rest else [])
                    continue
                if EK_CODE.match(s) or LO_CODE.match(s):  # a code of the other kind
                    if current:
                        store.setdefault(current, []).extend(buf)
                    current, buf = None, []
                    continue
                if current:
                    buf.append(s)
            if current:
                store.setdefault(current, []).extend(buf)
    tidy = lambda d: {k: clean(' '.join(v)).replace('\u00a7', '\n- ') for k, v in d.items()}
    return tidy(ek), tidy(lo)


if __name__ == '__main__':
    ek, lo = run(sys.argv[1] if len(sys.argv) > 1 else 'net-framework.pdf')
    json.dump({'ek': ek, 'lo': lo}, open('framework-statements.json', 'w'), indent=1)
    print(f"EK: {len(ek)}   LO: {len(lo)}")

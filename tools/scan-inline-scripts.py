#!/usr/bin/env python3
"""Find inline <script> blocks on a live page that a browser cannot run.

WHY THIS EXISTS
Two live defects on 2026-09-03 were invisible to every check this repo runs. A
page with a dead script still answers 200, still carries every string a link
check or a content check looks for, and still renders its markup. Only the
INTERACTION is gone, and nothing was looking at that.

  ap-csa-lesson-1-9-method-signatures   Check answer does nothing and the Java
                                        editor never renders
  ap-csp-filtering-sorting-practice     the whole question array is undefined,
                                        so no answer is ever scored

TWO FAULTS, AND THEY FAIL DIFFERENTLY

  SYNTAX   the block does not parse, so the browser skips the WHOLE block and
           every widget it would have built silently does not exist. On 1.9
           this was `re` newline `turn ''` : the keyword return, split in half.
           Zero CodeMirror editors on a page whose problems are authored.

  ASI      the block PARSES, because Automatic Semicolon Insertion rescues it,
           and then throws at runtime. On 1.9 this was

               var letter = opt.getAtt
           ribute('data-letter');

           which ASI reads as `opt.getAtt;` then `ribute(...)`, a ReferenceError
           on the first option. The click handler had already set
           data-answered, so the student gets no feedback and the question is
           locked on their first pick forever.

           This is the one that matters, because `node --check` PASSES on it.
           Nothing static catches an ASI split; it has to be looked for.

WHAT IT WILL NOT CATCH
A script that parses and runs and is simply wrong. This is a liveness check on
the script, not a correctness check on the page.

Usage: python3 tools/scan-inline-scripts.py <saved-page.html> [...]
Fetch the pages through lib/storefront-fetch.js, which refuses a bot challenge.

No em-dashes, per repo convention.
"""

import re, subprocess, sys, os, tempfile

def blocks(html):
    for m in re.finditer(r'<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>', html, re.S):
        attrs, body = m.group(1), m.group(2)
        if re.search(r'type\s*=\s*["\'](?!text/javascript|application/javascript)', attrs):
            continue  # ld+json, templates
        yield m.start(), body

def check_syntax(js):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as fh:
        fh.write(js); p = fh.name
    try:
        r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
        return (r.returncode == 0, r.stderr)
    finally:
        os.unlink(p)

# A member access at the end of a line followed by a bare identifier on the next
# is the ASI split. Legitimate chaining puts the dot at the START of the next line.
ASI = re.compile(r'\.([A-Za-z_$][\w$]*)[ \t]*\r?\n[ \t]*([A-Za-z_$][\w$]*)\s*\(')

def scan(path):
    html = open(path, encoding='utf-8', errors='replace').read()
    out = []
    for off, js in blocks(html):
        ok, err = check_syntax(js)
        if not ok:
            first = [l for l in err.split('\n') if 'SyntaxError' in l]
            line = ''
            for l in err.split('\n'):
                if l.strip() and not l.startswith(' ') and '.js:' in l:
                    line = l.split(':')[-1]
            out.append(('SYNTAX', off, (first[0].strip() if first else err.strip().split('\n')[0])[:110], err))
        for m in ASI.finditer(js):
            out.append(('ASI', off + m.start(), '%s\\n%s(  -> ReferenceError: %s is not defined'
                        % (m.group(1), m.group(2), m.group(2)), ''))
    return out

if __name__ == '__main__':
    total = 0
    for p in sys.argv[1:]:
        res = scan(p)
        if res:
            print('\n%s' % os.path.basename(p).replace('.html',''))
            for kind, off, msg, _ in res:
                print('   %-7s byte %-8d %s' % (kind, off, msg))
            total += len(res)
    print('\n%d fault(s) across %d page(s)' % (total, len(sys.argv) - 1))

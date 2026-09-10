#!/usr/bin/env python3
"""
Mutation test for smoke/csa-unit1-guides.py.

    python3 smoke/csa-unit1-guides-mutation.py build/csa-unit1-guides

A GREEN MUTATION RUN IS A FAILED CHECK. Each rule is broken on its own, in a
throwaway copy of the built guides, and the verifier has to go red FOR THAT RULE
and not merely go red. A suite that fails for a different rule is telling you
the rule you meant to test is hollow, which is how two guards in this repo were
found empty on 2026-09-02 and a third the day after.

The two negative cases at the end matter as much as the ten positive ones. The
voice rule deliberately exempts Differentiation, and a rule set that cannot say
what it is allowed to ignore will be switched off the first week it cries wolf.
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
VERIFY = os.path.join(HERE, 'csa-unit1-guides.py')
G1 = 'Lesson_1.1_Intro_to_Algorithms'


def read_xml(root, folder):
    p = os.path.join(root, folder, 'Teacher_Guide.docx')
    with zipfile.ZipFile(p) as z:
        return {n: z.read(n) for n in z.namelist()}


def write_xml(root, folder, parts):
    p = os.path.join(root, folder, 'Teacher_Guide.docx')
    with zipfile.ZipFile(p, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, data in parts.items():
            z.writestr(n, data)


def edit(root, folder, fn):
    parts = read_xml(root, folder)
    xml = parts['word/document.xml'].decode('utf-8')
    new = fn(xml)
    assert new != xml, 'mutation changed nothing, so it tests nothing'
    parts['word/document.xml'] = new.encode('utf-8')
    write_xml(root, folder, parts)


def run(root):
    r = subprocess.run([sys.executable, VERIFY, root],
                       capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


def sub_text(xml, old, new, count=1):
    """Replace a whole <w:t> run, which is where the visible text lives."""
    return xml.replace(f'>{old}<', f'>{new}<', count)


def sub_raw(xml, old, new, count=1):
    """Replace a fragment inside a run, for mutations that edit part of a line."""
    return xml.replace(old, new, count)


# (name, expected rule, mutation)
MUTATIONS = [
    ('a guide goes missing', 'rule 1',
     lambda root: os.remove(os.path.join(root, G1, 'Teacher_Guide.docx'))),

    ('a printed timing comes back', 'rule 2',
     lambda root: edit(root, G1, lambda x: sub_text(
         x, 'Algorithms and sequencing', 'Algorithms and sequencing (14 min)'))),

    ('homework promises a handout again', 'rule 3',
     lambda root: edit(root, G1, lambda x: sub_raw(
         x, 'Vocabulary: write the eight terms',
         'Trace practice: three short programs on the handout. Vocabulary: write the eight terms'))),

    ('a staging line comes back', 'rule 4',
     lambda root: edit(root, G1, lambda x: sub_raw(
         x, 'Sequencing means the steps run one at a time',
         'Put the steps on the board. Sequencing means the steps run one at a time'))),

    ('the exit-ticket answer marker is lost', 'rule 5',
     lambda root: edit(root, G1, lambda x: sub_text(
         x, 'B. A logic error  &lt;-- answer', 'B. A logic error'))),

    ('an exit item loses its options', 'rule 5',
     lambda root: edit(root, G1, lambda x: (
         sub_text(x, 'A. A syntax error', 'x')
         .replace('>B. A logic error<', '>x<')
         .replace('>C. A run-time error<', '>x<')
         .replace('>D. An exception<', '>x<')))),

    ('the lesson-page heading prints empty', 'rule 6',
     lambda root: edit(root, G1, lambda x: re.sub(
         r'<w:t>The live lesson page \(Unit 1 Link Sheet, row 1\.1\)[^<]*</w:t>',
         '<w:t>x</w:t>', x, count=1))),

    ('an objective code from another topic', 'rule 7',
     lambda root: edit(root, G1, lambda x: sub_text(x, '1.1.A', '2.3.A'))),

    ('the misconception restates its heading', 'rule 8',
     lambda root: edit(root, G1, lambda x: sub_raw(
         x, "Successful compilation means the code follows Java's rules",
         "If it compiles, it works: Successful compilation means the code follows Java's rules"))),

    ('a teaching bullet quietly goes missing', 'rule 10',
     lambda root: edit(root, G1, lambda x: re.sub(
         r'<w:t>An algorithm is a step-by-step process[^<]*</w:t>',
         '<w:t>x</w:t>', x, count=1))),

    ('a teaching bullet is reworded with no declared repair', 'rule 10',
     lambda root: edit(root, G1, lambda x: sub_raw(
         x, 'Sequencing means the steps run one at a time',
         'Sequencing means the steps run one after another'))),

    ('the trademark line is dropped', 'rule 9',
     lambda root: edit(root, G1, lambda x: sub_raw(
         x, 'AP is a trademark of the College Board', 'Removed'))),
]

# Things that must NOT fail. A rule that cannot say what it ignores gets
# switched off the first week it cries wolf.
NEGATIVE = [
    ('a directional line inside Differentiation',
     lambda root: edit(root, G1, lambda x: sub_raw(
         x, 'For the algorithm write-up, provide the six steps scrambled',
         'Ask students to work in pairs on the board for 10 minutes, then'))),

    ('"the whole class" as a Java class, outside Differentiation',
     lambda root: edit(root, G1, lambda x: sub_raw(
         x, 'Sequencing means the steps run one at a time',
         'Decide whether the whole class compiles. Sequencing means the steps run one at a time'))),
]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else 'build/csa-unit1-guides'
    src = os.path.abspath(src)

    code, out = run(src)
    if code != 0:
        print('CONTROL IS ALREADY RED, so no mutation below proves anything:')
        print(out)
        return 1
    print('control  clean')

    failures = 0
    for name, rule, mutate in MUTATIONS:
        with tempfile.TemporaryDirectory() as tmp:
            root = os.path.join(tmp, 'g')
            shutil.copytree(src, root)
            mutate(root)
            code, out = run(root)
            if code == 0:
                print(f'HOLLOW  {rule:<8} {name}: the guide was broken and the '
                      f'check stayed green')
                failures += 1
            elif rule not in out:
                got = sorted(set(re.findall(r'rule \d', out)))
                print(f'WRONG   {rule:<8} {name}: went red for {got} instead')
                failures += 1
            else:
                print(f'red     {rule:<8} {name}')

    for name, mutate in NEGATIVE:
        with tempfile.TemporaryDirectory() as tmp:
            root = os.path.join(tmp, 'g')
            shutil.copytree(src, root)
            mutate(root)
            code, out = run(root)
            if code != 0:
                print(f'FALSE+  {name}: a correct document was refused')
                print('        ' + out.strip().splitlines()[0])
                failures += 1
            else:
                print(f'clean   negative  {name}')

    total = len(MUTATIONS) + len(NEGATIVE)
    if failures:
        print(f'\n{failures} of {total} mutations did not behave')
        return 1
    print(f'\n{len(MUTATIONS)} rules broken independently, each red for its own '
          f'reason; {len(NEGATIVE)} negative cases stayed clean')
    return 0


if __name__ == '__main__':
    sys.exit(main())

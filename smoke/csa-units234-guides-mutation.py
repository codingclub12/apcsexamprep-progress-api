#!/usr/bin/env python3
"""
Mutation test for smoke/csa-units234-guides.py.

    python3 smoke/csa-units234-guides-mutation.py build/csa-u234-guides

A GREEN MUTATION RUN IS A FAILED CHECK. Each of the ten rules is broken on its
own, in a throwaway copy of the built guides, and the verifier has to go red FOR
THAT RULE rather than merely go red. A suite that fails for a different rule is
telling you the rule you meant to test is hollow.

Three of the rules assert more than one thing, so they get more than one
mutation. Rule 6 is the clearest case: intro, activities and independent
practice are three separate renderer branches, and one of them working says
nothing about the other two. That is not hypothetical here. The renderer had no
branch at all for the lesson page in Unit 1, and the builder's own validate()
was green on all 15 while the heading printed over nothing.

The two negative cases at the end carry as much weight as the fourteen positive
ones. Rule 4 reads the objectives TABLE, not the whole document, because a
teacher guide may legitimately mention a later topic's objective code in prose;
and rule 7 accepts a free-response item that resolves with a written answer
instead of four options. A rule set that cannot say what it is allowed to ignore
gets switched off the first week it cries wolf.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
VERIFY = os.path.join(HERE, 'csa-units234-guides.py')
# An OVERLAID topic and a RETIRED-SPEC one, because half the rules are scoped
# to one or the other and a suite that only ever mutates the easy case cannot
# tell you the exemption is doing anything.
G = os.path.join('Unit_2_Selection_and_Iteration',
                 'Lesson_2.1_Algorithms_with_Selection_and_Repetition')
R = os.path.join('Unit_4_Data_Collections', 'Lesson_4.6_Using_Text_Files')


def read_xml(root, folder):
    p = os.path.join(root, folder, 'Teacher_Guide.docx')
    with zipfile.ZipFile(p) as z:
        return {n: z.read(n) for n in z.namelist()}


def write_xml(root, folder, parts):
    p = os.path.join(root, folder, 'Teacher_Guide.docx')
    with zipfile.ZipFile(p, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, data in parts.items():
            z.writestr(n, data)


def edit(root, fn, folder=G):
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


def clone_extra(root):
    """A 39th guide for a topic the CED does not have."""
    src = os.path.join(root, G)
    dst = os.path.join(root, 'Unit_2_Selection_and_Iteration',
                       'Lesson_2.99_Invented_Topic')
    shutil.copytree(src, dst)


# (name, expected rule, mutation)
MUTATIONS = [
    ('a guide goes missing', 'rule 1',
     lambda root: os.remove(os.path.join(root, G, 'Teacher_Guide.docx'))),

    ('a guide appears for a topic that does not exist', 'rule 1', clone_extra),

    ('a wrap-up pointer is emptied, leaving a bare heading', 'rule 2',
     lambda root: edit(root, lambda x: re.sub(
         r'<w:t>\d+ items, with the answers and a short why[^<]*</w:t>',
         '<w:t></w:t>', x, count=1))),

    # Deliberately keeps the CED wording intact as a substring, so rule 5 has
    # nothing to say and rule 3 has to be the one that goes red.
    ('an I-can line lands in the Objective column', 'rule 3',
     lambda root: edit(root, lambda x: sub_raw(
         x, '>Describe the behavior', '>I can Describe the behavior'))),

    ('the objectives table carries another topic\'s code', 'rule 4',
     lambda root: edit(root, lambda x: sub_text(x, '2.1.A', '3.4.A'))),

    ('an exported objective is reworded on the page', 'rule 5',
     lambda root: edit(root, lambda x: sub_raw(
         x, 'Describe the behavior of a given', 'Describe the behaviour of a given'))),

    ('the lesson-page intro drifts from the export', 'rule 6',
     lambda root: edit(root, lambda x: sub_raw(
         x, 'The Topic 2.1 lesson page has', 'The Topic 2.1 lesson page includes'))),

    ('a lesson-page activity goes missing', 'rule 6',
     lambda root: edit(root, lambda x: re.sub(
         r'<w:t>Play the flowchart game[^<]*</w:t>', '<w:t>x</w:t>', x, count=1))),

    ('the independent-practice line goes missing', 'rule 6',
     lambda root: edit(root, lambda x: sub_text(
         x, 'Offline labeling and flowchart drill. Everything below runs on paper.',
         'x'))),

    ('an exit-ticket answer marker is lost', 'rule 7',
     lambda root: edit(root, lambda x: sub_text(
         x, 'B. Selection  &lt;-- answer', 'B. Selection'))),

    ('an exit item loses its options', 'rule 7',
     lambda root: edit(root, lambda x: (
         sub_text(x, 'A. It never runs', 'x')
         .replace('>B. It runs forever<', '>x<')
         .replace('>C. It stops before printing 1  &lt;-- answer<', '>x<')
         .replace('>D. It prints n twice<', '>x<')))),

    ('a printed timing comes back', 'rule 8',
     lambda root: edit(root, lambda x: sub_text(
         x, 'Sequencing, selection and repetition',
         'Sequencing, selection and repetition (14 min)'))),

    ('homework promises a handout', 'rule 9',
     lambda root: edit(root, lambda x: sub_raw(
         x, 'Homework: Vocabulary: write the six terms',
         'Homework: the trace practice on the handout, then vocabulary: write '
         'the six terms'))),

    ('a bullet points at material on a sheet nobody ships', 'rule 9',
     lambda root: edit(root, lambda x: sub_raw(
         x, 'Selection means a condition decides which statements run.',
         'Selection means a condition decides which statements run, as on this '
         'sheet.'))),

    ('the trademark line is dropped', 'rule 10',
     lambda root: edit(root, lambda x: sub_raw(
         x, 'AP is a trademark of the College Board', 'Removed'))),

    # The one that matters most. Every other rule compares a document against
    # the source that built it, so all eleven were green on a build where six
    # guides carried another lesson's content.
    ('the lesson-page URL names a different lesson', 'rule 11',
     lambda root: edit(root, lambda x: sub_text(
         x, 'apcsexamprep.com/pages/ap-csa-lesson-2-1-algorithms-selection-repetition',
         'apcsexamprep.com/pages/ap-csa-lesson-2-2-boolean-expressions'))),

    ('the lesson-page URL is gone entirely', 'rule 11',
     lambda root: edit(root, lambda x: sub_text(
         x, 'apcsexamprep.com/pages/ap-csa-lesson-2-1-algorithms-selection-repetition',
         'the lesson page'))),

    # A retired-spec topic picking up another topic's exported content is the
    # defect rule 11 caught, asserted from the other side.
    ('a retired-spec topic picks up another topic\'s lesson page', 'rule 12',
     lambda root: edit(root, lambda x: sub_text(
         x, 'I can read tokens and lines from a Scanner.',
         'The Topic 2.1 lesson page has the building-block identification '
         'exercise, the six checks for understanding, and the flowchart game. '
         'Everything on that page is auto-graded and lands in your gradebook as '
         'students submit.'), folder=R)),

    # The twelve bare headings are a fixed number, not a licence. Renaming one
    # takes it out of the exemption, so rule 2 reports it AND the count.
    ('a bare practice heading on a retired-spec topic is renamed', 'rule 2',
     lambda root: edit(root, lambda x: sub_text(
         x, 'Independent practice: the debugging exercise',
         'Practice on your own: the debugging exercise'), folder=R)),
]

# Things that must NOT fail.
NEGATIVE = [
    # Rule 4 reads the objectives table. A teacher guide pointing forward to a
    # later topic's objective in prose is correct content, and a rule that
    # grepped the document for a foreign code would refuse it.
    ('another topic\'s objective code mentioned in prose',
     lambda root: edit(root, lambda x: sub_raw(
         x, 'Repetition means the same statements run more than once.',
         'Repetition means the same statements run more than once. Loop bounds '
         'are 2.6.A, later in this unit.'))),

    # Rule 7 must accept an item that resolves in writing rather than with four
    # options. Unit 1 has free-response exit items today, and a rule reading
    # "four options or it did not resolve" would refuse every one of them.
    ('an exit item that resolves with a written answer and no options',
     lambda root: edit(root, lambda x: (
         x.replace('>A. It never runs<', '><')
         .replace('>B. It runs forever<', '><')
         .replace('>C. It stops before printing 1  &lt;-- answer<', '><')
         .replace('>D. It prints n twice<', '><')
         .replace('>Why: i &gt; 1 is already false',
                  '>Answer: it stops before printing 1, because i &gt; 1 is '
                  'already false')))),
]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else 'build/csa-u234-guides'
    src = os.path.abspath(src)

    # Build if the guides are not there. CI derives its suite list from
    # package.json order, so relying on the other suite having run first is a
    # dependency nobody wrote down.
    if not os.path.isdir(src):
        repo = os.path.dirname(HERE)
        subprocess.run([sys.executable,
                        os.path.join(repo, 'scripts',
                                     'build-csa-units-2-4-teacher-guides.py'),
                        '--out', src], check=True, cwd=repo)

    code, out = run(src)
    if code != 0:
        print('CONTROL IS ALREADY RED, so no mutation below proves anything:')
        print(out)
        return 1
    print('control  clean')

    # An exemption over an empty set proves nothing, the same way a mutation
    # that changes nothing tests nothing. Rules 2 and 3 both stand down on the
    # retired-spec topics, so check that there is something there to stand down
    # from: I-can rows in the Objective column, and bare practice headings.
    import importlib.util
    vs = importlib.util.spec_from_file_location('v', VERIFY)
    v = importlib.util.module_from_spec(vs)
    vs.loader.exec_module(v)
    with open(v.CONTENT, encoding='utf-8') as fh:
        retired = sorted((json.load(fh).get('_provenance') or {})
                         .get('excluded') or {})
    ican = bare = 0
    for topic in retired:
        path = None
        for dirpath, _d, files in os.walk(src):
            if 'Teacher_Guide.docx' in files and f'Lesson_{topic}_' in dirpath:
                path = os.path.join(dirpath, 'Teacher_Guide.docx')
        if not path:
            print(f'EXEMPT  {topic}: no guide, so its exemptions test nothing')
            return 1
        tc = v.cells(path)
        for i, c in enumerate(tc):
            if v.OBJ_ROW.fullmatch(c.strip()) and i + 1 < len(tc)                     and tc[i + 1].strip().lower().startswith('i can'):
                ican += 1
        shape = v.shaped(path) if hasattr(v, 'shaped') else v.u1.shaped(path)
        for j, (kind, text) in enumerate(shape):
            nxt = shape[j + 1] if j + 1 < len(shape) else None
            if kind == 'heading' and text.startswith(v.BARE_OK) \
                    and (nxt is None or nxt[0] == 'heading'):
                bare += 1
    if not ican or bare != 2 * len(retired):
        print(f'EXEMPT  the retired-spec exemptions are vacuous: {ican} I-can '
              f'rows and {bare} bare practice headings across {len(retired)} '
              f'topics')
        return 1
    print(f'exempt   {len(retired)} retired-spec topics really do carry {ican} '
          f'I-can rows and {bare} bare practice headings')

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
                got = sorted(set(re.findall(r'rule \d+', out)))
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
    rules = len({r for _n, r, _m in MUTATIONS})
    print(f'\n{len(MUTATIONS)} mutations over {rules} rules, each red for its '
          f'own reason; {len(NEGATIVE)} negative cases stayed clean')
    return 0


if __name__ == '__main__':
    sys.exit(main())

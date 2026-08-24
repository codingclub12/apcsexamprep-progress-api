#!/usr/bin/env python3
"""
Verify every worked example in the teacher-kit content.

Each worked-example slide says "Complete and runnable as shown", which is a
promise a teacher will test in front of a class. This checks it:

  1. Every example is compiled with a real javac. A slide that does not
     compile is the worst possible thing to project.
  2. Every example that does not read input is run, and its actual stdout is
     compared against the OUTPUT panel on the slide.
  3. Examples that read from Scanner are compiled only, because the slide
     annotates its input in prose rather than as data. They are reported
     separately so the count is honest rather than hidden.

Lines in the OUTPUT panel wrapped in parentheses, such as "(for input 95)",
are slide annotations rather than program output and are ignored.

Usage:
    python3 scripts/verify-csa-kit-examples.py --unit 2
"""

import argparse
import importlib
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def load(unit):
    topics = []
    for suffix in ('', 'b', 'c', 'd', 'e'):
        try:
            m = importlib.import_module(f'csa_kit.content_unit{unit}{suffix}')
        except ModuleNotFoundError:
            continue
        topics.extend(m.TOPICS)
    topics.sort(key=lambda t: [int(x) for x in t['topic'].split('.')])
    return topics


def public_class(code):
    m = re.search(r'public\s+class\s+(\w+)', code)
    return m.group(1) if m else None


def expected_lines(output):
    return [l for l in output if not (l.strip().startswith('(') and l.strip().endswith(')'))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--unit', required=True)
    args = ap.parse_args()

    topics = load(args.unit)
    compiled = ran = mismatched = failed = 0
    problems = []

    for t in topics:
        for day in t['days']:
            w = day['worked']
            code = w['code']
            label = f"{t['topic']} day {day['day']}"
            cls = public_class(code)
            if not cls:
                problems.append(f"{label}: no public class found")
                failed += 1
                continue

            with tempfile.TemporaryDirectory() as d:
                src = os.path.join(d, cls + '.java')
                with open(src, 'w') as f:
                    f.write(code)
                r = subprocess.run(['javac', src], capture_output=True, text=True, cwd=d)
                if r.returncode != 0:
                    failed += 1
                    first = (r.stderr.strip().split('\n') or [''])[0]
                    problems.append(f"{label}: does not compile: {first}")
                    continue
                compiled += 1

                stdin = w.get('stdin', '')
                if 'Scanner' in code and not stdin:
                    continue  # no input authored, so compile-check only

                r = subprocess.run(['java', '-cp', d, cls], input=stdin,
                                   capture_output=True, text=True, timeout=20)
                ran += 1
                actual = [l.rstrip() for l in r.stdout.strip().split('\n')] if r.stdout.strip() else []
                want = [l.rstrip() for l in expected_lines(w['output'])]
                if actual != want:
                    mismatched += 1
                    problems.append(
                        f"{label}: OUTPUT panel disagrees with the program\n"
                        f"      slide says: {want}\n"
                        f"      java printed: {actual}")

    print(f"compiled {compiled} worked example(s)")
    skipped = compiled - ran
    print(f"ran {ran} of them against their authored stdin"
          + (f"; {skipped} compile-checked only" if skipped else "; none compile-checked only"))
    if problems:
        print(f"\n{len(problems)} problem(s):")
        for p in problems:
            print('  - ' + p)
        sys.exit(1)
    print("\nevery worked example compiles, and every runnable one matches its OUTPUT panel.")


if __name__ == '__main__':
    main()

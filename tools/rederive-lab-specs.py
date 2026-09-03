#!/usr/bin/env python3
"""A SECOND READER FOR THE LAB SPECS, written from the JSON rather than from
the loader.

smoke/labs.js proves a lab is playable: it loads public/lab-player.js under a
DOM stub and runs each spec's authored `solution` through it, requiring every
check to tick. That is the strongest statement available about a lab and it has
one blind spot, which is that it reaches its verdict through the same
lib/lab-spec.js the server uses. If the loader ever normalises, defaults or
coerces a field on the way in, the suite and the file can disagree about what
the file says and nothing would notice.

So this reads config/labs/*.json as data, in a different language, and
recomputes the same properties from scratch. It imports nothing from the repo
and it does not run the player. Where the two agree, the agreement means
something; where they diverge, the loader is doing something to the file.

The properties, and why each one is a real failure rather than tidiness:

  points == len(checks)      the manifest row is generated FROM the spec, so
                             drift here scores a whole class out of the wrong
                             denominator
  answer index in range      an out of range key marks every correct answer
                             wrong, forever, with no error anywhere
  answer-checks name a real  a check pointing at a question id that does not
  question                   exist can never tick, so the lab cannot be
                             completed and nobody finds out until a class is
                             half gone
  every question is checked  the mirror of the above: a question a student
                             answers that no check scores is work for no points
  check numbers are 1..N     the player renders the checklist from these
  ids are unique             two questions sharing an id makes one unanswerable

Run: python3 tools/rederive-lab-specs.py
No em-dashes, per repo convention.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LAB_DIR = os.path.join(HERE, '..', 'config', 'labs')


def rederive(path):
    """Return a list of problems for one spec file. Empty means consistent."""
    problems = []
    with open(path, encoding='utf-8') as fh:
        spec = json.load(fh)

    name = spec.get('item_id') or os.path.basename(path)
    checks = spec.get('checks') or []
    questions = spec.get('questions') or []

    # points == one point per check
    points = spec.get('points')
    if points != len(checks):
        problems.append('%s: points %r but %d checks' % (name, points, len(checks)))

    # check numbers are 1..N, each once
    ns = [c.get('n') for c in checks]
    if sorted(ns) != list(range(1, len(checks) + 1)):
        problems.append('%s: check numbers are %r, expected 1..%d' % (name, ns, len(checks)))

    # question ids unique
    qids = [q.get('id') for q in questions]
    if len(set(qids)) != len(qids):
        problems.append('%s: duplicate question ids in %r' % (name, qids))

    # answer index within its own option list
    for q in questions:
        opts = q.get('options') or []
        ans = q.get('answer')
        if not isinstance(ans, int) or ans < 0 or ans >= len(opts):
            problems.append('%s: question %r answer %r is outside its %d options'
                            % (name, q.get('id'), ans, len(opts)))
        if not str(q.get('explain') or '').strip():
            problems.append('%s: question %r has no explanation' % (name, q.get('id')))

    # answer-checks name a question that exists, and every question is scored
    named = set()
    for c in checks:
        m = c.get('match') or {}
        if m.get('event') == 'answer':
            qid = m.get('question')
            named.add(qid)
            if qid not in set(qids):
                problems.append('%s: check %r scores question %r, which does not exist'
                                % (name, c.get('n'), qid))
    for qid in qids:
        if qid not in named:
            problems.append('%s: question %r is answered by the student and scored by '
                            'no check' % (name, qid))

    return problems


def main():
    files = sorted(f for f in os.listdir(LAB_DIR) if f.endswith('.json'))
    if not files:
        print('no lab specs found, so this proved nothing', file=sys.stderr)
        return 1

    all_problems = []
    for f in files:
        probs = rederive(os.path.join(LAB_DIR, f))
        status = 'ok  ' if not probs else 'FAIL'
        print('  %s %s' % (status, f))
        all_problems.extend(probs)

    print('')
    if all_problems:
        for p in all_problems:
            print('    ' + p, file=sys.stderr)
        print('REDERIVE FAILED: %d problems across %d specs' % (len(all_problems), len(files)),
              file=sys.stderr)
        return 1

    print('REDERIVED: %d of %d specs internally consistent' % (len(files), len(files)))
    return 0


if __name__ == '__main__':
    sys.exit(main())

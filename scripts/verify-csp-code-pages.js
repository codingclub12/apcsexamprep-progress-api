'use strict';
// -----------------------------------------------------------------------------
//  Derive and check the expected output of every coding-practice problem by
//  RUNNING it, in both languages, against the live Judge0 proxy.
//
//  The expected output on these pages is what a student is graded against. If it
//  is typed by hand it is a guess, and a wrong guess makes a correct answer look
//  wrong, which is the worst failure this page has. So no expected value is ever
//  written by a person: the reference solution is executed and its stdout IS the
//  expected value.
//
//  Both languages must agree. A problem whose Python and JavaScript solutions
//  print different things has an ambiguous prompt, and the disagreement is the
//  signal.
//
//  Problems that take input send it. The topic pages send no stdin at all, so
//  for those the field is simply absent and nothing about them changes. The
//  Create Task bridge does send it, and its expected output is only meaningful
//  for the input it was run with, so the stdin lives beside the solution in the
//  seed rather than in this script.
//
//  A problem marked `check: 'six'` has no correct output, because there is no
//  correct answer to "write your own program". It is still executed, so a
//  reference solution that does not run cannot ship, but its recorded expected
//  value is null and the page checks it on requirements instead.
//
//  This calls the live proxy and therefore costs real Judge0 runs, about
//  $0.0017 each. Twelve problems in two languages is twenty-four runs, roughly
//  four cents. It does not modify the Judge0 subsystem in any way.
//
//  Run: node scripts/verify-csp-code-pages.js [--write]
//       --write records the derived outputs into the expected.json beside each seed
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const PROXY = process.env.APCS_JUDGE0_URL || 'https://progress.apcsexamprep.com/api/judge0/run';
const LANG = { python: 71, javascript: 63 };
// Each source is a group of seed modules that share one expected.json. The
// topic pages key theirs by topic number because there are eighteen of them and
// they are addressed by number everywhere else; the bridge is one page and keys
// by slug.
const SOURCES = [
  {
    label: 'Big Idea 3 coding pages',
    dir: ['seed', 'csp-code-pages'],
    seeds: ['3-17', '3-18'],
    key: (d) => d.topic,
  },
  {
    label: 'Create Task bridge',
    dir: ['seed', 'csp-create-task'],
    seeds: ['bridge'],
    key: (d) => d.slug,
  },
];

function norm(s) {
  return String(s == null ? '' : s).replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
}

async function run(code, language, stdin) {
  const payload = { code, language_id: LANG[language] };
  // Absent rather than empty when a problem takes no input, so the request the
  // topic pages' problems make is byte-identical to the one they made before.
  if (stdin != null) payload.stdin = stdin;
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`proxy returned ${res.status}`);
  return res.json();
}

async function main() {
  const write = process.argv.includes('--write');
  let bad = 0;
  const written = [];

  for (const source of SOURCES) {
    const out = {};
    console.log(`\n== ${source.label}`);
    for (const name of source.seeds) {
      const data = require(path.join('..', ...source.dir, name + '.js'));
      const key = source.key(data);
      out[key] = [];
      console.log(`\n${key} ${data.title}`);
      for (let i = 0; i < data.problems.length; i++) {
        const p = data.problems[i];
        const results = {};
        for (const lang of Object.keys(LANG)) {
          const r = await run(p.solution[lang], lang, p.stdin);
          const err = r.stderr || r.compile_output || '';
          if (err) {
            bad++;
            console.log(`  problem ${i + 1} ${lang.padEnd(10)} ERROR: ${err.trim().split('\n')[0]}`);
            results[lang] = null;
            continue;
          }
          results[lang] = norm(r.stdout);
        }
        const py = results.python;
        const js = results.javascript;
        if (py === null || js === null) continue;
        if (py !== js) {
          bad++;
          console.log(`  problem ${i + 1} DISAGREE`);
          console.log(`      python:     ${JSON.stringify(py)}`);
          console.log(`      javascript: ${JSON.stringify(js)}`);
          continue;
        }
        // A problem whose solution prints nothing would silently grade everything
        // as correct, because an empty expected matches an empty answer.
        if (!py.length) {
          bad++;
          console.log(`  problem ${i + 1} produced NO OUTPUT`);
          continue;
        }
        // A requirement-checked problem is run for the same reason as any other,
        // to prove the reference solution executes, but recording its output as
        // expected would grade a free-form program against one person's answer.
        if (p.check === 'six') {
          out[key].push(null);
          console.log(`  problem ${i + 1} ran clean in both languages, recorded as requirement-checked (no expected output)`);
          continue;
        }
        out[key].push(py);
        const shown = py.length > 60 ? py.slice(0, 57).replace(/\n/g, ' / ') + '...' : py.replace(/\n/g, ' / ');
        console.log(`  problem ${i + 1} ok, both languages agree: ${JSON.stringify(shown)}`);
      }
    }
    // Held, not written. A failure in a later source has to be able to stop an
    // earlier source's file from landing, or "nothing written" is a lie.
    written.push({ dest: path.join(__dirname, '..', ...source.dir, 'expected.json'), out });
  }

  console.log('');
  if (bad) {
    console.error(`${bad} problem(s) failed. Nothing written.`);
    process.exit(1);
  }
  if (write) {
    written.forEach((w) => {
      fs.writeFileSync(w.dest, JSON.stringify(w.out, null, 2) + '\n');
      console.log(`wrote ${w.dest}`);
    });
  }
  console.log('every reference solution ran clean and both languages agree.');
}

main().catch((e) => { console.error('failed: ' + e.message); process.exit(1); });

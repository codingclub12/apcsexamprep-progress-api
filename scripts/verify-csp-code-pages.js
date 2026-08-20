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
//  This calls the live proxy and therefore costs real Judge0 runs, about
//  $0.0017 each. Eight problems in two languages is sixteen runs, roughly three
//  cents. It does not modify the Judge0 subsystem in any way.
//
//  Run: node scripts/verify-csp-code-pages.js [--write]
//       --write records the derived outputs into seed/csp-code-pages/expected.json
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const PROXY = process.env.APCS_JUDGE0_URL || 'https://progress.apcsexamprep.com/api/judge0/run';
const LANG = { python: 71, javascript: 63 };
const TOPICS = ['3-17', '3-18'];

function norm(s) {
  return String(s == null ? '' : s).replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
}

async function run(code, language) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language_id: LANG[language] }),
  });
  if (!res.ok) throw new Error(`proxy returned ${res.status}`);
  return res.json();
}

async function main() {
  const write = process.argv.includes('--write');
  const out = {};
  let bad = 0;

  for (const t of TOPICS) {
    const data = require(path.join('..', 'seed', 'csp-code-pages', t + '.js'));
    out[data.topic] = [];
    console.log(`\n${data.topic} ${data.title}`);
    for (let i = 0; i < data.problems.length; i++) {
      const p = data.problems[i];
      const results = {};
      for (const lang of Object.keys(LANG)) {
        const r = await run(p.solution[lang], lang);
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
      out[data.topic].push(py);
      const shown = py.length > 60 ? py.slice(0, 57).replace(/\n/g, ' / ') + '...' : py.replace(/\n/g, ' / ');
      console.log(`  problem ${i + 1} ok, both languages agree: ${JSON.stringify(shown)}`);
    }
  }

  console.log('');
  if (bad) {
    console.error(`${bad} problem(s) failed. Nothing written.`);
    process.exit(1);
  }
  if (write) {
    const dest = path.join(__dirname, '..', 'seed', 'csp-code-pages', 'expected.json');
    fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
    console.log(`wrote ${dest}`);
  }
  console.log('every reference solution ran clean and both languages agree.');
}

main().catch((e) => { console.error('failed: ' + e.message); process.exit(1); });

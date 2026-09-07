#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REDERIVE: does the SERVER grader score exactly like the page it replaces?
//
//  The 1.1 lab was graded in the browser for as long as it has existed. Moving
//  that grading to the server is only safe if a student's score does not move
//  with it, and "I ported it carefully" is not evidence. So this runs the
//  ORIGINAL page's own checkEmail() under a stub DOM, runs lib/analysis-grade.js
//  over the same inputs, and requires the per-field points to match on every
//  generated case.
//
//  The page function is not reimplemented here. It is executed, from the
//  authored fixture, so a drift between the two is a real difference rather than
//  a difference between two of my own opinions.
//
//  Run: npm run smoke:analysisparity
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const grade = require('../lib/analysis-grade');
const specs = require('../lib/analysis-spec');

const spec = specs.get('ap-cybersecurity', '1.1-lab');
if (!spec) { console.log('  [FAIL] the 1.1 spec did not load'); process.exit(1); }

const FIXTURE = path.join(__dirname, 'fixtures', 'ap-cyber-unit-1-lesson-1-lab.admin-body.html');
const html = fs.readFileSync(FIXTURE, 'utf8');

//  ── run the page's grader under a stub DOM ─────────────────────────────────
const script = (html.match(/<script>\s*\(function\(\)\{([\s\S]*?)\}\)\(\);\s*<\/script>/) || [])[1];
if (!script) { console.log('  [FAIL] could not find the page grader'); process.exit(1); }

let pass = 0; let fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); }
};

//  The stub returns whatever the current case says a control holds, and swallows
//  the DOM writes the page makes for feedback and disabling.
function runPageGrader(num, responses) {
  const captured = { html: '', pts: null };
  const dead = { className: '', innerHTML: '', textContent: '', style: {}, disabled: false,
    querySelectorAll: () => [], querySelector: () => ({ style: {}, disabled: false }),
    scrollIntoView() {} };
  const sandbox = {
    document: {
      getElementById(id) {
        //  feedback FIRST. 'e1-feedback' also matches the field pattern below,
        //  so testing that first returned a value box, the page wrote its score
        //  line into nothing, and all 600 comparisons read null. A stub that
        //  silently answers the wrong question makes every case look broken.
        if (/feedback$/.test(id)) {
          return { set innerHTML(v) { captured.html = v; }, get innerHTML() { return captured.html; },
            set className(v) {}, scrollIntoView() {} };
        }
        const m = id.match(/^e(\d)-([a-z]+)$/);
        if (m && responses[m[2]] !== undefined) return { value: String(responses[m[2]]) };
        if (m) return { value: '' };
        return dead;
      },
    },
    window: {},
    console: { log() {} },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext('(function(){' + script + '})()', sandbox, { timeout: 5000 });
  sandbox.window.checkEmail(num);
  //  "Email #N Score: P / 6" is the page's own summary line.
  const m = captured.html.match(/Score:\s*(\d+)\s*\/\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

//  ── generated cases ────────────────────────────────────────────────────────
//  Built FROM the answer keys, so the cases actually exercise the matcher rather
//  than scoring zero every time: a right answer, a right answer in a different
//  case, a right answer buried in a sentence, one too short to count, an empty
//  one, and a wrong one.
const rnd = (() => { let s = 20260907; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
const pick = (a) => a[Math.floor(rnd() * a.length)];

function caseFor(field, answer) {
  if (field.kind === 'select') {
    return pick([answer[field.key], pick(field.options).value, '', 'not-an-option']);
  }
  const keys = answer[field.key + 'Key'] || [];
  const k = pick(keys) || 'x';
  return pick([
    k,
    String(k).toUpperCase(),
    `I think the problem is ${k} and that matters here`,
    k.slice(0, 2),
    '',
    'nothing suspicious at all in this message',
    '     ',
  ]);
}

console.log('\n  the page grader and the server grader, on 600 generated submissions\n');
let mismatches = 0;
let sawFull = 0; let sawZero = 0;
for (let i = 0; i < 600; i++) {
  const sp = pick(spec.specimens);
  const responses = {};
  //  Field-by-field randomness almost never lands six correct answers at once,
  //  so full marks went unexercised and the coverage guard said so. A share of
  //  the cases are therefore whole-submission shapes: all right, all blank, or
  //  all wrong. Those are the submissions that actually happen, and the ones a
  //  scoring bug would show up in most plainly.
  const shape = rnd();
  for (const f of spec.fields) {
    if (shape < 0.15) {
      //  all correct
      responses[f.key] = f.kind === 'select'
        ? sp.answer[f.key]
        : `the giveaway here is ${(sp.answer[f.key + 'Key'] || ['x'])[0]} which is decisive`;
    } else if (shape < 0.25) {
      responses[f.key] = '';
    } else if (shape < 0.35) {
      responses[f.key] = f.kind === 'select' ? 'not-an-option' : 'nothing looks wrong to me here at all';
    } else {
      responses[f.key] = caseFor(f, sp.answer);
    }
  }

  const mine = grade.gradeSpecimen(spec, sp, responses).points;
  const theirs = runPageGrader(sp.n, responses);
  if (mine !== theirs) {
    mismatches++;
    if (mismatches <= 3) console.log('  [FAIL] specimen ' + sp.n + ' server=' + mine + ' page=' + theirs + ' ' + JSON.stringify(responses).slice(0, 220));
  }
  if (mine === spec.points_per_specimen) sawFull++;
  if (mine === 0) sawZero++;
}
ok('every generated submission scores identically', mismatches === 0, { mismatches });
//  A run where nothing ever scored, or everything did, would prove nothing about
//  either grader.
ok('the cases exercised both full marks and zero', sawFull > 5 && sawZero > 5, { sawFull, sawZero });

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

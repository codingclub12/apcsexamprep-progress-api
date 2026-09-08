'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE UNIT 3 EXAM KEY, AND WHETHER THE CHECK THAT FOUND IT CAN STILL SEE.
//
//  The defect, read off the live body on 2026-09-08 and unchanged since
//  docs/cyber-unit-tests-availability.md found it on 09-01:
//
//      BBBCCBBBBBCBBBABBBBB      A:1  B:16  C:3  D:0   longest run 5
//
//  Answering B twenty times scores 16 of 20 without reading a stem, and D is
//  dead on every item. Section 1 pins the defect and the fix. Section 2 is the
//  mutation run and decides whether section 1 means anything.
//
//  ── THE MUTATION THAT MATTERS MOST IS THE PERIODICITY ONE ──────────────────
//  The first target key this tool generated was ABCDABCDABCDABCDABCD: 5/5/5/5,
//  longest run 1, best single-letter score 5/20. It passes a count-and-run
//  audit perfectly and it is WORSE than the bug, because a student who spots
//  the cycle scores 20/20 rather than 16/20. That is the same hole CLAUDE.md
//  records for CDACDA, where distinct, per-column and overall balance all held
//  and periodicity is what caught it. A suite for this fix that cannot fail on
//  a perfect cycle is testing the wrong thing.
//
//  Read with docs/runs/2026-09-08-claude-code-cyber-u3-exam-key.md.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const t = require('../tools/ap-cyber-ced/rebalance-exam-key.js');
const { parseCsv } = require('../tools/ap-cyber-ced/sheet-csv');

const ROOT = path.join(__dirname, '..');
const LIVE = path.join(__dirname, 'fixtures', 'live-bodies', 'ap-cyber-unit-3-exam.html');
const SHEET = path.join(ROOT, 'imports', '2026-09-08', 'cyber-u3-exam-key-pages.csv');

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

const live = fs.readFileSync(LIVE, 'utf8');
const parsedLive = t.parse(live);
const target = t.targetKey(parsedLive.corr.length);
const { body: fixed } = t.rewrite(live, parsedLive, target);

console.log('\ncyber unit 3 exam key\n');

// ── 1. THE DEFECT, ON THE BODY THAT IS SERVING RIGHT NOW ────────────────────
console.log('1. the defect');
const was = t.audit(parsedLive.corr);
ok('the live key is BBBCCBBBBBCBBBABBBBB', was.letters === 'BBBCCBBBBBCBBBABBBBB', was.letters);
ok('B is correct 16 times', was.counts[1] === 16, String(was.counts[1]));
ok('D is never correct, so one option in four is dead', was.counts[3] === 0, String(was.counts[3]));
ok('bubbling one letter scores 16 of 20', was.guessScore === 16, String(was.guessScore));
ok('and the audit calls all of that a defect', was.problems.length >= 4, String(was.problems.length));

// ── 2. THE FIX ──────────────────────────────────────────────────────────────
console.log('\n2. the fix');
const now = t.audit(target);
ok('the new key is balanced 5/5/5/5', now.counts.every((c) => c === 5), now.counts.join('/'));
ok('no letter is dead', now.counts.every((c) => c > 0));
ok('no run longer than two', now.longestRun <= t.LIMITS.maxRun, String(now.longestRun));
ok('bubbling one letter now scores 5 of 20', now.guessScore === 5, String(now.guessScore));
ok('the key does not repeat itself at any lag',
  now.worstLag.rate <= t.LIMITS.maxLagMatch,
  `lag ${now.worstLag.lag} at ${Math.round(now.worstLag.rate * 100)}%`);
ok('the audit finds nothing wrong with it', now.problems.length === 0, now.problems.join(' | '));
//  Deterministic, or a parse-back diff means nothing and the sheet churns.
ok('the target key is deterministic across runs',
  t.targetKey(20).join(',') === target.join(','));

// ── 3. THE INVARIANT: ONLY POSITION MOVED ───────────────────────────────────
//  This is what makes the change safe to ship without re-reading 20 questions.
console.log('\n3. nothing but position changed');
ok('re-parsing the rewritten body finds the same correct option text everywhere',
  t.verifySameAnswers(live, fixed).length === 0,
  t.verifySameAnswers(live, fixed).join(' | '));
const A = t.parse(live);
const B = t.parse(fixed);
let sameSet = 0;
A.questions.forEach((qa, i) => {
  const sa = qa.opts.map((o) => o.html).sort().join(' ');
  const sb = B.questions[i].opts.map((o) => o.html).sort().join(' ');
  if (sa === sb) sameSet += 1;
});
ok('every question still offers the identical four options', sameSet === 20, `${sameSet}/20`);
//  Everything that is not an option list or the CORR array is byte-identical,
//  which is the strongest form of "the content did not change".
const strip = (s, p) => {
  let o = s;
  for (const q of p.questions) o = o.replace(q.opts.map((x) => x.raw).join('\n'), `@@OPTS${q.n}@@`);
  return o.replace(/var CORR=\[[^\]]*\]/, '@@CORR@@');
};
ok('stems, explanations and the grader script are byte-identical', strip(live, A) === strip(fixed, B));
ok('the handler indices and CORR still agree with each other',
  B.questions.every((q, i) => q.opts.every((o) => o.correct === B.corr[i])));
ok('data-idx still matches DOM position on all 80 options',
  B.questions.every((q) => q.opts.every((o, i) => o.dataIdx === i && o.idx === i)));

// ── 4. THE SHEET ────────────────────────────────────────────────────────────
console.log('\n4. the sheet');
if (fs.existsSync(SHEET)) {
  const rows = parseCsv(fs.readFileSync(SHEET, 'utf8')).rows;
  ok('one row', rows.length === 1, String(rows.length));
  ok('it is the unit 3 exam', rows[0].Handle === t.HANDLE, rows[0].Handle);
  ok('MERGE', rows[0].Command === 'MERGE');
  ok('Body HTML only, so Title and the SEO columns cannot move',
    t.HEADER.join(',') === 'Handle,Command,Body HTML');
  ok('the row carries the rebalanced body', rows[0]['Body HTML'] === fixed);
} else {
  ok('the sheet exists', false, SHEET);
}

// ─────────────────────────────────────────────────────────────────────────────
//  5. MUTATION. Each case breaks ONE thing and names the message it expects.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5. mutation, one rule at a time');

//  Keys fed straight to audit(). Each is a real shape a bad key can take.
const KEY_MUTANTS = [
  {
    rule: 'a letter over the cap',
    key: [1, 1, 1, 1, 1, 1, 1, 1, 0, 2, 3, 0, 2, 3, 0, 2, 3, 0, 2, 3],
    expect: /over the cap/,
  },
  {
    rule: 'a dead letter',
    //  7 A, 7 B, 6 C, no D, and nothing else wrong: no letter over the cap, no
    //  run past two, no periodicity. The first version of this mutant was
    //  012012012... which is a dead letter AND a perfect cycle, so the
    //  periodicity rule caught it and the dead-letter rule stayed unproven.
    //  The deploy gate refused it on exactly that: red for the wrong reason.
    key: [0, 0, 1, 1, 2, 1, 0, 0, 2, 2, 1, 0, 2, 1, 0, 2, 2, 1, 0, 1],
    expect: /never correct/,
  },
  {
    rule: 'a long same-letter run',
    key: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 0, 1, 2, 3],
    expect: /in a row/,
  },
  {
    //  THE ONE THE FIRST DRAFT OF THIS TOOL ACTUALLY SHIPPED.
    rule: 'a perfect cycle, which passes every count-and-run check',
    key: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3],
    expect: /repeats itself/,
  },
];

let keyRed = 0;
for (const m of KEY_MUTANTS) {
  const problems = t.audit(m.key).problems;
  const hit = problems.filter((p) => m.expect.test(p));
  if (hit.length) {
    pass += 1; keyRed += 1;
    console.log(`  ok    "${m.rule}" is caught, by its own rule`);
  } else if (problems.length) {
    fails.push(`mutation "${m.rule}" went red for the WRONG rule: ${problems.join(' | ')}`);
    console.log(`  MISS  "${m.rule}" went red for: ${problems.join(' | ').slice(0, 140)}`);
  } else {
    fails.push(`mutation "${m.rule}" was NOT caught at all`);
    console.log(`  MISS  "${m.rule}" was not caught at all`);
  }
}
ok('every key mutation went red', keyRed === KEY_MUTANTS.length, `${keyRed}/${KEY_MUTANTS.length}`);
//  The counterpart: a suite that is red on everything proves nothing either.
ok('and the shipped key is clean under the same audit', t.audit(target).problems.length === 0);

//  Body-level mutations, through the parser and the invariant check.
const BODY_MUTANTS = [
  {
    rule: 'the rewrite changes which option is correct',
    //  Swap two option texts in q1 WITHOUT moving the key, so the answer text
    //  changes while every index still lines up. This is the failure that would
    //  silently re-key a live exam.
    apply: (b) => {
      const p = t.parse(b);
      const q = p.questions[0];
      const a0 = q.opts[0].raw, a1 = q.opts[1].raw;
      const swapped = a0.replace(q.opts[0].html, q.opts[1].html);
      const swapped2 = a1.replace(q.opts[1].html, q.opts[0].html);
      return b.replace(a0, '@@TMP@@').replace(a1, swapped2).replace('@@TMP@@', swapped);
    },
    check: (b) => t.verifySameAnswers(live, b),
    expect: /CHANGED ANSWER/,
  },
  {
    rule: 'a distractor is dropped so the four options are no longer the same four',
    apply: (b) => {
      const p = t.parse(b);
      const q = p.questions[1];
      return b.replace(q.opts[3].html, 'A brand new distractor that was never on this page');
    },
    check: (b) => t.verifySameAnswers(live, b),
    expect: /not the same four|CHANGED ANSWER/,
  },
  {
    rule: 'data-idx stops matching the handler index, so a click is graded as a different option',
    apply: (b) => b.replace('data-idx="2">Move the server to the DMZ', 'data-idx="3">Move the server to the DMZ'),
    check: (b) => { try { t.parse(b); return []; } catch (e) { return [e.message]; } },
    expect: /data-idx/,
  },
  {
    rule: 'the handler and CORR disagree about the key',
    apply: (b) => b.replace(/var CORR=\[[^\]]*\]/, 'var CORR=[3, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0, 1, 1, 1, 1, 1]'),
    check: (b) => { try { t.parse(b); return []; } catch (e) { return [e.message]; } },
    expect: /handler says .* and CORR says/,
  },
  {
    rule: 'a Cloudflare-rewritten body is offered for import',
    apply: (b) => b.replace('Configure Telnet', '<a class="__cf_email__" data-cfemail="deadbe">[email protected]</a> Configure Telnet'),
    check: (b) => { const r = t.cloudflareRewritten(b); return r ? [r] : []; },
    expect: /rewritten by Cloudflare/,
  },
];

let bodyRed = 0;
for (const m of BODY_MUTANTS) {
  const mutated = m.apply(fixed);
  if (mutated === fixed) {
    fails.push(`mutation "${m.rule}" changed no bytes, so it proved nothing`);
    console.log(`  INERT "${m.rule}" changed no bytes`);
    continue;
  }
  const problems = m.check(mutated);
  const hit = problems.filter((p) => m.expect.test(p));
  if (hit.length) {
    pass += 1; bodyRed += 1;
    console.log(`  ok    "${m.rule}" is caught, by its own rule`);
  } else if (problems.length) {
    fails.push(`mutation "${m.rule}" went red for the WRONG rule: ${problems.join(' | ')}`);
    console.log(`  MISS  "${m.rule}" went red for: ${problems.join(' | ').slice(0, 140)}`);
  } else {
    fails.push(`mutation "${m.rule}" was NOT caught at all`);
    console.log(`  MISS  "${m.rule}" was not caught at all`);
  }
}
ok('every body mutation went red', bodyRed === BODY_MUTANTS.length, `${bodyRed}/${BODY_MUTANTS.length}`);
ok('and the unmutated rewrite is still clean under all of them',
  t.verifySameAnswers(live, fixed).length === 0 && !t.cloudflareRewritten(fixed));

console.log(`\n${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

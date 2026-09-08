'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REBALANCE A GUESSABLE ANSWER KEY BY MOVING OPTIONS, NEVER BY CHANGING THEM.
//
//  ── THE DEFECT ─────────────────────────────────────────────────────────────
//  ap-cyber-unit-3-exam serves this key, read off the live body 2026-09-08 and
//  unchanged since docs/cyber-unit-tests-availability.md found it on 09-01:
//
//      CORR = [1,1,1,2,2,1,1,1,1,1,2,1,1,1,0,1,1,1,1,1]
//      B x16   C x3   A x1   D x0
//
//  Answering B twenty times scores 16 of 20, which is 80 percent, without
//  reading a single stem. D is never correct, so one option in four is dead on
//  every item. No individual item is mis-keyed: this is a distribution defect,
//  and it makes the exam worthless as an exam while leaving every question
//  perfectly good as a question.
//
//  ── WHY PERMUTATION IS THE WHOLE FIX ───────────────────────────────────────
//  Nothing about the CONTENT is wrong, so nothing about the content changes.
//  Each question's four options are reordered and the key follows them. The
//  invariant is exact and is asserted rather than trusted: for every question,
//  the option TEXT that was correct before is the option text that is correct
//  after. If that holds, no student ever gets a different answer to a question
//  than they would have got yesterday.
//
//  Three things on this page make that safe, and all three were checked on the
//  live body before a line of this was written:
//
//    1. EXPS is per QUESTION, not per option, so no explanation is bound to a
//       position. Reordering cannot orphan a rationale.
//    2. No stem, option or explanation names a letter or a position. Zero
//       matches for "option A", "(B)", "answer C", "the first option" and four
//       more patterns across the whole 38 KB body.
//    3. The handler resolves by index at click time (opts[correct]) rather than
//       by any stored letter, so the only things that have to move together are
//       the DOM order, data-idx, the two handler arguments and CORR.
//
//  ── WHY THE TARGET KEY IS DERIVED AND NOT PICKED ───────────────────────────
//  A hand-picked key is a key somebody has to trust. This one is generated from
//  a stated rule (below) and then MEASURED against the same four properties the
//  defect is defined by, so the fix is falsifiable by the same test that found
//  the bug. Deterministic, so two runs produce the same sheet and a parse-back
//  diff means something.
//
//  ── THE BODY THIS READS MUST COME FROM A CLEAN EXTRACTION ──────────────────
//  lib/storefront-fetch.js refuses a body Cloudflare rewrote at render time,
//  and on this page it fires: the rendered HTML carries seven __cf_email__
//  markers. All seven are at offset 253127 and beyond, in the theme's contact
//  form, while the rte body ends at 235141. So the PAGE body is clean and the
//  page is not.
//
//  That distinction matters and is easy to get backwards in both directions.
//  Checking the rendered page refuses a body that is fine; checking nothing
//  imports a rewrite and makes it permanent. This checks the extracted body,
//  and refuses on it, so neither mistake is available.
//
//  Run: node tools/ap-cyber-ced/rebalance-exam-key.js --body <live.html> \
//         [--out <new-body.html>] [--sheet <file.csv>]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const { roundTrip } = require('./sheet-csv');

//  What a non-guessable key looks like, stated as numbers so the checks below
//  cannot drift from the prose. The cap is the bundle generator's own: no letter
//  may carry more than about a third of the items.
const LIMITS = {
  items: 20,
  maxPerLetter: 7,       // 20/4 = 5 even; 7 leaves room without being guessable
  minPerLetter: 1,       // no dead option
  maxRun: 2,             // no long same-letter stretch
  maxGuessScore: 7,      // best single-letter score, must be well under half
  //  PERIODICITY. Counts and runs both look perfect on ABCDABCDABCD..., and a
  //  student who spots the cycle scores 20/20 rather than 5. The first target
  //  key this tool generated was exactly that, and the count-and-run audit
  //  passed it, which is the same hole CLAUDE.md records for CDACDA: distinct,
  //  per-column and overall balance all held, and periodicity is what caught
  //  it. At a lag p, a key with no pattern matches itself about a quarter of
  //  the time; 0.55 is loose enough not to fire on noise and tight enough that
  //  a real cycle cannot survive.
  maxLagMatch: 0.55,
};

const LETTERS = ['A', 'B', 'C', 'D'];

// ─────────────────────────────────────────────────────────────────────────────
//  PARSE. Deliberately narrow: it recognises exactly the shape this page has
//  and throws on anything else. A parser that guesses is how a rewriter
//  reformats 23 live pages.
// ─────────────────────────────────────────────────────────────────────────────
const ITEM = /<div class="cfu-item" id="u3exam-q(\d+)">([\s\S]*?)<\/div>\s*<\/div>/g;
const OPT = /<li onclick="qzu3exam\(this,(\d+),(\d+),(\d+)\)" data-idx="(\d+)">([\s\S]*?)<\/li>/g;

function parse(body) {
  const corrMatch = /var CORR=\[([^\]]*)\]/.exec(body);
  if (!corrMatch) throw new Error('no CORR array, so this is not the page this tool understands');
  const corr = corrMatch[1].split(',').map((s) => Number(s.trim()));

  const questions = [];
  //  matchAll on a fresh regex: a /g regex carries lastIndex between calls and
  //  a shared one silently skips half the matches on the second run.
  for (const m of body.matchAll(new RegExp(ITEM.source, 'g'))) {
    const n = Number(m[1]);
    const inner = m[2];
    const opts = [];
    for (const o of inner.matchAll(new RegExp(OPT.source, 'g'))) {
      opts.push({
        q: Number(o[1]),
        idx: Number(o[2]),
        correct: Number(o[3]),
        dataIdx: Number(o[4]),
        html: o[5],
        raw: o[0],
      });
    }
    questions.push({ n, opts, block: m[0] });
  }

  const problems = [];
  if (questions.length !== LIMITS.items) {
    problems.push(`parsed ${questions.length} questions, expected ${LIMITS.items}`);
  }
  if (corr.length !== questions.length) {
    problems.push(`CORR has ${corr.length} entries for ${questions.length} questions`);
  }
  for (const q of questions) {
    if (q.opts.length !== 4) problems.push(`q${q.n} has ${q.opts.length} options, expected 4`);
    //  data-idx must equal the handler's index and the DOM position, or what a
    //  student clicks is not what gets graded.
    q.opts.forEach((o, i) => {
      if (o.q !== q.n) problems.push(`q${q.n} option ${i} carries question number ${o.q}`);
      if (o.idx !== i) problems.push(`q${q.n} option ${i} has handler index ${o.idx}`);
      if (o.dataIdx !== i) problems.push(`q${q.n} option ${i} has data-idx ${o.dataIdx}`);
    });
    //  The 4th argument is the correct index and is repeated on every option.
    //  Disagreement between them means the page has two opinions about the key.
    const set = new Set(q.opts.map((o) => o.correct));
    if (set.size !== 1) {
      problems.push(`q${q.n} options disagree about the correct index: ${[...set].join(', ')}`);
    }
    const fromHandler = q.opts[0] && q.opts[0].correct;
    if (fromHandler !== corr[q.n - 1]) {
      problems.push(`q${q.n} handler says ${fromHandler} and CORR says ${corr[q.n - 1]}`);
    }
  }
  if (problems.length) {
    throw new Error(`the page does not parse as expected:\n    ${problems.join('\n    ')}`);
  }
  return { questions, corr };
}

// ─────────────────────────────────────────────────────────────────────────────
//  THE TARGET KEY, DERIVED AND THEN AUDITED LIKE ANY OTHER KEY.
//
//  ── THE FIRST VERSION OF THIS FUNCTION SHIPPED THE DEFECT IT WAS FIXING ────
//  It was a greedy schedule: walk the slots, take the letter with the most
//  budget left, refuse anything that would make a run of three. Deterministic,
//  balanced, and it produced
//
//      ABCDABCDABCDABCDABCD
//
//  which is 5/5/5/5 with a longest run of 1 and passes a count-and-run audit
//  perfectly. It is also worse than the bug: a student who notices the cycle
//  scores 20/20 instead of 16/20. Greedy tie-breaking on a uniform budget IS a
//  cycle generator; that was not bad luck.
//
//  So the construction is a deterministic shuffle instead, and, more to the
//  point, its output is put through the SAME audit() every other key faces,
//  periodicity included. The generator is not trusted to be good. It proposes
//  and the audit disposes, which is the only arrangement where a future change
//  to either one cannot quietly reintroduce a pattern.
//
//  mulberry32 with a fixed seed: reproducible to the byte, so two runs make the
//  same sheet and a parse-back diff means something, while the sequence has no
//  structure for a student to find. The seed advances until a candidate passes;
//  the one that ships is the first that does.
// ─────────────────────────────────────────────────────────────────────────────
function mulberry32(a) {
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(n, seed) {
  const per = n / 4;
  const bag = [];
  for (let i = 0; i < 4; i += 1) for (let k = 0; k < per; k += 1) bag.push(i);
  const rnd = mulberry32(seed);
  //  Fisher-Yates, backwards, so every permutation is equally reachable.
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

const SEED = 1;
const MAX_SEEDS = 10000;

function targetKey(n = LIMITS.items) {
  if (n % 4 !== 0) throw new Error(`${n} items cannot split evenly across four options`);
  for (let seed = SEED; seed < SEED + MAX_SEEDS; seed += 1) {
    const candidate = shuffled(n, seed);
    if (!audit(candidate).problems.length) return candidate;
  }
  throw new Error(`no key passed the audit in ${MAX_SEEDS} seeds, which means the limits are unsatisfiable`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  MEASURE. The same four properties the defect is defined by, so a fix is
//  judged by the test that found the bug rather than by a new, friendlier one.
// ─────────────────────────────────────────────────────────────────────────────
function audit(corr) {
  const counts = [0, 0, 0, 0];
  for (const c of corr) counts[c] += 1;
  let longestRun = 0;
  let run = 0;
  for (let i = 0; i < corr.length; i += 1) {
    run = (i > 0 && corr[i] === corr[i - 1]) ? run + 1 : 1;
    if (run > longestRun) longestRun = run;
  }
  //  Self-similarity at every lag. This is the check the first draft lacked.
  let worstLag = { lag: 0, rate: 0 };
  for (let lag = 1; lag <= Math.floor(corr.length / 2); lag += 1) {
    let hits = 0;
    for (let i = lag; i < corr.length; i += 1) if (corr[i] === corr[i - lag]) hits += 1;
    const rate = hits / (corr.length - lag);
    if (rate > worstLag.rate) worstLag = { lag, rate };
  }

  //  What a student scores by picking one letter for every question and never
  //  reading a stem. This is the number that makes the defect concrete.
  const guessScore = Math.max(...counts);
  const problems = [];
  counts.forEach((c, i) => {
    if (c > LIMITS.maxPerLetter) problems.push(`${LETTERS[i]} is correct ${c} times, over the cap of ${LIMITS.maxPerLetter}`);
    if (c < LIMITS.minPerLetter) problems.push(`${LETTERS[i]} is never correct, so one option in four is dead on every item`);
  });
  if (longestRun > LIMITS.maxRun) problems.push(`${longestRun} same-letter answers in a row, over the limit of ${LIMITS.maxRun}`);
  if (guessScore > LIMITS.maxGuessScore) {
    problems.push(`answering ${LETTERS[counts.indexOf(guessScore)]} every time scores ${guessScore}/${corr.length}`
      + ` (${Math.round((guessScore / corr.length) * 100)}%) without reading a stem`);
  }
  if (worstLag.rate > LIMITS.maxLagMatch) {
    problems.push(`the key repeats itself every ${worstLag.lag} questions`
      + ` (${Math.round(worstLag.rate * 100)}% self-match at that lag), so spotting the cycle beats reading`);
  }
  return {
    counts, longestRun, guessScore, worstLag, problems,
    letters: corr.map((c) => LETTERS[c]).join(''),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  REWRITE. One question at a time, and the option HTML is carried across
//  untouched: only its position, its two indices and the shared correct index
//  change. Nothing reads or edits the text.
// ─────────────────────────────────────────────────────────────────────────────
function rewrite(body, parsed, target) {
  let out = body;
  const moves = [];

  parsed.questions.forEach((q, qi) => {
    const wasCorrect = q.opts[parsed.corr[qi]];
    const want = target[qi];

    //  The permutation: the correct option goes to slot `want`, and the other
    //  three fill the remaining slots in their original relative order. Keeping
    //  their order means the diff stays small and reviewable, and it avoids
    //  disturbing any deliberate ordering among the distractors.
    const others = q.opts.filter((o) => o !== wasCorrect);
    const next = [];
    let oi = 0;
    for (let slot = 0; slot < 4; slot += 1) {
      next.push(slot === want ? wasCorrect : others[oi++]);
    }

    const lis = next.map((o, slot) => `<li onclick="qzu3exam(this,${q.n},${slot},${want})"`
      + ` data-idx="${slot}">${o.html}</li>`).join('\n');

    const oldList = q.opts.map((o) => o.raw).join('\n');
    if (!out.includes(oldList)) {
      throw new Error(`q${q.n}: could not locate its option list verbatim, so the rewrite would be a guess`);
    }
    out = out.replace(oldList, lis);
    moves.push({ n: q.n, from: parsed.corr[qi], to: want, text: wasCorrect.html });
  });

  const newCorr = `var CORR=[${target.join(', ')}]`;
  const oldCorr = /var CORR=\[[^\]]*\]/;
  if (!oldCorr.test(out)) throw new Error('the CORR array vanished during the rewrite');
  out = out.replace(oldCorr, newCorr);

  return { body: out, moves };
}

// ─────────────────────────────────────────────────────────────────────────────
//  THE INVARIANT. Re-parse the REWRITTEN body from scratch and require that the
//  option text which was correct before is the option text that is correct
//  after, for every question. This is the check that makes the whole change
//  safe, so it re-reads rather than trusting `moves`.
// ─────────────────────────────────────────────────────────────────────────────
function verifySameAnswers(beforeBody, afterBody) {
  const a = parse(beforeBody);
  const b = parse(afterBody);
  const problems = [];
  if (a.questions.length !== b.questions.length) {
    problems.push(`question count changed: ${a.questions.length} -> ${b.questions.length}`);
    return problems;
  }
  a.questions.forEach((qa, i) => {
    const qb = b.questions[i];
    if (qa.n !== qb.n) problems.push(`question ${i + 1} renumbered ${qa.n} -> ${qb.n}`);
    const textBefore = qa.opts[a.corr[i]].html;
    const textAfter = qb.opts[b.corr[i]].html;
    if (textBefore !== textAfter) {
      problems.push(`q${qa.n} CHANGED ANSWER: was ${JSON.stringify(textBefore.slice(0, 60))},`
        + ` now ${JSON.stringify(textAfter.slice(0, 60))}`);
    }
    //  The set of options offered must also be identical. A permutation that
    //  drops or duplicates a distractor is not a permutation.
    const setA = [...qa.opts.map((o) => o.html)].sort();
    const setB = [...qb.opts.map((o) => o.html)].sort();
    if (setA.join(' ') !== setB.join(' ')) {
      problems.push(`q${qa.n}: the set of options offered is not the same four`);
    }
  });
  return problems;
}

//  Called on the EXTRACTED body, never on the rendered page. Same markers as
//  lib/storefront-fetch.js; duplicated as a two-line constant rather than
//  imported, because that module's own function takes a rendered page and this
//  one must not be handed one by accident.
const CF_REWRITE = /__cf_email__|\/cdn-cgi\/l\/email-protection|data-cfemail|email-decode\.min\.js/;
function cloudflareRewritten(body) {
  if (!CF_REWRITE.test(body || '')) return null;
  return 'this body was rewritten by Cloudflare at render time, so it is not what Shopify stores.'
    + ' Importing it would make the rewrite permanent and replace real text with a dead placeholder.';
}

//  One row, Body HTML only. Title, SEO and Published stay off the sheet so a
//  MERGE cannot touch them: this change is about where four list items sit.
const HANDLE = 'ap-cyber-unit-3-exam';
const HEADER = ['Handle', 'Command', 'Body HTML'];

function sheetFor(body) {
  return roundTrip([{ Handle: HANDLE, Command: 'MERGE', 'Body HTML': body }], HEADER);
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  const bodyFile = arg('--body');
  const out = arg('--out');
  const sheetOut = arg('--sheet');
  if (!bodyFile) {
    console.error('usage: rebalance-exam-key.js --body <live.html> [--out <new-body.html>]');
    process.exit(2);
  }
  const before = fs.readFileSync(bodyFile, 'utf8');
  const rewritten = cloudflareRewritten(before);
  if (rewritten) {
    console.error(`\n  Refusing: ${rewritten}\n`);
    process.exit(1);
  }
  const parsed = parse(before);

  const wasAudit = audit(parsed.corr);
  console.log(`\n  before  ${wasAudit.letters}`);
  console.log(`          A:${wasAudit.counts[0]} B:${wasAudit.counts[1]} C:${wasAudit.counts[2]} D:${wasAudit.counts[3]}`
    + `  longest run ${wasAudit.longestRun}  best single-letter score ${wasAudit.guessScore}/${parsed.corr.length}`);
  for (const p of wasAudit.problems) console.log(`          DEFECT: ${p}`);
  if (!wasAudit.problems.length) {
    console.error('\n  Refusing: this key is already balanced, so the rewrite would churn a live page for nothing.\n');
    process.exit(1);
  }

  const target = targetKey(parsed.corr.length);
  const { body: after, moves } = rewrite(before, parsed, target);

  const nowAudit = audit(target);
  console.log(`\n  after   ${nowAudit.letters}`);
  console.log(`          A:${nowAudit.counts[0]} B:${nowAudit.counts[1]} C:${nowAudit.counts[2]} D:${nowAudit.counts[3]}`
    + `  longest run ${nowAudit.longestRun}  best single-letter score ${nowAudit.guessScore}/${target.length}`);
  if (nowAudit.problems.length) {
    console.error('\n  REFUSING: the rebalanced key is still guessable:');
    for (const p of nowAudit.problems) console.error(`    ${p}`);
    process.exit(1);
  }

  const broke = verifySameAnswers(before, after);
  if (broke.length) {
    console.error(`\n  REFUSING: the rewrite changed what is correct (${broke.length}):`);
    for (const p of broke) console.error(`    ${p}`);
    process.exit(1);
  }
  console.log(`\n  every one of ${moves.length} questions keeps the same correct option text`);
  console.log(`  ${moves.filter((m) => m.from !== m.to).length} questions had their options reordered`);

  if (out) {
    fs.writeFileSync(out, after);
    console.log(`\n  wrote ${out} (${Buffer.byteLength(after)} bytes, was ${Buffer.byteLength(before)})`);
  }

  if (sheetOut) {
    //  Generation is not evidence that generation worked. The CSP sheet lost 90
    //  bytes a page while every semantic check passed.
    const sheet = sheetFor(after);
    if (sheet.drift.length) {
      console.error('\n  PARSE-BACK DRIFT. The sheet does not read back as what was written:');
      for (const d of sheet.drift) console.error(`    ${d}`);
      process.exit(1);
    }
    fs.writeFileSync(sheetOut, sheet.csv);
    console.log(`  parse-back clean, wrote ${sheetOut} (${sheet.bytes} bytes, 1 row)`);
  }

  if (!out && !sheetOut) console.log('\n  no --out or --sheet given, so nothing was written');
}

if (require.main === module) main();
module.exports = {
  parse, audit, targetKey, rewrite, verifySameAnswers, cloudflareRewritten,
  sheetFor, LIMITS, LETTERS, HANDLE, HEADER,
};

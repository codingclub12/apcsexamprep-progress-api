#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE MUTATION BATTERY: break every rule on purpose, one at a time, and
//  require the validator to go RED FOR THAT RULE.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK. That is not a slogan here, it is the
//  exit code: a rule that cannot be broken is a rule that is not doing
//  anything, and this run fails when that happens.
//
//  ── WHY EACH MUTATION NAMES ITS RULE ────────────────────────────────────────
//  "The suite went red" and "this rule is real" are different claims. Where
//  guards overlap, the strong one masks the weak one, and a battery that only
//  looks for redness reports a clean run over a rule that cannot fire at all.
//  So every mutation declares the rule it expects to trip AND a distinctive
//  slice of the message it expects to see. A mutation caught only by some other
//  rule is reported as MISSED, exactly as if nothing had fired.
//
//  ── RULE 7 IS ASSERTED AT BOTH CORRUPTION DEPTHS, SEPARATELY ────────────────
//  This is the one that was already found hollow once, before shipping, and the
//  reason is worth keeping in front of whoever reads this next. Mojibake comes
//  at depths: run the damage once and a bullet becomes three characters led by
//  U+00E2; run it twice and it becomes seven, led by U+00C3. A rule written from
//  double-pass examples goes red against a double-pass mutation and passes the
//  single-pass corruption that is actually on live pages. The mutation report
//  then reads green over a real hole, which is worse than no report.
//
//  So there are two rule 7 mutations and both must fire on their own.
//
//  Offline: no network, no secrets, no browser, no database, nothing written.
//
//  Run: npm run smoke:cybersheetmutation
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const { generate, esc } = require('./generate-sheet');
const { validate } = require('./validator');
const { writeCsv, parseCsv, roundTrip, HEADER } = require('./sheet-csv');
const cyberTopics = require('../../lib/cyber-topics');

const SPECS = require('./fixtures/topic-spec.fixture');

//  cp1252, so a corruption can be built rather than pasted. Pasting mojibake
//  into a source file is how a fixture gets "fixed" by a well-meaning editor and
//  the mutation quietly stops mutating.
const CP1252_HIGH = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};

//  One pass of the real-world damage: UTF-8 bytes decoded as cp1252.
function corruptOnce(s) {
  return [...Buffer.from(s, 'utf8')]
    .map((b) => String.fromCodePoint(CP1252_HIGH[b] || b))
    .join('');
}

const BULLET = String.fromCodePoint(0x2022);   // the character that got damaged
const DART = String.fromCodePoint(0x1f3af);    // and the 4-byte one
const EMDASH = String.fromCodePoint(0x2014);

// ─────────────────────────────────────────────────────────────────────────────
//  Every mutation: what it breaks, which rule must catch it, and a slice of the
//  message that proves the RIGHT rule caught it.
//
//  Mutations are described by SHAPE rather than by literal offsets wherever
//  possible, so they keep applying when the fixture text is edited. A mutation
//  that silently stops applying is the same failure as a rule that cannot fire.
// ─────────────────────────────────────────────────────────────────────────────
const MUTATIONS = [
  {
    rule: 'R1',
    name: 'an EK code is dropped into the lede',
    expect: 'in student-visible text',
    rows: (rows) => patchBody(rows, 0, (b) =>
      b.replace('This is fixture text', 'This is fixture text about elicitation (1.1.A.1)')),
  },
  {
    rule: 'R1',
    name: 'the EK coverage table loses its closing tag',
    expect: 'protection map is unreliable',
    rows: (rows) => patchBody(rows, 0, (b) => b.replace('</table>', '')),
  },
  {
    rule: 'R2',
    name: 'a per-unit exam weighting is invented',
    expect: 'no per-unit or per-topic exam weighting',
    rows: (rows) => patchBody(rows, 0, (b) =>
      b.replace('This is fixture text', 'Unit 1 is 22% of the exam. This is fixture text')),
  },
  {
    rule: 'R2',
    name: 'the skill-category band is moved outside the CED band',
    expect: 'outside the CED band',
    rows: (rows) => patchBody(rows, 1, (b) => b.replace('25% to 40%', '55% to 70%')),
  },
  {
    rule: 'R3',
    name: 'an em-dash is typed into the prose',
    expect: 'an em-dash in',
    rows: (rows) => patchBody(rows, 0, (b) => b.replace('not a lesson.', `not a lesson ${EMDASH} really.`)),
  },
  {
    rule: 'R3',
    name: 'an em-dash arrives as an HTML entity instead',
    expect: 'an em-dash in',
    rows: (rows) => patchBody(rows, 0, (b) => b.replace('not a lesson.', 'not a lesson &mdash; really.')),
  },
  {
    rule: 'R4',
    name: 'the heading carries another topic\'s canonical title',
    expect: 'appears on the page for topic',
    rows: (rows) => patchBody(rows, 0, (b) =>
      b.replace(esc(cyberTopics.titleOf('1.1')), esc(cyberTopics.titleOf('1.3')))),
  },
  {
    rule: 'R4',
    name: 'the page calls itself a different topic number',
    expect: 'calls itself Topic',
    rows: (rows) => patchBody(rows, 0, (b) => b.replace('Topic 1.1:', 'Topic 1.4:')),
  },
  {
    rule: 'R4',
    name: 'the Title column drifts from the canonical title',
    expect: 'the Title column reads',
    rows: (rows) => rows.map((r, i) => (i === 0
      ? { ...r, Title: 'AP Cybersecurity Topic 1.1: Social Engineering Basics' }
      : r)),
  },
  {
    rule: 'R5',
    name: 'a row carries an empty Body HTML cell',
    expect: 'EMPTY Body HTML cell',
    rows: (rows) => rows.map((r, i) => (i === 1 ? { ...r, 'Body HTML': '' } : r)),
  },
  {
    rule: 'R5',
    name: 'a metadata-only row travels in a sheet that has the Body column',
    expect: 'metadata-only row',
    specs: (specs) => specs.map((s, i) => (i === 1 ? { ...s, body_update: false } : s)),
  },
  {
    rule: 'R6',
    name: 'an internal link points at a handle that does not exist',
    expect: 'which is neither live nor created by this sheet',
    rows: (rows) => patchBody(rows, 0, (b) =>
      b.replace('/pages/ap-cybersecurity-unit-1-password-attacks', '/pages/ap-cyber-unit-1-lesson-9-does-not-exist')),
  },
  {
    rule: 'R7',
    name: 'SINGLE-pass mojibake, the depth seen on live pages',
    //  Computed from the character being damaged, not typed: a pin retyped by
    //  hand is a pin that stops matching the next time the message is reworded,
    //  which is how these three quietly stopped proving anything when rule 7
    //  moved onto the shared detector.
    expect: `means ${JSON.stringify(BULLET)} (cp1252, width 3)`,
    rows: (rows) => patchBody(rows, 0, (b) =>
      b.replace('This is fixture text', `${corruptOnce(BULLET)} This is fixture text`)),
  },
  {
    rule: 'R7',
    name: 'DOUBLE-pass mojibake, the depth the first draft of the rule assumed',
    expect: 'mojibake:',
    rows: (rows) => patchBody(rows, 0, (b) =>
      b.replace('This is fixture text', `${corruptOnce(corruptOnce(BULLET))} This is fixture text`)),
  },
  {
    rule: 'R7',
    name: 'SINGLE-pass mojibake of a 4-byte character, in the Title column',
    //  width 4 is the assertion: a detector that only tries widths 2 and 3
    //  cannot see a damaged emoji at all.
    expect: 'width 4',
    rows: (rows) => rows.map((r, i) => (i === 0
      ? { ...r, Title: `${r.Title} ${corruptOnce(DART)}` }
      : r)),
  },
];

function patchBody(rows, i, fn) {
  return rows.map((r, k) => (k === i ? { ...r, 'Body HTML': fn(r['Body HTML']) } : r));
}

// ─────────────────────────────────────────────────────────────────────────────
//  The parse-back diff is a guard too, so it is mutated as well. Its own
//  failure mode is a writer that loses bytes in the quoting, which is what cost
//  a CSP sheet 90 bytes a page while every semantic check passed.
// ─────────────────────────────────────────────────────────────────────────────
function mutateTheWriter(rows) {
  //  A writer that forgets to double an embedded quote: the classic. Everything
  //  after the first quotation mark in a cell shifts into the wrong columns.
  const naive = (v) => `"${String(v == null ? '' : v)}"`;
  const lines = [HEADER.map(naive).join(',')];
  for (const r of rows) lines.push(HEADER.map((h) => naive(r[h])).join(','));
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  RUN
// ─────────────────────────────────────────────────────────────────────────────
function judge(rows, specs) {
  //  Same pipeline the generator uses: write the sheet, read it back, judge what
  //  came back. Judging the in-memory rows instead would let a mutation pass
  //  that the CSV round trip destroys.
  return validate(parseCsv(writeCsv(rows, HEADER)), {
    specs,
    liveHandles: require('./generate-sheet').liveHandles(),
  });
}

function main() {
  console.log('\nValidator mutation battery: seven rules, broken one at a time\n');

  const base = generate(SPECS);
  let bad = 0;

  //  The baseline has to PASS. A battery whose clean case is already red proves
  //  nothing about any mutation: every rule would look caught.
  const baseline = judge(base.rows, SPECS);
  if (baseline.fail.length) {
    bad++;
    console.log(`  ${'baseline (the fixture sheet)'.padEnd(62)}UNEXPECTED FAILURE`);
    for (const f of baseline.fail.slice(0, 4)) console.log(`      ${f.slice(0, 150)}`);
  } else {
    console.log(`  ${'baseline (the fixture sheet)'.padEnd(62)}passes, as it must`);
  }
  if (base.drift.length) {
    bad++;
    console.log(`  ${'baseline parse-back'.padEnd(62)}UNEXPECTED DRIFT`);
  } else {
    console.log(`  ${'baseline parse-back'.padEnd(62)}zero byte drift`);
  }

  console.log('');
  const fired = {};
  for (const m of MUTATIONS) {
    const rows = m.rows ? m.rows(base.rows) : base.rows;
    const specs = m.specs ? m.specs(SPECS) : SPECS;

    //  A mutation that changed nothing is a broken mutation, and it must be
    //  reported rather than counted as a pass.
    const changed = m.specs
      ? JSON.stringify(specs) !== JSON.stringify(SPECS)
      : JSON.stringify(rows) !== JSON.stringify(base.rows);

    const label = `${m.rule}  ${m.name}`;
    if (!changed) {
      bad++;
      console.log(`  ${label.padEnd(62)}MUTATION DID NOT APPLY`);
      continue;
    }

    let report;
    try { report = judge(rows, specs); }
    catch (e) { report = { fail: [`(the validator threw) ${e.message}`], byRule: {} }; }

    const own = (report.byRule[m.rule] || []).filter((f) => f.includes(m.expect));
    const others = Object.entries(report.byRule)
      .filter(([id, list]) => id !== m.rule && list.length)
      .map(([id]) => id);

    if (own.length) {
      fired[m.rule] = (fired[m.rule] || 0) + 1;
      const also = others.length ? `  (also ${others.join(',')})` : '';
      console.log(`  ${label.padEnd(62)}caught by ${m.rule}${also}`);
    } else {
      bad++;
      //  BOTH branches name the rule. The first version said "MISSED, the
      //  validator passed a broken sheet" when nothing at all fired, so a
      //  deploy-gate mutation pinned to "MISSED by R3" could not match the very
      //  case it was written for: a rule that fires on nothing. A pin that
      //  cannot match the failure it targets is the hollow-guard problem one
      //  level up.
      //  Three genuinely different outcomes, and reporting them as one line
      //  cost this battery a confusing run: the rule fired, on a message the
      //  mutation was not pinned to, and the report read "only  fired".
      //  Three genuinely different outcomes, and every one of them names the
      //  rule the same way, as `MISSED [R1]`. Reporting them with three
      //  different phrasings is what stranded two deploy-gate pins: a gate
      //  pinned to "MISSED by R1" cannot match "MISSED: R1 fired but not on",
      //  so the mutation read as unproven while the battery was working
      //  correctly. One shape, every branch.
      const own = report.byRule[m.rule] || [];
      const tag = `MISSED [${m.rule}]`;
      const why = own.length
        ? `${tag} fired, but not on ${JSON.stringify(m.expect)}: the pin is stale`
        : report.fail.length
          ? `${tag} did not fire; only ${others.join(',')} did`
          : `${tag} did not fire, and the validator passed a broken sheet`;
      console.log(`  ${label.padEnd(62)}${why}`);
      for (const f of report.fail.slice(0, 2)) console.log(`      ${f.slice(0, 150)}`);
    }
  }

  //  The parse-back guard, mutated.
  console.log('');
  const broken = mutateTheWriter(base.rows);
  const readBack = parseCsv(broken);
  const quotingCaught = readBack.rows.some((r, i) => r['Body HTML'] !== base.rows[i]['Body HTML'])
    || readBack.rows.length !== base.rows.length;
  const clean = roundTrip(base.rows, HEADER);
  if (quotingCaught && !clean.drift.length) {
    console.log(`  ${'parse-back  a writer that forgets to double a quote'.padEnd(62)}caught by parse-back`);
  } else {
    bad++;
    console.log(`  ${'parse-back  a writer that forgets to double a quote'.padEnd(62)}MISSED`);
  }

  //  Every rule must have been exercised. A rule with no mutation behind it is
  //  in exactly the position this battery exists to make impossible.
  console.log('');
  const unexercised = Object.keys(base.report.rules).filter((id) => !fired[id]);
  if (unexercised.length) {
    bad++;
    console.log(`  ${unexercised.length} rule(s) with no mutation proving them: ${unexercised.join(', ')}`);
  } else {
    console.log(`  all 7 rules independently proven red: ${Object.entries(fired).map(([r, n]) => `${r} x${n}`).join(', ')}`);
  }

  console.log('');
  if (bad) {
    console.error(`${bad} problem(s). A MISSED line means the rule is hollow, not that the sheet is fine.`);
    process.exit(1);
  }
  console.log(`OK - ${MUTATIONS.length} mutations, every one caught by the rule that claims it`);
}

if (require.main === module) main();

module.exports = { MUTATIONS, corruptOnce, judge, mutateTheWriter };

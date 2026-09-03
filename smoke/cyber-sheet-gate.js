#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the AP Cybersecurity page generator and its seven-rule validator.
//
//  The mutation battery (tools/ap-cyber-ced/validator-mutation.js) proves each
//  rule can go red. This suite proves the other half, which is the half that
//  decides whether anybody keeps the validator turned on:
//
//    * a CORRECT sheet passes, including the parts that look like violations.
//      Legitimate CED codes in the collapsed coverage table, the card tags and
//      the teacher answer key. The CED's real "25% to 40%" per-skill-category
//      weighting. A page that cross-links the other page in its own sheet.
//      A validator that refused those would send every author back to hand
//      editing, and rule 2 in particular was written the wrong way round first
//      and rejected the CED's own sentence.
//
//    * the generator REFUSES a bad spec before a sheet exists to review, and
//      cannot be talked into writing an importable sheet out of a fixture.
//
//    * rule 7's mutations have teeth. This is the assertion that matters most
//      here: the narrow form of the rule that the handoff prescribed is run
//      side by side with the general form, and the single-pass corruption that
//      lives on real pages is shown passing the narrow one. Without this, a
//      green rule 7 mutation line would prove nothing, because a double-pass
//      mutation goes red against a rule that is blind to the real bug.
//
//  Offline: no network, no secrets, no browser, no database.
//
//  Run: npm run smoke:cybersheet
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');
const { generate, specDrift, specErrors, liveHandles } = require('../tools/ap-cyber-ced/generate-sheet');
const { validate, ruleExamWeighting, ruleEmDash, ruleDeadLinks } = require('../tools/ap-cyber-ced/validator');
const { writeCsv, parseCsv, roundTrip, HEADER, PUBLISHED_AT } = require('../tools/ap-cyber-ced/sheet-csv');
const mojibake = require('../lib/mojibake');
const { corruptOnce } = require('../tools/ap-cyber-ced/validator-mutation');
const cyberTopics = require('../lib/cyber-topics');

const ROOT = path.join(__dirname, '..');
const FIXTURE = path.join(ROOT, 'tools', 'ap-cyber-ced', 'fixtures', 'topic-spec.fixture.js');
const SPECS = require(FIXTURE);

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

const HANDLES = liveHandles();
const built = generate(SPECS, { liveHandles: HANDLES });

console.log('\nAP Cyber sheet generator and validator\n');

// ── 1. A correct sheet passes ────────────────────────────────────────────────
check('the fixture sheet passes all seven rules', () => {
  assert.deepStrictEqual(built.report.fail, []);
});

check('legitimate EK codes in protected places do NOT trip rule 1', () => {
  const body = built.rows[0]['Body HTML'];
  assert.ok(/1\.1\.A\.1/.test(body), 'the fixture must actually carry codes, or this proves nothing');
  assert.deepStrictEqual(built.report.byRule.R1, []);
});

check('the CED per-skill-category band does NOT trip rule 2', () => {
  const text = '<p>Each skill category is 25% to 40% of the AP Cybersecurity exam.</p>';
  assert.deepStrictEqual(ruleExamWeighting(text), []);
});

check('a per-unit weighting DOES trip rule 2', () => {
  const out = ruleExamWeighting('<p>Unit 3 is 22% of the exam.</p>');
  assert.strictEqual(out.length, 1, JSON.stringify(out));
  assert.ok(/no per-unit or per-topic exam weighting/.test(out[0]));
});

check('a per-topic weighting DOES trip rule 2', () => {
  const out = ruleExamWeighting('<p>This topic is about 8% of the exam.</p>');
  assert.strictEqual(out.length, 1, JSON.stringify(out));
});

//  The heading is on every page, so this is the case that decides whether the
//  rule is usable at all.
check('a correct band sentence under a topic heading still passes rule 2', () => {
  const text = '<h1>AP Cybersecurity Topic 1.2: Suspicious Website Logins</h1>'
    + '<p>Each skill category is 25% to 40% of the exam.</p>';
  assert.deepStrictEqual(ruleExamWeighting(text), []);
});

check('a percentage that is content, not an exam claim, is ignored by rule 2', () => {
  assert.deepStrictEqual(
    ruleExamWeighting('<p>About 80% of breaches begin with a stolen credential.</p>'), []);
});

check('a skill-category number outside the CED band trips rule 2', () => {
  const out = ruleExamWeighting('<p>Each skill category is 55% of the exam.</p>');
  assert.strictEqual(out.length, 1, JSON.stringify(out));
  assert.ok(/outside the CED band/.test(out[0]));
});

check('a link to a page created by the same sheet does NOT trip rule 6', () => {
  assert.deepStrictEqual(built.report.byRule.R6, []);
  const body = built.rows[0]['Body HTML'];
  assert.ok(body.includes('/pages/fixture-cyber-topic-1-2'),
    'the fixture must actually cross-link its own sheet, or this proves nothing');
});

check('rule 6 reads the live handle snapshot, and it is not empty', () => {
  assert.ok(HANDLES.size > 1000, `only ${HANDLES.size} live handles loaded`);
  const out = ruleDeadLinks([{ Handle: 'x', 'Body HTML': '<a href="/pages/nope-not-a-page">n</a>' }], HANDLES);
  assert.strictEqual(out.length, 1);
});

check('an en-dash and a hyphen are not em-dashes', () => {
  assert.deepStrictEqual(ruleEmDash('a range 25-40 and an en dash \u2013 here', 'test'), []);
});

// ── 2. The sheet survives the CSV, byte for byte ─────────────────────────────
check('the sheet round-trips with zero byte drift', () => {
  assert.deepStrictEqual(built.drift, []);
});

check('every string the spec supplied is in the sheet after parse-back', () => {
  assert.deepStrictEqual(specDrift(built.csv, SPECS), []);
});

check('the sheet is in the Matrixify dialect the importing sheets use', () => {
  assert.ok(built.csv.startsWith('\ufeff'), 'no BOM: Matrixify reads utf-8-sig');
  assert.ok(built.csv.includes('\r\n'), 'no CRLF');
  const back = parseCsv(built.csv);
  assert.deepStrictEqual(back.header, HEADER);
  for (const row of back.rows) {
    assert.strictEqual(row.Command, 'MERGE');
    assert.strictEqual(row['Published At'], PUBLISHED_AT);
    assert.ok(!/^\s*$/.test(row['Body HTML']));
  }
});

check('a quote-mangling writer is caught by the round trip', () => {
  const rows = [{ ...built.rows[0], 'Body HTML': 'he said "hello", then left' }];
  const good = roundTrip(rows, HEADER);
  assert.deepStrictEqual(good.drift, []);
  //  The same cell through a writer that does not double the quote comes back
  //  short, which is the 90-bytes-a-page failure in miniature.
  const naive = `﻿${HEADER.join(',')}\r\n${HEADER.map((h) => `"${rows[0][h]}"`).join(',')}\r\n`;
  const back = parseCsv(naive);
  assert.notStrictEqual(back.rows[0]['Body HTML'], rows[0]['Body HTML']);
});

// ── 3. The generator refuses bad input ───────────────────────────────────────
check('a spec that sets its own title is refused', () => {
  const bad = [{ ...SPECS[0], title: 'Whatever I Feel Like Calling It' }];
  const out = specErrors(bad, { liveHandles: HANDLES });
  assert.ok(out.some((m) => /sets title, which the taxonomy owns/.test(m)), JSON.stringify(out));
});

check('a spec for a topic the CED does not have is refused', () => {
  const out = specErrors([{ ...SPECS[0], topic: '3.6' }], { liveHandles: HANDLES });
  assert.ok(out.some((m) => /which the CED does not have/.test(m)), JSON.stringify(out));
});

check('a fixture spec pointed at a live handle is refused', () => {
  const out = specErrors(
    [{ ...SPECS[0], handle: 'ap-cybersecurity-unit-1-social-engineering' }],
    { liveHandles: HANDLES }
  );
  assert.ok(out.some((m) => /must start with "fixture-"/.test(m)), JSON.stringify(out));
});

check('a real spec aimed at a handle the taxonomy does not know is refused', () => {
  const spec = { ...SPECS[0] };
  delete spec.fixture;
  spec.handle = 'ap-cybersecurity-unit-1-social-engineering-v2';
  const out = specErrors([spec], { liveHandles: HANDLES });
  assert.ok(out.some((m) => /the taxonomy says this topic lives at/.test(m)), JSON.stringify(out));
});

check('two specs for one topic are refused', () => {
  const out = specErrors([SPECS[0], SPECS[0]], { liveHandles: HANDLES });
  assert.ok(out.some((m) => /second spec for topic/.test(m)), JSON.stringify(out));
});

check('the generator will not write an importable sheet from a fixture', () => {
  let code = 0;
  let output = '';
  try {
    output = execFileSync(process.execPath, [
      path.join(ROOT, 'tools', 'ap-cyber-ced', 'generate-sheet.js'),
      '--spec', FIXTURE,
      '--out', path.join(require('os').tmpdir(), 'must-not-exist.csv'),
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    code = e.status;
    output = `${e.stdout || ''}${e.stderr || ''}`;
  }
  assert.strictEqual(code, 1, 'writing a fixture sheet must fail');
  assert.ok(/fixtures, so no importable sheet is written/.test(output), output.slice(0, 200));
  assert.ok(!require('fs').existsSync(path.join(require('os').tmpdir(), 'must-not-exist.csv')),
    'a file was written for a fixture spec');
});

check('a row with no source spec cannot be judged, and says so', () => {
  const out = validate(parseCsv(writeCsv(built.rows, HEADER)), { specs: [], liveHandles: HANDLES });
  assert.ok(out.fail.some((m) => /has no source spec/.test(m)), JSON.stringify(out.fail.slice(0, 2)));
});

// ── 4. Rule 7 through the validator, at both corruption depths ───────────────
//  Detection belongs to lib/mojibake.js, and smoke/encoding-guard.js proves that
//  module against generated fixtures at both depths and in both flavours. This
//  suite does not re-prove it and holds no second detector: what it owns is the
//  question that module cannot answer, which is whether RULE 7 of the sheet
//  validator actually fires on a sheet.
//
//  Both depths are still asserted separately here, because that is the specific
//  way this rule was found hollow before it shipped: a mutation built from the
//  double-pass form goes red against a rule blind to the single-pass form, which
//  is the one on live pages, and that green report is worse than no report.
const BULLET = String.fromCodePoint(0x2022);
const DART = String.fromCodePoint(0x1f3af);
const singlePass = corruptOnce(BULLET);
const doublePass = corruptOnce(corruptOnce(BULLET));

//  A sheet carrying `bad` in its lede, judged the way the generator judges one.
function sheetWith(bad) {
  const rows = built.rows.map((r, i) => (i === 0
    ? { ...r, 'Body HTML': r['Body HTML'].replace('This is fixture text', `${bad} This is fixture text`) }
    : r));
  return validate(parseCsv(writeCsv(rows, HEADER)), { specs: SPECS, liveHandles: HANDLES });
}

check('rule 7 fires on SINGLE-pass corruption, the depth on live pages', () => {
  const report = sheetWith(singlePass);
  assert.ok(report.byRule.R7.length, 'the validator passed a sheet with single-pass mojibake');
  assert.ok(report.byRule.R7[0].includes(JSON.stringify(BULLET)),
    `the failure should name the character it really is: ${report.byRule.R7[0]}`);
});

check('rule 7 fires on DOUBLE-pass corruption', () => {
  assert.ok(sheetWith(doublePass).byRule.R7.length,
    'the validator passed a sheet with double-pass mojibake');
});

check('rule 7 fires on a corrupted 4-byte character', () => {
  assert.ok(sheetWith(corruptOnce(DART)).byRule.R7.length,
    'the validator passed a sheet with a corrupted emoji');
});

check('rule 7 fires on a damaged Title column, not only on the body', () => {
  const rows = built.rows.map((r, i) => (i === 0 ? { ...r, Title: `${r.Title} ${corruptOnce(DART)}` } : r));
  const report = validate(parseCsv(writeCsv(rows, HEADER)), { specs: SPECS, liveHandles: HANDLES });
  assert.ok(report.byRule.R7.length, 'a damaged title is a damaged page');
});

check('the failure names the codec and the width, so it can be acted on', () => {
  const m = /\((cp1252|latin1), width (\d)\)/.exec(sheetWith(corruptOnce(DART)).byRule.R7[0]);
  assert.ok(m, 'no codec or width in the message');
  assert.strictEqual(m[2], '4', 'a corrupted emoji is a width-4 sequence');
});

check('a clean sheet has no mojibake in any column, at any depth', () => {
  for (const row of built.rows) {
    for (const col of HEADER) {
      assert.deepStrictEqual(mojibake.analyze(String(row[col] || '')), [], `${row.Handle} ${col}`);
    }
  }
});

check('healthy text with accents and symbols does not trip rule 7', () => {
  for (const clean of ['cafe naive resume', 'caf\u00e9 na\u00efve \u00e2me r\u00f4le stra\u00dfe se\u00f1or',
    '\u25b2 \u25bc \u2192 \u2022 \u2026 \u2713', 'the quick brown fox, 100% of it',
    '\u00e0 la carte', 'Ma\u00f1ana']) {
    assert.deepStrictEqual(sheetWith(clean).byRule.R7, [], JSON.stringify(clean));
  }
});

// ── 5. The rules are all still wired ─────────────────────────────────────────
check('the validator reports exactly the seven rules', () => {
  assert.deepStrictEqual(Object.keys(built.report.rules), ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7']);
});

check('every generated page carries the canonical title from the taxonomy', () => {
  built.rows.forEach((row, i) => {
    const canonical = cyberTopics.titleOf(SPECS[i].topic);
    assert.ok(row.Title.includes(canonical), `${row.Handle}: ${row.Title}`);
    assert.ok(row['Body HTML'].includes(canonical), `${row.Handle} body heading`);
  });
});

console.log('');
if (failures) { console.error(`${failures} FAILED`); process.exit(1); }
console.log('OK - a correct sheet passes, a bad spec is refused, and rule 7 is not hollow');

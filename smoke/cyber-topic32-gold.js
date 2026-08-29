#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  CYBER TOPIC 3.2: the rebuild to the Unit 3 template.
//
//  Offline, no network, no secrets. Run: npm run smoke:cybertopic32
//
//  WHAT THIS DEFENDS
//  Two things, and both fail quietly.
//
//  1. THE TEMPLATE. Five of Unit 3's six lesson pages are the same shape, and
//     3.2 was the one that was not. Rebuilding it to match is only worth doing
//     if it STAYS matched, and every part of the shape is a count that drifts
//     silently: drop the FAQ and the page still renders, lose a case study and
//     nothing throws. The counts are asserted against what the siblings
//     actually carry, measured rather than assumed.
//
//  2. THE CHECKS. Ten of them, one per teaching section, and each one is a
//     small machine that can be broken without any visible symptom. A key
//     naming an option that is not on the page can never be answered
//     correctly. A distractor with no feedback selects silently and teaches
//     nothing. A matching block whose key has a different length from its rows
//     grades every attempt against the wrong number of slots. None of these
//     throw, and none are visible until a student hits them.
//
//  Plus the house rules on authored copy: no EK codes where a student reads
//  them, no em-dashes, ASCII only. The rebuilt Topic 1.1 shipped with 218
//  student-visible codes before anyone noticed, and a counter like this one is
//  the only reason it was caught.
//
//  The transform runs against the LIVE page at build time, so this file cannot
//  test assembly end to end without a network. It tests the authored content
//  and the guards, which is the half that is fixed in the repo.
//
//  Spec: docs/cyber-topic32-gold-rebuild.md
// -----------------------------------------------------------------------------

const T = require('../lib/cyber-u3-topic32-gold');

let failures = 0;
const fail = (m) => { console.log(`FAIL  ${m}`); failures += 1; };
const pass = (m) => console.log(`ok    ${m}`);
const check = (c, m) => (c ? pass(m) : fail(m));
const count = (s, re) => (s.match(re) || []).length;

const SECTIONS = [T.SEC1, T.SEC2, T.SEC3, T.SEC4, T.SEC5, T.SEC6,
  T.SEC7, T.SEC8, T.SEC9, T.SEC10, T.SEC11];
const CHECKS = Object.values(T.CFU);
const AUTHORED = [...SECTIONS, T.CONTINUE, T.HERO, ...CHECKS].join('\n');

// ── 1. the template shape, against what the siblings actually carry ─────────
check(SECTIONS.length === 11, `11 numbered sections authored (got ${SECTIONS.length})`);
SECTIONS.forEach((s, i) => {
  const m = /<span class="section-icon">([^<]*)<\/span>3\.2\.(\d+) /.exec(s);
  if (!m) { fail(`section ${i + 1} has no icon-numbered heading`); return; }
  if (m[1] !== String(i + 1) && !(i === 10 && m[1] === '?')) {
    fail(`section ${i + 1} carries icon "${m[1]}"`);
  }
  if (Number(m[2]) !== i + 1) fail(`section ${i + 1} heading reads 3.2.${m[2]}`);
});
pass('every section heading agrees with its own number and icon');

check(/<span class="section-icon">\?<\/span>3\.2\.11 /.test(T.SEC11),
  'the FAQ section carries the "?" icon, as the siblings do');
check(/<span class="section-icon">\+<\/span>Continue Learning/.test(T.CONTINUE),
  'Continue Learning carries the "+" icon and no section number');

//  Measured across 3.1a, 3.1b, 3.3, 3.4 and 3.5. Every one of these is exact
//  on all five siblings, which is why they are asserted as equalities.
const SIBLING = {
  'case-block': 3, 'ex-block': 2, 'strat-card': 4, 'faq-item': 6,
  'related-link': 8, 'obj-list': 1,
};
for (const [cls, want] of Object.entries(SIBLING)) {
  const got = count(AUTHORED, new RegExp(`class="${cls}"`, 'g'));
  check(got === want, `${cls}: ${got} (every sibling carries ${want})`);
}
const vtf = count(AUTHORED, /<table class="vocab-table-full"/g);
check(vtf >= 3 && vtf <= 6, `vocab-table-full tables: ${vtf} (siblings carry 3 to 6)`);

//  Vantex is the unit's recurring organization: a student meets it in 3.1a and
//  follows it to 3.5. The live 3.2 mentioned it zero times, which is its own
//  kind of not belonging.
check(count(AUTHORED, /Vantex/g) > 0, 'the unit\'s recurring organization appears in the authored copy');

// ── 2. the checks are well formed and answerable ────────────────────────────
check(CHECKS.length === T.TOTAL_CFUS, `${T.TOTAL_CFUS} checks authored (got ${CHECKS.length})`);
const blocks = CHECKS.map((c) => /<div class="cfu-block" id="cfu-(\d+)" data-type="([^"]+)" data-num="(\d+)" data-answer="([^"]*)"/.exec(c));
check(blocks.every(Boolean), 'every check opens with a well formed block tag');
check(blocks.every((m, i) => Number(m[1]) === i + 1), 'checks are numbered 1..10 in order');
check(blocks.every((m) => m[1] === m[3]), 'every check id agrees with its data-num');
check(blocks.every((m) => m[4].length > 0), 'every check carries an answer key');
check(CHECKS.every((c, i) => c.includes(`id="cfu-fb-${i + 1}"`)), 'every check has its feedback element');
check(CHECKS.every((c, i) => c.includes(`>${i + 1} / ${T.TOTAL_CFUS}<`)),
  `every counter reads out of ${T.TOTAL_CFUS}`);

blocks.forEach((m, i) => {
  const blk = CHECKS[i];
  const key = m[4];
  if (m[2] === 'mcq') {
    const opts = [...blk.matchAll(/class="cfu-opt" data-val="([A-E])"/g)].map((x) => x[1]);
    const wrongs = [...blk.matchAll(/class="cfu-fb-wrong" data-a="([A-E])"/g)].map((x) => x[1]);
    check(opts.includes(key), `check ${m[1]}: key ${key} is one of [${opts.join('')}]`);
    check(!wrongs.includes(key), `check ${m[1]}: the correct option has no wrong-answer feedback`);
    const gap = opts.filter((o) => o !== key && !wrongs.includes(o));
    check(gap.length === 0, `check ${m[1]}: every distractor has feedback${gap.length ? ` (missing ${gap.join('')})` : ''}`);
  }
  if (m[2] === 'matching') {
    const rows = count(blk.slice(0, blk.indexOf('cfu-feedback')), /class="cfu-match-row"/g);
    check(rows === key.split(',').length, `check ${m[1]}: ${rows} rows and ${key.split(',').length} answers`);
    const opts = [...blk.matchAll(/<option value="([A-Z])"/g)].map((x) => x[1]);
    const bad = key.split(',').filter((k) => !opts.includes(k));
    check(bad.length === 0, `check ${m[1]}: every answer letter is a selectable option`);
  }
  if (m[2] === 'checkbox') {
    const boxes = [...blk.matchAll(/class="cfu-cb" id="[^"]+" value="([A-E])"/g)].map((x) => x[1]);
    const bad = key.split(',').filter((k) => !boxes.includes(k));
    check(bad.length === 0, `check ${m[1]}: every answer letter names a real choice`);
  }
});

// ── 3. house rules on authored copy ─────────────────────────────────────────
//  Heading separators legitimately carry the template's em-dash, so they are
//  excluded and the PROSE is what is checked.
const PROSE = AUTHORED.replace(/<h2>[\s\S]*?<\/h2>/g, '')
  .replace(/<span class="rl-title">[^<]*<\/span>/g, '')
  .replace(/<div class="case-eyebrow">[^<]*<\/div>/g, '');
check(!PROSE.includes('—'), 'no em-dashes in authored prose');
const nonAscii = [...new Set([...PROSE].filter((c) => c.charCodeAt(0) > 126))];
check(nonAscii.length === 0, `authored prose is ASCII with entities${nonAscii.length ? ` (found ${nonAscii.join('')})` : ''}`);

const codes = AUTHORED.match(/\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?\b/g) || [];
check(codes.length === 0,
  `no EK codes in student-visible copy${codes.length ? ` (found ${[...new Set(codes)].join(' ')})` : ''}`);

//  The claims this topic is easiest to overstate. Both are asserted as text so
//  a later edit cannot quietly soften them into the misconception.
//  "invisible" appears nine times and every one is legitimate: a refutation, or
//  a claim a worked example sets up in order to knock down. What must never
//  appear is an UNQUALIFIED assertion of it, so each occurrence is checked for
//  a refutation in its own window rather than banned outright. The first
//  version of this test banned the word and failed on correct content.
const REFUTES = ['not invisible', 'Wrong', 'overstates', 'harder to find', 'tells the board'];
const unqualified = [...AUTHORED.matchAll(/invisible/gi)].filter((m) => {
  const w = AUTHORED.slice(Math.max(0, m.index - 170), m.index + 170);
  return !REFUTES.some((r) => w.includes(r));
});
check(unqualified.length === 0,
  `every mention of invisibility is refuted or set up to be${unqualified.length ? ` (${unqualified.length} unqualified)` : ''}`);
check(/harder to find/.test(AUTHORED), 'beacons are described as making a network harder to find');
check(/WPA3 is currently the strongest/.test(AUTHORED), 'WPA3 is named as currently the strongest');

// ── 3b. the page widgets every sibling carries ──────────────────────────────
//  3.2 was missing all three, and the score tracker is the one that mattered:
//  the grader was already computing a running score and null-guards the element,
//  so on 3.2 a student answered ten questions and the score displayed nowhere,
//  silently, while every other lesson in the unit showed it. Verified in a real
//  browser against both the live page (score reads "(no tracker)") and the
//  rebuild (reaches "10 / 10"). tools/ap-cyber-ced/cfu_browser_check.js.
for (const [id, why] of [
  ['cfu-score-tracker', 'the running score has somewhere to display'],
  ['cfu-score-num', 'the score number element the grader writes into'],
  ['apcyber-progress-bar', 'the reading progress bar every sibling carries'],
  ['apcyber-back-top', 'the back-to-top button every sibling carries'],
]) {
  check(T.PAGE_WIDGETS.includes(`id="${id}"`), `${id} is present, so ${why}`);
}
check(T.PAGE_WIDGETS.includes(`0 / ${T.TOTAL_CFUS}`),
  `the tracker's initial text agrees with the check count (0 / ${T.TOTAL_CFUS})`);

// ── 4. the coverage table may not name a section that does not exist ────────
check(T.COVERED_IN.length === 8, `coverage table has all 8 essential knowledge rows (got ${T.COVERED_IN.length})`);
for (const cell of T.COVERED_IN) {
  const sec = /3\.2\.(\d+)/.exec(cell);
  check(sec && SECTIONS.some((s) => new RegExp(`>3\\.2\\.${sec[1]} `).test(s)),
    `coverage row points at ${sec ? sec[0] : '(none)'}, which is authored`);
}

// ── 5. the guards fail loudly ───────────────────────────────────────────────
try { T.once('nothing', 'missing', 'x', 'deliberate'); fail('once() accepted a splice matching nothing'); } catch (e) { pass('once() throws when a splice matches nothing'); }
try { T.once('aa', 'a', 'b', 'deliberate'); fail('once() accepted a splice matching twice'); } catch (e) { pass('once() throws when a splice matches more than expected'); }
try { T.retargetCoverage('<td>Section 2 — Network Security Policies</td>'); fail('retargetCoverage accepted a wrong-shaped table'); } catch (e) { pass('retargetCoverage throws when the table is not the shape it expects'); }
try { T.cut('<a>x</a>', '<zzz>', '</zzz>', 'deliberate'); fail('cut() accepted a missing start marker'); } catch (e) { pass('cut() throws when a kept region\'s marker is gone'); }
try { T.cut('<a>x</a>', '<a>', '<zzz>', 'deliberate'); fail('cut() accepted a missing end marker'); } catch (e) { pass('cut() throws when a kept region has no end'); }

console.log(failures ? `\n${failures} assertion(s) failed` : '\nTopic 3.2 matches the Unit 3 template');
process.exit(failures ? 1 : 0);

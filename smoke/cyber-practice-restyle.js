'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE FIVE PRACTICE SPOKES, AND THE THREE THINGS THAT WERE WRONG WITH THEM.
//
//  Section 1 pins what the pages now say and how they are built. Section 2 is
//  the mutation run, and it is the half that decides whether section 1 means
//  anything: each of the eight checks in generate-practice-restyle.js is broken
//  ON PURPOSE and required to go red BY ITSELF. A mutation that turns the suite
//  red for a different reason proves nothing about the rule it was aiming at,
//  which is how two guards in this repo were found hollow on 2026-09-02 and a
//  third on 2026-09-03, so every case here asserts WHICH message came back.
//
//  Read with docs/runs/2026-09-06-claude-code-cyber-practice-spokes.md.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const restyle = require('../tools/ap-cyber-ced/generate-practice-restyle.js');
const gen = require('../tools/ap-cyber-ced/generate-practice-sheet.js');
const { parseCsv } = require('../tools/ap-cyber-ced/sheet-csv');
const spec = require('../lib/cyber-practice-spec');

const FIXTURES = path.join(__dirname, 'fixtures', 'live-bodies');

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

const spokes = spec.spokes();
const built = restyle.generate({ bodies: FIXTURES });
const rows = parseCsv(built.csv).rows;
const bodyOf = (h) => (rows.find((r) => r.Handle === h) || {})['Body HTML'] || '';
const liveOf = (h) => fs.readFileSync(path.join(FIXTURES, `${h}.html`), 'utf8');

console.log('\ncyber practice spokes: what the pages say, and whether the checks can tell\n');

// ── 1. THE SHEET ────────────────────────────────────────────────────────────
console.log('1. the sheet');
ok('five rows, one per spoke', rows.length === 5, rows.length);
ok('every row is a MERGE', rows.every((r) => r.Command === 'MERGE'));
ok('Body HTML only, so Title and the SEO columns are not touched',
  restyle.HEADER.join(',') === 'Handle,Command,Body HTML', restyle.HEADER.join(','));
ok('parse-back is clean', built.drift.length === 0, built.drift.join(' | '));
ok('the generator refuses nothing on the real bodies', built.refusals.length === 0,
  built.refusals.join(' | '));
//  The two live hub pages are the ones with content that landed after the
//  fixtures were taken. A row for either is how this sheet would erase it.
ok('neither live hub page is in the sheet, so neither can be republished from a stale body',
  !rows.some((r) => r.Handle === spec.umbrella().handle
    || r.Handle === spec.umbrella().topics_hub));

// ── 2. WHAT THE PAGE NOW SAYS ABOUT THE UNIT EXAM ───────────────────────────
//  The instrument really is different: docs/cyber-unit1-bundle-vs-online.md and
//  docs/cyber-unit-tests-availability.md compared all five online exams against
//  the paper bundle item by item, zero shared items. That is what earns it a
//  place on a practice page. Saying so is what the old body did not do.
console.log('\n2. the unit exam card');
for (const s of spokes) {
  if (!(s.assets.exam || []).length) continue;
  const b = bodyOf(s.handle);
  ok(`unit ${s.unit_no} no longer calls it "the full unit test"`,
    !/the full unit test/i.test(b));
  ok(`unit ${s.unit_no} says it is not the graded instrument`,
    /not the questions on the test your teacher grades/.test(b));
  ok(`unit ${s.unit_no} warns that it shows the answer`,
    /tells you the answer as soon as you check one/.test(b));
  //  The class on the DIV. Testing for the substring anywhere in the body
  //  passes on the stylesheet alone, which is the hollow form mutation found.
  ok(`unit ${s.unit_no} marks the card apart from the practice cards`,
    b.includes('class="grp grp--exam"'));
}
ok('the live bodies are the ones that carried the false sentence, so this is a real fix',
  spokes.every((s) => /The full unit test/.test(liveOf(s.handle))));

// ── 3. STYLING, OUTLINE AND SCHEMA ──────────────────────────────────────────
console.log('\n3. the page');
for (const s of spokes) {
  const b = bodyOf(s.handle);
  const live = liveOf(s.handle);
  //  The theme sets html{font-size:62.5%}, so a rem here is about 10px. The old
  //  bodies were authored in rem against a 16px assumption.
  ok(`unit ${s.unit_no} uses no rem`, !/[\d.]+rem/.test(b),
    (b.match(/[\d.]+rem/g) || []).slice(0, 3).join(', '));
  ok(`unit ${s.unit_no} live body DID use rem, which is what looked unstyled`,
    /[\d.]+rem/.test(live));
  //  Outline: h1 then h2s, no skipped level. The old body went h1 to h3.
  const levels = [...b.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  ok(`unit ${s.unit_no} outline has one h1 and skips no level`,
    levels.filter((n) => n === 1).length === 1
      && levels.every((n, i) => i === 0 || n - levels[i - 1] <= 1),
    levels.join(','));
  ok(`unit ${s.unit_no} live body skipped h2`, /<h3\b/.test(live) && !/<h2[^>]*>[\s\S]{0,40}<\/h2>[\s\S]*<h3/.test(live));
  //  The theme's own head breadcrumb hardcodes AP Computer Science A as item 2.
  ok(`unit ${s.unit_no} supplies its own BreadcrumbList`, /"@type": "BreadcrumbList"/.test(b));
  ok(`unit ${s.unit_no} breadcrumb names the cyber course guide, not the CSA hub`,
    b.includes(spec.umbrella().course_guide) && !b.includes('ap-csa-exam-prep'));
  ok(`unit ${s.unit_no} carries the course's Georgia and purple, not a second palette`,
    b.includes('font-family:Georgia,serif') && b.includes('#4C1D95'));
}

// ── 4. LABELS ───────────────────────────────────────────────────────────────
console.log('\n4. link labels');
ok('an FRQ page is labelled FRQ, not "frq"',
  gen.labelFor('ap-cyber-unit-1-frq-practice') === 'Unit 1 FRQ practice',
  gen.labelFor('ap-cyber-unit-1-frq-practice'));
ok('and the rest of the label is left in lower case',
  gen.labelFor('ap-cyber-unit-1-scenario-practice') === 'Unit 1 scenario practice',
  gen.labelFor('ap-cyber-unit-1-scenario-practice'));
ok('the live page really did say "frq"', /Unit \d frq practice/.test(liveOf(spokes[0].handle)));

// ─────────────────────────────────────────────────────────────────────────────
//  5. MUTATION. Each case breaks ONE thing and names the message it expects.
//     A case that goes red for a different reason is reported as a MISS, not a
//     pass, because that is the shape of a hollow guard.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5. mutation, one rule at a time');

const S = spokes[0];
const LIVE = liveOf(S.handle);
const GOOD = bodyOf(S.handle);

const MUTANTS = [
  {
    rule: 'link loss',
    expect: /would drop \d+ link/,
    //  A "Keep going" link, not an asset chip. Dropping an asset trips the
    //  coverage rule too, and a mutation that fires two rules cannot tell you
    //  which of them is doing the work.
    body: (b) => b.replace(/<li><a class="alt" href="\/pages\/ap-cybersecurity-unit-1-social-engineering">[\s\S]*?<\/li>/, ''),
  },
  {
    rule: 'declared asset missing',
    expect: /missing \d+ declared asset/,
    //  Rewritten rather than removed, so the link count stays put and only the
    //  coverage rule can be what fires.
    body: (b) => b.replace('/pages/ap-cyber-unit-1-project', '/pages/ap-cyber-unit-1-projekt'),
    also: /would drop/,
  },
  {
    rule: 'exam card not marked apart',
    expect: /does not mark the card apart/,
    //  The modifier comes off the DIV and stays in the stylesheet, which is
    //  exactly the case that proved the first cut of the rule hollow.
    body: (b) => b.replace('class="grp grp--exam"', 'class="grp"'),
  },
  {
    rule: 'exam disclaimer removed',
    expect: /does not tell a student the exam is a different instrument/,
    body: (b) => b.replace('These are not the questions on the test your teacher grades.',
      'The full unit test, once you have done the rest.'),
  },
  {
    rule: 'no BreadcrumbList',
    expect: /carries no BreadcrumbList/,
    body: (b) => b.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, ''),
  },
  {
    rule: 'breadcrumb names the CSA course',
    expect: /names the CSA course in its own breadcrumb/,
    body: (b) => b.replace('ap-cybersecurity-complete-course-guide', 'ap-csa-exam-prep'),
    also: /would drop|missing \d+ declared/,
  },
  {
    rule: 'two h1 elements',
    expect: /has 2 h1 elements/,
    body: (b) => b.replace('<div class="pwrap">', '<div class="pwrap"><h1>Practice</h1>'),
  },
  {
    rule: 'skipped heading level',
    expect: /skips a level/,
    body: (b) => b.replace('<h2>Lesson quizzes</h2>', '<h4>Lesson quizzes</h4>'),
  },
  {
    rule: 'rem sneaks back in',
    expect: /uses rem/,
    body: (b) => b.replace('font-size:18px!important', 'font-size:1.1rem!important'),
  },
  {
    rule: 'em-dash in prose',
    expect: /em-dash|\bdash\b/i,
    //  From its codepoint, for the same reason as the mojibake case below: a
    //  literal em-dash here would be a real em-dash in a tracked file, which
    //  is the defect this rule bans. smoke/cyber-practice-hub.js keeps an
    //  EMDASH constant for the same reason.
    body: (b) => b.replace('Work down the page.',
      `Work down the page ${String.fromCharCode(0x2014)} all of it.`),
  },
  {
    rule: 'a CED Essential Knowledge code shown to a student',
    expect: /1\.1\.A|essential knowledge|EK/i,
    body: (b) => b.replace('One short auto-scored quiz per lesson.',
      'One short auto-scored quiz per lesson (1.1.A.2).'),
  },
  {
    rule: 'a fabricated per-unit exam weighting',
    expect: /%/,
    body: (b) => b.replace('Unit 1 covers CED topics',
      'Unit 1 is 18% of the exam and covers CED topics'),
  },
  {
    rule: 'single-pass mojibake',
    //  SINGLE pass, deliberately. A mutation built from the double-pass form
    //  goes red against a detector blind to the corruption actually seen on
    //  live pages, and that green report is worse than none. U+2022 read as
    //  cp1252 and re-encoded is U+00E2 U+20AC U+00A2.
    expect: /mojibake|means/i,
    //  BUILT FROM CODE POINTS, NEVER PASTED. Writing the corrupted characters
    //  here would put real mojibake in a tracked file and turn smoke:encoding
    //  red on this repository, which is exactly what happened on the first
    //  run of this suite. lib/mojibake.js's own header does the same thing
    //  for the same reason. U+2022 read as cp1252 and re-encoded is
    //  U+00E2 U+20AC U+00A2.
    body: (b) => b.replace('&bull;', String.fromCharCode(0x00E2, 0x20AC, 0x00A2)),
  },
];

let mutantsRed = 0;
for (const m of MUTANTS) {
  const mutated = m.body(GOOD);
  if (mutated === GOOD) {
    ok(`mutation "${m.rule}" changed the body`, false, 'the replacement matched nothing');
    continue;
  }
  const why = restyle.checkRow(S, LIVE, mutated);
  const hit = why.filter((w) => m.expect.test(w));
  //  Collateral: another rule firing too is fine when the mutation genuinely
  //  breaks it (a deleted link IS a lost link), but only where the case says so.
  const collateral = why.filter((w) => !m.expect.test(w)
    && !(m.also && m.also.test(w)));
  if (hit.length && !collateral.length) {
    pass += 1;
    console.log(`  ok    "${m.rule}" is caught, by its own rule (${why.length} finding(s))`);
    mutantsRed += 1;
  } else if (!hit.length && why.length) {
    fails.push(`mutation "${m.rule}" went red for the WRONG rule, so the rule it targets is hollow`);
    console.log(`  MISS  "${m.rule}" went red for: ${why.join(' | ').slice(0, 160)}`);
  } else if (!why.length) {
    fails.push(`mutation "${m.rule}" was NOT caught at all`);
    console.log(`  MISS  "${m.rule}" was not caught at all`);
  } else {
    fails.push(`mutation "${m.rule}" also tripped an unrelated rule: ${collateral.join(' | ')}`);
    console.log(`  MISS  "${m.rule}" collateral: ${collateral.join(' | ').slice(0, 160)}`);
  }
}
ok('every mutation went red', mutantsRed === MUTANTS.length, `${mutantsRed}/${MUTANTS.length}`);
//  The suite that is green either way is the one this whole section exists to
//  prevent, so the unmutated body is asserted clean in the same breath.
ok('and the unmutated body is still clean, so the checks are not simply always red',
  restyle.checkRow(S, LIVE, GOOD).length === 0,
  restyle.checkRow(S, LIVE, GOOD).join(' | '));

console.log(`\n${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  OFFLINE SUITE FOR THE UNIT 1 NAVIGATOR REPAIR.
//
//  Runs against the 28 live bodies captured on 2026-09-08 under
//  smoke/fixtures/live-bodies/cyber-u1-nav/, so it needs no network.
//
//  ── THE MUTATION HALF IS THE POINT ─────────────────────────────────────────
//  CLAUDE.md: a green mutation run is a FAILED check. Two guards in this repo
//  were found hollow on 2026-09-02 and a third on 2026-09-03, so every rule
//  below is broken on purpose and required to go red BY ITS OWN NAME. A
//  mutation that goes red for a different rule proves nothing about the rule
//  under test; it is reported as a failure here, not as a pass.
//
//  Run: npm run smoke:cyberu1nav
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const nav = require('../lib/cyber-u1-nav.js');
const gen = require('../scripts/cyber-u1-nav-repair-csv.js');

const FIX = path.join(__dirname, 'fixtures', 'live-bodies', 'cyber-u1-nav');

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(label);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}
//  A mutation passes only when the failure names the rule it was built to break.
function mutates(label, rule, run) {
  let msgs;
  try { msgs = run(); } catch (e) { msgs = [e.message]; }
  const text = (msgs || []).join(' | ');
  if (!text) { fails.push(label); console.log(`  HOLLOW ${label}: the mutation was accepted, so this rule is not enforced`); return; }
  if (!rule.test(text)) {
    fails.push(label);
    console.log(`  WRONG-RULE ${label}: went red, but for ${JSON.stringify(text.slice(0, 90))}, not ${rule}`);
    return;
  }
  pass += 1;
  console.log(`  ok    ${label} (red by its own rule)`);
}

console.log('\ncyber unit 1 navigator\n');

const bodies = {};
for (const f of fs.readdirSync(FIX)) if (f.endsWith('.html')) bodies[f.replace(/\.html$/, '')] = fs.readFileSync(path.join(FIX, f), 'utf8');
ok('28 fixtures are present', Object.keys(bodies).length === 28, `${Object.keys(bodies).length} found`);

const { table, witnesses, dissent } = gen.buildTable(bodies);
ok('every page is self-consistent, so all 28 get a vote', witnesses.length === 28, `${witnesses.length}`);
ok('the 10 swapped pages are outvoted rather than excluded',
  dissent.some((d) => d.row === 'lesson3' && d.votes === 18 && d.others.join().includes('ai-driven-threats')),
  JSON.stringify(dissent.find((d) => d.row === 'lesson3')));
ok('the table has all 25 activity rows and 5 lesson rows',
  nav.LESSONS.every((n) => nav.LABELS.every((l) => table[`${n}|${l}`])) && nav.LESSONS.every((n) => table[`lesson${n}`]));
ok('the CED taxonomy puts 1.3 on wireless-security',
  table.lesson3 === '/pages/ap-cybersecurity-unit-1-wireless-security', table.lesson3);
ok('the CED taxonomy puts 1.4 on ai-driven-threats',
  table.lesson4 === '/pages/ap-cybersecurity-unit-1-ai-driven-threats', table.lesson4);

//  ---------------------------------------------------------------------------
//  The census this repair was scoped against.
const audited = {};
for (const [h, b] of Object.entries(bodies)) {
  try { audited[h] = nav.audit(nav.parse(b), table); } catch (e) { audited[h] = null; }
}
const broken = Object.entries(audited).filter(([, p]) => p && p.length);
const disabled = Object.values(audited).flat().filter((p) => p && p.kind === 'disabled');
ok('10 pages need repair', broken.length === 10, `${broken.length}`);
ok('18 pages are already correct', Object.entries(audited).filter(([, p]) => p && !p.length).length === 18);
ok('26 steps are disabled', disabled.length === 26, `${disabled.length}`);
ok('the disabled steps sit on exactly 2 pages',
  new Set(broken.filter(([, p]) => p.some((x) => x.kind === 'disabled')).map(([h]) => h)).size === 2);

//  ---------------------------------------------------------------------------
//  The repair itself.
const repaired = {};
for (const [h] of broken) repaired[h] = nav.repair(bodies[h], table).out;

let allClean = true;
let outsideHeld = true;
for (const [h, out] of Object.entries(repaired)) {
  if (nav.verify(bodies[h], out, table).length) allClean = false;
  const rb = nav.extractRail(bodies[h]);
  const ra = nav.extractRail(out);
  if (bodies[h].slice(0, rb.start) !== out.slice(0, ra.start) || bodies[h].slice(rb.end) !== out.slice(ra.end)) outsideHeld = false;
}
ok('every repaired page verifies against a fresh re-parse', allClean);
ok('every byte outside the rail is untouched on all 10 pages', outsideHeld);

const stillWrong = Object.entries(repaired).filter(([, out]) => nav.audit(nav.parse(out), table).length);
ok('no repaired page has any problem left', stillWrong.length === 0, stillWrong.map(([h]) => h).join(','));

const revived = Object.entries(repaired).reduce((a, [, out]) => a + nav.parse(out).groups.flatMap((g) => g.steps).filter((s) => s.disabled).length, 0);
ok('no repaired page has a disabled step', revived === 0, `${revived} left`);

//  Labels and the current marker survive. A rewrite that dropped a step would
//  satisfy every href check above vacuously.
let structureHeld = true;
for (const [h, out] of Object.entries(repaired)) {
  const a = nav.parse(bodies[h]);
  const b = nav.parse(out);
  for (let i = 0; i < a.groups.length; i++) {
    if (a.groups[i].steps.map((s) => s.label).join('|') !== b.groups[i].steps.map((s) => s.label).join('|')) structureHeld = false;
    if (a.groups[i].steps.map((s) => s.current).join('|') !== b.groups[i].steps.map((s) => s.current).join('|')) structureHeld = false;
    if (a.groups[i].title !== b.groups[i].title) structureHeld = false;
  }
}
ok('labels, titles and the current marker are unchanged', structureHeld);

//  The repair must not invent or lose a page.
ok('the repair touches 10 pages and no others', Object.keys(repaired).length === 10);

//  ---------------------------------------------------------------------------
//  MUTATIONS. Each breaks one rule and must go red for that rule.
const sample = 'ap-cyber-unit-1-exam';
const good = repaired[sample];

mutates('a step put back to disabled is caught', /still disabled|problems remain/, () =>
  nav.verify(bodies[sample],
    good.replace('<a href="/pages/ap-cyber-unit-1-lesson-3-lab" class="ucn-step">Lab</a>',
      '<span class="ucn-step" style="opacity:0.4!important;cursor:not-allowed!important;">Lab</span>'), table));

mutates('a step href pointed at the wrong lesson is caught', /problems remain/, () =>
  nav.verify(bodies[sample],
    good.replace('/pages/ap-cyber-unit-1-lesson-4-lab', '/pages/ap-cyber-unit-1-lesson-3-lab'), table));

mutates('a crossed lesson tab is caught', /problems remain/, () =>
  nav.verify(bodies[sample],
    good.replace('<a href="/pages/ap-cybersecurity-unit-1-wireless-security" class="ucn-lesson open" onclick',
      '<a href="/pages/ap-cybersecurity-unit-1-ai-driven-threats" class="ucn-lesson open" onclick'), table));

mutates('a renamed step label is caught', /label changed|steps read/, () =>
  nav.verify(bodies[sample], good.replace('>Quiz</a>', '>Test</a>'), table));

mutates('a byte changed outside the rail is caught', /before the rail|after the rail/, () =>
  nav.verify(bodies[sample], `${good}<!-- x -->`, table));

mutates('a dropped step is caught', /step count changed|steps read|expected/, () =>
  nav.verify(bodies[sample], good.replace(/<a href="[^"]*" class="ucn-step">Ex 2<\/a>/, ''), table));

mutates('a step turned into a bare span is caught', /not links|problems remain/, () =>
  nav.verify(bodies[sample],
    good.replace(/<a href="[^"]*" class="ucn-step">Ex 1<\/a>/, '<span class="ucn-step">Ex 1</span>'), table));

//  The table's own guards, which are what would have caught this defect when
//  it landed rather than months later.
mutates('a live page disagreeing with the CED taxonomy is refused', /disagree/, () => {
  const b2 = { ...bodies };
  //  Restore the RAW TEXT, not a re-serialised object. The first version of
  //  this saved JSON.stringify(parsed) as the original and put that back,
  //  which silently reformatted config/cyber-topics.json from 570 pretty
  //  lines to one, and `npm run cyber:topics --check` refuses a hand-edit.
  //  A mutation test that damages the repo it is testing is worse than none.
  const cfgPath = path.join(__dirname, '..', 'config', 'cyber-topics.json');
  const orig = fs.readFileSync(cfgPath, 'utf8');
  const stub = JSON.parse(orig);
  const t3 = (stub.topics || stub).find((t) => t.topic === '1.3');
  t3.handles[0] = 'ap-cybersecurity-unit-1-ai-driven-threats';
  fs.writeFileSync(cfgPath, JSON.stringify(stub));
  try {
    delete require.cache[require.resolve('../scripts/cyber-u1-nav-repair-csv.js')];
    const g2 = require('../scripts/cyber-u1-nav-repair-csv.js');
    g2.buildTable(b2);
    return [];
  } catch (e) { return [e.message]; } finally {
    fs.writeFileSync(cfgPath, orig);
    delete require.cache[require.resolve('../scripts/cyber-u1-nav-repair-csv.js')];
  }
});

mutates('a near-tie among the live pages is refused rather than guessed', /do not agree clearly enough/, () => {
  //  A lone dissenter should LOSE the vote, not block the sheet. What must
  //  never happen is the table picking a winner out of a coin flip, so this
  //  flips half the witnesses on one row and requires a refusal.
  const b2 = { ...bodies };
  const target = '/pages/ap-cyber-unit-1-lesson-5-lab';
  const carriers = Object.keys(b2).filter((h) => b2[h].includes(`href="${target}" class="ucn-step"`));
  for (const h of carriers.slice(0, Math.ceil(carriers.length / 2))) {
    b2[h] = b2[h].replace(`href="${target}" class="ucn-step"`, 'href="/pages/ap-cyber-unit-1-lesson-4-lab" class="ucn-step"');
  }
  try { gen.buildTable(b2); return []; } catch (e) { return [e.message]; }
});

mutates('a lone dissenting page is outvoted, not obeyed', /still the winner/, () => {
  const b2 = { ...bodies };
  const victim = 'ap-cyber-unit-1-lesson-5-quiz';
  b2[victim] = b2[victim].replace('/pages/ap-cyber-unit-1-lesson-5-lab', '/pages/ap-cyber-unit-1-lesson-4-lab');
  const { table: t2 } = gen.buildTable(b2);
  //  The rule under test is that the majority still wins. Report it as a
  //  failure message so the harness can see the rule name, and as an empty
  //  list (a hollow result) if the single bad page managed to change the table.
  return t2['5|Lab'] === '/pages/ap-cyber-unit-1-lesson-5-lab'
    ? ['the majority is still the winner after one page dissents'] : [];
});

console.log(`\n  ${pass} passed, ${fails.length} failed\n`);
process.exit(fails.length ? 1 : 0);

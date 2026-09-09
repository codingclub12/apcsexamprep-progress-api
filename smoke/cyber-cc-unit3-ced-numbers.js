'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the Command Center's Unit 3 speaks the CED's numbers.
//
//  WHY THIS EXISTS
//  Unit 3 was renumbered onto the CED on 2026-08-28 and the six live lesson
//  pages moved that day. The Command Center did not. It kept the retired site
//  numbering, a row 3.6 the CED does not have, and a note telling teachers the
//  sequence differs from CED order, which had stopped being true. Three of its
//  rows also opened a lesson about something else, because three bodies swapped
//  handles and the rows built every handle as lesson-<row number>.
//
//  WHAT IS PINNED, one rule per block so a mutation reds for its own reason
//   1. The map is derived from lib/cyber-unit3-renumber.js PLAN AND checked
//      against config/cyber-topics.json. Retyping it is how site 3.3 and 3.4
//      became each other's CED topics in the first place.
//   2. The rows come out in CED order, which is also the order the six pages
//      run in, and every row opens the page its id names.
//   3. The badge survives only where the id is not itself the CED number.
//   4. A teacher's saved ticks are remapped once, so 3.3 ticked as Firewalls
//      does not come back ticked against Segmentation.
//   5. Blast radius: no Drive id, no Question of the Day id, no other unit.
//   6. It is a ONE-SHOT and says so. Running it on a renumbered page would
//      rotate it again, so the guarded entry point must refuse its own output.
//
//  Assertions run against rewrite() rather than transform(), whose output is
//  null on any refusal. That collapse is what made three unrelated mutations
//  produce one indistinguishable red in the relink suite.
//
//  Offline and secret-free. Zero PII: page handles, lesson titles and Drive
//  folder ids only.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const M = require('../scripts/cyber-cc-unit3-ced-numbers');
const { PLAN } = require('../lib/cyber-unit3-renumber');
const cyberTopics = require('../lib/cyber-topics');

const FIXTURE = path.join(__dirname, 'fixtures', 'cyber-cc-unit3-ced-rows.html');
const body = fs.readFileSync(FIXTURE, 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
//  Every assertion below reads THIS, the unguarded rewrite, so a mutation that
//  breaks one rule cannot red the others by making the transform refuse.
//
//  rewrite() can still refuse on a STRUCTURAL failure, when it cannot find the
//  block or the six rows at all. Reading .out off that null used to kill the
//  suite with a TypeError, which is the cascade problem again wearing a
//  different hat: a mutation battery cannot tell a crash apart from anything
//  else. Name it and stop.
const rewritten = M.rewrite(body);
if (!rewritten) {
  console.log('  [FAIL] rewrite() refused the fixture outright, so no rule below could be measured');
  console.log('\nFAIL  0 passed, 1 failed');
  process.exit(1);
}
const raw = rewritten.out;
const u3block = (s) => s.slice(s.indexOf('{ n:3, name:"Securing Networks"'), s.indexOf('{ n:4, name:'));
const rowIds = (s) => [...u3block(s).matchAll(/\{ id:"([^"]+)",/g)].map((m) => m[1]);
const dataLinks = (s) => {
  const out = {};
  for (const m of u3block(s).matchAll(/\{ id:"([^"]+)",[\s\S]*?site:\{([^}]*)\}/g)) {
    out[m[1]] = [...new Set([...m[2].matchAll(/ap-cyber-unit-(\d)-lesson-(\d)/g)].map((x) => x[1] + ':' + x[2]))];
  }
  return out;
};
const mapLinks = (s) => {
  const out = {};
  for (const m of s.matchAll(/"(\d\.\d[ab]?)":\{(page:[^}]*)\}/g)) {
    out[m[1]] = [...new Set([...m[2].matchAll(/ap-cyber-unit-(\d)-lesson-(\d)/g)].map((x) => x[1] + ':' + x[2]))];
  }
  return out;
};

console.log('\n-- 1. the map is derived twice and the two sources agree --');
ok('crossCheck finds nothing to complain about', M.crossCheck().length === 0, M.crossCheck());
ok('every ROW comes from a PLAN entry, id for id and handle for handle',
  M.ROWS.every((r) => PLAN.some((p) => p.oldTopic === r.oldId && p.lessonId === r.newId && p.target === r.target)),
  M.ROWS);
ok('and config/cyber-topics.json, which never reads PLAN, files each new id under the same CED topic',
  M.ROWS.every((r) => cyberTopics.topic(r.cedTopic).lesson_ids.includes(r.newId)));
ok('and puts it on the same handle',
  M.ROWS.every((r) => cyberTopics.topic(r.cedTopic).handles.includes(`ap-cyber-unit-3-lesson-${r.target}`)));
ok('six rows over five CED topics, because CED 3.1 is taught over two lessons',
  M.ROWS.length === 6 && new Set(M.ROWS.map((r) => r.cedTopic)).size === 5);

console.log('\n-- 2. the fixture really is broken before the rewrite --');
ok('it carries the retired ids, 3.6 among them',
  String(rowIds(body)) === String(['3.1', '3.2', '3.3', '3.4', '3.5', '3.6']), rowIds(body));
const wrongBefore = M.ROWS.filter((r) => (mapLinks(body)[r.oldId] || []).some((h) => h !== '3:' + r.target));
ok('and three of its rows open the wrong lesson', wrongBefore.length === 3, wrongBefore.map((r) => r.oldId));
ok('and they are the three whose bodies moved, 3.3, 3.5 and 3.6',
  String(wrongBefore.map((r) => r.oldId).sort()) === String(['3.3', '3.5', '3.6']));
ok('the note claims a sequence that differs from the CED order', /flow-optimized/.test(body));

console.log('\n-- 3. after the rewrite: CED numbers, CED order --');
ok('the rows read 3.1a, 3.1b, 3.2, 3.3, 3.4, 3.5 in that order',
  String(rowIds(raw)) === String(['3.1a', '3.1b', '3.2', '3.3', '3.4', '3.5']), rowIds(raw));
ok('no 3.6 survives outside the tick migration, and the CED has no topic 3.6',
  !/3\.6/.test(raw.replace(/var U3_CED_IDS = \{[^}]*\};/, '')));
//  The two link-carrying blocks are checked SEPARATELY, so fixing only one of
//  them is a distinguishable failure rather than a shared red.
const dl = dataLinks(raw);
ok('data array: every row opens the lesson its id names',
  M.ROWS.every((r) => String(dl[r.newId]) === String(['3:' + r.target])), dl);
const ml = mapLinks(raw);
ok('link map: every row opens the lesson its id names',
  M.ROWS.every((r) => String(ml[r.newId]) === String(['3:' + r.target])), ml);
//  The reassembly used to run the last row and the array's closing bracket onto
//  one line. Valid JavaScript, so nothing threw, and it made the transform look
//  like it had a guard it did not mean to have.
const lineShape = (s) => {
  const b = u3block(s);
  return {
    rowsOnOwnLine: (b.match(/\n      \{ id:"/g) || []).length,
    closerOnOwnLine: /\n    \]\}/.test(b),
  };
};
ok('each row still starts its own line, and the array closer still has one',
  lineShape(raw).rowsOnOwnLine === 6 && lineShape(raw).closerOnOwnLine, lineShape(raw));
ok('which is the same line shape the page had before', 
  JSON.stringify(lineShape(raw)) === JSON.stringify(lineShape(body)), 
  { before: lineShape(body), after: lineShape(raw) });

ok('link map keys are in CED order too',
  String(Object.keys(ml).filter((k) => k.startsWith('3.'))) === String(['3.1a', '3.1b', '3.2', '3.3', '3.4', '3.5']),
  Object.keys(ml).filter((k) => k.startsWith('3.')));

console.log('\n-- 4. the prose moved with the numbers --');
ok('the unit note no longer claims a sequence differing from the CED', !/flow-optimized/.test(raw));
ok('and the new note names the 3.1 split, which is the only thing left to explain',
  /3\.1a/.test(M.NOTE) && /3\.1b/.test(M.NOTE));
ok('the retired site-to-CED crosswalk comment is gone', !/site 3\.\d = CED/.test(raw));
ok('no em-dash anywhere in the authored prose, per the repo convention',
  !M.NOTE.includes('—') && !M.STU_COMMENT.includes('—'));

console.log('\n-- 5. the badge earns its place or it goes --');
for (const r of M.ROWS) {
  const row = u3block(raw).match(new RegExp(`\\{ id:"${r.newId.replace('.', '\\.')}",[^\\n]*`))[0];
  const has = /ced:"CED/.test(row);
  if (r.newId === r.cedTopic) ok(`row ${r.newId} drops the badge that would repeat its own id`, !has);
  else ok(`row ${r.newId} keeps the CED ${r.cedTopic} badge, because its id is not the topic number`, has);
}

console.log('\n-- 6. a teacher\'s ticks follow their lessons --');
const mig = raw.match(/var U3_CED_IDS = \{([^}]*)\};/);
ok('the migration is spliced in', !!mig);
const pairs = mig ? [...mig[1].matchAll(/"([^"]+)":"([^"]+)"/g)].map((m) => [m[1], m[2]]) : [];
ok('and it maps all six retired ids to their CED ids',
  String(pairs.map((p) => p.join('=>')).sort()) === String(M.ROWS.map((r) => `${r.oldId}=>${r.newId}`).sort()), pairs);
//  Run the injected code for real. A map applied in place would ping-pong on
//  the 3.3 / 3.4 swap; a fresh object cannot.
const migrate = new Function('saved', `
  var U3_CED_IDS = {${mig[1]}};
  ${raw.match(/function migrateTaughtToCED\(o\)\{[\s\S]*?\n  \}/)[0]}
  return migrateTaughtToCED(saved);
`);
//  The values are DISTINCT on purpose. With every tick set to `true`, an
//  in-place rewrite that ping-pongs 3.3 and 3.4 still leaves one of the two
//  looking correct, and that mutation came back green against the rule it was
//  written to break. A value that names its lesson cannot be satisfied by luck.
const LESSON_OF = { '3.3': 'firewalls', '3.4': 'segmentation', '3.6': 'wireless', '3.5': 'detection', '1.1': 'unit-1' };
const moved = migrate(Object.assign({}, LESSON_OF));
for (const [oldId, lesson] of [['3.3', 'firewalls'], ['3.4', 'segmentation'], ['3.6', 'wireless'], ['3.5', 'detection']]) {
  const r = M.ROWS.find((x) => x.oldId === oldId);
  ok(`a tick on ${lesson} stays on ${lesson}, which is ${r.newId} now`, moved[r.newId] === lesson,
    { got: moved[r.newId], wanted: lesson });
}
//  And again one at a time, so no assertion can be carried by another key's
//  presence in the same object.
for (const [oldId, lesson] of Object.entries(LESSON_OF)) {
  if (oldId === '1.1') continue;
  const r = M.ROWS.find((x) => x.oldId === oldId);
  const solo = migrate({ [oldId]: lesson });
  ok(`${lesson} alone migrates to ${r.newId} and nowhere else`,
    solo[r.newId] === lesson && Object.keys(solo).filter((k) => k !== 'u3ced').length === 1, solo);
}
ok('another unit is untouched', moved['1.1'] === 'unit-1');
ok('and a second load leaves an already-migrated object alone',
  JSON.stringify(migrate(moved)) === JSON.stringify(moved));

console.log('\n-- 7. blast radius --');
const drive = (s) => (s.match(/D\+"[A-Za-z0-9_-]+"/g) || []).sort().join('|');
ok('no Google Drive id changed', drive(body) === drive(raw));
const qotd = (s) => (s.match(/Q\+"[A-Z0-9-]+"/g) || []).sort().join('|');
ok('no Question of the Day id changed', qotd(body) === qotd(raw));
for (const u of [1, 2, 4, 5]) {
  const rx = new RegExp(`ap-cyber-unit-${u}-[a-z0-9-]+`, 'g');
  ok(`unit ${u} is byte-identical`, String(body.match(rx)) === String(raw.match(rx)));
}
const u3set = (s) => (s.match(/ap-cyber-unit-3-[a-z0-9-]+/g) || []).sort().join('|');
ok('Unit 3 links to exactly the same set of pages, only from other rows', u3set(body) === u3set(raw));

console.log('\n-- 8. a one-shot that says so --');
//  LABELLED, because a green mutation run against this proves nothing.
//  Refusing an already-renumbered page is defended THREE times over and no
//  single-line mutation isolates any one of them: disable the explicit
//  precondition and the row-id regex refuses on the new id shape; widen that
//  too and the PLAN lookup finds no row for the retired ids. Every attempt to
//  break one guard came back green because another caught it. So this is
//  insurance against a future widening, not something a passing run
//  establishes. The property it guards is real and it is why the transform is
//  a one-shot: the ids are what moves, so a second pass would read 3.2 (now
//  Wireless) as the retired 3.2 (Network Attacks) and rotate the page again.
const quiet = console.error; console.error = () => {};
const code = process.exitCode;
const first = M.transform(body);
const again = first ? M.transform(first.out) : null;
console.error = quiet; process.exitCode = code;
ok('the guarded transform accepts the retired page', !!first);
ok('and REFUSES its own output, because a second pass would rotate it again', again === null);

console.log(`\n${fail ? 'FAIL' : 'PASS'}  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

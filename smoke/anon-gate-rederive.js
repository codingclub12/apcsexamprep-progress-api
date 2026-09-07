#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REDERIVE: is this item closed for at least one class?
//
//  lib/activity-gate.js answers that by grouping rows per class and walking a
//  narrowness ladder. This file answers the same question a DIFFERENT way, from
//  the same raw rows, and the two must agree on every generated case.
//
//  The second method is set arithmetic rather than a ladder. For one class and
//  one item, the rows that cover the item form at most four scopes, and the
//  answer is whichever of them exists at the smallest radius. So instead of
//  sorting by rank, this builds the four buckets explicitly, picks the first
//  non-empty one in a hardcoded order written out longhand, and reads its open
//  flag. No shared helper, no shared constant, no import from the module under
//  test beyond the function being checked.
//
//  Why bother: the ladder and the aliasing were both wrong once during this
//  change, in ways the per-class suite did not catch until a specific fixture
//  was built. Generated cases find that class of bug without anybody guessing
//  the fixture. This is the rederive kind in the deploy gate, and it is the only
//  independent evidence available for a rule whose live proof needs a teacher to
//  have locked something.
//
//  Run: npm run smoke:anongatererederive
// ─────────────────────────────────────────────────────────────────────────────
const { lockedForAnyClass } = require('../lib/activity-gate');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

//  ── the second implementation ──────────────────────────────────────────────
//  Deliberately longhand. It does not import SCOPES, rowScope or pickGateRow.
function rederiveLocked(rows, lesson, acts) {
  const names = Array.isArray(acts) ? acts : [acts];
  const classes = {};
  for (const r of rows || []) (classes[r.class_id] = classes[r.class_id] || []).push(r);

  for (const id of Object.keys(classes)) {
    //  Four buckets, built by asking what each row literally says.
    const exact = [], lessonWide = [], actWide = [], unitWide = [];
    for (const r of classes[id]) {
      const lessonHit = r.lesson === lesson;
      const lessonAll = r.lesson === '*';
      const actHit = names.indexOf(r.activity_type) !== -1;
      const actAll = r.activity_type === '*';
      if (!lessonHit && !lessonAll) continue;
      if (!actHit && !actAll) continue;
      if (lessonHit && actHit) exact.push(r);
      else if (lessonHit && actAll) lessonWide.push(r);
      else if (lessonAll && actHit) actWide.push(r);
      else unitWide.push(r);
    }
    //  Narrowest non-empty bucket decides, written out rather than sorted.
    //  Within a bucket, a CLOSING row beats an opening one. Same rule the module
    //  states: on a tie the lock wins, so a stale open row on the other alias
    //  cannot quietly undo a teacher's close. Written here as "does this bucket
    //  contain a close" rather than as a comparison, which is a different way of
    //  saying it and the point of a rederive.
    const shut = (b) => b.some((r) => !r.open);
    let chosen = null;
    if (exact.length) chosen = shut(exact);
    else if (lessonWide.length) chosen = shut(lessonWide);
    else if (actWide.length) chosen = shut(actWide);
    else if (unitWide.length) chosen = shut(unitWide);
    else chosen = null;
    if (chosen === true) return true;
  }
  return false;
}

//  ── generated cases ────────────────────────────────────────────────────────
const LESSONS = ['1.1', '1.2'];
const ACTS = ['lab', 'terminal-lab', 'quiz'];
const CLASSES = ['a', 'b'];
const rnd = (() => { let s = 20260907; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();

function randomRow() {
  return {
    class_id: CLASSES[Math.floor(rnd() * CLASSES.length)],
    lesson: rnd() < 0.4 ? '*' : LESSONS[Math.floor(rnd() * LESSONS.length)],
    activity_type: rnd() < 0.4 ? '*' : ACTS[Math.floor(rnd() * ACTS.length)],
    open: rnd() < 0.5 ? 0 : 1,
  };
}

console.log('\n  two implementations, same raw rows, 4000 generated cases');
let disagreements = 0, lockedSeen = 0, openSeen = 0;
for (let i = 0; i < 4000; i++) {
  //  DEDUPED BY PRIMARY KEY, because activity_gates is
  //  PRIMARY KEY (class_id, course, unit, lesson, activity_type) and therefore
  //  cannot hold the same key twice. Without this the generator produced one
  //  class holding the same (lesson, activity_type) both open AND closed, the
  //  two implementations broke that impossible tie differently, and the run went
  //  red on a state no database can reach. A generator that ignores the schema
  //  reports bugs that do not exist, which costs more trust than it buys.
  const rows = [];
  const seen = new Set();
  const n = Math.floor(rnd() * 5);
  for (let j = 0; j < n; j++) {
    const row = randomRow();
    const key = `${row.class_id}|${row.lesson}|${row.activity_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  const lesson = LESSONS[Math.floor(rnd() * LESSONS.length)];
  const acts = rnd() < 0.5 ? ['terminal-lab', 'lab'] : ['quiz'];

  const mine = lockedForAnyClass(rows, lesson, acts).locked;
  const theirs = rederiveLocked(rows, lesson, acts);
  if (mine !== theirs) {
    disagreements++;
    if (disagreements <= 3) {
      console.log('  [FAIL] disagreement', JSON.stringify({ rows, lesson, acts, module: mine, rederived: theirs }));
    }
  }
  if (mine) lockedSeen++; else openSeen++;
}
ok('the two implementations agree on every case', disagreements === 0, { disagreements });

//  A run where every case came out the same way proves nothing about either
//  implementation, so require the generator to have exercised both answers.
ok('the cases exercised BOTH answers, not just one', lockedSeen > 400 && openSeen > 400,
  { lockedSeen, openSeen });

//  ── the properties that motivated the rule ─────────────────────────────────
console.log('  and the four properties the rule exists for');
ok('no rows means nothing is locked', lockedForAnyClass([], '1.2', ['lab']).locked === false);
ok('an OPEN row alone never locks',
  lockedForAnyClass([{ class_id: 'a', lesson: '1.2', activity_type: 'lab', open: 1 }], '1.2', ['lab']).locked === false);
//  The bug the suite caught: a closing unit row plus an opening row on the OTHER
//  alias must resolve open, because narrowest wins across both names.
ok('a closing unit row loses to an opening row on the other alias',
  lockedForAnyClass([
    { class_id: 'a', lesson: '*', activity_type: '*', open: 0 },
    { class_id: 'a', lesson: '1.2', activity_type: 'lab', open: 1 },
  ], '1.2', ['terminal-lab', 'lab']).locked === false);
//  and the same two rows in DIFFERENT classes must still lock, because class a
//  has closed it and nothing class b does can reopen it for class a.
ok('the same two rows split across classes still lock',
  lockedForAnyClass([
    { class_id: 'a', lesson: '*', activity_type: '*', open: 0 },
    { class_id: 'b', lesson: '1.2', activity_type: 'lab', open: 1 },
  ], '1.2', ['terminal-lab', 'lab']).locked === true);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

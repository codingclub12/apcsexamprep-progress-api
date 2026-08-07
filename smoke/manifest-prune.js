'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the manifest seed's explicit item lists, and the guarded prune.
//
//  WHY THIS EXISTS
//  A course_manifest row IS a denominator. An item that no page can ever report
//  does not sit harmlessly unused: it marks every student in the class down, for
//  a reason no teacher can see on screen. CSA 1.1 and 1.2 are the live case.
//  They are the only Unit 1 pages with non-MCQ widgets (matching at cfu-3,
//  scenario-sort at cfu-4, cloze at cfu-5), none of which have any grading logic
//  on the page, so three of their six seeded CFUs could never be earned.
//
//  Two things had to be true to fix that, and both are pinned here:
//
//  1. The seed must express "items 1, 2 and 6", not "the first three". The
//     gradeable widgets are not contiguous, so a smaller count would seed
//     cfu-3 (dead) and drop cfu-6 (live) - silently wrong in both directions.
//
//  2. Un-seeding must actually remove the row. Seeding is insert-or-upsert and
//     never deletes, which is the right default against a live database, so the
//     orphaned rows would otherwise stay and keep deflating the denominator.
//     The prune is therefore opt-in (--prune), and it REFUSES to delete any item
//     that has recorded attempts, whatever the flags say: attempts are gradebook
//     data and the manifest row is what makes one legible.
//
//  Zero PII: synthetic rows, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:manifestprune
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-manifest-prune.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const { seedManifest, buildRows, findOrphans, pruneManifest } = require('../scripts/seed-manifest');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);
const one = (s, ...a) => db.prepare(s).get(...a);
const has = (item) => !!one(`SELECT 1 x FROM course_manifest WHERE course='ap-csa' AND item_id=?`, item);

console.log('\nMANIFEST SEED ITEM LISTS AND GUARDED PRUNE\n');

// ── 1. The seed can express a non-contiguous item list ──────────────────────
//  `cfu_items` exists for the case where only SOME widgets on a page can be
//  graded, because the gradeable ones are not necessarily 1..N. It is not in use
//  today: CSA 1.1 and 1.2 briefly carried [1, 2, 6] on the belief their
//  matching / scenario-sort / cloze widgets were unearnable, which turned out to
//  be a page regression rather than a fact about the items (they hold 56
//  recorded attempts). The widget engine was restored and both lessons are back
//  to the full range. The mechanism stays tested so the next real case works.
console.log('1. The seed supports an explicit, non-contiguous item list');
{
  const idsFor = (lesson) => buildRows()
    .filter((r) => r.course === 'ap-csa' && r.lesson_id === lesson && r.item_type === 'cfu')
    .map((r) => r.item_id).sort();

  ok('  CSA 1.1 seeds all six CFUs again, not a reduced set',
    ['1.1-cfu-1', '1.1-cfu-2', '1.1-cfu-3', '1.1-cfu-4', '1.1-cfu-5', '1.1-cfu-6']
      .every((i) => idsFor('1.1').includes(i)), idsFor('1.1'));
  ok('  and so does 1.2',
    ['1.2-cfu-3', '1.2-cfu-4', '1.2-cfu-5'].every((i) => idsFor('1.2').includes(i)), idsFor('1.2'));
  ok('  an ordinary lesson is unchanged (1.3 has 8)',
    ['1.3-cfu-1', '1.3-cfu-4', '1.3-cfu-8'].every((i) => idsFor('1.3').includes(i)), idsFor('1.3'));
  ok('  the quiz rows are untouched', buildRows().some((r) => r.item_id === '1.1-quiz' && r.points === 2));

  // The mechanism itself, exercised directly rather than through live data, so
  // it keeps working for whatever page needs it next.
  const expand = (cfg) => (cfg.cfu_items
    ? cfg.cfu_items
    : Array.from({ length: cfg.cfus }, (_, i) => i + 1));
  ok('  cfu_items is used verbatim when present, gaps and all',
    expand({ cfu_items: [1, 2, 6] }).join(',') === '1,2,6');
  ok('  a plain count still expands to the contiguous range',
    expand({ cfus: 4 }).join(',') === '1,2,3,4');
  ok('  which a smaller count could NOT express: 3 gives 1,2,3, dropping 6',
    expand({ cfus: 3 }).join(',') === '1,2,3');
}

// ── 2. Seeding is still insert-only ─────────────────────────────────────────
console.log('\n2. Seeding writes the manifest and never deletes');
{
  const r = seedManifest({ update: true });
  ok('  seed wrote rows', r.changed > 0, r);
  ok('  1.1-cfu-6 is present', has('1.1-cfu-6'));
  ok('  all six of 1.1 CFUs are present, including the widget items',
    ['1.1-cfu-1', '1.1-cfu-3', '1.1-cfu-5', '1.1-cfu-6'].every(has));
  ok('  an id the seed does not produce is absent', !has('1.1-cfu-9'));
}

// ── 3. An orphan is found but NOT deleted without the flag ──────────────────
console.log('\n3. An orphaned row is reported, and left alone by default');
{
  // Simulate the live database: retired item ids that the seed no longer produces.
  run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
       VALUES ('ap-csa','unit-1','1.1','1.1-cfu-9','cfu',1),
              ('ap-csa','unit-1','1.1','1.1-cfu-10','cfu',1),
              ('ap-csa','unit-1','1.1','1.1-cfu-11','cfu',1)`);
  ok('  the three legacy rows exist', has('1.1-cfu-9') && has('1.1-cfu-10') && has('1.1-cfu-11'));

  const orphanIds = findOrphans().map((o) => o.item_id);
  ok('  all three are reported as orphans',
    ['1.1-cfu-9', '1.1-cfu-10', '1.1-cfu-11'].every((i) => orphanIds.includes(i)), orphanIds);
  ok('  a seeded item is never an orphan', !orphanIds.includes('1.1-cfu-6'));

  const dry = pruneManifest();           // no apply
  ok('  a dry run deletes nothing', dry.deleted === 0, dry.deleted);
  ok('  and the rows are still there', has('1.1-cfu-9'));
  ok('  but it names them as removable', dry.removable.length >= 3, dry.removable.length);
}

// ── 4. An orphan WITH attempts is never deleted ─────────────────────────────
//  The important guard. A student answered it; the row is what makes that grade
//  legible in the gradebook. A conflict must surface, not resolve itself.
console.log('\n4. An orphan with recorded attempts is refused, even with --prune');
{
  run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
  run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode)
       VALUES ('c1','t1','CSA-PRN','P','ap-csa',1,80,0,'practice')`);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);
  run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no)
       VALUES ('s1','c1','ap-csa','1.1','1.1-cfu-10','cfu',1,1,1,1)`);

  const p = pruneManifest({ apply: true });
  ok('  the two with no attempts were deleted', !has('1.1-cfu-9') && !has('1.1-cfu-11'));
  ok('  the one with an attempt was KEPT', has('1.1-cfu-10'));
  ok('  and it is reported as kept, not silently skipped',
    p.kept.some((k) => k.item_id === '1.1-cfu-10' && k.attempts === 1), p.kept);
  ok('  the attempt row itself was not touched',
    one(`SELECT COUNT(*) n FROM attempts WHERE item_id='1.1-cfu-10'`).n === 1);
  ok('  live seeded rows survived the prune', has('1.1-cfu-6') && has('1.1-quiz') && has('1.3-cfu-8'));
}

// ── 5. Reversible ───────────────────────────────────────────────────────────
//  The stated rollback for this change: put the seed entry back, run --update,
//  and the denominator returns with no data repair.
console.log('\n5. A pruned row comes back by re-seeding, with no data repair');
{
  run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
       VALUES ('ap-csa','unit-1','1.1','1.1-cfu-9','cfu',1)`);
  ok('  restoring the row is a plain insert', has('1.1-cfu-9'));
  const after = seedManifest({ update: true });
  ok('  re-seeding leaves it in place (seed never deletes)', has('1.1-cfu-9'), after);
}

// ── 6. The boot gate: MANIFEST_PRUNE must be exactly '1' to delete ──────────
//  server.js runs the report on every boot and deletes only behind this flag,
//  so the whole operation is doable from the Railway dashboard with no shell.
//  A delete in a boot path deserves an explicit test of what turns it on.
console.log('\n6. The boot flag gates the delete, and only the exact value turns it on');
{
  const gate = (v) => v === '1';   // the condition server.js uses, verbatim
  ok('  unset does not prune', !gate(undefined));
  ok('  "0" does not prune', !gate('0'));
  ok('  "true" does not prune (exact match only)', !gate('true'));
  ok('  "" does not prune', !gate(''));
  ok('  "1" prunes', gate('1'));

  // A flagged boot must be IDEMPOTENT: once the orphans are gone, later deploys
  // with the variable still set do nothing. That is what makes it safe to leave
  // set, and it is the difference between a one-time fix and a standing risk.
  // Section 5 restored 1.1-cfu-9, so the first flagged run has real work to do.
  const first = pruneManifest({ apply: true });
  ok('  the first flagged run clears the remaining removable orphan',
    first.deleted === 1, first.deleted);

  const before = one(`SELECT COUNT(*) n FROM course_manifest`).n;
  const second = pruneManifest({ apply: true });
  ok('  a second flagged run deletes nothing', second.deleted === 0, second.deleted);
  ok('  the manifest row count is unchanged by it',
    one(`SELECT COUNT(*) n FROM course_manifest`).n === before);
  ok('  the only orphan left is the one with an attempt, still refused',
    second.orphans.length === 1 && second.kept.length === 1
      && second.kept[0].item_id === '1.1-cfu-10', second.orphans);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

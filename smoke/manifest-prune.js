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

// ── 1. The seed expresses a non-contiguous item list ────────────────────────
console.log('1. CSA 1.1 and 1.2 seed only the gradeable widgets');
{
  const idsFor = (lesson) => buildRows()
    .filter((r) => r.course === 'ap-csa' && r.lesson_id === lesson && r.item_type === 'cfu')
    .map((r) => r.item_id).sort();

  ok('  1.1 seeds cfu-1, cfu-2, cfu-6 (not 1 through 3)',
    JSON.stringify(idsFor('1.1')) === JSON.stringify(['1.1-cfu-1', '1.1-cfu-2', '1.1-cfu-6', '1.1-code-1'].sort()),
    idsFor('1.1'));
  ok('  1.2 likewise', idsFor('1.2').includes('1.2-cfu-6') && !idsFor('1.2').includes('1.2-cfu-3'), idsFor('1.2'));
  ok('  the dead widgets are absent: no cfu-3, cfu-4 or cfu-5 on 1.1',
    !['1.1-cfu-3', '1.1-cfu-4', '1.1-cfu-5'].some((i) => idsFor('1.1').includes(i)));
  ok('  an ordinary lesson still seeds the full contiguous range (1.3 has 8)',
    ['1.3-cfu-1', '1.3-cfu-4', '1.3-cfu-8'].every((i) => idsFor('1.3').includes(i)), idsFor('1.3'));
  ok('  the quiz row is untouched on both', buildRows().some((r) => r.item_id === '1.1-quiz' && r.points === 2));
}

// ── 2. Seeding is still insert-only ─────────────────────────────────────────
console.log('\n2. Seeding writes the manifest and never deletes');
{
  const r = seedManifest({ update: true });
  ok('  seed wrote rows', r.changed > 0, r);
  ok('  1.1-cfu-6 is present', has('1.1-cfu-6'));
  ok('  1.1-cfu-3 was never seeded', !has('1.1-cfu-3'));
}

// ── 3. An orphan is found but NOT deleted without the flag ──────────────────
console.log('\n3. An orphaned row is reported, and left alone by default');
{
  // Simulate the live database: the pre-change seed had put cfu-3/4/5 in.
  run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
       VALUES ('ap-csa','unit-1','1.1','1.1-cfu-3','cfu',1),
              ('ap-csa','unit-1','1.1','1.1-cfu-4','cfu',1),
              ('ap-csa','unit-1','1.1','1.1-cfu-5','cfu',1)`);
  ok('  the three legacy rows exist', has('1.1-cfu-3') && has('1.1-cfu-4') && has('1.1-cfu-5'));

  const orphanIds = findOrphans().map((o) => o.item_id);
  ok('  all three are reported as orphans',
    ['1.1-cfu-3', '1.1-cfu-4', '1.1-cfu-5'].every((i) => orphanIds.includes(i)), orphanIds);
  ok('  a seeded item is never an orphan', !orphanIds.includes('1.1-cfu-6'));

  const dry = pruneManifest();           // no apply
  ok('  a dry run deletes nothing', dry.deleted === 0, dry.deleted);
  ok('  and the rows are still there', has('1.1-cfu-3'));
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
       VALUES ('s1','c1','ap-csa','1.1','1.1-cfu-4','cfu',1,1,1,1)`);

  const p = pruneManifest({ apply: true });
  ok('  cfu-3 and cfu-5 were deleted (no attempts)', !has('1.1-cfu-3') && !has('1.1-cfu-5'));
  ok('  cfu-4 was KEPT because a student answered it', has('1.1-cfu-4'));
  ok('  and it is reported as kept, not silently skipped',
    p.kept.some((k) => k.item_id === '1.1-cfu-4' && k.attempts === 1), p.kept);
  ok('  the attempt row itself was not touched',
    one(`SELECT COUNT(*) n FROM attempts WHERE item_id='1.1-cfu-4'`).n === 1);
  ok('  live seeded rows survived the prune', has('1.1-cfu-6') && has('1.1-quiz') && has('1.3-cfu-8'));
}

// ── 5. Reversible ───────────────────────────────────────────────────────────
//  The stated rollback for this change: put the seed entry back, run --update,
//  and the denominator returns with no data repair.
console.log('\n5. A pruned row comes back by re-seeding, with no data repair');
{
  run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
       VALUES ('ap-csa','unit-1','1.1','1.1-cfu-3','cfu',1)`);
  ok('  restoring the row is a plain insert', has('1.1-cfu-3'));
  const after = seedManifest({ update: true });
  ok('  re-seeding leaves it in place (seed never deletes)', has('1.1-cfu-3'), after);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

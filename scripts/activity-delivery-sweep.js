'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHICH ACTIVITIES CAN A TEACHER'S LOCK ACTUALLY WITHHOLD?
//
//  Board 248 asks this in the abstract: most graded columns keep their questions
//  in the Shopify page body, so a padlock over them is decoration, because the
//  browser has the content before any server code runs. This answers it with a
//  count instead of an estimate, for one course at a time.
//
//  WHY IT IS A SCRIPT AND NOT A NUMBER IN A RUN NOTE
//  The number moves every time a page is migrated, and a stale one is worse than
//  none: it was a guess of "about five pages" from a grep over backup/ that sent
//  a session into scoping the wrong job. The real answer for cyber was 91.
//
//  TWO TRAPS IT AVOIDS, BOTH PAID FOR
//  1. A missing page answers 200 with the storefront shell, tens of thousands of
//     bytes of it, so a byte count is not an existence test. A page counts only
//     if it carries an activity wrapper.
//  2. A lab page and a terminal-lab page use different handle suffixes for the
//     same gradebook column, so each activity is tried under every suffix it is
//     known to use before being called missing.
//
//  Read only, no credential, fetched through lib/storefront-fetch.js like every
//  other live check here.
//
//  Run: node scripts/activity-delivery-sweep.js [course] [--json <out>]
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const sf = require('../lib/storefront-fetch');
const { COURSES } = require('../utils');

const txt = (x) => (typeof x === 'string' ? x : (x && (x.body || x.html)) || '');

//  The suffixes a given activity's page is known to use, in the order to try.
const SUFFIX = {
  'exercise-1': ['exercise-1'],
  'exercise-2': ['exercise-2'],
  quiz: ['quiz'],
  lab: ['lab', 'terminal-lab'],
};

//  A real activity page carries one of these. A soft 404 carries none of them.
const REAL = /class="lab-section"|mcq-item|apcs-analysis|check-btn|id="cyber-[a-z0-9-]+"/;

//  How the server delivers it, if it does. Each marker is the one thing that
//  only the mounted form emits.
function deliveredBy(body) {
  if (body.includes('analysis-player.js')) return 'analysis';
  if (body.includes('lab-player.js')) return 'lab';
  if (body.includes('apcs-quiz-mount.js') || body.includes('server-scored: GET /api/quiz')) return 'quiz';
  return null;
}

function handlesFor(course, unit, lesson, act) {
  const n = unit.split('-')[1];
  const m = String(lesson).split('.')[1];
  if (course !== 'ap-cybersecurity') return [];
  return (SUFFIX[act] || [act]).map((s) => `ap-cyber-unit-${n}-lesson-${m}-${s}`);
}

async function sweep(course) {
  const cfg = COURSES[course];
  if (!cfg) throw new Error(`unknown course ${course}`);
  const jobs = [];
  for (const [unit, v] of Object.entries(cfg.units || {})) {
    for (const lesson of (v.lessons || [])) {
      for (const act of (v.activities || [])) {
        if (act === 'lesson') continue;          // a lesson page is reading, not an activity
        const tries = handlesFor(course, unit, lesson, act);
        if (tries.length) jobs.push({ unit, lesson, act, tries });
      }
    }
  }

  const out = [];
  let i = 0;
  const worker = async () => {
    while (i < jobs.length) {
      const j = jobs[i++];
      let hit = null;
      for (const h of j.tries) {
        let body = '';
        try { body = txt(await sf.page('/pages/' + h)); } catch (e) { continue; }
        if (!REAL.test(body)) continue;
        hit = { handle: h, body };
        break;
      }
      if (!hit) { out.push({ unit: j.unit, lesson: j.lesson, act: j.act, exists: false }); continue; }
      const b = hit.body;
      out.push({
        unit: j.unit, lesson: j.lesson, act: j.act, handle: hit.handle, exists: true,
        bytes: b.length,
        served_by: deliveredBy(b),
        textareas: (b.match(/<textarea/g) || []).length,
        selects: (b.match(/<select/g) || []).length,
        radios: (b.match(/type="radio"/g) || []).length,
      });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return out;
}

function report(rows) {
  const live = rows.filter((r) => r.exists);
  const served = live.filter((r) => r.served_by);
  const body = live.filter((r) => !r.served_by);
  console.log(`\n  ${live.length} real activity pages of ${rows.length} slots\n`);
  console.log(`  the server delivers    ${String(served.length).padStart(3)}   a lock here is real`);
  console.log(`  the page body carries  ${String(body.length).padStart(3)}   a lock here is decoration`);
  const byAct = {};
  for (const r of body) byAct[r.act] = (byAct[r.act] || 0) + 1;
  console.log('\n  still in the page body, by activity:');
  for (const [k, v] of Object.entries(byAct).sort()) console.log(`    ${k.padEnd(12)} ${String(v).padStart(3)}`);
  //  WHAT A LOCK IS FOR, split by activity type rather than by sniffing the page.
  //
  //  A quiz is an assessment: the key should be hidden and a lock should stop a
  //  student getting in. An exercise is a self-check whose model answers are
  //  meant to be reachable, so a lock there is about pacing and its readable key
  //  is the design rather than a leak. That distinction decides what to migrate
  //  first, so it is worth printing.
  //
  //  An earlier version guessed it from the page text, matching /reveal|model
  //  answer|show answer/, and reported 89 of 89 INCLUDING the quizzes. It was
  //  reading theme chrome, not the activity. A number that plausible and that
  //  wrong is worse than no number, so the guess is gone and the activity type,
  //  which is a fact, decides.
  const assessments = body.filter((r) => r.act === 'quiz' || r.act === 'exam');
  console.log(`\n  of those, ${assessments.length} are assessments (quiz or exam), where a lock`);
  console.log(`  protects an instrument, and ${body.length - assessments.length} are self-check exercises,`);
  console.log('  where a lock is about pacing.');
  if (served.length) {
    console.log('\n  already served:');
    for (const r of served) console.log(`    ${r.lesson.padEnd(5)} ${r.act.padEnd(11)} ${r.served_by}`);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const course = args.find((a) => !a.startsWith('--')) || 'ap-cybersecurity';
  const ji = args.indexOf('--json');
  sweep(course).then((rows) => {
    if (ji !== -1 && args[ji + 1]) {
      fs.writeFileSync(args[ji + 1], JSON.stringify(rows, null, 1));
      console.log(`  wrote ${args[ji + 1]}`);
    }
    report(rows);
  }).catch((e) => { console.error('sweep failed: ' + e.message); process.exit(1); });
}

module.exports = { sweep, deliveredBy };

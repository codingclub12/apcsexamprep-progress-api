'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A SECOND WAY TO THE SAME CROSSWALK, FROM A DIFFERENT SOURCE.
//
//  lib/cyber-cc-quiz-keys.js answers "which bank is this row's key" by reading
//  the QUESTIONS: it matches the bank's stems against the page as served. That
//  is a good method and it is one method, and the defect it exists to prevent
//  is exactly the kind that a single method reports confidently.
//
//  So this derives the same table from somewhere else entirely:
//  lib/cyber-quiz-lesson.js, which takes the answer from the CED text extracts
//  through config/cyber-topics.json and cross-checks it against the topic
//  number the page prints in its own h1. It never looks at a question.
//
//  Two derivations, no shared input beyond the handle:
//
//      content   bank stems  ==  page body
//      taxonomy  CED extract ==  page h1
//
//  Where both can answer they must agree. A disagreement is a REFUSAL, not a
//  tie to be broken, because it means one of them has moved and either answer
//  would file a key against the wrong quiz.
//
//  The taxonomy method cannot answer everywhere, and that is expected rather
//  than a failure: Unit 1 and most of Unit 2 use handles the taxonomy does not
//  know, on pages whose h1 prints no topic number, so it has one source and
//  refuses. One source is how the Unit 3 mis-filing happened in the first
//  place. Those rows are reported as unconfirmed, and the content method stands
//  alone on them.
//
//  Run: node scripts/rederive-cc-quiz-keys.js <command-center.html>
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const cw = require('../lib/cyber-cc-quiz-keys');
const { lessonForQuizHandle } = require('../lib/cyber-quiz-lesson');
const sf = require('../lib/storefront-fetch');

function banks() {
  return [
    ...require('../seed/cyber-unit-1-web-quizzes.js'),
    ...require('../seed/cyber-units-2-5-web-quizzes.js'),
  ];
}

function main(argv) {
  const ccPath = argv[0];
  if (!ccPath) {
    console.error('usage: node scripts/rederive-cc-quiz-keys.js <command-center.html>');
    process.exit(2);
  }
  const cc = fs.readFileSync(ccPath, 'utf8');
  const stu = cw.parseSTU(cc);

  const bodies = {};
  for (const p of Object.values(stu)) {
    if (!p) continue;
    bodies[p.replace(/^\/pages\//, '')] = sf.page(p).body;
  }

  const content = cw.crosswalk(cc, bodies, banks());

  console.log('\nCROSSWALK, DERIVED TWICE\n');
  console.log('  row   content         taxonomy       verdict');
  console.log('  ----  -------------  -------------  ---------------------------');

  let agree = 0, unconfirmed = 0, conflicts = [];
  for (const r of content) {
    const cLoc = r.location ? `${r.location.unit}/${r.location.lesson}` : '-';

    let tLoc = '-', tErr = null;
    try {
      const t = lessonForQuizHandle(r.handle, bodies[r.handle] || '');
      tLoc = `${t.unit}/${t.lesson}`;
    } catch (e) { tErr = e.message; }

    let verdict;
    if (tErr) { verdict = 'taxonomy cannot answer'; unconfirmed++; }
    else if (!r.location) {
      // The taxonomy names a location the content method refused. That is not a
      // conflict: it means the bank exists but is not this page's quiz, which is
      // precisely the 1.3/1.4/1.5 case and precisely what content is for.
      verdict = 'content declined, no key published';
    } else if (cLoc === tLoc) { verdict = 'AGREE'; agree++; }
    else { verdict = 'CONFLICT'; conflicts.push({ row: r.lessonId, content: cLoc, taxonomy: tLoc }); }

    console.log(`  ${r.lessonId.padEnd(4)}  ${cLoc.padEnd(13)}  ${tLoc.padEnd(13)}  ${verdict}`);
  }

  console.log(`\n  ${agree} rows confirmed by both methods`);
  console.log(`  ${unconfirmed} rows where the taxonomy has only one source and refuses to guess`);
  console.log(`  ${conflicts.length} conflicts`);

  if (conflicts.length) {
    console.error('\nREFUSED: the two derivations disagree, so one of them has moved:');
    for (const c of conflicts) console.error(`  row ${c.row}: content says ${c.content}, taxonomy says ${c.taxonomy}`);
    process.exit(1);
  }
  if (!agree) {
    console.error('\nREFUSED: nothing was confirmed twice, so this proved nothing.');
    process.exit(1);
  }
  console.log('\n  no disagreement\n');
}

if (require.main === module) main(process.argv.slice(2));

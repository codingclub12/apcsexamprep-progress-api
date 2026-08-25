'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: the enumeration inside scripts/cyber-slides-conversion.gs
//
//  That file is an Apps Script and runs in Tanner's Google account, so it
//  cannot be exercised the way the rest of this repo is. Its riskiest part is
//  also its most testable: the folder and filename matching that decides WHICH
//  decks get converted. The brief for this port named two traps by hand,
//  because both produce zero matches in silence rather than an error:
//
//    - Cyber decks are Day1_Deck_STUDENT.pptx. AP CSP's are ..._Student_...
//      The CSP regexes are exact-match and find nothing here.
//    - Cyber folders are Lesson_1.5_..., CSP's are Topic_1.5_...
//
//  A third matters just as much and is this port's own decision: Units 3, 4
//  and 5 must be skipped, because each of their lessons holds one whole-lesson
//  deck rather than a per-day set (see config/cyber-slide-manifest.js).
//
//  So the .gs is loaded as text and evaluated against a stubbed Drive tree
//  shaped like the real one, down to the sibling folders and the
//  Teacher_Guide.docx that sit beside the decks. eval is the mechanism because
//  a .gs has no module system and no Node runtime; the alternative is not
//  testing the matching at all.
//
//  Run: npm run smoke:cyberconv
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const GS = path.join(__dirname, '..', 'scripts', 'cyber-slides-conversion.gs');
const src = fs.readFileSync(GS, 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 240) : '')); }
};

// The real tree, as enumerated from Drive on 2026-08-25.
const REAL = {
  1: { '1.1': 2, '1.2': 4, '1.3': 4, '1.4': 2, '1.5': 2 },
  2: { '2.1': 8, '2.2': 5, '2.3': 4, '2.4': 4 },
  3: { '3.1': 1, '3.2': 1, '3.3': 1, '3.4': 1, '3.5': 1 },
  4: { '4.1': 1, '4.2': 1, '4.3': 1, '4.4': 1 },
  5: { '5.1': 1, '5.2': 1, '5.3': 1, '5.4': 1, '5.5': 1, '5.6': 1 },
};
const UNIT_NAMES = {
  1: 'Introduction_to_Security', 2: 'Securing_Spaces', 3: 'Securing_Networks',
  4: 'Securing_Devices', 5: 'Securing_Applications_and_Data',
};

const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
const mkFile = (name) => ({ getName: () => name, getId: () => 'id-' + name });

function mkLesson(lesson, days) {
  const files = [];
  for (let d = 1; d <= days; d++) {
    for (const v of ['STUDENT', 'TEACHER']) files.push(mkFile(`Day${d}_Deck_${v}.pptx`));
  }
  const slideDecks = { getName: () => 'Slide_Decks', getFiles: () => iter(files), getFolders: () => iter([]) };
  // The real lesson folders carry these siblings too. They must be ignored
  // without being reported as problems.
  const siblings = ['Quiz', 'Guided_Notes', 'Supplements'].map((n) => ({
    getName: () => n, getFiles: () => iter([]), getFolders: () => iter([]),
  }));
  return {
    getName: () => `Lesson_${lesson}_Something_Named`,
    getFolders: () => iter([slideDecks].concat(siblings)),
    getFoldersByName: (n) => iter(n === 'Slide_Decks' ? [slideDecks] : []),
    getFiles: () => iter([mkFile('Teacher_Guide.docx')]),
  };
}
const mkUnit = (u) => ({
  getName: () => `Unit_${u}_${UNIT_NAMES[u]}`,
  getFolders: () => iter(Object.entries(REAL[u]).map(([l, d]) => mkLesson(l, d))),
  getFoldersByName: () => iter([]),
});

const root = {
  getFolders: () => iter([1, 2, 3, 4, 5].map(mkUnit).concat([
    // Sits beside the units in the real folder and must be ignored.
    { getName: () => 'Course_Resources', getFolders: () => iter([]), getFoldersByName: () => iter([]) },
  ])),
  getFoldersByName: () => iter([]),
};

global.DriveApp = { getFolderById: () => root };
global.Logger = { log: () => {} };
global.MimeType = { GOOGLE_SLIDES: 'application/vnd.google-apps.presentation' };

// eslint-disable-next-line no-eval
eval(src + '\n;global.__enumerate = enumerateDecks_; global.__preview = preview; global.__embed = embedUrl_;');

console.log('\nCYBER SLIDES CONVERSION: ENUMERATION\n');

const r = global.__enumerate();
const lessons = [...new Set(r.decks.map((d) => d.lesson))];

console.log('1. Scope matches the manifest exactly');
ok('  finds exactly 70 decks', r.decks.length === 70, r.decks.length);
ok('  across exactly 9 lessons', lessons.length === 9, lessons);
ok('  skips Units 3, 4 and 5 entirely',
   r.decks.every((d) => ['1', '2'].includes(d.lesson.split('-')[0])),
   r.decks.filter((d) => !['1', '2'].includes(d.lesson.split('-')[0])).slice(0, 3));
ok('  2-1 contributes all 8 days', r.decks.filter((d) => d.lesson === '2-1').length === 16,
   r.decks.filter((d) => d.lesson === '2-1').length);
ok('  every lesson has an even deck count, so no variant is unpaired',
   Object.values(r.decks.reduce((a, d) => { a[d.lesson] = (a[d.lesson] || 0) + 1; return a; }, {}))
     .every((n) => n % 2 === 0));

console.log('2. The two naming traps the brief called out');
ok('  matches UPPERCASE STUDENT and TEACHER',
   JSON.stringify([...new Set(r.decks.map((d) => d.variant))].sort()) === '["STUDENT","TEACHER"]',
   [...new Set(r.decks.map((d) => d.variant))]);
ok('  a CSP-cased Student file would NOT match this regex',
   'Day1_Deck_Student.pptx'.match(/^Day(\d+)_Deck_(STUDENT|TEACHER)\.pptx$/) === null);
ok('  reads Lesson_ folders and normalises 1.2 to 1-2', lessons.includes('1-2'), lessons);
ok('  never emits a dotted lesson id', r.decks.every((d) => !d.lesson.includes('.')), r.decks.slice(0, 2));

console.log('3. Everything that is not a deck is ignored quietly');
ok('  Teacher_Guide.docx, Quiz/, Guided_Notes/, Course_Resources/ raise no problems',
   r.problems.length === 0, r.problems.slice(0, 5));

console.log('4. Output shape');
ok('  sorted by lesson, then day, then variant',
   JSON.stringify(r.decks.slice(0, 3).map((d) => `${d.lesson}/${d.day}/${d.variant}`))
     === JSON.stringify(['1-1/1/STUDENT', '1-1/1/TEACHER', '1-1/2/STUDENT']),
   r.decks.slice(0, 3).map((d) => `${d.lesson}/${d.day}/${d.variant}`));
ok('  embed url is the /embed view, never /edit',
   global.__embed('X').includes('/embed') && !global.__embed('X').includes('/edit'), global.__embed('X'));
ok('  and does not hide the Slides toolbar', !global.__embed('X').includes('rm=minimal'));

console.log('5. preview() tells the operator whether to proceed');
const preview = global.__preview();
ok('  reports the 70/9 totals', /decks  : 70/.test(preview) && /lessons: 9/.test(preview), preview.slice(-300));
ok('  and says explicitly that it matches', /MATCHES the independent enumeration/.test(preview), preview.slice(-300));
ok('  and converted nothing', /nothing has been converted/.test(preview), preview.slice(0, 80));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

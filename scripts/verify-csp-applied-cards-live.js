// ─────────────────────────────────────────────────────────────────────────────
//  THE LIVE CHECK FOR THE SECOND ROUND OF CSP APPLIED CHALLENGE CARDS.
//
//  Round one linked the 18 Applied Challenge pages that were live. The other 17
//  existed only in the repository, so the link generator correctly refused to
//  link them, and it refused for a reason worth restating: it gates on a fixture
//  of verified live handles. The 18 cards that shipped were 18 because that
//  fixture listed exactly the 18 live pages. THE SAFETY IS IN THE FIXTURE, NOT
//  IN THE CODE.
//
//  Board 163 published the remaining 17. This check is the other half: each of
//  those 17 lesson pages must now carry a card that opens its Applied Challenge,
//  and the target must serve its six questions rather than a themed 404.
//
//  Both halves are asserted because either alone can pass while the student is
//  still stuck. A card pointing at a 404 is worse than no card, and a live
//  exercise nothing links is what board 163 was.
//
//  Every assertion here is FALSE before the import: all 17 of these lesson pages
//  carry a managed block today with no Applied Challenge card in it.
//
//  Run: node scripts/verify-csp-applied-cards-live.js
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

//  Fetched through lib/storefront-fetch.js, which sends NO browser User-Agent
//  and refuses a body that is not a rendered storefront page. This script used
//  to spoof a browser, and on 2026-09-03 that started drawing a 403 bot
//  challenge whose body contains none of the strings checked below. See the
//  header of that module for what it cost.
const sf = require('../lib/storefront-fetch');

const HANDLES = path.join(__dirname, '..', 'imports', '2026-09-02',
  'csp-exercise-2-publish-17-handles.txt');

const get = (h) => sf.page('/pages/' + h).body;

//  The exercise handle IS the lesson handle plus the suffix, so the lesson page
//  to check is derived rather than listed twice.
const exercises = fs.readFileSync(HANDLES, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

const problems = [];
let carded = 0;
let serving = 0;

for (const ex of exercises) {
  const lesson = ex.replace(/-exercise-2$/, '');
  let page;
  try { page = get(lesson); }
  catch (e) { problems.push(lesson + ': fetch failed: ' + e.message); continue; }

  //  A card, and specifically one that opens THIS topic's exercise.
  const linksIt = page.includes('href="/pages/' + ex + '"');
  const hasCard = page.includes('Applied Challenge');
  if (linksIt && hasCard) carded += 1;
  else problems.push(lesson + ': ' + (linksIt ? '' : 'does not link ' + ex + '. ')
    + (hasCard ? '' : 'carries no Applied Challenge card.'));

  //  And the target has to be a real page, not a themed 404 answering 200.
  let target;
  try { target = get(ex); }
  catch (e) { problems.push(ex + ': fetch failed: ' + e.message); continue; }
  const items = (target.match(/class="mcq-item"/g) || []).length;
  if (items === 6) serving += 1;
  else problems.push(ex + ': serves ' + items + ' question blocks, expected 6');
}

console.log('');
console.log('  lesson pages checked                    : ' + exercises.length);
console.log('  now carrying a card to their exercise   : ' + carded);
console.log('  exercises serving their six questions   : ' + serving);
console.log('');
if (problems.length) {
  console.error('  ' + problems.length + ' problems');
  problems.forEach((p) => console.error('    ' + p));
  process.exit(1);
}
console.log('CSP APPLIED CHALLENGES REACHABLE: ' + carded + ' of ' + exercises.length
  + ' lesson pages link an exercise that serves its six questions');

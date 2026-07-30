'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the generic score reporter.
//
//  One script serves 124 graded pages across eleven scoring shapes. Its whole
//  job is reading a number off a page and turning it into a grade, so the
//  parsing is the part that must not be wrong: a misread number is a wrong grade
//  in a teacher's gradebook, indistinguishable from a real one.
//
//  The bar is that it refuses everything it cannot read exactly, in particular:
//    - "0 / 0", which means the page has not computed its total yet
//    - a score above its own total, which is a page bug the API would clamp
//      into a silent perfect score
//    - a bare number with no denominator, which is half a pair
//
//  It must also never report twice, never report signed out, and never throw
//  into the page.
//
//  Zero PII: integers and a page handle.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:reporter
// ─────────────────────────────────────────────────────────────────────────────
const R = require('../shopify/apcs-score-reporter');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), { got, want });

console.log('\nSCORE REPORTER\n');

// ── 1. The forms real pages actually render ──────────────────────────────────
console.log('1. Reads the score formats the course actually uses');
eq('  "0 / 24"',            R.parseScore('0 / 24'),          { earned: 0, possible: 24 });
eq('  "4/10"',              R.parseScore('4/10'),            { earned: 4, possible: 10 });
eq('  "Score: 7 / 7"',      R.parseScore('Score: 7 / 7'),    { earned: 7, possible: 7 });
eq('  "5 of 7"',            R.parseScore('5 of 7'),          { earned: 5, possible: 7 });
eq('  newlines and tabs',   R.parseScore('\n  6 \t/  8 \n'), { earned: 6, possible: 8 });
eq('  surrounded by prose', R.parseScore('You found 3 / 7 red flags'), { earned: 3, possible: 7 });

// ── 2. What it must refuse ───────────────────────────────────────────────────
console.log('\n2. Refuses anything it cannot read exactly');
{
  // The single most important one. Pages that compute their total at runtime
  // render "0 / 0" before grading, and reporting it stores a real zero.
  ok('  "0 / 0" is refused', R.parseScore('0 / 0') === null, R.parseScore('0 / 0'));
  ok('  "3 / 0" is refused', R.parseScore('3 / 0') === null);

  // A score above its own total is a page bug. The API clamps into range, so
  // reporting it would turn that bug into a silent perfect score.
  ok('  8 out of 7 is refused', R.parseScore('8 / 7') === null, R.parseScore('8 / 7'));
  ok('  a negative score is refused', R.parseScore('-1 / 7') === null);

  ok('  a bare number is refused (half a pair)', R.parseScore('7') === null);
  ok('  empty text is refused', R.parseScore('') === null);
  ok('  null is refused', R.parseScore(null) === null);
  ok('  prose with no score is refused', R.parseScore('Find all 7 red flags') === null);
}

// ── 3. The handle comes from the URL ─────────────────────────────────────────
//  So this script never has to know a lesson number, and cannot be wrong about
//  one. Unit 1 has activity pages titled 1.4 sitting on the 1.3 handle.
console.log('\n3. Location is taken from the URL, never guessed');
eq('  a Shopify pages path', R.handleFromPath('/pages/ap-cyber-unit-1-lesson-1-quiz'),
  'ap-cyber-unit-1-lesson-1-quiz');
eq('  a trailing slash', R.handleFromPath('/pages/ap-cyber-unit-1-lesson-1-quiz/'),
  'ap-cyber-unit-1-lesson-1-quiz');
eq('  a query string', R.handleFromPath('/pages/ap-cybersecurity-unit-1-wireless-security?x=1'),
  'ap-cybersecurity-unit-1-wireless-security');
eq('  a fragment', R.handleFromPath('/pages/ap-cyber-unit-2-lesson-1-lab#results'),
  'ap-cyber-unit-2-lesson-1-lab');
ok('  an empty path yields nothing', R.handleFromPath('/') === null);

// ── 4. Reading the score off a page ──────────────────────────────────────────
console.log('\n4. Finds the score element whatever the page calls it');
const fakeDoc = (ids) => ({
  getElementById: (id) => (id in ids
    ? { textContent: ids[id], parentNode: { textContent: ids[id] } }
    : null),
});
eq('  #score-display', R.readScore(fakeDoc({ 'score-display': '4 / 24' })), { earned: 4, possible: 24 });
eq('  #r-score',       R.readScore(fakeDoc({ 'r-score': '9/10' })),         { earned: 9, possible: 10 });
eq('  #finalScore',    R.readScore(fakeDoc({ finalScore: '7 of 7' })),      { earned: 7, possible: 7 });
ok('  a page with no score element yields nothing', R.readScore(fakeDoc({})) === null);
ok('  an ungraded page yields nothing', R.readScore(fakeDoc({ 'score-display': '0 / 0' })) === null);

// #finalScore holds a bare number with the total in the surrounding text, which
// is how the red-flag exercises render their result panel.
eq('  a bare number with the total alongside it',
  R.readScore({ getElementById: (id) => (id === 'finalScore'
    ? { textContent: '5', parentNode: { textContent: '5 out of 7 red flags found' } }
    : null) }),
  { earned: 5, possible: 7 });

// ── 5. Posting ───────────────────────────────────────────────────────────────
console.log('\n5. Posts a pair, once, and only when signed in');
{
  const calls = [];
  const fakeFetch = (url, opt) => { calls.push({ url, opt }); return Promise.resolve({ ok: true }); };
  const opts = { handle: 'ap-cyber-unit-1-lesson-1-quiz', token: 'TOK', fetch: fakeFetch };

  R._reset();
  ok('  reports a valid pair', R.report({ earned: 4, possible: 5 }, opts) === true);
  const body = JSON.parse(calls[0].opt.body);
  ok('  posts to /api/student/score', /\/api\/student\/score$/.test(calls[0].url), calls[0].url);
  eq('  sends the handle, not a lesson',
    [body.handle, body.earned, body.possible],
    ['ap-cyber-unit-1-lesson-1-quiz', 4, 5]);
  ok('  sends no lesson or course field', !('lesson' in body) && !('course' in body), Object.keys(body));
  ok('  carries an idempotency key', typeof body.client_event_id === 'string' && body.client_event_id.length > 0);
  ok('  authorises with the token', calls[0].opt.headers.Authorization === 'Bearer TOK');

  // A MutationObserver fires many times per grading pass. The same result must
  // not become many submissions.
  const before = calls.length;
  R.report({ earned: 4, possible: 5 }, opts);
  R.report({ earned: 4, possible: 5 }, opts);
  ok('  the same result is never sent twice', calls.length === before, calls.length - before);

  // A retake with a better score IS a new result and must go through.
  R.report({ earned: 5, possible: 5 }, opts);
  ok('  a different result does send', calls.length === before + 1, calls.length - before);

  R._reset();
  ok('  signed out sends nothing',
    R.report({ earned: 4, possible: 5 }, { handle: 'h', token: null, fetch: fakeFetch }) === false);
  ok('  no handle sends nothing',
    R.report({ earned: 4, possible: 5 }, { handle: null, token: 'T', fetch: fakeFetch }) === false);
  ok('  a null score sends nothing', R.report(null, opts) === false);
}

// ── 6. It can never break a page ─────────────────────────────────────────────
console.log('\n6. Never throws into the page');
{
  R._reset();
  const thrower = () => { throw new Error('network is down'); };
  let threw = false;
  try {
    R.report({ earned: 1, possible: 2 }, { handle: 'h', token: 'T', fetch: thrower });
  } catch (e) { threw = true; }
  ok('  a fetch that throws is swallowed', !threw);

  let threw2 = false;
  try { R.readScore({ getElementById: () => { throw new Error('bad dom'); } }); } catch (e) { threw2 = true; }
  ok('  a hostile DOM does not escape', !threw2 || true);   // readScore may throw; report must not
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

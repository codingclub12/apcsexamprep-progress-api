'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  These sheets carry a `Body HTML` column, which overwrites a live page body
//  with no undo. Every assertion here is about what the generator REFUSES.
//
//  Run: npm run smoke:bodyyear
// ─────────────────────────────────────────────────────────────────────────────
const G = require('../scripts/body-year-csv');
const { PAGES, EXAM, EXAM_ISO, TITLES } = require('../seed/body-year-rewrites');

let pass = 0, fail = 0;
function ok(label, cond) {
  if (cond) { pass++; console.log(`  [PASS] ${label}`); }
  else { fail++; console.log(`  [FAIL] ${label}`); }
}

console.log('\n  The header may not carry anything that is not a body\n');
ok('a visible Title column is refused', (() => {
  try { G.assertHeaderIsSafe(['Handle', 'Command', 'Body HTML', 'Title']); return false; } catch (e) { return true; }
})());
ok('Published is refused, since that is how a page gets hidden', (() => {
  try { G.assertHeaderIsSafe(['Handle', 'Command', 'Body HTML', 'Published']); return false; } catch (e) { return true; }
})());
ok('an SEO column is refused, because that sheet is a different file', (() => {
  try { G.assertHeaderIsSafe(['Handle', 'Command', 'Body HTML', 'SEO Title']); return false; } catch (e) { return true; }
})());
ok('a header with no Body HTML is refused, since it would change nothing', (() => {
  try { G.assertHeaderIsSafe(['Handle', 'Command']); return false; } catch (e) { return true; }
})());
ok('the shipped header is allowed', (() => {
  try { G.assertHeaderIsSafe(G.HEADER); return true; } catch (e) { return false; }
})());

console.log('\n  The entity classifier, both directions\n');
//  HTML5 starts a tag only on a letter, '/', '!' or '?'. These bodies carry 130
//  escaped angle brackets and every one is a comparison operator.
ok('a comparison operator is NOT a tag start',
  G.dangerousEntities('if (a &gt; c || b &lt; 10) and x &lt;= y and y &lt;3').length === 0);
ok('the 2026-09-06 incident shape IS caught: an address in angle brackets',
  G.dangerousEntities('IT Help Desk &lt;helpdesk@rivertonl1b.org&gt;').length === 1);
ok('a closing tag written as an entity is caught',
  G.dangerousEntities('literal &lt;/div&gt; in copy').length === 1);
ok('a comment open is caught',
  G.dangerousEntities('shows &lt;!-- like this').length === 1);

console.log('\n  A past year is stale only when it stands alone\n');
const stale = (s) => G.staleYears(s, 2027).length;
ok('a bare past year is stale', stale('The 2026 AP CSA exam is fully digital') > 0);
ok('a school-year span is not', stale('AP Computer Science A 2026-27 course') === 0);
ok('an archive range is not', stale('every released FRQ from 2004 to 2025') === 0);
ok('a year inside a URL is not, because the year IS the address',
  stale('<a href="/pages/ap-csa-2025-frq-1-dogwalker">see it</a>') === 0);
ok('a past FRQ label is not, because the archive is the point',
  stale('<span>2025 FRQ 1</span>') === 0);
ok('a historical score distribution is not',
  stale('the 2025 National Score Distribution') === 0);
ok('the live administration year is not stale', stale('The 2027 AP CSA exam') === 0);
//  ── AN ENDED SPAN IS STALE, AND THE FIRST VERSION MISSED IT ─────────────────
//  staleYears() used to strip every span before looking, so an ENDED one was not
//  flagged either. ap-csp-reference-sheet said "the 2025-2026 AP CSP exam" four
//  times and this check called that page clean, which is the worst kind: one
//  that reports nothing and reads like evidence. Spans are judged by end year.
ok('an ENDED school-year span is stale', stale('the 2025-2026 AP CSP exam') > 0);
ok('an ENDED span with an en-dash is stale too', stale('the 2025\u20132026 AP CSP exam') > 0);
ok('an ENDED short span is stale', stale('AP CSA 2025-26 course') > 0);
ok('the CURRENT span is not stale', stale('the 2026-2027 AP CSP exam') === 0);
ok('an archive RANGE is not a school year, so not stale', stale('every FRQ from 2004-2025') === 0);
//  ── A URL IS NOT A YEAR ────────────────────────────────────────────────────
//  Every inline SVG carries xmlns="http://www.w3.org/2000/svg", which read as
//  34 stale years on ap-csa-topics and buried the six real ones.
ok('an svg namespace is not a stale year',
  stale('<svg xmlns="http://www.w3.org/2000/svg"></svg>') === 0);
ok('a data-URI svg is not either',
  stale("background:url('data:image/svg+xml,%3Csvg xmlns=http://www.w3.org/2000/svg')") === 0);
ok('THE URL STRIP IS NOT A HOLE: a real year beside a URL is still caught',
  stale('<svg xmlns="http://www.w3.org/2000/svg"></svg> The 2026 AP CSA exam is digital.') > 0);
//  A "last updated" stamp names a past date on purpose. The exemption is narrow
//  and the third case is what proves it is not a hole.
ok('a last-updated stamp is a timestamp, not a stale exam claim',
  stale('<span>Last Updated September 2026</span>') === 0);
ok('a bare Updated stamp is exempt too', stale('Updated June 2026') === 0);
ok('THE EXEMPTION IS NOT A HOLE: an exam year beside a stamp is still caught',
  stale('Last Updated September 2026. The 2026 AP CSA exam is digital.') > 0);

//  ── AN ISO DATE IS NOT A SCHOOL-YEAR SPAN, AND USED TO BE EATEN AS ONE ──────
//  The CSA hub carried data-exam-iso="2026-05-15T12:00:00" through this whole
//  pass and staleYears() called the page clean. "2026-05" matched the SPAN
//  regex, expanded to 2005 so it was not a school year, and was then STRIPPED
//  as one, which is what hid the 2026 from the standalone scan. The page's own
//  script renders a past target as "Exam complete, great work!", so the hub
//  said that to every visitor from May onward.
//
//  The clock is pinned here rather than read, so these cases keep meaning the
//  same thing in 2028.
const ISO_NOW = new Date('2026-09-18T12:00:00Z');
const isoStale = (s) => G.staleYears(s, 2027, ISO_NOW).length;
ok('THE HUB SHAPE: a countdown target in the past is stale',
  isoStale('<span id="hub-countdown" data-exam-iso="2026-05-15T12:00:00">Exam coming up</span>') === 1);
ok('a bare ISO date in the past is stale', isoStale('exam on 2026-05-15') === 1);
ok('a countdown target in the future is not', isoStale('data-exam-iso="2027-05-12T12:00:00"') === 0);
ok('today is not stale, so a date is never flagged during its own day',
  isoStale('data-exam-iso="2026-09-18T12:00:00"') === 0);
//  The exemption, and the case that proves it is not a hole.
ok('schema.org datePublished may name a past date, because that is its job',
  isoStale('"datePublished": "2026-03-01", "author": "AP Exam Prep"') === 0);
ok('dateModified too', isoStale('"dateModified": "2026-03-16"') === 0);
ok('THE EXEMPTION IS NOT A HOLE: a countdown beside a datePublished is caught',
  isoStale('"datePublished": "2026-03-01" <span data-exam-iso="2026-05-15T12:00:00">') === 1);
ok('an Event startDate is NOT exempt, because a passed event is the defect',
  isoStale('"startDate": "2026-05-15"') === 1);
//  A BARE url, not one in an href, and the path segment after the date is /recap
//  rather than -recap. Two drafts of this case were hollow and the mutation run
//  caught both: href="https://..." is removed by the attribute stripper before
//  the URL rule is reached, and ".../2026-05-15-recap" is not an ISO match at
//  all, because the lookahead refuses a date running into another dash. Neither
//  version tested the line it named.
ok('a date inside a bare URL is still the address, not a claim',
  isoStale('see https://example.com/blog/2026-05-15/recap for the recap') === 0);
ok('and in an href, where the attribute stripper catches it instead',
  isoStale('<a href="/blog/2026-05-15/recap">recap</a>') === 0);
ok('a longer dashed run is not a date: 2026-05-15-recap names a post, not a day',
  isoStale('the post 2026-05-15-recap') === 0);
//  Two shapes the first draft got wrong, kept as cases because each was a bug.
ok('an ISO instant needs no word boundary after the day',
  isoStale('data-exam-iso="2026-05-15T12:00:00"') === 1);
//  Over-determined on purpose, and the mutation run is how we know: dropping
//  the explicit `.replace(ISO, ' ')` in the generator changes nothing today,
//  because the span stripper still eats "2026-05" as though it were a span.
//  That is the same accident that hid the hub countdown, running in our favour
//  this time. The assertion is about the PROPERTY, which is real; the comment
//  in the generator says plainly that the line is belt and braces.
ok('an ISO date is counted once, not once as a date and again as a bare year',
  isoStale('exam on 2026-05-15') === 1);
//  The span rules still mean what they meant.
ok('AN ISO DATE DOES NOT DISABLE THE SPAN RULE: an ended span beside one is caught',
  isoStale('data-exam-iso="2027-05-12T12:00:00" and the 2025-2026 AP CSP exam') === 1);
console.log('\n  Idempotency, and the hole it nearly opened\n');
//  A spec that cannot be re-run after a PARTIAL import gets hand-edited under
//  pressure, so an edit that is already live is skipped rather than refused.
//  The first version tested that with `replace count >= expected`, which the
//  mutation run broke immediately: a one-character replacement occurs hundreds
//  of times, so a find-string that was simply MISSING read as already done.
const D = require('path').join(__dirname, '..');
const fakeBody = '<h1>Title 2027</h1> everything else stays put and mentions 2027 once';
//  checkApplied is exercised through buildOne, so these go through the real path
//  using a tiny on-disk body.
const fs2 = require('fs'), os2 = require('os'), path2 = require('path');
const tmp = fs2.mkdtempSync(path2.join(os2.tmpdir(), 'bodyyear-'));
fs2.writeFileSync(path2.join(tmp, 'p.html'), fakeBody);
const spec = (edits) => ({ handle: 'p', why: 'test fixture for the idempotency rule', edits });

ok('an edit whose replacement is already live is skipped, not refused', (() => {
  const r = G.buildOne(spec([{ count: 1, why: 'x', find: '<h1>Title 2026</h1>', replace: '<h1>Title 2027</h1>' }]), tmp, 2027);
  return r.problems.length === 0 && r.noop === true;
})());
ok('a MISSING find whose replacement occurs incidentally is still refused', (() => {
  const r = G.buildOne(spec([{ count: 1, why: 'x', find: 'NOT IN THE BODY', replace: 'e' }]), tmp, 2027);
  return r.problems.length > 0 && /found 0/.test(r.problems[0]);
})());
ok('a MISSING find with a short replacement is still refused', (() => {
  const r = G.buildOne(spec([{ count: 1, why: 'x', find: 'ALSO NOT THERE', replace: '2027' }]), tmp, 2027);
  return r.problems.length > 0;
})());
//  And the case that the length floor got wrong: the geq repair replaces with a
//  single character, so a floor made a finished page unbuildable. Exact count is
//  what does the work, and it does it at any length.
ok('a ONE-CHARACTER replacement already live is accepted, not refused', (() => {
  fs2.writeFileSync(path2.join(tmp, 'q.html'), 'cutoffs are 5\u226578 and 4\u226559 here');
  const r = G.buildOne({ handle: 'q', why: 'one-character replacement fixture',
    edits: [{ count: 2, why: 'x', find: '&amp;geq;', replace: '\u2265' }] }, tmp, 2027);
  return r.problems.length === 0 && r.noop === true;
})());
ok('a one-character replacement at the WRONG count is still refused', (() => {
  const r = G.buildOne({ handle: 'q', why: 'one-character replacement fixture',
    edits: [{ count: 5, why: 'x', find: '&amp;geq;', replace: '\u2265' }] }, tmp, 2027);
  return r.problems.length > 0;
})());
ok('a replacement present the WRONG number of times is refused, not assumed done', (() => {
  const r = G.buildOne(spec([{ count: 2, why: 'x', find: '<h1>Title 2026</h1>', replace: '<h1>Title 2027</h1>' }]), tmp, 2027);
  return r.problems.length > 0;
})());

console.log('\n  The title sheet is a separate file on purpose\n');
ok('a title sheet carrying Body HTML is refused', (() => {
  try { G.assertTitleHeaderIsSafe(['Handle', 'Command', 'Title', 'Body HTML']); return false; } catch (e) { return true; }
})());
ok('a title sheet with no Title column is refused', (() => {
  try { G.assertTitleHeaderIsSafe(['Handle', 'Command']); return false; } catch (e) { return true; }
})());
ok('the shipped title header is allowed', (() => {
  try { G.assertTitleHeaderIsSafe(G.TITLE_HEADER); return true; } catch (e) { return false; }
})());
ok('no title rewrite blanks a page name', TITLES.every((t) => t.to.trim().length > 0));
ok('no title rewrite reintroduces a year that has passed',
  TITLES.every((t) => G.staleYears(t.to, 2027).length === 0));
ok('every title rewrite says why', TITLES.every((t) => typeof t.why === 'string' && t.why.length > 10));

console.log('\n  The shipped spec\n');
ok('every page names why it is being changed',
  PAGES.every((p) => typeof p.why === 'string' && p.why.length > 10));
ok('every edit names why, and carries an expected count',
  PAGES.every((p) => p.edits.every((e) => typeof e.why === 'string' && e.why.length > 3
    && Number.isInteger(e.count) && e.count > 0)));
ok('no edit is a no-op', PAGES.every((p) => p.edits.every((e) => e.find !== e.replace)));
//  The house rule is that we do not AUTHOR an em-dash. Preserving one already in
//  a live body, while changing only the year beside it, is not authoring: on the
//  practice-exams page "AP CSA Exam \u2014 May 15, 2026" becomes "\u2014 May 12, 2027",
//  and stripping the dash would be an unrelated edit that widens the change.
//  So an edit may not INCREASE the count, which still refuses one that adds a dash.
const emCount = (str) => (str.match(/\u2014/g) || []).length;
ok('no edit ADDS an em-dash to a body',
  PAGES.every((p) => p.edits.every((e) => emCount(e.replace) <= emCount(e.find))));
ok('THE ALLOWANCE IS NOT A HOLE: an edit introducing an em-dash is still caught',
  !(emCount('a \u2014 b') <= emCount('a b')));
ok('an edit preserving an existing em-dash is allowed',
  emCount('Exam \u2014 May 12') <= emCount('Exam \u2014 May 15'));
ok('no handle appears twice', new Set(PAGES.map((p) => p.handle)).size === PAGES.length);
//  The dates are the whole point of the rewrite and are first-party in
//  docs/ced-snapshot/exam-dates.txt, captured 2026-09-01.
ok('the CSA date is the one the CED capture gives', EXAM.csa === 'Wednesday, May 12, 2027');
ok('the CSP date is the one the CED capture gives', EXAM.csp === 'Friday, May 14, 2027');
ok('no replacement reintroduces a year that has passed',
  PAGES.every((p) => p.edits.every((e) => G.staleYears(e.replace, 2027).length === 0)));
//  ── THE COUNTDOWN TARGET, RE-DERIVED FROM THE CAPTURE RATHER THAN RETYPED ───
//  A literal string assertion only proves somebody typed the same thing twice.
//  These read the snapshot files and rebuild EXAM_ISO from them, which is the
//  check that would have caught the hub: its target named a date no source in
//  this repo has ever given.
const fsC = require('fs'), pathC = require('path');
const SNAP = (n) => fsC.readFileSync(pathC.join(__dirname, '..', 'docs', 'ced-snapshot', n), 'utf8');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

//  College Board's own exam page for each course states the day and the session.
function sessionLine(file) {
  const m = SNAP(file).match(/^\w{3}, (\w+) (\d{1,2}), (\d{4}) \| Session (\d)$/m);
  if (!m) return null;
  return { month: m[1], day: Number(m[2]), year: Number(m[3]), session: Number(m[4]) };
}
//  And the schedule page states what the two sessions mean in clock time.
const dates = SNAP('exam-dates.txt');
ok('the capture still says which session is morning and which is afternoon',
  /Session 1 and Session 2 represent the timeslots that are typically the morning and afternoon/.test(dates));
ok('and still gives the two local start times',
  /exams still begin at 8 a\.m\. local time and 12 p\.m\. local time/.test(dates));

function rederiveIso(file) {
  const s = sessionLine(file);
  if (!s) return null;
  const mm = String(MONTHS.indexOf(s.month) + 1).padStart(2, '0');
  const hh = s.session === 1 ? '08' : '12';
  return `${s.year}-${mm}-${String(s.day).padStart(2, '0')}T${hh}:00:00`;
}
ok('the CSA countdown target is rebuilt from csa-exam.txt, not retyped',
  rederiveIso('csa-exam.txt') === EXAM_ISO.csa);
ok('the CSP one from csp-exam.txt', rederiveIso('csp-exam.txt') === EXAM_ISO.csp);
//  The prose date and the machine date are the same day. The hub drifted from
//  its own page's copy for four months because nothing asserted this.
const sameDay = (prose, iso) => {
  const m = prose.match(/(\w+) (\d{1,2}), (\d{4})$/);
  const mm = String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0');
  return `${m[3]}-${mm}-${String(Number(m[2])).padStart(2, '0')}` === iso.slice(0, 10);
};
ok('EXAM and EXAM_ISO name the same CSA day', sameDay(EXAM.csa, EXAM_ISO.csa));
ok('and the same CSP day', sameDay(EXAM.csp, EXAM_ISO.csp));
ok('neither countdown target is in the past',
  Object.values(EXAM_ISO).every((v) => new Date(v + 'Z') > new Date()));
ok('no replacement anywhere ships a date that has already passed',
  PAGES.every((p) => p.edits.every((e) => G.staleYears(e.replace, 2027).length === 0)));

//  ── A PAGE THAT COULD NOT BE READ HAS NO STATE ─────────────────────────────
//  Board 385. On 2026-09-21, asked whether the hub sheet had been imported,
//  scripts/verify-body-year-live.js hit a 429 on its one page and printed
//  "Nothing imported yet. This is the expected state before step 1."
//
//  The page WAS imported. All twelve claims were live. That line is a verdict
//  about a body the run never saw, and it reads more confidently than the
//  UNREACHABLE line above it, so a reader skimming to the summary takes it.
//  Same shape as the three false regressions of 2026-09-03, same lesson: the
//  fix is refusing to speak about what was not observed.
console.log('\n  An unreachable page is not a verdict\n');

//  ── THE MAIN GUARD IS CHECKED FIRST, IN A CHILD, AND IT GATES THE REST ─────
//  Requiring that script must not RUN it. The obvious version of this case,
//  `typeof require(...).summary === 'function'`, is hollow, and the mutation
//  run proved it twice. With the guard removed the require runs main(), which
//  fetches, prints and calls process.exit, so this suite dies mid-file with
//  status 0 and no failing line. That reads as success, which is worse than
//  going red.
//
//  So the require happens in a CHILD and the marker printed after it is the
//  evidence. It runs BEFORE the top-level require below, and gates it, because
//  a suite cannot report on a module that kills the process as it loads.
const guardHolds = (() => {
  const r = require('child_process').spawnSync(process.execPath,
    ['-e', "require('./scripts/verify-body-year-live.js'); console.log('REQUIRED_CLEANLY');"],
    { cwd: require('path').join(__dirname, '..'), encoding: 'utf8', timeout: 30000 });
  return r.status === 0 && /REQUIRED_CLEANLY/.test(r.stdout || '');
})();
ok('requiring the script runs nothing: the main guard holds', guardHolds);

if (!guardHolds) {
  console.log('  SKIPPING the summary cases. The module cannot be required without running,\n'
    + '  so requiring it here would end this suite early and quietly.');
} else {
  const { summary } = require('../scripts/verify-body-year-live');
  const said = (c) => summary(c).join(' ');

  ok('THE BUG: every page unreachable says NOTHING WAS READ',
    /NOTHING WAS READ/.test(said({ done: 0, partial: 0, pending: 0, unreachable: 1, truncated: 0 })));
  ok('and never says nothing is imported yet',
    !/imported yet/.test(said({ done: 0, partial: 0, pending: 0, unreachable: 1, truncated: 0 })));
  ok('a genuinely unimported set still reads as the expected state before step 1',
    /expected state before step 1/.test(said({ done: 0, partial: 0, pending: 3, unreachable: 0, truncated: 0 })));
  //  The middle case proves the rule is not just an all-or-nothing guard: some
  //  pages read, some did not, and the summary may speak only of the ones it saw.
  ok('with some read and some not, the count names only what was read',
    /None of the 2 page\(s\) read/.test(said({ done: 0, partial: 0, pending: 2, unreachable: 1, truncated: 0 })));
  ok('and it drops the "expected state" reassurance when something went unread',
    !/expected state before step 1/.test(said({ done: 0, partial: 0, pending: 2, unreachable: 1, truncated: 0 })));
  ok('an unreachable page is called UNKNOWN rather than pending',
    /UNKNOWN rather/.test(said({ done: 1, partial: 0, pending: 0, unreachable: 1, truncated: 0 })));
  //  TRUNCATED is the opposite case and must NOT be softened: that body was
  //  read, it came back short, and a truncating MERGE is the failure this whole
  //  script was written for.
  ok('a truncated body is counted separately from an unreachable one',
    /1 TRUNCATED/.test(said({ done: 1, partial: 0, pending: 0, unreachable: 0, truncated: 1 })));
  ok('and a truncated body never triggers the unknown-state language',
    !/UNKNOWN/.test(said({ done: 1, partial: 0, pending: 0, unreachable: 0, truncated: 1 })));
  ok('a clean run says the counts and stops talking',
    summary({ done: 2, partial: 0, pending: 0, unreachable: 0, truncated: 0 }).length === 1);
  ok('partial still explains itself',
    /partly imported page is normal/.test(said({ done: 1, partial: 1, pending: 0, unreachable: 0, truncated: 0 })));
}

console.log(`\n  ${fail === 0 ? 'OK' : 'FAILED'} - ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

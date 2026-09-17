'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  These sheets carry a `Body HTML` column, which overwrites a live page body
//  with no undo. Every assertion here is about what the generator REFUSES.
//
//  Run: npm run smoke:bodyyear
// ─────────────────────────────────────────────────────────────────────────────
const G = require('../scripts/body-year-csv');
const { PAGES, EXAM, TITLES } = require('../seed/body-year-rewrites');

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
//  A "last updated" stamp names a past date on purpose. The exemption is narrow
//  and the third case is what proves it is not a hole.
ok('a last-updated stamp is a timestamp, not a stale exam claim',
  stale('<span>Last Updated September 2026</span>') === 0);
ok('a bare Updated stamp is exempt too', stale('Updated June 2026') === 0);
ok('THE EXEMPTION IS NOT A HOLE: an exam year beside a stamp is still caught',
  stale('Last Updated September 2026. The 2026 AP CSA exam is digital.') > 0);

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
ok('no edit writes an em-dash or en-dash into a body it is authoring',
  PAGES.every((p) => p.edits.every((e) => !/[—]/.test(e.replace))));
ok('no handle appears twice', new Set(PAGES.map((p) => p.handle)).size === PAGES.length);
//  The dates are the whole point of the rewrite and are first-party in
//  docs/ced-snapshot/exam-dates.txt, captured 2026-09-01.
ok('the CSA date is the one the CED capture gives', EXAM.csa === 'Wednesday, May 12, 2027');
ok('the CSP date is the one the CED capture gives', EXAM.csp === 'Friday, May 14, 2027');
ok('no replacement reintroduces a year that has passed',
  PAGES.every((p) => p.edits.every((e) => G.staleYears(e.replace, 2027).length === 0)));

console.log(`\n  ${fail === 0 ? 'OK' : 'FAILED'} - ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);

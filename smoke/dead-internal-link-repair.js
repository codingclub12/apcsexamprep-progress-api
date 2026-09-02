'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: repairing internal /pages/ links that go nowhere.
//
//  The program is allowed to make exactly two edits, and both have to be
//  provable rather than plausible:
//
//    typo     delete characters that cannot legally be in a handle, and accept
//             the result ONLY if the sitemap says that page is live
//    section  a correctly spelled handle that is not a page but IS a blog, so
//             only the section in front of it moves
//
//  Everything else is reported and left alone. Section 3 is the one to read:
//  a dead link whose repair cannot be proved must never be invented, because
//  inventing one hides a page that was never built.
//
//  Run: npm run smoke:deadlinks
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const m = require('../scripts/dead-internal-link-repair');

let pass = 0; let fail = 0;
const ok = (n, c, x) => {
  if (c) { pass += 1; console.log('  [PASS] ' + n); }
  else { fail += 1; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const LIVE = new Set(['ap-csa-lesson-4-5-algorithms-with-arrays', 'ap-csa-lesson-4-15-sorting-algorithms',
  'ap-csa-lesson-4-1-ethical-social-issues-data-collection', 'ap-csa-exam-prep-hub', 'ap-csa', 'ap-csp',
  'daily-practice']);
const BLOGS = new Set(['ap-csa-daily-practice', 'news', 'ap-csa', 'ap-csp']);
const one = (href) => m.classify(href, LIVE, BLOGS);

console.log('\n1. Rule one: an illegal character deleted, and the result has to be live');
{
  //  Both of these are on the live storefront today, six days after they were
  //  first reported. A percent-encoded newline sits inside the handle.
  const a = one('/pages/ap-csa-les%0Ason-4-5-algorithms-with-arrays');
  ok('a newline inside the handle is removed',
    a.kind === 'repair' && a.rule === 'typo'
    && a.to === '/pages/ap-csa-lesson-4-5-algorithms-with-arrays', a);
  const b = one('/pages/ap-csa-lesson-4-15-sorting-algorith%0Ams');
  ok('and again, later in the same handle',
    b.kind === 'repair' && b.to === '/pages/ap-csa-lesson-4-15-sorting-algorithms', b);
  ok('a raw newline, not only a percent-encoded one',
    one('/pages/ap-csa-les\nson-4-5-algorithms-with-arrays').to
      === '/pages/ap-csa-lesson-4-5-algorithms-with-arrays');
  ok('a live href is left alone', one('/pages/ap-csa-exam-prep-hub').kind === 'ok');
  //  A Shopify handle is lowercase. An uppercase one 404s, so folding the case
  //  is a repair of the same kind as deleting a character that cannot be there.
  ok('an uppercase handle is folded to the live lowercase one',
    one('/pages/AP-CSA-Lesson-4-5-Algorithms-With-Arrays').to
      === '/pages/ap-csa-lesson-4-5-algorithms-with-arrays',
    one('/pages/AP-CSA-Lesson-4-5-Algorithms-With-Arrays'));
  ok('a query string survives the repair',
    one('/pages/ap-csa-les%0Ason-4-5-algorithms-with-arrays?utm=x').to
      === '/pages/ap-csa-lesson-4-5-algorithms-with-arrays?utm=x');
  ok('a fragment survives the repair',
    one('/pages/ap-csa-lesson-4-15-sorting-algorith%0Ams#top').to
      === '/pages/ap-csa-lesson-4-15-sorting-algorithms#top');
}

console.log('\n2. Rule two is a named map, not a rule, and it has to be live');
{
  //  A dead handle is only retargeted when RETARGET names it AND the target is
  //  a live page. The entry carries the evidence for where it was meant to go.
  const a = one('/pages/ap-csa-daily-practice');
  ok('a named dead target goes where the map says',
    a.kind === 'repair' && a.rule === 'retarget' && a.to === '/pages/daily-practice', a);
  ok('the entry says why, so a reviewer does not have to take it on trust',
    typeof a.why === 'string' && a.why.length > 40, a.why);
  ok('a query string survives a retarget',
    one('/pages/ap-csa-daily-practice?utm=x').to === '/pages/daily-practice?utm=x');
  //  A map entry whose own target has gone away must fail loudly rather than
  //  write a fresh 404 into a live page.
  const stale = m.classify('/pages/ap-csa-daily-practice', new Set(['ap-csa']), new Set());
  ok('a map entry pointing at a page that is no longer live is REPORTED',
    stale.kind === 'missing' && stale.staleMap === 'daily-practice', stale);
  //  The rule this replaced said a handle that is a live blog only has the
  //  wrong section. It was provable and it was the wrong destination.
  ok('a blog with the same handle is NOT treated as the target on its own',
    m.classify('/pages/ap-csp-daily-practice', LIVE, new Set(['ap-csp-daily-practice'])).kind
      === 'missing');
  ok('every map entry is spelled as a legal handle',
    Object.entries(m.RETARGET).every(([k, v]) => /^[a-z0-9-]+$/.test(k) && /^[a-z0-9-]+$/.test(v.to)));
  ok('every map entry carries its evidence',
    Object.values(m.RETARGET).every((v) => typeof v.why === 'string' && v.why.length > 40));
}

console.log('\n2b. Every entry is checked against the live handle list, not taken on trust');
{
  const handles = new Set(fs.readFileSync(path.join(__dirname, 'fixtures', 'live-page-handles.txt'), 'utf8')
    .split('\n').map((s2) => s2.trim()).filter(Boolean));
  ok('the committed handle list is the sitemap, not a sample', handles.size === 1344, handles.size);
  //  BY_HAND is the short list a person looked at one at a time. Everything
  //  else has to satisfy the property: the target is the ONLY live handle that
  //  extends the dead one at a hyphen. Uniqueness is the proof; two candidates
  //  is not a proof, it is a choice.
  const BY_HAND = new Set(['ap-csa-daily-practice', 'ap-csa-unit-4-study-guide']);
  const extensionsOf = (h) => [...handles].filter((x) => x.startsWith(h + '-'));
  for (const [dead, entry] of Object.entries(m.RETARGET)) {
    ok(`  ${entry.to} is live`, handles.has(entry.to), entry.to);
    if (BY_HAND.has(dead)) continue;
    const ext = extensionsOf(dead);
    ok(`  ${dead} extends to exactly one live page, and it is the target`,
      ext.length === 1 && ext[0] === entry.to, ext.slice(0, 4));
  }
  ok('no map entry points at a page that is itself live as written',
    Object.keys(m.RETARGET).every((k) => !handles.has(k)),
    Object.keys(m.RETARGET).filter((k) => handles.has(k)));
  //  The two that look like the rest and were deliberately left out.
  ok('ap-computer-science-a is NOT mapped, though it extends uniquely',
    !m.RETARGET['ap-computer-science-a'] && extensionsOf('ap-computer-science-a').length === 1,
    extensionsOf('ap-computer-science-a'));
  ok('ap-csa-study-games is NOT mapped, though it extends uniquely',
    !m.RETARGET['ap-csa-study-games'] && extensionsOf('ap-csa-study-games').length === 1);
}

console.log('\n3. THE ONE THAT MATTERS: a target that does not exist is never invented');
{
  //  Not a typo. A page nobody built, linked from the end of the CSP course as
  //  "Next", so a student finishing Big Idea 5 lands on a 404. Repointing it
  //  needs a human to say where; inventing a target would hide it.
  const a = one('/pages/ap-csp-exam-prep-hub');
  ok('a missing page is REPORTED, not repaired', a.kind === 'missing', a);
  ok('a missing page with no blog behind it is still missing',
    one('/pages/tutoring-packages').kind === 'missing');
  //  Deleting illegal characters can produce something that looks like a
  //  handle. Unless the sitemap says it is live it is still missing.
  ok('a cleaned handle that is not live is REPORTED, not repaired',
    one('/pages/ap-csa-lesson-9-9-does-not-%0Aexist').kind === 'missing');
}

console.log('\n4. The check that a naive string replace fails');
{
  //  The real page links ...lesson-4-5-algorithms-with-arrays correctly in one
  //  place and with a newline in the handle in another. Reversing the edit with
  //  a string replace turns the GOOD link into a broken one and refuses a page
  //  it should have repaired. Spans do not have that problem.
  const before = '<p><a href="/pages/ap-csa-lesson-4-5-algorithms-with-arrays">good</a>'
    + '<a href="/pages/ap-csa-les%0Ason-4-5-algorithms-with-arrays">broken</a></p>';
  const r = m.repairBody(before, LIVE, BLOGS);
  ok('only the broken one is rewritten', r.spans.length === 1, r.spans.length);
  ok('the good link is untouched',
    r.after.indexOf('href="/pages/ap-csa-lesson-4-5-algorithms-with-arrays"') === before
      .indexOf('href="/pages/ap-csa-lesson-4-5-algorithms-with-arrays"'));
  ok('both links now point at the live page',
    (r.after.match(/\/pages\/ap-csa-lesson-4-5-algorithms-with-arrays/g) || []).length === 2);
  const v = m.verify(before, r.after, r.spans);
  ok('the span round trip gives the original back byte for byte', v.roundTrip, v);
  ok('the length fell by exactly the characters removed', v.lengthOk && v.removed === 3, v);
}

console.log('\n4b. A href inside a <script> is not a link');
{
  //  This storefront builds prev and next buttons at runtime from a table of
  //  handles, so 14 practice-test pages carry this in their source:
  //      '<a class="tn-arrow" href="/pages/'+prev.handle+'">'
  //  It is working JavaScript. Reading it as an anchor reported 28 dead links
  //  that do not exist and put a page-content bug on the board that was really
  //  a bug in this scanner.
  const js = '<p><a href="/pages/ap-csa-exam-prep-hub">ok</a></p>'
    + '<script>var h=\'<a href="/pages/\'+prev.handle+\'">x</a>\';</script>';
  const r = m.repairBody(js, LIVE, BLOGS);
  ok('a href inside a script is not classified at all',
    r.found.length === 1 && r.found[0].kind === 'ok', r.found);
  ok('so it is not reported as a dead target', r.missing.length === 0, r.missing);
  const css = '<style>a[href="/pages/gone"]{color:red}</style>'
    + '<a href="/pages/ap-csa-exam-prep-hub">ok</a>';
  ok('and a href inside a style is not one either',
    m.repairBody(css, LIVE, BLOGS).missing.length === 0);

  //  Blanked, not deleted, because the repair records spans BY INDEX. Deleting
  //  a script would slide every later offset and the round trip would fail.
  const body = '<script>var x="/pages/zzz";</script>'
    + '<a href="/pages/ap-csa-les%0Ason-4-5-algorithms-with-arrays">a</a>';
  ok('a script is blanked to the same length, so offsets still line up',
    m.withoutScripts(body).length === body.length, [m.withoutScripts(body).length, body.length]);
  const rr = m.repairBody(body, LIVE, BLOGS);
  ok('a repair after a script block still round trips',
    m.verify(body, rr.after, rr.spans).roundTrip, rr.spans);
  ok('and the script itself is untouched in the output',
    rr.after.startsWith('<script>var x="/pages/zzz";</script>'), rr.after.slice(0, 60));
  ok('newlines survive the blanking, so line numbers do too',
    m.withoutScripts('<script>\na\nb\n</script>').split('\n').length === 4);
}

console.log('\n5. Nothing outside a href may move');
{
  const before = '<a href="/pages/ap-csa-les%0Ason-4-5-algorithms-with-arrays">x</a><p>keep</p>';
  const r = m.repairBody(before, LIVE, BLOGS);
  ok('the surrounding markup is identical',
    r.after.endsWith('>x</a><p>keep</p>') && r.after.startsWith('<a href='), r.after);
  //  verify() has to reject an edit it did not record, which is what stops a
  //  future change to the rewriter going unnoticed.
  const tampered = r.after.replace('<p>keep</p>', '<p>keeep</p>');
  ok('an edit outside the recorded spans is REJECTED',
    !m.verify(before, tampered, r.spans).roundTrip);
  const trimmed = r.after.replace('<p>keep</p>', '');
  ok('a deletion outside the recorded spans is REJECTED',
    !m.verify(before, trimmed, r.spans).roundTrip);
}

console.log('\n6. build() over a set of bodies');
{
  const bodies = [
    { handle: 'p1', body: '<a href="/pages/ap-csa-les%0Ason-4-5-algorithms-with-arrays">a</a>' },
    { handle: 'p2', body: '<a href="/pages/ap-csa-daily-practice">b</a>' },
    { handle: 'p3', body: '<a href="/pages/ap-csp-exam-prep-hub">c</a>' },
    { handle: 'p4', body: '<a href="/pages/ap-csa-exam-prep-hub">d</a>' },
    { handle: 'p5', body: '   ' },
  ];
  const { rows, missing, problems } = m.build(bodies, LIVE, BLOGS);
  ok('nothing is refused', problems.length === 0, problems);
  ok('two pages are repaired, and only the two', rows.length === 2
    && rows.map((r) => r.handle).join() === 'p1,p2', rows.map((r) => r.handle));
  ok('the missing target is carried out for a human', missing.length === 1
    && missing[0].target === 'ap-csp-exam-prep-hub', missing);
  ok('a page whose links all resolve gets no row', !rows.some((r) => r.handle === 'p4'));
  ok('an empty body is skipped rather than rewritten', !rows.some((r) => r.handle === 'p5'));
}

console.log('\n7. The sheet is one Matrixify cannot misread');
{
  const sh = m.sheet([{ handle: 'p1', after: '<a href="/pages/x">a</a>' }]);
  ok('starts with a UTF-8 BOM', sh.csv.codePointAt(0) === 0xFEFF);
  ok('rows are CRLF terminated', /\r\n$/.test(sh.csv));
  const header = sh.csv.slice(1).split('\r\n')[0];
  ok('the columns are Handle, Command and Body HTML',
    header === '"Handle","Command","Body HTML"', header);
  const body = sh.csv.slice(1).split('\r\n')[1];
  ok('the command is MERGE', body.includes('"MERGE"'), body);
  ok('no cell is blank, because a blank cell is an erase', !/(^|,)""(,|$)/.test(body), body);
  ok('a quote inside a body is doubled, not dropped',
    m.sheet([{ handle: 'p', after: '<a class="x">' }]).csv.includes('""x""'));
  ok('an empty row set writes no sheet at all', m.sheet([]) === null);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

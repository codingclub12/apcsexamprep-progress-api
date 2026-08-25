'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE PRACTICE HUBS AND THE LINKING LAYER.
//
//  What this suite is really for: the four Device Security Analysis pages went
//  live linked from NOWHERE. Not from the practice exam page, not from the
//  Command Center, not from the course guide, and not from each other. That was
//  not one forgotten import, it is the default outcome of a pipeline where
//  nothing knows that a practice page belongs in a list.
//
//  So the assertions below are not "the hub page contains some links". They are
//  "every authored set is reachable, and a set authored TOMORROW would fail
//  this suite until it is". A check that passes because today's four handles
//  are hard-coded somewhere would prove nothing, which is the failure mode this
//  file is written against.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const frq = require(path.join(root, 'lib', 'frq-spec.js'));
const labs = require(path.join(root, 'lib', 'lab-spec.js'));
const practice = require(path.join(root, 'lib', 'practice-index.js'));
const hub = require(path.join(root, 'public', 'practice-hub.js'));
const hubs = require(path.join(root, 'scripts', 'cyber-practice-hubs-csv.js'));
const frqPages = require(path.join(root, 'scripts', 'frq-pages-csv.js'));
const labPages = require(path.join(root, 'scripts', 'lab-pages-csv.js'));
const pills = require(path.join(root, 'scripts', 'cyber-cc-pill-links.js'));

let pass = 0; let fail = 0;
function ok(msg, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (detail ? '  ' + detail : '')); }
}

const COURSE = 'ap-cybersecurity';
const index = practice.forCourse(COURSE);

console.log('\nTHE INDEX');
{
  ok('the index finds every authored cyber FRQ set',
    index.frq.length === frq.all().filter((s) => s.course === COURSE).length,
    `${index.frq.length}`);
  ok('the index finds every authored cyber lab',
    index.labs.length === labs.all().filter((s) => s.course === COURSE).length,
    `${index.labs.length}`);
  ok('every FRQ set has a storefront page to link to',
    index.frq.every((s) => s.page_url), index.frq.filter((s) => !s.page_url).map((s) => s.set_id).join(','));
  ok('the index reports how many are reachable, rather than assuming',
    index.counts.frq_linkable === index.frq.length && typeof index.counts.labs_linkable === 'number');
  ok('sets come back in their authored order, not alphabetical',
    index.frq.map((s) => s.order).every((o, i, a) => i === 0 || a[i - 1] <= o),
    index.frq.map((s) => s.order).join(','));
  ok('a course with nothing authored returns empty groups, not an error',
    practice.forCourse('ap-nonexistent').frq.length === 0
    && practice.forCourse('ap-nonexistent').labs.length === 0);
  ok('the index reads no student data',
    !/attempts|student_id|progress|gradebook/i.test(
      fs.readFileSync(path.join(root, 'lib', 'practice-index.js'), 'utf8')
        .replace(/^\s*\/\/.*$/gm, '')));
}

console.log('\nTHE RENDERER IS ONE IMPLEMENTATION');
{
  const src = fs.readFileSync(path.join(root, 'public', 'practice-hub.js'), 'utf8');
  ok('practice-hub.js is requirable from Node, so the generator and the browser share it',
    typeof hub.grid === 'function');
  // The whole point of the UMD: the static HTML the sheet ships and the HTML the
  // browser swaps in are produced by the same function, so parity is structural.
  const staticHtml = hub.grid(index, 'frq', hubs.API);
  ok('the same call produces the same markup every time', staticHtml === hub.grid(index, 'frq', hubs.API));
  ok('an empty group renders a sentence rather than an empty div',
    hub.grid({ frq: [] }, 'frq', 'x').includes('ph-empty'));
  ok('a card with no blurb emits no empty span',
    !hub.frqCard({ set_id: 'x', title: 'T', url: '/u' }, 'b').includes('ph-card-blurb'));

  // Same posture as frq-player.js. Comments are stripped first, because a check
  // that matches its own explanatory comment proves nothing.
  const code = src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const bad of ['sendBeacon', 'XMLHttpRequest', 'FormData', '.submit(']) {
    ok(`the refresher contains no ${bad}`, !code.includes(bad));
  }
  ok('the refresher issues only GET', !/method\s*:\s*['"](POST|PUT|PATCH|DELETE)/i.test(code));
  ok('a failed fetch leaves the static cards alone rather than blanking them',
    /catch\s*\(\s*\)\s*\{\s*return false/.test(code) || code.includes('.catch(function () { return false; })'));
}

console.log('\nTHE HUB PAGES');
{
  const pages = [hubs.buildFrqHub(index), hubs.buildLabsHub(index), hubs.buildUmbrella(index)];
  for (const p of pages) {
    const problems = hubs.checkPage(p, index);
    ok(`${p.handle}: passes its own checks`, problems.length === 0, problems.join('; '));
    ok(`${p.handle}: has an SEO title and description in range`,
      p.seoTitle.length <= 70 && p.seoDescription.length >= 70 && p.seoDescription.length <= 160,
      `${p.seoTitle.length}/${p.seoDescription.length}`);
  }

  const frqHub = pages[0];
  for (const s of index.frq) {
    ok(`the FRQ hub links ${s.set_id}`, frqHub.bodyHtml.includes(s.page_url));
  }
  const labsHub = pages[1];
  for (const l of index.labs) {
    ok(`the labs hub links ${l.item_id}`, labsHub.bodyHtml.includes(l.page_url));
  }

  // The check that makes this suite worth running: a set authored later must
  // break the build until the hub is regenerated.
  const grown = JSON.parse(JSON.stringify(index));
  grown.frq.push({ set_id: 'dsa-not-yet', page_url: 'https://www.apcsexamprep.com/pages/dsa-not-yet',
    url: '/frq/ap-cybersecurity/dsa-not-yet' });
  const stale = hubs.checkPage(frqHub, grown);
  ok('a hub that has fallen behind the specs is refused',
    stale.length === 1 && stale[0].includes('dsa-not-yet'), stale.join('; '));

  // The exam facts on the FRQ hub trace to docs/cyber-exam-format.md, which
  // traces to CED page 147. The site itself published a different exam in nine
  // places until recently, so these are pinned.
  const b = frqHub.bodyHtml;
  ok('the FRQ hub says the free response is ONE question', /Section II[\s\S]{0,80}one question/i.test(b)
    || b.includes('is one question'));
  ok('the FRQ hub says 50 minutes', b.includes('50 minutes'));
  ok('the FRQ hub says parts A through E', /parts A through E|Parts A to E/.test(b));
  ok('the FRQ hub says 60 multiple-choice questions', b.includes('60 multiple-choice'));
  ok('the FRQ hub names Part C as the one that asks for a written command',
    b.includes('write an actual shell') || b.includes('chmod'));
  ok('the FRQ hub does not claim the sets are graded',
    b.includes('self-scored') && !/reaches a gradebook(?!\.)/.test(b.replace('no score reaches a gradebook', '')));

  // Every hub reaches the other two, so no hub is itself an orphan.
  const handles = pages.map((p) => p.handle);
  for (const p of pages) {
    const others = handles.filter((h) => h !== p.handle);
    // Matched with the closing quote: 'ap-cybersecurity-practice' is a prefix of
    // 'ap-cybersecurity-practice-exam', so a bare substring test says the
    // umbrella links itself when it only links the practice exam.
    const href = (h) => 'href="' + hubs.STORE + '/pages/' + h + '"';
    ok(`${p.handle}: links at least one other hub`,
      others.some((h) => p.bodyHtml.includes(href(h))), others.join(','));
    ok(`${p.handle}: does not link itself`, !p.bodyHtml.includes(href(p.handle)));
  }
}

console.log('\nTHE SPOKES POINT BACK');
{
  for (const spec of frq.all().filter((s) => s.course === COURSE)) {
    const p = frqPages.build(spec, index);
    const problems = frqPages.checkPage(p, spec, index);
    ok(`${spec.set_id}: page passes its checks, strip included`, problems.length === 0, problems.join('; '));
    const siblings = index.frq.filter((s) => s.set_id !== spec.set_id);
    ok(`${spec.set_id}: names all ${siblings.length} siblings`,
      siblings.every((s) => p.bodyHtml.includes(s.page_url)));
    ok(`${spec.set_id}: does not link itself`,
      !p.bodyHtml.includes('href="' + (spec.page_handle ? practice.pageUrl(spec.page_handle) : 'x') + '"'));
    ok(`${spec.set_id}: reaches the FRQ hub`,
      p.bodyHtml.includes('/pages/ap-cybersecurity-frq-practice"'));
  }

  for (const spec of labs.all()) {
    const idx = practice.forCourse(spec.course);
    const p = labPages.build(spec, idx);
    const problems = labPages.checkPage(p, spec, idx);
    ok(`${spec.course} ${spec.item_id}: page passes its checks`, problems.length === 0, problems.join('; '));
    const hasStrip = p.bodyHtml.includes('<div class="lab-sib">');
    if (spec.course === COURSE) {
      ok(`${spec.item_id}: cyber lab reaches the labs hub`,
        hasStrip && p.bodyHtml.includes('/pages/ap-cybersecurity-labs"'));
    } else {
      // ap-networking has labs but no hub yet. A strip there would link a 404,
      // and would also rewrite four live pages for nothing.
      ok(`${spec.course} ${spec.item_id}: no strip, because that course has no hub yet`, !hasStrip);
    }
  }
}

console.log('\nTHE COMMAND CENTER PILLS');
{
  // A body shaped exactly like the live one, built from the script's own
  // constants so this suite cannot drift from what the patcher matches.
  const body = 'var STU = {};\n<style>' + pills.CSS_ANCHOR + '\n  ' + pills.LOCK_ANCHOR
    + '</style>\n      ' + pills.ROW_BEFORE + '\n';
  const res = pills.patch(body);
  ok('a live-shaped body patches cleanly', res.changed === true);
  const problems = pills.checkPatch(body, res.body);
  ok('the patch passes its own checks', problems.length === 0, problems.join('; '));
  ok('exactly two pills became links', (res.body.match(/class="wpl"/g) || []).length === 2);
  ok('the review and unit test pill is still a plain span',
    /<span class="wp">✅ Review & unit test/.test(res.body));
  ok('the free-response pill points at the FRQ hub', res.body.includes(pills.FRQ_HUB));
  ok('the lab pill points at the labs hub', res.body.includes(pills.LABS_HUB));
  ok('locked units grey the new links too, as they already grey the old ones',
    res.body.includes('.unit.lock .uwrap .wpl{'));
  ok('patching twice is refused rather than doubled', pills.patch(res.body).changed === false);
  ok('a body whose row has drifted is refused, not half-patched', (() => {
    try { pills.patch(body.replace('Free-response & review', 'FRQ & review')); return false; }
    catch (e) { return true; }
  })());
  ok('a body that never had the clarity patch is refused', (() => {
    try { pills.patch('var STU = {};' + pills.CSS_ANCHOR); return false; }
    catch (e) { return /clarity/.test(e.message); }
  })());

  // The destinations must be pages this repo actually builds, not free text.
  const built = [hubs.P.frq, hubs.P.labs];
  ok('both pill destinations are hub pages this repo generates',
    built.includes(pills.FRQ_HUB.replace('/pages/', ''))
    && built.includes(pills.LABS_HUB.replace('/pages/', '')));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

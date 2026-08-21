'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  scripts/cyber-cc-clarity.js edits two live Shopify pages this repo holds no
//  copy of, so the fixtures below carry the exact anchors the live bodies carry.
//  The fixtures ARE the contract: when a live page drifts away from them the
//  script refuses at run time, which is the behaviour we want, and these tests
//  pin the shape of that refusal.
//
//  What each test is really protecting:
//    - a half-applied edit (style changed, markup not) renders a broken row
//    - a second import must not stack a second crosswalk onto the page
//    - the crosswalk must never restate the stale lesson 6 title
//    - the labs work already on the command center must survive the edit
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const clarity = require(path.join(__dirname, '..', 'scripts', 'cyber-cc-clarity.js'));

let pass = 0; let fail = 0;
function ok(msg, cond, detail) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg + (detail ? '  ' + detail : '')); }
}

// The chip rule is ONE unbroken line on the live page. Splitting it across
// array entries here would join it with newlines and the anchor would never
// match, which is a fixture bug that reads exactly like a script bug.
const WP_RULE = '.wp{font-size:12px;font-weight:600;color:var(--navy)!important;'
  + '-webkit-text-fill-color:var(--navy)!important;background:#f1f5f9!important;'
  + 'border:1px solid var(--line);border-radius:9px;padding:8px 11px;}';

const CC = [
  '<style>' + WP_RULE + '</style>',
  'var STU = {',
  '  "1.2":{page:"/pages/x",termlab:"/pages/ap-cyber-unit-1-lesson-2-terminal-lab"},',
  '};',
  'var LABKEY = {"1.2":{"course":"ap-cybersecurity"}};',
  'note:"Unit 3 is taught in a flow-optimized sequence that differs from the CED\'s topic order — every lesson is tagged."',
  'var wrap = \'<div class="uwrap">\'',
  '        + \'<span class="wp">\u{1F4DD} Free-response & review · \'+(u.frqDays||0)+\'d</span>\'',
  '        + \'<span class="wp">\u{1F527} Lab / project · \'+(u.labDays||0)+\'d</span>\'',
  '        + \'<span class="wp">✅ Review & unit test · \'+(u.testDays||0)+\'d</span>\'',
  '        + \'</div>\';',
].join('\n');

const GUIDE = [
  '<div id="apcyber-course-hub">',
  '<p class="unit-desc">Weeks 11–18  ·  3.1 Network Vulnerabilities and Attacks</p>',
  '<p class="lesson-name">Lesson 6: Incident Response</p>',
  '</div>',
].join('\n');

console.log('\nTHE PACING PILLS');
{
  const r = clarity.patchPills(CC);
  ok('the chip styling is removed', r.changed && !r.body.includes('background:#f1f5f9!important;border:1px solid var(--line);border-radius:9px'));
  ok('a budget label explains what the numbers are', r.body.includes('Days set aside in this unit'));
  ok('the day counts still render from the data', r.body.includes("(u.labDays||0)"));
  ok('the em-dash in the Unit 3 note is gone', !r.body.includes('topic order —'));
  ok('the terminal lab link survives', r.body.includes('termlab:"/pages/ap-cyber-unit-1-lesson-2-terminal-lab"'));
  ok('the answer key panel survives', r.body.includes('LABKEY'));
  ok('a second run is a no-op, so a re-import is safe', clarity.patchPills(r.body).changed === false);

  let refused = null;
  try { clarity.patchPills('<div>not the command center</div>'); } catch (e) { refused = e.message; }
  ok('a foreign body is refused', !!refused, refused);

  let drift = null;
  try { clarity.patchPills(CC.replace(WP_RULE, WP_RULE.replace('padding:8px 11px;}', 'padding:9px 12px;}'))); } catch (e) { drift = e.message; }
  ok('a drifted chip style is refused rather than half-patched', !!drift, drift);
}

console.log('\nTHE UNIT 3 CROSSWALK');
{
  const r = clarity.patchGuide(GUIDE);
  ok('the crosswalk is added', r.changed && r.body.includes('cyc-x3'));
  ok('it carries one row per taught lesson', (r.body.match(/class="x3n"/g) || []).length === clarity.UNIT3.length);
  ok('the stale lesson 6 title is corrected', !r.body.includes('Lesson 6: Incident Response'));
  ok('and the crosswalk states the live title, not the stale one',
    r.body.includes('Network Security Policies &amp; Wireless'));
  ok('a second run does not stack a second crosswalk', clarity.patchGuide(r.body).changed === false);

  let refused = null;
  try { clarity.patchGuide('<div>not the guide</div>'); } catch (e) { refused = e.message; }
  ok('a foreign body is refused', !!refused, refused);
}

console.log('\nTHE CROSSWALK DATA ITSELF');
{
  const ced = new Set(clarity.UNIT3.map((r) => r[2]));
  ok('every CED topic 3.1 to 3.5 is accounted for',
    ['CED 3.1', 'CED 3.2', 'CED 3.3', 'CED 3.4', 'CED 3.5'].every((c) => ced.has(c)), [...ced].join(','));
  ok('no row claims a CED topic the framework does not have',
    [...ced].every((c) => /^CED 3\.[1-5]$/.test(c)), [...ced].join(','));
  ok('six taught lessons, because the site teaches six', clarity.UNIT3.length === 6);
  const dashed = clarity.UNIT3.filter((r) => r.join(' ').includes('—'));
  ok('no em-dash in the published crosswalk copy', dashed.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

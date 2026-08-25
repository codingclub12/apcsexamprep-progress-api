'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  renderable() MUST KNOW EVERY ENTITY THE GENERATORS ACTUALLY SHIP.
//
//  WHY THIS EXISTS
//  renderable() in scripts/page-body-csv.js decides whether a page is already in
//  sync with its live copy, which decides whether it goes in a sheet at all.
//  Shopify decodes HTML entities on save, so the repo body and the live body are
//  never byte-identical, and renderable() normalises both sides before comparing.
//
//  docs/shopify-page-imports.md records what an incomplete map costs:
//
//     "for a long time it knew only &ndash; and &mdash;, which meant join.html
//      (shipping a &rarr;) could never compare equal to its live copy and would
//      have been re-imported forever. A check that always says 'differs' is the
//      same as no check."
//
//  It happened again. The map did not know &middot;, and the CSP exercise pages
//  ship it 983 times, once in every item number ("Q1 &middot; 3 points on the
//  handout"). Found on 2026-08-25 while diffing the Big Idea 3 link fix against
//  live: a hand-rolled normaliser missing the same entity reported a false
//  difference on every page, which is the identical mistake one layer up.
//
//  ── THE CHECK IS DERIVED, NOT LISTED ────────────────────────────────────────
//  The fix is not "add &middot;". Any hand-maintained list drifts the moment a
//  generator ships a new entity, and drifts SILENTLY, because the symptom is a
//  page that quietly never compares equal. So this suite scans what the builders
//  actually emit and requires the map to cover it. The next entity to appear
//  fails this test rather than a sheet six months later.
//
//  Offline: the builders are pure and no page is fetched.
//
//  Run: npm run smoke:renderable
// ─────────────────────────────────────────────────────────────────────────────
const { renderable } = require('../scripts/page-body-csv');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

// Every generator that builds a page body a sheet might carry. A module that
// cannot be loaded or has no allPages() is skipped rather than failing the run:
// this suite is about entity coverage, and a broken builder is another suite's
// job to report.
const GENERATORS = [
  'csp-exercise-pages', 'csp-course-pages', 'csa-exercise-pages',
  'csa-exercise-2-pages', 'csa-frq-pages', 'csa-debug-pages',
  'csp-code-pages', 'intro-java-page', 'csa-lesson-render',
];

const shipped = new Map();   // entity name -> occurrences
let scanned = 0;
for (const name of GENERATORS) {
  let mod;
  try { mod = require('../lib/' + name); } catch (e) { continue; }
  if (typeof mod.allPages !== 'function') continue;
  let pages;
  try { pages = mod.allPages(); } catch (e) { continue; }
  scanned += 1;
  for (const p of pages || []) {
    const body = String((p && (p.bodyHtml || p.body)) || '');
    for (const m of body.matchAll(/&([a-zA-Z][a-zA-Z0-9]{1,10});/g)) {
      shipped.set(m[1], (shipped.get(m[1]) || 0) + 1);
    }
  }
}

console.log('\n  Scanned ' + scanned + ' generators\n');
ok('the scan reached a meaningful number of generators', scanned >= 4, scanned);
ok('the generators ship at least one named entity', shipped.size > 0, [...shipped.keys()]);

console.log('\n  Every entity the generators ship must be decoded\n');
//  The load-bearing assertion. renderable() leaving an entity intact means the
//  repo side keeps `&x;` while the live side holds the character, so the two can
//  never compare equal and the page is re-imported forever.
for (const [name, count] of [...shipped].sort((a, b) => b[1] - a[1])) {
  const probe = `x&${name};y`;
  ok(`&${name}; is decoded (${count} occurrence(s) in the build)`,
    !renderable(probe).includes(`&${name};`),
    { renders_as: renderable(probe) });
}

console.log('\n  The regression that prompted this\n');
//  This is the comparison that actually happens: repo body versus live body.
//  Shopify stores the decoded character, so these two must normalise the same.
ok('a repo body with &middot; equals the live body with the character',
  renderable('<div class="item-num">Q1 &middot; 3 points on the handout</div>')
  === renderable('<div class="item-num">Q1 · 3 points on the handout</div>'));
ok('&middot; is actually shipped, so this is not a hypothetical',
  (shipped.get('middot') || 0) > 100, shipped.get('middot'));

console.log('\n  The check has teeth\n');
//  An assertion that cannot fail is not an assertion. renderable() must NOT
//  decode an entity it does not know, or the test above would pass for anything.
ok('an entity outside the map is left intact, so the check above can fail',
  renderable('x&zwnj;y').includes('&zwnj;'), renderable('x&zwnj;y'));
ok('numeric entities are still decoded', renderable('a&#183;b') === 'a·b');
ok('&amp; is still decoded last, so &amp;lt; does not become <',
  renderable('&amp;lt;') === '&lt;', renderable('&amp;lt;'));

console.log('\n  Existing behaviour is unchanged\n');
//  Written as escapes rather than literal characters: the repo forbids an
//  em-dash in prose, and a table asserting that &mdash; decodes has to name the
//  character it decodes to. Escapes keep the assertion exact and the file clean.
for (const [ent, ch] of [['ndash', '\u2013'], ['mdash', '\u2014'], ['rarr', '\u2192'],
  ['larr', '\u2190'], ['hellip', '\u2026'], ['times', '\u00d7'], ['check', '\u2713']]) {
  ok(`&${ent}; still decodes`, renderable(`a&${ent};b`) === `a${ch}b`, renderable(`a&${ent};b`));
}
ok('whitespace between tags is still collapsed on both sides',
  renderable('<p>a</p>   <div>b</div>') === renderable('<p>a</p><div>b</div>'));

console.log('\n' + (fail ? ('  ' + fail + ' FAILED, ' + pass + ' passed') : ('  OK - all ' + pass + ' checks passed')) + '\n');
process.exit(fail ? 1 : 0);

'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the FRQ bootcamp repointing.
//
//  This is the one sheet in the whole repair that touches MONEY, so the rules
//  are about what may be offered rather than about markup:
//
//    - nothing may still sell live access to a session held in April 2026
//    - no specific 2027 bootcamp date may appear while nobody has set one
//    - the three retired tiers must be unpublished, never deleted
//
//  It runs against a FIXTURE of the live page rather than the storefront, so it
//  is offline and deterministic. Reading the real body is the generator's job.
//
//  Run: npm run smoke:csafrqbootcamp
// -----------------------------------------------------------------------------
const gen = require('../scripts/csa-frq-bootcamp-csv.js');
const spec = gen.spec;

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 240))); }
}
const section = (t) => console.log('\n' + t);

console.log('CSA FRQ bootcamp smoke');

section('1. the decision, as recorded');
ok('one product is for sale, the recording', !!spec.recording.handle && spec.recording.price === '29.99', spec.recording.price);
ok('three live-session tiers are retired', spec.retire.length === 3, spec.retire);
ok('no retired handle is also the new product', !spec.retire.includes(spec.recording.handle));
ok('no 2027 bootcamp date is set, so none may be printed', spec.live.liveDate === null, spec.live.liveDate);
ok('the spec is pure ASCII', !/[^\x00-\x7F]/.test(JSON.stringify(spec)));

section('2. the products sheet');
const rows = gen.productRows();
const H = ['Handle', 'Command', 'Title', 'Type', 'Vendor', 'Tags', 'Body HTML', 'Published', 'Variant Price'];
const col = (r, name) => r[H.indexOf(name)];
ok('one row per retired tier plus the recording', rows.length === spec.retire.length + 1, rows.length);
ok('every retired tier is set Published FALSE',
  spec.retire.every((h) => { const r = rows.find((x) => x[0] === h); return r && col(r, 'Published') === 'FALSE'; }));
ok('every row is MERGE, so nothing is deleted', rows.every((r) => col(r, 'Command') === 'MERGE'),
  rows.map((r) => col(r, 'Command')));
ok('no row carries a DELETE command', !rows.some((r) => /DELETE/i.test(r.join(' '))));
ok('a retired tier row carries no price, so unpublishing cannot reprice it',
  spec.retire.every((h) => col(rows.find((x) => x[0] === h), 'Variant Price') === ''));
const rec = rows.find((r) => r[0] === spec.recording.handle);
ok('the recording is published', col(rec, 'Published') === 'TRUE');
ok('the recording is priced at 29.99', col(rec, 'Variant Price') === '29.99', col(rec, 'Variant Price'));
ok('the recording body lists what is included',
  spec.recording.includes.every((f) => col(rec, 'Body HTML').indexOf(f) >= 0));
ok('the recording body names no specific 2027 day',
  !/\b(January|February|March|April|May|June)\s+\d{1,2},?\s*2027/.test(col(rec, 'Body HTML').replace(/May 12, 2027/g, ' ')),
  col(rec, 'Body HTML'));

section('3. the offer cards that replace the tiers');
const cards = gen.offerCards();
ok('exactly two cards, one to buy and one to wait for', (cards.match(/class="tier-card/g) || []).length === 2);
ok('the recording card links the new product', cards.indexOf('/products/' + spec.recording.handle) > 0);
ok('no card links a retired tier', !spec.retire.some((h) => cards.indexOf('/products/' + h) >= 0));
ok('the live card says it is not on sale', /Not on sale yet/.test(cards));
ok('the cards are pure ASCII', !/[^\x00-\x7F]/.test(cards), [...new Set((cards.match(/[^\x00-\x7F]/g) || []))]);
ok('the check glyph is an entity, not a raw character', cards.indexOf('&#10003;') > 0);
ok('the cards reuse the page\'s own classes rather than adding a stylesheet',
  cards.indexOf('<style') < 0 && /tier-grid|tier-header|tier-footer/.test(cards));

section('4. the page edits refuse rather than guess');
const edits = gen.pageEdits();
ok('every edit states a pattern it must find', edits.every((e) => e.findRe instanceof RegExp));
ok('every edit carries a reason', edits.every((e) => typeof e.why === 'string' && e.why.length > 10));
ok('nine edits, one per piece of stale copy', edits.length === 9, edits.length);
//  The generator's own refusal list is what stops a half-repointed page.
ok('the generator refuses a body that still sells a retired tier', (() => {
  try {
    const sf = require('../lib/storefront-fetch.js');
    const orig = sf.pageBody;
    sf.pageBody = () => ({ title: 'x', body_html: '<div>Book Now</div>' });
    try { gen.buildPage(); return false; } catch (e) { return /does not contain/.test(e.message); }
    finally { sf.pageBody = orig; }
  } catch (e) { return false; }
})());

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);

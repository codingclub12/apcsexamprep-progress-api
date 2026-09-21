'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DOES THIS GAME PAGE ESCAPE A PLAYER NAME, OR ONLY LOOK LIKE IT DOES?
//
//  Every game page carries its own copy of the shared leaderboard component,
//  pasted into the page body. One of those copies was found on 2026-09-21 with
//  its escaper collapsed to the identity map:
//
//      function esc(s){ return String(s).replace(/[&<>"]/g,
//        function(c){ return {'&':'&','<':'<','>':'>','"':'"'}[c]; }); }
//
//  Every branch returns the character it was given, so esc() is a no-op that
//  reads as a safety function. The name then reaches innerHTML:
//
//      '<div class="nm">' + esc(e.name || 'anon') + '</div>'
//
//  e.name is another player's stored name, read back from /api/game/board. So
//  one player's typed name executes in every later visitor's browser.
//
//  ── WHY THIS IS A PARSE AND NOT A GREP ─────────────────────────────────────
//  The obvious check is to grep for that exact literal. That check is worth
//  less than it looks, for two reasons this sweep has to survive:
//
//   1. The corruption is entity DECODING, which is a per-character accident.
//      A body can come back with '&' repaired and '<' still collapsed, and a
//      literal match reports such a page CLEAN while it is still exploitable.
//      So each of the four mappings is judged on its own.
//   2. A page with no leaderboard at all contains no esc() and no sink, and
//      matching nothing must not read the same as escaping correctly. ABSENT
//      and SAFE are different findings and are reported apart.
//
//  So the map is extracted and every key is compared to its value. A key that
//  maps to itself is a dead branch. A key that maps to an entity is real.
//
//  This is the repo's own convention biting: CONVENTIONS.md says no HTML
//  entities inside a <script> block, because the HTML parser decodes them
//  before JavaScript ever sees them. '&amp;' written in the map becomes '&'.
//  The fix is Unicode escapes ('&amp;') or DOM nodes with textContent.
//
//  Fetched through lib/storefront-fetch.js, which sends NO User-Agent and
//  refuses a body that is not a rendered storefront page, so "the string is
//  gone" can never pass because the fetch quietly drew a bot challenge.
//
//  Run: node scripts/sweep-game-esc-live.js [--json <path>]
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');

//  The registry is the authority on which games exist. Reading it rather than
//  restating it means a game added tomorrow is swept without touching this file.
function registryIds() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'game.js'), 'utf8');
  const m = src.match(/const REGISTRY = \{[\s\S]*?\n\};/);
  if (!m) throw new Error('could not locate REGISTRY in routes/game.js');
  const ids = [...m[0].matchAll(/^\s*'([a-z0-9-]+)':/gm)].map((x) => x[1]);
  if (ids.length < 10) throw new Error('registry parse returned only ' + ids.length + ' ids');
  return ids;
}

//  The 10 AP Networking games ship under their own handle prefix. Everything
//  else in the registry is a CSP or Big Idea 3 game under the CSP prefix.
const NETWORKING = new Set(['harden-first', 'address-autopsy', 'subnet-sprint', 'rule-order',
  'packet-path', 'log-hunt', 'guest-gate', 'segment-sort', 'shell-hop', 'ai-audit']);

const handleFor = (id) => (NETWORKING.has(id) ? 'ap-networking-game-' : 'ap-csp-game-') + id;

//  What a correct mapping looks like. A value is only accepted as escaping if
//  it is the named entity or a numeric reference for that character; anything
//  else, including the character itself, is a dead branch.
const ENTITY = {
  '&': /^(&amp;|&#0*38;|&#[xX]0*26;)$/,
  '<': /^(&lt;|&#0*60;|&#[xX]0*3[cC];)$/,
  '>': /^(&gt;|&#0*62;|&#[xX]0*3[eE];)$/,
  '"': /^(&quot;|&#0*34;|&#[xX]0*22;)$/,
};

//  A value in the page source is JavaScript source, not the string the browser
//  ends up with. The repair writes the map with Unicode escapes, '\u0026lt;',
//  precisely so an HTML parser cannot decode it on the way in, and a check that
//  compared raw source text would call every repaired page broken forever. So
//  the value is decoded the way JavaScript would decode it before it is judged.
function decodeJs(v) {
  return v.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

//  Pull the object literal out of an esc() body and return its pairs. Kept to a
//  narrow shape on purpose: this reads one known component, and a parser that
//  accepts more than the component can emit would be guessing.
function extractMaps(body) {
  const out = [];
  const re = /function\s+esc\s*\(([^)]*)\)\s*\{/g;
  let m;
  while ((m = re.exec(body))) {
    const tail = body.slice(m.index, m.index + 600);
    const obj = tail.match(/\{\s*(['"])&\1\s*:[\s\S]*?\}/);
    if (obj) {
      const pairs = {};
      const pr = /(['"])(.)\1\s*:\s*(['"])(.*?)\3/g;
      let p;
      while ((p = pr.exec(obj[0]))) pairs[decodeJs(p[2])] = decodeJs(p[4]);
      out.push({ at: m.index, pairs, raw: obj[0], form: 'map' });
      continue;
    }
    //  The SECOND authored shape, found on shell-hop: a chain of replaces
    //  rather than a lookup table, collapsed the same way. Reporting it as
    //  unparsed would have been honest but useless, and reporting it as safe
    //  would have been worse, so the chain is read as the mapping it is.
    const chain = tail.match(/return\s+String\(s\)((?:\s*\.replace\([\s\S]*?\))+)\s*;/);
    if (chain) {
      const pairs = {};
      const cr = /\.replace\(\/(.)\/g\s*,\s*(['"])([\s\S]*?)\2\)/g;
      let c;
      while ((c = cr.exec(chain[1]))) pairs[decodeJs(c[1])] = decodeJs(c[3]);
      if (Object.keys(pairs).length) {
        out.push({ at: m.index, pairs, raw: chain[0], form: 'chain' });
        continue;
      }
    }
    out.push({ at: m.index, pairs: null, raw: tail.slice(0, 200), form: null });
  }
  return out;
}

//  The sink that makes a broken escaper exploitable rather than merely wrong:
//  a leaderboard row built as a string and assigned to innerHTML.
const SINK = /<div class="nm">'\s*\+\s*esc\(/;

function classify(body) {
  const maps = extractMaps(body);
  const sink = SINK.test(body);
  if (!maps.length) return { state: sink ? 'SINK_NO_ESC' : 'ABSENT', sink, broken: [], maps: 0 };
  const broken = [];
  for (const mp of maps) {
    if (!mp.pairs) { broken.push('unparsed'); continue; }
    //  '&', '<' and '>' are the three that decide whether text can become an
    //  element, so all three must be present and must really escape. '"' only
    //  matters inside an attribute value; one authored shape here escapes the
    //  first three and never touches quotes, and calling that broken would be
    //  a false finding on code that is right for where its output goes.
    for (const k of ['&', '<', '>']) {
      const v = mp.pairs[k];
      if (v === undefined) broken.push(k + ':missing');
      else if (!ENTITY[k].test(v)) broken.push(k + (v === k ? ':identity' : ':' + JSON.stringify(v)));
    }
    const q = mp.pairs['"'];
    if (q !== undefined && !ENTITY['"'].test(q)) broken.push('"' + (q === '"' ? ':identity' : ':' + JSON.stringify(q)));
  }
  return { state: broken.length ? 'BROKEN' : 'SAFE', sink, broken, maps: maps.length };
}

function main() {
  const ids = registryIds();
  const jsonAt = process.argv.indexOf('--json');
  const results = [];
  console.log('Sweeping ' + ids.length + ' game pages for a collapsed esc() map.\n');
  for (const id of ids) {
    const handle = handleFor(id);
    let r;
    try {
      const res = sf.page('/pages/' + handle);
      r = classify(res.body);
      r.code = res.code;
      r.bytes = res.body.length;
    } catch (e) {
      r = { state: 'FETCH_FAILED', error: e.message, sink: false, broken: [], maps: 0 };
    }
    r.id = id;
    r.handle = handle;
    results.push(r);
    const flag = r.state === 'BROKEN' ? 'BROKEN' : r.state === 'SAFE' ? 'safe  ' : r.state;
    console.log('  ' + flag.padEnd(14) + handle.padEnd(42) +
      (r.state === 'BROKEN' ? 'sink=' + (r.sink ? 'yes' : 'no') + '  ' + r.broken.join(' ') : (r.error || '')));
  }
  const broken = results.filter((r) => r.state === 'BROKEN');
  const exploitable = broken.filter((r) => r.sink);
  const safe = results.filter((r) => r.state === 'SAFE');
  const other = results.filter((r) => !['BROKEN', 'SAFE'].includes(r.state));
  console.log('\n  ' + broken.length + ' BROKEN (' + exploitable.length + ' with the innerHTML sink), ' +
    safe.length + ' safe, ' + other.length + ' other, of ' + results.length + ' swept.');
  if (other.length) for (const o of other) console.log('    ' + o.state + ': ' + o.handle + ' ' + (o.error || ''));
  if (jsonAt > -1 && process.argv[jsonAt + 1]) {
    fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify({
      swept_at: new Date().toISOString(), total: results.length,
      broken: broken.length, exploitable: exploitable.length, safe: safe.length, results,
    }, null, 2));
    console.log('  wrote ' + process.argv[jsonAt + 1]);
  }
  process.exitCode = exploitable.length ? 1 : 0;
}

if (require.main === module) main();
module.exports = { classify, extractMaps, handleFor, registryIds, ENTITY, SINK, decodeJs };

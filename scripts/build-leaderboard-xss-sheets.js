'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CLOSE THE STORED XSS ON EVERY GAME PAGE THAT STILL BUILDS A LEADERBOARD ROW
//  OUT OF STRING CONCATENATION.
//
//  ── THE DEFECT ─────────────────────────────────────────────────────────────
//  Each game page carries its own pasted copy of the leaderboard component. In
//  the copy that 28 live pages still run, a row is assembled as HTML text and
//  assigned to innerHTML:
//
//      rows.innerHTML = entries.map(function(e,i){
//        return '...<div class="nm">'+esc(e.name||'anon')+'</div>...';
//      }).join('');
//
//  That is safe only if esc() escapes, and it does not. Its replacement map was
//  authored with HTML entities inside a <script> block, so the HTML parser
//  decoded them before JavaScript ever saw them and every branch now returns the
//  character it was handed:
//
//      {'&':'&','<':'<','>':'>','"':'"'}
//
//  e.name is another player's name, read back from /api/game/leaderboard. The
//  server truncates a submitted name to 16 characters but strips no markup, and
//  rows are concatenated into one innerHTML assignment, so two adjacent names
//  span a payload across the markup between them. One player's name therefore
//  runs in every later visitor's browser.
//
//  ── THE FIX IS A PORT, NOT AN INVENTION ────────────────────────────────────
//  The 10 AP Networking game pages already run the repaired renderer live: the
//  row is built from DOM nodes and the name goes in through textContent, which
//  is what this repo's CONVENTIONS.md requires. So the replacement is lifted
//  VERBATIM from a live networking page rather than written here, and the
//  script refuses to run if that reference page does not still contain it.
//  A fix already serving on 10 pages is better evidence than a fix that reads
//  correctly.
//
//  Two things are replaced per page:
//
//   1. The concat-and-innerHTML row builder, swapped for the DOM builder. This
//      is what closes the stored XSS. It also drops a raw emoji the old block
//      carried inline, which the pure-ASCII rule forbids.
//   2. esc() itself, rebuilt with UNICODE escapes ('\u0026lt;') instead of HTML
//      entities. esc() survives after the swap, feeding the "Playing as ..."
//      line with the viewer's own stored name, so leaving a dead escaper there
//      keeps a live self-XSS and keeps the trap that caused this. Unicode
//      escapes are the form the convention names, and they cannot be decoded by
//      an HTML parser on the way in.
//
//  ── WHAT THIS DOES NOT DO ──────────────────────────────────────────────────
//  It does not import. Matrixify import is a human step in this repo, and the
//  sheets ship SPLIT, one per section, because MERGE overwrites a live body
//  with no undo and the blast radius of one click is however many rows are in
//  the file.
//
//  Run: node scripts/build-leaderboard-xss-sheets.js [--out <dir>]
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const { registryIds, classify } = require('./sweep-game-esc-live');

//  A live page already running the repaired renderer. It is the source of the
//  replacement text and the proof the replacement works in production.
const REFERENCE = 'ap-networking-game-harden-first';

const NETWORKING = new Set(['harden-first', 'address-autopsy', 'subnet-sprint', 'rule-order',
  'packet-path', 'log-hunt', 'guest-gate', 'segment-sort', 'shell-hop', 'ai-audit']);

//  Where the Big Idea 3 block starts in the registry, so the sheets can split
//  the way a person would import them. Read from routes/game.js rather than
//  restated, for the same reason the ids are.
function sections() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'game.js'), 'utf8');
  const reg = src.match(/const REGISTRY = \{[\s\S]*?\n\};/)[0];
  const bi3 = reg.indexOf('// Big Idea 3 study games');
  const net = reg.indexOf('// AP Networking study games');
  if (bi3 < 0 || net < 0) throw new Error('registry section comments moved; split would be wrong');
  const at = (id) => reg.indexOf("'" + id + "':");
  return { of: (id) => (at(id) > net ? 'networking' : at(id) > bi3 ? 'bi3' : 'csp') };
}

//  Absent and unreadable are DIFFERENT and must never share a bucket. A page
//  that does not exist answers 404 with an empty body. A 200 carrying anything
//  but JSON is a failed fetch, and on the first run of this script that is
//  exactly what happened to two-sides, the page the whole finding is named
//  after: it came back as HTML and was filed as "no live page", which would
//  have quietly dropped the origin page from the repair. So a bad 200 is
//  retried and then raised, never skipped.
class NoSuchPage extends Error {}

function body(h, attempts = 3) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    const r = sf.raw('/pages/' + h + '.json');
    if (String(r.code) === '404') throw new NoSuchPage(h + ': no page at this handle (404)');
    if (String(r.code) === '200') {
      try {
        const j = JSON.parse(r.body);
        const p = j.page || j;
        if (typeof p.body_html === 'string') return p;
        last = 'a 200 with no body_html field';
      } catch (e) { last = 'a 200 that is not JSON (' + r.body.slice(0, 40).replace(/\s+/g, ' ') + ')'; }
    } else last = 'HTTP ' + r.code;
  }
  throw new Error(h + ': ' + attempts + ' attempts, last was ' + last);
}

//  Pull one balanced-ish block by its first and last line, so the replacement is
//  anchored on text rather than on an offset that drifts page to page.
function slice(src, startsWith, endsWith, label) {
  const i = src.indexOf(startsWith);
  if (i < 0) throw new Error('reference is missing its ' + label + ' opening');
  const j = src.indexOf(endsWith, i);
  if (j < 0) throw new Error('reference is missing its ' + label + ' closing');
  return src.slice(i, j + endsWith.length);
}

//  Non-ASCII codepoints present MORE often after the patch than before. Empty
//  means the patch added none, which is the only thing this change promises.
function added(before, after) {
  const tally = (s) => {
    const m = new Map();
    for (const ch of s) if (ch.codePointAt(0) > 127) m.set(ch, (m.get(ch) || 0) + 1);
    return m;
  };
  const b = tally(before); const a = tally(after);
  const out = [];
  for (const [ch, n] of a) {
    if (n > (b.get(ch) || 0)) out.push('U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));
  }
  return out;
}

function main(argv) {
  const outAt = argv.indexOf('--out');
  const outDir = outAt > -1 ? argv[outAt + 1]
    : path.join(__dirname, '..', 'imports', '2026-09-21');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('  Reading the repaired renderer from the live reference page ' + REFERENCE + '\n');
  const ref = body(REFERENCE).body_html;
  const GOOD_ROWS = slice(ref, "      rows.innerHTML = '';\n      entries.forEach(function(e,i){",
    '      });\n', 'row builder');
  if (/\.innerHTML\s*=\s*entries|esc\(e\.name/.test(GOOD_ROWS)) {
    throw new Error('the reference block still concatenates a name, so it is not the repaired one');
  }
  if (!/nmEl\.textContent\s*=\s*e\.name/.test(GOOD_ROWS)) {
    throw new Error('the reference block does not set the name through textContent');
  }

  //  The broken block, as it stands on the pages being repaired.
  const BAD_OPEN = '      rows.innerHTML = entries.map(function(e,i){';
  const BAD_CLOSE = "      }).join('');\n";

  //  esc() is repaired by swapping the MAP, not the function. One page carries
  //  two copies of the escaper formatted differently, one on a single line and
  //  one across five, and a replacement anchored on the whole function silently
  //  repaired only the copy it recognised. The map literal is identical in both
  //  and in every copy measured, so that is what is replaced.
  //
  //  The repaired map is written with UNICODE escapes. HTML entities inside a
  //  <script> block are decoded by the parser before JavaScript sees them, which
  //  is the accident that flattened these maps to the identity in the first
  //  place, and this repo's CONVENTIONS.md forbids them there for that reason.
  const BAD_MAP = '{\'&\':\'&\',\'<\':\'<\',\'>\':\'>\',\'"\':\'"\'}';
  const GOOD_MAP = '{\'&\':\'\\u0026amp;\',\'<\':\'\\u0026lt;\',' +
    '\'>\':\'\\u0026gt;\',\'"\':\'\\u0026quot;\'}';

  //  The other authored shape, on shell-hop: a chain of replaces collapsed the
  //  same way. It escapes three characters and never touches quotes, which is
  //  right for output that becomes element text, so the repair keeps the shape
  //  and only restores what each replace produces.
  const BAD_CHAIN = "String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')";
  const GOOD_CHAIN = "String(s).replace(/&/g, '\\u0026amp;')" +
    ".replace(/</g, '\\u0026lt;').replace(/>/g, '\\u0026gt;')";

  const sect = sections();
  //  The networking pages already run the repaired row builder, so only their
  //  escape map is still collapsed. They are swept anyway and shipped as their
  //  own sheet: a verifier that has to carry ten permanent exceptions is worth
  //  less than one that goes green, and the dead escaper still feeds the
  //  "Playing as ..." line with the viewer's own stored name.
  const ids = registryIds();
  const rows = { csp: [], bi3: [], networking: [] };
  const skipped = [];
  const problems = [];

  for (const id of ids) {
    const net = NETWORKING.has(id);
    const handle = (net ? 'ap-networking-game-' : 'ap-csp-game-') + id;
    let page;
    try {
      page = body(handle);
    } catch (e) {
      if (e instanceof NoSuchPage) { skipped.push(handle); continue; }
      problems.push(handle + ': ' + e.message);
      continue;
    }
    const src = page.body_html;

    //  Single occurrence is asserted for the row builder. esc() is allowed to
    //  repeat, because one page carries two copies of the component, but every
    //  copy present must be the broken one and all of them are replaced.
    //  A page that already carries the repaired builder needs only the map. A
    //  page that carries neither shape is not this component and is refused.
    const opens = src.split(BAD_OPEN).length - 1;
    const repaired = src.includes('nmEl.textContent = e.name');
    if (opens === 0 && !repaired) { problems.push(`${handle}: neither the broken nor the repaired row builder is present`); continue; }
    if (opens > 1) { problems.push(`${handle}: row builder appears ${opens} times, expected at most 1`); continue; }
    if (opens === 1 && repaired) { problems.push(`${handle}: carries both the broken and the repaired row builder`); continue; }
    const escCount = src.split(BAD_MAP).length - 1;
    const chainCount = src.split(BAD_CHAIN).length - 1;
    if (escCount + chainCount < 1) { problems.push(`${handle}: no collapsed escaper is present verbatim`); continue; }

    let out = src;
    if (opens === 1) {
      const bad = slice(src, BAD_OPEN, BAD_CLOSE, 'row builder');
      if (!bad.includes('esc(e.name')) { problems.push(`${handle}: row builder does not carry esc(e.name)`); continue; }
      out = out.split(bad).join(GOOD_ROWS);
    }
    out = out.split(BAD_MAP).join(GOOD_MAP);
    out = out.split(BAD_CHAIN).join(GOOD_CHAIN);

    //  Post-conditions, asserted per page rather than trusted.
    const checks = [
      [!out.includes('esc(e.name'), 'a name is still concatenated into markup'],
      [out.includes('nmEl.textContent = e.name'), 'the DOM row builder did not land'],
      //  The detector that found this bug is the authority on whether it is
      //  gone. Asserting on the strings this script happens to know about is
      //  how the second escape map on one page survived a run that reported
      //  every post-condition green.
      [classify(out).state === 'SAFE', 'the detector still reads an escaper as collapsed: ' + classify(out).broken.join(' ')],
      [classify(out).sink === false, 'a concatenated row sink survived'],
      [!out.includes(BAD_MAP), 'a collapsed escape map survived'],
      [!out.includes(BAD_CHAIN), 'a collapsed replace chain survived'],
      [out.split(GOOD_MAP).length - 1 === escCount, 'escape map replacement count changed'],
      [out.split(GOOD_CHAIN).length - 1 === chainCount, 'replace chain replacement count changed'],
      [out.length !== src.length, 'the body did not change at all'],
      //  Pure ASCII is the house rule, but 10 of these pages already carry
      //  arrows, bullets and emoji in their own prose, and repairing that on a
      //  security fix would widen the diff into content nobody asked about. So
      //  the assertion is the one that belongs to THIS patch: it may remove
      //  non-ASCII and must never add any.
      [!added(src, out).length, 'the patch introduces non-ASCII: ' + added(src, out).join(' ')],
      [!out.includes('\u2014') || src.includes('\u2014'), 'an em-dash is present'],
    ];
    const failed = checks.filter(([ok]) => !ok).map(([, m]) => m);
    if (failed.length) { problems.push(`${handle}: ${failed.join('; ')}`); continue; }

    rows[sect.of(id)].push({
      handle, published_at: page.published_at, before: src, after: out,
    });
  }

  if (problems.length) {
    console.error(`  ${problems.length} page(s) could not be patched. No file written:\n`);
    problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Body HTML', 'Published At'];
  const written = [];

  for (const [key, label] of [['csp', 'csp-games'], ['bi3', 'bi3-games'],
    ['networking', 'networking-games-escmap-only']]) {
    if (!rows[key].length) continue;
    const lines = [header.map(cell).join(',')];
    for (const r of rows[key]) {
      lines.push([r.handle, 'MERGE', r.after, r.published_at].map(cell).join(','));
    }
    const out = path.join(outDir, 'leaderboard-xss-fix-' + label + '.csv');
    fs.writeFileSync(out, '\ufeff' + lines.join('\r\n') + '\r\n');
    written.push({ out, key, count: rows[key].length });
  }

  //  PARSE THE SHEET BACK. Generation is not evidence that generation worked:
  //  the CSP sheet lost 90 bytes a page while every semantic check passed, and
  //  a parse-back diff is what caught it.
  let verified = 0;
  for (const w of written) {
    const parsed = parseCsv(fs.readFileSync(w.out, 'utf8').replace(/^\ufeff/, ''));
    const head = parsed.shift();
    if (head.join(',') !== header.join(',')) throw new Error(w.out + ': header did not survive the round trip');
    if (parsed.length !== w.count) throw new Error(`${w.out}: ${parsed.length} rows read back, ${w.count} written`);
    for (const rec of parsed) {
      const spec = rows[w.key].find((r) => r.handle === rec[0]);
      if (!spec) throw new Error(w.out + ': unknown handle read back: ' + rec[0]);
      if (rec[2] !== spec.after) throw new Error(rec[0] + ': body differs after the round trip');
      if (rec[1] !== 'MERGE') throw new Error(rec[0] + ': command is not MERGE');
      verified++;
    }
  }

  //  No page may appear in two sheets, which is how a split loses or doubles a
  //  page without anything announcing it.
  const all = written.flatMap((w) => rows[w.key].map((r) => r.handle));
  if (new Set(all).size !== all.length) throw new Error('a handle appears in more than one sheet');

  console.log('  Patched and verified ' + verified + ' page bodies.\n');
  for (const w of written) {
    console.log('    ' + path.basename(w.out) + '  ' + w.count + ' rows  ' +
      (fs.statSync(w.out).size / 1024).toFixed(0) + ' KB');
    for (const r of rows[w.key]) console.log('        ' + r.handle);
  }
  if (skipped.length) {
    console.log('\n  ' + skipped.length + ' registry ids answer 404, so they have no live page:');
    skipped.forEach((s) => console.log('    ' + s));
  }
  console.log('\n  Import settings: MERGE, QUOTE_ALL, utf-8-sig. ONE SHEET AT A TIME.');
  console.log('  After each import: node scripts/sweep-game-esc-live.js\n');
}

//  A small RFC4180 reader. Used only to read back what this script just wrote.
function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { parseCsv, REFERENCE, NETWORKING };

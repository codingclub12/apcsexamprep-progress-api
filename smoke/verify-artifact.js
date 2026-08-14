'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: verify-artifact. Runs every check against fixture HTML built in a temp
//  dir. OFFLINE - no network, no database, no dependencies.
//
//  The fixtures are the two real mis-closures: a JS-hidden stale banner, and a
//  phrase that lives only in an HTML comment. If either stops being detected,
//  the tool has lost the exact capability it was built for.
//
//  Run: npm run smoke:verify
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'verify-artifact.js');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-smoke-'));

let pass = 0, fail = 0;
const ok = (label, cond) => {
  if (cond) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}`); }
};

function fixture(name, html) {
  const p = path.join(DIR, name);
  fs.writeFileSync(p, html, 'utf8');
  return p;
}
// Renders a UTF-8 string as the garbage you get when its bytes are read back
// under a single-byte encoding. latin1 maps 0x80-0x9F to control characters;
// cp1252 maps them to punctuation instead, which is why the same source damage
// looks different depending on which one did the mis-decode.
const CP1252_HIGH = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
};
function mojibakeAs(encoding, text) {
  const bytes = Buffer.from(text, 'utf8');
  if (encoding === 'latin1') return bytes.toString('latin1');
  return Array.from(bytes)
    .map((b) => String.fromCharCode(CP1252_HIGH[b] !== undefined ? CP1252_HIGH[b] : b))
    .join('');
}

function run(file, ...args) {
  return execFileSync('node', [SCRIPT, file, ...args], { encoding: 'utf8' });
}

// ── fixture 1: the bootcamp banner shape ─────────────────────────────────────
const banner = `<!DOCTYPE html><html><head><title>Hub</title>
<meta name="description" content="${'x'.repeat(100)}"></head><body>
<!-- ===== AP BOOTCAMP SITE-WIDE BANNER paste into theme.liquid ===== -->
<style>#bc-wrap { color: red; }</style>
<!-- ===== AP BOOTCAMP SITE-WIDE BANNER paste into theme.liquid ===== -->
<style>#bc-wrap { color: red; }</style>
<div id="bc-wrap"><span>Live - Spring 2026</span><strong>MCQ Bootcamp Mar 25 2026</strong></div>
<script>var last=new Date('2026-03-27');if(new Date()>last){document.getElementById('bc-wrap').style.display='none';}</script>
<h1>Real Page Title</h1><p>Body copy here.</p></body></html>`;

console.log('\n1. JS-hidden stale banner (task 70 shape)');
const out1 = run(fixture('banner.html', banner), '--phrase', 'MCQ Bootcamp');
ok('finds the phrase in rendered markup', /in RENDERED MARKUP/.test(out1));
ok('refuses to claim a reader sees it', !/a reader sees this/.test(out1));
ok('warns that JS may hide it', /cannot run JS/.test(out1));
ok('flags the duplicated comment block', /comment x2/.test(out1));
ok('flags the duplicated style block', /style x2/.test(out1));
ok('reports a past date in body copy', /past date\(s\) in BODY COPY/.test(out1));

// ── fixture 2: phrase only in a comment ──────────────────────────────────────
const commentOnly = `<!DOCTYPE html><html><head><title>Join</title>
<meta name="description" content="${'y'.repeat(100)}"></head><body>
<!-- Paste this code in Shopify Admin: Online Store > Themes > Edit Code -->
<h1>Join a Class</h1><p>Enter the class code your teacher gave you.</p></body></html>`;

console.log('\n2. Phrase only in an HTML comment (task 82 shape)');
const out2 = run(fixture('join.html', commentOnly), '--phrase', 'Paste this code');
ok('reports comment-only, not visible', /shipped in comment only/.test(out2));
ok('says it is invisible to a reader', /invisible to a reader/.test(out2));
ok('does NOT report it as rendered markup', !/in RENDERED MARKUP/.test(out2));

// ── fixture 3: version pins must not be reported as stale copy ───────────────
const pins = `<!DOCTYPE html><html><head><title>P</title>
<meta name="description" content="${'z'.repeat(100)}"></head><body><h1>P</h1>
<script>fetch(u,{headers:{'revision':'2024-10-15'}});</script></body></html>`;

console.log('\n3. API version pins are noise, not stale copy');
const out3 = run(fixture('pins.html', pins));
ok('version pin is NOT flagged as body copy', !/past date\(s\) in BODY COPY/.test(out3));
ok('version pin is reported as info only', /probably fine/.test(out3));

// ── fixture 4: clean page produces no P0/P1 ──────────────────────────────────
const clean = `<!DOCTYPE html><html><head><title>Clean</title>
<meta name="description" content="${'a'.repeat(100)}"></head><body>
<h1>Only One Heading</h1><p>Nothing wrong here at all.</p></body></html>`;

console.log('\n4. A clean page is quiet');
const out4 = run(fixture('clean.html', clean));
ok('no P0 findings', !/\[P0\]/.test(out4));
ok('no P1 findings', !/\[P1\]/.test(out4));

// -- fixture 5: headings and missing meta ------------------------------------
const broken = `<!DOCTYPE html><html><head><title>B</title></head><body><h1>A</h1><h1>B</h1>`
  + `<p>Key points: first</p></body></html>`;

console.log('\n5. Headings and missing meta');
const out5 = run(fixture('broken.html', mojibakeAs('latin1', broken)));
ok('flags 2 h1 tags', /2 <h1> tags/.test(out5));
ok('flags the missing meta description', /no meta description/.test(out5));

// -- fixture 6: mojibake, in BOTH mis-decodings -------------------------------
//  This section exists because the first version of checkMojibake enumerated
//  cp1252 renderings only, and the suite that was meant to cover it built its
//  fixture with .toString('latin1') and then asserted nothing about mojibake.
//  The check was dead in exactly the case its own fixture produced. Both
//  encodings are asserted here, and a clean page is asserted quiet so the
//  detector cannot pass by flagging everything.
console.log('\n6. Mojibake is caught in both mis-decodings');

const withGlyphs = `<!DOCTYPE html><html><head><title>M</title>`
  + `<meta name="description" content="${'d'.repeat(100)}"></head><body><h1>H</h1>`
  + `<p>Key points: \u2022 first \u{1F3AF} target</p></body></html>`;

const out6a = run(fixture('moji-latin1.html', mojibakeAs('latin1', withGlyphs)));
ok('catches latin1-flavoured mojibake', /mojibake on \d+ line/.test(out6a));

const out6b = run(fixture('moji-cp1252.html', mojibakeAs('cp1252', withGlyphs)));
ok('catches cp1252-flavoured mojibake', /mojibake on \d+ line/.test(out6b));

const cleanAscii = `<!DOCTYPE html><html><head><title>C</title>`
  + `<meta name="description" content="${'a'.repeat(100)}"></head><body><h1>H</h1>`
  + `<p>Plain ASCII copy.</p></body></html>`;
ok('a clean ASCII page is not flagged', !/mojibake/.test(run(fixture('clean-ascii.html', cleanAscii))));

// Correctly-decoded accented text must not be mistaken for damage. Several of
// these glyphs sit inside the continuation class the detector matches on.
const accented = `<!DOCTYPE html><html><head><title>A</title>`
  + `<meta name="description" content="${'a'.repeat(100)}"></head><body><h1>H</h1>`
  + `<p>Le caf\u00e9 co\u00fbte 5\u20ac. \u00bfQu\u00e9 tal? El a\u00f1o pasado. `
  + `\u00abcitation\u00bb 90\u00b0 \u00b1 2</p></body></html>`;
ok('correctly-decoded accented text is NOT a false positive',
  !/mojibake/.test(run(fixture('accented.html', accented))));

// -- the tool must never render a verdict ----────────────────────────────────────
console.log('\n7. Evidence, never a verdict');
ok('every run states it is not a verdict', [out1, out2, out3, out4, out5]
  .every((o) => /reports evidence, not a verdict/.test(o)));
ok('never emits the word VERIFIED as a conclusion', ![out1, out2, out4]
  .some((o) => /\bVERIFIED\b/.test(o)));

// -- fixture 8: layer attribution is positional --------------------------------
//  Reporting WHICH LAYER a hit lives in is the whole promise of this tool, so it
//  gets its own section. The earlier implementation sliced 40 characters either
//  side of a hit and asked whether that window appeared inside the concatenated
//  blocks. A hit near the opening of a <script> produced a window straddling the
//  tag, which appears in no block, and was attributed to `body` - turning script
//  internals into a P1 "stale copy is shipping" finding. That is a false alarm of
//  exactly the kind this tool exists to prevent someone chasing.
console.log('\n8. Layer attribution is by position, not by a text window');

const meta100 = `<meta name="description" content="${'d'.repeat(100)}">`;

// A date immediately after the <script> open tag, with no version-pin keyword to
// rescue it. This is the bootcamp banner's own shape.
const dateInScript = `<!DOCTYPE html><html><head><title>S</title>${meta100}</head><body><h1>H</h1>`
  + `<script>var bannerEnds="2026-03-27";if(new Date()>bannerEnds){hide();}</scr` + `ipt>`
  + `<p>Clean body copy.</p></body></html>`;
const out8a = run(fixture('date-in-script.html', dateInScript));
ok('a date just inside <script> is NOT reported as body copy', !/in BODY COPY/.test(out8a));
ok('and it is reported as script-layer noise instead', /probably fine/.test(out8a));

// The same date in real body copy must still be a P1, or the fix above would be
// indistinguishable from silencing the check.
const dateInBody = `<!DOCTYPE html><html><head><title>B</title>${meta100}</head><body><h1>H</h1>`
  + `<p>Doors open 2026-03-27, see you there.</p></body></html>`;
const out8b = run(fixture('date-in-body.html', dateInBody));
ok('the same date in body copy IS still a P1', /in BODY COPY/.test(out8b));

// A commented-out script is a comment, not executable script.
const commentedScript = `<!DOCTYPE html><html><head><title>C</title>${meta100}</head><body><h1>H</h1>`
  + `<!-- <script>var old="2024-02-02";</scr` + `ipt> -->`
  + `<p>Body copy.</p></body></html>`;
const out8c = run(fixture('commented-script.html', commentedScript), '--json');
const parsed8c = JSON.parse(out8c)[0];
ok('a commented-out script is attributed to comment, not script',
  (parsed8c.stale_dates.find((d) => d.date === '2024-02-02') || {}).layer === 'comment');
ok('and it is treated as noise', (parsed8c.stale_dates.find((d) => d.date === '2024-02-02') || {}).noise === true);

// The layer must be named in the JSON, since the nightly sweep reads that and
// not the human report.
ok('every stale-date finding carries a layer',
  parsed8c.stale_dates.every((d) => ['body', 'comment', 'script', 'style'].includes(d.layer)),
  parsed8c.stale_dates.map((d) => d.layer));

fs.rmSync(DIR, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

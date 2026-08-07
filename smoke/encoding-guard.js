'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: text encoding guard.
//
//  WHY THIS EXISTS: on 2026-08-07 every non-ASCII character in five admin pages
//  was silently rewritten with its UTF-8 bytes read as latin-1 and re-encoded.
//  2202 characters became mojibake. The dashboard delta badges rendered
//  "a[box]2+11" instead of a triangle for hours, and nothing caught it, because
//  double-encoded text is still perfectly valid UTF-8. It parses, it lints, it
//  serves, every other suite passes. The only thing wrong with it is that it
//  means the wrong character, which no existing check looks at.
//
//  So this suite looks at exactly that. It turns a silent, human-eyeball-only
//  regression into a red build.
//
//  HOW IT DETECTS: double encoding is reversible. Decode the file as UTF-8, then
//  take any run beginning with one of the tell-tale lead characters and try to
//  encode it back through latin-1 or cp1252 and decode as UTF-8 again. If that
//  round trip succeeds and yields a DIFFERENT single character, the text was
//  double encoded and the round trip just recovered the original.
//
//  BOTH CODECS MATTER. The first version of this check tried cp1252 only and
//  reported the pages clean while the triangles were still broken: U+0096 (the
//  middle byte of a double-encoded triangle) has no cp1252 mapping, so the
//  attempt threw and the character was skipped. latin-1 maps every byte, so it
//  catches the control-character cases cp1252 cannot express.
//
//  Run: npm run smoke:encoding
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_EXT = new Set(['.html', '.js', '.md', '.json', '.css', '.yml', '.yaml']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'coverage', 'dist', 'build']);

// This file necessarily contains mojibake examples in its own self-test, and the
// scratch fixture is written deliberately corrupted. Neither is shipped text.
const SKIP_FILES = new Set([path.join(__dirname, 'encoding-guard.js')]);

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

// ── The detector ─────────────────────────────────────────────────────────────
//  Lead characters of a double-encoded sequence: U+00C2, U+00C3, U+00E2 are what
//  the first byte of a 2- or 3-byte UTF-8 character becomes once it has been
//  round-tripped through a single-byte codec.
const LEADS = new Set(['Â', 'Ã', 'â']);
const CODECS = ['latin1', 'binary'];

// Node has no cp1252, but latin1 covers every byte value, which is the strictly
// broader case and the one that actually occurred. Buffer 'latin1' and 'binary'
// are aliases; the second is kept only so a future codec can be added here.
function reverseOnce(chunk) {
  for (const codec of CODECS) {
    let buf;
    try {
      buf = Buffer.from(chunk, codec);
    } catch (e) {
      continue;
    }
    // Buffer.from(str,'latin1') truncates codepoints above 0xFF instead of
    // throwing, so verify the round trip is lossless before trusting it.
    if (buf.toString('latin1') !== chunk) continue;
    const decoded = buf.toString('utf8');
    // A successful reversal yields exactly one character and is not a no-op.
    // U+FFFD means the bytes were not valid UTF-8, so this was not mojibake.
    if ([...decoded].length === 1 && decoded !== chunk && !decoded.includes('�')) {
      return decoded;
    }
  }
  return null;
}

function detect(text) {
  const hits = [];
  for (let i = 0; i < text.length; i++) {
    if (!LEADS.has(text[i])) continue;
    for (const width of [3, 2]) {
      const chunk = text.slice(i, i + width);
      if (chunk.length < width) continue;
      const fixed = reverseOnce(chunk);
      if (fixed) {
        hits.push({ index: i, chunk, fixed });
        i += width - 1;
        break;
      }
    }
  }
  return hits;
}

// ── 1. The detector must fire on known-bad input ─────────────────────────────
//  A guard that cannot fail on a corrupted fixture is decoration. These are the
//  exact sequences that shipped to production, built from bytes so this file
//  stays readable and cannot itself be "fixed" by a well-meaning editor.
console.log('\nDetector self-test');
const corrupt = (bytes) => Buffer.from(bytes).toString('utf8');
const CASES = [
  ['up triangle',   [0xc3, 0xa2, 0xc2, 0x96, 0xc2, 0xb2], '▲'],
  ['down triangle', [0xc3, 0xa2, 0xc2, 0x96, 0xc2, 0xbc], '▼'],
  ['right arrow',   [0xc3, 0xa2, 0xc2, 0x86, 0xc2, 0x92], '→'],
  ['box drawing',   [0xc3, 0xa2, 0xc2, 0x94, 0xc2, 0x80], '─'],
  ['middle dot',    [0xc3, 0x82, 0xc2, 0xb7],             '·'],
  ['ellipsis',      [0xc3, 0xa2, 0xc2, 0x80, 0xc2, 0xa6], '…'],
  ['check mark',    [0xc3, 0xa2, 0xc2, 0x9c, 0xc2, 0x93], '✓'],
];
for (const [label, bytes, expected] of CASES) {
  const hits = detect('prefix ' + corrupt(bytes) + ' suffix');
  ok('detects double-encoded ' + label,
    hits.length === 1 && hits[0].fixed === expected,
    hits.map((h) => h.fixed));
}

// ── 2. The detector must NOT fire on correct text ─────────────────────────────
//  Equally important: a guard that flags healthy text would be turned off within
//  a day. Correct versions of the same characters, plus genuinely accented Latin
//  text, must all come back clean.
console.log('\nFalse-positive check');
const CLEAN = [
  ['the correct characters', '▲ ▼ → ← ─ · … ✓ •'],
  ['accented latin text', 'café naïve âme rôle straße señor'],
  ['plain ascii', 'the quick brown fox, 100% of it'],
  ['an em dash and quotes', '— “quoted” ‘single’'],
];
for (const [label, text] of CLEAN) {
  const hits = detect(text);
  ok('no false positive on ' + label, hits.length === 0, hits.map((h) => h.chunk + ' -> ' + h.fixed));
}

// ── 3. The repository itself must be clean ────────────────────────────────────
console.log('\nRepository scan');
function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (SCAN_EXT.has(path.extname(entry.name)) && !SKIP_FILES.has(full)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(ROOT, []);
const offenders = [];
let scanned = 0;
for (const file of files) {
  let text;
  try {
    const raw = fs.readFileSync(file);
    // Anything that is not valid UTF-8 is a different problem; skip it here
    // rather than report a misleading mojibake hit.
    text = raw.toString('utf8');
    if (Buffer.compare(Buffer.from(text, 'utf8'), raw) !== 0) continue;
  } catch (e) {
    continue;
  }
  scanned += 1;
  const hits = detect(text);
  if (hits.length) {
    const rel = path.relative(ROOT, file);
    const byChar = {};
    for (const h of hits) byChar[h.fixed] = (byChar[h.fixed] || 0) + 1;
    const line = text.slice(0, hits[0].index).split('\n').length;
    offenders.push({ file: rel, count: hits.length, first_line: line, chars: byChar });
  }
}

ok('scanned a meaningful number of files', scanned > 20, scanned);
ok('no double-encoded text anywhere in the repository', offenders.length === 0);

if (offenders.length) {
  console.log('\n  Double-encoded text found. These characters mean something other');
  console.log('  than what they render as. Repair them rather than deleting them:\n');
  for (const o of offenders) {
    const chars = Object.entries(o.chars).map(([c, n]) => c + ' x' + n).join(', ');
    console.log('    ' + o.file + ':' + o.first_line + '  ' + o.count + ' occurrence(s)  -> ' + chars);
  }
  console.log('\n  Each one is a character whose UTF-8 bytes were read as latin-1 and');
  console.log('  re-encoded. The fix is to reverse that, not to retype the file.\n');
}

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);

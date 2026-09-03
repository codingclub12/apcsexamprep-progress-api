'use strict';
// ---------------------------------------------------------------------------
//  RESTORE THE PALETTE THE 1.1 LAB REFERENCES AND NEVER DECLARES.
//
//      node scripts/fix-cyber-lab11-palette.js <admin-body.html> <out.csv>
//
//  ── THE DEFECT ─────────────────────────────────────────────────────────────
//  ap-cyber-unit-1-lesson-1-lab reads ten CSS custom properties and defines
//  none of them. An undefined var() is invalid at computed-value time, which
//  drops the WHOLE declaration rather than just the colour, so:
//
//    .check-btn   background:var(--purple)  ->  transparent, while
//                 color:#ffffff and -webkit-text-fill-color:#ffffff stay,
//                 on .lab-section{background:#ffffff}.
//                 White text on a white card. The button is invisible.
//    .analysis-field select/textarea
//                 border:1px solid var(--purple-border)  ->  the shorthand is
//                 invalid, so border becomes none. The inputs lose their edges.
//    .exam-tip    border-left:4px solid var(--purple)  ->  same, no accent bar.
//    .email-specimen, .rubric-table, .feedback.correct, .results-score all
//                 lose their backgrounds or borders the same way.
//
//  Reported by a teacher as "the check answer per email is invisible because of
//  coloring". Measured across all 108 cyber activity pages: this is the only
//  one affected. The other 107 declare their palette on their own wrapper.
//
//  ── WHERE THE VALUES COME FROM ─────────────────────────────────────────────
//  Not invented. Two independent sources agree:
//
//  1. The sibling Unit 1 activity pages declare the same palette on their own
//     wrapper (#cyber-ex1-12), live today, and the 1.1 lab's header comment
//     says "Purple theme matching course hub + all lesson pages".
//  2. This file's own surviving rgba() literals, which were written alongside
//     the var() references and never depended on them:
//         rgba(107,33,168,0.15)  focus ring beside border-color:var(--purple)
//         rgba(124,58,237,0.12)  = #7C3AED = --purple-mid
//         rgba(168,85,247,*)     = #A855F7 = --purple-light
//         rgba(30,27,75,0.3)     = #1E1B4B = --dark
//
//  ── WHY THE BODY COMES FROM THE ADMIN API ──────────────────────────────────
//  Cloudflare rewrites this page's phishing specimens at serve time: every
//  From: and To: address becomes an email-protection link reading
//  "[email protected]". A sheet built from the rendered page would import that
//  and destroy the four specimens the lab teaches from. Diffed and confirmed:
//  the ONLY difference between the Admin body and the scrape is those four
//  pairs of addresses plus Cloudflare's decoder script.
//
//  Zero PII: author content only. Pure ASCII, no em-dashes, per convention.
// ---------------------------------------------------------------------------
const fs = require('fs');

const HANDLE = 'ap-cyber-unit-1-lesson-1-lab';
const TITLE = 'AP Cybersecurity 1.1 Lab: Tactic and Impact Analysis';
const WRAPPER = '#cyber-lab-11';

//  The ten this page actually reads, and nothing else. The sibling palette also
//  carries --gray and --green, which this page never references; carrying them
//  would widen the change for no reason.
const PALETTE = {
  '--purple': '#6B21A8',
  '--purple-mid': '#7C3AED',
  '--purple-light': '#A855F7',
  '--purple-bg': '#F5F0FF',
  '--purple-border': '#DDD6FE',
  '--dark': '#1E1B4B',
  '--gray-light': '#F9FAFB',
  '--gray-border': '#E5E7EB',
  '--green-bg': '#F0FDF4',
  '--green-border': '#BBF7D0',
};

const BLOCK = [
  '',
  '/* ===== PALETTE =====',
  '   Every rule below reads these. They were referenced but never declared, so',
  '   each var() was invalid at computed-value time and took its whole',
  '   declaration with it: .check-btn lost its background and rendered white on',
  '   white, and every bordered element lost its border. Values match the',
  '   sibling Unit 1 activity pages and this file\'s own rgba() literals. */',
  WRAPPER + '{',
  '  --purple:#6B21A8;--purple-mid:#7C3AED;--purple-light:#A855F7;',
  '  --purple-bg:#F5F0FF;--purple-border:#DDD6FE;',
  '  --dark:#1E1B4B;--gray-light:#F9FAFB;--gray-border:#E5E7EB;',
  '  --green-bg:#F0FDF4;--green-border:#BBF7D0;',
  '}',
].join('\n');

function usedVars(s) {
  return new Set([...s.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1]));
}
function definedVars(s) {
  return new Set([...s.matchAll(/(?:^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]));
}

function transform(before) {
  const problems = [];

  //  Refuse anything that is not the page this script was written against.
  if (!before.includes('id="cyber-lab-11"')) problems.push('body does not carry the ' + WRAPPER + ' wrapper');

  //  The body carries TWO style blocks: the widget's own and a separate one for
  //  #apcyber-activity-nav. Taking the first <style> was enough by luck of
  //  ordering, and mutation testing said so: breaking the first opener let the
  //  transform sail on into the nav block. Find the block that actually holds
  //  the widget's rules instead, so the guard asserts the intent rather than
  //  the layout.
  //  The offset just INSIDE the opening tag, so an opener carrying attributes
  //  is handled by measuring it rather than by assuming it spells "<style>".
  let insertAt = -1;
  for (const m of before.matchAll(/<style[^>]*>/g)) {
    const open = m.index + m[0].length;
    const close = before.indexOf('</style>', open);
    if (close !== -1 && before.slice(open, close).includes(WRAPPER + ' ')) { insertAt = open; break; }
  }
  if (insertAt === -1) problems.push('no <style> block in this body contains ' + WRAPPER + ' rules');

  const used = usedVars(before);
  const def = definedVars(before);
  if (def.size !== 0) {
    problems.push('body already defines ' + def.size + ' custom propert(ies) ('
      + [...def].join(' ') + '), so this fix has already landed or the page has changed');
  }
  const missing = [...used].filter((u) => !PALETTE[u]).sort();
  if (missing.length) problems.push('body reads ' + missing.join(' ') + ', which this palette does not supply');
  const unusedHere = Object.keys(PALETTE).filter((p) => !used.has(p)).sort();
  if (unusedHere.length) problems.push('palette supplies ' + unusedHere.join(' ') + ', which the body never reads');

  if (problems.length) return { problems };

  //  ONE insertion, immediately inside the opening <style>. Nothing else moves.
  const at = insertAt;
  const after = before.slice(0, at) + BLOCK + before.slice(at);

  //  Prove the edit is exactly the edit: strip the inserted block back out and
  //  require the original bytes. This catches a bad offset or a stray replace
  //  in a way that eyeballing the diff does not.
  const rebuilt = after.slice(0, at) + after.slice(at + BLOCK.length);
  if (rebuilt !== before) problems.push('removing the inserted block does not restore the original body');
  if (after.length - before.length !== BLOCK.length) problems.push('byte delta is not the length of the inserted block');

  const defAfter = definedVars(after);
  const stillUndef = [...usedVars(after)].filter((u) => !defAfter.has(u)).sort();
  if (stillUndef.length) problems.push('after the edit these are still undefined: ' + stillUndef.join(' '));
  if (after.split(WRAPPER + '{').length - 1 !== 1) {
    problems.push('expected exactly one "' + WRAPPER + '{" rule after the edit');
  }
  //  The convention this repo ships under.
  if (/[—–]/.test(BLOCK)) problems.push('inserted block contains a dash character that is not ASCII');
  if (/[^\x00-\x7F]/.test(BLOCK)) problems.push('inserted block is not pure ASCII');

  return problems.length ? { problems } : { after, undefBefore: [...used].sort(), definedAfter: [...defAfter].sort() };
}

//  A reader that did not write the file, so the parse-back diff means something.
function parseCsv(text) {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function main(argv) {
  const [src, out] = argv;
  if (!src || !out) {
    console.error('usage: node scripts/fix-cyber-lab11-palette.js <admin-body.html> <out.csv>');
    process.exit(2);
  }
  const before = fs.readFileSync(src, 'utf8');
  const r = transform(before);
  if (r.problems) {
    console.error('\n  Refused, nothing written:');
    for (const p of r.problems) console.error('    ' + p);
    console.error('');
    process.exit(1);
  }

  //  QUOTE_ALL means the header too: matrixify-preflight refuses a line that is
  //  not fully quoted, and it is right to, because the rule is about the file
  //  rather than about which rows happen to contain a comma. MERGE, not UPDATE,
  //  per the repo convention and the preflight's own default.
  const cell = (x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
  const csv = [['Handle', 'Command', 'Title', 'Body HTML'].map(cell).join(',')]
    .concat([[cell(HANDLE), cell('MERGE'), cell(TITLE), cell(r.after)].join(',')])
    .join('\r\n') + '\r\n';
  const withBom = '﻿' + csv;

  //  PARSE IT BACK. Generation is not evidence that generation worked.
  const rows = parseCsv(withBom);
  const fails = [];
  if (rows.length !== 2) fails.push('expected a header and one data row, parsed ' + rows.length);
  else {
    const [h, d] = rows;
    if (h.join(',') !== 'Handle,Command,Title,Body HTML') fails.push('header row parsed back as ' + h.join(','));
    if (d[0] !== HANDLE) fails.push('handle parsed back as ' + d[0]);
    if (d[1] !== 'MERGE') fails.push('command parsed back as ' + d[1]);
    if (d[2] !== TITLE) fails.push('title parsed back as ' + d[2]);
    if (d[3] !== r.after) {
      fails.push('body does not survive the round trip: wrote ' + r.after.length
        + ' chars, parsed back ' + (d[3] || '').length);
    }
  }
  if (fails.length) {
    console.error('\n  Parse-back diff failed, nothing written:');
    for (const f of fails) console.error('    ' + f);
    console.error('');
    process.exit(1);
  }

  fs.writeFileSync(out, withBom);
  //  The preflight cannot tell an emoji this sheet INTRODUCED from one the live
  //  page already had, so it refuses unless it is handed the original. This is
  //  that original, straight from the Admin API body this run read.
  const carrying = out.replace(/\.csv$/, '') + '.carrying.json';
  fs.writeFileSync(carrying, JSON.stringify({ [HANDLE]: before }));
  console.log('\n  ' + HANDLE);
  console.log('    was undefined : ' + r.undefBefore.join(' '));
  console.log('    now defined   : ' + r.definedAfter.length + ' propert(ies), 0 unresolved');
  console.log('    body          : ' + before.length + ' -> ' + r.after.length
    + ' chars (+' + (r.after.length - before.length) + ', one inserted rule)');
  console.log('    parse-back    : header and body identical to what was written');
  console.log('\n  wrote ' + out + '  (' + (Buffer.byteLength(withBom) / 1024).toFixed(0) + ' KB)');
  console.log('  wrote ' + carrying + '  (the pre-edit body, for --carrying)\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { transform, parseCsv, PALETTE, BLOCK, HANDLE, TITLE };

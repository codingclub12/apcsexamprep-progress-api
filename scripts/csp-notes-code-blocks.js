'use strict';
// -----------------------------------------------------------------------------
//  Pull the pseudocode out of the sentences on the 3.9 guided notes.
//
//  ── WHY THIS IS NOT THE SAME JOB AS beginner-style-patch.js ─────────────────
//  That script reformats code that already sits in a code block. Fifteen
//  one-liners on this page do not: they are inside a sentence ("A classmate
//  rewrites IF(x > 5) { y <- true } ELSE { y <- false } as y <- x > 5"), or in
//  one column of a two-column comparison table.
//
//  Expanding those in place would put a nine-line block in the middle of a
//  sentence, which is worse reading than the one-liner it replaced. So the code
//  comes OUT of the sentence and becomes a real <pre class="code ps"> block, the
//  same furniture the rest of the page already uses for pseudocode. The prose
//  keeps its meaning and loses the code; the code gets the layout a beginner
//  would actually write.
//
//  ── WHY EVERY EDIT IS SPELLED OUT ───────────────────────────────────────────
//  These are editorial rewrites of author prose, not a mechanical
//  transformation, so there is no rule that produces them. Each one is written
//  here in full and asserted to apply exactly once. A page that changed under us
//  fails loudly rather than being half-edited.
//
//  Run: node scripts/csp-notes-code-blocks.js <patched-body.html> <out.csv>
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { findOneLiners } = require('../lib/beginner-style');

const HANDLE = 'ap-csp-topic-3-9-guided-notes';
const TITLE = 'AP CSP Topic 3.9 Guided Notes - Developing Algorithms';
const PUBLISHED_AT = '2026-03-01 12:00:00';

// A pseudocode block in this page's own house style.
function ps(lines) {
  return '<pre class="code ps">' + lines.join('\n') + '</pre>';
}
function ifElse(cond, a, b) {
  return ['IF(' + cond + ')', '{', '  ' + a, '}', 'ELSE', '{', '  ' + b, '}'];
}

const EDITS = [
  // Day 1 bell ringer: two snippets described inside one paragraph.
  [`<p>Two teammates each wrote a snippet to award a 'Perfect Run' badge. Both start with finished ← true and noDamage ← true. Snippet A: IF(finished) { IF(noDamage) { badge ← true } }. Snippet B: IF(finished) { badge ← true } IF(noDamage) { badge ← true }. Trace both with those values, then trace both again with finished ← true, noDamage ← false.</p>`,
    `<p>Two teammates each wrote a snippet to award a 'Perfect Run' badge. Both start with finished ← true and noDamage ← true.</p>\n`
    + `<p class="label">Snippet A</p>\n`
    + ps(['IF(finished)', '{', '  IF(noDamage)', '  {', '    badge ← true', '  }', '}']) + '\n'
    + `<p class="label">Snippet B</p>\n`
    + ps(['IF(finished)', '{', '  badge ← true', '}', 'IF(noDamage)', '{', '  badge ← true', '}']) + '\n'
    + `<p>Trace both with those values, then trace both again with finished ← true, noDamage ← false.</p>`],

  // The similar-looking-algorithms comparison, same shape.
  [`<p class="muted">Two snippets each try to report the higher score. Algo A: IF(a &gt; b){DISPLAY(a)} IF(b &gt; a){DISPLAY(b)}. Algo B: IF(a ≥ b){DISPLAY(a)} ELSE {DISPLAY(b)}. Fill in what each DISPLAYs for each input — watch the tie.</p>`,
    `<p class="muted">Two snippets each try to report the higher score.</p>\n`
    + `<p class="label">Algo A</p>\n`
    + ps(['IF(a &gt; b)', '{', '  DISPLAY(a)', '}', 'IF(b &gt; a)', '{', '  DISPLAY(b)', '}']) + '\n'
    + `<p class="label">Algo B</p>\n`
    + ps(ifElse('a ≥ b', 'DISPLAY(a)', 'DISPLAY(b)')) + '\n'
    + `<p class="muted">Fill in what each DISPLAYs for each input — watch the tie.</p>`],

  // Fill-in-the-blank list item.
  [`<li>IF(cond) { flag ← true } ELSE { flag ← false } is exactly equivalent to <span class="gap"></span>.</li>`,
    `<li>This conditional:\n` + ps(ifElse('cond', 'flag ← true', 'flag ← false'))
    + `\nis exactly equivalent to <span class="gap"></span>.</li>`],

  // AP TIP card.
  [`<div class="card"><p>AP TIP: To expand a Boolean back to a conditional (L.4), wrap it: IF(expr) { x ← true } ELSE { x ← false }. To collapse a conditional to a Boolean (L.3), keep just the condition.</p></div>`,
    `<div class="card"><p>AP TIP: To expand a Boolean back to a conditional (L.4), wrap it:</p>\n`
    + ps(ifElse('expr', 'x ← true', 'x ← false'))
    + `\n<p>To collapse a conditional to a Boolean (L.3), keep just the condition.</p></div>`],

  // The two-column equivalence table. The right column is already a single line
  // with no braces, so the pairing survives the left column getting taller.
  [`<td>IF(score ≥ 60) { passed ← true } ELSE { passed ← false }</td>`,
    `<td>` + ps(ifElse('score ≥ 60', 'passed ← true', 'passed ← false')) + `</td>`],
  [`<td>IF(lives = 0) { gameOver ← true } ELSE { gameOver ← false }</td>`,
    `<td>` + ps(ifElse('lives = 0', 'gameOver ← true', 'gameOver ← false')) + `</td>`],
  [`<td>IF(coins ≥ 100) { win ← true } ELSE { win ← false }</td>`,
    `<td>` + ps(ifElse('coins ≥ 100', 'win ← true', 'win ← false')) + `</td>`],
  [`<td>IF(NOT ready) { waiting ← true } ELSE { waiting ← false }</td>`,
    `<td>` + ps(ifElse('NOT ready', 'waiting ← true', 'waiting ← false')) + `</td>`],

  // Stop-and-think prompts.
  [`<li>Collapse this conditional to a single Boolean expression: IF(health &gt; 0) { alive ← true } ELSE { alive ← false }.<span class="wline"></span>`,
    `<li>Collapse this conditional to a single Boolean expression:\n`
    + ps(ifElse('health &gt; 0', 'alive ← true', 'alive ← false')) + `<span class="wline"></span>`],
  [`<li>A classmate rewrites IF(x &gt; 5) { y ← true } ELSE { y ← false } as y ← x &gt; 5 and claims it is a DIFFERENT algorithm because it looks nothing alike.`,
    `<li>A classmate rewrites this conditional:\n`
    + ps(ifElse('x &gt; 5', 'y ← true', 'y ← false'))
    + `\nas y ← x &gt; 5 and claims it is a DIFFERENT algorithm because it looks nothing alike.`],

  // Day 2 bell ringer.
  [`<p>Here is a correct algorithm that finds the larger of two scores: IF(a &gt; b) { result ← a } ELSE { result ← b }. Do NOT rewrite it from scratch. Change as little as possible to make it find the SMALLER score instead.</p>`,
    `<p>Here is a correct algorithm that finds the larger of two scores.</p>\n`
    + ps(ifElse('a &gt; b', 'result ← a', 'result ← b')) + '\n'
    + `<p>Do NOT rewrite it from scratch. Change as little as possible to make it find the SMALLER score instead.</p>`],
];

function apply(body) {
  let out = body;
  const missed = [];
  for (const [before, after] of EDITS) {
    const n = out.split(before).length - 1;
    if (n !== 1) { missed.push(`${n} occurrence(s) of: ${before.slice(0, 70)}`); continue; }
    out = out.replace(before, after);
  }
  return { body: out, missed };
}

function main(argv) {
  const [src, out] = argv;
  if (!src || !out) {
    console.error('usage: node scripts/csp-notes-code-blocks.js <patched-body.html> <out.csv>');
    process.exit(2);
  }
  const body = fs.readFileSync(src, 'utf8');
  const r = apply(body);
  const problems = [...r.missed];

  // Nothing may be left outside a code block once this has run.
  const outside = r.body.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, '');
  const left = (outside.match(/IF\([^)]*\)\s*\{/g) || []).length;
  if (left) problems.push(`${left} pseudocode one-liner(s) still outside a code block`);

  // And every code block has to be properly laid out.
  const inBlocks = [];
  (r.body.match(/<pre class="[^"]*\bps\b[^"]*">[\s\S]*?<\/pre>/g) || [])
    .forEach((b) => findOneLiners(b, 'pseudo').forEach((h) => inBlocks.push(h.text)));
  if (inBlocks.length) problems.push(`${inBlocks.length} one-liner(s) inside a code block: ${inBlocks[0]}`);

  if ((r.body.match(/<div/g) || []).length !== (r.body.match(/<\/div>/g) || []).length) {
    problems.push('the div tags no longer balance');
  }
  if (Buffer.byteLength(r.body) <= Buffer.byteLength(body)) {
    problems.push('the result is not larger than the input, so nothing was expanded');
  }

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    problems.forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', TITLE, r.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');
  console.log(`    ${HANDLE}  ${EDITS.length} prose and table edits  ->  ${(Buffer.byteLength(r.body) / 1024).toFixed(0)} KB`);
  console.log(`\n  wrote ${out}\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { apply, EDITS };

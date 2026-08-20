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
//  ── WHAT IS DELIBERATELY LEFT ALONE ─────────────────────────────────────────
//  Metasyntax. `IF(condition){ block }` in a summary bullet, or an <h3> reading
//  `PROCEDURE name(params) { block }`, is the GRAMMAR being named, the way a
//  textbook writes "the form is if (cond) { ... }". No student writes those, so
//  there is nothing to model, and expanding a heading into four lines destroys
//  the heading. Only concrete code, the kind a student traces or copies, is
//  lifted out.
//
//  ── WHY EVERY EDIT IS SPELLED OUT ───────────────────────────────────────────
//  These are editorial rewrites of author prose, not a mechanical
//  transformation, so there is no rule that produces them. Each one is written
//  here in full and asserted to apply exactly once. A page that changed under us
//  fails loudly rather than being half-edited.
//
//  Run: node scripts/csp-notes-code-blocks.js <patched-body.html> <out.csv> [handle]
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { findOneLiners } = require('../lib/beginner-style');

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

// 3.6, Conditionals. Twelve one-liners, eight of them concrete and four of them
// metasyntax that stays. Every one sits inside a sentence.
const EDITS_3_6 = [
  [`<p class="muted">For the statement IF(height ≥ 48){ DISPLAY("Board the ride") }, evaluate the condition for each height, then decide whether the block runs and what is displayed. '(nothing)' means no action was taken.</p>`,
    `<p class="muted">For this statement:</p>\n` + ps(['IF(height ≥ 48)', '{', '  DISPLAY("Board the ride")', '}'])
    + `\n<p class="muted">evaluate the condition for each height, then decide whether the block runs and what is displayed. '(nothing)' means no action was taken.</p>`],

  [`<li>A classmate writes IF(score &lt; 60){ DISPLAY("Study more") } and asks what happens when score is 72. Answer precisely, and name the rule you used.<span class="wline"></span>`,
    `<li>A classmate writes this:\n` + ps(['IF(score &lt; 60)', '{', '  DISPLAY("Study more")', '}'])
    + `\nand asks what happens when score is 72. Answer precisely, and name the rule you used.<span class="wline"></span>`],

  [`<p><strong>Before next class:</strong> Before tomorrow, predict it: score ← 55, then IF(score ≥ 60){ DISPLAY("Pass") } ELSE { DISPLAY("Retake") }. Write down what is displayed, and why.</p>`,
    `<p><strong>Before next class:</strong> Before tomorrow, predict it. With score ← 55:</p>\n`
    + ps(ifElse('score ≥ 60', 'DISPLAY("Pass")', 'DISPLAY("Retake")'))
    + `\n<p>Write down what is displayed, and why.</p>`],

  [`<p>Yesterday's teaser, now decide it. The program runs: score ← 55, then IF(score ≥ 60){ DISPLAY("Pass") } ELSE { DISPLAY("Retake") }. Three classmates predict the output will be Pass, Retake, and 'both Pass and Retake.'</p>`,
    `<p>Yesterday's teaser, now decide it. The program runs, with score ← 55:</p>\n`
    + ps(ifElse('score ≥ 60', 'DISPLAY("Pass")', 'DISPLAY("Retake")'))
    + `\n<p>Three classmates predict the output will be Pass, Retake, and 'both Pass and Retake.'</p>`],

  [`<li>Rewrite this plain IF so the false case is handled: IF(balance &lt; 0){ DISPLAY("Overdrawn") }. Add an ELSE that displays "OK", and state which branch runs when balance is 25.<span class="wline"></span>`,
    `<li>Rewrite this plain IF so the false case is handled:\n` + ps(['IF(balance &lt; 0)', '{', '  DISPLAY("Overdrawn")', '}'])
    + `\nAdd an ELSE that displays "OK", and state which branch runs when balance is 25.<span class="wline"></span>`],

  [`<p class="muted">For IF(height ≥ 48){ DISPLAY("Board the ride") } ELSE { DISPLAY("Grow a bit more") }, evaluate the condition for each height, name the branch taken, and give what is displayed.</p>`,
    `<p class="muted">For this statement:</p>\n`
    + ps(ifElse('height ≥ 48', 'DISPLAY("Board the ride")', 'DISPLAY("Grow a bit more")'))
    + `\n<p class="muted">evaluate the condition for each height, name the branch taken, and give what is displayed.</p>`],

  [`<li>Trace: n ← 12, IF(n MOD 2 = 0){ DISPLAY("Even") } ELSE { DISPLAY("Odd") }. Evaluate the condition first, then give the output.<span class="wline"></span>`,
    `<li>Trace it with n ← 12:\n` + ps(ifElse('n MOD 2 = 0', 'DISPLAY("Even")', 'DISPLAY("Odd")'))
    + `\nEvaluate the condition first, then give the output.<span class="wline"></span>`],

  [`<li>For IF(price ≤ 20){ DISPLAY("Budget") } ELSE { DISPLAY("Premium") }, give the output when price = 20 and when price = 21, and explain what the boundary shows.<span class="wline"></span>`,
    `<li>For this statement:\n` + ps(ifElse('price ≤ 20', 'DISPLAY("Budget")', 'DISPLAY("Premium")'))
    + `\ngive the output when price = 20 and when price = 21, and explain what the boundary shows.<span class="wline"></span>`],
];

// 3.13, Developing Procedures. Three concrete one-liners; the reference-sheet
// PROCEDURE forms in the headings and summary bullets are metasyntax and stay.
const EDITS_3_13 = [
  [`<p><strong>Before next class:</strong> Before tomorrow, predict it: a procedure runs IF(quantity = 0){ RETURN(0) } and then RETURN(price * quantity). What does it return for charge(5, 0), and does the second RETURN ever run? Write your answer and your reasoning.</p>`,
    `<p><strong>Before next class:</strong> Before tomorrow, predict it. A procedure runs:</p>\n`
    + ps(['IF(quantity = 0)', '{', '  RETURN(0)', '}', 'RETURN(price * quantity)'])
    + `\n<p>What does it return for charge(5, 0), and does the second RETURN ever run? Write your answer and your reasoning.</p>`],

  [`<p>Yesterday's teaser, now decide it. A procedure runs: IF(quantity = 0) { RETURN(0) } and then, below that, RETURN(price * quantity). Consider two calls: charge(5, 0) and charge(5, 3).</p>`,
    `<p>Yesterday's teaser, now decide it. A procedure runs:</p>\n`
    + ps(['IF(quantity = 0)', '{', '  RETURN(0)', '}', 'RETURN(price * quantity)'])
    + `\n<p>Consider two calls: charge(5, 0) and charge(5, 3).</p>`],

  [`<p class="muted">The procedure is: PROCEDURE charge(price, quantity) { IF(quantity = 0) { RETURN(0) } RETURN(price * quantity) }. For each call, name which RETURN fires and the value returned. The last column is yours to complete.</p>`,
    `<p class="muted">The procedure is:</p>\n`
    + ps(['PROCEDURE charge(price, quantity)', '{', '  IF(quantity = 0)', '  {', '    RETURN(0)', '  }', '  RETURN(price * quantity)', '}'])
    + `\n<p class="muted">For each call, name which RETURN fires and the value returned. The last column is yours to complete.</p>`],
];

const PAGES = {
  'ap-csp-topic-3-9-guided-notes': {
    title: 'AP CSP Topic 3.9 Guided Notes - Developing Algorithms',
    edits: EDITS,
  },
  'ap-csp-topic-3-6-guided-notes': {
    title: 'AP CSP Topic 3.6 Guided Notes - Conditionals',
    edits: EDITS_3_6,
  },
  'ap-csp-topic-3-13-guided-notes': {
    title: 'AP CSP Topic 3.13 Guided Notes - Developing Procedures',
    edits: EDITS_3_13,
  },
};

function apply(body, edits) {
  let out = body;
  const missed = [];
  for (const [before, after] of (edits || EDITS)) {
    const n = out.split(before).length - 1;
    if (n !== 1) { missed.push(`${n} occurrence(s) of: ${before.slice(0, 70)}`); continue; }
    out = out.replace(before, after);
  }
  return { body: out, missed };
}

function main(argv) {
  const [src, out, handleArg] = argv;
  const handle = handleArg || 'ap-csp-topic-3-9-guided-notes';
  if (!src || !out) {
    console.error('usage: node scripts/csp-notes-code-blocks.js <patched-body.html> <out.csv> [handle]');
    console.error('handles: ' + Object.keys(PAGES).join(', '));
    process.exit(2);
  }
  const page = PAGES[handle];
  if (!page) {
    console.error(`\n  Refused: no edit table for ${handle}. Known: ${Object.keys(PAGES).join(', ')}\n`);
    process.exit(1);
  }
  const body = fs.readFileSync(src, 'utf8');
  const r = apply(body, page.edits);
  const problems = [...r.missed];

  // Nothing CONCRETE may be left outside a code block. Metasyntax stays, so a
  // block whose body is a placeholder word rather than a statement does not
  // count: `IF(condition){ block }` is grammar being named, not code to copy.
  const outside = r.body.replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, '');
  const PLACEHOLDER = /^\s*(first |second )?(block|statement|expression|\.\.\.)\s*$/;
  const left = [...outside.matchAll(/IF\s*\([^)]*\)\s*\{([^{}]*)\}/g)]
    .filter((m) => !PLACEHOLDER.test(m[1]));
  if (left.length) {
    problems.push(`${left.length} concrete one-liner(s) still outside a code block: ${left[0][0].slice(0, 60)}`);
  }

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
  lines.push([handle, 'MERGE', page.title, r.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');
  console.log(`    ${handle}  ${page.edits.length} prose and table edits  ->  ${(Buffer.byteLength(r.body) / 1024).toFixed(0)} KB`);
  console.log(`\n  wrote ${out}\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { apply, EDITS, PAGES };

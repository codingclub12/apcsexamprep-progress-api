#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  A SECOND IMPLEMENTATION THAT DECIDES BY RUNNING THE PAGE'S OWN ARITHMETIC.
//
//      node scripts/cyber-lab-denominator-rederive.js [--live dir/]
//
//  scripts/cyber-lab-denominator-csv.js knows which ten pages are affected
//  because a person put ten handles in a list, and it recognises the defect by
//  matching one exact string. Both of those can be wrong in the same direction:
//  a page with the same bug written slightly differently is invisible to the
//  token, and a handle nobody thought of is invisible to the list.
//
//  So this sweeps every cyber lab handle the site could have, pulls the
//  expression the page assigns to #score-display out of the body, and EVALUATES
//  it. A denominator that changes when the number of finished steps changes is
//  the defect, whatever the expression looks like. Nothing here imports the
//  generator or its token.
//
//  It prints the handles it found and exits non-zero if that set is not exactly
//  the set the generator ships, in either direction. A page the generator
//  misses is a student still being misgraded; a page the generator touches that
//  this cannot see is a page being rewritten for a reason nobody checked.
//
//  Zero PII. Pure ASCII source, no em-dashes.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { pageBody, NotThePage } = require('../lib/storefront-fetch');
const { HANDLES } = require('./cyber-lab-denominator-csv.js');

const CANDIDATES = [];
for (let u = 1; u <= 5; u++) for (let l = 1; l <= 6; l++) CANDIDATES.push(`ap-cyber-unit-${u}-lesson-${l}-lab`);

/** The right hand side of the assignment to #score-display, or null. */
function scoreExpression(body) {
  const m = body.match(/getElementById\(['"]score-display['"]\)\s*\.\s*textContent\s*=\s*([^;\n]+)/);
  return m ? m[1].trim() : null;
}

/**
 * Does the denominator this expression prints move with the step count?
 *
 * The expression is evaluated with the names the lab template uses. Anything
 * it reaches for that is not supplied comes back undefined and the evaluation
 * is reported as unreadable rather than guessed at.
 */
function denominatorMoves(expr) {
  const names = ['te', 'comp', 'totalPts', 'totalSteps', 't', 'TOTAL', 'score', 'total'];
  let f;
  try { f = new Function(...names, 'return ' + expr); } catch (e) { return { readable: false, why: e.message }; }
  const denomAt = (comp) => {
    let text;
    try { text = String(f(10, comp, 30, 6, 10, 30, 10, 30)); } catch (e) { return null; }
    const m = text.match(/(-?\d{1,3})\s*(?:\/|\bout\s+of\b|\bof\b)\s*(\d{1,3})/i);
    return m ? Number(m[2]) : null;
  };
  const seen = [2, 3, 4, 5, 6].map(denomAt);
  if (seen.some((d) => d === null)) return { readable: false, why: 'no pair printed' };
  const distinct = [...new Set(seen)];
  return { readable: true, moves: distinct.length > 1, seen };
}

function main() {
  const liveIdx = process.argv.indexOf('--live');
  const liveDir = liveIdx > 0 ? process.argv[liveIdx + 1] : null;

  const affected = [], clean = [], unreadable = [], missing = [];
  for (const h of CANDIDATES) {
    let body;
    try {
      body = liveDir
        ? JSON.parse(fs.readFileSync(path.join(liveDir, h + '.json'), 'utf8')).body_html
        : pageBody(h).body_html;
    } catch (e) {
      if (e instanceof NotThePage || e.code === 'ENOENT') { missing.push(h); continue; }
      throw e;
    }
    const expr = scoreExpression(body);
    if (!expr) { clean.push([h, 'no #score-display assignment']); continue; }
    const v = denominatorMoves(expr);
    if (!v.readable) { unreadable.push([h, expr, v.why]); continue; }
    if (v.moves) affected.push([h, expr, v.seen.join(',')]);
    else clean.push([h, expr]);
  }

  console.log('\nREDERIVE  cyber lab running denominator, decided by evaluating each page expression\n');
  for (const [h, expr, seen] of affected) console.log(`  MOVES     ${h.padEnd(30)} ${expr}   denominators seen: ${seen}`);
  for (const [h, expr] of clean) console.log(`  ok        ${h.padEnd(30)} ${expr}`);
  for (const [h, expr, why] of unreadable) console.log(`  UNREAD    ${h.padEnd(30)} ${expr}  (${why})`);
  if (missing.length) console.log(`\n  ${missing.length} candidate handle(s) are not pages: ${missing.join(', ')}`);

  const found = affected.map(([h]) => h).sort();
  const ships = [...HANDLES].sort();
  const onlyHere = found.filter((h) => !ships.includes(h));
  const onlyThere = ships.filter((h) => !found.includes(h));

  console.log('');
  if (unreadable.length) console.log(`  ${unreadable.length} expression(s) could not be evaluated, so this sweep is not complete`);
  if (onlyHere.length) console.log(`  FAIL  the sweep found pages the sheet does not fix: ${onlyHere.join(', ')}`);
  if (onlyThere.length) console.log(`  FAIL  the sheet fixes pages this sweep does not see as broken: ${onlyThere.join(', ')}`);
  if (!onlyHere.length && !onlyThere.length && !unreadable.length) {
    console.log(`OK - two implementations agree on the same ${found.length} pages`);
    process.exit(0);
  }
  process.exit(1);
}

module.exports = { scoreExpression, denominatorMoves, CANDIDATES };
if (require.main === module) main();

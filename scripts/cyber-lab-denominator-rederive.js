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

/** The total the page prices itself at, read from its own declaration. */
function pageTotal(body) {
  const m = body.match(/var\s+totalPts\s*=\s*(\d+)/) || body.match(/var\s+TOTAL\s*=\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * What denominator does this expression print as the step count climbs?
 *
 * The expression is evaluated with the names the lab template uses and with
 * the page's own total. Anything it reaches for that is not supplied comes
 * back undefined and the evaluation is reported as unreadable rather than
 * guessed at.
 */
function denominators(expr, total) {
  const names = ['te', 'comp', 'totalPts', 'totalSteps', 't', 'TOTAL', 'score', 'total'];
  let f;
  try { f = new Function(...names, 'return ' + expr); } catch (e) { return { readable: false, why: e.message }; }
  const at = (comp) => {
    let text;
    try { text = String(f(10, comp, total, 6, 10, total, 10, total)); } catch (e) { return null; }
    const m = text.match(/(-?\d{1,3})\s*(?:\/|\bout\s+of\b|\bof\b)\s*(\d{1,3})/i);
    return m ? Number(m[2]) : null;
  };
  const seen = [2, 3, 4, 5, 6].map(at);
  if (seen.some((d) => d === null)) return { readable: false, why: 'no pair printed' };
  const distinct = [...new Set(seen)];
  return { readable: true, moves: distinct.length > 1, seen, constant: distinct.length === 1 ? distinct[0] : null };
}

function main() {
  const liveIdx = process.argv.indexOf('--live');
  const liveDir = liveIdx > 0 ? process.argv[liveIdx + 1] : null;
  const ships = new Set(HANDLES);

  const moving = [], fixed = [], other = [], wrongConstant = [], unreadable = [], missing = [];
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
    if (!expr) { other.push([h, 'no #score-display assignment']); continue; }
    const total = pageTotal(body);
    const v = denominators(expr, total == null ? 30 : total);
    if (!v.readable) { unreadable.push([h, expr, v.why]); continue; }
    if (v.moves) { moving.push([h, expr, v.seen.join(',')]); continue; }
    //  Constant is not the same as correct. A page printing a constant that is
    //  not the total it prices itself at is still misreporting, and that is the
    //  exact shape of the mutation the suite keeps: totalSteps where totalPts
    //  belongs prints a steady 6 on a thirty point lab.
    if (ships.has(h) && total != null && v.constant !== total) { wrongConstant.push([h, expr, v.constant, total]); continue; }
    if (ships.has(h)) fixed.push([h, expr, v.constant]);
    else other.push([h, expr]);
  }

  console.log('\nREDERIVE  cyber lab running denominator, decided by evaluating each page expression\n');
  for (const [h, expr, seen] of moving) console.log(`  MOVES     ${h.padEnd(30)} ${expr}   denominators seen: ${seen}`);
  for (const [h, expr, c, t] of wrongConstant) console.log(`  WRONG     ${h.padEnd(30)} ${expr}   prints a steady ${c} on a ${t} point lab`);
  for (const [h, expr, c] of fixed) console.log(`  fixed     ${h.padEnd(30)} ${expr}   steady ${c}`);
  for (const [h, expr] of other) console.log(`  ok        ${h.padEnd(30)} ${expr}`);
  for (const [h, expr, why] of unreadable) console.log(`  UNREAD    ${h.padEnd(30)} ${expr}  (${why})`);
  if (missing.length) console.log(`\n  ${missing.length} candidate handle(s) are not pages: ${missing.join(', ')}`);

  //  Two failures, and they are the two directions this can be wrong in.
  //  A page outside the sheet that moves is a student still being misgraded by
  //  a page nobody is fixing. A page inside the sheet that is neither moving
  //  nor correctly steady is a page being rewritten for a reason nobody checked.
  const strayMoving = moving.map(([h]) => h).filter((h) => !ships.has(h));
  const accounted = new Set([...moving.map(([h]) => h), ...fixed.map(([h]) => h)]);
  const unaccounted = [...ships].filter((h) => !accounted.has(h));

  console.log('');
  console.log(`  state: ${fixed.length} fixed, ${moving.filter(([h]) => ships.has(h)).length} still moving, of ${ships.size} pages in the sheet`);
  if (unreadable.length) console.log(`  ${unreadable.length} expression(s) could not be evaluated, so this sweep is not complete`);
  if (strayMoving.length) console.log(`  FAIL  the sweep found pages the sheet does not fix: ${strayMoving.join(', ')}`);
  if (wrongConstant.length) console.log(`  FAIL  a sheet page prints a steady denominator that is not its own total: ${wrongConstant.map(([h]) => h).join(', ')}`);
  if (unaccounted.length) console.log(`  FAIL  a sheet page is neither moving nor correctly steady: ${unaccounted.join(', ')}`);
  if (!strayMoving.length && !wrongConstant.length && !unaccounted.length && !unreadable.length) {
    console.log(`OK - two implementations agree on the same ${ships.size} pages`);
    process.exit(0);
  }
  process.exit(1);
}

module.exports = { scoreExpression, denominators, pageTotal, CANDIDATES };
if (require.main === module) main();

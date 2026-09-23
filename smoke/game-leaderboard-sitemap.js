'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE SITEMAP LEADERBOARD SWEEP MUST GO RED ON EVERY WAY A PAGE CAN BE BROKEN.
//
//  scripts/verify-game-leaderboard-sitemap-live.js reported 38 of 38 SAFE on
//  2026-09-23. A sweep that says SAFE about everything is only worth something
//  if it is proven to say BROKEN about a broken page, so this takes a real
//  repaired body (two-sides, as committed in the 2026-09-21 sheet and matched
//  line for line against the live page on 2026-09-23), breaks it one way at a
//  time, and requires the verdict to change each time.
//
//  The run witness gets its own assertions, because a verdict of BROKEN can come
//  from the parse witness alone and would hide a hollow runner.
//
//  Offline. Run: node smoke/game-leaderboard-sitemap.js
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { parseCsv } = require('../lib/matrixify-body-edit');
const { judge, runEscapers } = require('../scripts/verify-game-leaderboard-sitemap-live');

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (detail ? '  ' + detail : '')); }
}

const sheet = path.join(__dirname, '..', 'imports', '2026-09-21', 'leaderboard-xss-fix-csp-games.csv');
const rows = parseCsv(fs.readFileSync(sheet, 'utf8'));
const hi = rows[0].indexOf('Handle');
const bi = rows[0].indexOf('Body HTML');
const row = rows.find((r) => r[hi] === 'ap-csp-game-two-sides');
if (!row) { console.log('  [FAIL] fixture: two-sides row missing from ' + sheet); process.exit(1); }
const good = row[bi];

const GOOD_MAP = "{'&':'\\u0026amp;','<':'\\u0026lt;','>':'\\u0026gt;','\"':'\\u0026quot;'}";
const IDENTITY_MAP = "{'&':'&','<':'<','>':'>','\"':'\"'}";
const ROW_TEXT = "nmEl.textContent = e.name || 'anon';";

console.log('1. The fixture is the repaired body and reads SAFE');
check('fixture carries the repaired map exactly once', good.split(GOOD_MAP).length === 2);
check('fixture carries the textContent row exactly once', good.split(ROW_TEXT).length === 2);
const base = judge(good);
check('repaired body judged SAFE', base.verdict === 'SAFE', JSON.stringify(base));

console.log('2. Each break, on its own, turns the verdict');
const collapsed = good.replace(GOOD_MAP, IDENTITY_MAP);
const v1 = judge(collapsed);
check('identity-map esc() judged BROKEN', v1.verdict === 'BROKEN', JSON.stringify(v1));

//  The textContent line is KEPT here and the concatenation added beside it, so
//  this can only go red through the concatenation rule. Replacing the line
//  instead would also trip the textContent rule and prove nothing about this one.
const concat = good.replace(ROW_TEXT, ROW_TEXT + " row.title = ''; rows.innerHTML += '<i>' + esc(e.name) + '</i>';");
check('concat mutation keeps the textContent row', concat.includes(ROW_TEXT));
const v2 = judge(concat);
check('name concatenated into innerHTML judged BROKEN', v2.verdict === 'BROKEN', JSON.stringify(v2));

const noText = good.replace(ROW_TEXT, "nmEl.innerText = e.name || 'anon';");
const v3 = judge(noText);
check('name no longer set through textContent judged BROKEN', v3.verdict === 'BROKEN', JSON.stringify(v3));

console.log('3. The run witness is not hollow on its own');
check('runner executes the repaired esc() as safe', runEscapers(good).every((r) => r.safe === true));
check('runner executes the identity esc() as unsafe', runEscapers(collapsed).every((r) => r.safe === false),
  JSON.stringify(runEscapers(collapsed)));
//  One character wrong, '<' left alone. The parse witness names it; the runner
//  must reach the same answer without reading the map.
const oneKey = good.replace(GOOD_MAP, "{'&':'\\u0026amp;','<':'<','>':'\\u0026gt;','\"':'\\u0026quot;'}");
check('runner catches a single collapsed key', runEscapers(oneKey).every((r) => r.safe === false));

console.log('4. When the witnesses disagree, the verdict says so');
//  A correct escaper in a shape the map parser does not read, copied from the
//  live csp-command-center on 2026-09-23. `String(s==null?"":s)` is what the
//  parser's chain rule does not expect, and `/"/g` is a quote inside a regex,
//  which is what broke the first cut of the runner. The runner must call it
//  safe, the parser cannot read it, and that must surface as DISAGREE rather
//  than be settled by either one.
const hexShape = good.replace(
  /function esc\(s\)\{[^\n]*\n?/,
  'function esc(s){ return String(s==null?"":s).replace(/&/g,"\\x26amp\\x3b").replace(/</g,"\\x26lt\\x3b").replace(/>/g,"\\x26gt\\x3b").replace(/"/g,"\\x26quot\\x3b"); }\n');
check('hex-escape esc() present in the mutated body', /\\x26lt\\x3b/.test(hexShape));
check('runner executes the command-center shape as safe', runEscapers(hexShape).every((r) => r.safe === true),
  JSON.stringify(runEscapers(hexShape)));
const v4 = judge(hexShape);
check('parser and runner disagreeing reads DISAGREE', v4.verdict === 'DISAGREE', JSON.stringify(v4));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;

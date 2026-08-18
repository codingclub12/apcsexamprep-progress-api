'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the standalone CSP study game pages.
//
//  WHAT IS BEING PROTECTED
//
//  1. A GAME THAT ALREADY EXISTS. Nineteen of the 35 CSP lesson pages embed a
//     game already. A standalone page for one of those topics is a SECOND
//     implementation posting to the SAME leaderboard id on a different scoring
//     scale, so one board mixes two games' numbers and neither rank means
//     anything. That shipped once: a Parallel Scheduler was built without
//     noticing the Topic 4.3 lesson page had carried one for months. The
//     EMBEDDED_IN_LESSON set in the builder is the guard, and this asserts it
//     is actually consulted.
//
//  2. AN UNREGISTERED GAME ID. routes/game.js owns the metric, the ordering and
//     the anti-cheat bounds. A page for an id the registry does not know posts
//     scores the server rejects, which looks to a student like a game that
//     silently does not count.
//
//  3. AN ORPHANED GAME FILE. A file in shopify/games/ that no entry in GAMES
//     builds is either a half-finished game or the duplicate that was deleted
//     and came back. Either way nobody would notice, because nothing reads it.
//
//  4. THE HOUSE HAZARDS. Pure ASCII, exactly one h1, balanced script tags, a
//     leaderboard that is present AND initialised AND mounted, and an SEO
//     description inside the length Shopify will actually render. checkPage in
//     the builder is the single implementation; this suite runs it so a bad
//     file fails a pull request rather than failing at import time.
//
//  5. THE JAVASCRIPT PARSING AT ALL. Every script block is compiled. A syntax
//     error in a game is invisible to every check above: the HTML is fine, the
//     tags balance, and the page renders as a dead frame.
//
//  WHAT THIS CANNOT PROVE: that a game is fun, or that its scoring is fair.
//  Both games in this pass were played through in a real browser before
//  shipping, which is where that came from.
//
//  Zero PII: author content only, no student data anywhere near this.
//
//  Run: npm run smoke:cspgames
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  build, checkPage, registryIds, GAMES, EMBEDDED_IN_LESSON, GAMES_DIR,
} = require('../scripts/csp-game-pages-csv');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const ids = Object.keys(GAMES);
const reg = registryIds();

section('1. There is at least one game to check');
ok('GAMES is not empty', ids.length > 0, ids.length);

section('2. Every built game id is in the routes/game.js registry');
for (const id of ids) {
  ok(`${id} is registered`, reg.has(id));
}

section('3. No standalone page duplicates a game embedded in a lesson page');
for (const id of ids) {
  ok(`${id} is not already embedded in a lesson page`, !EMBEDDED_IN_LESSON.has(id));
}

section('4. No orphaned game file in shopify/games/');
// A leading underscore marks a shared fragment rather than a game.
const files = fs.readdirSync(GAMES_DIR)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_'))
  .map((f) => f.replace(/\.html$/, ''));
for (const f of files) {
  ok(`${f}.html is built by an entry in GAMES`, ids.includes(f),
    'a game file nobody builds is either unfinished or a duplicate that came back');
}
ok('the shared leaderboard fragment exists',
  fs.existsSync(path.join(GAMES_DIR, '_leaderboard.html')));

section('5. Every page passes the house hazard checks');
const pages = ids.map((id) => build(id));
for (const p of pages) {
  const bad = checkPage(p);
  ok(`${p.handle} has no hazards`, bad.length === 0, bad);
}

section('6. Every script block in every page compiles');
for (const p of pages) {
  const blocks = [...p.bodyHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  ok(`${p.handle} has script blocks to compile`, blocks.length >= 2, blocks.length);
  let err = null;
  blocks.forEach((src, k) => {
    if (err) return;
    try { new vm.Script(src, { filename: `${p.handle}#${k}` }); }
    catch (e) { err = `block ${k}: ${e.message}`; }
  });
  ok(`${p.handle} script blocks all parse`, err === null, err);
}

section('7. Every page dispatches a score the registry will accept');
// The registry bound is what the server enforces; a game whose maximum possible
// score exceeds it would reject a perfect run, which is the worst time to fail.
const regSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'game.js'), 'utf8');
for (const id of ids) {
  const m = regSrc.match(new RegExp(`'${id}':\\s*\\{[^}]*max:\\s*(\\d+)`));
  ok(`${id} has a max bound in the registry`, !!m);
  if (m) {
    const max = Number(m[1]);
    ok(`${id} max bound is a sane leaderboard ceiling`, max >= 100 && max <= 100000, max);
  }
}

section('8. No script-set style property is locked by an !important rule');
// Odds Maker's progress bar never moved: the script set el.fill.style.width on
// every batch of trials, and the stylesheet declared width:0 !important on the
// same element, which an inline style cannot beat. Nothing structural could see
// it. The page was valid, the script ran, and the bar stayed empty. Only a
// screenshot caught it, so this is the check that would have.
//
// The games all resolve elements as el[key] = getElementById(prefix + '-' + key),
// so a script writing el.fill.style.width names the rule that must not lock it:
// #prefix-fill or .prefix-fill.
for (const id of ids) {
  const src = fs.readFileSync(path.join(GAMES_DIR, id + '.html'), 'utf8');
  const prefixes = [...new Set([...src.matchAll(/getElementById\('([a-z]+)-' \+/g)].map((m) => m[1]))];
  const sets = [...src.matchAll(/\bel\.([A-Za-z]+)\.style\.([A-Za-z]+)\s*=/g)]
    .map((m) => ({ key: m[1], prop: m[2].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) }));
  const clashes = [];
  for (const { key, prop } of sets) {
    for (const pre of prefixes) {
      // The rule body for this element, from either an id or a class selector.
      const rule = new RegExp('[#.]' + pre + '-' + key + '\\{([^}]*)\\}', 'g');
      let m;
      while ((m = rule.exec(src))) {
        const decl = new RegExp('(^|;)\\s*' + prop + '\\s*:[^;]*!important');
        if (decl.test(m[1])) clashes.push(`${pre}-${key} sets ${prop} from script but the rule declares it !important`);
      }
    }
  }
  ok(`${id} has no script-set property locked by !important`, clashes.length === 0, [...new Set(clashes)]);
}

section('9. Handles and titles are distinct');
const handles = pages.map((p) => p.handle);
ok('handles are unique', new Set(handles).size === handles.length, handles);
const titles = pages.map((p) => p.title);
ok('titles are unique', new Set(titles).size === titles.length);
for (const p of pages) {
  ok(`${p.handle} title names its topic`, /Topic \d+\.\d+/.test(p.title), p.title);
}

console.log(`\n${'-'.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

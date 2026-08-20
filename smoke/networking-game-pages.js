'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: AP Networking study game pages.
//
//  Sibling of smoke/csp-game-pages.js, and it inherits that suite's hard-won
//  structural checks by importing the same checkPage. What it adds is the part
//  those checks cannot see: WHETHER EACH GAME IS ACTUALLY WINNABLE AND WHETHER
//  ITS EXPLANATION AGREES WITH ITS OWN ANSWER.
//
//  That is not hypothetical. While these six were being written:
//    - Subnet Sprint had a round whose explanation argued for a /25 while the
//      game marked /26 correct. Both were defensible sentences. Together they
//      taught a student that they were wrong when they were right.
//    - Rule Order had its specificity comparison inverted. Every case still
//      rendered, every board still looked plausible, and every intended answer
//      was scored WRONG. A spot check of one case would have found it. What
//      found it was walking all six permutations of all five cases.
//  Neither defect is visible to a parser, a linter or a screenshot. Both are
//  caught below, so neither can come back.
//
//  These are leaderboard games, never gradebook items, and section 6 asserts
//  that rather than trusting it: no networking game id may appear in the course
//  manifest, or a student would carry a denominator for a game.
//
//  Run: npm run smoke:netgames
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  build, GAMES, GAMES_DIR, frameworkTopics, checkPage, registryIds,
} = require('../scripts/networking-game-pages-csv.js');
const csp = require('../scripts/csp-game-pages-csv.js');
const seed = require('../scripts/seed-manifest.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};
const section = (t) => console.log('\n' + t);

const ids = Object.keys(GAMES);
const pages = ids.map(build);
const src = {};
for (const id of ids) src[id] = fs.readFileSync(path.join(GAMES_DIR, id + '.html'), 'utf8');

// Pull a top-level `var NAME = [ ... ];` array out of a game and evaluate it.
// The games are plain ES5 data plus functions, so this is a faithful read of
// exactly what ships rather than a restatement of it.
function data(id, name) {
  const m = src[id].match(new RegExp('var ' + name + ' = (\\[[\\s\\S]*?\\n  \\]);'));
  if (!m) throw new Error(`${id}: no ${name} array found`);
  return vm.runInNewContext('(' + m[1] + ')');
}

section('1. Every game is registered, present and unique');
const reg = registryIds();
for (const id of ids) {
  ok(`${id} is in the routes/game.js registry`, reg.has(id));
  ok(`${id}.html exists`, fs.existsSync(path.join(GAMES_DIR, id + '.html')));
  ok(`${id} is not also a CSP game`, !Object.keys(csp.GAMES).includes(id));
}
const handles = pages.map((p) => p.handle);
ok('handles are unique', new Set(handles).size === handles.length, handles);
ok('handles do not collide with the CSP game pages',
  handles.every((h) => h.startsWith('ap-networking-game-')), handles);
const titles = pages.map((p) => p.title);
ok('titles are unique', new Set(titles).size === titles.length);

section('2. Every game names a real framework topic, and no two share one');
const topics = frameworkTopics();
for (const id of ids) {
  ok(`${id} names topic ${GAMES[id].topic}, which exists`, topics.has(GAMES[id].topic));
  ok(`${id} title names its topic`, new RegExp('Topic ' + GAMES[id].topic.replace('.', '\\.')).test(GAMES[id].title),
    GAMES[id].title);
}
const claimed = ids.map((id) => GAMES[id].topic);
ok('no two games claim the same topic', new Set(claimed).size === claimed.length, claimed);
const units = new Set(ids.map((id) => GAMES[id].unit));
ok('all four units have at least one game', units.size === 4, [...units].sort());

section('3. Structural hazards (shared with the CSP suite)');
for (const p of pages) {
  const bad = checkPage(p);
  ok(`${p.handle} has no hazards`, bad.length === 0, bad);
}
for (const p of pages) {
  const blocks = [...p.bodyHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  ok(`${p.handle} has script blocks to compile`, blocks.length >= 2, blocks.length);
  let err = null;
  blocks.forEach((s, k) => {
    try { new vm.Script(s, { filename: `${p.handle}#${k}` }); }
    catch (e) { if (!err) err = `block ${k}: ${e.message}`; }
  });
  ok(`${p.handle} script blocks all parse`, err === null, err);
}

section('4. No script-set style property is locked by an !important rule');
// The defect this catches: Odds Maker's progress bar never moved because the
// script set style.width while the stylesheet declared width !important on the
// same element. Valid page, running script, empty bar.
for (const id of ids) {
  const prefixes = [...new Set([...src[id].matchAll(/getElementById\('([a-z]+)-' \+/g)].map((m) => m[1]))];
  const sets = [...src[id].matchAll(/\bel\.([A-Za-z]+)\.style\.([A-Za-z]+)\s*=/g)]
    .map((m) => ({ key: m[1], prop: m[2].replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) }));
  const clashes = [];
  for (const { key, prop } of sets) {
    for (const pre of prefixes) {
      const rule = new RegExp('[#.]' + pre + '-' + key + '\\{([^}]*)\\}', 'g');
      let m;
      while ((m = rule.exec(src[id]))) {
        if (new RegExp('(^|;)\\s*' + prop + '\\s*:[^;]*!important').test(m[1])) {
          clashes.push(`${pre}-${key} sets ${prop} from script but the rule declares it !important`);
        }
      }
    }
  }
  ok(`${id} has no script-set property locked by !important`, clashes.length === 0, [...new Set(clashes)]);
}

section('5. Each game is winnable, and its teaching agrees with its answer key');

// SUBNET SPRINT. The answer is derived as the smallest offered prefix that
// fits, so the check is that one exists and that the explanation names it.
{
  const rounds = data('subnet-sprint', 'ROUNDS');
  const usable = (p) => (32 - p >= 2 ? Math.pow(2, 32 - p) - 2 : 0);
  const broken = [];
  for (const r of rounds) {
    const fits = r.opts.filter((p) => usable(p) >= r.need);
    if (!fits.length) { broken.push(`${r.who}: no offered prefix fits ${r.need} hosts`); continue; }
    const want = Math.max(...fits);
    if (!r.why.includes('/' + want)) broken.push(`${r.who}: answer is /${want} but the explanation never says so`);
    if (r.opts.length < 3) broken.push(`${r.who}: only ${r.opts.length} options`);
  }
  ok('subnet-sprint: every round has a fitting answer', !broken.some((b) => b.includes('no offered')), broken);
  ok('subnet-sprint: every explanation names the prefix the game marks correct', broken.length === 0, broken);
  ok('subnet-sprint: at least one round turns on the minus two', rounds.some((r) => {
    const want = Math.max(...r.opts.filter((p) => usable(p) >= r.need));
    return usable(want) === r.need || usable(want - 0) - r.need <= 1;
  }));
}

// RULE ORDER. Walk every permutation of every case. A case must be solvable,
// and it must NOT already be solved in the order it is dealt.
{
  const cases = data('rule-order', 'CASES');
  const perms = (a) => (a.length <= 1 ? [a]
    : a.flatMap((x, i) => perms(a.filter((_, j) => j !== i)).map((p) => [x, ...p])));
  const sim = (c, order) => c.traffic.map((pk) => {
    for (const id of order) {
      const r = c.rules.find((x) => x.id === id);
      if (r.hits.indexOf(pk.id) !== -1) return r.act === pk.want;
    }
    return pk.want === 'deny';
  });
  const broken = [];
  cases.forEach((c, n) => {
    const ruleIds = c.rules.map((r) => r.id);
    const solvable = perms(ruleIds).filter((o) => sim(c, o).every(Boolean));
    if (!solvable.length) broken.push(`case ${n + 1} has no ordering that satisfies its goal`);
    if (sim(c, ruleIds).every(Boolean)) broken.push(`case ${n + 1} is already solved in the order it is dealt`);
    if (!c.traffic.length) broken.push(`case ${n + 1} has no traffic to test`);
    for (const pk of c.traffic) {
      if (!c.rules.some((r) => r.hits.indexOf(pk.id) !== -1)) {
        broken.push(`case ${n + 1}: packet ${pk.id} is matched by no rule at all`);
      }
    }
  });
  ok('rule-order: every case is solvable and none starts solved', broken.length === 0, broken);
}

// PACKET PATH. Real longest-prefix arithmetic, then confirm the hop the game
// computes actually leads to the router the journey names next.
{
  const journeys = data('packet-path', 'JOURNEYS');
  const toInt = (ip) => ip.split('.').reduce((n, o) => (n * 256 + Number(o)) >>> 0, 0);
  const maskOf = (b) => (b === 0 ? 0 : (0xFFFFFFFF << (32 - b)) >>> 0);
  const hit = (d, r) => ((toInt(d) & maskOf(r.bits)) >>> 0) === ((toInt(r.net) & maskOf(r.bits)) >>> 0);
  const best = (d, t) => {
    let bb = -1, bi = -1;
    t.forEach((r, k) => {
      if (!hit(d, r)) return;
      if (r.bits > bb) { bb = r.bits; bi = k; }
      else if (r.bits === bb && r.metric < t[bi].metric) bi = k;
    });
    return bi;
  };
  const broken = [];
  journeys.forEach((J, n) => {
    J.hops.forEach((H, hi) => {
      const w = best(J.dest, H.table);
      if (w < 0) { broken.push(`journey ${n + 1} hop ${hi + 1}: no route matches ${J.dest}`); return; }
      const via = H.table[w].via;
      if (hi < J.hops.length - 1) {
        const next = J.hops[hi + 1].at.split(',')[0];
        if (!via.includes(next)) broken.push(`journey ${n + 1} hop ${hi + 1}: best route goes via ${via}, but the next hop shown is ${next}`);
      } else if (!/directly connected|ISP/.test(via)) {
        broken.push(`journey ${n + 1} ends via ${via}, which is neither a connected network nor the ISP`);
      }
    });
  });
  ok('packet-path: every hop resolves and every chain leads where the journey says', broken.length === 0, broken);
  // The whole point of the game is that specificity outranks metric, so at
  // least one journey must actually demonstrate it.
  const teaches = journeys.some((J) => J.hops.some((H) => {
    const w = best(J.dest, H.table);
    if (w < 0) return false;
    return H.table.some((r, k) => k !== w && hit(J.dest, r) && r.metric < H.table[w].metric);
  }));
  ok('packet-path: at least one hop has a better-metric route that correctly loses on prefix length', teaches);
}

// HARDEN FIRST. Exactly three of six fixes are load bearing, and the attack
// steps map one to one onto them.
{
  const sites = data('harden-first', 'SITES');
  const broken = [];
  sites.forEach((s, n) => {
    const keys = s.fixes.map((f, i) => (f.key ? i : -1)).filter((i) => i >= 0);
    if (s.fixes.length !== 6) broken.push(`site ${n + 1} offers ${s.fixes.length} fixes, not 6`);
    if (keys.length !== 3) broken.push(`site ${n + 1} has ${keys.length} load-bearing fixes, not 3`);
    if (s.attacks.length !== 3) broken.push(`site ${n + 1} has ${s.attacks.length} attack steps, not 3`);
    const needs = s.attacks.map((a) => a.needs).sort().join(',');
    if (needs !== '0,1,2') broken.push(`site ${n + 1} attack steps do not map one to one onto its key fixes (${needs})`);
  });
  ok('harden-first: every site is 6 fixes, 3 of them load bearing, 3 attacks mapping onto them',
    broken.length === 0, broken);
}

// The two classification games: every round must map to an offered option, and
// no option may be dead.
for (const [id, arr, kindArr] of [['address-autopsy', 'ROUNDS', 'KINDS'], ['log-hunt', 'ROUNDS', 'KINDS']]) {
  const rounds = data(id, arr);
  const kinds = data(id, kindArr).map((k) => k.k);
  const orphan = rounds.filter((r) => kinds.indexOf(r.k) === -1).map((r) => r.k);
  const unused = kinds.filter((k) => !rounds.some((r) => r.k === k));
  ok(`${id}: every round maps to an offered answer`, orphan.length === 0, orphan);
  ok(`${id}: no offered answer is never the correct one`, unused.length === 0, unused);
  ok(`${id}: every round explains itself`, rounds.every((r) => r.why && r.why.length > 40));
}

section('6. These are leaderboard games and never gradebook items');
const manifestIds = new Set(seed.buildRows()
  .filter((r) => r.course === 'ap-networking')
  .map((r) => r.item_id));
for (const id of ids) {
  ok(`${id} has no course_manifest row`, !manifestIds.has(id));
}
for (const id of ids) {
  ok(`${id} does not post to the progress API`, !/api\/progress/.test(src[id]), id);
}

section('7. No orphan networking game file');
// A file matching a networking game naming pattern that no GAMES entry builds
// would never reach a page. Only files this suite owns are considered, so the
// CSP games are not swept up.
const owned = new Set(ids.map((i) => i + '.html'));
const suspects = fs.readdirSync(GAMES_DIR)
  .filter((f) => f.endsWith('.html') && !f.startsWith('_'))
  .filter((f) => !Object.keys(csp.GAMES).includes(f.replace('.html', '')))
  .filter((f) => !csp.EMBEDDED_IN_LESSON || !csp.EMBEDDED_IN_LESSON.has(f.replace('.html', '')));
for (const f of suspects) {
  ok(`${f} is built by an entry in GAMES`, owned.has(f),
    'no GAMES entry builds it, so it would never become a page');
}

console.log('\n──────────────────────────────────────────');
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSP STUDY GAMES: the Matrixify pages sheet.
//
//  A game page body is three parts, assembled here so they cannot drift:
//    1. shopify/games/<game>.html   the game itself
//    2. shopify/games/_leaderboard.html   the shared APCSLeaderboard component,
//       copied verbatim from a live game page rather than reimplemented
//    3. an init call naming the game id
//
//  The game id must already exist in the server registry in routes/game.js.
//  That registry owns the metric, the ordering and the anti-cheat bounds, so a
//  page for an unregistered game would post scores the server rejects. This
//  script refuses to build one.
//
//  Scores go to game_scores via POST /api/game/score. That is a leaderboard, not
//  a gradebook: routes/game.js states it outright, and nothing here touches
//  progress, attempts or score_events.
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty. One import at a time.
//
//  Run: node scripts/csp-game-pages-csv.js out.csv [--only game-id]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAMES_DIR = path.join(ROOT, 'shopify', 'games');
const PUBLISHED_AT = '2026-03-01 12:00:00';

// Title, subtitle and the topic each game belongs to. The handle is derived.
// Games that ship as their OWN page. Handle is 'ap-csp-game-' + the key, and the
// key must exist in the routes/game.js registry.
const GAMES = {
  'big-o-race': {
    title: 'AP CSP Big-O Race Game | Linear vs Nested Growth | Topic 3.17',
    shareName: 'Big-O Race',
    label: 'points',
    topic: '3.17',
    seoDescription: 'Race two algorithms as the input grows and watch nested loops fall off a cliff while a single pass keeps up. Free AP CSP Topic 3.17 practice game.',
  },
  'halving-hunter': {
    title: 'AP CSP Halving Hunter Game | Binary Search in log2(n) Guesses | Topic 3.11',
    shareName: 'Halving Hunter',
    label: 'points',
    topic: '3.11',
    seoDescription: 'Find the hidden number in as few guesses as binary search would need, and learn why doubling the list adds only one more guess. AP CSP Topic 3.11.',
  },
  'branch-runner': {
    title: 'AP CSP Branch Runner Game | Nested Conditionals and Dangling ELSE | Topic 3.7',
    shareName: 'Branch Runner',
    label: 'points',
    topic: '3.7',
    seoDescription: 'Walk one input down a nest of conditions and find out which IF the ELSE really belongs to. Free AP CSP Topic 3.7 nested conditionals game.',
  },
  'mod-machine': {
    title: 'AP CSP Mod Machine Game | MOD and Integer Division | Topic 3.3',
    shareName: 'Mod Machine',
    label: 'points',
    topic: '3.3',
    seoDescription: 'Pick the expression that turns every input into the right output, and watch a near-miss pass three rows and fail the fourth. AP CSP Topic 3.3.',
  },
  'swap-shop': {
    title: 'AP CSP Swap Shop Game | Assignment, Swaps and Lost Values | Topic 3.1',
    shareName: 'Swap Shop',
    label: 'points',
    topic: '3.1',
    seoDescription: 'Move values between variables one assignment at a time and watch a value vanish the moment you overwrite it. AP CSP Topic 3.1 practice game.',
  },
  'halt-or-not': {
    title: 'AP CSP Halt or Not Game | Decidable vs Undecidable | Topic 3.18',
    shareName: 'Halt or Not',
    label: 'points',
    topic: '3.18',
    seoDescription: 'Sort problems into the ones an algorithm can always answer and the ones no algorithm can. Free AP CSP Topic 3.18 undecidable problems game.',
  },
  'odds-maker': {
    title: 'AP CSP Odds Maker Game | RANDOM Ranges and Probability | Topic 3.15',
    shareName: 'Odds Maker',
    label: 'points',
    topic: '3.15',
    seoDescription: 'Call the odds on a RANDOM expression, then watch two thousand trials settle on the answer. Free AP CSP Topic 3.15 random values practice game.',
  },
  'list-surgeon': {
    title: 'AP CSP List Surgeon Game | One-Indexed Lists and REMOVE | Topic 3.10',
    shareName: 'List Surgeon',
    label: 'points',
    topic: '3.10',
    seoDescription: 'Reshape lists with real AP pseudocode operations and watch the indices renumber under your hands. Free AP CSP Topic 3.10 list practice game.',
  },
  'iteration-station': {
    title: 'AP CSP Iteration Station Game | Trace the Loop | Topic 3.8',
    shareName: 'Iteration Station',
    label: 'points',
    topic: '3.8',
    seoDescription: 'Predict where each loop ends, then watch every pass run and see exactly where you drifted. Free AP CSP Topic 3.8 iteration tracing practice.',
  },
  'gate-keeper': {
    title: 'AP CSP Gate Keeper Game | Build the Boolean Expression | Topic 3.5',
    shareName: 'Gate Keeper',
    label: 'points',
    topic: '3.5',
    seoDescription: 'Build the AND, OR and NOT expression that matches the spec on all four rows, including the De Morgan case. AP CSP Topic 3.5 boolean practice.',
  },
  'boundary-patrol': {
    title: 'AP CSP Boundary Patrol Game | Conditionals and Off-by-One | Topic 3.6',
    shareName: 'Boundary Patrol',
    label: 'points',
    topic: '3.6',
    seoDescription: 'Pick the comparison operator that puts the cutoff in exactly the right place, then watch the test bench prove it. AP CSP Topic 3.6 conditionals practice.',
  },
};

// Topics whose game is EMBEDDED in the lesson page already. A standalone page
// for one of these would be a SECOND implementation dispatching apcsGameScore
// under the same leaderboard id on a different scoring scale, which is exactly
// what happened with parallel-scheduler: a game had shipped inside the Topic 4.3
// lesson page and a separate one was built without noticing. Measured from the
// live lesson pages on 2026-08-18: 19 of the 35 embed a game.
const EMBEDDED_IN_LESSON = new Set([
  'team-roles', 'guess-the-purpose', 'design-sprint', 'bug-squasher',
  'compression-challenge', 'trend-hunter', 'filter-sort-detective',
  'packet-assembler', 'parallel-scheduler',
  'binary-conversion-race', 'robot-director', 'redundant-routing',
  'internet-routing-simulator', 'two-sides', 'bridge-the-divide',
  'spot-the-bias', 'crowd-power', 'license-match', 'phishing-net',
]);

function registryIds() {
  const src = fs.readFileSync(path.join(ROOT, 'routes', 'game.js'), 'utf8');
  return new Set([...src.matchAll(/^\s*'([a-z0-9-]+)':\s*\{\s*metric:/gm)].map((m) => m[1]));
}

function build(id) {
  const meta = GAMES[id];
  const game = fs.readFileSync(path.join(GAMES_DIR, id + '.html'), 'utf8');
  const lb = fs.readFileSync(path.join(GAMES_DIR, '_leaderboard.html'), 'utf8');
  const init = '<script>APCSLeaderboard.init({ game:' + JSON.stringify(id)
    + ', metric:"score", label:' + JSON.stringify(meta.label)
    + ', higherIsBetter:true, shareName:' + JSON.stringify(meta.shareName) + ' });</'
    + 'script>';
  return {
    id,
    handle: 'ap-csp-game-' + id,
    title: meta.title,
    seoTitle: meta.title.slice(0, 70),
    seoDescription: meta.seoDescription,
    bodyHtml: game + '\n' + lb + '\n' + init,
  };
}

function checkPage(p) {
  const bad = [];
  const b = p.bodyHtml;
  if (!/^[a-z0-9-]+$/.test(p.handle)) bad.push('handle is not a clean slug');
  if (Buffer.byteLength(b) < 4096) bad.push('body is too small to be a finished game');
  // eslint-disable-next-line no-control-regex
  const nonAscii = b.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`${nonAscii.length} non-ASCII char(s), first ${JSON.stringify(nonAscii[0])}`);
  if (b.includes('—')) bad.push('body contains an em-dash');
  if (/auto-fit|auto-fill/.test(b)) bad.push('a grid uses auto-fit or auto-fill');
  if (/="[^"]*&quot;/.test(b)) bad.push('an attribute value contains &quot;');
  const h1 = (b.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) bad.push(`${h1} h1 tags, must be exactly 1`);
  // The three parts must all be present, or the page renders a game with no board.
  if (!b.includes('apcsGameScore')) bad.push('the game never dispatches apcsGameScore, so no score is ever recorded');
  if (!b.includes('APCSLeaderboard')) bad.push('the leaderboard component is missing');
  if (!b.includes('APCSLeaderboard.init(')) bad.push('the leaderboard is never initialised');
  if (!b.includes('id="apcs-lb"')) bad.push('the leaderboard mount point is missing');
  // A script block broken by an unclosed tag is the failure that silently kills init.
  const opens = (b.match(/<script[\s>]/g) || []).length;
  const closes = (b.match(/<\/script>/g) || []).length;
  if (opens !== closes) bad.push(`${opens} script open tags vs ${closes} closes`);
  if (/<\\\/script>/.test(b)) bad.push('an escaped <\\/script> would leave a script block unclosed');
  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  return bad;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/csp-game-pages-csv.js <out.csv> [--only game-id]');
    process.exit(2);
  }
  const only = argv.indexOf('--only') > -1 ? argv[argv.indexOf('--only') + 1] : null;
  const reg = registryIds();
  let ids = Object.keys(GAMES);
  if (only) ids = ids.filter((i) => i === only);
  if (!ids.length) { console.error('no games selected'); process.exit(2); }

  const problems = [];
  const pages = ids.map((id) => {
    if (!reg.has(id)) {
      problems.push(`${id}: not in the routes/game.js registry, so the server would reject its scores`);
    }
    if (EMBEDDED_IN_LESSON.has(id)) {
      problems.push(`${id}: a game for this topic is ALREADY EMBEDDED in its lesson page.`
        + ' A standalone page would post to the same leaderboard id on a different scale.'
        + ' Reuse the embedded game verbatim or pick a different topic.');
    }
    return build(id);
  });
  for (const p of pages) for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    problems.forEach((m) => console.error('    ' + m));
    console.error('');
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At',
    'SEO Title', 'SEO Description'];
  const lines = [header.map(cell).join(',')];
  for (const p of pages) {
    lines.push([p.handle, 'MERGE', p.title, p.bodyHtml, 'TRUE', PUBLISHED_AT,
      p.seoTitle, p.seoDescription].map(cell).join(','));
  }
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');

  pages.forEach((p) => console.log(`    ${p.handle}  ${(Buffer.byteLength(p.bodyHtml) / 1024).toFixed(0)} KB`));
  console.log(`\n  wrote ${out}`);
  console.log('\n  Import settings: MERGE, QUOTE_ALL, utf-8-sig. One import at a time.');
  console.log('  Then link it from /pages/ap-csp-study-games-hub, or nothing points at it.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, checkPage, registryIds, GAMES, EMBEDDED_IN_LESSON, GAMES_DIR, PUBLISHED_AT };

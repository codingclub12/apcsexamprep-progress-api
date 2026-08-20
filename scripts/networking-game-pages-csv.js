'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP NETWORKING STUDY GAMES: the Matrixify pages sheet.
//
//  Same three-part body as the CSP games, and deliberately the same code:
//    1. shopify/games/<game>.html          the game itself
//    2. shopify/games/_leaderboard.html    the shared APCSLeaderboard component
//    3. an init call naming the game id
//
//  checkPage() is IMPORTED from scripts/csp-game-pages-csv.js rather than
//  reimplemented. Those hazard rules were each written after something broke on
//  a live page, and a second copy of them would drift away from the first the
//  moment either was edited. The only thing this file owns is what is genuinely
//  different: the handle prefix, the topic vocabulary, and the per-game titles.
//
//  WHAT THESE GAMES ARE NOT
//  Leaderboard games, not gradebook items. Scores go to game_scores via
//  POST /api/game/score. Nothing here touches attempts, progress or the course
//  manifest, and no denominator moves because a student played one. The graded
//  hands-on work for these same topics is a separate thing entirely and is
//  specified in config/networking-hands-on.json.
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty. One import at a time.
//
//  Run: node scripts/networking-game-pages-csv.js out.csv [--only game-id]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const csp = require('./csp-game-pages-csv.js');
const { checkPage, registryIds, GAMES_DIR } = csp;

const PUBLISHED_AT = '2026-03-01 12:00:00';

// One entry per game. `topic` is the AP Networking framework topic the game
// belongs to, and it is checked against the topic list rather than trusted.
const GAMES = {
  'harden-first': {
    title: 'AP Networking Harden First Game | Device and Account Security | Topic 1.4',
    shareName: 'Harden First',
    label: 'points',
    topic: '1.4',
    unit: 'unit-1',
    seoDescription: 'Three changes, six weaknesses, one night. Choose the fixes that actually block the attack and learn why default credentials outrank a longer password.',
  },
  'address-autopsy': {
    title: 'AP Networking Address Autopsy Game | Public, Private, APIPA and Loopback | Topic 2.2',
    shareName: 'Address Autopsy',
    label: 'points',
    topic: '2.2',
    unit: 'unit-2',
    seoDescription: 'Read ten real addresses against the clock and find out why 169.254 is already a diagnosis. Free AP Networking Topic 2.2 addressing practice game.',
  },
  'subnet-sprint': {
    title: 'AP Networking Subnet Sprint Game | Smallest Subnet That Fits | Topic 3.4',
    shareName: 'Subnet Sprint',
    label: 'points',
    topic: '3.4',
    unit: 'unit-3',
    seoDescription: 'Size eight subnets to their requirement and not one address more. Practice the 2^n minus 2 rule and the off-by-one that catches everyone. Topic 3.4.',
  },
  'rule-order': {
    title: 'AP Networking Rule Order Game | Firewall Rule Shadowing | Topic 3.5',
    shareName: 'Rule Order',
    label: 'points',
    topic: '3.5',
    unit: 'unit-3',
    seoDescription: 'Every rule is correct and the order is wrong. Reorder five firewall rule sets and watch a shadowed rule let the traffic through. AP Networking Topic 3.5.',
  },
  'packet-path': {
    title: 'AP Networking Packet Path Game | Longest Prefix Match Routing | Topic 4.4',
    shareName: 'Packet Path',
    label: 'points',
    topic: '4.4',
    unit: 'unit-4',
    seoDescription: 'Route four packets hop by hop and learn why a slash 24 with a bad metric still beats a slash 16 with a good one. Free AP Networking Topic 4.4 game.',
  },
  'log-hunt': {
    title: 'AP Networking Log Hunt Game | Reading IDS and IPS Logs | Topic 4.5',
    shareName: 'Log Hunt',
    label: 'points',
    topic: '4.5',
    unit: 'unit-4',
    seoDescription: 'Ten intrusion detection log lines. Half are an attacker and half are the network being unwell, and telling them apart is the whole job. Topic 4.5.',
  },
};

// The 22 topics of the published AP Networking framework, read from the EK file
// rather than restated, so a game can never claim a topic that does not exist.
function frameworkTopics() {
  const ek = require('../config/networking-framework-ek.json');
  return new Set(Object.keys(ek.by_topic));
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
    handle: 'ap-networking-game-' + id,
    title: meta.title,
    seoTitle: meta.title.slice(0, 70),
    seoDescription: meta.seoDescription,
    bodyHtml: game + '\n' + lb + '\n' + init,
  };
}

function csvCell(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/networking-game-pages-csv.js <out.csv> [--only game-id]');
    process.exit(2);
  }
  const onlyAt = argv.indexOf('--only');
  const only = onlyAt !== -1 ? argv[onlyAt + 1] : null;

  const ids = Object.keys(GAMES).filter((id) => !only || id === only);
  if (!ids.length) {
    console.error(`no such game '${only}'`);
    process.exit(2);
  }

  // Refuse to build a page for a game the server would reject scores from.
  const reg = registryIds();
  const unregistered = ids.filter((id) => !reg.has(id));
  if (unregistered.length) {
    console.error('These games are not in the routes/game.js registry, so the server would');
    console.error('reject every score they post. Add them there first:');
    unregistered.forEach((id) => console.error('  ' + id));
    process.exit(1);
  }

  const topics = frameworkTopics();
  const strayed = ids.filter((id) => !topics.has(GAMES[id].topic));
  if (strayed.length) {
    console.error('These games name a topic that is not in the AP Networking framework:');
    strayed.forEach((id) => console.error(`  ${id} -> ${GAMES[id].topic}`));
    process.exit(1);
  }

  const pages = ids.map(build);
  const problems = [];
  for (const p of pages) for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);
  if (problems.length) {
    console.error('Refusing to write a sheet with these problems in it:');
    problems.forEach((c) => console.error('  ' + c));
    process.exit(1);
  }

  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At',
    'Metafield: global.title_tag [string]', 'Metafield: global.description_tag [string]'];
  const lines = [header.map(csvCell).join(',')];
  for (const p of pages) {
    lines.push([p.handle, 'MERGE', p.title, p.bodyHtml, 'TRUE', PUBLISHED_AT,
      p.seoTitle, p.seoDescription].map(csvCell).join(','));
  }
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${pages.length} AP Networking game page(s) to ${out}`);
  pages.forEach((p) => console.log(`    ${p.handle}  ${(Buffer.byteLength(p.bodyHtml) / 1024).toFixed(0)} KB`));
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { build, GAMES, GAMES_DIR, frameworkTopics, checkPage, registryIds };

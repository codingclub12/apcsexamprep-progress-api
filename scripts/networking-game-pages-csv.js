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
    hook: "Six weaknesses, three changes, one night. Fix the ones the attacker was going to use.",
    title: 'AP Networking Harden First Game | Device and Account Security | Topic 1.4',
    shareName: 'Harden First',
    label: 'points',
    topic: '1.4',
    unit: 'unit-1',
    seoDescription: 'Three changes, six weaknesses, one night. Choose the fixes that actually block the attack and learn why default credentials outrank a longer password.',
  },
  'address-autopsy': {
    hook: "Ten addresses off a live network. Two of them are already a diagnosis.",
    title: 'AP Networking Address Autopsy Game | Public, Private, APIPA and Loopback | Topic 2.2',
    shareName: 'Address Autopsy',
    label: 'points',
    topic: '2.2',
    unit: 'unit-2',
    seoDescription: 'Read ten real addresses against the clock and find out why 169.254 is already a diagnosis. Free AP Networking Topic 2.2 addressing practice game.',
  },
  'subnet-sprint': {
    hook: "Eight blocks. Give each one room to grow and not one address more.",
    title: 'AP Networking Subnet Sprint Game | Smallest Subnet That Fits | Topic 3.4',
    shareName: 'Subnet Sprint',
    label: 'points',
    topic: '3.4',
    unit: 'unit-3',
    seoDescription: 'Size eight subnets to their requirement and not one address more. Practice the 2^n minus 2 rule and the off-by-one that catches everyone. Topic 3.4.',
  },
  'rule-order': {
    hook: "Not one rule is wrong. Only the order, and the order decides who gets in.",
    title: 'AP Networking Rule Order Game | Firewall Rule Shadowing | Topic 3.5',
    shareName: 'Rule Order',
    label: 'points',
    topic: '3.5',
    unit: 'unit-3',
    seoDescription: 'Every rule is correct and the order is wrong. Reorder five firewall rule sets and watch a shadowed rule let the traffic through. AP Networking Topic 3.5.',
  },
  'packet-path': {
    hook: "Four journeys, one hop at a time. Specificity beats a better metric.",
    title: 'AP Networking Packet Path Game | Longest Prefix Match Routing | Topic 4.4',
    shareName: 'Packet Path',
    label: 'points',
    topic: '4.4',
    unit: 'unit-4',
    seoDescription: 'Route four packets hop by hop and learn why a slash 24 with a bad metric still beats a slash 16 with a good one. Free AP Networking Topic 4.4 game.',
  },
  'log-hunt': {
    hook: "Ten log lines. Half are an attacker, half are the network being unwell.",
    title: 'AP Networking Log Hunt Game | Reading IDS and IPS Logs | Topic 4.5',
    shareName: 'Log Hunt',
    label: 'points',
    topic: '4.5',
    unit: 'unit-4',
    seoDescription: 'Ten intrusion detection log lines. Half are an attacker and half are the network being unwell, and telling them apart is the whole job. Topic 4.5.',
  },
  'ai-audit': {
    hook: "Four AI-written designs. Most of every one is correct, which is the problem.",
    title: 'AP Networking AI Audit Game | Evaluating AI Network Designs | Topic 2.4',
    shareName: 'AI Audit',
    label: 'points',
    topic: '2.4',
    unit: 'unit-2',
    seoDescription: 'Four AI-written network designs, three planted defects each. Most of every one is correct, which is exactly what makes the rest hard to see. Topic 2.4.',
  },
  'segment-sort': {
    hook: "Twelve devices, four zones. Group them by what they would cost you.",
    title: 'AP Networking Segment Sort Game | Grouping Devices Into Zones | Topic 2.6',
    shareName: 'Segment Sort',
    label: 'points',
    topic: '2.6',
    unit: 'unit-2',
    seoDescription: 'Twelve devices, four zones. Learn why the lobby smart TV and the staff laptop belong in different places even though one company owns both. Topic 2.6.',
  },
  'guest-gate': {
    hook: "Configure it, then prove it. Every wrong test in this game passes.",
    title: 'AP Networking Guest Gate Game | Verifying a Configuration | Topic 3.3',
    shareName: 'Guest Gate',
    label: 'points',
    topic: '3.3',
    unit: 'unit-3',
    seoDescription: 'Configure it, then prove it. Every wrong test in this game passes, which is what makes it wrong. Free AP Networking Topic 3.3 verification practice.',
  },
  'shell-hop': {
    hook: "One transfer, start to finish. The last step is the one people skip.",
    title: 'AP Networking Shell Hop Game | CLI Navigation and SFTP | Topic 4.3',
    shareName: 'Shell Hop',
    label: 'points',
    topic: '4.3',
    unit: 'unit-4',
    seoDescription: 'Move a log file off a remote server one command at a time, and learn why no error message is not the same thing as evidence. AP Networking Topic 4.3.',
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

// ── THE HUB ──────────────────────────────────────────────────────────────────
//  Ten standalone game pages are worth nothing until something links them.
//
//  The cards are GENERATED from GAMES rather than written out, so a game added
//  above appears on the hub with no second edit, and the hub can never link to a
//  handle that build() does not produce. The template owns the wrapper and the
//  prose; this owns the list.
const HUB_HANDLE = 'ap-networking-study-games-hub';
const HUB_TITLE = 'AP Networking Study Games | Ten Free Practice Games by Topic';
const HUB_SEO = 'Ten free AP Networking games, one for every topic that asks you to configure, secure or verify something. Subnetting, firewall order, routing and more.';

const UNIT_LABEL = {
  'unit-1': ['Unit 1', 'Foundations of networking and security'],
  'unit-2': ['Unit 2', 'Network components and addressing'],
  'unit-3': ['Unit 3', 'Building and securing a network'],
  'unit-4': ['Unit 4', 'Managing and troubleshooting a network'],
};

function hubCard(id) {
  const g = GAMES[id];
  return '<a class="card" href="/pages/ap-networking-game-' + id + '">'
    + '<span class="ctop"><span class="cname">' + g.shareName + '</span>'
    + '<span class="ctopic">Topic ' + g.topic + '</span></span>'
    + '<p class="chook">' + g.hook + '</p>'
    + '<span class="cgo">Play it</span>'
    + '</a>';
}

function hubUnits() {
  const order = Object.keys(UNIT_LABEL);
  let out = '';
  for (const u of order) {
    const inUnit = Object.keys(GAMES)
      .filter((id) => GAMES[id].unit === u)
      .sort((a, b) => (GAMES[a].topic < GAMES[b].topic ? -1 : 1));
    if (!inUnit.length) continue;
    out += '<div class="unit"><div class="ulabel">'
      + '<span class="un">' + UNIT_LABEL[u][0] + '</span>'
      + '<span class="ud">' + UNIT_LABEL[u][1] + '</span></div>'
      + '<div class="cards">' + inUnit.map(hubCard).join('') + '</div></div>';
  }
  return out;
}

function buildHub() {
  const tpl = fs.readFileSync(path.join(GAMES_DIR, '_networking-hub.html'), 'utf8');
  if (!tpl.includes('<!--UNITS-->')) throw new Error('the hub template has lost its <!--UNITS--> marker');
  return {
    id: '_hub',
    handle: HUB_HANDLE,
    title: HUB_TITLE,
    seoTitle: HUB_TITLE.slice(0, 70),
    seoDescription: HUB_SEO,
    bodyHtml: tpl.replace('<!--UNITS-->', hubUnits()),
  };
}

// The hub is a page of links, not a game, so the game hazard rules do not apply
// to it: it has no leaderboard, dispatches no score and mounts no board. These
// are the rules that DO matter for it, and the one that matters most is that
// every card points at a handle build() actually produces. A hub linking to a
// page that does not exist is worse than no hub.
function checkHub(p, gameHandles) {
  const bad = [];
  const b = p.bodyHtml;
  if (!/^[a-z0-9-]+$/.test(p.handle)) bad.push('handle is not a clean slug');
  if (b.includes('<!--UNITS-->')) bad.push('the units marker was never replaced');
  // eslint-disable-next-line no-control-regex
  const nonAscii = b.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`${nonAscii.length} non-ASCII char(s), first ${JSON.stringify(nonAscii[0])}`);
  if (b.includes('\u2014')) bad.push('body contains an em-dash');
  if (/auto-fit|auto-fill/.test(b)) bad.push('a grid uses auto-fit or auto-fill');
  const h1 = (b.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) bad.push(`${h1} h1 tags, must be exactly 1`);
  if (!b.includes('<style>')) bad.push('the hub lost its stylesheet');

  const linked = [...b.matchAll(/href="\/pages\/(ap-networking-game-[a-z0-9-]+)"/g)].map((m) => m[1]);
  const known = new Set(gameHandles);
  for (const h of linked) if (!known.has(h)) bad.push(`links to ${h}, which no game page builds`);
  for (const h of gameHandles) if (!linked.includes(h)) bad.push(`never links to ${h}`);
  if (new Set(linked).size !== linked.length) bad.push('the same game is linked twice');

  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  return bad;
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

  // The hub ships in the same sheet, but only on a full build. A --only run is
  // for re-importing one game, and regenerating the hub from a single game would
  // publish a hub listing one game.
  if (!only) {
    const hub = buildHub();
    for (const c of checkHub(hub, Object.keys(GAMES).map((g) => 'ap-networking-game-' + g))) {
      problems.push(`${hub.handle}: ${c}`);
    }
    pages.push(hub);
  }
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

module.exports = { build, buildHub, checkHub, hubUnits, GAMES, GAMES_DIR,
  frameworkTopics, checkPage, registryIds, HUB_HANDLE };

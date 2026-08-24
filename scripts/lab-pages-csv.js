'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LAB PAGES: the Matrixify pages sheet.
//
//  One Shopify page per interactive terminal lab. The page body is deliberately
//  thin in markup and thick in nothing: a heading, a short intro, a mount point,
//  and three script tags. Everything a student sees (the brief, the terminal,
//  the checklist, the questions) is rendered by /lab-player.js from the spec at
//  /api/labs, so a lab edit is a commit here and never a re-import.
//
//  THAT IS THE WHOLE POINT OF SHIPPING IT THIS WAY
//  The CSA exercise pages carry their content in Body HTML, which means every
//  content fix is a Matrixify round trip and the page can drift from the repo.
//  A lab page carries a lab ID. The page is a socket; the spec is the appliance.
//
//  WHAT THE PAGE STILL HAS TO CARRY
//    - the token bridge. apcse_token is what apcs-tracker.js already stores, and
//      the player reads it, so a signed-in student is graded with no extra wiring
//    - real prose. A page whose body is three script tags is thin content, and
//      these pages are indexed
//    - the API origin, so the player and the spec both come from progress.
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty. One import at a time.
//
//  Run: node scripts/lab-pages-csv.js out.csv [--only <item_id>]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const labs = require('../lib/lab-spec');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const API = 'https://progress.apcsexamprep.com';

// Prose per lab. Authored here rather than in the spec because it is page copy,
// not lab content: it is what a search result and a first-time visitor read,
// and it is never shown inside the player.
const COPY = {
  'ap-networking|4.3-lab': {
    lede: 'A browser terminal, a pretend network, and one file that has to end up somewhere else. '
      + 'You get eight checks, and the eighth is the one people skip.',
    body: [
      'Everything runs in this page. There is nothing to install, nothing to connect to, and nothing '
      + 'you can break: the filesystem and the file server are simulated, so you can try a command, '
      + 'get it wrong, and try it again.',
      'The last check is the one worth reading twice. A transfer that printed no error is not proof '
      + 'the file arrived. Listing the folder you sent it to is.',
    ],
    signin: true,
  },
  'ap-networking|1.4-lab': {
    lede: 'A device nobody documented, an audit folder, and one setting that is still exactly '
      + 'what it was in the box. Eight checks, and the seventh is where the lab turns.',
    body: [
      'Everything runs in this page. The filesystem is simulated, so you can open anything you can '
      + 'reach and read it as many times as you like.',
      'The live configuration files are not the whole device. A working config tells you what the '
      + 'machine does today; it does not tell you what else is still sitting on it. Keep looking '
      + 'after the obvious files have been read.',
    ],
    signin: true,
  },
  'ap-networking|3.5-lab': {
    lede: 'A service is down, the firewall was changed on Monday, and every rule in the list is '
      + 'correct. Eight checks, and the answer is not a wrong rule.',
    body: [
      'Everything runs in this page. Nothing is connected to anything real, so read the files as '
      + 'often as you like and change your mind as often as you need to.',
      'Read the rule set the way a firewall reads it: top to bottom, stopping at the first rule that '
      + 'matches. A rule that is never reached looks completely fine on its own line, which is why '
      + 'reviewing rules one at a time does not find this class of fault.',
    ],
    signin: true,
  },
  'ap-networking|2.2-lab': {
    lede: 'A studio with no documentation at all, and a network that will tell you about itself if '
      + 'you read what it keeps. Eight checks, and one of them is an address.',
    body: [
      'Everything runs in this page. The lease table, the ARP table and the inventory are simulated, '
      + 'so read them in any order and as many times as you want.',
      'Nine devices, eight leases. Finding which device is missing from the router\'s table is the '
      + 'easy half. Saying what its address proves, and what that rules out, is the half that '
      + 'separates documenting a network from copying one down.',
    ],
    signin: true,
  },
  'ap-cybersecurity|1.2-lab': {
    lede: 'The tournament join code is in a folder on the club machine and nobody remembers which one. '
      + 'You have a terminal and no file browser.',
    body: [
      'Everything runs in this page. The filesystem is simulated, so you can wander it freely and read '
      + 'anything you can reach.',
      'Which is the actual lesson. Pay attention to what else you can open on the way to the code, and '
      + 'ask who left it that way.',
    ],
    signin: false,
  },
  'ap-cybersecurity|2.4-lab': {
    lede: 'A week of badge swipes from a building nobody has audited since March. Three of the '
      + 'oddities in it are attacks. Two are not, and telling them apart is the lab.',
    body: [
      'Everything runs in this page. The log, the door reference and the badge list are simulated, so '
      + 'read them in any order and as many times as you need.',
      'Finding something strange in a log is the easy half. A person working late and a badge used at '
      + '02:47 are both unusual, and only one of them is a problem. Decide what makes the difference '
      + 'before you decide which rows to flag.',
    ],
    signin: false,
  },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function build(spec) {
  const copy = COPY[`${spec.course}|${spec.item_id}`];
  if (!copy) throw new Error(`no page copy authored for ${spec.course} ${spec.item_id}`);
  if (!spec.page_handle) throw new Error(`${spec.item_id} has no page_handle`);

  const mountId = 'apcs-lab-' + spec.item_id.replace(/[^a-z0-9]+/gi, '-');
  const signin = copy.signin
    ? '<p class="lab-page-note"><strong>Sign in first if this is for a grade.</strong> '
      + 'The lab runs either way, but it can only save your score when you are signed in to your class.</p>'
    : '<p class="lab-page-note">This one is practice. It checks your work on the page and records nothing.</p>';

  const bodyHtml = [
    '<div class="lab-page">',
    '<style>',
    '.lab-page{max-width:1200px;margin:0 auto}',
    '.lab-page .lab-page-lede{font-size:18px;line-height:1.55;margin:0 0 14px}',
    '.lab-page p{line-height:1.6}',
    '.lab-page .lab-page-note{background:#eef3f7;border-left:3px solid #2f6f8f;padding:10px 14px;',
    'border-radius:0 6px 6px 0;margin:16px 0 22px}',
    '</style>',
    '<h1>' + esc(spec.title) + '</h1>',
    '<p class="lab-page-lede">' + esc(copy.lede) + '</p>',
    ...copy.body.map((p) => '<p>' + esc(p) + '</p>'),
    signin,
    '<div id="' + mountId + '">Loading the lab...</div>',
    '<script>window.APCS_LAB={base:' + JSON.stringify(API) + '};</' + 'script>',
    '<script src="' + API + '/lab-player.js"></' + 'script>',
    '<script>APCSLab.mountById(document.getElementById(' + JSON.stringify(mountId) + '),'
      + JSON.stringify(spec.course) + ',' + JSON.stringify(spec.item_id) + ');</' + 'script>',
    '</div>',
  ].join('\n');

  return {
    item_id: spec.item_id,
    course: spec.course,
    handle: spec.page_handle,
    title: spec.page_title || spec.title,
    seoTitle: (spec.page_title || spec.title).slice(0, 70),
    seoDescription: spec.seo_description || '',
    bodyHtml,
  };
}

// The hazard rules for a lab page. Not the game rules: a lab has no leaderboard
// and dispatches no score event. These are the ways a lab page specifically
// fails, and each one is a way it fails SILENTLY, rendering fine and grading
// nothing.
function checkPage(p, spec) {
  const bad = [];
  const b = p.bodyHtml;
  if (!/^[a-z0-9-]+$/.test(p.handle)) bad.push('handle is not a clean slug');
  // eslint-disable-next-line no-control-regex
  const nonAscii = b.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`${nonAscii.length} non-ASCII char(s), first ${JSON.stringify(nonAscii[0])}`);
  if (b.includes('—')) bad.push('body contains an em-dash');
  if (/auto-fit|auto-fill/.test(b)) bad.push('a grid uses auto-fit or auto-fill');
  if (/="[^"]*&quot;/.test(b)) bad.push('an attribute value contains &quot;');
  const h1 = (b.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) bad.push(`${h1} h1 tags, must be exactly 1`);

  // The four things that make it a lab rather than a paragraph.
  if (!b.includes('/lab-player.js')) bad.push('the player script is missing, so the page renders prose and no lab');
  if (!b.includes('APCSLab.mountById(')) bad.push('the player is never mounted');
  if (!b.includes('window.APCS_LAB')) bad.push('the API origin is never set, so the spec fetch would go to the storefront');
  const mount = /id="(apcs-lab-[a-z0-9-]+)"/.exec(b);
  if (!mount) bad.push('there is no mount point');
  else if (!b.includes(JSON.stringify(mount[1]))) bad.push('the mount call names a different element than the page has');

  // The ids in the page must be the ids the API serves, or the page fetches a
  // 404 and shows "This lab could not be loaded" to a whole class.
  if (!b.includes(JSON.stringify(spec.course))) bad.push('the mount call does not name this lab course');
  if (!b.includes(JSON.stringify(spec.item_id))) bad.push('the mount call does not name this lab item_id');

  const opens = (b.match(/<script[\s>]/g) || []).length;
  const closes = (b.match(/<\/script>/g) || []).length;
  if (opens !== closes) bad.push(`${opens} script open tags vs ${closes} closes`);
  if (/<\\\/script>/.test(b)) bad.push('an escaped <\\/script> would leave a script block unclosed');

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
    console.error('usage: node scripts/lab-pages-csv.js <out.csv> [--only <item_id>]');
    process.exit(2);
  }
  const onlyAt = argv.indexOf('--only');
  const only = onlyAt !== -1 ? argv[onlyAt + 1] : null;

  const specs = labs.all().filter((s) => !only || s.item_id === only);
  if (!specs.length) {
    console.error(only ? `no lab '${only}'` : 'no labs authored');
    process.exit(2);
  }

  const problems = [];
  const pages = [];
  for (const spec of specs) {
    let p;
    try { p = build(spec); } catch (e) { problems.push(`${spec.item_id}: ${e.message}`); continue; }
    for (const c of checkPage(p, spec)) problems.push(`${p.handle}: ${c}`);
    pages.push(p);
  }
  const handles = pages.map((p) => p.handle);
  if (new Set(handles).size !== handles.length) problems.push('two labs claim the same page handle');

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

  console.log(`Wrote ${pages.length} lab page(s) to ${out}`);
  pages.forEach((p) => console.log(`    ${p.handle}  ${p.course} ${p.item_id}`));
  console.log('\nAfter importing, the lab is live at /pages/' + pages[0].handle);
  console.log('A lab CONTENT change never needs another import: the page reads the spec from');
  console.log(API + '/api/labs, so committing config/labs/*.json is the deploy.');
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { build, checkPage, COPY, PUBLISHED_AT, API };

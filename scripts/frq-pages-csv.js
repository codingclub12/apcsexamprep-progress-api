'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DEVICE SECURITY ANALYSIS pages: the Matrixify sheet.
//
//  Same socket-and-appliance split as scripts/lab-pages-csv.js. The page body
//  is a heading, real prose, a mount point and three script tags; the question
//  itself is rendered by /frq-player.js from the spec at /api/frq. Editing a
//  sample response is a commit, never another import.
//
//  EVERY PAGE THIS BUILDS ENDS IN A SIBLING STRIP
//  The first four of these pages went live linked from nowhere and linking to
//  nothing, not even to each other. They were reachable only by typing the URL.
//  So the strip is generated here rather than authored: it lists every OTHER
//  authored set plus the hub, straight out of lib/practice-index.js, and
//  checkPage refuses a sheet whose strip is missing a sibling. A fifth set
//  cannot ship orphaned, and cannot leave the other four stale either.
//
//  HANDLE HAZARD, INHERITED FROM THE THEME, NOW FIXED
//  layout/theme.liquid carries an "FRQ PAGE AUTO-CTA INJECTOR" that used to
//  fire on ANY url containing "frq" and staple AP CSA Java navigation and CTAs
//  onto the page. A cyber page called ap-cybersecurity-frq-... would get Java
//  study guide links injected into it.
//
//  Theme PR #73 narrowed that gate to require "csa" as well, and it is merged
//  into the Shopify-connected branch and confirmed on the storefront. So these
//  handles are safe.
//
//  The check below stays, because the guarantee is a line in another repo's
//  theme file and nothing here would notice it being reverted. It reports the
//  dependency rather than blocking on it: the day someone widens that gate
//  again, the next person to run this script reads why it mattered.
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty. One import at a time.
//
//  Run: node scripts/frq-pages-csv.js out.csv [--only <set_id>]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const frq = require('../lib/frq-spec');
const practice = require('../lib/practice-index');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const API = 'https://progress.apcsexamprep.com';
const STORE = practice.STOREFRONT;
const FRQ_HUB = 'ap-cybersecurity-frq-practice';
const UMBRELLA = 'ap-cybersecurity-practice';

// Page copy per set. Authored here rather than in the spec because it is what a
// search result and a first time visitor read, and it is never shown inside the
// question itself.
const COPY = {
  'dsa-bluebird-studio': [
    'This is the whole of Section II of the AP Cybersecurity exam: one question, six sources, fifty minutes.',
    'The device is a design workstation at a six person studio that runs its own client proofing site. The password attack in this one arrives in two stages, and the firewall question turns on the order of the rules rather than on finding the rule that says deny.',
    'Write your responses on paper or in your own editor first. Each subpart then reveals a sample response and the specific points that earn credit, so you can mark yourself honestly.',
  ],
  'dsa-library-kiosk': [
    'This is the whole of Section II of the AP Cybersecurity exam: one question, six sources, fifty minutes.',
    'The sources come from a single device, a public library catalogue kiosk. You get its firewall rules, two logs, a file listing, what it is listening on, and the library\'s acceptable use policy. Parts A through E ask you to read across all of them and cite what you find.',
    'Write your responses on paper or in your own editor first. Each subpart then reveals a sample response and the specific points that earn credit, so you can mark yourself honestly.',
  ],
  'dsa-print-server': [
    'The third Device Security Analysis, and the one where the attack is slow enough to look like nothing.',
    'The device is a district print server holding queued documents, including individual education plans. The password attack here does not hammer one account; it tries each of nine real accounts exactly once, three minutes apart, which is how an attacker stays under a lockout threshold. Then it teaches the setuid bit, and part E is the escalation that uses it.',
    'If you have done the kiosk or the laptop set, watch the clock in the log rather than the count.',
  ],
  'dsa-greenhouse-controller': [
    'A six year old control device, an account called admin, and eleven failed logins from six different addresses.',
    'This is the set where blocking the attacker\'s IP is the wrong reflex, because there is no single one. The device also ends up listening on a port nobody approved, which only Source 5 reveals, so this is the set that rewards reading the listening services rather than skimming past them.',
    'Part C is a private key that every account on the device can read. Work out what that is worth to an attacker before you look at the sample.',
  ],
  'dsa-athletics-laptop': [
    'A second full Device Security Analysis, deliberately not a reskin of the first.',
    'The device is a school athletics laptop holding student medical clearance forms. The password attack in this one behaves differently from the kiosk set, the blocked connection is outbound rather than inbound, and the second attack does its damage before the log ends rather than leaving something behind.',
    'If you did the kiosk set first, resist pattern matching. Read the direction column, and count how many usernames appear.',
  ],
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── the sibling strip ────────────────────────────────────────────────────────
// Generated from the index, never authored, so it cannot fall behind the specs.
// It is the difference between four orphan pages and a set: a student who
// finishes one has the other three and the hub in front of them, and a crawler
// following any one of them reaches all five.
function siblingStrip(spec, index) {
  const others = index.frq.filter((s) => s.set_id !== spec.set_id);
  const items = others.map((s) => {
    const href = s.page_url || (API + s.url);
    const label = s.focus || s.title;
    return '<li><a href="' + esc(href) + '">' + esc(s.title) + '</a>'
      + (s.focus ? '<span class="frq-sib-focus">' + esc(label) + '</span>' : '')
      + '</li>';
  });
  return [
    '<div class="frq-sib">',
    '<h2>More Device Security Analysis practice</h2>',
    '<p>Every set is the same five parts against a different device. These are the others:</p>',
    '<ul class="frq-sib-list">',
    ...items,
    '</ul>',
    '<p>All of them, with what each part asks and how the sources work: '
      + '<a href="' + STORE + '/pages/' + FRQ_HUB + '">the AP Cybersecurity FRQ practice hub</a>. '
      + 'Multiple choice, free response and the terminal labs together: '
      + '<a href="' + STORE + '/pages/' + UMBRELLA + '">AP Cybersecurity practice</a>.</p>',
    '</div>',
  ].join('\n');
}

function build(spec, index) {
  const copy = COPY[spec.set_id];
  if (!copy) throw new Error(`no page copy authored for ${spec.set_id}`);
  if (!spec.page_handle) throw new Error(`${spec.set_id} has no page_handle`);

  const mountId = 'apcs-frq-' + spec.set_id;
  const bodyHtml = [
    '<div class="frq-page">',
    '<style>',
    '.frq-page{max-width:1040px;margin:0 auto}',
    '.frq-page .frq-page-lede{font-size:18px;line-height:1.55;margin:0 0 14px}',
    '.frq-page p{line-height:1.6}',
    '.frq-page .frq-page-note{background:#eef3f7;border-left:3px solid #2f6f8f;padding:10px 14px;',
    'border-radius:0 6px 6px 0;margin:16px 0 22px}',
    '.frq-page .frq-sib{border-top:1px solid #dbe3ea;margin:34px 0 0;padding:22px 0 0}',
    '.frq-page .frq-sib h2{font-size:20px;margin:0 0 8px}',
    '.frq-page .frq-sib-list{list-style:none;padding:0;margin:12px 0 18px}',
    '.frq-page .frq-sib-list li{border:1px solid #dbe3ea;border-radius:8px;padding:11px 14px;margin:0 0 9px}',
    '.frq-page .frq-sib-focus{display:block;font-size:13px;color:#6b7c8d;margin-top:3px}',
    '</style>',
    '<h1>' + esc(spec.title) + '</h1>',
    '<p class="frq-page-lede">' + esc(copy[0]) + '</p>',
    ...copy.slice(1).map((p) => '<p>' + esc(p) + '</p>'),
    '<p class="frq-page-note">This one is self-scored. Nothing you write is collected, sent or stored, '
      + 'and no score reaches a gradebook.</p>',
    '<div id="' + mountId + '">Loading the practice question...</div>',
    '<script>window.APCS_FRQ={base:' + JSON.stringify(API) + '};</' + 'script>',
    '<script src="' + API + '/frq-player.js"></' + 'script>',
    '<script>APCSFrq.mountById(document.getElementById(' + JSON.stringify(mountId) + '),'
      + JSON.stringify(spec.course) + ',' + JSON.stringify(spec.set_id) + ');</' + 'script>',
    siblingStrip(spec, index),
    '</div>',
  ].join('\n');

  return {
    set_id: spec.set_id,
    handle: spec.page_handle,
    title: spec.page_title || spec.title,
    seoTitle: (spec.page_title || spec.title).slice(0, 70),
    seoDescription: spec.seo_description || '',
    bodyHtml,
  };
}

function checkPage(p, spec, index) {
  const bad = [];
  const b = p.bodyHtml;
  if (!/^[a-z0-9-]+$/.test(p.handle)) bad.push('handle is not a clean slug');
  // eslint-disable-next-line no-control-regex
  const nonAscii = b.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`${nonAscii.length} non-ASCII char(s), first ${JSON.stringify(nonAscii[0])}`);
  if (b.includes('—')) bad.push('body contains an em-dash');
  if (/auto-fit|auto-fill/.test(b)) bad.push('a grid uses auto-fit or auto-fill');
  const h1 = (b.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) bad.push(`${h1} h1 tags, must be exactly 1`);
  if (!b.includes('/frq-player.js')) bad.push('the player script is missing');
  if (!b.includes('APCSFrq.mountById(')) bad.push('the player is never mounted');
  if (!b.includes('window.APCS_FRQ')) bad.push('the API origin is never set');
  const mount = /id="(apcs-frq-[a-z0-9-]+)"/.exec(b);
  if (!mount) bad.push('there is no mount point');
  else if (!b.includes(JSON.stringify(mount[1]))) bad.push('the mount call names a different element');
  if (!b.includes(JSON.stringify(spec.set_id))) bad.push('the mount call does not name this set');
  if (!b.includes(JSON.stringify(spec.course))) bad.push('the mount call does not name this course');
  const opens = (b.match(/<script[\s>]/g) || []).length;
  const closes = (b.match(/<\/script>/g) || []).length;
  if (opens !== closes) bad.push(`${opens} script open tags vs ${closes} closes`);
  if (/<\\\/script>/.test(b)) bad.push('an escaped <\\/script> would leave a block unclosed');
  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);

  // The strip is the whole reason these pages stop being orphans, so it is
  // checked against the index rather than merely checked for existence. Every
  // sibling by name, the hub, and no link to itself.
  if (index) {
    for (const sib of index.frq) {
      const href = sib.page_url || (API + sib.url);
      const linked = b.includes('href="' + href + '"');
      if (sib.set_id === spec.set_id) {
        if (linked) bad.push('the strip links this page to itself');
      } else if (!linked) {
        bad.push(`the strip does not link sibling '${sib.set_id}' (${href})`);
      }
    }
    if (!b.includes('/pages/' + FRQ_HUB + '"')) bad.push('the strip does not link the FRQ hub');
    if (!b.includes('/pages/' + UMBRELLA + '"')) bad.push('the strip does not link the practice umbrella');
  }
  return bad;
}

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/frq-pages-csv.js <out.csv> [--only <set_id>]');
    process.exit(2);
  }
  const onlyAt = argv.indexOf('--only');
  const only = onlyAt !== -1 ? argv[onlyAt + 1] : null;

  const specs = frq.all().filter((s) => !only || s.set_id === only);
  if (!specs.length) { console.error(only ? `no set '${only}'` : 'no sets authored'); process.exit(2); }

  const specErrors = frq.errors();
  if (specErrors.length) {
    console.error('Refusing to build pages while a spec is invalid:');
    specErrors.forEach((e) => console.error('  ' + e));
    process.exit(1);
  }

  // The index is built from ALL authored sets, never from the --only subset, so
  // rebuilding one page still points it at every sibling that exists.
  const index = practice.forCourse('ap-cybersecurity');

  const problems = [];
  const pages = [];
  for (const spec of specs) {
    let p;
    try { p = build(spec, index); } catch (e) { problems.push(`${spec.set_id}: ${e.message}`); continue; }
    for (const c of checkPage(p, spec, index)) problems.push(`${p.handle}: ${c}`);
    pages.push(p);
  }
  const handles = pages.map((p) => p.handle);
  if (new Set(handles).size !== handles.length) problems.push('two sets claim the same page handle');
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

  console.log(`Wrote ${pages.length} practice page(s) to ${out}`);
  pages.forEach((p) => console.log(`    ${p.handle}`));

  const injectorRisk = pages.filter((p) => p.handle.includes('frq'));
  if (injectorRisk.length) {
    console.log('\nDependency, satisfied and re-checked against the live storefront:');
    console.log('  These handles contain "frq", which the theme\'s FRQ auto-CTA injector');
    console.log('  once keyed on, stapling AP CSA Java nav and CTAs onto any such page.');
    console.log('  Theme PR #73 narrowed that gate to require "csa" too, and the served');
    console.log('  page carries both early returns, so cyber pages are skipped.');
    console.log('  If a cyber practice page ever renders Java study guide links under the');
    console.log('  question, that gate was widened again. Read the injector in');
    console.log('  layout/theme.liquid before blaming this sheet. Note that grepping a');
    console.log('  rendered cyber page for "java" proves nothing either way: the global');
    console.log('  nav links the Java course on every page of the site.');
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { build, checkPage, COPY, API };

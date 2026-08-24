'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DEVICE SECURITY ANALYSIS pages: the Matrixify sheet.
//
//  Same socket-and-appliance split as scripts/lab-pages-csv.js. The page body
//  is a heading, real prose, a mount point and three script tags; the question
//  itself is rendered by /frq-player.js from the spec at /api/frq. Editing a
//  sample response is a commit, never another import.
//
//  HANDLE HAZARD, INHERITED FROM THE THEME
//  layout/theme.liquid carries an "FRQ PAGE AUTO-CTA INJECTOR" that fires on
//  ANY url containing "frq" and staples AP CSA Java navigation and CTAs onto
//  the page. A cyber page called ap-cybersecurity-frq-... gets Java study guide
//  links injected into it. The injector has a skipPages list, so the fix is a
//  theme change, not a rename. Until that lands this script WARNS on every
//  handle containing "frq" rather than silently shipping a page that will be
//  vandalised by a script from another course.
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty. One import at a time.
//
//  Run: node scripts/frq-pages-csv.js out.csv [--only <set_id>]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const frq = require('../lib/frq-spec');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const API = 'https://progress.apcsexamprep.com';

// Page copy per set. Authored here rather than in the spec because it is what a
// search result and a first time visitor read, and it is never shown inside the
// question itself.
const COPY = {
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

function build(spec) {
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

function checkPage(p, spec) {
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

  const problems = [];
  const pages = [];
  for (const spec of specs) {
    let p;
    try { p = build(spec); } catch (e) { problems.push(`${spec.set_id}: ${e.message}`); continue; }
    for (const c of checkPage(p, spec)) problems.push(`${p.handle}: ${c}`);
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
    console.log('\nWARNING, read before importing:');
    console.log('  layout/theme.liquid injects AP CSA Java nav and CTAs into ANY page whose');
    console.log('  URL contains "frq". These handles do:');
    injectorRisk.forEach((p) => console.log('    ' + p.handle));
    console.log('  Add them to the injector\'s skipPages list in the theme FIRST, or these');
    console.log('  cyber pages will render Java study guide links under the question.');
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { build, checkPage, COPY, API };

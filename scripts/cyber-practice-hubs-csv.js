'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CYBER PRACTICE HUBS: the Matrixify sheet for three new pages.
//
//  ── THE PROBLEM THESE PAGES SOLVE ──────────────────────────────────────────
//  Four Device Security Analysis pages went live and were linked from NOWHERE.
//  Checked against the storefront, not inferred: the practice exam page, the
//  Command Center and the complete course guide contained zero occurrences of
//  any of the four handles, and the four did not link to each other either.
//  They were reachable only by typing the URL.
//
//  That is not a missing link, it is a missing layer. Cyber has a course spine
//  (the guide and 24 lesson pages) and it has individual artifacts, and there
//  was nothing in between, so every practice page ever built lands orphaned by
//  default. Board item #73 counts 101 pages with no inbound internal links,
//  which is the same failure at scale.
//
//  ── THREE PAGES, AND WHY EACH ─────────────────────────────────────────────
//  ap-cybersecurity-frq-practice   the FRQ hub. The ranking priority: nothing
//                                  else on the web explains that the AP
//                                  Cybersecurity free-response is ONE Device
//                                  Security Analysis and then hands you four
//                                  full sets.
//  ap-cybersecurity-labs           the labs hub. Two terminal labs today, and
//                                  the page that stops the third from
//                                  shipping orphaned.
//  ap-cybersecurity-practice       the umbrella. One URL a teacher can forward
//                                  to a class that reaches everything.
//
//  ── STATIC AND LIVE AT THE SAME TIME ──────────────────────────────────────
//  The cards are generated here as real HTML from the specs, because a page
//  whose content only appears after JavaScript is a page a crawler reads as
//  empty, and the FRQ hub has to rank by spring. /practice-hub.js then
//  re-renders the same cards from /api/practice on load, so a fifth set
//  appears without another import. Both halves call the SAME renderer in
//  public/practice-hub.js, so the static HTML cannot drift from the live one.
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty. One import at a time.
//
//  HANDLE SAFETY: all three handles were confirmed 404 on the live storefront
//  before this script was written. MERGE against an existing handle overwrites
//  its body, and that near-miss has already happened once on a cyber lab page.
//  Re-check before adding a handle here.
//
//  Run: node scripts/cyber-practice-hubs-csv.js out.csv [--only <handle>]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const hub = require('../public/practice-hub.js');
const practice = require('../lib/practice-index');
const frq = require('../lib/frq-spec');
const labs = require('../lib/lab-spec');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const API = 'https://progress.apcsexamprep.com';
const STORE = 'https://www.apcsexamprep.com';
const COURSE = 'ap-cybersecurity';

const P = {
  frq: 'ap-cybersecurity-frq-practice',
  labs: 'ap-cybersecurity-labs',
  umbrella: 'ap-cybersecurity-practice',
  exam: 'ap-cybersecurity-practice-exam',
  format: 'ap-cybersecurity-exam-format',
  guide: 'ap-cybersecurity-complete-course-guide',
  cc: 'cyber-command-center',
};

const esc = hub.esc;
function link(handle, text) { return `<a href="${STORE}/pages/${handle}">${esc(text)}</a>`; }

// A section wrapper the refresher can find. The data attributes are the whole
// contract between the generated HTML and public/practice-hub.js: it looks for
// [data-practice-course][data-practice-kind] and replaces the contents.
function liveSection(kind, innerHtml) {
  return `<div data-practice-course="${COURSE}" data-practice-kind="${kind}">${innerHtml}</div>`;
}

function scripts() {
  return [
    `<script>window.APCS_PRACTICE={base:${JSON.stringify(API)}};</` + 'script>',
    `<script src="${API}/practice-hub.js"></` + 'script>',
  ].join('\n');
}

// ── the FRQ hub ──────────────────────────────────────────────────────────────
// The prose here is the reason the page can rank: it states the exam's real
// shape, which the site itself got wrong in nine places until recently. Every
// factual claim below traces to docs/cyber-exam-format.md, which traces to CED
// page 147. Do not soften these numbers to match a page that disagrees; fix
// the page.
function buildFrqHub(index) {
  const n = index.frq.length;
  const body = [
    '<div class="ph-page">',
    hub.styleTag(),
    '<style>.ph-page{max-width:1040px;margin:0 auto}.ph-page p{line-height:1.6}',
    '.ph-page .ph-lede{font-size:18px;line-height:1.55;margin:0 0 14px}',
    '.ph-page .ph-note{background:#eef3f7;border-left:3px solid #2f6f8f;padding:11px 15px;',
    'border-radius:0 6px 6px 0;margin:16px 0 24px}',
    '.ph-page h2{font-size:22px;margin:30px 0 8px}',
    '.ph-page table{border-collapse:collapse;font-size:14.5px;width:100%;margin:12px 0 22px}',
    '.ph-page th,.ph-page td{border:1px solid #dbe3ea;padding:7px 11px;text-align:left;vertical-align:top}',
    '.ph-page th{background:#f4f7fa;font-size:12px;text-transform:uppercase;letter-spacing:.03em}',
    '</style>',
    '<h1>AP Cybersecurity Free Response Practice: Device Security Analysis</h1>',
    '<p class="ph-lede">Section II of the AP Cybersecurity exam is one question. It is always called '
      + 'Device Security Analysis, it is always parts A through E about a single device, and you are '
      + 'given 50 minutes for it.</p>',
    '<p>That is the whole free-response section. There is no choice of question and no second prompt, '
      + 'so the entire section is one format you can rehearse until it is familiar. Below are '
      + `${n} complete practice questions in that exact shape, each with sample responses and the `
      + 'specific points that earn credit.</p>',
    '<p class="ph-note">These are self-scored. You write your responses on paper or in your own '
      + 'editor, reveal the sample, and mark yourself. Nothing you write is collected, sent or '
      + 'stored, and no score reaches a gradebook.</p>',

    '<h2>The practice sets</h2>',
    '<p>Work them in order if you are new to the format. The first is deliberately the '
      + 'straightforward one, and each later set hides something the earlier ones did not.</p>',
    liveSection('frq', hub.grid(index, 'frq', API)),

    '<h2>What each part asks</h2>',
    '<p>Every Device Security Analysis uses the same five parts against different evidence. Knowing '
      + 'which source answers which part is most of the speed you need on exam day.</p>',
    '<table>',
    '<tr><th>Part</th><th>What it is about</th><th>What you are asked to do</th></tr>',
    '<tr><td>A</td><td>The acceptable use policy</td><td>Explain how one part of the policy protects '
      + 'the device, and how one rule could be modified to protect it better.</td></tr>',
    '<tr><td>B</td><td>The authorization log</td><td>Describe the evidence of a password attack, and '
      + 'identify the IP address of the adversary.</td></tr>',
    '<tr><td>C</td><td>File permissions</td><td>Explain what one file\'s mode grants its owner, group '
      + 'and others, describe a change that restricts access, and write the chmod command that makes '
      + 'it.</td></tr>',
    '<tr><td>D</td><td>The firewall rules</td><td>Explain how a connection attempt was blocked, '
      + 'describe a rule change that would allow it, and describe a side effect of that change.</td></tr>',
    '<tr><td>E</td><td>A second attack</td><td>Determine its type, describe the log evidence, describe '
      + 'how an automated system could stop it in real time, and identify a countermeasure that is not '
      + 'automated.</td></tr>',
    '</table>',
    '<p>Part C is the one people are surprised by: it asks you to <strong>write an actual shell '
      + 'command</strong>. Write is a CED task verb, and chmod is what the CED\'s own sample asks for. '
      + 'If typing a command in a terminal is unfamiliar, the '
      + link(P.labs, 'terminal labs') + ' are the practice for it.</p>',

    '<h2>How the sources work</h2>',
    '<p>You are handed several simulated sources from one device: firewall rules as a numbered table, '
      + 'an application log, an authorization log, a listing of what the device is running or '
      + 'listening on, a file listing with permissions, and an acceptable use policy. Every part '
      + 'expects you to cite specific evidence out of them, by row, by address, by filename.</p>',
    '<p>Reading across sources is the skill being tested. Section II covers Skill Categories 2 and 3 '
      + 'only, Mitigate Risk and Detect Attacks, which is why every part either finds something in '
      + 'the evidence or fixes something in the configuration.</p>',

    '<h2>Where this fits in the exam</h2>',
    '<p>The exam is 60 multiple-choice questions in Section I, drawn from all five units, and this '
      + 'one free-response question in Section II. For the multiple-choice half, use the '
      + link(P.exam, 'AP Cybersecurity practice exam') + '. The full breakdown of both sections is on '
      + 'the ' + link(P.format, 'exam format page') + '.</p>',
    '<p>Everything practice on one page: ' + link(P.umbrella, 'AP Cybersecurity practice') + '. '
      + 'Course content by unit: ' + link(P.guide, 'the complete course guide') + '.</p>',
    scripts(),
    '</div>',
  ].join('\n');

  return {
    handle: P.frq,
    title: 'AP Cybersecurity Free Response Practice: Device Security Analysis',
    seoTitle: 'AP Cybersecurity Free Response Practice | Device Security Analysis',
    seoDescription: 'The AP Cybersecurity free response is one Device Security Analysis: parts A to E, '
      + `50 minutes. ${n} full practice questions with sample responses and credit points.`,
    bodyHtml: body,
  };
}

// ── the labs hub ─────────────────────────────────────────────────────────────
function buildLabsHub(index) {
  const n = index.labs.length;
  const body = [
    '<div class="ph-page">',
    hub.styleTag(),
    '<style>.ph-page{max-width:1040px;margin:0 auto}.ph-page p{line-height:1.6}',
    '.ph-page .ph-lede{font-size:18px;line-height:1.55;margin:0 0 14px}',
    '.ph-page .ph-note{background:#eef3f7;border-left:3px solid #2f6f8f;padding:11px 15px;',
    'border-radius:0 6px 6px 0;margin:16px 0 24px}',
    '.ph-page h2{font-size:22px;margin:30px 0 8px}</style>',
    '<h1>AP Cybersecurity Terminal Labs</h1>',
    '<p class="ph-lede">A real terminal in the browser, a pretend machine behind it, and a job to do. '
      + 'No install, no virtual machine, no account needed to try one.</p>',
    '<p>Each lab drops you into a filesystem with a brief and checks your work as you go. You navigate, '
      + 'read logs, inspect permissions and run commands, which is the same work the exam\'s '
      + 'free-response question asks you to reason about in writing.</p>',
    '<p class="ph-note">Part C of the AP Cybersecurity free-response asks students to <strong>write a '
      + 'chmod command</strong>. Write is a CED task verb. These labs are practice for a graded part '
      + 'of the exam, not an extra.</p>',
    '<h2>The labs</h2>',
    liveSection('labs', hub.grid(index, 'labs', API)),
    '<h2>Where these fit</h2>',
    '<p>Labs cover the doing. For the writing, the ' + link(P.frq, 'Device Security Analysis practice sets')
      + ' put the same evidence in front of you in the exam\'s own format. For the multiple-choice '
      + 'half, use the ' + link(P.exam, 'practice exam') + '.</p>',
    '<p>Everything practice on one page: ' + link(P.umbrella, 'AP Cybersecurity practice') + '. '
      + 'Course content by unit: ' + link(P.guide, 'the complete course guide') + '.</p>',
    scripts(),
    '</div>',
  ].join('\n');

  return {
    handle: P.labs,
    title: 'AP Cybersecurity Terminal Labs',
    seoTitle: 'AP Cybersecurity Terminal Labs | Hands-On Practice in a Browser',
    seoDescription: `${n} hands-on AP Cybersecurity labs that run a real terminal in your browser. `
      + 'Read logs, inspect permissions and write commands, with no install and no account.',
    bodyHtml: body,
  };
}

// ── the umbrella ─────────────────────────────────────────────────────────────
// One URL a teacher forwards to a class. It carries both card grids rather than
// linking away to them, because a page whose entire job is "here are the three
// other pages" is the kind of thin hub that makes a click feel wasted.
function buildUmbrella(index) {
  const body = [
    '<div class="ph-page">',
    hub.styleTag(),
    '<style>.ph-page{max-width:1040px;margin:0 auto}.ph-page p{line-height:1.6}',
    '.ph-page .ph-lede{font-size:18px;line-height:1.55;margin:0 0 14px}',
    '.ph-page h2{font-size:22px;margin:30px 0 8px}',
    '.ph-page .ph-sub{font-size:15px;color:#42556b;margin:0 0 4px}</style>',
    '<h1>AP Cybersecurity Practice</h1>',
    '<p class="ph-lede">Everything on this site you can practise with, in one place: the '
      + 'multiple-choice half, the free-response half, and the terminal labs.</p>',
    '<p>The AP Cybersecurity exam is 60 multiple-choice questions across all five units, then a '
      + 'single free-response question called Device Security Analysis with 50 minutes for it. '
      + 'The three sections below map onto that.</p>',

    '<h2>Multiple choice</h2>',
    '<p class="ph-sub">Section I of the exam: 60 questions, all five units, three skill categories.</p>',
    '<p>' + link(P.exam, 'AP Cybersecurity practice exam') + ' gives you scored questions with '
      + 'explanations. The ' + link(P.format, 'exam format page') + ' has the full breakdown of how '
      + 'the exam is built.</p>',

    '<h2>Free response</h2>',
    '<p class="ph-sub">Section II: one Device Security Analysis, parts A to E, 50 minutes.</p>',
    '<p>Full practice questions in the exam\'s exact format, each with sample responses and credit '
      + 'points. More on the format and what each part asks: ' + link(P.frq, 'the FRQ practice hub')
      + '.</p>',
    liveSection('frq', hub.grid(index, 'frq', API)),

    '<h2>Terminal labs</h2>',
    '<p class="ph-sub">Hands-on work in a real browser terminal. No install, no account.</p>',
    '<p>Practice for the commands the free-response question asks you to write. All of them: '
      + link(P.labs, 'the terminal labs hub') + '.</p>',
    liveSection('labs', hub.grid(index, 'labs', API)),

    '<h2>Course content</h2>',
    '<p>Lessons, units and pacing rather than practice: '
      + link(P.guide, 'the complete course guide') + ' for students, and '
      + link(P.cc, 'the Command Center') + ' for teachers.</p>',
    scripts(),
    '</div>',
  ].join('\n');

  return {
    handle: P.umbrella,
    title: 'AP Cybersecurity Practice',
    seoTitle: 'AP Cybersecurity Practice | MCQ, Free Response and Terminal Labs',
    seoDescription: 'Free AP Cybersecurity practice in one place: multiple-choice with explanations, '
      + 'full Device Security Analysis free-response sets, and hands-on terminal labs.',
    bodyHtml: body,
  };
}

// ── checks ───────────────────────────────────────────────────────────────────
// Same house rules as scripts/frq-pages-csv.js, plus the two that are specific
// to a generated hub: it must actually contain every authored item (the whole
// point), and the live-refresh contract must be intact in both directions.
function checkPage(p, index) {
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
  const opens = (b.match(/<script[\s>]/g) || []).length;
  const closes = (b.match(/<\/script>/g) || []).length;
  if (opens !== closes) bad.push(`${opens} script open tags vs ${closes} closes`);
  if (/<\\\/script>/.test(b)) bad.push('an escaped <\\/script> would leave a block unclosed');
  if (!b.includes('/practice-hub.js')) bad.push('the refresher script is missing');
  if (!b.includes('window.APCS_PRACTICE')) bad.push('the API origin is never set');

  // The refresh contract, checked from both ends: every section the refresher
  // would target must name a kind it can actually render, and a page carrying
  // cards must carry a section around them or the cards will never refresh.
  const kinds = (b.match(/data-practice-kind="([a-z]+)"/g) || [])
    .map((m) => /"([a-z]+)"/.exec(m)[1]);
  for (const k of kinds) {
    if (k !== 'frq' && k !== 'labs') bad.push(`section declares unknown kind '${k}'`);
  }
  const gridCount = (b.match(/<div class="ph-grid">/g) || []).length;
  if (gridCount > kinds.length) {
    bad.push(`${gridCount} card grids but only ${kinds.length} refreshable sections`);
  }
  if (kinds.length && !b.includes(`data-practice-course="${COURSE}"`)) {
    bad.push('a section names no course, so the refresher cannot fetch for it');
  }

  // The reason this page exists: nothing authored may be missing from it.
  for (const k of new Set(kinds)) {
    for (const item of index[k]) {
      const id = k === 'frq' ? item.set_id : item.item_id;
      const href = item.page_url || (API + item.url);
      if (!b.includes(href)) bad.push(`does not link ${k} '${id}' (${href})`);
    }
  }

  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  const t = String(p.seoTitle || '');
  if (t.length > 70) bad.push(`SEO title is ${t.length} chars, must be 70 or fewer`);
  return bad;
}

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/cyber-practice-hubs-csv.js <out.csv> [--only <handle>]');
    process.exit(2);
  }
  const onlyAt = argv.indexOf('--only');
  const only = onlyAt !== -1 ? argv[onlyAt + 1] : null;

  const specErrors = frq.errors().concat(labs.errors());
  if (specErrors.length) {
    console.error('Refusing to build hubs while a spec is invalid:');
    specErrors.forEach((e) => console.error('  ' + e));
    process.exit(1);
  }

  const index = practice.forCourse(COURSE);
  if (!index.frq.length && !index.labs.length) {
    console.error(`no practice authored for ${COURSE}; a hub would be an empty page`);
    process.exit(1);
  }

  const pages = [buildFrqHub(index), buildLabsHub(index), buildUmbrella(index)]
    .filter((p) => !only || p.handle === only);
  if (!pages.length) { console.error(`no hub with handle '${only}'`); process.exit(2); }

  const problems = [];
  for (const p of pages) for (const c of checkPage(p, index)) problems.push(`${p.handle}: ${c}`);
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

  console.log(`Wrote ${pages.length} hub page(s) to ${out}`);
  pages.forEach((p) => console.log(`    ${p.handle}  (${p.bodyHtml.length} bytes)`));
  console.log(`\nIndexed for ${COURSE}: ${index.counts.frq} FRQ set(s), ${index.counts.labs} lab(s).`);
  console.log('Every one of them is linked from at least one page in this sheet.');
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { buildFrqHub, buildLabsHub, buildUmbrella, checkPage, P, COURSE, API, STORE };

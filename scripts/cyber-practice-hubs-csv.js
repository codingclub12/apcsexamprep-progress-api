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
const liveGuard = require('../lib/live-body-guard');

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

// ── THE HOUSE STYLE ─────────────────────────────────────────────────────────
// Lifted from ap-cybersecurity-complete-course-guide rather than invented. Every
// other cyber page is a dark purple hero over a Georgia body, with DM Serif
// Display headings, cards on #F5F0FF inside #e9d5ff borders at 14px radius, and
// purple buttons carrying an arrow.
//
// The first cut of these hubs was teal and system sans, which did not read as
// unstyled so much as foreign: correct content wearing another product's
// clothes, sitting one click from pages that look nothing like it.
//
// ASCII only, so the arrow is an entity. The generator rejects non-ASCII and
// the repo forbids em-dashes, both of which the guide itself ignores.
const PURPLE = '#6B21A8';
const PURPLE2 = '#7C3AED';
const NAVY = '#1E1B4B';

function chrome(extra) {
  return [
    '<style>',
    // 900 rather than 1060. The measure cap on paragraphs is 72ch, so a wider
    // container left prose hugging the left edge with a dead gutter beside it
    // while the cards and the table ran full width. Matching the container to
    // the measure removes the mismatch, and two cards still sit per row.
    '.ph-page{max-width:900px;margin:0 auto;font-family:Georgia,serif;color:#1F2937;}',
    // A measure, not a container width. 110 characters a line is why the first
    // cut read as a wall: the container was 1040px and the prose filled it.
    '.ph-page p{font-size:16.5px;line-height:1.7;max-width:72ch;margin:0 0 14px;}',
    '.ph-page h2{font-family:"DM Serif Display",Georgia,serif;font-size:27px;color:' + NAVY + ';',
    'margin:38px 0 6px;font-weight:400;}',
    '.ph-page a{color:' + PURPLE + ';}',
    // hero
    '.ph-hero{background:linear-gradient(135deg,#2E1065 0%,' + PURPLE + ' 62%,' + PURPLE2 + ' 100%);',
    'border-radius:18px;padding:40px 34px 34px;margin:0 0 26px;text-align:center;color:#fff;}',
    '.ph-hero h1{font-family:"DM Serif Display",Georgia,serif;font-size:40px;line-height:1.15;',
    'color:#fff;margin:0 0 12px;font-weight:400;}',
    '.ph-eyebrow{display:inline-block;font-family:"DM Sans",system-ui,sans-serif;font-size:11.5px;',
    'font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#E9D5FF;',
    'background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.22);',
    'border-radius:999px;padding:6px 16px;margin:0 0 16px;}',
    '.ph-hero p{font-size:17px;line-height:1.6;color:#EDE9FE;max-width:64ch;margin:0 auto;}',
    // the stat row: the facts a visitor wants before reading a word
    '.ph-stats{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;',
    'margin:26px auto 0;max-width:640px;}',
    '@media (max-width:640px){.ph-stats{grid-template-columns:1fr 1fr;}}',
    '.ph-stat b{display:block;font-family:"DM Serif Display",Georgia,serif;font-size:26px;',
    'color:#fff;font-weight:400;line-height:1.1;}',
    '.ph-stat span{display:block;font-family:"DM Sans",system-ui,sans-serif;font-size:10.5px;',
    'font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#C4B5FD;margin-top:5px;}',
    // the self-scored note, as the guide styles its green strip
    '.ph-note{background:#F0FDF4;border:1px solid #BBF7D0;border-left:4px solid #15803D;',
    'border-radius:0 10px 10px 0;padding:14px 18px;margin:18px 0 28px;}',
    '.ph-note p{margin:0;font-size:15.5px;}',
    // section band, for the closing "where this fits"
    '.ph-band{background:#F5F0FF;border:1px solid #e9d5ff;border-radius:14px;',
    'padding:22px 24px;margin:30px 0 0;}',
    '.ph-band h2{margin-top:0;}',
    '.ph-band p:last-child{margin-bottom:0;}',
    // table
    '.ph-page table{border-collapse:separate;border-spacing:0;width:100%;margin:14px 0 20px;',
    'font-family:Georgia,serif;font-size:15px;border:1px solid #e9d5ff;border-radius:12px;',
    'overflow:hidden;}',
    '.ph-page th{background:#F5F0FF;font-family:"DM Sans",system-ui,sans-serif;font-size:11px;',
    'font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:' + PURPLE + ';',
    'text-align:left;padding:11px 14px;}',
    '.ph-page td{padding:11px 14px;border-top:1px solid #F3E8FF;vertical-align:top;line-height:1.55;}',
    '.ph-page td:first-child{font-family:"DM Serif Display",Georgia,serif;font-size:19px;',
    'color:' + PURPLE + ';width:52px;}',
    extra || '',
    '</style>',
  ].join('');
}

function hero(eyebrow, title, sub, stats) {
  const cells = stats.map((st) => '<div class="ph-stat"><b>' + esc(st[0]) + '</b><span>'
    + esc(st[1]) + '</span></div>').join('');
  return [
    '<div class="ph-hero">',
    '<div class="ph-eyebrow">' + esc(eyebrow) + '</div>',
    '<h1>' + esc(title) + '</h1>',
    '<p>' + esc(sub) + '</p>',
    '<div class="ph-stats">' + cells + '</div>',
    '</div>',
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
    chrome(),
    hero('Section II of the exam',
      'AP Cybersecurity Free Response Practice',
      'The free response is one question. It is always Device Security Analysis, always parts A '
        + 'through E about a single device, and you are given 50 minutes for it.',
      [[String(n), 'full practice sets'], ['50', 'minutes each'], ['A to E', 'parts every time'],
        ['Free', 'no account']]),

    '<p>That is the whole free-response section. There is no choice of question and no second '
      + 'prompt, so the entire section is one format you can rehearse until it is familiar. Below '
      + `are ${n} complete practice questions in that exact shape, each with sample responses and `
      + 'the specific points that earn credit.</p>',
    '<div class="ph-note"><p><strong>These are self-scored.</strong> You write your responses on '
      + 'paper or in your own editor, reveal the sample, and mark yourself. Nothing you write is '
      + 'collected, sent or stored, and no score reaches a gradebook.</p></div>',

    '<h2>The practice sets</h2>',
    '<p>Work them in order if you are new to the format. The first is deliberately the '
      + 'straightforward one, and each later set hides something the earlier ones did not.</p>',
    liveSection('frq', hub.grid(index, 'frq', API)),

    '<h2>What each part asks</h2>',
    '<p>Every Device Security Analysis uses the same five parts against different evidence. '
      + 'Knowing which source answers which part is most of the speed you need on exam day.</p>',
    '<table>',
    '<tr><th>Part</th><th>What it is about</th><th>What you are asked to do</th></tr>',
    '<tr><td>A</td><td>The acceptable use policy</td><td>Explain how one part of the policy '
      + 'protects the device, and how one rule could be modified to protect it better.</td></tr>',
    '<tr><td>B</td><td>The authorization log</td><td>Describe the evidence of a password attack, '
      + 'and identify the IP address of the adversary.</td></tr>',
    '<tr><td>C</td><td>File permissions</td><td>Explain what one file\'s mode grants its owner, '
      + 'group and others, describe a change that restricts access, and write the chmod command '
      + 'that makes it.</td></tr>',
    '<tr><td>D</td><td>The firewall rules</td><td>Explain how a connection attempt was blocked, '
      + 'describe a rule change that would allow it, and describe a side effect of that '
      + 'change.</td></tr>',
    '<tr><td>E</td><td>A second attack</td><td>Determine its type, describe the log evidence, '
      + 'describe how an automated system could stop it in real time, and identify a countermeasure '
      + 'that is not automated.</td></tr>',
    '</table>',
    '<p>Part C is the one people are surprised by: it asks you to <strong>write an actual shell '
      + 'command</strong>. Write is a CED task verb, and chmod is what the CED\'s own sample asks '
      + 'for. If typing a command in a terminal is unfamiliar, the '
      + link(P.labs, 'terminal labs') + ' are the practice for it.</p>',

    '<h2>How the sources work</h2>',
    '<p>You are handed several simulated sources from one device: firewall rules as a numbered '
      + 'table, an application log, an authorization log, a listing of what the device is running '
      + 'or listening on, a file listing with permissions, and an acceptable use policy. Every part '
      + 'expects you to cite specific evidence out of them, by row, by address, by filename.</p>',
    '<p>Reading across sources is the skill being tested. Section II covers Skill Categories 2 and '
      + '3 only, Mitigate Risk and Detect Attacks, which is why every part either finds something '
      + 'in the evidence or fixes something in the configuration.</p>',

    '<div class="ph-band">',
    '<h2>Where this fits in the exam</h2>',
    '<p>The exam is 60 multiple-choice questions in Section I, drawn from all five units, and this '
      + 'one free-response question in Section II. For the multiple-choice half, use the '
      + link(P.exam, 'AP Cybersecurity practice exam') + '. The full breakdown of both sections is '
      + 'on the ' + link(P.format, 'exam format page') + '.</p>',
    '<p>Everything practice on one page: ' + link(P.umbrella, 'AP Cybersecurity practice') + '. '
      + 'Course content by unit: ' + link(P.guide, 'the complete course guide') + '.</p>',
    '</div>',
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
  const mins = index.labs.reduce((t, l) => t + (l.est_minutes || 0), 0);
  const checks = index.labs.reduce((t, l) => t + (l.checks || 0), 0);
  const body = [
    '<div class="ph-page">',
    hub.styleTag(),
    chrome(),
    hero('Hands on, in the browser',
      'AP Cybersecurity Terminal Labs',
      'A real terminal, a pretend machine behind it, and a job to do. No install, no virtual '
        + 'machine, and no account needed to try one.',
      [[String(n), 'labs'], [String(mins) + ' min', 'of practice'], [String(checks), 'checks to tick'],
        ['Free', 'no account']]),

    '<p>Each lab drops you into a filesystem with a brief and checks your work as you go. You '
      + 'navigate, read logs, inspect permissions and run commands, which is the same work the '
      + 'exam\'s free-response question asks you to reason about in writing.</p>',
    '<div class="ph-note"><p>Part C of the AP Cybersecurity free-response asks students to '
      + '<strong>write a chmod command</strong>. Write is a CED task verb. These labs are practice '
      + 'for a graded part of the exam, not an extra.</p></div>',

    '<h2>The labs</h2>',
    liveSection('labs', hub.grid(index, 'labs', API)),

    '<div class="ph-band">',
    '<h2>Where these fit</h2>',
    '<p>Labs cover the doing. For the writing, the '
      + link(P.frq, 'Device Security Analysis practice sets')
      + ' put the same evidence in front of you in the exam\'s own format. For the '
      + 'multiple-choice half, use the ' + link(P.exam, 'practice exam') + '.</p>',
    '<p>Everything practice on one page: ' + link(P.umbrella, 'AP Cybersecurity practice') + '. '
      + 'Course content by unit: ' + link(P.guide, 'the complete course guide') + '.</p>',
    '</div>',
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
    // The eyebrow sits ABOVE its heading, the way the course guide puts FOR
    // TEACHERS above its h2. Below the heading and set in loud uppercase it
    // outshouted the serif h2 it was supposed to be subordinate to, and the
    // longer ones wrapped to two lines of shouting.
    chrome('.ph-sub{font-family:"DM Sans",system-ui,sans-serif;font-size:11px;font-weight:700;'
      + 'letter-spacing:.09em;text-transform:uppercase;color:#7C3AED;margin:34px 0 0;}'
      + '.ph-sub+h2{margin-top:4px;}'),
    hero('Everything in one place',
      'AP Cybersecurity Practice',
      'The multiple-choice half, the free-response half, and the terminal labs. The exam is 60 '
        + 'questions in Section I and one Device Security Analysis in Section II.',
      [['60', 'MCQ in section I'], ['1', 'free response'], [String(index.frq.length), 'FRQ sets'],
        [String(index.labs.length), 'terminal labs']]),

    '<p class="ph-sub">Section I of the exam</p>',
    '<h2>Multiple choice</h2>',
    '<p>60 questions, drawn from all five units and the three skill categories. '
      + link(P.exam, 'The AP Cybersecurity practice exam') + ' gives you scored questions with '
      + 'explanations. The ' + link(P.format, 'exam format page') + ' has the full breakdown of how '
      + 'the exam is built.</p>',

    '<p class="ph-sub">Section II of the exam</p>',
    '<h2>Free response</h2>',
    '<p>One Device Security Analysis, parts A to E, 50 minutes. Full practice questions in the '
      + 'exam\'s exact format, each with sample responses and credit '
      + 'points. More on the format and what each part asks: ' + link(P.frq, 'the FRQ practice hub')
      + '.</p>',
    liveSection('frq', hub.grid(index, 'frq', API)),

    '<p class="ph-sub">Hands on</p>',
    '<h2>Terminal labs</h2>',
    '<p>A real browser terminal, no install and no account. Practice for the commands the '
      + 'free-response question asks you to write. All of them: '
      + link(P.labs, 'the terminal labs hub') + '.</p>',
    liveSection('labs', hub.grid(index, 'labs', API)),

    '<div class="ph-band">',
    '<h2>Course content</h2>',
    '<p>Lessons, units and pacing rather than practice: '
      + link(P.guide, 'the complete course guide') + ' for students, and '
      + link(P.cc, 'the Command Center') + ' for teachers.</p>',
    '</div>',
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

async function main(argv) {
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

  // Every page below MERGEs over whatever is live at that handle, and Shopify
  // keeps no history to undo it with. So before anything is written, compare
  // against the storefront. See lib/live-body-guard.js and the /pages/join
  // incident of 2026-08-22.
  await liveGuard.guard(pages.map((p) => ({ handle: p.handle, bodyHtml: p.bodyHtml })), argv);

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

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = { buildFrqHub, buildLabsHub, buildUmbrella, checkPage, P, COURSE, API, STORE };

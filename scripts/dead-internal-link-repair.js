#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTERNAL /pages/ LINKS THAT GO NOWHERE, AND THE ONES THAT ARE JUST TYPOS.
//
//  docs/runs/2026-08-27-claude-code-internal-linking.md found two hrefs on one
//  CSA lesson page carrying a percent-encoded newline INSIDE the handle:
//
//      /pages/ap-csa-les%0Ason-4-5-algorithms-with-arrays
//      /pages/ap-csa-lesson-4-15-sorting-algorith%0Ams
//
//  Both 404. Both intended targets are live pages. Six days later both are
//  still live on the storefront, so this reads the bodies again rather than
//  trusting that report, and fixes what it can prove.
//
//  THE REPAIR RULE, AND WHY IT CANNOT GUESS WRONG
//  A Shopify handle is lowercase letters, digits and hyphens. Nothing else can
//  legally appear in one. So the only repair this program will make is:
//
//      delete the characters that cannot be in a handle at all,
//      and accept the result ONLY if it is a handle the sitemap says is live.
//
//  Both halves are required. Deleting an illegal character is not a guess, it
//  is removing something that could not have been intended. Requiring the
//  result to be live is what stops a plausible-looking string being written
//  into a page as a link to nothing. A dead link whose repair is not provable
//  this way is REPORTED and left alone: /pages/ap-csp-exam-prep-hub is not a
//  typo, it is a page that was never built, and inventing a target for it
//  would hide that.
//
//  The live handle set comes from sitemap_pages_1.xml, one handle per line, and
//  is never inferred from a handle pattern. Without it nothing runs.
//
//    node scripts/dead-internal-link-repair.js --bodies bodies/ \
//         --handles live-handles.txt [--out imports/YYYY-MM-DD]
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

//  Everything a handle may contain. Anything else in the path segment is
//  damage, whether it arrived percent-encoded or raw.
const LEGAL = /^[a-z0-9-]+$/;
//  Four sections carry authored links on this store and all four go wrong the
//  same way. Sweeping only /pages/ missed 18 dead links, three of them the
//  "Download free" button on a paid teacher bundle.
const SECTIONS = ['pages', 'products', 'collections', 'blogs'];
const HREF = new RegExp('href="(\\/(?:' + SECTIONS.join('|') + ')\\/[^"]*)"', 'g');

//  A href inside a <script> or a <style> is not a link. This storefront builds
//  its prev and next buttons at runtime from a table of handles, so the source
//  of 14 practice-test pages contains
//
//      '<a class="tn-arrow" href="/pages/'+prev.handle+'">'
//
//  which is working JavaScript, not a broken anchor. Reading it as one reported
//  28 dead links that do not exist and put a page-content bug on the board that
//  was really a bug in this scanner. lib/site-crawl.js records the same trap
//  costing seven false P0s, and docs/internal-linking.md records it again.
//
//  Blanked rather than deleted, so that every offset in the body still lines up
//  with the original: the repair records SPANS by index and they have to point
//  at the real text.
const NON_MARKUP = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const withoutScripts = (body) => body.replace(NON_MARKUP,
  (m) => m.replace(/[^\n]/g, ' '));

//  Percent-decode only the escapes we are willing to reason about, so a href
//  carrying a legitimately encoded character is left for a human.
const decodeControls = (s) => s.replace(/%(0A|0D|09|20|0a|0d)/g, (m, hex) =>
  String.fromCharCode(parseInt(hex, 16)));

const stripIllegal = (s) => s.replace(/[^a-z0-9-]/g, '');

//  Dead targets whose intended destination was read off the live site, one
//  entry per handle, never a pattern. An entry is used only if its target is a
//  live page, so a retired mapping fails loudly instead of writing a new 404.
const RETARGET = {
  //  TWO ENTRIES READ OFF THE SITE BY HAND.
  'pages/ap-csa-daily-practice': {
    to: 'daily-practice',
    why: 'the CSA lesson pages carry a "Start daily practice" button under '
      + '"Get the AP CSA daily practice question by email". /pages/daily-practice '
      + 'is live and its own h1 is "AP CSA Daily Practice".',
  },
  'pages/ap-csa-unit-4-study-guide': {
    to: 'ap-csa-unit-4-data-collections-study-guide',
    why: 'the unit was renamed, not removed. Exactly one live handle matches '
      + 'ap-csa-unit-4-*study-guide, and Unit 4 of the 2025-2026 CED is Data '
      + 'Collections. 24 links, the largest single cluster.',
  },
  //  AND TWENTY WHERE THE LIVE HANDLE IS THIS ONE PLUS THE PROBLEM NAME.
  //  Generated from the sweep, then read one by one before being written here.
  //  The property is checked again by the suite against the committed handle
  //  list, and again by verify-dead-link-sheet.py, which re-derives it rather
  //  than reading this map.
  //
  //  TWO THAT LOOK LIKE THESE AND ARE NOT HERE, because a unique extension is a
  //  proposal and not a proof:
  //    ap-computer-science-a  extends uniquely to ap-computer-science-a-tutor,
  //      which is a tutoring sales page. 20 links about the course would land
  //      on it. The right target is the CSA hub, and which URL that is depends
  //      on the consolidation decision that Search Console is still blocking.
  //    ap-csa-study-games  extends uniquely to ap-csa-study-games-hub, but the
  //      live storefront 301s that URL to ap-csa-exam-prep-hub instead. Two
  //      plausible targets is not one.
  'pages/ap-csa-2019-frq-1': {
    to: 'ap-csa-2019-frq-1-apcalendar',
    why: 'the only live page whose handle extends this one, 7 links',
  },
  'pages/ap-csa-2019-frq-2': {
    to: 'ap-csa-2019-frq-2-steptracker',
    why: 'the only live page whose handle extends this one, 6 links',
  },
  'pages/ap-csa-2019-frq-3': {
    to: 'ap-csa-2019-frq-3-delimiters',
    why: 'the only live page whose handle extends this one, 8 links',
  },
  'pages/ap-csa-2019-frq-4': {
    to: 'ap-csa-2019-frq-4-lightboard',
    why: 'the only live page whose handle extends this one, 11 links',
  },
  'pages/ap-csa-2021-frq-1': {
    to: 'ap-csa-2021-frq-1-wordmatch',
    why: 'the only live page whose handle extends this one, 4 links',
  },
  'pages/ap-csa-2021-frq-2': {
    to: 'ap-csa-2021-frq-2-combinedtable',
    why: 'the only live page whose handle extends this one, 2 links',
  },
  'pages/ap-csa-2021-frq-3': {
    to: 'ap-csa-2021-frq-3-clubmembers',
    why: 'the only live page whose handle extends this one, 8 links',
  },
  'pages/ap-csa-2022-frq-1': {
    to: 'ap-csa-2022-frq-1-game',
    why: 'the only live page whose handle extends this one, 7 links',
  },
  'pages/ap-csa-2022-frq-2': {
    to: 'ap-csa-2022-frq-2-textbook',
    why: 'the only live page whose handle extends this one, 6 links',
  },
  'pages/ap-csa-2022-frq-4': {
    to: 'ap-csa-2022-frq-4-data',
    why: 'the only live page whose handle extends this one, 11 links',
  },
  'pages/ap-csa-2023-frq-1': {
    to: 'ap-csa-2023-frq-1-appointmentbook',
    why: 'the only live page whose handle extends this one, 7 links',
  },
  'pages/ap-csa-2023-frq-2': {
    to: 'ap-csa-2023-frq-2-sign',
    why: 'the only live page whose handle extends this one, 6 links',
  },
  'pages/ap-csa-2023-frq-3': {
    to: 'ap-csa-2023-frq-3-weatherdata',
    why: 'the only live page whose handle extends this one, 8 links',
  },
  'pages/ap-csa-2023-frq-4': {
    to: 'ap-csa-2023-frq-4-boxofcandy',
    why: 'the only live page whose handle extends this one, 11 links',
  },
  'pages/ap-csa-2024-frq-2': {
    to: 'ap-csa-2024-frq-2-scoreboard',
    why: 'the only live page whose handle extends this one, 2 links',
  },
  'pages/ap-csa-2024-frq-3': {
    to: 'ap-csa-2024-frq-3-wordchecker',
    why: 'the only live page whose handle extends this one, 4 links',
  },
  'pages/ap-csa-frqs': {
    to: 'ap-csa-frqs-by-topic',
    why: 'the only live page whose handle extends this one, 1 links',
  },
  'pages/ap-csa-loop-tracing': {
    to: 'ap-csa-loop-tracing-game',
    why: 'the only live page whose handle extends this one, 1 links',
  },
  'pages/ap-csa-unit-3-class-creation': {
    to: 'ap-csa-unit-3-class-creation-study-guide',
    why: 'the only live page whose handle extends this one, 1 links',
  },
  'pages/ap-cybersecurity-social-engineering': {
    to: 'ap-cybersecurity-social-engineering-tactics',
    why: 'the only live page whose handle extends this one, 2 links',
  },
  //  THREE MORE SECTIONS, ADDED AFTER SWEEPING ONLY /pages/ MISSED THEM.
  'products/ap-csa-unit-1-superpack-free': {
    to: 'ap-csa-teacher-superpack-free-preview',
    why: 'three buttons on /pages/ap-csa-teacher-superpack read "Download free", '
      + '"Free Unit 1 Preview" and "Free Unit 1 Preview, no purchase needed", and all '
      + 'three 404. Exactly one live product is the CSA teacher superpack free preview. '
      + 'A free-preview CTA on a paid teacher bundle going nowhere is a conversion leak.',
  },
  'blogs/daily-ap-csa-practice': {
    to: 'ap-csa-daily-practice',
    why: 'the same tokens in a different order, which docs/internal-linking.md already '
      + 'records as one of this site five naming irregularities. One live blog carries '
      + 'these tokens and it holds the 429 daily-practice articles. 6 links.',
  },
};

//  Split a href into its section, its handle and whatever query or fragment
//  trails it, so a repair never eats a ?variant= or a #anchor.
//  ONE path segment after the section, and no more. A /blogs/<blog>/<article>
//  link names an article, and this program has the blog list but not the
//  article list for six of the seven blogs. Checking it against the blog names
//  reported 50-odd live articles as dead the first time this ran. A link it
//  cannot check is counted as unchecked, never as broken.
function parseHref(href) {
  const m = new RegExp('^\\/(' + SECTIONS.join('|') + ')\\/([^/?#]*)([?#].*)?$').exec(href);
  return m ? { section: m[1], handle: m[2], tail: m[3] || '' } : null;
}

//  A repair never moves a link between sections. /pages/ap-csa-daily-practice
//  and /blogs/ap-csa-daily-practice are different pages with different content,
//  and choosing between them is a content decision rather than a repair. Every
//  rule below therefore resolves inside the section the link already names.
const setFor = (live, section) => (live && live[section]) || new Set();

function classify(href, live) {
  const p = parseHref(href);
  if (!p) return { kind: 'unchecked', href };
  const within = setFor(live, p.section);
  if (within.has(p.handle)) return { kind: 'ok', href };
  //  RULE 1, a typo. Illegal characters deleted, and the result has to be a
  //  page the sitemap says is live.
  const cleaned = stripIllegal(decodeControls(p.handle).toLowerCase());
  if (cleaned !== p.handle && within.has(cleaned)) {
    return { kind: 'repair', rule: 'typo', href, to: `/${p.section}/${cleaned}${p.tail}`,
      target: cleaned, section: p.section };
  }
  //  RULE 2, retargeted by hand. Not a rule at all: a named map, one entry per
  //  dead target, each carrying the evidence that says where it was meant to
  //  go. The target has to be live or the entry is refused.
  //
  //  There WAS a rule here and it was wrong. It said: a correctly spelled
  //  handle that is not a page but IS a live blog only has the wrong section,
  //  so /pages/ap-csa-daily-practice becomes /blogs/ap-csa-daily-practice.
  //  That is provable and it is still the wrong destination. The button says
  //  "Start daily practice" under a heading offering the question by email,
  //  and /pages/daily-practice is live with <h1>AP CSA Daily Practice</h1>.
  //  The handle was not right with the wrong section in front of it; the
  //  handle was simply wrong. A rule that moves a URL between sections is
  //  deciding what KIND of thing the reader lands on, which is a content
  //  decision wearing a typo's clothes.
  const mapped = RETARGET[`${p.section}/${p.handle}`];
  if (mapped && within.has(mapped.to)) {
    return { kind: 'repair', rule: 'retarget', href, to: `/${p.section}/${mapped.to}${p.tail}`,
      target: mapped.to, section: p.section, why: mapped.why };
  }
  if (mapped) return { kind: 'missing', href, handle: p.handle, section: p.section, staleMap: mapped.to };
  return { kind: 'missing', href, handle: p.handle, section: p.section };
}

//  Nothing outside the href attributes may move, and the check has to survive
//  the same page linking a target both correctly and incorrectly.
//
//  A first version reversed the edit with a string replace and refused the one
//  page it was written for. That page links
//  /pages/ap-csa-lesson-4-5-algorithms-with-arrays correctly in one place and
//  with a newline inside the handle in another, so replacing the repaired href
//  back turned the GOOD link into a broken one and the round trip failed. The
//  refusal was right and the check was wrong: a string replace cannot tell the
//  two apart.
//
//  So repairs are recorded as SPANS and undone by position, newest first. Then
//  the reconstruction is compared byte for byte, and the length delta is
//  checked against the spans as a second, independent statement about the same
//  edit.
function verify(before, after, spans) {
  let undone = after;
  for (const s of [...spans].sort((a, b) => b.outAt - a.outAt)) {
    undone = undone.slice(0, s.outAt) + s.from + undone.slice(s.outAt + s.to.length);
  }
  const removed = spans.reduce((n, s) => n + (s.from.length - s.to.length), 0);
  return { roundTrip: undone === before, lengthOk: before.length - after.length === removed, removed };
}

function repairBody(before, live) {
  const found = [];
  const spans = [];
  let out = '';
  let last = 0;
  let m;
  const scannable = withoutScripts(before);
  HREF.lastIndex = 0;
  while ((m = HREF.exec(scannable)) !== null) {
    const c = classify(m[1], live);
    found.push(c);
    if (c.kind !== 'repair') continue;
    const from = `href="${m[1]}"`;
    const to = `href="${c.to}"`;
    out += before.slice(last, m.index);
    spans.push({ at: m.index, outAt: out.length, from, to, rule: c.rule, href: m[1], repaired: c.to });
    out += to;
    last = m.index + from.length;
  }
  out += before.slice(last);
  return { after: spans.length ? out : before, spans, found,
    repairs: found.filter((f) => f.kind === 'repair'),
    missing: found.filter((f) => f.kind === 'missing'),
    unchecked: found.filter((f) => f.kind === 'unchecked') };
}

function build(bodies, live) {
  const rows = [];
  const missing = [];
  const problems = [];
  let unchecked = 0;
  for (const { handle, body } of bodies) {
    if (!body || !body.trim()) continue;
    const r = repairBody(body, live);
    for (const mi of r.missing) missing.push({ from: handle, href: mi.href, target: `${mi.section}/${mi.handle}` });
    unchecked += r.unchecked.length;
    if (!r.spans.length) continue;
    const v = verify(body, r.after, r.spans);
    if (!v.roundTrip) { problems.push(`${handle}: reversing the repair does not give the original body back`); continue; }
    if (!v.lengthOk) { problems.push(`${handle}: the body changed by more than the characters removed`); continue; }
    rows.push({ handle, before: body, after: r.after, spans: r.spans, removed: v.removed });
  }
  return { rows, missing, problems, unchecked };
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const BOM = '﻿';

//  Handle, Command, Body HTML, and every row is rewriting a body. Nothing else
//  travels with it: a blank cell is an erase in every column, so a sheet may
//  only carry a column every one of its rows has a value for.
function sheet(rows) {
  if (!rows.length) return null;
  const lines = [['Handle', 'Command', 'Body HTML'].map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.after].map(cell).join(','));
  return { csv: BOM + lines.join('\r\n') + '\r\n', rows: rows.length };
}

function readBodies(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort().map((f) => ({
    handle: f.replace(/\.html$/, ''),
    body: fs.readFileSync(path.join(dir, f), 'utf8'),
  }));
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  const dir = opt('bodies');
  const handlesFile = opt('handles');
  if (!dir || !handlesFile) {
    console.error('usage: node scripts/dead-internal-link-repair.js --bodies <dir> '
      + '--handles <pages.txt> --products <p.txt> --collections <c.txt> --blogs <b.txt> '
      + '[--out <dir>]');
    process.exit(2);
  }
  const readSet = (f) => new Set(f ? fs.readFileSync(f, 'utf8').split('\n')
    .map((s2) => s2.trim()).filter(Boolean) : []);
  const live = {
    pages: readSet(handlesFile),
    products: readSet(opt('products')),
    collections: readSet(opt('collections')),
    blogs: readSet(opt('blogs')),
  };
  if (live.pages.size < 100) { console.error(`refusing: only ${live.pages.size} live page handles, that is not the sitemap`); process.exit(1); }
  //  A section with no live set would make every link in it look dead, so an
  //  empty one is refused rather than reported as 400 broken links.
  for (const sec of ['products', 'collections', 'blogs']) {
    if (live[sec].size === 0) { console.error(`refusing: no --${sec} list, so every /${sec}/ link would read as dead`); process.exit(1); }
  }
  const bodies = readBodies(dir);
  const { rows, missing, problems, unchecked } = build(bodies, live);

  console.log(`\nDEAD INTERNAL LINKS\n\n  read ${bodies.length} bodies against ${live.pages.size} pages, ${live.products.size} products, ${live.collections.size} collections and ${live.blogs.size} blogs\n`);
  console.log(`  ${rows.length} pages carry a href this can prove is a typo`);
  for (const r of rows) {
    console.log(`\n    ${r.handle}`);
    for (const x of r.spans) console.log(`      [${x.rule}] ${x.href}\n           -> ${x.repaired}`);
  }
  const byTarget = new Map();
  for (const mi of missing) {
    if (!byTarget.has(mi.target)) byTarget.set(mi.target, []);
    byTarget.get(mi.target).push(mi.from);
  }
  if (unchecked) console.log(`\n  ${unchecked} links go deeper than one segment `
    + '(a blog article, say) and are not checked either way.');
  console.log(`\n  ${byTarget.size} link targets do not exist and are NOT repaired, `
    + `across ${missing.length} links:\n`);
  for (const [target, froms] of [...byTarget.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    /${target}   linked from ${froms.length}: ${froms.slice(0, 3).join(', ')}${froms.length > 3 ? ' ...' : ''}`);
  }
  if (problems.length) {
    console.error(`\n  ${problems.length} refused. No file written.\n`);
    problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  const out = opt('out');
  if (out && rows.length) {
    const sh = sheet(rows);
    const name = `${out}/dead-link-repair-pages.csv`;
    fs.writeFileSync(name, sh.csv);
    console.log(`\n  wrote ${name}  (${sh.rows} rows, one body column, no blanks)`);
  }
  console.log('');
}

module.exports = { classify, repairBody, build, sheet, verify, parseHref, stripIllegal,
  decodeControls, LEGAL, HREF, RETARGET, withoutScripts, NON_MARKUP, SECTIONS, setFor };

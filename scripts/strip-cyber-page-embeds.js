'use strict';
// ---------------------------------------------------------------------------
//  TAKE THE HARDCODED SLIDE DECKS AND VIDEOS OUT OF THE CYBER LESSON BODIES.
//
//      node scripts/strip-cyber-page-embeds.js <bodies-dir> <out.csv>
//
//  ── WHAT IS ON THE PAGES ───────────────────────────────────────────────────
//  Swept all 25 live AP Cybersecurity lesson pages on 2026-09-04. Three carry a
//  Google Slides deck written straight into the body, and two of those three
//  also carry a video:
//
//    1.1  social-engineering   deck 1IZbIVy8... and youtube ATiIze_IuJI
//    1.2  password-attacks     deck REPLACE_WITH_SLIDES_PRESENTATION_ID
//                              and youtube VIDEOID
//    1.4  ai-driven-threats    deck REPLACE_WITH_SLIDES_PRESENTATION_ID
//
//  WHAT EACH ONE ACTUALLY DOES TO A READER, checked by stripping comments from
//  the live HTML rather than by grepping it. The first pass of this comment got
//  it wrong and said all three rendered a broken embed:
//
//    1.1  a real video iframe and a real slides iframe, both rendering. The
//         deck is genuine but superseded.
//    1.2  NOTHING broken renders. Its slides iframe is commented out, so all
//         that shows is a "Slides Coming Soon" button linking to its own
//         anchor. Dead weight rather than a defect.
//    1.4  a live "Open in Google Slides" button pointing at
//         .../REPLACE_WITH_SLIDES_PRESENTATION_ID/edit, which is broken the
//         moment anyone clicks it.
//
//  All three sections are scaffolding for slides that now come from the gate,
//  so all three come out. Only 1.1 and 1.4 were doing visible harm.
//
//  ── WHY THIS IS A GATING FIX AND NOT ONLY A TIDY-UP ────────────────────────
//  config/cyber-slide-embeds.js states the rule: the converted decks are shared
//  "anyone with the link can view", because the paying teacher is gated on an
//  APCSExamPrep token rather than a Google account. Holding the id IS access,
//  and routes/slides.js is the only thing that may hand one out. A deck in a
//  page body is handed to everyone who opens the page.
//
//  The good news, and it is worth stating precisely rather than implying: NONE
//  of the three ids is one of the 70 gated decks. No paid content was ever
//  disclosed. 1.1's deck is a real but superseded deck, and the other two are
//  placeholders. The gate's protection was never breached.
//
//  ── WHAT REPLACES THEM: NOTHING NEW ────────────────────────────────────────
//  apcs-slides-gate.js already self-mounts on these pages. Verified on the live
//  1.1 page by running the DEPLOYED asset against the DEPLOYED HTML in
//  Chromium: one gate panel mounts, headed "Slide decks for this topic", beside
//  the hardcoded section. So the page offers a teacher two sets of slides, one
//  gated and current, one free and out of date. Removing the hardcoded half is
//  the whole fix and needs no theme change.
//
//  Zero PII: author content only. Pure ASCII, no em-dashes, per convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

//  handle -> what must come out, and how many of each there must be.
//  The counts are asserted. A page that stops matching is refused rather than
//  silently half-edited, which is the failure a body rewrite cannot recover.
const PAGES = [
  {
    handle: 'ap-cybersecurity-unit-1-social-engineering',
    title: 'AP Cybersecurity Topic 1.1: Understanding Social Engineering',
    divs: [['lesson-video-card', 1], ['slides-section', 1]],
    tocHrefs: [['#section-slides', 1]],
    videoObjects: 1,
    gone: ['1IZbIVy8fKpMAiphgrVW_tmaEZzma75DsYbxzuzK5sRQ', 'ATiIze_IuJI'],
  },
  {
    handle: 'ap-cybersecurity-unit-1-password-attacks',
    title: 'AP Cybersecurity Topic 1.2: Password Attacks',
    divs: [['lesson-video-card', 1], ['slides-section', 1]],
    tocHrefs: [['#section-slides', 1]],
    videoObjects: 0,
    gone: ['REPLACE_WITH_SLIDES_PRESENTATION_ID', 'VIDEOID'],
  },
  {
    handle: 'ap-cybersecurity-unit-1-ai-driven-threats',
    title: 'AP Cybersecurity Topic 1.4: AI-Driven Threats',
    divs: [['slides-section', 1]],
    tocHrefs: [],
    videoObjects: 0,
    gone: ['REPLACE_WITH_SLIDES_PRESENTATION_ID'],
  },
];

//  Walk from an opening tag to its matching close, counting nesting. A regex
//  cannot do this: every one of these blocks contains inner divs.
function removeBalanced(html, openRe, tag) {
  const m = openRe.exec(html);
  if (!m) return null;
  const start = m.index;
  const scan = new RegExp('<' + tag + '\\b[^>]*>|</' + tag + '>', 'g');
  scan.lastIndex = start + m[0].length;
  let depth = 1, hit;
  while ((hit = scan.exec(html))) {
    if (hit[0][1] === '/') { depth--; if (depth === 0) return { start, end: hit.index + hit[0].length }; }
    else depth++;
  }
  return null;
}

//  Trim one blank line left where a block used to be, so the body does not
//  accumulate gaps. Nothing else is reflowed.
function cut(html, span) {
  let { start, end } = span;
  while (end < html.length && (html[end] === '\n' || html[end] === '\r')) end++;
  return html.slice(0, start) + html.slice(end);
}

//  The VideoObject sits in a JSON-LD array. Remove the object AND the comma
//  that joins it to the previous one, or the block stops being valid JSON.
function removeVideoObject(html) {
  const at = html.indexOf('"@type": "VideoObject"');
  if (at === -1) return null;
  const open = html.lastIndexOf('{', at);
  //  Brace-match forward, ignoring braces inside strings.
  let depth = 0, i = open, inStr = false, esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  //  Swallow the comma and whitespace that preceded the object.
  let start = open;
  while (start > 0 && /\s/.test(html[start - 1])) start--;
  if (html[start - 1] === ',') start--;
  return { start, end: i };
}

function transform(handle, before, spec) {
  const problems = [];
  let html = before;

  for (const [cls, want] of spec.divs) {
    const seen = (html.match(new RegExp('<div class="' + cls + '"', 'g')) || []).length;
    if (seen !== want) { problems.push(`${cls}: expected ${want}, found ${seen}`); continue; }
    for (let n = 0; n < want; n++) {
      const span = removeBalanced(html, new RegExp('<div class="' + cls + '"[^>]*>'), 'div');
      if (!span) { problems.push(`${cls}: opening tag found but never closes`); break; }
      html = cut(html, span);
    }
  }

  for (const [href, want] of spec.tocHrefs) {
    const liRe = new RegExp('<li><a href="' + href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"');
    let removed = 0;
    while (liRe.test(html)) {
      const span = removeBalanced(html, liRe, 'li');
      if (!span) break;
      html = cut(html, span);
      removed++;
      if (removed > 5) break;
    }
    if (removed !== want) problems.push(`toc ${href}: expected to remove ${want}, removed ${removed}`);
  }

  for (let n = 0; n < spec.videoObjects; n++) {
    const span = removeVideoObject(html);
    if (!span) { problems.push('VideoObject expected but not found'); break; }
    html = cut(html, span);
  }

  //  ── WHAT MUST BE TRUE AFTERWARDS ─────────────────────────────────────────
  //  Judged on what a BROWSER sees, not on the raw bytes. Two of these pages
  //  carry an authoring block at the top of the body ("TO ACTIVATE VIDEO:
  //  Replace REPLACE_WITH_VIDEO_EMBED_URL with ...") and 1.2's slides iframe is
  //  itself commented out. Asserting against the raw text failed on all three
  //  of those and would have forced deleting inert comments to satisfy a guard
  //  rather than to fix anything. What matters is that nothing renders.
  const visible = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const needle of spec.gone) {
    if (visible.includes(needle)) problems.push(`"${needle}" still renders after the edit`);
  }
  if (/presentation\/d\//.test(visible)) problems.push('a Google Slides link still renders in the body');
  if (/youtube\.com\/embed\//.test(visible)) problems.push('a YouTube embed still renders in the body');
  if (visible.includes('href="#section-slides"')) problems.push('a link to the removed slides section survives, so the page has a dead anchor');
  if (visible.includes('id="section-slides"')) problems.push('the slides section id survives');
  //  The page must still be a gradeable cyber lesson page afterwards.
  if (!html.includes('apcyber-wrapper')) problems.push('the wrapper is gone, so the gate would not mount and the page would stop grading');
  if (!/data-lesson-id="\d+\.\d+"/.test(html)) problems.push('data-lesson-id is gone');
  //  Only removals. Nothing may grow.
  if (html.length >= before.length) problems.push('the body did not shrink, so nothing was removed');

  //  Every JSON-LD block must still parse. This is what catches a bad comma
  //  after the VideoObject excision, which no amount of reading would.
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(m[1]); }
    catch (e) { problems.push('a JSON-LD block no longer parses: ' + e.message.split('\n')[0]); }
  }
  if (/"@type":\s*"VideoObject"/.test(visible)) problems.push('VideoObject structured data survives, advertising a video the page no longer has');

  return problems.length ? { problems } : { after: html, removed: before.length - html.length };
}

//  A reader that did not write the file.
function parseCsv(text) {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function main(argv) {
  const [dir, out] = argv;
  if (!dir || !out) {
    console.error('usage: node scripts/strip-cyber-page-embeds.js <bodies-dir> <out.csv>');
    process.exit(2);
  }

  const rows = [], carrying = {}, problems = [];
  for (const spec of PAGES) {
    const p = path.join(dir, spec.handle + '.html');
    if (!fs.existsSync(p)) { problems.push(`${spec.handle}: no body at ${p}`); continue; }
    const before = fs.readFileSync(p, 'utf8');
    const r = transform(spec.handle, before, spec);
    if (r.problems) { for (const m of r.problems) problems.push(`${spec.handle}: ${m}`); continue; }
    rows.push({ handle: spec.handle, title: spec.title, body: r.after, before: before.length, after: r.after.length, removed: r.removed });
    carrying[spec.handle] = before;
  }

  if (problems.length) {
    console.error('\n  Refused, nothing written:');
    for (const m of problems) console.error('    ' + m);
    console.error('');
    process.exit(1);
  }

  const cell = (x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
  const csv = [['Handle', 'Command', 'Title', 'Body HTML'].map(cell).join(',')]
    .concat(rows.map((r) => [cell(r.handle), cell('MERGE'), cell(r.title), cell(r.body)].join(',')))
    .join('\r\n') + '\r\n';
  const withBom = '\ufeff' + csv;

  //  PARSE IT BACK.
  const parsed = parseCsv(withBom);
  const fails = [];
  if (parsed.length !== rows.length + 1) fails.push(`expected ${rows.length + 1} rows, parsed ${parsed.length}`);
  else {
    if (parsed[0].join(',') !== 'Handle,Command,Title,Body HTML') fails.push('header parsed back as ' + parsed[0].join(','));
    rows.forEach((r, i) => {
      const d = parsed[i + 1];
      if (d[0] !== r.handle) fails.push(`row ${i}: handle ${d[0]}`);
      if (d[1] !== 'MERGE') fails.push(`row ${i}: command ${d[1]}`);
      if (d[2] !== r.title) fails.push(`row ${i}: title ${d[2]}`);
      if (d[3] !== r.body) fails.push(`row ${i}: body does not survive the round trip (${(d[3] || '').length} vs ${r.body.length})`);
    });
  }
  if (fails.length) {
    console.error('\n  Parse-back diff failed, nothing written:');
    for (const f of fails) console.error('    ' + f);
    process.exit(1);
  }

  fs.writeFileSync(out, withBom);
  fs.writeFileSync(out.replace(/\.csv$/, '') + '.carrying.json', JSON.stringify(carrying));
  console.log('');
  for (const r of rows) {
    console.log(`  ${r.handle}`);
    console.log(`    ${r.before} -> ${r.after} chars  (removed ${r.removed})`);
  }
  console.log(`\n  parse-back: all ${rows.length} rows identical to what was written`);
  console.log(`  wrote ${out}  (${(Buffer.byteLength(withBom) / 1024).toFixed(0)} KB)\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { transform, parseCsv, removeBalanced, removeVideoObject, PAGES };

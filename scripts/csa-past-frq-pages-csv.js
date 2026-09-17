'use strict';
// -----------------------------------------------------------------------------
//  THE MATRIXIFY SHEET FOR THE 2026 FRQ PAGES, AND THE CHECKS THAT GATE IT.
//
//    node scripts/csa-past-frq-pages-csv.js imports/2026-09-17/csa-2026-frq-pages.csv
//
//  Four pages, one file. The house rule is one import per unit or section
//  because MERGE overwrites a live body with no undo, and four pages that ship
//  together as one question set is the smallest honest unit here.
//
//  WHAT IT REFUSES TO WRITE, AND WHY EACH RULE EXISTS
//
//    1  a non-ASCII byte or an em-dash        house convention, and the theme's
//                                             CONVENTIONS.md requires pure ASCII
//    2  mojibake, via lib/mojibake.js         never a pasted pattern; a pattern
//                                             list cannot tell you it has stopped
//                                             working
//    3  a title that is not byte-for-byte     16 archive pages read "Ap Csa 2022
//       what the canonical data says          Frq 1 Game" because nothing checked
//    4  invalid JSON-LD                       2016 FRQ 3 ships a block that does
//                                             not parse, live, today
//    5  a repeated FAQ question or answer     46 of the 53 lesson FRQ pages once
//                                             shared one answer verbatim, which
//                                             is a doorway-page signal
//    6  an answer above the reveal panel      a solution a student can read
//                                             without choosing to is not practice
//    7  a point total that disagrees with     the whole reason these pages exist
//       config/csa-frq-2026.json
//    8  an internal link with no live page    checked against the live handle
//                                             fixture, not against a guess
//    9  a filename Matrixify cannot name      a CSV has no tab name, so the file
//                                             name is the sheet name, and a wrong
//                                             one is rejected before a single row
//                                             is read
//
//  Then it PARSES THE FILE BACK and diffs every cell against what the renderer
//  produced. Generation is not evidence that generation worked: the CSP sheet
//  lost 90 bytes a page while every semantic check passed, and a parse-back
//  diff is what caught it.
//
//  Zero PII.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const renderer = require('../lib/csa-past-frq-pages.js');
const mojibake = require('../lib/mojibake.js');

//  Past-dated so Shopify does not treat the import as a fresh publish and
//  reorder anything that sorts on it. Same value the other page sheets use.
const PUBLISHED_AT = '2026-03-01 12:00:00';

const LIVE_HANDLES = path.join(ROOT, 'smoke', 'fixtures', 'live-page-handles.txt');

function liveHandles() {
  if (!fs.existsSync(LIVE_HANDLES)) return null;
  return new Set(fs.readFileSync(LIVE_HANDLES, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
}

//  Everything outside a script or style element. Rules about prose must not
//  fire on a CSS colour or a JSON-LD string, and rules about markup must not
//  read the editor script.
function visible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

//  The scoring callout and the hub's equivalent exist to SAY that the archive
//  years were 9 points a question and 36 a section. A points rule that reads
//  them is reading the one paragraph on the page that is supposed to contain
//  the old numbers, so it is removed before any points rule runs. This is a
//  deliberate exemption with a narrow shape: it drops exactly the callout
//  element and exactly the hub's callout div, never a wider sweep.
function outsideCallout(html) {
  return visible(html)
    .replace(/<details class="frq-2026-callout"[\s\S]*?<\/details>/gi, ' ')
    .replace(/<div class="callout">[\s\S]*?<\/div>/gi, ' ');
}

function jsonLdBlocks(html) {
  const out = [];
  const re = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

// -- THE RULES ---------------------------------------------------------------
function checkPage(p, all) {
  const bad = [];
  const body = p.body;
  const q = p.question;
  if (p.isHub) return checkHub(p, all);

  // 1  ASCII and em-dashes.
  const nonAscii = [...new Set(body.match(/[^\x00-\x7F]/g) || [])];
  if (nonAscii.length) {
    bad.push('non-ASCII: ' + nonAscii.map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(','));
  }
  if (/—|&mdash;|&#8212;/.test(body)) bad.push('carries an em-dash');

  // 2  Mojibake, through the module.
  const hits = mojibake.analyze(body);
  if (hits && hits.length) bad.push('mojibake: ' + hits.length + ' run(s)');

  // 3  Title parity with the canonical data.
  const want = renderer.titleFor(q);
  if (p.title !== want) bad.push('title is ' + JSON.stringify(p.title) + ', canonical says ' + JSON.stringify(want));
  if (/\bFrq\b|^Ap Csa/.test(p.title)) bad.push('title lowercases an acronym');

  // 4  JSON-LD.
  const blocks = jsonLdBlocks(body);
  if (blocks.length !== 3) bad.push('carries ' + blocks.length + ' JSON-LD block(s), expected 3');
  blocks.forEach((b, i) => {
    try { JSON.parse(b); } catch (e) { bad.push('JSON-LD block ' + i + ' does not parse: ' + e.message); }
  });
  //  An HTML entity inside a script element is invalid JSON and a `</script>`
  //  inside one closes the element early.
  blocks.forEach((b, i) => {
    if (/&(amp|lt|gt|quot|#\d+);/.test(b)) bad.push('JSON-LD block ' + i + ' carries an HTML entity');
  });

  // 6  No answer above the reveal panel.
  const revealAt = body.indexOf('id="' + 'frq' + renderer.spec.year + 'q' + q.number + '-sol"');
  if (revealAt < 0) {
    bad.push('has no reveal panel');
  } else {
    const above = body.slice(0, revealAt);
    for (const part of q.parts) {
      const sol = q.modelSolution[part.label] || q.modelSolution[''];
      //  Compare on the distinctive body lines, not the signature: the
      //  signature is given to the student in the question and is not an answer.
      const lines = sol.split('\n').map((s) => s.trim())
        .filter((s) => s.length > 12 && !/^[{}]/.test(s) && !/^public |^\/\*|^\*|^\/\//.test(s));
      for (const line of lines) {
        if (above.indexOf(renderer.esc(line)) >= 0) {
          bad.push('solution line leaks above the reveal panel: ' + JSON.stringify(line.slice(0, 60)));
          break;
        }
      }
    }
  }

  // 7  Points parity, measured outside the callout.
  const vis = outsideCallout(body);
  const printed = [...vis.matchAll(/(\d+)-Point Rubric for|<strong>(\d+) points<\/strong>/gi)]
    .map((m) => Number(m[1] || m[2]));
  if (!printed.length) bad.push('never prints its own point total');
  for (const n of printed) {
    if (n !== q.points) bad.push('prints ' + n + ' points where the canonical data says ' + q.points);
  }
  if (/\b9[- ]point\b/i.test(vis)) bad.push('claims a 9-point rubric outside the callout');
  //  The parts have to add up to the question. A page can print a correct
  //  total beside part points that do not reach it.
  const partSum = q.parts.reduce((n, x) => n + x.points, 0);
  if (partSum !== q.points) bad.push('parts add to ' + partSum + ' but the question is ' + q.points);

  // 7b  The point table has to be on the page, and it has to be right.
  const withCallout = visible(body);
  for (const other of renderer.spec.questions) {
    if (withCallout.indexOf('Question ' + other.number) < 0) bad.push('point table omits question ' + other.number);
  }
  const total = renderer.spec.questions.reduce((n, x) => n + x.points, 0);
  if (withCallout.indexOf(String(total) + ' points across four questions') < 0) {
    bad.push('does not state the ' + total + '-point section total');
  }

  // 7c  No fabricated per-unit exam weighting. College Board publishes section
  //     weightings only; a per-unit percentage is invented wherever it appears.
  const unitPct = withCallout.match(/Unit\s+\d[^.]{0,20}?\d{1,2}\s*%/i);
  if (unitPct) bad.push('states a per-unit exam weighting, which College Board does not publish: ' + JSON.stringify(unitPct[0]));

  // 8  Internal links.
  const live = liveHandles();
  if (live) {
    const willExist = new Set(all.map((x) => x.handle));
    for (const m of body.matchAll(/href="\/pages\/([a-z0-9-]+)"/g)) {
      if (!live.has(m[1]) && !willExist.has(m[1])) {
        bad.push('links to /pages/' + m[1] + ', which is not a live handle');
      }
    }
    for (const m of body.matchAll(/href="\/(?!pages\/|blogs\/|collections\/|products\/|")([a-z0-9-]+)"/g)) {
      bad.push('links to /' + m[1] + ', which is missing the /pages/ prefix');
    }
  }

  // 9  Structural hazards from the theme's CONVENTIONS.md.
  const opens = (body.match(/<pre\b/g) || []).length;
  const closes = (body.match(/<\/pre>/g) || []).length;
  if (opens !== closes) bad.push('unbalanced <pre>: ' + opens + ' open, ' + closes + ' close');
  if (!/^<!--/.test(body.trim())) bad.push('does not open with the generated-file note');
  //  Identity, not spacing. An extra space inside the tag is not a defect and a
  //  rule that calls it one gets switched off the first time it cries wolf.
  if (!new RegExp('<div\\s+id="frq' + renderer.spec.year + 'q' + q.number + '"\\s*>').test(body)) {
    bad.push('has no unique wrapper div');
  }
  if (!/all:\s*initial\s*!important/.test(body)) bad.push('wrapper CSS has no all:initial reset');

  return bad;
}

//  The year index. It shares the prose rules and has none of the question
//  rules: there is no reveal panel to leak past and no rubric of its own.
function checkHub(p, all) {
  const bad = [];
  const body = p.body;

  const nonAscii = [...new Set(body.match(/[^\x00-\x7F]/g) || [])];
  if (nonAscii.length) bad.push('non-ASCII: ' + nonAscii.map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(','));
  if (/\u2014|&mdash;|&#8212;/.test(body)) bad.push('carries an em-dash');
  const hits = mojibake.analyze(body);
  if (hits && hits.length) bad.push('mojibake: ' + hits.length + ' run(s)');

  const blocks = jsonLdBlocks(body);
  if (blocks.length !== 3) bad.push('carries ' + blocks.length + ' JSON-LD block(s), expected 3');
  blocks.forEach((b, i) => {
    try { JSON.parse(b); } catch (e) { bad.push('JSON-LD block ' + i + ' does not parse: ' + e.message); }
    if (/&(amp|lt|gt|quot|#\d+);/.test(b)) bad.push('JSON-LD block ' + i + ' carries an HTML entity');
  });

  //  Every question has to be linked from the index, which is the whole job.
  for (const q of renderer.spec.questions) {
    const h = renderer.handleFor(q);
    if (body.indexOf('/pages/' + h) < 0) bad.push('does not link to ' + h);
    if (visible(body).indexOf(q.className) < 0) bad.push('does not name ' + q.className);
  }
  const total = renderer.spec.questions.reduce((n, x) => n + x.points, 0);
  if (visible(body).indexOf(String(total)) < 0) bad.push('does not state the ' + total + '-point section total');

  const live = liveHandles();
  if (live) {
    const willExist = new Set(all.map((x) => x.handle));
    for (const m of body.matchAll(/href="\/pages\/([a-z0-9-]+)"/g)) {
      if (!live.has(m[1]) && !willExist.has(m[1])) bad.push('links to /pages/' + m[1] + ', which is not a live handle');
    }
  }
  const opens = (body.match(/<pre\b/g) || []).length;
  const closes = (body.match(/<\/pre>/g) || []).length;
  if (opens !== closes) bad.push('unbalanced <pre>');
  if (!/^<!--/.test(body.trim())) bad.push('does not open with the generated-file note');
  if (!/all:\s*initial\s*!important/.test(body)) bad.push('wrapper CSS has no all:initial reset');
  return bad;
}

function checkSet(all) {
  const bad = [];
  const seenHandle = new Set();
  const seenQ = new Map();
  const seenA = new Map();
  for (const p of all) {
    if (seenHandle.has(p.handle)) bad.push('duplicate handle ' + p.handle);
    seenHandle.add(p.handle);
    const faq = p.isHub ? hubFaqOf(p) : p.question.faq;
    for (const f of faq) {
      if (seenQ.has(f.q)) bad.push('FAQ question repeats across ' + seenQ.get(f.q) + ' and ' + p.handle + ': ' + JSON.stringify(f.q.slice(0, 50)));
      seenQ.set(f.q, p.handle);
      if (seenA.has(f.a)) bad.push('FAQ answer repeats across ' + seenA.get(f.a) + ' and ' + p.handle);
      seenA.set(f.a, p.handle);
    }
  }
  return bad;
}

//  The hub's FAQ lives in its rendered JSON-LD rather than in the JSON, so it
//  is read back out of the block it ships. That keeps the uniqueness rule
//  measuring what a reader actually sees.
function hubFaqOf(p) {
  for (const b of jsonLdBlocks(p.body)) {
    let o;
    try { o = JSON.parse(b); } catch (e) { continue; }
    if (o['@type'] === 'FAQPage') {
      return o.mainEntity.map((x) => ({ q: x.name, a: x.acceptedAnswer.text }));
    }
  }
  return [];
}

// -- THE SHEET ---------------------------------------------------------------
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const HEADER = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At',
  'SEO Title', 'SEO Description'];

function buildCsv(all) {
  const lines = [HEADER.map(cell).join(',')];
  for (const p of all) {
    lines.push([
      p.handle, 'MERGE', p.title, p.body, 'TRUE', PUBLISHED_AT, p.title, p.metaDescription,
    ].map(cell).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

//  A small RFC 4180 reader, deliberately independent of the writer above. A
//  parse-back that shares code with the generator proves nothing.
function parseCsv(text) {
  const s = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && s[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

//  Matrixify reads a CSV's sheet name from the FILE NAME. A name it cannot
//  place is rejected in one second with no per-row detail, which is how a
//  correct 49-row file was thrown away once already.
function assertSheetName(out) {
  const base = path.basename(out).toLowerCase();
  if (!/pages/.test(base)) {
    throw new Error('the file name must contain "pages" so Matrixify knows which sheet this is. '
      + 'Got ' + JSON.stringify(path.basename(out)));
  }
  if (!/\.csv$/.test(base)) throw new Error('the file must end in .csv');
}

function main(argv) {
  const out = argv[0] || 'csa-2026-frq-pages.csv';
  assertSheetName(out);

  const all = renderer.pages();
  const problems = [];
  for (const p of all) for (const m of checkPage(p, all)) problems.push(p.handle + ': ' + m);
  for (const m of checkSet(all)) problems.push(m);

  if (problems.length) {
    console.error('\n  ' + problems.length + ' problem(s). No file written:\n');
    for (const m of problems) console.error('    ' + m);
    console.error('');
    process.exit(1);
  }

  const csv = buildCsv(all);
  const dest = path.resolve(ROOT, out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, csv);

  // PARSE IT BACK. Read the bytes from disk rather than the string in memory.
  const rows = parseCsv(fs.readFileSync(dest, 'utf8'));
  const diffs = [];
  if (rows.length !== all.length + 1) diffs.push('read ' + rows.length + ' rows, expected ' + (all.length + 1));
  HEADER.forEach((h, i) => { if (rows[0][i] !== h) diffs.push('header column ' + i + ' is ' + JSON.stringify(rows[0][i])); });
  all.forEach((p, n) => {
    const r = rows[n + 1] || [];
    const want = [p.handle, 'MERGE', p.title, p.body, 'TRUE', PUBLISHED_AT, p.title, p.metaDescription];
    want.forEach((w, i) => {
      if (r[i] !== w) {
        diffs.push(p.handle + ': column ' + HEADER[i] + ' came back '
          + (r[i] === undefined ? 'missing' : (r[i].length + ' chars, wrote ' + String(w).length)));
      }
    });
  });
  if (diffs.length) {
    console.error('\n  the file does not read back as what was written:\n');
    for (const d of diffs) console.error('    ' + d);
    fs.unlinkSync(dest);
    process.exit(1);
  }

  const bytes = all.reduce((n, p) => n + Buffer.byteLength(p.body), 0);
  console.log('wrote ' + all.length + ' page(s) to ' + out);
  console.log('  ' + (bytes / 1024).toFixed(0) + ' KB of body, ' + (Buffer.byteLength(csv) / 1024).toFixed(0) + ' KB of sheet');
  console.log('  parsed back and diffed clean against the renderer, every cell');
  for (const p of all) console.log('    ' + p.handle.padEnd(30) + ' ' + (p.isHub ? 'index   ' : p.question.points + ' points') + '  ' + p.title);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { checkPage, checkSet, buildCsv, parseCsv, assertSheetName, PUBLISHED_AT, HEADER };

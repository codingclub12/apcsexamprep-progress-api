'use strict';
// -----------------------------------------------------------------------------
//  CYBER COMMAND CENTER, UNIT 3: say the CED's numbers, in the CED's order.
//
//  ── WHAT IS WRONG ──────────────────────────────────────────────────────────
//  Unit 3 is the only unit on this page still keyed on the RETIRED SITE
//  numbering. Its rows read 3.1 to 3.6 with a second "CED 3.x" badge beside
//  each title, while units 1, 2, 4 and 5 key on the CED number and carry no
//  badge at all. There is a row 3.6, and the CED's Unit 3 stops at 3.5.
//
//  The six live lesson pages have not agreed with those rows since 2026-08-28,
//  when the renumbering moved three bodies between handles. Measured live:
//
//      handle    h1 states           data-lesson-id
//      lesson-1  Topic 3.1 Part 1    3.1a
//      lesson-2  Topic 3.1 Part 2    3.1b
//      lesson-3  Lesson 3.2          3.2
//      lesson-4  Topic 3.3           3.3
//      lesson-5  Topic 3.4           3.4
//      lesson-6  Topic 3.5           3.5
//
//  So handle order IS CED order now, and the unit note telling teachers the
//  sequence "differs from the CED's topic order" describes a site that stopped
//  existing three weeks ago. Three rows also open the wrong page, which is
//  board 283 and is fixed here as a consequence rather than as a separate pass:
//  once a row is keyed on the CED number, the handle it opens follows from it.
//
//  ── THE MAP IS DERIVED TWICE, NEVER TYPED ──────────────────────────────────
//  lib/cyber-unit3-renumber.js PLAN gives old row id -> new lesson id and the
//  handle that holds it. config/cyber-topics.json, built from the CED text,
//  gives CED topic -> lesson_ids and handles. Both are read and must agree
//  before a byte is written. Retyping this mapping is exactly how site 3.3 and
//  3.4 became each other's CED topics in the first place.
//
//  ── THIS IS A ONE-SHOT, AND IT SAYS SO ─────────────────────────────────────
//  scripts/cyber-cc-unit3-relink.js could be idempotent because it rewrote each
//  row from its own id, and the ids never moved. Here the ids ARE what moves,
//  so a second pass would read 3.2 (now Wireless) as the old 3.2 (Network
//  Attacks) and rotate the page again. There is no honest way to make that
//  idempotent, so it is a PRECONDITION instead: the six old ids must all be
//  present and no new id may be, or the transform refuses. Fake idempotence
//  that silently corrupts on the second run is worse than a loud refusal.
//
//  ── WHAT IS DELIBERATELY NOT CHANGED ───────────────────────────────────────
//  The row TITLES. "IDS, IPS & SIEM" and the CED's "Detecting Network Attacks"
//  are the same topic under two names, and the Command Center, the lesson h1
//  and config/cyber-topics.json each hold a third. That drift is real and is a
//  content decision; this pass is about the numbers a teacher matches against
//  their CED, so the diff stays about one thing.
//
//  THIS WRITES A FILE AND NOTHING ELSE. Importing is a human action, and MERGE
//  overwrites a live body with no undo.
//
//  Run: node scripts/cyber-cc-unit3-ced-numbers.js <body.html> <out.csv>
//       node scripts/cyber-cc-unit3-ced-numbers.js --live <out.csv>
// -----------------------------------------------------------------------------
const fs = require('fs');
const { PLAN } = require('../lib/cyber-unit3-renumber');
const cyberTopics = require('../lib/cyber-topics');

const CC_HANDLE = 'cyber-command-center';
const CC_TITLE = 'Cyber Command Center';
//  Fixed and past-dated, per scripts/matrixify-preflight.js: a live server time
//  scrambles Shopify's sort order on import.
const PUBLISHED_AT = '2026-03-01 12:00:00';

function fail(msg) {
  console.error(`REFUSED  ${msg}`);
  process.exitCode = 1;
  return null;
}

// ── the map, derived from PLAN and checked against the CED taxonomy ──────────
//  { oldId: '3.6', newId: '3.2', target: 3, cedTopic: '3.2' }
//  Sorted by target, which is the order the six pages actually run in.
const ROWS = PLAN
  .map((p) => ({
    oldId: p.oldTopic,
    newId: p.lessonId,
    target: p.target,
    cedTopic: p.lessonId.replace(/[a-z]$/, ''),
  }))
  .sort((a, b) => a.target - b.target);

//  The second source. cyber-topics.json is built from the CED text extracts by
//  tools/ap-cyber-ced/build-topics.js and knows nothing about PLAN.
function crossCheck() {
  const problems = [];
  for (const r of ROWS) {
    const t = cyberTopics.topic(r.cedTopic);
    if (!t) { problems.push(`${r.newId}: cyber-topics.json has no topic ${r.cedTopic}`); continue; }
    if (!t.lesson_ids.includes(r.newId)) {
      problems.push(`${r.newId}: not among topic ${r.cedTopic} lesson_ids ${JSON.stringify(t.lesson_ids)}`);
    }
    const want = `ap-cyber-unit-3-lesson-${r.target}`;
    if (!t.handles.includes(want)) {
      problems.push(`${r.newId}: ${want} is not among topic ${r.cedTopic} handles ${JSON.stringify(t.handles)}`);
    }
  }
  //  Unit 3 has five CED topics and six lessons, and the extra one is the 3.1
  //  split. Any other arithmetic means one of the two sources moved.
  const topics = [...new Set(ROWS.map((r) => r.cedTopic))].sort();
  if (topics.length !== 5) problems.push(`expected 5 CED topics across the rows, got ${topics.length}`);
  if (ROWS.length !== 6) problems.push(`expected 6 rows, got ${ROWS.length}`);
  return problems;
}

// ── the prose that has to move with the numbers ──────────────────────────────
const NOTE = 'Unit 3 is numbered on the CED and taught in CED order, 3.1 through '
  + '3.5. CED 3.1 is one topic taught over two lessons, 3.1a Network Fundamentals '
  + 'and 3.1b Network Attacks; they share the CED 3.1 teacher deck and notes, and '
  + 'they are two gradebook columns so a strong score on one half cannot hide the '
  + 'other.';

const STU_COMMENT = `/* STU: the student-facing pages per lesson (lesson page / quiz / two scenarios),
     as live-site paths. U1/U2 lesson pages use descriptive slugs; U3/U4/U5 use
     ap-cyber-unit-N-lesson-M.

     Unit 3's keys are CED topic numbers and lesson-M runs in CED order: lesson-1
     and lesson-2 are the two halves of CED 3.1, then lesson-3 is 3.2, lesson-4 is
     3.3, lesson-5 is 3.4 and lesson-6 is 3.5. That identity only became true on
     2026-08-28, when the renumbering moved three bodies between handles. An
     older note stood here claiming Unit 3 was resequenced away from the CED's
     topic order, and it was describing a site that no longer exists. A live
     page's data-lesson-id is the authority; check it before trusting a mapping
     written down anywhere, this comment included. */`;

// ── the row rewrite ──────────────────────────────────────────────────────────
//  Every ap-cyber-unit-3-lesson-N inside a row becomes this row's own target.
//  The number currently in the handle is never read, for the reason
//  lib/cyber-unit3-renumber.js documents at length: a cycle rewritten as
//  ordered replaces cannot tell its own output from its input.
function rewriteRow(rowText, r) {
  let out = rowText;
  out = out.replace(/(\bid:")3\.\d(")/, `$1${r.newId}$2`);
  //  The badge earns its place only where the row id is not itself the CED
  //  number, which is the 3.1 pair. Everywhere else it repeats the id, and no
  //  other unit on this page carries one.
  if (r.newId === r.cedTopic) out = out.replace(/,\s*ced:"CED 3\.\d"/, '');
  else out = out.replace(/(\bced:")CED 3\.\d(")/, `$1CED ${r.cedTopic}$2`);
  out = out.replace(/ap-cyber-unit-3-lesson-\d/g, `ap-cyber-unit-3-lesson-${r.target}`);
  return out;
}

//  THE REWRITE, WITHOUT THE ASSERTIONS.
//
//  Split out for the reason the relink suite found the hard way: assertions run
//  against transform()'s guarded output see `null` on ANY refusal, so several
//  unrelated mutations produce one indistinguishable red and the rest of the
//  suite passes vacuously. rewrite() always returns bytes, so every assertion in
//  smoke/cyber-cc-unit3-ced-numbers.js is about the rewrite and nothing else.
function rewrite(body) {
  // ── locate the Unit 3 block ────────────────────────────────────────────────
  const start = body.indexOf('{ n:3, name:"Securing Networks"');
  const end = body.indexOf('{ n:4, name:', start);
  if (start < 0 || end < 0) return fail('could not locate the Unit 3 block in the LESSONS data');
  const block = body.slice(start, end);

  // ── split the six rows, reorder them, rewrite each ────────────────────────
  const rowStarts = [...block.matchAll(/\{ id:"3\.\d",/g)].map((m) => m.index);
  if (rowStarts.length !== 6) return fail(`expected 6 Unit 3 rows, found ${rowStarts.length}`);
  const arrayEnd = block.indexOf('\n    ]}', rowStarts[5]);
  if (arrayEnd < 0) return fail('could not find the end of the Unit 3 lessons array');

  const byOldId = {};
  for (let i = 0; i < 6; i++) {
    const from = rowStarts[i];
    const to = i + 1 < 6 ? rowStarts[i + 1] : arrayEnd;
    const text = block.slice(from, to).replace(/\s*$/, '');
    const id = text.match(/\{ id:"(3\.\d)",/)[1];
    byOldId[id] = text;
  }

  const rewritten = ROWS.map((r) => {
    const src = byOldId[r.oldId];
    if (!src) return null;
    return rewriteRow(src, r);
  });
  if (rewritten.some((x) => x === null)) return fail('a PLAN row has no matching row on the page');

  //  Read the indent off the page rather than assuming it. Six spaces is what
  //  the live body uses today, and a hardcoded six would reindent the whole
  //  unit the first time somebody reformats the file.
  const lineStart = block.lastIndexOf('\n', rowStarts[0]) + 1;
  const INDENT = block.slice(lineStart, rowStarts[0]);
  if (/\S/.test(INDENT)) return fail('the first Unit 3 row does not start its own line');
  const newRows = rewritten.map((t) => INDENT + t.replace(/\s*$/, '')).join('\n');

  //  arrayEnd points AT the newline before the array's closing bracket, and
  //  slicing from it keeps that newline. Slicing past it ran the last row and
  //  the closer onto one line: still valid JavaScript, which is why nothing
  //  threw, and it quietly became a third guard against a second pass.
  let newBlock = block.slice(0, lineStart) + newRows + block.slice(arrayEnd);

  // ── the note ──────────────────────────────────────────────────────────────
  const noteRe = /(\bnote:")((?:[^"\\]|\\.)*)(")/;
  if (!noteRe.test(newBlock)) return fail('the Unit 3 block has no note to replace');
  //  A FUNCTION replacement, not a string. `$&` and friends are live inside a
  //  string replacement, so a dollar sign arriving in authored prose one day
  //  would splice part of the match back into the page instead of the text.
  newBlock = newBlock.replace(noteRe, (m, head, old, tail) => head + NOTE + tail);

  let out = body.slice(0, start) + newBlock + body.slice(end);

  // ── the STU comment, which documents the retired mapping ──────────────────
  const commentRe = /\/\* STU: the student-facing pages per lesson[\s\S]*?\*\//;
  if (!commentRe.test(out)) return fail('could not find the STU comment block');
  out = out.replace(commentRe, () => STU_COMMENT);

  // ── the STU link map: new keys, right handles, CED order ──────────────────
  const mapRe = /( *"3\.\d":\{[^}]*\},?\n)+/;
  const mapMatch = out.match(mapRe);
  if (!mapMatch) return fail('could not find the Unit 3 rows of the STU link map');
  const entries = {};
  for (const m of mapMatch[0].matchAll(/( *)"(3\.\d)":(\{[^}]*\})/g)) entries[m[2]] = { indent: m[1], obj: m[3] };
  if (Object.keys(entries).length !== 6) {
    return fail(`STU link map: expected 6 Unit 3 entries, found ${Object.keys(entries).length}`);
  }
  const trailingComma = mapMatch[0].trimEnd().endsWith(',');
  const newMap = ROWS.map((r) => {
    const e = entries[r.oldId];
    const obj = e.obj.replace(/ap-cyber-unit-3-lesson-\d/g, `ap-cyber-unit-3-lesson-${r.target}`);
    return `${e.indent}"${r.newId}":${obj}`;
  }).join(',\n') + (trailingComma ? ',\n' : '\n');
  out = out.replace(mapRe, () => newMap);

  // ── a teacher's saved ticks follow their lessons ──────────────────────────
  out = addTaughtMigration(out);
  if (out === null) return null;

  return { out, rows: ROWS };
}

//  The guarded entry point: the two sources must agree, the page must not have
//  been renumbered already, and the output has to survive every assertion.
function transform(body) {
  const problems = crossCheck();
  if (problems.length) return fail(`PLAN and cyber-topics.json disagree:\n    ${problems.join('\n    ')}`);

  const start = body.indexOf('{ n:3, name:"Securing Networks"');
  const end = body.indexOf('{ n:4, name:', start);
  if (start < 0 || end < 0) return fail('could not locate the Unit 3 block in the LESSONS data');

  // ── precondition: this page has not been renumbered yet ───────────────────
  //  There is no honest idempotence here. The ids are what moves, so a second
  //  pass would read 3.2 (now Wireless) as the retired 3.2 (Network Attacks)
  //  and rotate the page again. Refuse loudly instead.
  const presentIds = [...body.slice(start, end).matchAll(/\bid:"(3\.[0-9a-z]+)"/g)].map((m) => m[1]);
  const oldIds = ROWS.map((r) => r.oldId).sort();
  if (String([...presentIds].sort()) !== String(oldIds)) {
    return fail(`precondition: expected the six retired ids ${oldIds.join(', ')}, `
      + `found ${presentIds.join(', ')}. This transform is a one-shot and running it on `
      + 'a renumbered page would rotate it again.');
  }

  const r = rewrite(body);
  if (!r) return null;

  const a = assertions(body, r.out);
  if (a) return fail(a);

  return r;
}

//  The ticks live in localStorage under actc_taught_ap-cybersecurity, keyed on
//  the row id. Three of the old numbers name a different lesson now, so a
//  teacher who ticked 3.3 Firewalls would find 3.3 Segmentation ticked. Remap
//  once, into a FRESH object because the map contains a swap, and stamp it.
function addTaughtMigration(body) {
  const anchor = '  var taught = loadTaught();';
  if (!body.includes(anchor)) return fail('could not find the taught initialiser');
  const pairs = ROWS.map((r) => `"${r.oldId}":"${r.newId}"`).join(',');
  const replacement = [
    '  /* Unit 3 row ids moved from the retired site numbers onto the CED. A tick is',
    '     keyed on the id and three of the old numbers name a different lesson now, so',
    '     3.3 ticked as Firewalls would come back ticked against Segmentation. Remap',
    '     once, into a fresh object because the map contains a swap, and stamp it so a',
    '     second load leaves it alone. */',
    `  var U3_CED_IDS = {${pairs}};`,
    '  function migrateTaughtToCED(o){',
    '    if(!o || o.u3ced) return o;',
    '    var out={}, k;',
    '    for(k in o){ if(Object.prototype.hasOwnProperty.call(o,k)) out[U3_CED_IDS[k]||k]=o[k]; }',
    '    out.u3ced=1; return out;',
    '  }',
    '  var taught = migrateTaughtToCED(loadTaught());',
    '  saveTaught(taught);',
  ].join('\n');
  return body.replace(anchor, () => replacement);
}

function assertions(before, out) {
  // 1. Every Unit 3 row now carries a CED id, and they are the six expected.
  const start = out.indexOf('{ n:3, name:"Securing Networks"');
  const end = out.indexOf('{ n:4, name:', start);
  const block = out.slice(start, end);
  const ids = [...block.matchAll(/\{ id:"([^"]+)",/g)].map((m) => m[1]);
  const want = ROWS.map((r) => r.newId);
  if (String(ids) !== String(want)) {
    return `assertion 1: rows read ${JSON.stringify(ids)}, wanted ${JSON.stringify(want)} in that order`;
  }

  // 2. Each row's handles are its own, in BOTH blocks. Checked by reading the
  //    output back rather than by trusting the replace that wrote it.
  for (const r of ROWS) {
    const row = block.match(new RegExp(`\\{ id:"${r.newId.replace('.', '\\.')}",[\\s\\S]*?site:\\{([^}]*)\\}`));
    if (!row) return `assertion 2: row ${r.newId} lost its site block`;
    for (const [, n] of row[1].matchAll(/ap-cyber-unit-3-lesson-(\d)/g)) {
      if (Number(n) !== r.target) return `assertion 2: data array row ${r.newId} opens lesson-${n}, wanted lesson-${r.target}`;
    }
  }
  const mapIds = [];
  for (const [, id, links] of out.matchAll(/"(3\.\d[ab]?)":\{(page:[^}]*)\}/g)) {
    mapIds.push(id);
    const r = ROWS.find((x) => x.newId === id);
    if (!r) return `assertion 2: STU link map has an unexpected Unit 3 key ${id}`;
    for (const [, n] of links.matchAll(/ap-cyber-unit-3-lesson-(\d)/g)) {
      if (Number(n) !== r.target) return `assertion 2: link map row ${id} opens lesson-${n}, wanted lesson-${r.target}`;
    }
  }
  if (String(mapIds) !== String(want)) {
    return `assertion 2: link map reads ${JSON.stringify(mapIds)}, wanted ${JSON.stringify(want)} in that order`;
  }

  // 3. The badge survives only where the id is not the CED number.
  for (const r of ROWS) {
    const row = block.match(new RegExp(`\\{ id:"${r.newId.replace('.', '\\.')}",[^\\n]*`));
    const hasCed = /ced:"CED/.test(row[0]);
    if (r.newId === r.cedTopic && hasCed) return `assertion 3: row ${r.newId} still carries a CED badge repeating its own id`;
    if (r.newId !== r.cedTopic && !hasCed) return `assertion 3: row ${r.newId} lost the CED ${r.cedTopic} badge that says which topic it belongs to`;
  }

  // 4. The tick migration is present and names every retired id exactly once.
  //    This is the ONLY place a retired number may still appear, because
  //    naming them is the whole job of the map.
  const mig = out.match(/var U3_CED_IDS = \{([^}]*)\};/);
  if (!mig) return 'assertion 4: the saved-tick migration is missing, so a teacher\'s ticks would land on the wrong lessons';
  const pairs = [...mig[1].matchAll(/"([^"]+)":"([^"]+)"/g)].map((m) => `${m[1]}=>${m[2]}`);
  const wantPairs = ROWS.map((r) => `${r.oldId}=>${r.newId}`);
  if (String([...pairs].sort()) !== String([...wantPairs].sort())) {
    return `assertion 4: the tick migration maps ${JSON.stringify(pairs)}, wanted ${JSON.stringify(wantPairs)}`;
  }

  // 5. No retired number is left anywhere ELSE, in prose or in code. 3.6 is the
  //    one that cannot exist at all: the CED's Unit 3 stops at 3.5.
  const scrubbed = out.replace(/var U3_CED_IDS = \{[^}]*\};/, '');
  const stray = scrubbed.match(/3\.6/);
  if (stray) {
    const near = scrubbed.slice(Math.max(0, stray.index - 80), stray.index + 50).replace(/\n/g, ' ');
    return `assertion 5: a reference to 3.6 survived and the CED has no topic 3.6, near: ...${near}...`;
  }
  if (/flow-optimized/.test(out)) return 'assertion 5: the flow-optimized note survived, and it is no longer true';
  if (/site 3\.\d = CED/.test(out)) return 'assertion 5: the retired site-to-CED crosswalk comment survived';

  // 6. Blast radius. No Drive id moved and no other unit changed.
  const drive = (s) => (s.match(/D\+"[A-Za-z0-9_-]+"/g) || []).sort().join('|');
  if (drive(before) !== drive(out)) return 'assertion 6: a Google Drive id changed';
  const qotd = (s) => (s.match(/Q\+"[A-Z0-9-]+"/g) || []).sort().join('|');
  if (qotd(before) !== qotd(out)) return 'assertion 6: a Question of the Day id changed';
  for (const u of [1, 2, 4, 5]) {
    const rx = new RegExp(`ap-cyber-unit-${u}-[a-z0-9-]+`, 'g');
    if (String(before.match(rx)) !== String(out.match(rx))) return `assertion 6: a unit-${u} handle changed`;
  }
  //  Unit 3's handle MULTISET is unchanged: the same six lessons and their
  //  activity pages are still linked, they are just linked from other rows.
  const u3 = (s) => (s.match(/ap-cyber-unit-3-[a-z0-9-]+/g) || []).sort().join('|');
  if (u3(before) !== u3(out)) return 'assertion 6: Unit 3 gained or lost a page link rather than only moving them';

  // 7. The transform refuses to run again on its own output.
  const quiet = console.error; console.error = () => {};
  const code = process.exitCode;
  const twice = transform(out);
  console.error = quiet; process.exitCode = code;
  if (twice !== null) return 'assertion 7: the transform accepted its own output, so a second run would rotate the page again';

  return null;
}

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

//  PARSE THE SHEET BACK. Generation is not evidence that generation worked:
//  the CSP sheet lost 90 bytes a page while every semantic check passed, and a
//  parse-back diff is what caught it. Reads the written CSV through a real
//  quote-aware parser and diffs the Body HTML cell against a fresh transform of
//  the live page, so a byte lost to escaping shows up as a number.
function parseSheet(csvText) {
  const text = csvText.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

function verify(sheetPath) {
  const parsed = parseSheet(fs.readFileSync(sheetPath, 'utf8'));
  if (parsed.length !== 1) { console.error(`expected 1 row, parsed ${parsed.length}`); process.exitCode = 1; return; }
  const shipped = parsed[0];
  const live = require('../lib/storefront-fetch').pageBody(CC_HANDLE).body_html;
  const r = transform(live);
  //  A refusal means live has already been renumbered, so there is nothing left
  //  for the sheet to say. Compare against live itself in that case.
  const expected = r ? r.out : live;
  const diff = shipped['Body HTML'] === expected ? 0 : 1;
  console.log(`handle=${shipped.Handle} command=${shipped.Command} `
    + `bytes=${shipped['Body HTML'].length} parse-back-diff=${diff}`);
  if (diff) {
    let i = 0;
    while (i < expected.length && shipped['Body HTML'][i] === expected[i]) i++;
    console.error(`  first divergence at ${i}`);
    console.error(`  sheet   : ${JSON.stringify(shipped['Body HTML'].slice(i - 60, i + 60))}`);
    console.error(`  expected: ${JSON.stringify(expected.slice(i - 60, i + 60))}`);
    process.exitCode = 1;
  }
}

function main() {
  let [src, out] = process.argv.slice(2);
  if (src === '--verify') { verify(out); return; }
  if (!src || !out) {
    console.error('usage: node scripts/cyber-cc-unit3-ced-numbers.js <body.html|--live> <out.csv>');
    console.error('       node scripts/cyber-cc-unit3-ced-numbers.js --verify <sheet.csv>');
    process.exit(2);
  }
  const body = src === '--live'
    ? require('../lib/storefront-fetch').pageBody(CC_HANDLE).body_html
    : fs.readFileSync(src, 'utf8');

  const r = transform(body);
  if (!r) { console.error('\nNo sheet written.'); return; }

  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  lines.push([CC_HANDLE, 'MERGE', CC_TITLE, r.out, 'TRUE', PUBLISHED_AT].map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${out}`);
  console.log(`  ${body.length} -> ${r.out.length} bytes`);
  for (const row of r.rows) {
    const badge = row.newId === row.cedTopic ? '' : `  (badged CED ${row.cedTopic})`;
    console.log(`  ${row.oldId} -> ${row.newId}  opens ap-cyber-unit-3-lesson-${row.target}${badge}`);
  }
  console.log('\nMERGE overwrites the live body and Shopify keeps no undo.');
}

if (require.main === module) main();
transform.raw = (body) => { const r = rewrite(body); return r ? r.out : null; };

module.exports = { transform, rewrite, parseSheet, ROWS, CC_HANDLE, NOTE, STU_COMMENT, rewriteRow, crossCheck, assertions };

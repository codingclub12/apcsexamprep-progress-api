#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BUILD THE MATRIXIFY SHEET FOR TOPIC 1.4 EXERCISE 1.
//
//    node scripts/cyber-u1-l4-ex1-ced-csv.js out/l4ex1.csv [--live page.json]
//                                            [--show-changes] [--html f.html]
//
//  ---- WHAT AN EXERCISE GATE HAS TO CHECK THAT A LESSON GATE DOES NOT --------
//  This page grades in JavaScript. A <select> holds option VALUES, and the
//  scoring code compares those values as strings. Nothing connects the two
//  except that they happen to spell the same thing, so:
//
//   * A CREDITED VALUE THAT NAMES NO OPTION IS UNGETTABLE. The scoring branch
//     never fires, the student cannot score that point however well they
//     understand it, and the page throws no error. This gate walks every
//     `x==='...'` comparison back to the select it reads and fails if the value
//     is not there.
//
//   * AN OPTION VALUE NO COMPARISON MENTIONS IS EITHER A DISTRACTOR OR A BUG,
//     and they look identical. Reported as a note rather than a failure, so a
//     human reads the list and recognises the one that should have been keyed.
//
//   * A getElementById THAT NAMES NO ELEMENT throws at grade time and takes the
//     whole Check button with it. Renaming p1a-tactic to p1a-defense in the
//     markup and not in the script is exactly that bug.
//
//   * NO CREDITED ANSWER MAY NAME A LEGACY TERM. This is the point of the whole
//     change and it is the one check that reads meaning rather than structure.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const mod = require('../lib/cyber-u1-l4-ex1-ced');
const gate0 = require('../lib/cyber-page-gate');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

//  Off-CED names that describe a delivery channel or a legacy category, plus the
//  Unit 2 tactics. Naming one in a distractor is allowed. Crediting one is not.
const LEGACY = ['spear phishing', 'spear-phishing', 'vishing', 'smishing', 'whaling',
  'baiting', 'quid pro quo', 'polymorphic', 'authority', 'consensus', 'scarcity',
  'familiarity', 'pretexting', 'tailgating'];

const flat = (s) => s
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ');

async function readLive(handle, file) {
  if (file) return JSON.parse(fs.readFileSync(file, 'utf8')).page;
  const url = `https://www.apcsexamprep.com/pages/${handle}.json?cb=${Date.now()}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} returned ${res.status}`);
  if (text.trimStart().startsWith('<')) {
    throw new Error('host returned HTML, most likely a Cloudflare challenge. Retry or pass --live.');
  }
  return JSON.parse(text).page;
}

//  { selectId: [{value, label}] }
function selects(html) {
  const out = {};
  for (const m of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    out[m[1]] = [...m[2].matchAll(/<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)]
      .map((o) => ({ value: o[1], label: flat(o[2]).trim() }))
      .filter((o) => o.value !== '');
  }
  return out;
}

//  Every `var NAME=document.getElementById('SELECT').value` in the page, so a
//  comparison against NAME can be traced to the select it actually reads.
function varToSelect(html) {
  const map = {};
  for (const m of html.matchAll(/(\w+)\s*=\s*document\.getElementById\('([^']+)'\)\.value/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

function credited(html) {
  const vars = varToSelect(html);
  const out = [];
  for (const m of html.matchAll(/(\w+)\s*===?\s*'([^']+)'/g)) {
    if (vars[m[1]]) out.push({ varName: m[1], select: vars[m[1]], value: m[2] });
  }
  return out;
}

function gate(before, after) {
  const fail = [];
  const note = [];

  const sel = selects(after);
  const selBefore = selects(before);
  note.push(`selects: ${Object.keys(sel).length} (${Object.keys(sel).join(', ')})`);

  // ---- 1. no getElementById target was renamed out from under the script ----
  //  Not "every id exists": the page legitimately reaches for theme elements
  //  that live outside the body, apcyber-wrapper and MainContent among them, and
  //  flagging those is noise. What matters is the regression: an id the body
  //  used to provide and no longer does. Renaming p1a-tactic to p1a-defense in
  //  the markup and not in the script is exactly that, and it throws at grade
  //  time and takes the whole Check button with it.
  const idsBefore = new Set([...before.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const idsAfter = new Set([...after.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const external = [];
  for (const m of after.matchAll(/document\.getElementById\('([^']+)'\)/g)) {
    if (idsAfter.has(m[1])) continue;
    if (idsBefore.has(m[1])) fail.push(`getElementById('${m[1]}') lost its element in this edit`);
    else if (!external.includes(m[1])) external.push(m[1]);
  }
  if (external.length) note.push(`ids the theme provides, not this body: ${external.join(', ')}`);
  //  and an element the body dropped that the script still names is the same
  //  bug seen from the other side
  for (const id of idsBefore) {
    if (idsAfter.has(id)) continue;
    if (after.includes(`getElementById('${id}')`)) fail.push(`element ${id} was removed but the script still reads it`);
  }

  // ---- 2. every credited value is actually gettable -------------------------
  const keys = credited(after);
  note.push(`credited answers: ${keys.map((k) => `${k.select}=${k.value}`).join(' ')}`);
  for (const k of keys) {
    const opts = sel[k.select];
    if (!opts) { fail.push(`credited ${k.select}='${k.value}' but ${k.select} is not a select`); continue; }
    if (!opts.some((o) => o.value === k.value)) {
      fail.push(`credited ${k.select}='${k.value}' is UNGETTABLE: options are ${opts.map((o) => o.value).join(', ')}`);
    }
  }

  // ---- 3. option values unique inside each select, and none empty -----------
  for (const [id, opts] of Object.entries(sel)) {
    const seen = new Set();
    for (const o of opts) {
      if (seen.has(o.value)) fail.push(`${id} has two options with value ${JSON.stringify(o.value)}`);
      seen.add(o.value);
      if (!o.label) fail.push(`${id} option ${JSON.stringify(o.value)} has no label`);
    }
    if (selBefore[id] && selBefore[id].length !== opts.length) {
      fail.push(`${id} option count changed: ${selBefore[id].length} -> ${opts.length}`);
    }
  }
  //  A select whose id is NEW has no before to compare against, so the count
  //  check above skips it and a dropped option rides through. Not hypothetical:
  //  p1a-tactic became p1a-defense in this very change. So arity is also checked
  //  against the page's own convention rather than a number picked here: every
  //  select on this page offers the same number of real options, and one that
  //  does not is either a dropped option or a deliberate inconsistency, and both
  //  are worth a human look.
  const arity = Object.values(sel).map((o) => o.length);
  const mode = arity.sort((a, b) =>
    arity.filter((x) => x === a).length - arity.filter((x) => x === b).length).pop();
  for (const [id, opts] of Object.entries(sel)) {
    if (opts.length !== mode) {
      fail.push(`${id} offers ${opts.length} options where every other select on this page offers ${mode}`);
    }
  }
  note.push(`options per select: ${mode}`);
  const renamed = Object.keys(sel).filter((id) => !selBefore[id]);
  if (renamed.length) note.push(`selects new in this edit (no before to diff): ${renamed.join(', ')}`);

  // ---- 4. options no comparison mentions: a note, not a failure -------------
  const keyed = new Set(keys.map((k) => `${k.select} ${k.value}`));
  const orphan = [];
  for (const [id, opts] of Object.entries(sel)) {
    for (const o of opts) if (!keyed.has(`${id} ${o.value}`)) orphan.push(`${id}=${o.value}`);
  }
  note.push(`options no branch credits (distractors, read the list): ${orphan.join(' ')}`);

  // ---- 5. THE POINT OF THE CHANGE: no credited answer names a legacy term ---
  for (const k of keys) {
    const opt = (sel[k.select] || []).find((o) => o.value === k.value);
    if (!opt) continue;
    for (const t of LEGACY) {
      if (opt.label.toLowerCase().includes(t)) {
        fail.push(`credited answer for ${k.select} names a legacy term (${t}): ${JSON.stringify(opt.label.slice(0, 90))}`);
      }
    }
  }
  //  and the feedback that fires when they get it right must not either
  for (const m of after.matchAll(/\+\d+ (?:&mdash;|—) Correct\.([^']*)/g)) {
    for (const t of LEGACY) {
      if (m[1].toLowerCase().includes(t)) {
        fail.push(`"Correct" feedback names a legacy term (${t}): ${JSON.stringify(m[1].trim().slice(0, 90))}`);
      }
    }
  }

  // ---- 6. the points did not move -------------------------------------------
  const pts = (b) => [...b.matchAll(/pts\s*\+=\s*(\d+)|pts\+\+/g)].map((m) => m[1] || '1').join(',');
  if (pts(before) !== pts(after)) fail.push(`point awards changed: ${pts(before)} -> ${pts(after)}`);
  const caps = (b) => [...b.matchAll(/Math\.min\(Math\.round\(pts\*([\d.]+)\),(\d+)\)/g)]
    .map((m) => `${m[1]}x cap${m[2]}`).join(' ');
  if (caps(before) !== caps(after)) fail.push(`score scaling changed: ${caps(before)} -> ${caps(after)}`);
  note.push(`point awards: ${pts(after)} | scaling: ${caps(after)}`);

  // ---- 7. the shared checks --------------------------------------------------
  fail.push(...gate0.nothingUnhidden(before, after));
  fail.push(...gate0.balancedTags(after, ['div', 'style', 'script', 'select', 'option', 'p']));
  fail.push(...gate0.scriptsParse(after));
  fail.push(...gate0.noNewNonAscii(before, after));

  const changed = gate0.changedSentences(before, after, flat);
  note.push(`sentences changed: ${changed.length}`);
  return { fail, note, changed };
}

async function main() {
  const out = process.argv[2];
  const show = process.argv.includes('--show-changes');
  if (!out) {
    console.error('usage: node scripts/cyber-u1-l4-ex1-ced-csv.js <out.csv> [--live f.json] [--show-changes] [--html f.html]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = await readLive(mod.HANDLE, liveIdx > 0 ? process.argv[liveIdx + 1] : null);
  if (String(page.id) !== mod.PAGE_ID) throw new Error(`page id ${page.id} is not ${mod.PAGE_ID}`);
  const before = page.body_html;

  const { body: after, resolved } = mod.applySplices(before);
  console.log(`${resolved.length} splices resolved, ${before.length} -> ${after.length} chars`);
  for (const r of resolved) {
    console.log(`  ${String(r.start).padStart(6)}  -${String(r.removed).padStart(5)} +${String(r.html.length).padStart(5)}  ${r.name}`);
  }
  console.log('');

  const { fail, note, changed } = gate(before, after);
  for (const n of note) console.log(`note  ${n}`);
  if (show) {
    console.log('\n--- every sentence this changes, read them ---');
    changed.forEach((c, i) => console.log(`${String(i + 1).padStart(3)}  ${c.trim().slice(0, 185)}`));
    console.log('');
  }
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) { console.error(`\n${fail.length} check(s) failed. Nothing written.`); process.exit(1); }
  if (!show) {
    console.error('\nRefusing to write without --show-changes. This rewrites a graded answer key;');
    console.error('a passing gate says the keys are gettable, not that they are the right keys.');
    process.exit(1);
  }

  const htmlIdx = process.argv.indexOf('--html');
  if (htmlIdx > 0) {
    fs.writeFileSync(process.argv[htmlIdx + 1], after, 'utf8');
    console.log(`wrote ${process.argv[htmlIdx + 1]} for preview`);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, gate0.csvRow(page, after, mod.TITLE), 'utf8');
  console.log(`wrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
}

module.exports = { gate, flat, selects, credited, LEGACY };

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}

#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CYBER TOPIC 1.1 EXERCISE 1: THE MATRIXIFY SHEET.
//
//  Fetches the live page, applies lib/cyber-u1-ex1-ced.js, gates the result and
//  writes a one-row sheet. Nothing here talks to the Shopify Admin API: every
//  page change on this site ships as a sheet a human reads before importing.
//
//  Run:
//    node scripts/cyber-u1-ex1-ced-csv.js out/ex1-topic11.csv
//    node scripts/cyber-u1-ex1-ced-csv.js out/ex1-topic11.csv --live pages/x.json
//
//  ── THE GATE THAT MATTERS HERE IS DIFFERENT ────────────────────────────────
//  This page renders its content from a JavaScript array. That is exactly what
//  hid the defect from ced_audit.py for a month, and it also means the usual
//  checks are not enough: valid HTML proves nothing about whether the widget
//  still runs. So the gate parses the flag array out of the script, confirms
//  all seven entries survive with their ids, titles, bodies and principles
//  intact, and confirms the two rewritten ones no longer teach off-CED
//  material while the five untouched ones are byte identical.
//
//  Matrixify column rules that have each cost a live page before:
//    Command MERGE, never blank         a blank Command creates a duplicate
//    Body HTML only when updating it    an empty Body HTML cell wipes the body
//    never a Published At column        setting it to now unpublishes the page
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const ced = require('../lib/cyber-u1-ex1-ced');

const LIVE_URL = `https://www.apcsexamprep.com/pages/${ced.HANDLE}.json`;

//  Terms with zero occurrences in the CED effective Fall 2026.
const OFF_CED = [
  'spear phishing', 'spear-phishing', 'vishing', 'smishing', 'whaling', 'baiting',
  'quid pro quo', 'tailgating', 'credential stuffing', 'brute force',
  'rainbow table', 'deepfake', 'rogue access point',
];

//  In the CED, owned by Topic 2.1. Naming one while saying where it belongs is
//  the sanctioned use, which is what Exercise 2 and Lab 1 already do. Teaching
//  it as a Topic 1.1 tactic is not, so the gate reports these for a human to
//  read rather than failing on the count.
const UNIT2 = {
  pretexting: '2.1.A.2', authority: '2.1.A.3', consensus: '2.1.A.5',
  scarcity: '2.1.A.6', familiarity: '2.1.A.7',
};

function scriptText(html) {
  return (html.match(/<script[^>]*>[\s\S]*?<\/script>/g) || [])
    .filter((s) => !/application\/ld\+json/.test(s))
    .join(' ');
}

function flags(html) {
  const js = scriptText(html);
  const out = [];
  const re = /\{\s*id:'(flag-[^']+)',\s*title:'((?:[^'\\]|\\.)*)',\s*body:'((?:[^'\\]|\\.)*)',\s*principle:'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(js))) out.push({ id: m[1], title: m[2], body: m[3], principle: m[4] });
  return out;
}

function countTag(html, tag) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  return {
    open: (clean.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length,
    close: (clean.match(new RegExp(`</${tag}>`, 'g')) || []).length,
  };
}

async function readLive(file) {
  if (file) return JSON.parse(fs.readFileSync(file, 'utf8')).page;
  const res = await fetch(`${LIVE_URL}?cb=${Date.now()}`);
  if (!res.ok) throw new Error(`GET ${LIVE_URL} returned ${res.status}`);
  return (await res.json()).page;
}

function gate(before, after, resolved) {
  const fail = [];
  const warn = [];
  const note = [];

  for (const tag of ['div', 'style', 'script']) {
    const { open, close } = countTag(after, tag);
    if (open !== close) fail.push(`<${tag}> unbalanced: ${open} open, ${close} close`);
  }

  //  The widget IS the page: the seven flags, the scoring and the reveal all
  //  live in JavaScript. Balanced tags prove nothing about whether it runs, and
  //  a splice that lands one character wrong inside a string literal produces
  //  perfectly valid HTML that renders a blank exercise. So compile every
  //  script block before shipping it.
  for (const m of after.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const src = m[1];
    if (/application\/ld\+json/.test(m[0])) {
      try { JSON.parse(src); } catch (e) { fail.push(`JSON-LD does not parse: ${e.message}`); }
      continue;
    }
    try { new Function(src); } catch (e) { fail.push(`a script block does not compile: ${e.message}`); }
  }

  //  The widget is the page. If the array does not parse, nothing renders.
  const was = flags(before);
  const now = flags(after);
  check(was.length === 7, `parsed ${was.length} flags from the live page, expected 7`);
  check(now.length === was.length, `flag count changed: ${was.length} -> ${now.length}`);
  const wasIds = was.map((f) => f.id).join(',');
  const nowIds = now.map((f) => f.id).join(',');
  check(wasIds === nowIds, `flag ids or order changed:\n    was ${wasIds}\n    now ${nowIds}`);
  for (const f of now) {
    check(f.title.trim() && f.body.trim() && f.principle.trim(),
      `${f.id} has an empty title, body or principle`);
  }

  //  Five flags must come through untouched. Naming them is the point: a
  //  regression here means a splice anchor drifted into a neighbour.
  const UNTOUCHED = ['flag-from', 'flag-subj', 'flag-threat', 'flag-sig', 'flag-link'];
  const byId = (arr) => Object.fromEntries(arr.map((f) => [f.id, f]));
  const [a, b] = [byId(was), byId(now)];
  for (const id of UNTOUCHED) {
    check(a[id] && b[id] && JSON.stringify(a[id]) === JSON.stringify(b[id]),
      `${id} should be untouched and is not`);
  }

  //  The two rewritten flags, checked on what they say rather than on bytes.
  const stat = b['flag-stat'];
  const generic = b['flag-generic'];
  check(stat && !/Psychological Tactic: Authority/i.test(stat.principle),
    'flag-stat still labels Authority a psychological tactic');
  check(stat && /2\.1\.A\.3/.test(stat.body),
    'flag-stat names authority without saying it is Unit 2 EK 2.1.A.3');
  check(generic && !/spear[- ]phishing/i.test(generic.body + generic.principle),
    'flag-generic still teaches the spear phishing distinction');
  check(generic && /1\.1\.C\.1/.test(generic.body),
    'flag-generic no longer ties the missing detail to EK 1.1.C.1');

  //  Both CED tactics must still be taught by name.
  check(/intimidation/i.test(scriptText(after)), 'intimidation no longer appears');
  check(/urgency/i.test(scriptText(after)), 'urgency no longer appears');

  //  Nothing may teach an off-CED term as content. Report every hit with its
  //  region so a human confirms each surviving one is a disclaimer.
  const text = (s) => s.replace(/<[^>]+>/g, ' ').toLowerCase();
  const studentText = text(now.map((f) => f.title + ' ' + f.body + ' ' + f.principle).join(' '));
  const stray = {};
  for (const t of OFF_CED) {
    const n = (studentText.match(new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (n) stray[t] = n;
  }
  if (Object.keys(stray).length) fail.push(`off-CED term taught in the flag copy: ${JSON.stringify(stray)}`);

  const u2 = {};
  for (const [t, owner] of Object.entries(UNIT2)) {
    const n = (studentText.match(new RegExp('\\b' + t + '\\b', 'g')) || []).length;
    if (n) u2[t] = `${n} (${owner})`;
  }
  if (Object.keys(u2).length) {
    warn.push(`Unit 2 terms in the flag copy, confirm each says where it belongs: ${JSON.stringify(u2)}`);
    for (const t of Object.keys(u2)) {
      const owner = UNIT2[t];
      check(studentText.includes(owner.toLowerCase()),
        `${t} is named without citing ${owner}`);
    }
  }

  for (const [needle, why] of [
    ['APCYBER-ACTIVITY-NAV-START', 'activity nav open marker'],
    ['APCYBER-ACTIVITY-NAV-END', 'activity nav close marker'],
    ['id="ucnav"', 'sticky unit nav rail'],
  ]) {
    check(after.includes(needle), `lost the ${why}`);
  }

  const codepoints = (s) => new Set([...s].filter((ch) => ch.charCodeAt(0) > 127));
  const had = codepoints(before);
  const added = [...codepoints(after)].filter((ch) => !had.has(ch));
  if (added.length) fail.push(`new copy introduced non-ASCII: ${JSON.stringify(added.join(''))}`);

  note.push(`body ${before.length} -> ${after.length} bytes`);
  for (const r of resolved) note.push(`  spliced ${r.name}: ${r.removed} bytes -> ${r.html.length}`);

  function check(cond, msg) { if (!cond) fail.push(msg); }
  return { fail, warn, note };
}

function csvCell(v) { return `"${String(v).replace(/"/g, '""')}"`; }

async function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node scripts/cyber-u1-ex1-ced-csv.js <out.csv> [--live pages/<handle>.json]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const page = await readLive(liveIdx > 0 ? process.argv[liveIdx + 1] : null);
  const before = page.body_html;

  if (/Urgency \(1\.1\.A\.2, mechanism 1\.1\.B\.3\)/.test(before)) {
    console.error('This page already carries the CED fix, so there is nothing to splice.');
    console.error('  To check it is still intact:');
    console.error('    ./tools/ap-cyber-ced/fetch_pages.sh ./verify');
    console.error('    python3 tools/ap-cyber-ced/ced_audit.py ./verify');
    process.exit(3);
  }

  const { body: after, resolved } = ced.applySplices(before);
  const { fail, warn, note } = gate(before, after, resolved);

  for (const n of note) console.log(`note  ${n}`);
  for (const w of warn) console.log(`WARN  ${w}`);
  for (const f of fail) console.log(`FAIL  ${f}`);
  if (fail.length) {
    console.error(`\n${fail.length} check(s) failed. Nothing written.`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].join(','),
    [ced.PAGE_ID, ced.HANDLE, ced.TITLE, after, 'MERGE'].map(csvCell).join(','),
  ].join('\n') + '\n', 'utf8');
  console.log(`\nwrote ${out}  (${fs.statSync(out).size} bytes, 1 row, Command MERGE)`);
  console.log('gate passed. Import once, in MERGE mode, then:');
  console.log(`  python3 tools/ap-cyber-ced/verify_import.py ${out}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });

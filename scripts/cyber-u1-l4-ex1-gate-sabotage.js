#!/usr/bin/env node
'use strict';
// Prove every check in the Topic 1.4 Exercise 1 gate FAILS when it should.
//
//   node scripts/cyber-u1-l4-ex1-gate-sabotage.js [snapshot.html|live.json]
//
// This exercise grades in JavaScript, so the checks that matter here are the
// ones connecting a <select>'s option values to the strings the scoring code
// compares against. Nothing in the page enforces that connection: rename one
// side and the point becomes unscoreable, silently, with no console error and
// no visual difference. That is the class of bug this suite exists for.
//
// A MISSED line means the gate is blind, not that the page is fine.

const fs = require('fs');
const mod = require('../lib/cyber-u1-l4-ex1-ced');
const { gate } = require('./cyber-u1-l4-ex1-ced-csv');

const LIVE = process.argv[2]
  || 'shopify/page-snapshots/ap-cyber-unit-1-lesson-4-exercise-1.before-ced-realignment.html';
const raw = fs.readFileSync(LIVE, 'utf8');
const live = raw.trimStart().startsWith('{')
  ? JSON.parse(raw)
  : { page: { id: 132673732823, handle: mod.HANDLE, title: mod.TITLE, body_html: raw } };

const before = live.page.body_html;
const good = mod.applySplices(before).body;

const SABOTAGE = {
  'credited value names no option': (b) => b.replace("if(a1p==='secret')", "if(a1p==='sekret')"),
  'select renamed, script not': (b) => b.replace('id="p1a-defense"', 'id="p1a-defence"'),
  'script renamed, select not': (b) => b.replace("getElementById('p1a-defense')", "getElementById('p1a-defence')"),
  'two options share a value': (b) => b.replace('<option value="grammar">', '<option value="secret">'),
  'an option loses its label': (b) => b.replace(
    '<option value="antivirus">Install antivirus software that scans incoming mail</option>',
    '<option value="antivirus"></option>'),
  'an option is dropped': (b) => b.replace(
    '<option value="reply">Reply to the email and ask Dr. Martinez to confirm the request</option>', ''),
  'a legacy term is credited again': (b) => b.replace(
    '<option value="personalized">AI phishing built on AI reconnaissance',
    '<option value="personalized">AI-personalized spear phishing'),
  'a legacy term returns to Correct feedback': (b) => b.replace(
    'Correct. AI phishing, and the specifics', 'Correct. Spear phishing, and the specifics'),
  'a Unit 2 tactic is credited': (b) => b.replace(
    '<option value="secret">Ask for a secret phrase', '<option value="secret">Authority, the attacker impersonating'),
  'a point award changes': (b) => b.replace("if(d1d==='dual'){pts+=2", "if(d1d==='dual'){pts+=3"),
  'the score scaling changes': (b) => b.replace('Math.round(pts*1.5),12', 'Math.round(pts*1.5),14'),
  'script broken': (b) => b.replace('window.checkPart=function(n){', 'window.checkPart=function(n){ if( ,'),
  'a select left unclosed': (b) => b.replace('</select>\n  <p ', '\n  <p '),
  'new non-ASCII introduced': (b) => b.replace('Ask for a secret phrase', 'Ask for a sécret phrase'),
};

let bad = 0;
console.log('Topic 1.4 Exercise 1 gate\n');

const baseline = gate(before, good);
console.log('  ' + 'baseline (the real build)'.padEnd(44)
  + (baseline.fail.length ? 'UNEXPECTED FAILURE  ' + baseline.fail[0] : 'passes, as it must'));
if (baseline.fail.length) bad++;
console.log('');

for (const [name, fn] of Object.entries(SABOTAGE)) {
  const broken = fn(good);
  if (broken === good) {
    console.log('  ' + name.padEnd(44) + 'SABOTAGE DID NOT APPLY (the test is wrong, not the gate)');
    bad++;
    continue;
  }
  let fails = [];
  try { fails = gate(before, broken).fail; } catch (e) { fails = [`(gate threw) ${e.message}`]; }
  const caught = fails.length > 0;
  if (!caught) bad++;
  console.log('  ' + name.padEnd(44) + (caught ? 'caught  ' : 'MISSED  ')
    + (caught ? fails[0].slice(0, 84) : ''));
}

console.log('');
if (bad) {
  console.error(`${bad} sabotage(s) slipped through`);
  process.exit(1);
}
console.log('every sabotage was caught');

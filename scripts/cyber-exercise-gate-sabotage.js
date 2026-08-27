#!/usr/bin/env node
'use strict';
// Prove the shared exercise gate FAILS when it should, on every rebuilt page.
//
//   node scripts/cyber-exercise-gate-sabotage.js
//
// These pages grade in JavaScript. A <select> holds option values and the
// scoring code compares them as strings, and nothing in the page enforces that
// the two agree: rename one side and the point becomes unscoreable, silently,
// with no console error and no visual difference. That is the class of bug this
// exists for.
//
// It runs against every committed before/after snapshot pair rather than one
// page, because a gate that works on the page it was written for and not on the
// next one is the failure mode the shared module was extracted to prevent. Each
// sabotage is described by what it breaks, not by a literal string, so it
// applies to whichever page has that shape.
//
// A MISSED line means the gate is blind, not that the page is fine.

const fs = require('fs');
const path = require('path');
const g = require('../lib/cyber-exercise-gate');
const gate0 = require('../lib/cyber-page-gate');

//  The build scripts compose two layers: the exercise-shaped checks and the
//  page-level ones every sheet gets. This suite has to compose them the same
//  way, or a sabotage aimed at the page layer reads as a MISS against the
//  exercise layer that was never asked about it. That is what happened first
//  time round: broken script and new non-ASCII both showed MISSED on all three
//  pages, and both checks were fine.
function checkBoth(before, after) {
  const { fail, note } = g.check(before, after);
  fail.push(...gate0.nothingUnhidden(before, after));
  fail.push(...gate0.balancedTags(after, ['div', 'style', 'script', 'select', 'option']));
  fail.push(...gate0.scriptsParse(after));
  fail.push(...gate0.noNewNonAscii(before, after));
  return { fail, note };
}

const SNAP = path.join(__dirname, '..', 'shopify', 'page-snapshots');
const PAGES = [
  ['exercise 1', 'ap-cyber-unit-1-lesson-4-exercise-1'],
  ['exercise 2', 'ap-cyber-unit-1-lesson-4-exercise-2'],
  ['lab', 'ap-cyber-unit-1-lesson-4-lab'],
];

//  Each returns a broken copy, or null when this page has nothing of that shape.
const SABOTAGE = {
  'credited value names no option': (b, ctx) => {
    const k = ctx.keys[0];
    return k ? b.replace(`${k.varName}==='${k.value}'`, `${k.varName}==='zzz_no_such'`) : null;
  },
  'select renamed, script not': (b, ctx) => {
    const id = ctx.selectIds[0];
    return id ? b.replace(`id="${id}"`, `id="${id}-renamed"`) : null;
  },
  'script renamed, select not': (b, ctx) => {
    const id = ctx.selectIds[0];
    return id ? b.replace(`getElementById('${id}')`, `getElementById('${id}-renamed')`) : null;
  },
  'two options share a value': (b, ctx) => {
    const [id, opts] = ctx.firstSelect;
    return opts.length > 1 ? b.replace(`<option value="${opts[1].value}"`, `<option value="${opts[0].value}"`) : null;
  },
  'an option loses its label': (b, ctx) => {
    const [, opts] = ctx.firstSelect;
    const o = opts[opts.length - 1];
    const rx = new RegExp(`(<option value="${o.value}"[^>]*>)[\\s\\S]*?(</option>)`);
    return rx.test(b) ? b.replace(rx, '$1$2') : null;
  },
  'an option is dropped': (b, ctx) => {
    const [, opts] = ctx.firstSelect;
    const o = opts[opts.length - 1];
    const rx = new RegExp(`<option value="${o.value}"[^>]*>[\\s\\S]*?</option>`);
    return rx.test(b) ? b.replace(rx, '') : null;
  },
  'a legacy term is credited again': (b, ctx) => {
    const k = ctx.keys[0];
    if (!k) return null;
    const rx = new RegExp(`(<option value="${k.value}"[^>]*>)[\\s\\S]*?(</option>)`);
    return rx.test(b) ? b.replace(rx, '$1AI-personalized spear phishing$2') : null;
  },
  'a legacy term returns to Correct feedback': (b) => {
    const rx = /(\+\d+ (?:&mdash;|—) Correct\.)/;
    return rx.test(b) ? b.replace(rx, '$1 Spear phishing is the technique here.') : null;
  },
  'a Unit 2 tactic is taught as vocabulary': (b, ctx) => {
    const k = ctx.keys[0];
    if (!k) return null;
    const rx = new RegExp(`(<option value="${k.value}"[^>]*>)[\\s\\S]*?(</option>)`);
    return rx.test(b) ? b.replace(rx, '$1Authority (impersonating a trusted figure in power)$2') : null;
  },
  'a point award changes': (b) => (/pts\+\+/.test(b) ? b.replace('pts++', 'pts+=3') : null),
  'an accepted keyword is dropped': (b, ctx) => {
    const kl = ctx.keywords[0];
    if (!kl || kl.keys.length < 2) return null;
    return b.replace(`'${kl.keys[1]}',`, '');
  },
  'script broken': (b) => b.replace('function(n){', 'function(n){ if( ,'),
  'new non-ASCII introduced': (b, ctx) => {
    const [, opts] = ctx.firstSelect;
    const o = opts[0];
    return o.label ? b.replace(o.label.slice(0, 12), `${o.label.slice(0, 11)}é`) : null;
  },
};

let bad = 0;
let ran = 0;

for (const [label, handle] of PAGES) {
  const beforeFile = path.join(SNAP, `${handle}.before-ced-realignment.html`);
  const afterFile = path.join(SNAP, `${handle}.after-ced-realignment.html`);
  if (!fs.existsSync(beforeFile) || !fs.existsSync(afterFile)) {
    console.log(`\n${label}: snapshots not present, skipped`);
    continue;
  }
  const before = fs.readFileSync(beforeFile, 'utf8');
  const good = fs.readFileSync(afterFile, 'utf8');

  const sel = g.selects(good);
  const ctx = {
    keys: g.credited(good),
    selectIds: Object.keys(sel),
    firstSelect: Object.entries(sel)[0] || ['', []],
    keywords: g.keywordLists(good),
  };

  console.log(`\n${label}  (${ctx.selectIds.length} selects, ${ctx.keys.length} credited, ${ctx.keywords.length} keyword lists)`);

  const baseline = checkBoth(before, good);
  if (baseline.fail.length) {
    bad++;
    console.log('  ' + 'baseline (the shipped build)'.padEnd(44) + 'UNEXPECTED FAILURE  ' + baseline.fail[0].slice(0, 70));
  } else {
    console.log('  ' + 'baseline (the shipped build)'.padEnd(44) + 'passes, as it must');
  }

  for (const [name, fn] of Object.entries(SABOTAGE)) {
    let broken;
    try { broken = fn(good, ctx); } catch (e) { broken = null; }
    if (!broken || broken === good) {
      console.log('  ' + name.padEnd(44) + 'n/a on this page');
      continue;
    }
    ran++;
    let fails = [];
    try { fails = checkBoth(before, broken).fail; } catch (e) { fails = [`(gate threw) ${e.message}`]; }
    const caught = fails.length > 0;
    if (!caught) bad++;
    console.log('  ' + name.padEnd(44) + (caught ? 'caught  ' : 'MISSED  ') + (caught ? fails[0].slice(0, 70) : ''));
  }
}

console.log('');
if (bad) { console.error(`${bad} problem(s): a MISSED line means the gate is blind`); process.exit(1); }
console.log(`every sabotage was caught (${ran} applied across ${PAGES.length} pages)`);

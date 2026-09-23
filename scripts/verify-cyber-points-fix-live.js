'use strict';
// -----------------------------------------------------------------------------
//  CAN A PERFECT STUDENT REACH THE STATED TOTAL ON THESE CYBER EXERCISES?
//
//  Runs the live page's own grader, not a reading of it. For each page named
//  in scripts/build-cyber-points-fix-sheet.js this fetches the live body, pulls
//  out the script that defines window.checkPart, runs it against a small DOM
//  stand-in, and searches for the best answer to every dropdown in each part:
//  one dropdown at a time, keeping whichever option scores highest. Text boxes
//  are filled with every keyword the grader looks for, so free text is never
//  what holds a part back. Then it compares what the grader gives against the
//  "(N pts)" printed in each part's header.
//
//  Before the sheet is imported this FAILS on 1.4 Exercise 1: Parts 2 and 3
//  top out at 5 of 6, and the page at 22 of 24. That is the point of running it
//  with --before: a check that passes before the fix proves nothing after it.
//
//  Run: node scripts/verify-cyber-points-fix-live.js [--before]
//  --before inverts the exit code: it succeeds only while the defect is live.
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const vm = require('vm');
const sf = require('../lib/storefront-fetch');
const { FIXES } = require('./build-cyber-points-fix-sheet');

function graderScript(body) {
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(body))) if (m[1].includes('window.checkPart=function')) return m[1];
  return null;
}

//  Each Part N lives in #partN-section. Its header carries "(N pts)".
function parts(body) {
  const out = [];
  const re = /<div id="part(\d)-section"/g;
  let m;
  const starts = [];
  while ((m = re.exec(body))) starts.push([+m[1], m.index]);
  starts.forEach(([n, at], i) => {
    const end = i + 1 < starts.length ? starts[i + 1][1] : body.length;
    const seg = body.slice(at, end);
    const stated = seg.match(/\((\d+) pts\)/);
    const selects = [];
    const sre = /<select id="([^"]+)"([\s\S]*?)<\/select>/g;
    let s;
    while ((s = sre.exec(seg))) {
      const vals = [];
      const ore = /<option value="([^"]*)"/g;
      let o;
      while ((o = ore.exec(s[2]))) if (o[1]) vals.push(o[1]);
      selects.push({ id: s[1], vals });
    }
    const texts = [];
    const tre = /<textarea id="([^"]+)"/g;
    let t;
    while ((t = tre.exec(seg))) texts.push(t[1]);
    out.push({ n, stated: stated ? +stated[1] : null, selects, texts });
  });
  return out;
}

function keywords(src) {
  const words = new Set();
  const re = /t(?:Match|Count)\([^,]+,\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src))) for (const k of m[1].match(/'([^']*)'/g) || []) words.add(k.slice(1, -1));
  return Array.from(words).join(' ');
}

//  Just enough DOM for these graders. Unknown ids get an inert element so a
//  results panel or a total counter never throws.
function run(src, values, n) {
  const els = new Map();
  const el = (id) => {
    if (!els.has(id)) {
      els.set(id, {
        id, value: values[id] != null ? values[id] : '', textContent: '', innerHTML: '',
        style: {}, disabled: false,
        querySelectorAll: () => [], querySelector: () => null, scrollIntoView() {},
      });
    }
    return els.get(id);
  };
  const window = {};
  const ctx = { window, document: { getElementById: el }, console: { log() {}, warn() {}, error() {} } };
  vm.runInNewContext(src, ctx, { timeout: 2000 });
  window.checkPart(n);
  const fb = el('p' + n + '-feedback').innerHTML;
  const m = fb.match(/Part \d+ Score: (\d+(?:\.\d+)?) \/ (\d+)/);
  return m ? { got: +m[1], max: +m[2] } : null;
}

function bestForPart(src, part, kw) {
  const values = {};
  for (const t of part.texts) values[t] = kw;
  for (const s of part.selects) values[s.id] = s.vals[0];
  //  Coordinate ascent, twice over, so a dropdown whose best answer depends on
  //  another one still settles. These graders score each dropdown on its own,
  //  so one pass is enough in practice; the second is insurance.
  for (let pass = 0; pass < 2; pass++) {
    for (const s of part.selects) {
      let best = null;
      for (const v of s.vals) {
        const r = run(src, Object.assign({}, values, { [s.id]: v }), part.n);
        if (r && (!best || r.got > best.got)) best = { v, got: r.got };
      }
      if (best) values[s.id] = best.v;
    }
  }
  return run(src, values, part.n);
}

function check(handle) {
  const body = sf.page('/pages/' + handle).body;
  const src = graderScript(body);
  if (!src) return { handle, ok: false, lines: ['no grader script found'] };
  const kw = keywords(src);
  const lines = [];
  let ok = true, sumGot = 0, sumStated = 0;
  for (const p of parts(body)) {
    const r = bestForPart(src, p, kw);
    if (!r) { ok = false; lines.push('Part ' + p.n + ': grader produced no score'); continue; }
    sumGot += r.got; sumStated += p.stated;
    const good = r.got === p.stated && r.max === p.stated;
    if (!good) ok = false;
    lines.push('Part ' + p.n + ': best achievable ' + r.got + ' of stated ' + p.stated
      + (r.max !== p.stated ? ' (grader divides by ' + r.max + ')' : '') + (good ? '' : '   <- short'));
  }
  lines.push('Total: best achievable ' + sumGot + ' of ' + sumStated);
  return { handle, ok, lines };
}

function main(argv) {
  const before = argv.includes('--before');
  let allOk = true;
  for (const h of Object.keys(FIXES)) {
    const r = check(h);
    if (!r.ok) allOk = false;
    console.log('\n  ' + h + '  ' + (r.ok ? 'REACHES STATED TOTAL' : 'CANNOT REACH STATED TOTAL'));
    r.lines.forEach((l) => console.log('    ' + l));
  }
  console.log('');
  if (before) {
    console.log(allOk ? '  --before: the defect is already gone. Do not import the sheet.\n'
      : '  --before: defect confirmed live. The sheet is still needed.\n');
    process.exit(allOk ? 1 : 0);
  }
  process.exit(allOk ? 0 : 1);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { graderScript, parts, keywords, bestForPart, check };

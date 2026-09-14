'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  VALIDATOR: the student data privacy page sheet
//
//  This page is the one a district reviewer is pointed at, so a wrong sentence
//  on it is not a copy defect, it is a contract problem. The rules below are
//  therefore mostly about TRUTH rather than formatting, and rule 5 exists
//  because the draft this page came from carried exactly the claim it refuses.
//
//    1  no em-dash                  repo convention
//    2  no mojibake                 through lib/mojibake.js, never a pasted pattern
//    3  no CED EK code              through lib/cyber-ek-density.js
//    4  parse-back diff             the CSV re-read equals what the data renders
//    5  no absolute privacy claim   "never shared", "100% private", and friends
//    6  every subprocessor rendered  canonical list must actually reach the page
//    7  advertising matches flag    the body cannot disagree with the JSON
//    8  no unresolvable link        every href is absolute-http or a live-ish path
//
//  Each rule reports independently, because a suite that goes red in aggregate
//  cannot tell you which guard is hollow. smoke/student-data-privacy-mutation.js
//  breaks them one at a time and requires THIS rule, not any rule, to fail.
//
//  Offline, zero PII, no network. No em-dashes.
//  Run: npm run smoke:privacypage
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const gen = require('../scripts/build-student-data-privacy.js');
const mojibake = require('../lib/mojibake.js');
const ek = require('../lib/cyber-ek-density.js');

const EM_DASH = '—';

//  Claims this page may not make. Each one was either false on 2026-09-14 or is
//  not checkable, and both kinds are how a privacy page becomes a liability.
//  The first three are the shapes the original draft email used.
const ABSOLUTE_CLAIMS = [
  /\bnothing\s+is\s+(?:ever\s+)?(?:sold|shared)\b/i,
  /\bnever\s+(?:sold|shared)\b/i,
  /\bwe\s+(?:do\s+not|don't|never)\s+share\s+(?:any|student)\b/i,
  /\b100%\s+(?:private|secure|compliant)\b/i,
  /\bcompletely\s+(?:private|secure|anonymous)\b/i,
  /\bfully\s+compliant\b/i,
  /\bwe\s+guarantee\b/i,
  /\bbank[- ]level\s+security\b/i,
  /\bmilitary[- ]grade\b/i,
];

//  Minimal RFC4180 reader. Deliberately not a regex and not a library: the whole
//  point of rule 4 is to read the file back the way an importer would.
function parseCsv(text) {
  const t = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── the rules ────────────────────────────────────────────────────────────────

function ruleNoEmDash(ctx) {
  const n = (ctx.body.match(new RegExp(EM_DASH, 'g')) || []).length;
  return { ok: n === 0, detail: n ? `${n} em-dash(es) in the body` : 'none' };
}

function ruleNoMojibake(ctx) {
  const hits = mojibake.analyze(ctx.body, { cap: 5 });
  return {
    ok: hits.length === 0,
    detail: hits.length ? hits.map((h) => JSON.stringify(h).slice(0, 120)).join('; ') : 'clean',
  };
}

function ruleNoEkCodes(ctx) {
  const cites = ek.citations(ctx.body).citations.filter((c) => !c.protectedBy);
  return {
    ok: cites.length === 0,
    detail: cites.length ? cites.map((c) => c.code).join(', ') : 'none',
  };
}

function ruleParseBack(ctx) {
  const rows = parseCsv(ctx.csv);
  if (rows.length !== 2) return { ok: false, detail: `expected 2 rows, parsed ${rows.length}` };
  const [head, row] = rows;
  const idx = (name) => head.indexOf(name);
  for (const col of ['Handle', 'Command', 'Title', 'Body HTML']) {
    if (idx(col) < 0) return { ok: false, detail: `missing column ${col}` };
  }
  if (row[idx('Handle')] !== ctx.data.handle) {
    return { ok: false, detail: `handle drifted: ${row[idx('Handle')]}` };
  }
  if (row[idx('Title')] !== ctx.data.title) {
    return { ok: false, detail: `title drifted: ${row[idx('Title')]}` };
  }
  if (row[idx('Command')] !== 'MERGE') {
    return { ok: false, detail: `command is ${row[idx('Command')]}, expected MERGE` };
  }
  const back = row[idx('Body HTML')];
  if (back !== ctx.body) {
    let i = 0;
    while (i < Math.min(back.length, ctx.body.length) && back[i] === ctx.body[i]) i++;
    return {
      ok: false,
      detail: `body survived the CSV round trip differently at offset ${i} `
        + `(${ctx.body.length} rendered, ${back.length} read back)`,
    };
  }
  return { ok: true, detail: `${back.length} bytes identical after round trip` };
}

function ruleNoAbsoluteClaims(ctx) {
  const found = [];
  for (const rx of ABSOLUTE_CLAIMS) {
    const m = ctx.body.match(rx);
    if (m) found.push(m[0]);
  }
  return { ok: found.length === 0, detail: found.length ? found.join(' | ') : 'none' };
}

function ruleSubprocessorsRendered(ctx) {
  const missing = ctx.data.subprocessors.rows
    .map((r) => r[0])
    .filter((name) => !ctx.body.includes(name.split(',')[0].trim()));
  return {
    ok: missing.length === 0,
    detail: missing.length ? `not on the page: ${missing.join(', ')}` : `all ${ctx.data.subprocessors.rows.length} named`,
  };
}

//  The flag in the JSON and the paragraph on the page have to say the same
//  thing. A page claiming student pages are ad-free while Raptive still loads on
//  them is the single most expensive sentence this page could carry.
const ADS_RUN_MARKER = /page where a student sees their own progress and the page where they join/i;
const ADS_CLEAN_MARKER = /are not loaded on the student progress page/i;

function ruleAdsMatchFlag(ctx) {
  const saysRun = ADS_RUN_MARKER.test(ctx.body);
  const saysClean = ADS_CLEAN_MARKER.test(ctx.body);
  const namesVendors = /Raptive/.test(ctx.body) && /Clarity/.test(ctx.body);

  if (saysRun && saysClean) {
    return { ok: false, detail: 'the body says both that ads run on student pages and that they do not' };
  }
  if (ctx.data.student_pages_ad_free) {
    if (saysRun) return { ok: false, detail: 'flag says ad-free but the body still says ads run on student pages' };
    return { ok: saysClean, detail: saysClean ? 'ad-free wording rendered' : 'flag is true but the ad-free wording is missing' };
  }
  if (!saysRun) {
    return { ok: false, detail: 'flag is false so the body must say ads run on student pages, and it does not' };
  }
  if (!namesVendors) {
    return { ok: false, detail: 'flag is false so the body must name Raptive and Clarity, and it does not' };
  }
  return { ok: true, detail: 'current-state wording rendered, vendors named' };
}

function ruleLinksResolvable(ctx) {
  const bad = [];
  const re = /href\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(ctx.body))) {
    const href = m[1].trim();
    if (!href) { bad.push('(empty href)'); continue; }
    if (/^https?:\/\//i.test(href)) continue;
    if (/^(mailto:|tel:)/i.test(href)) continue;
    if (href.startsWith('/')) continue;
    bad.push(href);
  }
  return { ok: bad.length === 0, detail: bad.length ? bad.join(', ') : 'no unresolvable link' };
}

const RULES = [
  ['1 no em-dash', ruleNoEmDash],
  ['2 no mojibake', ruleNoMojibake],
  ['3 no EK code in student-visible text', ruleNoEkCodes],
  ['4 sheet parses back to the rendered body', ruleParseBack],
  ['5 no absolute privacy claim', ruleNoAbsoluteClaims],
  ['6 every subprocessor reaches the page', ruleSubprocessorsRendered],
  ['7 advertising section matches the flag', ruleAdsMatchFlag],
  ['8 no unresolvable link', ruleLinksResolvable],
];

//  Exported so the mutation harness can run one rule against a doctored body
//  without reading the committed files.
function runAll(ctx) {
  return RULES.map(([name, fn]) => {
    let r;
    try { r = fn(ctx); } catch (e) { r = { ok: false, detail: 'threw: ' + e.message }; }
    return { name, ok: r.ok, detail: r.detail };
  });
}

function context(overrides) {
  const data = JSON.parse(fs.readFileSync(gen.DATA, 'utf8'));
  const body = gen.render(data);
  const csv = fs.existsSync(gen.OUT) ? fs.readFileSync(gen.OUT, 'utf8') : gen.sheet(data);
  return Object.assign({ data, body, csv }, overrides || {});
}

function main() {
  const ctx = context();
  const results = runAll(ctx);
  let fail = 0;
  console.log('SMOKE: student data privacy page');
  for (const r of results) {
    console.log(`  [${r.ok ? 'PASS' : 'FAIL'}] ${r.name}  ${r.detail}`);
    if (!r.ok) fail++;
  }
  console.log(fail ? `\n${fail} rule(s) failed` : '\nall 8 rules pass');
  process.exit(fail ? 1 : 0);
}

if (require.main === module) main();
module.exports = { runAll, context, parseCsv, RULES, ABSOLUTE_CLAIMS };

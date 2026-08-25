'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: scripts/cyber-slide-embeds-from-csv.js
//
//  This generator turns a spreadsheet into a config file that grants access to
//  Google Slides decks shared "anyone with the link". A file id IS access, so
//  the failure that matters is not a missing row but an id landing on the
//  WRONG deck slot: routes/slides.js would still be filtering variants and
//  still be handing a student the teacher deck, because everything downstream
//  trusts the label.
//
//  So the suite is organised by consequence, not by input shape:
//    - crossed wires (dupe id, dupe slot, wrong lesson, bad id)  -> must REFUSE
//    - gaps (missing rows, FAILED rows)                          -> must WARN
//
//  It runs the real script as a child process against temp CSVs, and restores
//  config/cyber-slide-embeds.js afterwards so a failed run cannot leave the
//  repo holding generated ids.
//
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cyberembeds
// ---------------------------------------------------------------------------
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'cyber-slide-embeds-from-csv.js');
const CONFIG = path.join(__dirname, '..', 'config', 'cyber-slide-embeds.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cyber-embeds-'));

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + String(x).slice(0, 300) : '')); }
};

// A plausible 44-char Drive id, varied by seed.
const idFor = (seed) => (seed + 'A'.repeat(44)).slice(0, 44).replace(/[^A-Za-z0-9_-]/g, 'x');

const HEADER = 'lesson,day,variant,sourceName,slidesId,embedUrl,status';
const row = (lesson, day, variant, id, status) =>
  `${lesson},${day},${variant},Day${day}_Deck_${variant}.pptx,${id},https://docs.google.com/presentation/d/${id}/embed,${status || 'OK'}`;

function csv(lines) {
  const p = path.join(TMP, `m${Math.random().toString(36).slice(2)}.csv`);
  fs.writeFileSync(p, [HEADER].concat(lines).join('\n') + '\n');
  return p;
}

// Returns { code, out } and never throws, so a refusal is data not an exception.
function run(csvPath, write) {
  const args = [SCRIPT, csvPath].concat(write ? ['--write'] : []);
  try {
    const out = execFileSync(process.execPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status === undefined ? 1 : e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

// A complete, valid set for lesson 1-1 (2 days, 2 variants = 4 decks).
const GOOD = [
  row('1-1', 1, 'TEACHER', idFor('t11d1')),
  row('1-1', 1, 'STUDENT', idFor('s11d1')),
  row('1-1', 2, 'TEACHER', idFor('t11d2')),
  row('1-1', 2, 'STUDENT', idFor('s11d2')),
];

const original = fs.readFileSync(CONFIG, 'utf8');

try {
  console.log('\nCYBER SLIDE EMBEDS GENERATOR\n');

  console.log('1. Dry run is the default and never writes');
  {
    const r = run(csv(GOOD), false);
    ok('  exits 0 on a clean sheet', r.code === 0, r.out);
    ok('  accepts all 4 ids', /ids accepted\s*:\s*4/.test(r.out), r.out);
    ok('  says how to actually write', /Re-run with --write/.test(r.out), r.out);
    ok('  left the config untouched', fs.readFileSync(CONFIG, 'utf8') === original);
  }

  console.log('2. Crossed wires REFUSE to write');
  {
    const shared = idFor('shared');
    const r1 = run(csv([
      row('1-1', 1, 'TEACHER', shared),
      row('1-1', 1, 'STUDENT', shared),   // same file behind both variants
    ]), true);
    ok('  one id on both a teacher and a student slot -> refuses', r1.code !== 0, r1.out);
    ok('  and says why in terms of the consequence',
       /hand a student a teacher deck/i.test(r1.out), r1.out);
    ok('  and wrote nothing', fs.readFileSync(CONFIG, 'utf8') === original);

    const r2 = run(csv([
      row('1-1', 1, 'TEACHER', idFor('a')),
      row('1-1', 1, 'TEACHER', idFor('b')),   // same slot twice
    ]), true);
    ok('  the same deck slot claimed twice -> refuses', r2.code !== 0, r2.out);

    const r3 = run(csv([row('1-1', 1, 'TEACHER', 'not-an-id')]), true);
    ok('  an unusable file id -> refuses', r3.code !== 0, r3.out);

    const r4 = run(csv([row('1-1', 9, 'TEACHER', idFor('d9'))]), true);
    ok('  a day beyond the lesson day count -> refuses', r4.code !== 0, r4.out);

    const r5 = run(csv([row('1-1', 1, 'COACH', idFor('c'))]), true);
    ok('  an unrecognised variant -> refuses', r5.code !== 0, r5.out);
    ok('  config still untouched after every refusal',
       fs.readFileSync(CONFIG, 'utf8') === original);
  }

  console.log('3. A Unit 3-5 lesson is refused, with its own reason');
  {
    // Those units hold ONE whole-lesson deck each, not a per-day set. Letting
    // one through would put a 22-slide deck on the site labelled "Day 1".
    const r = run(csv(GOOD.concat([row('3-1', 1, 'TEACHER', idFor('u3'))])), true);
    ok('  refuses the sheet outright', r.code !== 0, r.out);
    ok('  names the lesson as outside the wired units',
       /outside the wired units|not in the manifest/i.test(r.out), r.out);
    ok('  tells you to widen the manifest deliberately',
       /widen config\/cyber-slide-manifest\.js/i.test(r.out), r.out);
    ok('  and wrote nothing, even though the other 4 rows were fine',
       fs.readFileSync(CONFIG, 'utf8') === original);
  }

  console.log('4. A CSP sheet passed by mistake is caught by its track column');
  {
    const p = path.join(TMP, 'csp.csv');
    fs.writeFileSync(p,
      'lesson,day,variant,track,sourceName,slidesId,embedUrl,status\n'
      + `1-1,1,TEACHER,CB,x.pptx,${idFor('cb')},https://x,OK\n`);
    const r = run(p, true);
    ok('  refuses a sheet with a track column', r.code !== 0, r.out);
    ok('  and points at the CSP generator instead',
       /csp-slide-embeds-from-csv\.js/.test(r.out), r.out);
  }

  console.log('5. Gaps are survivable, and are reported rather than hidden');
  {
    const r = run(csv([
      row('1-1', 1, 'TEACHER', idFor('g1')),
      row('1-1', 1, 'STUDENT', idFor('g2')),
      row('1-1', 2, 'TEACHER', idFor('g3'), 'FAILED: conversion timed out'),
    ]), false);
    ok('  a partial sheet still passes', r.code === 0, r.out);
    ok('  accepted only the 2 OK rows', /ids accepted\s*:\s*2/.test(r.out), r.out);
    ok('  reported the FAILED row', /marked FAILED/.test(r.out), r.out);
    ok('  warned that unconverted cyber decks are not offered at all',
       /no \.pptx fallback|will not be offered/i.test(r.out), r.out);
  }

  console.log('6. Drive lesson notation (1.1) is normalised to 1-1');
  {
    const r = run(csv([
      row('1.1', 1, 'TEACHER', idFor('n1')),
      row('1.1', 1, 'STUDENT', idFor('n2')),
    ]), false);
    ok('  a dotted lesson id is accepted', r.code === 0, r.out);
    ok('  and counted, not skipped', /ids accepted\s*:\s*2/.test(r.out), r.out);
  }

  console.log('7. --write produces a config the manifest can actually read');
  {
    const r = run(csv(GOOD), true);
    ok('  writes on a clean sheet', r.code === 0, r.out);
    const after = fs.readFileSync(CONFIG, 'utf8');
    ok('  config changed', after !== original);
    ok('  stamped with a generation date', /const GENERATED_AT = '\d{4}-\d{2}-\d{2}';/.test(after), after.slice(0, 200));

    delete require.cache[require.resolve('../config/cyber-slide-embeds')];
    delete require.cache[require.resolve('../config/cyber-slide-manifest')];
    const embeds = require('../config/cyber-slide-embeds');
    const manifest = require('../config/cyber-slide-manifest');
    ok('  4 ids readable through the module', embeds.count() === 4, embeds.count());

    const decks = manifest.decksForLesson('1-1');
    ok('  manifest now offers 4 decks for 1-1', decks.length === 4, decks);
    ok('  every one is an embed with no .pptx url',
       decks.every((d) => d.embedUrl && d.url === undefined), decks);
    ok('  embed url is the /embed view, never /edit',
       decks.every((d) => d.embedUrl.includes('/embed') && !d.embedUrl.includes('/edit')), decks);
    ok('  and does not hide the Slides toolbar',
       decks.every((d) => !d.embedUrl.includes('rm=minimal')), decks);
    ok('  and does not autoplay',
       decks.every((d) => d.embedUrl.includes('start=false')), decks);
  }
} finally {
  fs.writeFileSync(CONFIG, original);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
}

console.log('\nconfig/cyber-slide-embeds.js restored to its committed state');
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

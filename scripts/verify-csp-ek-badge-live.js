#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Board 392. Checks the 8 live CSP exercise pages with a graded check for the
//  CED Essential Knowledge badge that used to render right next to "Question N
//  of 6", visible to students. lib/csp-exercise-pages.js no longer emits it;
//  this asks the LIVE page, not the generator, because the generator agreeing
//  with itself proves nothing about what a student sees.
//
//    node scripts/verify-csp-ek-badge-live.js            all 8 graded pages
//    node scripts/verify-csp-ek-badge-live.js --before    same check, labelled
//                                                          for a pre-import run
// ─────────────────────────────────────────────────────────────────────────────
const sf = require('../lib/storefront-fetch');
const m = require('../lib/csp-exercise-pages');

const BEFORE = process.argv.includes('--before');

(async () => {
  const graded = m.allPages().filter((p) => p.graded);
  let clean = 0;
  let dirty = 0;
  const dirtyHandles = [];

  for (const p of graded) {
    let body = '';
    try {
      const r = await sf.raw('/pages/' + p.handle);
      body = String((r && r.body) || '');
    } catch (e) {
      console.log(`  FETCH FAILED  ${p.handle}  ${e && e.message}`);
      continue;
    }
    const badges = (body.match(/<span class="ek">EK [^<]*<\/span>/g) || []).length;
    if (badges === 0) {
      clean++;
      console.log(`  clean   ${p.handle}`);
    } else {
      dirty++;
      dirtyHandles.push(p.handle);
      console.log(`  DIRTY   ${p.handle}  ${badges} badge(s) still visible`);
    }
  }

  console.log('');
  console.log(`${clean} clean, ${dirty} still showing the badge, of ${graded.length} graded pages.`);
  if (BEFORE) {
    console.log(dirty === graded.length
      ? 'All graded pages still carry the defect, so the sheets are current.'
      : `${graded.length - dirty} page(s) are ALREADY CLEAN. Do not import a sheet for ${dirty === 0 ? 'any of them' : 'those'}; regenerate before importing the rest.`);
  }
  const ok = BEFORE ? dirty === graded.length : dirty === 0;
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('verify-csp-ek-badge-live failed:', e && e.message);
  process.exit(1);
});

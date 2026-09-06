'use strict';
// -----------------------------------------------------------------------------
//  THE CSP COMMAND CENTER NAV IS STALE, AND IT COSTS CSP TEACHERS THE GRADEBOOK.
//
//  Every other Command Center carries five nav items: the four course hubs, a
//  separator, and Gradebook. CSP carries two hubs and the text "CSA soon", a
//  leftover from before CSA existed. So a CSP teacher has no route to their own
//  gradebook from their own hub, and since 2026-09-06 that also means no route
//  to the Assigned / Not assigned switches, which live in the gradebook.
//
//  -- THE NAV IS DERIVED, NOT RETYPED ----------------------------------------
//  Retyping is how two pages drift. This reads the CYBER page's live nav, which
//  is the current shape, and moves `ccx-active` onto the CSP anchor. If a fifth
//  course joins the nav tomorrow, re-running this picks it up for free. The one
//  thing it will not do is invent an anchor: if cyber's nav does not already
//  link the gradebook, this refuses rather than writing one.
//
//  -- IT TOUCHES THE NAV AND NOTHING ELSE ------------------------------------
//  The CSP body is 129KB of accordions, topic data and styles. The check that
//  matters is not "did the nav change" but "did anything ELSE change", so the
//  output is diffed against the input outside the replaced span and refused on
//  any difference at all.
//
//  Run: node scripts/csp-cc-nav-repair.js <out.csv>   (--check to not write)
// -----------------------------------------------------------------------------
const fs = require('fs');
const sf = require('../lib/storefront-fetch');

const NAV_RE = /<nav class="ccx-bar"[\s\S]*?<\/nav>/;

//  Build CSP's nav from cyber's by moving which anchor is current.
function deriveNav(cyberNav, activeHref) {
  if (!/\/pages\/cyber-dashboard/.test(cyberNav)) {
    throw new Error('the source nav does not link the gradebook, so there is nothing to copy');
  }
  //  Clear every active marker, then set the one we want. Two passes, so a nav
  //  with none, or with two, still comes out carrying exactly one.
  let nav = cyberNav
    .replace(/ class="ccx-link ccx-active"/g, ' class="ccx-link"')
    .replace(/ aria-current="page"/g, '');
  const esc = activeHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const anchor = new RegExp('<a class="ccx-link" href="' + esc + '">');
  if (!anchor.test(nav)) throw new Error('no anchor for ' + activeHref + ' in the source nav');
  nav = nav.replace(anchor, '<a class="ccx-link ccx-active" href="' + activeHref + '" aria-current="page">');
  const actives = (nav.match(/ccx-active/g) || []).length;
  if (actives !== 1) throw new Error('expected exactly one active anchor, got ' + actives);
  return nav;
}

function repair(cspBody, cyberBody) {
  const cyberNav = (cyberBody.match(NAV_RE) || [])[0];
  if (!cyberNav) throw new Error('no nav found on the source page');
  const cspNav = (cspBody.match(NAV_RE) || [])[0];
  if (!cspNav) throw new Error('no nav found on the CSP page');
  if ((cspBody.match(new RegExp(NAV_RE.source, 'g')) || []).length > 1) {
    throw new Error('more than one nav on the CSP page; refusing to guess');
  }
  const next = deriveNav(cyberNav, '/pages/csp-command-center');
  const out = cspBody.replace(NAV_RE, next);
  //  Nothing outside the nav may move.
  const strip = (s) => s.replace(NAV_RE, ' NAV ');
  if (strip(out) !== strip(cspBody)) throw new Error('the edit changed something outside the nav');
  return { out, before: cspNav, after: next };
}

module.exports = { deriveNav, repair, NAV_RE };

if (require.main === module) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const out = args.filter((a) => a !== '--check')[0];
  if (!out && !check) { console.error('usage: node scripts/csp-cc-nav-repair.js <out.csv> [--check]'); process.exit(2); }

  const csp = sf.pageBody('csp-command-center');
  const cyber = sf.pageBody('cyber-command-center');
  const r = repair(csp.body_html, cyber.body_html);
  const links = (r.after.match(/href="([^"]*)"/g) || []).map((x) => x.slice(6, -1));
  console.log('  before :', r.before.replace(/\s+/g, ' ').slice(0, 210));
  console.log('  after  :', r.after.replace(/\s+/g, ' ').slice(0, 260));
  console.log('  links  :', links.join('  '));
  console.log('  body   :', csp.body_html.length, '->', r.out.length, 'bytes');
  if (check) { console.log('\n  check only, nothing written'); process.exit(0); }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const csv = [['Handle', 'Command', 'Title', 'Body HTML'].map(cell).join(',')]
    .concat([[cell('csp-command-center'), cell('UPDATE'), cell(csp.title), cell(r.out)].join(',')])
    .join('\r\n') + '\r\n';
  fs.writeFileSync(out, '﻿' + csv);
  console.log('\n  wrote', out, '(' + Math.round(csv.length / 1024) + ' KB)');
}

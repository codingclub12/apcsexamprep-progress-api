#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Does a signed-out visitor still walk past a teacher's lock?
//
//  A teacher closed a lab, the gradebook showed it shut, and she checked her own
//  fix in incognito and found it open. She was right: the gate answered "is this
//  open for MY class", and a request with no token has no class, so every lock on
//  the site was one click wide.
//
//  NO CREDENTIAL NEEDED, which is the point. This is exactly the request a
//  student makes by opening a private window, so the check IS the exploit.
//
//  WHAT THIS CAN AND CANNOT PROVE. It reads live state it does not control: if
//  no teacher currently has anything closed, there is nothing for the rule to
//  refuse and no run of this script can show it working. So it reports three
//  outcomes and never collapses them into a pass:
//
//    CLOSED     something is locked, and anonymous is refused it. The rule fires.
//    DARK       anonymous is refused something NO class has locked, or refused
//               everything. That is worse than the bug and fails loudly.
//    UNPROVEN   nothing is locked right now. Not a pass. Says so.
//
//  Run: node scripts/verify-anon-gate-live.js
// ─────────────────────────────────────────────────────────────────────────────
const labSpec = require('../lib/lab-spec');

const API = process.env.API_BASE || 'https://progress.apcsexamprep.com';

async function get(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
}

(async () => {
  const specs = labSpec.all().filter((s) => s.unit && s.lesson_id);
  if (!specs.length) { console.log('no authored labs; nothing to check'); process.exit(2); }

  console.log(`\n  asking ${API} for ${specs.length} labs with NO token, the way incognito does\n`);

  const rows = [];
  for (const s of specs) {
    const r = await get(`${API}/api/labs/${encodeURIComponent(s.course)}/${encodeURIComponent(s.item_id)}`);
    const locked = !!(r.body && r.body.locked);
    const reason = (r.body && r.body.reason) || '';
    //  The spec must not be on the wire for a refused lab. A locked:true flag
    //  beside a full spec is not a lock, it is a suggestion, and View Source
    //  defeats it.
    const leaked = locked && !!(r.body && (r.body.brief || r.body.checks || r.body.hosts));
    rows.push({ id: `${s.course} ${s.item_id}`, status: r.status, locked, reason, leaked });
    console.log(`    ${String(r.status).padEnd(4)} ${locked ? 'LOCKED' : 'open  '} ${leaked ? 'SPEC LEAKED ' : ''}${rows[rows.length - 1].id}${reason ? '  (' + reason + ')' : ''}`);
  }

  let pass = 0, fail = 0;
  const ok = (n, c, x) => { if (c) { pass++; console.log(`  [PASS] ${n}`); } else { fail++; console.log(`  [FAIL] ${n}${x !== undefined ? '  ' + JSON.stringify(x) : ''}`); } };

  console.log();
  ok('every lab answered, so the route is not simply down',
    rows.every((r) => r.status === 200), rows.filter((r) => r.status !== 200));

  //  The failure mode that is WORSE than the bug: refusing everyone everything.
  //  Public practice pays for this feature and a blanket refusal takes it dark.
  ok('the public practice layer is not dark: at least one lab is still open to anonymous',
    rows.some((r) => !r.locked), 'every lab refused a signed-out visitor');

  //  A refused lab must name the anonymous rule, so an operator can tell this
  //  rule fired rather than some other lock.
  const locked = rows.filter((r) => r.locked);
  ok('every refusal names the anonymous rule',
    locked.every((r) => /^anonymous-/.test(r.reason)), locked.map((r) => r.id + ':' + r.reason));

  ok('no refused lab put its spec on the wire anyway',
    !rows.some((r) => r.leaked), rows.filter((r) => r.leaked).map((r) => r.id));

  console.log();
  if (locked.length) {
    console.log(`  CLOSED: ${locked.length} of ${rows.length} labs refuse a signed-out visitor.`);
    console.log('  Before 2026-09-07 every one of these was served in full to anyone.');
  } else {
    console.log('  UNPROVEN: no lab is closed for any class right now, so there was');
    console.log('  nothing for the rule to refuse. This run does NOT show the bypass');
    console.log('  closed. Re-run while a teacher has a lab locked.');
  }

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('  [FAIL] the check threw: ' + e.message); process.exit(1); });

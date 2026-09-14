#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Is every lab open to a signed-out visitor?
//
//  BOARD 277, decided by Tanner on 2026-09-14: "Labs should be open as long as
//  the specific teacher doesn't lock it." A request with no token has no class,
//  so no teacher's lock applies to it and every lab must answer with its spec.
//
//  THIS SCRIPT USED TO ASSERT THE OPPOSITE, and that history is kept rather than
//  rewritten away. Between 2026-09-07 and 277 an anonymous caller was refused any
//  lab ANY class had closed, because a teacher closed a lab, checked her own fix
//  in incognito, and found it open. She was right that the lock was one click
//  wide. Tanner was shown that cost and chose the other side, because one school
//  was otherwise taking a lab dark for the entire public internet. The porousness
//  is now the policy, and this script checks the policy.
//
//  NO CREDENTIAL NEEDED, which is still the point. This is exactly the request a
//  student makes by opening a private window.
//
//  WHAT IT CANNOT SEE. It cannot prove a signed-in student of a locking class is
//  still refused, because that needs a class code and a PIN, and a session must
//  never ask for one. That half is smoke:labgate and smoke:labteacherpreview,
//  which drive the real router.
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
    //  A lab that answers open must actually carry its spec. Without this the
    //  whole check would pass against a route serving empty bodies.
    const hasSpec = !!(r.body && (r.body.brief || r.body.checks || r.body.hosts));
    rows.push({ id: `${s.course} ${s.item_id}`, status: r.status, locked, reason, hasSpec });
    console.log(`    ${String(r.status).padEnd(4)} ${locked ? 'LOCKED' : 'open  '} ${hasSpec ? '' : 'NO SPEC '}${rows[rows.length - 1].id}${reason ? '  (' + reason + ')' : ''}`);
  }

  let pass = 0, fail = 0;
  const ok = (n, c, x) => { if (c) { pass++; console.log(`  [PASS] ${n}`); } else { fail++; console.log(`  [FAIL] ${n}${x !== undefined ? '  ' + JSON.stringify(x) : ''}`); } };

  console.log();
  ok('every lab answered, so the route is not simply down',
    rows.every((r) => r.status === 200), rows.filter((r) => r.status !== 200));

  //  THE RULE ITSELF. Nobody without a class may be refused, whatever any class
  //  has closed. One refusal here is board 277 not holding in production.
  const locked = rows.filter((r) => r.locked);
  ok('no lab refuses a signed-out visitor, which is the whole of board 277',
    locked.length === 0, locked.map((r) => r.id + ':' + r.reason));

  //  NOT VACUOUS. A route answering every lab with an empty body would satisfy
  //  the line above while serving nothing, so the spec has to be there.
  ok('and every lab put its spec on the wire rather than an empty shell',
    rows.every((r) => r.hasSpec), rows.filter((r) => !r.hasSpec).map((r) => r.id));

  console.log();
  console.log(`  ${rows.length} labs, ${locked.length} refused, to a caller with no token.`);
  console.log('  Between 2026-09-07 and board 277 a lab any class had closed was withheld here.');

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('  [FAIL] the check threw: ' + e.message); process.exit(1); });

#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  What CHANGED on the board since the last sweep.
//
//  WHY A DELTA AND NOT A REPORT
//    The nightly sweep runs whether or not anything happened. A job that
//    reprints the same fourteen tasks every morning is wallpaper inside a week,
//    and an unread green tick is precisely the failure this whole system exists
//    to catch: something reporting success that nobody is checking.
//
//    So the morning artifact is the diff. "Nothing changed" is one line and is
//    the honest answer most mornings. Anything else is worth the walk to a
//    laptop.
//
//  WHAT COUNTS AS A CHANGE
//    - a task entered or left needs_verification
//    - a task gained a finding, or lost its last one
//    - a task moved bucket (a finding became undecidable, a quiet page went red)
//    - a specific signal appeared or disappeared on a task
//
//  WHAT IS DELIBERATELY NOT A CHANGE
//    generated_at, ordering, counts that follow from the above. A timestamp
//    that differs every run would make every run look eventful.
//
//  IT WRITES NOTHING, ANYWHERE. Same posture as the verifier it reads: this
//  produces the evidence for a human's verify click, never the click.
//
//  Usage:
//    node scripts/board-delta.js <previous.json> <current.json>
//    node scripts/board-delta.js --none <current.json>   # no previous run
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');

// One task's state, flattened so two runs can be compared field by field.
// Signals are sorted because the verifier emits them in check order, and a
// reordering is not a change worth waking someone for.
function index(report) {
  const byId = new Map();
  const put = (t, bucket, signals) => {
    byId.set(String(t.id), {
      id: String(t.id),
      bucket,
      url: t.url || null,
      signals: (signals || []).map((s) => `${s.level} ${s.text}`).sort(),
    });
  };
  for (const f of report.findings || []) put(f.task, 'finding', f.signals);
  for (const f of report.undecidable || []) put(f.task, 'undecidable', f.signals);
  for (const id of report.quiet || []) put({ id }, 'quiet', []);
  for (const t of report.not_machine_checkable || []) put(t, 'not-checkable', []);
  for (const t of report.over_cap || []) put(t, 'not-checked-this-run', []);
  return byId;
}

// A task over the per-run cap was not checked, so its previous state is the
// last thing actually known about it. Treating "not checked" as a change would
// report churn every time the cap lands in a different place.
const UNKNOWN = 'not-checked-this-run';

function diff(prev, cur) {
  const entered = [];
  const left = [];
  const changed = [];

  for (const [id, now] of cur) {
    const was = prev.get(id);
    if (!was) { entered.push(now); continue; }
    if (now.bucket === UNKNOWN || was.bucket === UNKNOWN) continue;
    const gained = now.signals.filter((s) => !was.signals.includes(s));
    const lost = was.signals.filter((s) => !now.signals.includes(s));
    if (was.bucket !== now.bucket || gained.length || lost.length) {
      changed.push({ id, from: was.bucket, to: now.bucket, gained, lost, url: now.url });
    }
  }
  for (const [id, was] of prev) if (!cur.has(id)) left.push(was);

  return { entered, left, changed };
}

function render(d, cur, first) {
  const L = [];
  const p = (s) => L.push(s);
  p('### Overnight board sweep');
  p('');
  p(`Read at ${cur.generated_at}. **Nothing was written.** This reports what changed`);
  p('since the last sweep; `verified` is still cookie-auth only and still yours.');
  p('');
  p(`In needs_verification: **${cur.needs_verification_total}**  |  `
    + `checked: **${cur.checked}**`);
  p('');

  if (first) {
    p('#### No previous sweep to compare against');
    p('');
    p('This is the first run, or the stored state expired. Reporting no changes is');
    p('honest here; reporting all fourteen tasks as NEW would be a false alarm on');
    p('the one morning the report has no baseline. The next run has a baseline.');
    p('');
    return L.join('\n');
  }

  const total = d.entered.length + d.left.length + d.changed.length;
  if (!total) {
    p('#### Nothing changed');
    p('');
    p('Every task is in the same bucket with the same signals as the last sweep.');
    p('Most mornings should look like this. A run that always finds something is');
    p('as suspicious as one that never does.');
    p('');
    return L.join('\n');
  }

  p(`#### ${total} change${total === 1 ? '' : 's'} since the last sweep`);
  p('');

  if (d.changed.length) {
    for (const c of d.changed) {
      p(`**#${c.id}**${c.from === c.to ? '' : `  ${c.from} -> ${c.to}`}`);
      p('');
      if (c.url) p(`- artifact: ${c.url}`);
      for (const s of c.gained) p(`- **NEW** ${s}`);
      for (const s of c.lost) p(`- gone: ${s}`);
      p('');
    }
  }
  if (d.entered.length) {
    p(`**Entered needs_verification (${d.entered.length})**`);
    p('');
    for (const t of d.entered) p(`- **#${t.id}** ${t.bucket}`);
    p('');
  }
  if (d.left.length) {
    p(`**Left needs_verification (${d.left.length})**`);
    p('');
    p('Verified, reopened, or deleted. This cannot tell which, and guessing would');
    p('be inventing a signal.');
    p('');
    for (const t of d.left) p(`- **#${t.id}**`);
    p('');
  }
  return L.join('\n');
}

function main(argv) {
  const first = argv[0] === '--none';
  const curPath = first ? argv[1] : argv[1];
  const prevPath = first ? null : argv[0];
  if (!curPath) {
    console.error('usage: node scripts/board-delta.js <previous.json|--none> <current.json>');
    process.exit(64);
  }

  let cur;
  try {
    cur = JSON.parse(fs.readFileSync(curPath, 'utf8'));
  } catch (e) {
    // A current report that will not parse is a FAILURE, not an empty delta.
    // "Nothing changed" printed because the input was unreadable is the exact
    // shape of lie this system keeps producing.
    console.error(`board-delta: cannot read the current report: ${e.message}`);
    process.exit(1);
  }

  // A previous state that will not parse is NOT fatal. It is a cache that was
  // evicted or written by an older format, and the honest response is to say
  // there is no baseline rather than to fail the night.
  let prev = null;
  if (!first) {
    try { prev = JSON.parse(fs.readFileSync(prevPath, 'utf8')); } catch (_) { prev = null; }
  }

  const noBaseline = first || !prev;
  const d = noBaseline
    ? { entered: [], left: [], changed: [] }
    : diff(index(prev), index(cur));

  console.log(render(d, cur, noBaseline));
  return 0;
}

module.exports = { index, diff, render };

if (require.main === module) process.exit(main(process.argv.slice(2)));

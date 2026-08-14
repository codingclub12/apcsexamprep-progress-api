#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  apcs - Command Center from the terminal.
//
//  The Command Center was built and then parked, and the reason is friction, not
//  features: using it meant opening a browser tab, and a tab you have to
//  remember to open loses to the terminal you are already in. This makes the
//  ledger the first and last thing a session touches.
//
//    apcs next                       what should I work on
//    apcs prompt 70 | pbcopy         the compiled prompt, hazards included
//    apcs claim 70 --lock repo:file  take the lock
//    apcs evidence 70                what is actually live right now
//    apcs done 70 --artifact <url>   return it with proof
//
//  ZERO DEPENDENCIES. Node 18+ for global fetch.
//
//  AUTH, in order of precedence:
//    APCS_TOKEN environment variable
//    ~/.apcsrc            one line: the token, nothing else
//  The token is never printed, never logged, and never passed as a querystring.
//
//  WHAT THIS CANNOT DO, on purpose: mark a task verified. That is cookie-auth
//  only (`AGENT_FORBIDDEN_FIELDS`), so an agent cannot close the loop on its own
//  report. `apcs verify` exists solely to say so and hand you the URL.
//
//  ── TASK IDS AND CLAIM IDS ARE DIFFERENT NUMBERS ────────────────────────────
//
//  `POST /api/command/task/:id/claim` takes a TASK id and returns a CLAIM id.
//  `POST /api/command/claim/:id/heartbeat` and `/claim/:id/release` take the
//  CLAIM id. An earlier version of this CLI passed the task id to both, which
//  404s when no claim carries that number and, worse, silently acts on ANOTHER
//  TASK'S claim when one does. Every command here takes the task id you already
//  know and resolves the claim id from the digest, which is the only place that
//  mapping is authoritative. Pass `--claim <id>` to skip the lookup.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = process.env.APCS_BASE || 'https://progress.apcsexamprep.com';

const C = process.stdout.isTTY ? {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
} : new Proxy({}, { get: () => (s) => s });

function token() {
  if (process.env.APCS_TOKEN) return process.env.APCS_TOKEN.trim();
  const rc = path.join(os.homedir(), '.apcsrc');
  if (fs.existsSync(rc)) {
    const t = fs.readFileSync(rc, 'utf8').trim();
    if (t) return t;
  }
  die('No credential. Set APCS_TOKEN, or put the token on one line in ~/.apcsrc\n'
    + '  echo "YOUR_TOKEN" > ~/.apcsrc && chmod 600 ~/.apcsrc');
}

function die(msg, code = 1) {
  console.error(`${C.red('apcs:')} ${msg}`);
  process.exit(code);
}

// `raw` returns the response without dying on a non-2xx, for the callers that
// need to read a 409 body rather than be killed by it.
async function raw(method, p, body) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, ok: res.ok, json, text };
}

async function api(method, p, body) {
  const r = await raw(method, p, body);
  if (r.status === 401) die('401 - credential rejected. Token expired or rotated?');
  if (r.status === 403) {
    die(`403 - forbidden.\n  ${r.json?.error || r.text.slice(0, 200)}\n`
      + `  ${C.dim('Agent credentials cannot touch: due_date, cost_per_day, promised_by, verified.')}`);
  }
  if (!r.ok) die(`${r.status} ${method} ${p}\n  ${r.json?.error || r.text.slice(0, 300)}`);
  return r.json ?? r.text;
}

// ── claim resolution ─────────────────────────────────────────────────────────
//  The digest is the only endpoint that publishes the task -> claim mapping, in
//  in_flight and stale rows. A stale claim still has to be releasable, which is
//  most of the point of releasing one, so both lists are searched.
async function resolveClaimId(taskId, argv) {
  const explicit = flag(argv, '--claim');
  if (explicit) return { claim_id: Number(explicit), source: 'flag' };

  const d = await api('GET', '/api/command/digest');
  const rows = [...(d.in_flight || []), ...(d.stale || [])];
  const hits = rows.filter((r) => Number(r.task_id) === Number(taskId) && r.claim_id);
  if (!hits.length) return { claim_id: null, source: 'digest' };
  // Newest claim wins if a task somehow carries more than one.
  hits.sort((a, b) => Number(b.claim_id) - Number(a.claim_id));
  return { claim_id: Number(hits[0].claim_id), source: 'digest', row: hits[0] };
}

function noClaim(taskId, verb) {
  die(`#${taskId} has no live claim to ${verb}.\n`
    + `  Claims are held per surface: chat-routed tasks never hold one.\n`
    + `  Take it first with: apcs claim ${taskId}\n`
    + `  Or name the claim directly:  apcs ${verb} ${taskId} --claim <claim_id>`);
}

// ── formatting ───────────────────────────────────────────────────────────────
const FLAG = (t) => [
  t.bleeding ? C.red('BLEED') : null,
  t.blocked ? C.yellow('BLOCKED') : null,
  t.status === 'done' && !t.verified ? C.yellow('UNVERIFIED') : null,
].filter(Boolean).join(' ');

function line(t) {
  const id = C.bold(`#${String(t.id).padEnd(4)}`);
  const meta = C.dim(`${t.bucket || '-'}/${t.surface || '-'}/${t.owner || '-'}`);
  return `  ${id} ${String(t.title || '').slice(0, 66).padEnd(66)} ${meta} ${FLAG(t)}`.trimEnd();
}

function section(title, list, limit) {
  if (!list || !list.length) return;
  console.log(`\n${C.bold(title)} ${C.dim(`(${list.length})`)}`);
  list.slice(0, limit || list.length).forEach((t) => console.log(line(t)));
}

// ── commands ─────────────────────────────────────────────────────────────────
const cmds = {};

cmds.digest = async () => {
  const d = await api('GET', '/api/command/digest');
  console.log(C.dim(`as of ${d.as_of}   ${d.task_count} open`));
  section('BLEEDING', d.bleeding);
  section('OVERDUE PROMISES', d.overdue_promises);
  section('DUE SOON', d.due_soon);
  section('DECISIONS BLOCKING WORK', d.decisions_blocking);
  section('AGENT READY', d.agent_ready, 8);
  section('IN FLIGHT', d.in_flight);
  section('STALE / STUCK', [...(d.stale || []), ...(d.stuck || [])]);
  section('NEEDS VERIFICATION', d.needs_verification, 6);
  if (d.needs_verification?.length > 6) {
    console.log(C.dim(`  ... ${d.needs_verification.length - 6} more. apcs list --needs-verification`));
  }
  const cost = d.costing_money?.total_per_day;
  if (cost) console.log(`\n${C.red(`$${cost}/day burning`)}`);
  console.log(`\n${C.dim('apcs next  .  apcs show <id>  .  apcs prompt <id>')}`);
};

cmds.next = async () => {
  const d = await api('GET', '/api/command/digest');
  const pick = (d.bleeding || []).find((t) => t.owner !== 'tanner')
    || (d.agent_ready || [])[0]
    || (d.quick_wins || [])[0];
  if (!pick) { console.log('Nothing agent-ready. Try: apcs digest'); return; }
  await cmds.show([String(pick.id)]);
  console.log(`\n${C.dim('apcs claim ' + pick.id + '  .  apcs prompt ' + pick.id + ' | pbcopy')}`);
};

cmds.show = async (argv) => {
  const id = need(argv[0], 'show <id>');
  const t = await api('GET', `/api/todo/${id}`);
  const task = t.task || t;
  console.log(`${C.bold(`#${task.id}`)}  ${C.bold(task.title)}`);
  console.log(C.dim(`  ${task.bucket}/${task.surface || '-'}/${task.course || '-'}  `
    + `owner=${task.owner}  size=${task.size || '-'}  status=${task.status}`
    + `  verified=${task.verified ? 'yes' : 'NO'}`));
  if (task.routed_surface) {
    console.log(C.cyan(`  routed -> ${task.routed_surface} / ${task.routed_model}`));
    if (task.routed_reason) console.log(C.dim(`  because: ${task.routed_reason}`));
  }
  if (task.detail) console.log(`\n${wrap(task.detail, 76, '  ')}`);
  if (task.artifact_url) console.log(`\n  ${C.dim('artifact:')} ${task.artifact_url}`);
};

cmds.prompt = async (argv) => {
  const id = need(argv[0], 'prompt <id>');
  const out = await api('GET', `/api/command/task/${id}/prompt?format=text`);
  console.log(typeof out === 'string' ? out : (out.prompt || JSON.stringify(out, null, 2)));
};

cmds.claim = async (argv) => {
  const id = need(argv[0], 'claim <id> [--lock repo:path] [--surface claude_code]');
  const surface = flag(argv, '--surface') || 'claude_code';
  const locks = flags(argv, '--lock');
  const label = flag(argv, '--label');
  const ttl = flag(argv, '--ttl');
  const force = argv.includes('--force');

  const body = { surface, locks };
  if (label) body.session_label = label;
  if (ttl) body.ttl_minutes = Number(ttl);

  const r = await raw('POST', `/api/command/task/${id}/claim${force ? '?force=true' : ''}`, body);

  // A 409 is the protocol working, not an error to swallow. Name the holder.
  if (r.status === 409) {
    const h = r.json?.holder || {};
    console.error(`${C.yellow('lock conflict')} on #${id}`);
    console.error(`  held by ${h.surface || '?'}${h.session_label ? ` "${h.session_label}"` : ''}`
      + ` on task #${h.task_id} (claim #${h.claim_id}), ${r.json?.held_for_minutes ?? '?'}m`);
    console.error(`  conflicting: ${(r.json?.locks_conflicting || []).join(', ')}`);
    console.error(`  ${C.dim('retry with --force to take it. That writes an audit row naming you.')}`);
    process.exit(3);
  }
  if (r.status === 401) die('401 - credential rejected.');
  if (!r.ok) die(`${r.status} claim #${id}\n  ${r.json?.error || r.text.slice(0, 300)}`);

  const claimId = r.json.claim_id;
  console.log(`${C.green('claimed')} #${id} as ${surface}  ${C.dim(`claim #${claimId}`)}`);
  if (r.json.locks?.length) console.log(C.dim(`  locks: ${r.json.locks.join(', ')}`));
  else console.log(C.dim('  no locks named. Pass --lock repo:path so a conflicting session gets a 409.'));
  if (r.json.forced) console.log(C.yellow('  forced out the previous holder; an audit row names you.'));
  console.log(C.dim(`  expires ${r.json.expires_at}`));
  console.log(C.dim(`  heartbeat with: apcs heartbeat ${id}`));
};

cmds.heartbeat = async (argv) => {
  const id = need(argv[0], 'heartbeat <id>');
  const { claim_id } = await resolveClaimId(id, argv);
  if (!claim_id) noClaim(id, 'heartbeat');
  const r = await api('POST', `/api/command/claim/${claim_id}/heartbeat`, {});
  console.log(`${C.green('alive')} #${id} ${C.dim(`(claim #${claim_id}, ${r.state || 'live'})`)}`);
};

cmds.release = async (argv) => {
  const id = need(argv[0], 'release <id>');
  const { claim_id } = await resolveClaimId(id, argv);
  if (!claim_id) noClaim(id, 'release');
  await api('POST', `/api/command/claim/${claim_id}/release`, {});
  console.log(`${C.yellow('released')} #${id} ${C.dim(`(claim #${claim_id})`)} - lock given up, nothing closed`);
};

cmds.done = async (argv) => {
  const id = need(argv[0], 'done <id> --artifact <url-or-evidence>');
  const artifact = flag(argv, '--artifact');
  if (!artifact) {
    die('--artifact is required.\n'
      + '  A task cannot close without proof: a PR URL, a live curl result,\n'
      + '  a Shopify updatedAt delta, or an md5. This is enforced server-side.');
  }
  const notes = flag(argv, '--notes');

  // Prefer the claim RETURN route: it records the artifact and releases the lock
  // in one call. Closing with a bare PATCH leaves the claim held, and a held
  // claim with nothing behind it rots into `stale` and blocks the next session.
  const { claim_id } = await resolveClaimId(id, argv);
  if (claim_id) {
    const body = { status: 'done', artifact_url: artifact };
    if (notes) body.notes = notes;
    await api('POST', `/api/command/claim/${claim_id}/return`, body);
    console.log(`${C.green('returned')} #${id} ${C.dim(`(claim #${claim_id} released)`)}`);
  } else {
    await api('PATCH', `/api/todo/${id}`, { status: 'done', artifact_url: artifact });
    console.log(`${C.green('done')} #${id} ${C.dim('(no claim held, closed directly)')}`);
  }
  console.log(C.dim('  landed as verified=0 -> it is now in needs_verification.'));
  console.log(C.dim(`  ${BASE}/admin/command to verify`));
};

cmds.verify = async (argv) => {
  const id = need(argv[0], 'verify <id>');
  console.log(`${C.yellow('Cannot verify from the CLI, by design.')}`);
  console.log('  `verified` is in AGENT_FORBIDDEN_FIELDS: cookie-auth only, so an');
  console.log('  agent can never close the loop on its own report.\n');
  console.log(`  Gather the evidence:  ${C.cyan(`apcs evidence ${id}`)}`);
  console.log(`  Then click verify at: ${C.cyan(`${BASE}/admin/command`)}`);
};

// The bridge between the ledger and reality: pull the task's artifact and go
// look at it. This is the command that stops "marked done" from meaning "done".
cmds.evidence = async (argv) => {
  const id = need(argv[0], 'evidence <id>');
  const t = await api('GET', `/api/todo/${id}`);
  const task = t.task || t;
  const url = task.artifact_url;
  if (!url) die(`#${id} has no artifact_url. Nothing to check.`);
  const first = String(url).split(/\s+/).find((w) => /^https?:\/\//.test(w));
  if (!first) {
    console.log(`#${id} artifact is a note, not a URL. Nothing machine-checkable:\n`);
    console.log(wrap(String(url), 76, '  '));
    return;
  }
  const script = path.join(__dirname, 'verify-artifact.js');
  if (!fs.existsSync(script)) die('verify-artifact.js not found next to this CLI.');
  console.log(C.dim(`checking ${first}\n`));
  const args = [script, first];
  flags(argv, '--phrase').forEach((p) => args.push('--phrase', p));
  try {
    console.log(execFileSync('node', args, { encoding: 'utf8' }));
  } catch (e) {
    console.log(e.stdout || String(e.message));
  }
};

cmds.add = async (argv) => {
  const title = need(argv[0], 'add "<title>" [--bucket now] [--surface shopify]');
  const body = { title, bucket: flag(argv, '--bucket') || 'week' };
  for (const k of ['surface', 'course', 'size', 'owner', 'detail']) {
    const v = flag(argv, `--${k}`);
    if (v) body[k] = v;
  }
  const r = await api('POST', '/api/todo', body);
  const t = r.task || r;
  console.log(`${C.green('added')} #${t.id}  ${t.title}`);
};

cmds.list = async (argv) => {
  const d = await api('GET', '/api/command/digest');
  if (argv.includes('--needs-verification')) return section('NEEDS VERIFICATION', d.needs_verification);
  if (argv.includes('--bleeding')) return section('BLEEDING', d.bleeding);
  const all = await api('GET', '/api/todo');
  return section('OPEN', all.tasks || []);
};

cmds.help = async () => {
  console.log(`
${C.bold('apcs')} - Command Center from the terminal

  ${C.bold('apcs digest')}                  the session-start read
  ${C.bold('apcs next')}                    what to work on now
  ${C.bold('apcs show')} <id>               one task in full
  ${C.bold('apcs prompt')} <id>             compiled prompt, hazards injected
  ${C.bold('apcs list')} [--bleeding|--needs-verification]

  ${C.bold('apcs claim')} <id> [--lock repo:path ...] [--surface claude_code] [--force]
  ${C.bold('apcs heartbeat')} <id>          keep a long claim alive
  ${C.bold('apcs release')} <id>            give up the lock, close nothing
  ${C.bold('apcs done')} <id> --artifact <url> [--notes "..."]

  ${C.bold('apcs evidence')} <id>           go look at what is actually live
  ${C.bold('apcs verify')} <id>             explains why the CLI cannot

  ${C.bold('apcs add')} "<title>" [--bucket now --surface shopify --size s]

${C.dim(`Task ids and claim ids are different numbers. Every command above takes the
TASK id and resolves the claim itself. Override with --claim <claim_id>.

auth: APCS_TOKEN env var, or one line in ~/.apcsrc
base: ${BASE}  (override with APCS_BASE)`)}
`);
};

// ── helpers ──────────────────────────────────────────────────────────────────
function need(v, usage) { if (!v) die(`usage: apcs ${usage}`); return v; }
function flag(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
}
// Repeatable flag: --lock a --lock b -> ['a','b']
function flags(argv, name) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name && argv[i + 1] !== undefined) out.push(argv[i + 1]);
  }
  return out;
}
function wrap(s, width, indent) {
  const words = String(s).replace(/\s+/g, ' ').split(' ');
  const lines = []; let cur = indent;
  for (const w of words) {
    if ((cur + w).length > width) { lines.push(cur); cur = indent; }
    cur += (cur === indent ? '' : ' ') + w;
  }
  if (cur.trim()) lines.push(cur);
  return lines.join('\n');
}

module.exports = { cmds, flags, flag, resolveClaimId };

if (require.main === module) {
  (async () => {
    const [cmd, ...argv] = process.argv.slice(2);
    const fn = cmds[cmd || 'digest'];
    if (!fn) { await cmds.help(); process.exit(64); }
    try { await fn(argv); } catch (e) { die(e.message || String(e)); }
  })();
}

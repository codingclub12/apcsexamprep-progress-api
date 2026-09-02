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
//    TODO_KEY environment variable   what a Claude Code environment already sets
//  The token is never printed, never logged, and never passed as a querystring.
//
//  BEHIND A PROXY: this re-execs itself with --use-env-proxy when HTTPS_PROXY is
//  set, because Node's fetch ignores that variable before Node 24. See
//  reexecForProxy below.
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
const { execFileSync, spawnSync } = require('child_process');

const BASE = process.env.APCS_BASE || 'https://progress.apcsexamprep.com';

// ── egress proxy ─────────────────────────────────────────────────────────────
//  Node's global fetch does not read HTTPS_PROXY. Reading it automatically
//  arrived in Node 24; this repo pins 22, and a remote agent container routes
//  every outbound connection through a local CONNECT proxy. So the CLI sent its
//  requests around the proxy, the proxy refused them, and the refusal it printed
//  was the proxy's own: "add this host to your network egress settings". That
//  advice can never work, because the host was already allowed. The request was
//  simply never tunneled. A whole session was spent on the allowlist before the
//  bypass was found, which is the cost this comment exists to prevent.
//
//  undici reads the flag when it initialises, which happens before the first
//  line of this file runs, so no assignment to process.env here can matter. The
//  only fix available from inside the process is to hand the flag to a new one.
//  Re-exec once, guarded against recursion, and only when there is a proxy to
//  use: with no proxy configured this is a no-op and the CLI runs in-process.
//
//  NO_PROXY still applies inside the child, so the smoke suite driving this CLI
//  against 127.0.0.1 stays direct and offline.
function reexecForProxy() {
  if (process.env.APCS_PROXY_REEXEC === '1') return;        // this IS the child
  if (!(process.env.HTTPS_PROXY || process.env.https_proxy)) return;
  // Node 22.x and older without the flag: nothing to re-exec into. Fall through
  // rather than fail, so a direct-egress machine is unaffected.
  if (!process.allowedNodeEnvironmentFlags.has('--use-env-proxy')) return;

  const r = spawnSync(
    process.execPath,
    // The env-proxy agent is flagged experimental and warns on every run. One
    // warning per ledger command is noise that trains people to ignore stderr.
    // Silenced by warning CODE: --disable-warning=ExperimentalWarning does not
    // match this one, which is emitted under the code UNDICI-EHPA.
    ['--use-env-proxy', '--disable-warning=UNDICI-EHPA',
      __filename, ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, APCS_PROXY_REEXEC: '1' } },
  );
  // Could not spawn: fall through and let the direct attempt report honestly.
  if (r.error) return;
  process.exit(r.status === null ? 1 : r.status);
}
reexecForProxy();

const C = process.stdout.isTTY ? {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
} : new Proxy({}, { get: () => (s) => s });

//  TODO_KEY is last and deliberately additive: it changes nothing for anyone who
//  already works today. It is here because the SessionStart hook reads TODO_KEY
//  and this CLI read only APCS_TOKEN, so a remote session could open with a
//  digest in context and still be told "No credential" by every verb that
//  follows it. Same credential, two names, and the ledger unusable in between.
function token() {
  if (process.env.APCS_TOKEN) return process.env.APCS_TOKEN.trim();
  const rc = path.join(os.homedir(), '.apcsrc');
  if (fs.existsSync(rc)) {
    const t = fs.readFileSync(rc, 'utf8').trim();
    if (t) return t;
  }
  if (process.env.TODO_KEY) return process.env.TODO_KEY.trim();
  die('No credential. Set APCS_TOKEN, or put the token on one line in ~/.apcsrc\n'
    + '  echo "YOUR_TOKEN" > ~/.apcsrc && chmod 600 ~/.apcsrc\n'
    + '  TODO_KEY is also accepted, which is what a Claude Code environment sets.');
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
    // A 403 from the egress proxy and a 403 from the board mean opposite things,
    // and answering the first with the second's advice is what cost a session.
    // The board always answers JSON; the proxy answers text/plain.
    if (!r.json && /not in allowlist/i.test(r.text)) {
      die(`403 - blocked before the request reached the board.\n`
        + `  ${r.text.slice(0, 200)}\n`
        + `  ${C.dim('This is the container egress proxy, not the API, so no board')}\n`
        + `  ${C.dim('credential or permission is involved. Either the host really is')}\n`
        + `  ${C.dim('missing from this environment\'s allowlist, or the request went')}\n`
        + `  ${C.dim('around the proxy: re-run with APCS_PROXY_REEXEC unset.')}`);
    }
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

//  THE DIGEST MIXES TWO ROW SHAPES, AND ONLY ONE OF THEM IS A TASK.
//  `in_flight` and `stale` carry CLAIM rows: they key the task as `task_id` and
//  `task_title`, and add `locks` and heartbeat age. This function read `t.id`
//  and `t.title`, which do not exist on a claim, so every claim printed as
//  "#undefined" followed by nothing.
//
//  Four stale claims sat in the live digest that way. The ledger could say
//  something was stuck and not which task it was stuck on, nor which files it
//  was still holding, which is the one question a stale claim exists to answer.
const isClaim = (r) => !!r && r.claim_id !== undefined && r.claim_id !== null;

//  Minutes are how the API reports age, and "5760m" is not a duration anybody
//  reads. A stale claim is usually hours or days old.
function mins(n) {
  const m = Math.round(Number(n) || 0);
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

function claimLine(c) {
  const id = C.bold(`#${String(c.task_id == null ? '?' : c.task_id).padEnd(4)}`);
  const locks = c.locks || [];
  //  Said out loud rather than printed as "0 locks", because a claim with no
  //  locks protects nothing and the digest is where somebody would notice.
  const held = locks.length
    ? C.dim(`${locks.length} lock${locks.length > 1 ? 's' : ''}`)
    : C.yellow('NO LOCKS');
  const who = c.session_label ? ` ${c.session_label}` : '';
  const meta = C.dim(`claim ${c.claim_id}${who}, ${mins(c.age_minutes)} old, `
    + `${mins(c.since_heartbeat_minutes)} silent`);
  return `  ${id} ${String(c.task_title || '').slice(0, 50).padEnd(50)} ${meta} ${held}`.trimEnd();
}

function line(t) {
  if (isClaim(t)) return claimLine(t);
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
  const stuckRows = [...(d.stale || []), ...(d.stuck || [])];
  section('STALE / STUCK', stuckRows);
  //  A stale claim keeps its locks until somebody takes them back, so the next
  //  session to want that file gets a 409 naming a session that walked away.
  if (stuckRows.some(isClaim)) {
    console.log(C.dim('  a stale claim still holds its locks.  apcs release <task-id>'));
  }
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
  // The bare board URL used to be the whole answer, which meant hunting for the
  // row under filters that default to hiding it. This lands on it directly,
  // panel open. Still a human click, still cookie-auth only.
  console.log(`  Then click verify at: ${C.cyan(`${BASE}/admin/command#t${id}`)}`);
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

auth: APCS_TOKEN env var, one line in ~/.apcsrc, or TODO_KEY
base: ${BASE}  (override with APCS_BASE)
proxy: HTTPS_PROXY is honoured by re-exec (Node fetch ignores it before Node 24)`)}
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

module.exports = { cmds, flags, flag, resolveClaimId, line, claimLine, isClaim, mins };

if (require.main === module) {
  (async () => {
    const [cmd, ...argv] = process.argv.slice(2);
    const fn = cmds[cmd || 'digest'];
    if (!fn) { await cmds.help(); process.exit(64); }
    try { await fn(argv); } catch (e) { die(e.message || String(e)); }
  })();
}

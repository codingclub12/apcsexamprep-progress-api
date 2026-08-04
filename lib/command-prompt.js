'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PROMPT COMPILER. The highest-value component in the build: it is the thing
//  that kills context re-establishment. A compiled prompt arrives complete, so
//  the session starts by working rather than by asking what the repo is, which
//  file owns what, and what already went wrong here.
//
//  Assembled from (spec 5): title/detail/acceptance, routed surface + model +
//  reason, repo and file-ownership warnings from LIVE claims, the cited source
//  document, the surface-conditional hazard block injected verbatim, blockers
//  named in both directions, and write-back instructions with the exact return
//  payload.
//
//  Two shapes come out of here:
//   - a WORK prompt for everything routable
//   - a DECISION BRIEF for bucket=decision, which is not a work prompt at all.
//     A router that says "no" wastes the highest-leverage minute in the day; a
//     brief that says "this five-minute call is holding a finished package"
//     gets the decision made.
//
//  The compiler never emits a credential. The chat return command references
//  $TODO_KEY as a shell variable; the literal key appears nowhere in any output.
// ─────────────────────────────────────────────────────────────────────────────
const { hazardsFor } = require('./command-hazards');

function esc(v) { return String(v == null ? '' : v); }

function quoteBlock(body) {
  return esc(body).split('\n').map((l) => `> ${l}`).join('\n');
}

function fmtTask(t) {
  return `#${t.id} "${esc(t.title)}"`;
}

// Source documents come from the registry's _meta.source_documents, stored in
// command_config at bulk load. Accepts either a { key: "path or note" } map or
// an array of { key, path, applies_to }. A task cites one by source_doc; a doc
// whose applies_to matches the task's surface or course is cited too.
function citedDocs(task, sourceDocs) {
  const out = [];
  if (!sourceDocs) return out;
  const wanted = String(task.source_doc || '').trim();
  const surface = String(task.surface || '').trim().toLowerCase();
  const course = String(task.course || '').trim().toLowerCase();

  if (Array.isArray(sourceDocs)) {
    for (const d of sourceDocs) {
      if (!d) continue;
      const key = esc(d.key || d.name || d.id);
      const applies = [].concat(d.applies_to || []).map((x) => String(x).toLowerCase());
      const hit = (wanted && (key === wanted || esc(d.path) === wanted))
        || applies.includes(surface) || applies.includes(course);
      if (hit) out.push(`${key}${d.path ? ` (${esc(d.path)})` : ''}${d.note ? ` - ${esc(d.note)}` : ''}`);
    }
    return out;
  }
  if (typeof sourceDocs === 'object') {
    for (const [key, val] of Object.entries(sourceDocs)) {
      const k = key.toLowerCase();
      if ((wanted && (key === wanted || val === wanted)) || k === surface || k === course) {
        out.push(`${key}: ${esc(val)}`);
      }
    }
    if (!out.length && wanted) out.push(wanted);
    return out;
  }
  return out;
}

// ── The return call, spelled out ─────────────────────────────────────────────
function returnSection(task, routed, baseUrl) {
  const url = `${baseUrl}/api/command/task/${task.id}/claim`;
  const payload = JSON.stringify({
    status: 'done',
    artifact_url: 'https://github.com/<owner>/<repo>/pull/<n>',
    notes: 'one line on what changed',
  });

  if (routed.closes_manually) {
    // Chat has web_fetch and nothing else: no custom headers, no POST body. It
    // can never call this itself, so the prompt hands Tanner a command to run,
    // or he clicks Verify on the page. No pretending otherwise.
    return [
      '## Closing this out (chat cannot self-close)',
      '',
      'Chat holds no claim and cannot POST a return. When the work is done, either click Verify',
      'on /admin/command, or paste this into a terminal (TODO_KEY comes from your environment,',
      'never from this prompt):',
      '',
      '```bash',
      `curl -sS -X PATCH ${baseUrl}/api/todo/${task.id} \\`,
      '  -H "Authorization: Bearer $TODO_KEY" \\',
      '  -H "Content-Type: application/json" \\',
      `  -d '${JSON.stringify({ status: 'done', artifact_url: 'PASTE_ARTIFACT_URL_HERE', notes: 'one line on what changed' })}'`,
      '```',
      '',
      'A task cannot be closed without an artifact: a PR URL, a Shopify page updatedAt delta, an',
      'md5, or a live curl result. `verified` stays 0 until Tanner sets it from the browser.',
    ].join('\n');
  }

  return [
    '## Write-back protocol (not optional)',
    '',
    'Claim before you touch a file:',
    '',
    '```bash',
    `curl -sS -X POST ${url} \\`,
    '  -H "Authorization: Bearer $TODO_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '${JSON.stringify({ surface: routed.routed_surface, session_label: '<what you are>', locks: ['repo:path/to/file.js'], ttl_minutes: 90 })}'`,
    '```',
    '',
    'Heartbeat every ~5 minutes: `POST /api/command/claim/<claim_id>/heartbeat`.',
    'A claim that stops heartbeating goes `stale` in the digest. A claim that heartbeats for 45+',
    'minutes with zero task_events writes goes `stuck`.',
    '',
    'Return when done:',
    '',
    '```bash',
    `curl -sS -X POST ${baseUrl}/api/command/claim/<claim_id>/return \\`,
    '  -H "Authorization: Bearer $TODO_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '${payload}'`,
    '```',
    '',
    '`status=done` is REJECTED without an artifact_url: a PR URL, a Shopify page updatedAt delta,',
    'an md5, or a live curl result. Your write sets verified=0; only Tanner can set verified=1.',
    'Use `awaiting_review` when a PR is open and nobody has looked at it yet.',
  ].join('\n');
}

// ── Work prompt ──────────────────────────────────────────────────────────────
function workPrompt(ctx) {
  const { task, routed, blockers = [], blocks = [], claims = [], sourceDocs, baseUrl } = ctx;
  const lines = [];

  lines.push(`# ${esc(task.title)}`);
  lines.push('');
  lines.push([
    `task #${task.id}`,
    `bucket ${esc(task.bucket)}`,
    task.size ? `size ${esc(task.size)}` : null,
    task.surface ? `surface ${esc(task.surface)}` : null,
    task.course ? `course ${esc(task.course)}` : null,
    task.due_date ? `due ${esc(task.due_date)}` : null,
  ].filter(Boolean).join(' | '));
  lines.push('');

  if (task.detail) {
    lines.push('## Why this matters');
    lines.push('');
    lines.push(esc(task.detail));
    lines.push('');
  }

  lines.push('## Routing');
  lines.push('');
  lines.push(`- Surface: **${esc(routed.routed_surface)}**${routed.flags && routed.flags.length ? ` (${routed.flags.join(', ')})` : ''}`);
  lines.push(`- Model: **${esc(routed.routed_model)}**`);
  lines.push(`- Why: ${esc(routed.routed_reason)}`);
  lines.push(`- Auto-dispatch: ${routed.auto_dispatch_eligible ? 'eligible' : 'not eligible'} - ${esc(routed.auto_dispatch_reason)}`);
  lines.push('');

  const docs = citedDocs(task, sourceDocs);
  if (docs.length) {
    lines.push('## Source of truth');
    lines.push('');
    for (const d of docs) lines.push(`- ${d}`);
    lines.push('');
  }

  lines.push('## File ownership and live claims');
  lines.push('');
  if (!claims.length) {
    lines.push('No live claims anywhere in the system right now. Claim your files before you touch them.');
  } else {
    for (const c of claims) {
      const locks = (c.locks || []).join(', ') || 'no files declared';
      const own = c.task_id === task.id ? ' (on THIS task)' : ` (on ${fmtTask({ id: c.task_id, title: c.task_title })})`;
      lines.push(`- \`${locks}\` held by **${esc(c.surface)}**${c.session_label ? ` "${esc(c.session_label)}"` : ''} for ${c.age_minutes} min${own}`);
    }
    lines.push('');
    lines.push('A second claim on any of those `repo:path` pairs gets a hard 409. If you must take one,');
    lines.push('`?force=true` overrides and writes an audit row naming you.');
  }
  if (routed.closes_manually) {
    lines.push('');
    lines.push('Chat holds no lock. If you are editing a file that Claude Code also owns, say so in the');
    lines.push('thread before you write: there is no lock to protect you here, only this warning.');
  }
  lines.push('');

  lines.push('## Dependencies');
  lines.push('');
  if (blockers.length) {
    for (const b of blockers) lines.push(`- BLOCKED BY ${fmtTask(b)} (${esc(b.status)})`);
  } else {
    lines.push('- Nothing blocks this.');
  }
  for (const b of blocks) lines.push(`- Finishing this unblocks ${fmtTask(b)}`);
  lines.push('');

  const hazards = hazardsFor(task);
  if (hazards.length) {
    lines.push('## Hazards, injected verbatim (do not paraphrase, do not skip)');
    for (const h of hazards) {
      lines.push('');
      lines.push(`**${h.title}**`);
      lines.push('');
      lines.push(quoteBlock(h.body));
    }
    lines.push('');
  }

  lines.push('## Acceptance');
  lines.push('');
  lines.push('- The work is done when there is an ARTIFACT: a PR URL, a Shopify page updatedAt delta, an md5,');
  lines.push('  or a live curl result. Agent reports are not evidence; artifacts are.');
  if (task.est_minutes) lines.push(`- Estimated at ${task.est_minutes} minutes. If it is running 3x that, return it as blocked and say why.`);
  if (task.bleeding) lines.push('- **A user is hitting this broken RIGHT NOW.** Ship the smallest fix that stops the bleeding first.');
  lines.push('');

  lines.push(returnSection(task, routed, baseUrl));
  lines.push('');
  return lines.join('\n');
}

// ── Decision brief ───────────────────────────────────────────────────────────
function decisionBrief(ctx) {
  const { task, blocks = [], blockers = [], sourceDocs, baseUrl } = ctx;
  const lines = [];

  lines.push(`# DECISION BRIEF: ${esc(task.title)}`);
  lines.push('');
  lines.push(`task #${task.id} | bucket decision | this is **not** a work prompt`);
  lines.push('');
  lines.push('## What is being decided');
  lines.push('');
  lines.push(esc(task.detail || task.title));
  lines.push('');

  const docs = citedDocs(task, sourceDocs);
  lines.push('## Options and cites');
  lines.push('');
  if (docs.length) {
    for (const d of docs) lines.push(`- ${d}`);
  } else {
    lines.push('- No source document cited on this task yet. Add one with `source_doc` so the call is made against');
    lines.push('  a document rather than a memory.');
  }
  lines.push('');

  lines.push('## What is waiting behind this');
  lines.push('');
  if (blocks.length) {
    for (const b of blocks) lines.push(`- ${fmtTask(b)} (${esc(b.status)}) cannot start until this is decided`);
    lines.push('');
    lines.push(`That is **${blocks.length}** ${blocks.length === 1 ? 'task' : 'tasks'} held by one call.`);
  } else {
    lines.push('- Nothing is currently recorded as blocked by this decision. If something is, add a dep so this');
    lines.push('  brief can say so out loud.');
  }
  if (blockers.length) {
    lines.push('');
    for (const b of blockers) lines.push(`- This decision itself is blocked by ${fmtTask(b)} (${esc(b.status)})`);
  }
  lines.push('');

  lines.push('## What deferring costs');
  lines.push('');
  if (task.cost_per_day) {
    lines.push(`- **$${Number(task.cost_per_day).toFixed(2)} per day**, every day this stays undecided.`);
  }
  if (task.due_date) lines.push(`- Due ${esc(task.due_date)}.`);
  if (task.bleeding) lines.push('- Someone is hitting this broken right now.');
  if (!task.cost_per_day && !task.due_date && !task.bleeding) {
    lines.push('- No dollar cost or date recorded. If deferring is genuinely free, this belongs in `someday`, not');
    lines.push('  in `decision`.');
  }
  lines.push('');

  lines.push('## Making the call');
  lines.push('');
  lines.push('Decide in the browser at ' + baseUrl + '/admin/command. An agent credential cannot close a');
  lines.push('decision task: recording the call is a 403 for anything but the cookie. Move it out of');
  lines.push('`decision` into a real bucket with the decision written into `detail`, and the tasks behind it');
  lines.push('become dispatchable.');
  lines.push('');
  return lines.join('\n');
}

function compilePrompt(ctx) {
  const isDecision = String(ctx.task.bucket || '').toLowerCase() === 'decision';
  return {
    kind: isDecision ? 'decision_brief' : 'work_prompt',
    task_id: ctx.task.id,
    routed_surface: ctx.routed.routed_surface,
    routed_model: ctx.routed.routed_model,
    routed_reason: ctx.routed.routed_reason,
    closes_manually: !!ctx.routed.closes_manually,
    prompt: isDecision ? decisionBrief(ctx) : workPrompt(ctx),
  };
}

module.exports = { compilePrompt, workPrompt, decisionBrief, citedDocs };

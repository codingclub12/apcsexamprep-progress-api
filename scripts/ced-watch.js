#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  What CHANGED on College Board's own pages since the last run.
//
//  WHY THIS EXISTS
//    Two of the five courses in this product are aimed at frameworks that are
//    not finished. AP Cybersecurity reached national launch in 2026-27 and AP
//    Networking is still in its third and final pilot until the 2027-28 launch,
//    so both CEDs can still be revised under content that is already published
//    and already sold. Finding that out from a customer is the expensive way.
//
//  WHY IT IS A DIFF AND NOT A REPORT
//    Same reason board-delta.js is a diff. A job that reprints the same sixteen
//    URLs every week is wallpaper inside a month, and an unread green tick is
//    the exact failure this system exists to catch. "Nothing changed" is one
//    line and is the honest answer nearly every week.
//
//  WHY IT IS NOT "SCAN THE INTERNET"
//    An open-ended crawl returns blog restatements of AP Central, late and
//    paraphrased, and buries the one line that mattered. The watch list is
//    first-party only and every URL in it was opened before it was added.
//
//  WHAT IT WRITES
//    docs/ced-snapshot/ only, and nothing else, anywhere. It does not touch the
//    ledger. Reading unattended and writing unattended are different risks, and
//    only the first one is being taken here, which is the same line
//    nightly-sweep.yml draws.
//
//  EXIT CODES  (the workflow branches on these)
//    0   nothing changed
//    10  something changed, or a source is unreachable. Read the report.
//    1   the run itself failed and compared nothing.
//
//  Usage:
//    node scripts/ced-watch.js              # fetch, compare, update snapshot
//    node scripts/ced-watch.js --dry-run    # compare, write nothing
//    node scripts/ced-watch.js --only csa-future-revisions
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
// Overridable so the fetch-normalize-diff machinery can be exercised against a
// reachable host without touching the real snapshot. The smoke test uses this.
const CONFIG = process.env.CED_SOURCES || path.join(ROOT, 'config', 'ced-sources.json');
const SNAP_DIR = process.env.CED_SNAPSHOT_DIR || path.join(ROOT, 'docs', 'ced-snapshot');
const INDEX = path.join(SNAP_DIR, 'index.json');

const TIMEOUT_MS = 30000;
const POLITE_DELAY_MS = 1500;   // sequential and unhurried. Sixteen pages once a
                                // week is not a crawl and must never look like one.
const MAX_DIFF_LINES = 40;      // per source, per direction

// A default UA of "node" gets a CDN block on a lot of .org properties, and a
// watcher that silently 403s every week is worse than no watcher. Overridable
// so a block can be worked around without editing code.
const UA = process.env.CED_WATCH_UA
  || 'apcsexamprep-ced-watch/1.0 (weekly change detection; +https://www.apcsexamprep.com)';

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const ONLY = (() => {
  const i = argv.indexOf('--only');
  return i >= 0 ? argv[i + 1] : null;
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── normalization ───────────────────────────────────────────────────────────
// The whole value of this script rests on this function. Hashing raw bytes
// would flag every source every week: AP Central serves rotating script nonces,
// build fingerprints, and analytics ids that mean nothing to a curriculum. A
// watcher that cries wolf weekly gets muted, and then a real CED revision lands
// silently. So: visible text only, with the known-volatile tokens erased.
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  hellip: '...', reg: '(R)', copy: '(c)', trade: '(TM)', deg: ' degrees ',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => (name in ENTITIES ? ENTITIES[name] : m));
}

function safeChar(code) {
  if (!Number.isFinite(code) || code < 9 || code > 0x10ffff) return '';
  try { return String.fromCodePoint(code); } catch { return ''; }
}

function normalizeHtml(html) {
  let s = html;

  // Whole elements whose contents are never prose. <script> is where the
  // rotating nonces live, so dropping it removes most of the false-positive
  // surface in one step.
  s = s.replace(/<(script|style|noscript|svg|template|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');

  // Block-level tags become line breaks so the stored text keeps the page's
  // shape. A page whose paragraphs all collapse onto one line produces a diff
  // that says "this one enormous line changed", which tells a reader nothing.
  s = s.replace(/<\/?(p|div|section|article|header|footer|nav|main|aside|ul|ol|li|dl|dt|dd|table|tr|td|th|h[1-6]|br|hr|figure|figcaption|blockquote)\b[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');

  s = decodeEntities(s);
  s = stripVolatile(s);

  const lines = s
    .split('\n')
    .map((line) => line.replace(/[ \t ​]+/g, ' ').trim())
    // Sub-2-character lines are punctuation debris from tag stripping, never
    // content, and they churn whenever markup is reflowed.
    .filter((line) => line.length >= 2);

  return lines.join('\n');
}

// Tokens that change on their own schedule and never carry curriculum meaning.
// Erased rather than removed so surrounding text keeps its shape.
function stripVolatile(s) {
  return s
    .replace(/\b[0-9a-f]{16,}\b/gi, '<hex>')                                  // build ids, nonces
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '<timestamp>')
    .replace(/([?&])(v|ver|version|cb|cachebust|nonce|_|t|ts|rnd)=[^\s&"']+/gi, '$1$2=<cachebust>');
}

// ── fetching ────────────────────────────────────────────────────────────────
async function fetchSource(src) {
  const res = await fetch(src.url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'User-Agent': UA,
      Accept: src.kind === 'pdf'
        ? 'application/pdf,*/*'
        : 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }

  const buf = Buffer.from(await res.arrayBuffer());

  if (src.kind === 'pdf') {
    // Deliberately no PDF parsing. It would mean a dependency, and the only
    // question worth asking of a CED PDF is "did it move, go read it". A
    // re-export with identical text would be a false positive here; on the one
    // document that can invalidate published course pages, that trade is right
    // way round.
    return {
      hash: sha256(buf),
      bytes: buf.length,
      text: null,
      last_modified: res.headers.get('last-modified') || null,
    };
  }

  const text = normalizeHtml(buf.toString('utf8'));

  // A page that normalizes to almost nothing is a bot-wall or an error page
  // dressed as a 200. Storing it would blow away a good baseline and report a
  // spectacular fake diff, so it is treated as unreachable instead.
  if (text.length < 500) {
    const err = new Error(`page returned ${text.length} chars of text, which reads as a block page or an error page served as 200`);
    err.status = 'THIN';
    throw err;
  }

  return { hash: sha256(Buffer.from(text)), bytes: buf.length, text, last_modified: null };
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ── diffing ─────────────────────────────────────────────────────────────────
// Multiset difference, not a real diff. Reordering a page's sections is noise;
// a changed sentence is not. Comparing line multisets ignores the first and
// catches the second, in a few lines and with no dependency.
function lineDelta(before, after) {
  const count = (text) => {
    const m = new Map();
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      m.set(line, (m.get(line) || 0) + 1);
    }
    return m;
  };
  const a = count(before);
  const b = count(after);
  const added = [];
  const removed = [];
  for (const [line, n] of b) {
    const extra = n - (a.get(line) || 0);
    for (let i = 0; i < extra; i++) added.push(line);
  }
  for (const [line, n] of a) {
    const extra = n - (b.get(line) || 0);
    for (let i = 0; i < extra; i++) removed.push(line);
  }
  return { added, removed };
}

// ── snapshot io ─────────────────────────────────────────────────────────────
function readIndex() {
  if (!fs.existsSync(INDEX)) return null;
  try {
    return JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  } catch (e) {
    // A corrupt baseline must not be silently treated as "no baseline", because
    // that path reports zero changes and exits green.
    throw new Error(`${INDEX} exists but is not readable JSON: ${e.message}`);
  }
}

const snapPath = (id) => path.join(SNAP_DIR, `${id}.txt`);

// Trimmed on the way back in. The stored file ends with a newline, so a naive
// split produces one trailing empty line that the freshly normalized text does
// not have, and every single diff would then open with a phantom removed blank
// line. Cosmetic, but this report only works if a reader trusts every line in it.
function readSnapshotText(id) {
  const p = snapPath(id);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\s+$/, '') : null;
}

// ── report ──────────────────────────────────────────────────────────────────
function fence(lines, marker) {
  const shown = lines.slice(0, MAX_DIFF_LINES);
  const out = shown.map((l) => `${marker} ${l.length > 300 ? `${l.slice(0, 300)}...` : l}`);
  if (lines.length > shown.length) out.push(`... and ${lines.length - shown.length} more`);
  return out.join('\n');
}

function main() {
  if (!fs.existsSync(CONFIG)) {
    console.error(`::error title=No watch list::${CONFIG} is missing. Nothing was checked.`);
    process.exit(1);
  }
  const { sources } = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const watched = ONLY ? sources.filter((s) => s.id === ONLY) : sources;
  if (!watched.length) {
    console.error(`::error title=No such source::--only ${ONLY} matched nothing in the watch list.`);
    process.exit(1);
  }

  const previous = readIndex();
  const prevById = new Map((previous?.sources || []).map((s) => [s.id, s]));

  return run(watched, previous, prevById);
}

async function run(watched, previous, prevById) {
  fs.mkdirSync(SNAP_DIR, { recursive: true });

  const results = [];
  for (const src of watched) {
    try {
      const got = await fetchSource(src);
      results.push({ src, ok: true, ...got });
    } catch (e) {
      results.push({ src, ok: false, error: e.message, status: e.status || null });
    }
    await sleep(POLITE_DELAY_MS);
  }

  // Every source failing is a network or credential problem, not sixteen
  // simultaneous College Board outages. Reporting it as "16 sources changed"
  // would be a lie, and reporting it as "nothing changed" would be worse.
  const reachable = results.filter((r) => r.ok);
  if (!reachable.length) {
    console.log('### CED watch: NOTHING WAS READ\n');
    console.log('Every source failed. That is an egress or user-agent problem here, not simultaneous outages at College Board.\n');
    for (const r of results) console.log(`- **${r.src.label}**: ${r.error}`);
    console.log('\nIf this runs in a Claude Code session rather than on an Actions runner, `apcentral.collegeboard.org` must be in the environment\'s Custom allowed domains or every fetch returns 403.');
    console.error('::error title=CED watch read nothing::All sources failed. Nothing was compared.');
    process.exit(1);
  }

  const changed = [];
  const unreachable = [];
  const added = [];
  const unchanged = [];

  for (const r of results) {
    const prev = prevById.get(r.src.id) || null;

    if (!r.ok) {
      unreachable.push(r);
      continue;
    }
    if (!prev) {
      added.push(r);
      continue;
    }
    if (prev.hash === r.hash) {
      unchanged.push(r);
      continue;
    }
    const before = r.src.kind === 'html' ? readSnapshotText(r.src.id) : null;
    const delta = before && r.text ? lineDelta(before, r.text) : null;
    changed.push({ ...r, prev, delta });
  }

  // ── write the new snapshot ────────────────────────────────────────────────
  // ONLY from sources that actually answered. An unreachable source keeps its
  // previous entry untouched: overwriting a good baseline with a failed fetch
  // would make next week report a phantom "it all came back", which is the same
  // shape of bug as caching the wrong filename in nightly-sweep.yml.
  if (!DRY_RUN) {
    const nextSources = [];
    for (const r of results) {
      if (r.ok) {
        nextSources.push({
          id: r.src.id,
          label: r.src.label,
          course: r.src.course,
          kind: r.src.kind,
          critical: !!r.src.critical,
          url: r.src.url,
          hash: r.hash,
          bytes: r.bytes,
          last_modified: r.last_modified || null,
        });
        if (r.text !== null) fs.writeFileSync(snapPath(r.src.id), `${r.text}\n`);
      } else if (prevById.has(r.src.id)) {
        nextSources.push(prevById.get(r.src.id));
      }
    }
    // checked_at is stored but is NOT part of any hash, so a run that changed
    // nothing still produces an identical set of .txt files and an index whose
    // only delta is the date. That keeps the PR diff readable.
    fs.writeFileSync(INDEX, `${JSON.stringify({
      checked_at: new Date().toISOString().slice(0, 10),
      note: 'Written by scripts/ced-watch.js. Do not hand-edit: the next run overwrites it.',
      sources: nextSources.sort((a, b) => a.id.localeCompare(b.id)),
    }, null, 2)}\n`);
  }

  // ── the report ────────────────────────────────────────────────────────────
  const out = [];
  const eventful = changed.length + unreachable.length + (previous ? added.length : 0);

  if (!previous) {
    out.push('### CED watch: BASELINE CREATED');
    out.push('');
    out.push(`First run, so there was nothing to compare against. Recorded ${reachable.length} of ${results.length} sources. Real change detection starts next week.`);
  } else if (eventful === 0) {
    out.push(`### CED watch: nothing changed (${unchanged.length} sources)`);
  } else {
    out.push('### CED watch: SOMETHING CHANGED');
  }
  out.push('');

  const bySeverity = [...changed].sort((a, b) => (b.src.critical ? 1 : 0) - (a.src.critical ? 1 : 0));
  for (const c of bySeverity) {
    out.push(`#### ${c.src.critical ? 'CRITICAL: ' : ''}${c.src.label}`);
    out.push('');
    out.push(`${c.src.url}`);
    out.push('');
    out.push(`_${c.src.why}_`);
    out.push('');
    if (c.src.kind === 'pdf') {
      out.push(`The file changed. sha256 \`${c.prev.hash.slice(0, 12)}\` to \`${c.hash.slice(0, 12)}\`, ${c.prev.bytes} bytes to ${c.bytes}.`);
      out.push('');
      out.push('PDFs are not parsed here. Open it and compare against the published course pages.');
    } else if (c.delta) {
      out.push(`${c.delta.added.length} lines added, ${c.delta.removed.length} removed.`);
      out.push('');
      out.push('```diff');
      if (c.delta.removed.length) out.push(fence(c.delta.removed, '-'));
      if (c.delta.added.length) out.push(fence(c.delta.added, '+'));
      out.push('```');
    } else {
      out.push('The content hash changed but no previous text was stored, so no line diff is available.');
    }
    out.push('');
  }

  if (previous && added.length) {
    out.push('#### New sources added to the watch list');
    out.push('');
    for (const a of added) out.push(`- **${a.src.label}** (${a.src.url}) recorded for the first time.`);
    out.push('');
  }

  if (unreachable.length) {
    out.push('#### Unreachable this run');
    out.push('');
    out.push('These kept their previous baseline rather than being overwritten with a failure.');
    out.push('');
    for (const u of unreachable) out.push(`- **${u.src.label}**: ${u.error} (${u.src.url})`);
    out.push('');
  }

  if (previous && eventful === 0) {
    out.push(`All ${unchanged.length} first-party College Board sources read clean against last week. No action.`);
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push('**Nothing here was written to the ledger.** This run reads College Board and updates `docs/ced-snapshot/` only. If a change matters, file it on the board yourself: `apcs` writes are a deliberate human step.');

  console.log(out.join('\n'));
  process.exit(eventful > 0 ? 10 : 0);
}

Promise.resolve()
  .then(main)
  .catch((e) => {
    console.error(`::error title=CED watch failed::${e.message}`);
    console.error(e.stack);
    process.exit(1);
  });

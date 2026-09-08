'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  What is actually in the Drive bundles a teacher paid for.
//
//  WHY THIS EXISTS
//  The Unit 1 bundle was repaired four times on 2026-09-07 and the repairs sat
//  in a zip. Whether they had reached Drive was answerable only by a human
//  opening folders, and on 2026-09-08 that produced a wrong answer twice in
//  ten minutes: the same lesson exists in two separately shared trees, one
//  corrected and one still holding exercises with no code, and nothing anywhere
//  said which was which.
//
//  So this is the CED watcher's job pointed at our own product: read what is
//  live, hash it, diff it against a committed snapshot, and let the board carry
//  the answer instead of somebody's memory.
//
//  WHY IT NEEDS NO CREDENTIAL
//  Both bundles are shared "anyone with the link". Measured 2026-09-08:
//    embeddedfolderview?id=<folder>   200, and names every child with its id
//    uc?export=download&id=<file>     200, byte-exact against the Drive API
//  So the watcher reads the bundle exactly as a customer does, which is also
//  the right thing to be checking. A service account would check a view no
//  buyer ever sees.
//
//  THE PARSE IS THE FRAGILE PART, AND IT FAILS LOUDLY
//  embeddedfolderview is undocumented and its markup can change under us. An
//  empty folder and a folder we could not parse look identical if you only
//  count entries, and that is the exact shape of bug this repo keeps finding:
//  a check satisfied by something other than what it is checking. So a folder
//  yielding zero entries is an ERROR unless the page also carries the marker
//  Google renders for a genuinely empty folder.
//
//  EXIT CODES, same contract as ced-watch.js
//    0   read everything, nothing changed
//    10  read everything, the snapshot changed (the workflow opens a PR)
//    1   read nothing, or a parse failed. A green tick on a run that compared
//        nothing is worse than no run at all.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'drive-bundles.json');
const SNAPDIR = path.join(ROOT, 'docs', 'drive-snapshot');

const FOLDER_VIEW = (id) => `https://drive.google.com/embeddedfolderview?id=${id}#list`;

//  drive.usercontent.google.com with confirm=t, NOT drive.google.com/uc.
//
//  The first real run proved why. uc?export=download served Google's "Virus
//  scan warning" page instead of Unit_1_Test_FRQ_sandbox.js, 2443 bytes of HTML
//  where 3519 bytes of JavaScript should be, because Drive will not scan a .js
//  and asks a human to confirm. This endpoint returns the file, and it is
//  byte-exact against the Drive API for ordinary documents too (38177 for a
//  .docx, 75191 for a .pptx), so it is one path for every file rather than a
//  special case for the awkward ones.
const FILE_DL = (id) => `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;

//  Google rate-limits a datacenter IP walking a thousand files. Run 1 took a
//  503 after 33 downloads and gave up, which is the right instinct and the
//  wrong threshold: a transient 503 is not a bundle that cannot be read. Retry
//  the retryable statuses, and let anything else fail immediately.
//
//  Five rather than four, because DOWNLOAD_LIMIT below asks Google for six
//  files at a time instead of one. Backoff is 1s, 2s, 4s, 8s, 16s.
const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRIES = 5;

//  How many files to download at once.
//
//  Run 2 walked both bundles serially in 19m07s against the job's 30 minute
//  cap, because a bundle is ~960 downloads and each one is about a second of
//  waiting on Google. Eleven minutes of margin on a weekly job whose runtime is
//  set by somebody else's latency is thin: a slow Monday spends it, and the run
//  is then CANCELLED rather than failed, which is the shape that reads as
//  nothing being wrong. The same thing happened to the offline suite on
//  2026-09-03 and the pull request was simply unmergeable with nothing red.
//
//  Six rather than twenty. The limit here is Google's patience, not ours: run 1
//  took a 503 after 33 downloads at a concurrency of ONE, so the retry budget
//  above is doing the real work either way and there is nothing to gain by
//  making it work harder.
const DOWNLOAD_LIMIT = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Google renders this when a shared folder really has no children. Its presence
// is what separates "empty" from "we could not read this".
const EMPTY_MARKERS = ['flip-empty-state', 'There are no files', 'no files in this folder'];

//  Each entry carries the href that classifies it, so the class is read off the
//  entry rather than inferred by scanning the page:
//
//    drive.google.com/drive/folders/<id>   a folder, recurse
//    drive.google.com/file/d/<id>          an uploaded file, download and hash
//    docs.google.com/<kind>/d/<id>         a GOOGLE-NATIVE doc, presence only
//
//  Native files are deliberately not hashed. There are no stored bytes to hash:
//  every export re-renders, so the digest moves on runs where nothing changed,
//  and a watcher that cries every week is one nobody reads. 152 native Slides
//  live under "AP CSA Slides (converted)".
const ENTRY = /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]*)<\/div>/g;

function classify(href) {
  if (href.includes('drive.google.com/drive/folders/')) return 'folder';
  if (href.includes('drive.google.com/file/d/')) return 'file';
  if (href.includes('docs.google.com/')) return 'native';
  return 'unknown';
}

async function get(url, asBuffer) {
  let last;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt) await sleep(500 * 2 ** attempt);
    let r;
    try {
      r = await fetch(url, { redirect: 'follow' });
    } catch (e) {
      last = e;
      continue;
    }
    if (r.ok) return asBuffer ? Buffer.from(await r.arrayBuffer()) : r.text();
    last = new Error(`${r.status} ${r.statusText} for ${url}`);
    if (!RETRY_STATUS.has(r.status)) throw last;
  }
  throw new Error(`${last.message} (gave up after ${RETRIES + 1} attempts)`);
}

async function listFolder(id, label) {
  const html = await get(FOLDER_VIEW(id), false);
  const out = [];
  let m;
  ENTRY.lastIndex = 0;
  while ((m = ENTRY.exec(html)) !== null) {
    const kind = classify(m[2]);
    if (kind === 'unknown') {
      throw new Error(`${label}: cannot classify ${decodeEntities(m[3])} from href ${m[2]}`);
    }
    out.push({ id: m[1], name: decodeEntities(m[3]), kind });
  }
  if (!out.length && !EMPTY_MARKERS.some((k) => html.includes(k))) {
    throw new Error(`parsed 0 entries from ${label} (${id}) and the page does not look empty. `
      + `The markup may have changed; ${html.length} bytes read.`);
  }
  return out;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

//  Run up to `limit` of `worker` at a time, and stop handing out work the
//  moment one of them throws. Fail-fast matters here: an unreadable bundle is
//  already a failed run, and spending another minute downloading the rest of it
//  only delays the report.
async function pool(items, limit, worker) {
  let cursor = 0;
  let stop = false;
  const runners = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    runners.push((async () => {
      for (;;) {
        if (stop) return;
        const idx = cursor++;
        if (idx >= items.length) return;
        try {
          await worker(items[idx], idx);
        } catch (e) {
          stop = true;
          throw e;
        }
      }
    })());
  }
  await Promise.all(runners);
}

//  Download one file, prove it is a file, and record its digest.
async function hashInto(job, files) {
  const buf = await get(FILE_DL(job.id), true);
  //  A download that comes back as a web page is Google refusing, not a
  //  document. Hashing it would record a stable-looking digest for a file
  //  nobody can open, which is the exact failure this watcher exists to
  //  catch, so it is fatal rather than quiet.
  //
  //  This is not hypothetical. It fired on the first real run, on the one
  //  .js file in the preview bundle, and it is the reason FILE_DL above
  //  points at usercontent rather than uc.
  if (buf.slice(0, 15).toString('latin1').trim().toLowerCase().startsWith('<!doctype html')
    || buf.slice(0, 6).toString('latin1').toLowerCase() === '<html>') {
    throw new Error(`${job.path}: download returned HTML, not a document (${buf.length} bytes)`);
  }
  files[job.path] = {
    id: job.id,
    bytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  };
  process.stderr.write('.');
}

//  Walking is what discovers the tree, so it stays serial and depth-first: each
//  folder listing tells us what to ask for next. Downloading is not like that.
//  No file's bytes depend on any other file's, so the downloads are collected
//  here and run together afterwards by hashPending().
async function walk(id, label, prefix, files, opts, pending) {
  const entries = await listFolder(id, label);
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    const p = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.kind === 'folder') {
      await walk(e.id, p, p, files, opts, pending);
    } else if (e.kind === 'native') {
      files[p] = { id: e.id, native: true };
    } else if (opts.hash) {
      pending.push({ path: p, id: e.id });
    } else {
      files[p] = { id: e.id };
    }
  }
}

async function hashPending(pending, files) {
  await pool(pending, DOWNLOAD_LIMIT, (job) => hashInto(job, files));
}

//  Key order is not information about the bundle, and once downloads run
//  concurrently it is COMPLETION order, which reshuffles every week. Written
//  out as-is, the snapshot file would change on every run while its contents
//  were identical, the workflow would open a "a teacher bundle changed" pull
//  request every Monday, and the report inside it would say byte-identical.
//  A watcher that cries every week is a watcher nobody reads.
function sortFiles(files) {
  const out = {};
  for (const k of Object.keys(files).sort()) out[k] = files[k];
  return out;
}

function loadSnapshot(slug) {
  const p = path.join(SNAPDIR, `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function diff(before, after) {
  const a = new Set(Object.keys(before ? before.files : {}));
  const b = new Set(Object.keys(after.files));
  const added = [...b].filter((k) => !a.has(k)).sort();
  const removed = [...a].filter((k) => !b.has(k)).sort();
  const changed = [...b].filter((k) => a.has(k)
    && before.files[k].sha256 && after.files[k].sha256
    && before.files[k].sha256 !== after.files[k].sha256).sort();
  //  A handout converted to a Google Doc keeps its name and loses its digest,
  //  so `changed` cannot see it: that test needs a sha256 on BOTH sides. It is
  //  a real change to what a teacher downloads, and without this it would be
  //  invisible to the diff and therefore to the write gate below.
  const retyped = [...b].filter((k) => a.has(k)
    && Boolean(before.files[k].native) !== Boolean(after.files[k].native)).sort();
  return { added, removed, changed, retyped };
}

//  Did anything about the BUNDLE move? Deliberately not "did the file we write
//  differ", which is the question that made this watcher cry wolf.
function bundleMoved(d) {
  return Boolean(d.added.length || d.removed.length || d.changed.length || d.retyped.length);
}

async function main() {
  const argv = process.argv.slice(2);
  const listOnly = argv.includes('--list-only');
  const only = (argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];

  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const bundles = cfg.bundles.filter((b) => !only || b.slug === only);
  if (!bundles.length) {
    process.stderr.write('no bundles matched\n');
    return 1;
  }

  fs.mkdirSync(SNAPDIR, { recursive: true });
  const report = [];
  let read = 0;
  let dirty = false;
  let failed = 0;

  for (const b of bundles) {
    let files = {};
    const pending = [];
    try {
      await walk(b.folder_id, b.name, '', files, { hash: !listOnly }, pending);
      await hashPending(pending, files);
      process.stderr.write('\n');
    } catch (e) {
      failed += 1;
      report.push(`### ${b.name}\n\nUNREADABLE: ${e.message}\n`);
      process.stderr.write(`\n${b.slug}: ${e.message}\n`);
      continue;
    }
    read += 1;

    const after = {
      slug: b.slug,
      name: b.name,
      folder_id: b.folder_id,
      //  The date this CONTENT was first seen, not the date we last looked.
      //  Those are different questions and only one of them belongs in a file
      //  that is diffed: a "last looked" stamp rewrites itself every run, so
      //  the file is dirty every week whatever the bundle did, and the workflow
      //  opens "a teacher bundle changed" over a report saying byte-identical.
      //  That is not hypothetical. ced-watch does exactly this, and its PR #591
      //  sat open saying "nothing changed (15 sources)" in its own body.
      //  When we last looked is already recorded where it costs nothing: the
      //  job summary, and last_seen_at on the board's drive/drive-watch check.
      captured: new Date().toISOString().slice(0, 10),
      file_count: Object.keys(files).length,
      files: sortFiles(files),
    };
    const before = loadSnapshot(b.slug);
    const d = diff(before, after);
    if (before && !bundleMoved(d)) after.captured = before.captured;

    if (listOnly) {
      report.push(`### ${b.name}\n\n${after.file_count} files.\n`);
      continue;
    }

    if (!before) {
      report.push(`### ${b.name}\n\nFirst capture: ${after.file_count} files. Nothing to compare yet.\n`);
      dirty = true;
    } else if (bundleMoved(d)) {
      dirty = true;
      const lines = [`### ${b.name}`, ''];
      if (d.changed.length) {
        lines.push(`**${d.changed.length} changed**`, '');
        d.changed.slice(0, 40).forEach((k) => lines.push(`- ${k}`));
        lines.push('');
      }
      if (d.added.length) {
        lines.push(`**${d.added.length} added**`, '');
        d.added.slice(0, 40).forEach((k) => lines.push(`- ${k}`));
        lines.push('');
      }
      if (d.removed.length) {
        lines.push(`**${d.removed.length} removed**`, '');
        d.removed.slice(0, 40).forEach((k) => lines.push(`- ${k}`));
        lines.push('');
      }
      if (d.retyped.length) {
        lines.push(`**${d.retyped.length} converted between an uploaded file and a Google doc**`, '');
        d.retyped.slice(0, 40).forEach((k) => lines.push(`- ${k}`));
        lines.push('');
      }
      report.push(lines.join('\n'));
    } else {
      report.push(`### ${b.name}\n\nByte-identical to the last capture. ${after.file_count} files.\n`);
    }

    //  Do not touch the file when the bundle did not move. Rewriting identical
    //  content and trusting the bytes to come out the same is a check satisfied
    //  by something other than what it is checking; the workflow keys its pull
    //  request on `git status`, so serialization drift alone would open one.
    if (!before || bundleMoved(d)) {
      fs.writeFileSync(path.join(SNAPDIR, `${b.slug}.json`),
        JSON.stringify(after, null, 1) + '\n');
    }
  }

  process.stdout.write(`# Drive bundle watch\n\n${report.join('\n')}\n`);

  if (!read) return 1;
  if (failed) return 1;
  return dirty ? 10 : 0;
}

//  Only run when invoked directly. Requiring this file used to START A FULL
//  WALK, so the suite could not reach classify() without downloading a thousand
//  files, and `node -e "require(...)"` as a syntax check kicked off a real run.
if (require.main === module) {
  main().then((c) => process.exit(c)).catch((e) => {
    process.stderr.write(String(e && e.stack ? e.stack : e) + '\n');
    process.exit(1);
  });
}

module.exports = {
  classify, listFolder, decodeEntities, diff, EMPTY_MARKERS, ENTRY,
  pool, sortFiles, DOWNLOAD_LIMIT, bundleMoved,
};

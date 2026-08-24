'use strict';
// -----------------------------------------------------------------------------
//  FETCH THE CSP EXERCISE ANSWER KEYS INTO A LOCAL CACHE.
//
//  WHY THIS EXISTS
//  A check question on an exercise page is only trustworthy because it cites the
//  sentence in the teacher answer key it was derived from, and because that
//  citation is verified against the real document. Verifying needs the document.
//
//  WHAT IT DOES NOT DO
//  It does not commit anything. The keys are the answers to the whole course and
//  they stay out of the repo, exactly as the pilot decided: `seed/
//  csp-exercise-source.json` is parsed from STUDENT documents only. This writes
//  to a gitignored cache directory so an author and the verifier can read them
//  locally and nothing reaches a public repo.
//
//  WHERE THE PATHS COME FROM
//  `seed/csp-teacher-files.json`, which lists all 70 exercise KEY documents with
//  their CDN paths, two per topic across the 35 topics. Never guessed from a
//  filename pattern: a guessed path that 404s is indistinguishable from a key
//  that does not exist, and both would silently skip verification.
//
//  A NOTE ON WHAT THIS DEMONSTRATES
//  These files download over plain HTTPS with no credential. That is the
//  exposure `docs/runs/2026-08-18-claude-code-csp-exercise-mirror-pilot.md`
//  flagged as its most urgent open item, and it is still open. This script
//  relies on it, which is a reason to fix it, not a reason to pretend the
//  reliance is not here: when the CDN is gated, this script needs the same
//  credential the gate issues, and it will fail loudly rather than quietly
//  verifying nothing.
//
//  Run:
//    node scripts/fetch-csp-keys.js                 all 70
//    node scripts/fetch-csp-keys.js --topic 1.2     one topic's two keys
//    node scripts/fetch-csp-keys.js --big-idea 1    one Big Idea
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(ROOT, '.keys-cache');
const TEACHER_FILES = require('../seed/csp-teacher-files.json');
const BASE = 'https://apcsexamprep.com';

// Every exercise KEY, keyed by the handle of the page it belongs to, so a
// citation naming a document can be checked against the document that page's
// questions were actually written from.
function keyIndex() {
  const out = new Map();
  for (const row of Object.values(TEACHER_FILES)) {
    if (row.course !== 'ap-csp') continue;
    const m = /^Exercise (\d)\s*[^A-Za-z0-9]*\s*KEY$/.exec(String(row.label).trim());
    if (!m) continue;
    const handle = `ap-csp-topic-${String(row.topic).replace('.', '-')}-exercise-${m[1]}`;
    out.set(handle, { path: row.path, topic: row.topic, exercise: Number(m[1]),
      doc: row.path.split('/').pop() });
  }
  return out;
}

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'accept-encoding': 'gzip' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirects > 4) return reject(new Error('too many redirects'));
        res.resume();
        return resolve(get(new URL(res.headers.location, url).toString(), redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      const stream = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

// A .docx is a zip; the text lives in word/document.xml. Paragraph breaks are
// preserved because a citation is a sentence and sentences do not span
// paragraphs, so collapsing them would let a citation match across a boundary
// that does not exist in the document.
function docxText(buf) {
  const AdmZip = tryAdmZip();
  let xml;
  if (AdmZip) {
    xml = new AdmZip(buf).readAsText('word/document.xml');
  } else {
    xml = inflateDocx(buf);
  }
  if (!xml) throw new Error('could not read word/document.xml');
  const withBreaks = xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab[^>]*\/>/g, ' ')
    .replace(/<w:br[^>]*\/>/g, '\n');
  const text = withBreaks.replace(/<[^>]+>/g, '');
  return decodeEntities(text)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function tryAdmZip() {
  try { return require('adm-zip'); } catch (e) { return null; }
}

// Minimal zip reader for the one member we need, so this has no dependency the
// repo does not already carry.
function inflateDocx(buf) {
  const name = Buffer.from('word/document.xml');
  let at = -1;
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf.readUInt32LE(i) === 0x04034b50) {
      const nameLen = buf.readUInt16LE(i + 26);
      const extraLen = buf.readUInt16LE(i + 28);
      const fname = buf.slice(i + 30, i + 30 + nameLen);
      if (fname.equals(name)) { at = i;
        const method = buf.readUInt16LE(i + 8);
        let size = buf.readUInt32LE(i + 18);
        const start = i + 30 + nameLen + extraLen;
        // A streamed zip writes sizes in the trailing data descriptor, leaving
        // zero here. Fall back to inflating to the end of the buffer.
        const body = size ? buf.slice(start, start + size) : buf.slice(start);
        try {
          return method === 0 ? body.toString('utf8') : zlib.inflateRawSync(body).toString('utf8');
        } catch (e) {
          if (!size) {
            // inflateRawSync stops at the stream end even with trailing bytes on
            // most inputs; if it did not, give up loudly rather than half a doc.
            throw new Error('the document.xml stream could not be inflated');
          }
          throw e;
        }
      }
    }
  }
  if (at === -1) throw new Error('word/document.xml is not in this file');
  return null;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function cachePathFor(handle) { return path.join(CACHE, handle + '.txt'); }

// Read a cached key, or null. The verifier uses this and never fetches, so a
// verification run is offline and deterministic.
function readKey(handle) {
  const p = cachePathFor(handle);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

async function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  const onlyTopic = arg('--topic');
  const onlyBi = arg('--big-idea');

  const index = keyIndex();
  let wanted = [...index.entries()];
  if (onlyTopic) wanted = wanted.filter(([, v]) => v.topic === onlyTopic);
  if (onlyBi) wanted = wanted.filter(([, v]) => String(v.topic).split('.')[0] === String(onlyBi));

  if (!wanted.length) {
    console.error('\n  no keys matched that filter\n');
    process.exit(1);
  }

  fs.mkdirSync(CACHE, { recursive: true });
  let ok = 0;
  const failed = [];
  for (const [handle, meta] of wanted) {
    if (fs.existsSync(cachePathFor(handle))) { ok++; continue; }
    try {
      const buf = await get(BASE + meta.path);
      const text = docxText(buf);
      if (text.length < 400) throw new Error(`only ${text.length} characters of text`);
      fs.writeFileSync(cachePathFor(handle), text);
      ok++;
    } catch (e) {
      failed.push(`${handle} (${meta.doc}): ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log('');
  console.log(`    ${String(ok).padStart(3)}  keys cached in .keys-cache (gitignored)`);
  if (failed.length) {
    console.log(`    ${String(failed.length).padStart(3)}  FAILED`);
    for (const f of failed.slice(0, 10)) console.log('        ' + f);
  }
  console.log('');
  if (failed.length) process.exit(1);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { keyIndex, readKey, docxText, CACHE, cachePathFor };

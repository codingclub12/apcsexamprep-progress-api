#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Prove that converted slide decks are ACTUALLY shared, by fetching their
//  embed URLs with no Google credentials at all.
//
//    node scripts/verify-slide-sharing.js ap-cybersecurity
//    node scripts/verify-slide-sharing.js ap-csp --limit 20
//
//  WHY THIS EXISTS. The conversion script writes a sheet, and the sheet says
//  every deck converted OK. That is the script reporting on itself. During the
//  AP CSP build a pasted log claimed "converted OK: 224" one minute after
//  "nothing recorded yet", which cannot be true. A deck that converted but did
//  not get shared is invisible to every check upstream of this one: the id is
//  real, the config is well-formed, the route hands it out correctly, and the
//  teacher gets an iframe that 404s.
//
//  An unshared file 404s to an anonymous fetch no matter what a sheet claims.
//  That is the whole test.
//
//  THE TWO CONTROLS ARE THE POINT. A bare "everything returned 200" is not
//  evidence, because a permissive proxy could return 200 for anything; and a
//  bare "everything 404ed" is not evidence of a sharing failure either,
//  because a blocked egress looks identical. So every run first checks:
//
//    positive control  a deck known to be shared MUST return 200
//    negative control  a syntactically valid but nonexistent id MUST NOT
//
//  If either control fails, the run ABORTS without reporting on the real
//  decks, because at that point the instrument is untrustworthy and its output
//  would be worse than no output.
//
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const path = require('path');

const CONFIGS = {
  'ap-csp': '../config/csp-slide-embeds',
  'ap-cybersecurity': '../config/cyber-slide-embeds',
};

// A real AP CSP deck, shared "anyone with the link" since the 2026-08-24
// conversion. Used only as the positive control. If CSP is ever unshared this
// will start failing loudly, which is itself worth knowing.
const POSITIVE_CONTROL = '1q8iSDsi5gC7WWjBq8L7wK2zGee3ULI_eIyXjAMbFaO0';
// Correct shape, no such file.
const NEGATIVE_CONTROL = '1zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';

const embedUrl = (id) =>
  `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false`;

const TIMEOUT_MS = 15000;
const CONCURRENCY = 6;   // polite; this is someone else's service

async function status(id) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    // GET rather than HEAD: Google answers HEAD inconsistently for this path.
    const r = await fetch(embedUrl(id), { redirect: 'follow', signal: ctl.signal });
    return r.status;
  } catch (e) {
    return e.name === 'AbortError' ? 'timeout' : 'error:' + (e.code || e.message);
  } finally {
    clearTimeout(t);
  }
}

async function mapLimited(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const course = args.find((a) => !a.startsWith('--')) || 'ap-cybersecurity';
  const limArg = args.indexOf('--limit');
  const limit = limArg > -1 ? parseInt(args[limArg + 1], 10) : Infinity;

  if (!CONFIGS[course]) {
    console.error(`unknown course "${course}". known: ${Object.keys(CONFIGS).join(', ')}`);
    process.exit(2);
  }

  console.log(`\nSLIDE SHARING VERIFICATION: ${course}\n`);

  // ---- controls first; abort if the instrument is not trustworthy ---------
  const [pos, neg] = await Promise.all([status(POSITIVE_CONTROL), status(NEGATIVE_CONTROL)]);
  console.log('controls');
  console.log(`  known-shared deck   -> ${pos}   ${pos === 200 ? 'ok' : 'EXPECTED 200'}`);
  console.log(`  nonexistent file id -> ${neg}   ${neg === 404 ? 'ok' : 'EXPECTED 404'}`);
  if (pos !== 200 || neg !== 404) {
    console.error('\nABORTING. The controls did not behave, so this run cannot tell a');
    console.error('sharing failure from a network or proxy problem. Nothing below would');
    console.error('mean anything, so nothing below is reported.');
    process.exit(1);
  }

  // ---- the real decks -----------------------------------------------------
  const embeds = require(CONFIGS[course]);
  const manifest = require(course === 'ap-csp'
    ? '../config/csp-slide-manifest'
    : '../config/cyber-slide-manifest');

  const keys = [];
  for (const lessonId of manifest.LESSON_IDS) {
    for (let day = 1; day <= manifest.dayCount(lessonId); day++) {
      for (const variant of manifest.VARIANT_KEYS) {
        const tracks = manifest.TRACK_KEYS.length ? manifest.TRACK_KEYS : [null];
        for (const track of tracks) {
          const id = track
            ? embeds.slideId(lessonId, day, variant, track)
            : embeds.slideId(lessonId, day, variant);
          if (id) keys.push({ label: `${lessonId} day${day} ${variant}${track ? ' ' + track : ''}`, id });
        }
      }
    }
  }

  console.log(`\ndecks with an id in the config: ${keys.length}` +
              (embeds.GENERATED_AT ? `   (generated ${embeds.GENERATED_AT})` : '   (never generated)'));

  if (!keys.length) {
    console.log('\nNothing to verify. The conversion has not run for this course yet.');
    console.log('That is a valid state, not a failure: the gate reports zero decks');
    console.log('and the theme shows its "still being prepared" panel.');
    return;
  }

  const subject = keys.slice(0, limit);
  if (subject.length < keys.length) {
    console.log(`checking the first ${subject.length} of them (--limit)`);
  }

  const results = await mapLimited(subject, CONCURRENCY, async (k) => ({ ...k, status: await status(k.id) }));
  const bad = results.filter((r) => r.status !== 200);

  console.log(`\nreachable anonymously : ${results.length - bad.length}/${results.length}`);
  if (bad.length) {
    console.log(`\nNOT REACHABLE (${bad.length}). These decks exist in the config but an`);
    console.log('anonymous fetch cannot open them, so a teacher would get a dead iframe:');
    for (const b of bad.slice(0, 25)) console.log(`  ${b.status}  ${b.label}  ${b.id}`);
    if (bad.length > 25) console.log(`  ...and ${bad.length - 25} more`);
    console.log('\nMost likely the conversion created the file but did not set sharing to');
    console.log('"anyone with the link can view". Re-run the Apps Script; it is idempotent.');
    process.exit(1);
  }

  console.log('\nEvery deck in the config is reachable without credentials.');
  console.log('That is the sharing check. It does NOT prove the slides have content;');
  console.log('a deck that converted to blank slides passes this and every structural');
  console.log('check in the pipeline. Open one and look before calling it done.');
}

main().catch((e) => { console.error(e); process.exit(1); });

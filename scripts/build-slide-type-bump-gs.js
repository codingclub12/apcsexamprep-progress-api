#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Fill the deck table inside scripts/slide-type-bump.gs.
//
//  WHY A GENERATOR AND NOT A HAND-WRITTEN LIST. There are 294 decks and a
//  mistyped file id is not a syntax error: it is an Apps Script run that
//  silently edits the wrong presentation, or skips one and reports success.
//  The ids already live in this repo, so the list is derived rather than
//  retyped.
//
//  WHY IT ENUMERATES THROUGH THE MANIFESTS rather than reading the SLIDE_IDS
//  maps out of the embed modules. The maps are private to those files; the
//  public surface is slideId(lesson, day, variant[, track]). Walking the
//  manifest and asking for each deck gives exactly the set routes/slides.js
//  can hand to an entitled teacher, which is the set that should be touched
//  and no more. It also means a deck the conversion never produced is absent
//  here for the same reason it is absent from the gate.
//
//  WHY IT REWRITES A BLOCK rather than emitting the whole file. The Apps
//  Script is meant to be read before it is run, and a 300 line data table
//  wrapped in a generator template is not readable. The logic is hand-written
//  and reviewable; only the table between the markers is generated.
//
//  Usage:
//    node scripts/build-slide-type-bump-gs.js          # rewrite the block
//    node scripts/build-slide-type-bump-gs.js --check  # verify, write nothing
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const GS = path.join(__dirname, 'slide-type-bump.gs');
const BEGIN = '// ---- BEGIN GENERATED DECK TABLE';
const END = '// ---- END GENERATED DECK TABLE';

function enumerate() {
  const rows = [];

  const cspManifest = require('../config/csp-slide-manifest');
  const cspEmbeds = require('../config/csp-slide-embeds');
  for (const lesson of cspManifest.LESSON_IDS) {
    for (let day = 1; day <= cspManifest.dayCount(lesson); day++) {
      for (const variant of cspManifest.VARIANT_KEYS) {
        for (const track of cspManifest.TRACK_KEYS) {
          const id = cspEmbeds.slideId(lesson, day, variant, track);
          if (id) rows.push(['ap-csp', `${lesson}|${day}|${variant}|${track}`, id]);
        }
      }
    }
  }

  // Cyber has no track dimension. That is a real difference between the two
  // courses, not an omission: see the header of config/cyber-slide-embeds.js.
  const cyManifest = require('../config/cyber-slide-manifest');
  const cyEmbeds = require('../config/cyber-slide-embeds');
  for (const lesson of cyManifest.LESSON_IDS) {
    for (let day = 1; day <= cyManifest.dayCount(lesson); day++) {
      for (const variant of cyManifest.VARIANT_KEYS) {
        const id = cyEmbeds.slideId(lesson, day, variant);
        if (id) rows.push(['ap-cybersecurity', `${lesson}|${day}|${variant}`, id]);
      }
    }
  }
  return rows;
}

function render(rows, generatedAt) {
  const seen = new Map();
  for (const [course, key, id] of rows) {
    if (seen.has(id)) {
      // Two decks sharing a file id means the conversion mapped one file to
      // two lessons. Bumping it twice would compound, and the undo file would
      // only remember one of them.
      throw new Error(
        `file id ${id} is used by both ${seen.get(id)} and ${course} ${key}. ` +
        'Fix the embed map before generating: a shared id cannot be bumped safely.');
    }
    seen.set(id, `${course} ${key}`);
  }

  const byCourse = rows.reduce((acc, r) => {
    acc[r[0]] = (acc[r[0]] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    BEGIN + ' -------------------------------------------',
    '// Regenerate with:  node scripts/build-slide-type-bump-gs.js',
    '// Source of truth: config/csp-slide-embeds.js and config/cyber-slide-embeds.js',
    '// enumerated through their manifests, so this is exactly the set of decks',
    '// routes/slides.js can hand to an entitled teacher. Nothing else is touched.',
    '//',
    '// ' + Object.keys(byCourse).sort().map((c) => `${c}: ${byCourse[c]}`).join(', ')
      + `, total ${rows.length}.`,
    '//',
    '// Each row is [course, key, fileId]. The key is only for the log and the',
    '// sheet; the file id is what is opened.',
    'var DECKS = [',
    ...rows.map(([course, key, id]) => `  ['${course}', '${key}', '${id}'],`),
    '];',
    `var DECKS_GENERATED_AT = '${generatedAt}';`,
    END + ' ---------------------------------------------',
  ];
  return lines.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const src = fs.readFileSync(GS, 'utf8');

  const begin = src.indexOf(BEGIN);
  const endLine = src.indexOf(END);
  if (begin === -1 || endLine === -1) {
    console.error(`could not find the generated block markers in ${GS}`);
    process.exit(1);
  }
  const endOfBlock = src.indexOf('\n', endLine);

  const rows = enumerate();
  if (!rows.length) {
    console.error('no decks enumerated. Both embed maps are empty, so there is '
      + 'nothing to bump and the conversion has not run.');
    process.exit(1);
  }

  const generatedAt = new Date().toISOString().slice(0, 10);
  const block = render(rows, generatedAt);
  const next = src.slice(0, begin) + block + src.slice(endOfBlock);

  if (check) {
    // Compare ignoring the date, which changes on every run and is not a drift.
    const strip = (s) => s.replace(/var DECKS_GENERATED_AT = '[^']*';/, '');
    if (strip(next) === strip(src)) {
      console.log(`in sync: ${rows.length} deck(s).`);
      return;
    }
    console.error('OUT OF SYNC. Run: node scripts/build-slide-type-bump-gs.js');
    process.exit(1);
  }

  fs.writeFileSync(GS, next);
  const byCourse = rows.reduce((a, r) => ((a[r[0]] = (a[r[0]] || 0) + 1), a), {});
  console.log(`wrote ${rows.length} deck(s) into ${path.relative(process.cwd(), GS)}`);
  Object.keys(byCourse).sort().forEach((c) => console.log(`  ${c}: ${byCourse[c]}`));
  console.log('');
  console.log('The file ids in that table are credentials: holding one is holding');
  console.log('access to the deck. Paste the script into script.google.com, not');
  console.log('anywhere public.');
}

main();

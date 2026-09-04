'use strict';
// -----------------------------------------------------------------------------
//  BUILD THE AP NETWORKING TEACHER FILE MANIFEST.
//
//  Emits seed/networking-teacher-files.json, the id -> Drive target map that
//  routes/files.js resolves against a teacher's entitlement. Same role as
//  scripts/build-file-manifest.js does for AP CSP, and the ids are derived the
//  same way (sha256 of a stable string, first 16 hex) so the manifest can be
//  rebuilt from a fresh page body and every id comes out identical.
//
//  ── WHAT IT IS FIXING ───────────────────────────────────────────────────────
//  /pages/ap-networking-command-center is published, and its source carries a
//  materials map with a `tf` teacher folder per topic and a `tests` folder per
//  unit. Fetched with no credential at all, that is 22 + 4 = 26 Google Drive
//  folder links, every one of them shared anyone-with-link. Between them they
//  hold the 22 Teacher Decks, the 22 Teacher Guides, and the 4 Unit Tests with
//  their Answer Keys and Performance Tasks. That is the whole $249 bundle,
//  readable without an account. Board task 232, and the same defect class as
//  task 211 for the cyber Command Center.
//
//  The leak is not weak auth. It is PUBLICATION, exactly as it was for CSP
//  (routes/files.js's header records that incident). So the fix is the same:
//  stop printing the URLs, print opaque ids, and resolve them server side.
//
//  ── WHAT IT DELIBERATELY LEAVES ALONE ───────────────────────────────────────
//  `sd` and `sg`, the Student Deck and Student Guide, one of each per topic.
//  Students are handed those on purpose and a student who cannot open one has
//  been broken for no security gain. 44 student links stay exactly as they are,
//  and this script asserts it collected none of them.
//
//  ── THE LIMIT OF THIS FIX, STATED HERE BECAUSE IT IS EASY TO OVERSTATE ──────
//  Gating the page stops NEW exposure. It does not revoke a link somebody has
//  already copied, because the folders themselves are still shared
//  anyone-with-link and this manifest's whole job is to redirect an entitled
//  teacher to one. routes/files.js says the same thing about Shopify CDN files
//  and calls the rotation a separate, later, human step.
//
//  For Drive the equivalent of that rotation is changing each folder's sharing
//  from "anyone with the link" to restricted. That is the only step that closes
//  what is already out, it happens on Tanner's Drive rather than here, and it
//  MUST come after this gate is deployed and a real teacher has been seen to
//  still reach their files. Restricting first breaks every link on a live
//  teacher's page, including the one person who has paid.
//
//  ── SOURCE ──────────────────────────────────────────────────────────────────
//  The live page body, read through lib/storefront-fetch.js so a bot-challenge
//  body can never be mistaken for a page with no teacher links in it. Deriving
//  from the live page rather than from Drive is deliberate: the thing being
//  gated is what is currently PUBLISHED, so the published mapping is the
//  authority for what has to be covered.
//
//  Run: node scripts/build-networking-file-manifest.js [--check]
//       --check rebuilds and diffs against the committed file, and exits
//       non-zero on drift, so a hand edit is caught.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const storefront = require('../lib/storefront-fetch');

const HANDLE = 'ap-networking-command-center';
const OUT = path.join(__dirname, '..', 'seed', 'networking-teacher-files.json');
const COURSE = 'ap-networking';

// 22 CED topics and 4 units. Asserted rather than assumed, because a page that
// silently loses a topic would produce a manifest that silently stops gating it.
const EXPECT_TOPICS = 22;
const EXPECT_UNITS = 4;

// Same derivation as scripts/build-file-manifest.js: stable, opaque, and
// recomputable. Namespaced by kind so a folder id and a file id can never
// collide, and so these ids cannot collide with the CSP manifest's path-derived
// ones.
function fileId(kind, driveId) {
  return crypto.createHash('sha256').update(`drive:${kind}:${driveId}`).digest('hex').slice(0, 16);
}

function fetchBody() {
  const fn = storefront.page || storefront.fetchPage || storefront.get || storefront;
  return fn(`/pages/${HANDLE}`);
}

function extract(html) {
  const topics = [];
  const units = [];

  const topicRe = /\{id:"(\d\.\d)",title:"((?:[^"\\]|\\.)*)",days:(\d+)[^}]*?mats:\{sd:"([^"]*)",sg:"([^"]*)",tf:"([^"]*)"\}/g;
  for (const m of html.matchAll(topicRe)) {
    const tf = (m[6].match(/folders\/([A-Za-z0-9_-]+)/) || [])[1] || null;
    if (!tf) throw new Error(`topic ${m[1]} has no tf folder id`);
    // The student links are captured only so this script can PROVE it did not
    // collect them. They never reach the manifest.
    const sd = (m[4].match(/\/d\/([A-Za-z0-9_-]+)/) || [])[1] || null;
    const sg = (m[5].match(/\/d\/([A-Za-z0-9_-]+)/) || [])[1] || null;
    topics.push({ topic: m[1], title: m[2].replace(/\\"/g, '"'), tf, sd, sg });
  }

  const unitRe = /name:"([^"]*)"[^}]*?tests:"https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]+)"/g;
  for (const m of html.matchAll(unitRe)) units.push({ unit: m[1], folder: m[2] });

  return { topics, units };
}

function build({ topics, units }) {
  const manifest = {};
  const seen = new Set();

  const add = (driveId, entry) => {
    const id = fileId('folder', driveId);
    if (Object.prototype.hasOwnProperty.call(manifest, id)) {
      throw new Error(`duplicate manifest id ${id} for drive folder ${driveId}`);
    }
    if (seen.has(driveId)) throw new Error(`drive folder ${driveId} appears twice`);
    seen.add(driveId);
    manifest[id] = Object.assign({
      drive: { id: driveId, kind: 'folder' },
      course: COURSE,
      free: false,
    }, entry);
  };

  for (const t of topics) {
    add(t.tf, { label: `Topic ${t.topic} Teacher Materials`, topic: t.topic });
  }
  for (let i = 0; i < units.length; i++) {
    const n = i + 1;
    add(units[i].folder, { label: `Unit ${n} Assessments`, unit: n });
  }
  return manifest;
}

(async () => {
  const check = process.argv.includes('--check');
  const raw = await fetchBody();
  const html = typeof raw === 'string' ? raw : (raw.body || raw.html);

  const parsed = extract(html);
  if (parsed.topics.length !== EXPECT_TOPICS) {
    throw new Error(`expected ${EXPECT_TOPICS} topics, found ${parsed.topics.length}`);
  }
  if (parsed.units.length !== EXPECT_UNITS) {
    throw new Error(`expected ${EXPECT_UNITS} unit test folders, found ${parsed.units.length}`);
  }

  const manifest = build(parsed);
  const n = Object.keys(manifest).length;
  if (n !== EXPECT_TOPICS + EXPECT_UNITS) {
    throw new Error(`expected ${EXPECT_TOPICS + EXPECT_UNITS} entries, built ${n}`);
  }

  // The student links must not have leaked into the manifest. Gating one would
  // break a student for no gain, and this is cheaper to assert than to notice.
  const studentIds = new Set();
  for (const t of parsed.topics) { if (t.sd) studentIds.add(t.sd); if (t.sg) studentIds.add(t.sg); }
  for (const e of Object.values(manifest)) {
    if (studentIds.has(e.drive.id)) throw new Error(`student file ${e.drive.id} reached the manifest`);
  }
  if (studentIds.size !== EXPECT_TOPICS * 2) {
    throw new Error(`expected ${EXPECT_TOPICS * 2} student links on the page, saw ${studentIds.size}`);
  }

  const json = JSON.stringify(manifest, null, 2) + '\n';

  if (check) {
    const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (have !== json) {
      console.error('DRIFT: seed/networking-teacher-files.json does not match a fresh build.');
      console.error('Rebuild with: node scripts/build-networking-file-manifest.js');
      process.exit(1);
    }
    console.log(`OK - manifest matches the live page (${n} gated folders, ${studentIds.size} student links untouched)`);
    return;
  }

  fs.writeFileSync(OUT, json);
  console.log(`wrote ${OUT}`);
  console.log(`  ${parsed.topics.length} teacher folders + ${parsed.units.length} unit assessment folders = ${n} gated`);
  console.log(`  ${studentIds.size} student links left public on purpose`);
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });

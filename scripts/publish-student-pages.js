'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PUBLISH THE TWO STUDENT-FACING PAGES, BYTE FOR BYTE.
//
//  shopify/my-progress.html and shopify/join.html are canonical in this repo,
//  but nothing shipped them. Every previous update went by hand through the
//  Shopify admin or a Matrixify sheet, which is why smoke/auth-enrollment.js
//  carries a note about the live pages having drifted from the repo: there was
//  no mechanism, only a habit.
//
//  ── WHY A SCRIPT AND NOT A PASTE ────────────────────────────────────────────
//  These bodies are 33KB and 24KB. Retyping one into a tool call puts a live
//  student page one wrong character away from broken, and the rollback would
//  need the same error-prone step again. Reading the file and POSTing it makes
//  fidelity a property of the process rather than of whoever ran it, which is
//  the same argument scripts/snapshot-live-page.js makes for snapshots.
//
//  ── WHAT IT DOES ────────────────────────────────────────────────────────────
//  1. Snapshots the CURRENT live body to shopify/page-snapshots/ first. Shopify
//     keeps no usable page history, so this is the only rollback path there is.
//  2. Updates the page body via pageUpdate.
//  3. Reads the body back and compares it to the file. A GraphQL 200 is not
//     proof: this re-reads and diffs, and reports a mismatch as a failure.
//
//  Shopify normalises a handful of HTML entities on save (&#10003; becomes a
//  literal check mark, &ndash; an en dash), so the comparison normalises both
//  sides rather than pretending the round trip is byte identical. Everything
//  else must match exactly.
//
//    SHOPIFY_SHOP=xxx.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_... \
//      node scripts/publish-student-pages.js [--dry] [--only my-progress]
//
//  Needs the write_content scope. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { admin, scopes } = require('../lib/csa-exercise-publish');

const ROOT = path.join(__dirname, '..');
const SNAP_DIR = path.join(ROOT, 'shopify', 'page-snapshots');

// The pages this script owns. Adding one is a line here; the mechanism does not
// change. Titles are read and reported, never set, so a rename in the Shopify
// admin is surfaced rather than silently reverted by a publish.
const PAGES = [
  { handle: 'my-progress', file: 'shopify/my-progress.html' },
  { handle: 'join', file: 'shopify/join.html' },
];

const DRY = process.argv.includes('--dry');
const onlyIx = process.argv.indexOf('--only');
const ONLY = onlyIx > -1 ? process.argv[onlyIx + 1] : null;

// Entities Shopify rewrites on save. Compared after normalising both sides, so
// the check stays honest about what the round trip actually preserves.
const ENTITIES = [
  [/&#10003;/g, '✓'], [/&ndash;/g, '–'], [/&mdash;/g, '—'],
  [/&rarr;/g, '→'], [/&larr;/g, '←'], [/&nbsp;/g, ' '],
  [/&hellip;/g, '…'], [/&times;/g, '×'], [/&check;/g, '✓'],
];
function normalise(s) {
  let out = String(s == null ? '' : s).replace(/\r\n/g, '\n');
  for (const [re, ch] of ENTITIES) out = out.replace(re, ch);
  // The theme appends trailing whitespace on some bodies; see the note in
  // scripts/snapshot-live-page.js.
  return out.replace(/[ \t\n]+$/, '');
}

const FIND = `query Find($q: String!) {
  pages(first: 5, query: $q) { edges { node { id handle title updatedAt body } } }
}`;

const UPDATE = `mutation Update($id: ID!, $page: PageUpdateInput!) {
  pageUpdate(id: $id, page: $page) {
    page { id handle updatedAt }
    userErrors { field message }
  }
}`;

async function findPage(handle) {
  const d = await admin(FIND, { q: `handle:${handle}` });
  const edges = (d && d.pages && d.pages.edges) || [];
  const hit = edges.find((e) => e.node.handle === handle);
  return hit ? hit.node : null;
}

function snapshot(handle, body) {
  fs.mkdirSync(SNAP_DIR, { recursive: true });
  // Stamped by day, not by clock: re-running on the same day overwrites the
  // same file instead of littering the directory with identical copies.
  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(SNAP_DIR, `${handle}.${stamp}.before-publish.html`);
  fs.writeFileSync(file, body);
  return file;
}

(async () => {
  const targets = PAGES.filter((p) => !ONLY || p.handle === ONLY);
  if (!targets.length) { console.error(`No page matches --only ${ONLY}`); process.exit(1); }

  // Say what the token can do before attempting anything, so a scope problem
  // reads as a scope problem rather than as a failed write.
  const s = await scopes().catch((e) => ({ error: e.message }));
  if (s && s.error) { console.error('Could not read token scopes:', s.error); process.exit(1); }
  console.log('token scopes:', Array.isArray(s) ? s.join(', ') : JSON.stringify(s));

  let failures = 0;
  for (const p of targets) {
    console.log(`\n-- ${p.handle} -------------------------------`);
    const local = fs.readFileSync(path.join(ROOT, p.file), 'utf8');
    const live = await findPage(p.handle);
    if (!live) { console.error(`  NOT FOUND on the store: ${p.handle}`); failures++; continue; }

    console.log(`  page id     ${live.id}`);
    console.log(`  title       ${live.title}`);
    console.log(`  updated     ${live.updatedAt}`);
    console.log(`  live bytes  ${live.body.length}`);
    console.log(`  local bytes ${local.length}`);

    if (normalise(live.body) === normalise(local)) {
      console.log('  already in sync, nothing to write.');
      continue;
    }

    const snapFile = snapshot(p.handle, live.body);
    console.log(`  snapshot    ${path.relative(ROOT, snapFile)}`);

    if (DRY) { console.log('  --dry: not writing.'); continue; }

    const d = await admin(UPDATE, { id: live.id, page: { body: local } });
    const errs = (d && d.pageUpdate && d.pageUpdate.userErrors) || [];
    if (errs.length) {
      console.error('  WRITE REFUSED:', JSON.stringify(errs));
      failures++; continue;
    }

    // A 200 is not proof. Read it back.
    const after = await findPage(p.handle);
    if (!after || normalise(after.body) !== normalise(local)) {
      console.error('  VERIFY FAILED: the live body does not match the file.');
      console.error(`  live ${after ? after.body.length : 0} bytes vs local ${local.length}`);
      console.error(`  restore with the snapshot at ${path.relative(ROOT, snapFile)}`);
      failures++; continue;
    }
    console.log(`  PUBLISHED and verified, updated ${after.updatedAt}`);
  }

  console.log(failures ? `\n${failures} page(s) failed.` : '\nAll pages published and verified.');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e.message || e); process.exit(1); });

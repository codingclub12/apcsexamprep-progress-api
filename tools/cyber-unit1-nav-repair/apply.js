'use strict';
// APPLY phase. Does nothing unless SHOPIFY_SHOP and SHOPIFY_ADMIN_TOKEN are set
// and --confirm is passed. Writes one page at a time, then re-fetches and
// re-asserts that page before moving to the next.
//
//   node tools/cyber-unit1-nav-repair/apply.js --confirm
//
// Without a token the writes have to go through the Shopify MCP tool instead,
// one pageUpdate mutation per page, using the bodies in .work/new/.

const fs = require('fs');
const { transformBody } = require('./transform-nav.js');
const { assertNav } = require('./assert-nav.js');
const { transformExam } = require('./transform-exam.js');
const { assertExam } = require('./assert-exam.js');

const SHOP = process.env.SHOPIFY_SHOP;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API = process.env.SHOPIFY_API_VERSION || '2025-01';
const CONFIRM = process.argv.includes('--confirm');

const TARGETS = JSON.parse(fs.readFileSync(__dirname + '/targets.json', 'utf8'));

async function gql(query, variables) {
  const res = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const j = await res.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const FETCH = `query($q:String!){ pages(first:5, query:$q){ nodes { id handle body } } }`;
const UPDATE = `mutation($id:ID!,$page:PageUpdateInput!){
  pageUpdate(id:$id, page:$page){ page { id handle } userErrors { field message } }
}`;

function buildNewBody(handle, original) {
  const notes = [];
  let out = transformBody(original, notes).body;
  if (handle === 'ap-cyber-unit-1-exam') out = transformExam(out, notes);
  return out;
}

function verify(handle, original, updated) {
  const checks = assertNav(original, handle === 'ap-cyber-unit-1-exam'
    ? transformBody(original, []).body : updated, handle);
  if (handle === 'ap-cyber-unit-1-exam') {
    checks.push(...assertExam(transformBody(original, []).body, updated));
  }
  return checks.filter((c) => !c.pass);
}

(async () => {
  if (!SHOP || !TOKEN) {
    console.error('SHOPIFY_SHOP and SHOPIFY_ADMIN_TOKEN are required for the apply phase.');
    process.exit(2);
  }
  if (!CONFIRM) {
    console.error('Refusing to write without --confirm. Run the dry run first.');
    process.exit(2);
  }

  for (const handle of TARGETS) {
    const original = fs.readFileSync(`backup/${handle}.html`, 'utf8');

    // Re-fetch and confirm the live body still matches the backup, so a page
    // edited since the dry run is skipped rather than silently overwritten.
    const live = (await gql(FETCH, { q: `handle:${handle}` })).pages.nodes.find((n) => n.handle === handle);
    if (!live) { console.log(`SKIP ${handle}: not found`); continue; }
    if (live.body !== original) { console.log(`SKIP ${handle}: live body changed since the dry run`); continue; }

    const next = buildNewBody(handle, original);
    const r = await gql(UPDATE, { id: live.id, page: { body: next } });
    if (r.pageUpdate.userErrors.length) {
      console.log(`FAIL ${handle}:`, JSON.stringify(r.pageUpdate.userErrors));
      break;
    }

    // Re-fetch and re-assert against what Shopify actually stored.
    const after = (await gql(FETCH, { q: `handle:${handle}` })).pages.nodes.find((n) => n.handle === handle);
    const failed = verify(handle, original, after.body);
    const exact = after.body === next;
    console.log(`${failed.length === 0 && exact ? 'OK  ' : 'WARN'} ${handle}` +
      ` (stored-exact=${exact}, failedAssertions=${failed.length})`);
    if (failed.length) failed.forEach((f) => console.log('     ' + f.name + ' :: ' + f.detail));
  }
})();

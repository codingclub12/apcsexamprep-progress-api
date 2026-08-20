'use strict';
// -----------------------------------------------------------------------------
//  Build the server-side file manifest from the live Command Center body.
//
//  ── THE PROBLEM ─────────────────────────────────────────────────────────────
//  csp-command-center prints every bundle file URL into its public HTML: 780
//  unique files, 222 of them answer keys, 196 of those for Big Ideas 2 to 5
//  which are the paid tiers. The only gate is `FREE_BI: [1]`, a client-side
//  array, so the HTML is served to anyone and the URLs in it resolve for anyone.
//  An anonymous HEAD on a paid Big Idea exam key returns 200 with no auth and no
//  referrer check. Verified.
//
//  ── WHY THE MANIFEST IS TEACHER FILES ONLY ──────────────────────────────────
//  The page separates studentFiles from teacherFiles, and the separation is
//  clean: 329 student handouts with zero answer keys among them, 434 teacher
//  files holding 217 of the 222. Gating teacher files alone removes the leak and
//  cannot break a student, who never requests one. Gating all 780 would be a
//  bigger blast radius for no additional protection of the thing that matters.
//
//  ── WHAT THIS DOES NOT FIX ──────────────────────────────────────────────────
//  Shopify CDN files are public by construction. Routing the page through an
//  authenticated endpoint stops the URLs being PUBLISHED, which stops new
//  exposure; it does not revoke a URL somebody already copied. Those die only
//  when the files are re-uploaded under a new obscurity suffix, which is a
//  Shopify operation and not something this repo can do. Sequence matters:
//  deploy the API, repoint the page, verify, and only then rotate.
//
//  Run: node scripts/build-file-manifest.js <live-command-center-body.html> <out.json>
// -----------------------------------------------------------------------------

const fs = require('fs');
const crypto = require('crypto');

// A stable, opaque id per file path. Derived rather than stored, so the manifest
// can be rebuilt from a fresh page body and every id comes out the same.
function fileId(pathname) {
  return crypto.createHash('sha256').update(pathname).digest('hex').slice(0, 16);
}

function parseData(body) {
  const i = body.indexOf('var DATA = ');
  if (i === -1) throw new Error('no DATA blob in this body');
  const j = body.indexOf(';\n', i);
  if (j === -1) throw new Error('the DATA blob is not terminated');
  return JSON.parse(body.slice(i + 'var DATA = '.length, j));
}

function build(body) {
  const data = parseData(body);
  const files = {};
  let teacher = 0, student = 0, keys = 0;

  for (const bi of data.bigIdeas) {
    for (const topic of bi.topics) {
      for (const f of topic.teacherFiles || []) {
        teacher++;
        const id = fileId(f.href);
        if (/answer|key|solution|rubric/i.test(f.href)) keys++;
        files[id] = {
          path: f.href,
          label: f.label,
          course: 'ap-csp',
          bigIdea: bi.n,
          topic: topic.id,
          // Big Idea 1 is the published free sample. Keeping that true through
          // the endpoint preserves the page's current behavior rather than
          // quietly making the free tier paid.
          free: bi.n === 1,
        };
      }
      student += (topic.studentFiles || []).length;
    }
  }
  return { files, stats: { teacher, student, keys, unique: Object.keys(files).length } };
}

function main(argv) {
  const [src, out] = argv;
  if (!src || !out) {
    console.error('usage: node scripts/build-file-manifest.js <body.html> <out.json>');
    process.exit(2);
  }
  const r = build(fs.readFileSync(src, 'utf8'));
  const problems = [];
  if (r.stats.teacher < 400) problems.push(`only ${r.stats.teacher} teacher files; the page carries 434`);
  if (r.stats.keys < 200) problems.push(`only ${r.stats.keys} answer keys found; the page carries 217`);
  for (const [id, f] of Object.entries(r.files)) {
    if (!/^\/cdn\/shop\/files\//.test(f.path)) problems.push(`${id} is not a Shopify file path: ${f.path}`);
    if (!f.label) problems.push(`${id} has no label`);
  }
  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    problems.slice(0, 10).forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  fs.writeFileSync(out, JSON.stringify(r.files, null, 2) + '\n');
  console.log(`    ${r.stats.teacher} teacher files -> ${r.stats.unique} unique ids`);
  console.log(`    ${r.stats.keys} of them are answer keys, rubrics or solutions`);
  console.log(`    ${r.stats.student} student files left alone on purpose`);
  console.log(`\n  wrote ${out}\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, fileId, parseData };

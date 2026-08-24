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

// Collect by SHAPE, not by key name.
//
// This has been wrong twice, both times because it looked for a key called
// `teacherFiles`. The first version walked bigIdeas -> topics -> teacherFiles
// and missed bigIdeas -> exam -> teacherFiles, which is where the five Big Idea
// exam keys live. Fixing that to a recursive walk still missed the top-level
// `courseResources` and `projects` arrays, because those carry their hrefs under
// no such key at all: courseResources is a bare [{href,label}] list and projects
// is [{name,days,when,href}]. Seven more paid teacher files, published.
//
// So the rule is now the other way round: EVERY object carrying a Shopify file
// href is a teacher file, unless it sits inside `studentFiles`. A new section
// added next month is covered on the day it lands, because it does not have to
// be named anything in particular to be found. Only the exclusion has to be
// maintained, and there is exactly one of it.
function build(body) {
  const data = parseData(body);
  const files = {};
  let teacher = 0, student = 0, keys = 0;

  (function walk(node, ctx) {
    if (Array.isArray(node)) return node.forEach((x) => walk(x, ctx));
    if (!node || typeof node !== 'object') return;

    const here = {
      bigIdea: typeof node.n === 'number' ? node.n : ctx.bigIdea,
      topic: typeof node.id === 'string' ? node.id : ctx.topic,
    };

    if (typeof node.href === 'string' && /^\/cdn\/shop\/files\//.test(node.href)) {
      if (ctx.student) { student++; return; }
      teacher++;
      if (/answer|key|solution|rubric/i.test(node.href)) keys++;
      // A file referenced twice, as courseResources and again as a project,
      // is one file and gets one id. The second reference just overwrites.
      files[fileId(node.href)] = {
        path: node.href,
        label: node.label || node.name || 'Teacher file',
        course: 'ap-csp',
        bigIdea: here.bigIdea || 0,
        topic: here.topic || (here.bigIdea ? 'BI' + here.bigIdea : 'course'),
        // Big Idea 1 is the published free sample. Course-level files belong to
        // no Big Idea, so they are paid: they are the pacing guides and the
        // Create Task pack, not the free sampler.
        free: here.bigIdea === 1,
      };
      return;
    }

    for (const k of Object.keys(node)) {
      walk(node[k], { ...here, student: ctx.student || k === 'studentFiles' });
    }
  })(data, { student: false });

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
  if (r.stats.unique < 446) problems.push(`only ${r.stats.unique} unique teacher files; the page carries 446`);
  if (r.stats.keys < 222) problems.push(`only ${r.stats.keys} answer keys found; the page carries 222`);
  for (const [id, f] of Object.entries(r.files)) {
    if (!/^\/cdn\/shop\/files\//.test(f.path)) problems.push(`${id} is not a Shopify file path: ${f.path}`);
    if (!f.label) problems.push(`${id} has no label`);
  }
  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    problems.slice(0, 10).forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  // A manifest that SHRANK is the failure mode that matters: every id it loses
  // is a file that silently goes back to being published. Refuse rather than
  // write. This also catches the obvious mistake of rebuilding from a page that
  // has already been gated, where the teacher hrefs are ids and not URLs.
  if (fs.existsSync(out)) {
    const before = JSON.parse(fs.readFileSync(out, 'utf8'));
    const lost = Object.keys(before).filter((id) => !r.files[id]);
    if (lost.length) {
      console.error(`\n  Refused: this would drop ${lost.length} file(s) from the manifest,`
        + ' which un-gates them. Rebuild from a PRE-gate body.\n');
      lost.slice(0, 5).forEach((id) => console.error('    ' + before[id].path));
      console.error('');
      process.exit(1);
    }
  }
  fs.writeFileSync(out, JSON.stringify(r.files, null, 2) + '\n');
  console.log(`    ${r.stats.teacher} teacher files -> ${r.stats.unique} unique ids`);
  console.log(`    ${r.stats.keys} of them are answer keys, rubrics or solutions`);
  console.log(`    ${r.stats.student} student files left alone on purpose`);
  console.log(`\n  wrote ${out}\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, fileId, parseData };

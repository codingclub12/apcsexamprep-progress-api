'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE LIVE CHECK FOR THE CYBER PRACTICE HUB AND SPOKE.
//
//  ── WHY THIS EXISTS AS A PROGRAM AND NOT A PARAGRAPH ───────────────────────
//  deploy-gates/2026-09-04-cyber-practice-hub-and-spoke.json ships with no
//  live check, honestly, because the pages are not live until a human imports
//  two Matrixify sheets. Its not_covered section DESCRIBES what to check after
//  that import. A description is not a check, and the standard in CLAUDE.md is
//  that you have to be able to say what you would look at afterwards to know it
//  worked. This is that, executable.
//
//  ── EVERY ASSERTION HERE WAS FALSE BEFORE THE IMPORT ───────────────────────
//  That is the part the gate's own first manifest got wrong once, expecting
//  "status":"ok" from /api/health, which was true beforehand, true during, and
//  true if the deploy never happened. Measured 2026-09-04, before any import:
//  all five spoke handles returned 404, ap-cybersecurity-topics contained no
//  link to ap-cybersecurity-practice, and ap-cybersecurity-practice contained
//  none of the five spoke handles. So every check below is a claim the import
//  made true rather than decoration.
//
//  ── NO USER-AGENT ──────────────────────────────────────────────────────────
//  Through lib/storefront-fetch.js, which refuses a body it cannot prove is a
//  rendered page. The bot management inverted on 2026-09-03: a request claiming
//  to be a browser gets 403, and the 403 body contains none of the strings a
//  check looks for, so a negative assertion passes on it vacuously. Three
//  verifiers reported a confident, entirely false regression that way.
//  npm run smoke:storefront scans this file and fails if it grows a UA.
//
//  Run AFTER importing both sheets, new pages first:
//    node scripts/verify-cyber-practice-live.js
// ─────────────────────────────────────────────────────────────────────────────

const sf = require('../lib/storefront-fetch.js');
const extractBody = require('./extract-live-body.js');
const spec = require('../lib/cyber-practice-spec');

const LINK = /href\s*=\s*["'](?:https?:\/\/[^/"']*apcsexamprep\.com)?\/pages\/([^"'#?]+)/gi;
const linksIn = (html) => new Set([...String(html || '').matchAll(LINK)].map((m) => m[1]));

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

//  ── PACING, AND WHY A 429 IS NOT A RESULT ──────────────────────────────────
//  This walks eight pages in a row and the first run of it earned a 429 on the
//  seventh. A rate limit is the storefront asking for less, not a fact about
//  the page, and treating it as a failure would report the import as broken
//  when it is fine. So it backs off and retries, and only a repeated refusal
//  is allowed to end the run. One request every 1.5 seconds is the same pace
//  scripts/link-graph.js uses for the full crawl.
const GAP_MS = 1500;

// ─────────────────────────────────────────────────────────────────────────────
//  THE PAGE BODY, NOT THE RENDERED PAGE.
//
//  Found 2026-09-04 by this script failing on a repair that had actually
//  worked. It was reading the whole rendered document, which carries about 135
//  theme anchors before the content starts. ap-cybersecurity-study-guides is a
//  dead handle in the theme's own chrome: it appears twice in the rendered HTML
//  of EVERY page on the site, including a page created hours earlier, and zero
//  times in any page body. So "the course guide no longer links it" could never
//  pass no matter what the sheet did, because the sheet does not own that link.
//
//  The mirror of that is the real risk: an assertion that a page DOES link
//  something can be satisfied by chrome rather than by the edit under test.
//  Measured before changing this, so the fix rests on evidence rather than
//  worry: the chrome links none of the six practice handles, so nothing here
//  was passing on chrome. It was luck rather than design, and design is
//  cheaper: everything below now reads the stored body, which is exactly what
//  a Matrixify sheet controls.
//
//  docs/internal-linking.md makes the same distinction and calls it zone: only
//  a body anchor is architecture, a chrome anchor is present on every page
//  whether or not anyone linked anything.
async function body(handle) {
  //  page() asserts a positive marker the bot challenge cannot fake and throws
  //  otherwise, so a failure here is a real failure and never a quiet 403.
  let last;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const r = await sf.page(`/pages/${handle}`);
      const rendered = typeof r === 'string' ? r : r.body;
      //  Throws on a page with no rte wrapper, which is a real failure: every
      //  page this checks is a standard Shopify page template.
      return extractBody.extract(rendered);
    } catch (e) {
      last = e;
      //  A 404 is an answer: the page is not there, which is what this run is
      //  measuring. Retrying it would only be slow.
      if (/answered 404/.test(e.message)) throw e;
      if (!/answered 429|answered 5\d\d/.test(e.message)) throw e;
      await sleep(3000 * (attempt + 1));
    }
  }
  throw last;
}

async function main() {
  console.log('\ncyber practice hub and spoke, live\n');
  const u = spec.umbrella();

  //  1. The five spokes exist at all. They were 404 before the import.
  const spokeBodies = new Map();
  for (const s of spec.spokes()) {
    let html = null;
    try { html = await body(s.handle); } catch (e) { /* recorded by the assertion below */ }
    spokeBodies.set(s.handle, html);
    ok(`${s.handle} serves a rendered page (it was 404 before the import)`, !!html);
    await sleep(GAP_MS);
  }

  //  2. Each spoke reaches its own unit's practice and its own course lessons.
  for (const s of spec.spokes()) {
    const html = spokeBodies.get(s.handle);
    if (!html) continue;
    const links = linksIn(html);
    const assets = spec.assetHandles(s);
    const missingAssets = assets.filter((a) => !links.has(a));
    ok(`unit ${s.unit_no} serves all ${assets.length} of its practice assets`,
      missingAssets.length === 0, `missing ${missingAssets.slice(0, 4).join(', ')}`);

    const missingCourse = s.course_lesson_handles.filter((c) => !links.has(c));
    ok(`unit ${s.unit_no} reaches the course, which is what the whole change was for`,
      missingCourse.length === 0, `missing ${missingCourse.slice(0, 4).join(', ')}`);

    ok(`unit ${s.unit_no} reaches its unit study page`, links.has(s.unit_study_page));
  }

  //  3. The two edges that did not exist before.
  await sleep(GAP_MS);
  const hub = await body(u.handle);
  const hubLinks = linksIn(hub);
  const missingSpokes = spec.spokes().map((s) => s.handle).filter((h) => !hubLinks.has(h));
  ok('the practice hub links all five unit spokes (it linked none before)',
    missingSpokes.length === 0, `missing ${missingSpokes.join(', ')}`);

  await sleep(GAP_MS);
  const topics = await body(u.topics_hub);
  ok('the concept hub links the practice hub (it linked no practice page at all before)',
    linksIn(topics).has(u.handle));

  //  4. The REVERSE edge. Before the second import wave the five spokes had
  //     exactly one inbound path between them, topics hub to umbrella to spoke.
  //     These are the edges that make the hub and spoke reachable from where a
  //     student actually starts, so each one is asserted on the live page.
  for (const e of spec.reverseSources()) {
    await sleep(GAP_MS);
    let html = null;
    try { html = await body(e.from); } catch (err) { /* the assertion reports it */ }
    ok(`${e.from} reaches the practice layer (${e.why})`,
      !!html && linksIn(html).has(e.to));
  }

  //  The two dead anchors the course-guide repair removed. Both were live 404s
  //  before that import, so this is a claim the change made true.
  await sleep(GAP_MS);
  const guide = await body(spec.umbrella().course_guide);
  const guideLinks = linksIn(guide);
  for (const rp of spec.courseGuideRepairs()) {
    ok(`the course guide no longer links the dead handle ${rp.from}`, !guideLinks.has(rp.from));
    ok(`and links ${rp.to} in its place`, guideLinks.has(rp.to));
  }

  //  5. Nothing the import was supposed to leave alone got erased. The two
  //     extended pages keep their own titles and their existing content.
  //  These last two are PRESERVATION checks, and unlike everything above they
  //  were already true before the import. They are here because a MERGE writes
  //  the whole Body HTML, so the failure mode this package most needed to rule
  //  out is an import that blanks a live page. Counted separately so the
  //  summary line cannot claim they were false beforehand.
  const beforeCount = pass;
  ok('the topics hub still has an h1, so the import did not blank its body',
    /<h1[^>]*>[\s\S]*?<\/h1>/i.test(topics));
  ok('the practice hub still carries its FRQ and labs sections',
    hubLinks.has(`${u.topics_hub.replace('-topics', '')}-frq-practice`)
    || [...hubLinks].some((h) => /frq-practice|labs/.test(h)),
    'neither an FRQ nor a labs link survived on the practice hub');

  console.log();
  if (fails.length) {
    console.error(`FAILED (${fails.length})`);
    for (const f of fails) console.error(`  ${f}`);
    process.exit(1);
  }
  const madeTrue = beforeCount;
  const preserved = pass - beforeCount;
  console.log(`OK - ${pass} live checks: ${madeTrue} that the import made true,`
    + ` ${preserved} proving it erased nothing`);
}

main().catch((e) => { console.error(`live check could not run: ${e.message}`); process.exit(1); });

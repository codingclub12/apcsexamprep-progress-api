#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CYBER UNIT 3 RENUMBERING: THE MATRIXIFY SHEET.
//
//  Fetches the 30 live Unit 3 page bodies, applies lib/cyber-unit3-renumber.js,
//  runs the gates, and writes one Matrixify pages sheet. Nothing here talks to
//  the Shopify Admin API: every page change on this site ships as a sheet a
//  human reads before importing.
//
//  Run:
//    node scripts/cyber-unit3-renumber-csv.js out/unit3-renumber.csv
//    node scripts/cyber-unit3-renumber-csv.js out/unit3-renumber.csv --live ./pages
//
//  --live reads a directory of saved GET /pages/<handle>.json instead of
//  fetching, so a run is reproducible and reviewable offline.
//
//  ── THE ID BELONGS TO THE HANDLE, NOT THE BODY ──────────────────────────────
//  This is the one thing that would quietly destroy the unit. Bodies MOVE
//  between handles here: the firewall body currently at lesson-3 is going to
//  lesson-5. Matrixify matches a row by ID, so every row pairs the TARGET
//  handle's own id with the TRANSFORMED SOURCE body. Pairing the source id with
//  the source body instead would write each page back over itself, renumbered
//  but never moved, and the sheet would still look plausible.
//
//  Matrixify column rules that have each cost a live page before:
//    Command MERGE, never blank         a blank Command creates a duplicate
//    Body HTML only when updating it    an empty Body HTML cell wipes the body
//    never a Published At column        setting it to now unpublishes the page
//    never open the sheet in Excel      it truncates cells at 32,767 chars
//
//  ── WHY --baseline-out EXISTS, AND WHY ek3N IDS ARE LEFT ALONE ──────────────
//  validate_csv.py's stayed_hidden check collects every id carrying display:none
//  in the live page and fails if the sheet lost it. It is the check that would
//  have caught the Topic 1.1 answer leak, and it is keyed by ID.
//
//  A body move breaks that assumption: the sheet's lesson-5 row carries the
//  firewall body, whose collapsed Essential Knowledge panel is `ek33-body`,
//  while the live lesson-5 it gets compared against had `ek35-body`. The panel
//  is still hidden. The check sees an id that vanished and calls it a
//  regression. Three pages fail that way, and all three are the ones that move.
//
//  So --baseline-out writes a MOVE-AWARE baseline: for each target handle, the
//  body of the page its content actually came from. Then the check compares
//  like with like and keeps all of its teeth.
//
//  The ek3N ids are deliberately NOT renumbered to match the new topic. Each is
//  referenced exactly twice, by its own panel and its own toggle, on one page.
//  They are document-scoped internal anchors: not student-visible, not in a URL,
//  not in the manifest, and their digits mean nothing outside the page. Renaming
//  them would be tidiness that costs stayed_hidden the ability to prove the
//  panel is still hidden, because the check cannot tell a rename from a loss.
//  Keeping a real safety check sharp beats making an invisible id read nicely.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const R = require('../lib/cyber-unit3-renumber');

const BASE = 'https://www.apcsexamprep.com/pages';

//  Cloudflare serves an interstitial with HTTP 200 to a bare request from a
//  container, so the body looks fetched and is HTML. A browser User-Agent alone
//  is not enough; these four headers together are what gets the JSON.
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Mode': 'navigate',
};

async function fetchPage(handle) {
  const res = await fetch(`${BASE}/${handle}.json?cb=${Date.now()}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${handle}: HTTP ${res.status}`);
  const text = await res.text();
  if (!text.startsWith('{')) {
    throw new Error(`${handle}: not JSON, probably a Cloudflare interstitial`);
  }
  return JSON.parse(text).page;
}

function readPage(dir, handle) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${handle}.json`), 'utf8')).page;
}

//  Titles carry the topic number AND, on most activity pages, the handle index
//  ("AP Cybersecurity Unit 3 Lesson 2 Exercise 1"). Both move. The unit digit in
//  "Unit 3" is safe because a topic ref needs the dot.
function renumberTitle(title, oldTopic, newTopic, sourceN, targetN) {
  let out = title.replace(
    new RegExp(`\\b${oldTopic.replace('.', '\\.')}\\b(?![\\w.-])`, 'g'),
    newTopic,
  );
  if (sourceN !== targetN) {
    out = out.replace(new RegExp(`\\bLesson ${sourceN}\\b`, 'g'), `Lesson ${targetN}`);
  }
  return out;
}

function csvCell(v) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

//  Every gate compares the transformed body against the body it came FROM, so
//  it can catch a loss the absolute checks in validate_csv.py cannot see.
function gate(src, out, plan, isLesson) {
  const bad = [];
  const countTags = (s, re) => (s.match(re) || []).length;

  const srcScripts = countTags(src, /<script[\s>]/g);
  const outScripts = countTags(out, /<script[\s>]/g);
  //  The wireless page gains exactly one script, the rail's behaviour block.
  const allowedGain = plan.railAction === 'inserted' ? 1 : 0;
  if (outScripts !== srcScripts + allowedGain) {
    bad.push(`script blocks ${srcScripts} -> ${outScripts}, expected +${allowedGain}`);
  }
  if (countTags(src, /<style[\s>]/g) !== countTags(out, /<style[\s>]/g)) {
    bad.push('a <style> block was lost or gained');
  }

  //  Comments stripped first: a leftover instruction comment holding a <div>
  //  is not real markup and made a sound page read one tag short once before.
  const noComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
  const opens = countTags(noComments(out), /<div[\s>]/g);
  const closes = countTags(noComments(out), /<\/div>/g);
  if (opens !== closes) bad.push(`div imbalance: ${opens} open, ${closes} close`);

  const { problems } = R.checkConsistency(out, plan.lessonId, plan.lessonId);
  bad.push(...problems);

  if (isLesson) {
    const entries = countTags(out, /class="ucn-lesson[ "]/g);
    if (entries !== 6) bad.push(`rail has ${entries} entries, expected 6`);
    const open = out.match(/class="ucn-lesson open"[^>]*id="ucn-l(\d)"/);
    if (!open) bad.push('rail has no open marker');
    else if (open[1] !== String(plan.target)) {
      bad.push(`rail open on position ${open[1]}, expected ${plan.target}`);
    }
    if (countTags(out, /function ucnToggle/g) !== 1) {
      bad.push('expected exactly one ucnToggle definition');
    }
  }

  //  Prose must not shrink. The rail rebuild changes size, so this is a floor
  //  rather than an equality: losing a section would show up here.
  const textLen = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').length;
  const shrink = textLen(src) - textLen(out);
  if (shrink > 400) bad.push(`visible text shrank by ${shrink} chars`);

  return bad;
}

async function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: cyber-unit3-renumber-csv.js <out.csv> [--live <dir>]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const liveDir = liveIdx > -1 ? process.argv[liveIdx + 1] : null;
  const baseIdx = process.argv.indexOf('--baseline-out');
  const baseOut = baseIdx > -1 ? process.argv[baseIdx + 1] : null;

  const load = liveDir
    ? async (h) => readPage(liveDir, h)
    : async (h) => fetchPage(h);

  //  A donor supplies the rail behaviour script for the one page that lacks it.
  //  Lesson 4 is chosen because it keeps its own body and always has a rail.
  const donor = await load(R.handle(4, ''));
  const railScript = R.extractRailScript(donor.body_html);
  if (!railScript) {
    console.error('FATAL: could not find the ucnToggle script on the donor page.');
    process.exit(1);
  }

  const rows = [];
  let failures = 0;

  for (const p of R.PLAN) {
    for (const suffix of R.ACTIVITIES) {
      const srcHandle = R.handle(p.source, suffix);
      const tgtHandle = R.handle(p.target, suffix);
      const isLesson = suffix === '';

      //  Source supplies the body and title. TARGET supplies the id and handle.
      const srcPage = await load(srcHandle);
      const tgtPage = srcHandle === tgtHandle ? srcPage : await load(tgtHandle);

      //  The "Part 1 of 2" marker goes on the LESSON pages only. Both halves of
      //  CED 3.1 correctly read "Topic 3.1", which alone leaves a reader unable
      //  to tell the two apart. The activity pages need none: lesson 1's are
      //  titled "Topic 3.1 Exercise 1" and lesson 2's are titled "Unit 3 Lesson
      //  2 Exercise 1", so they were never going to collide.
      const part = isLesson ? p.part : null;
      const res = R.transformPage(
        srcPage.body_html, p.oldTopic, p.lessonId,
        isLesson ? p.target : null, railScript, part,
      );
      const title = R.titleWithPart(
        renumberTitle(
          srcPage.title, p.oldTopic, R.DISPLAY_MAP[p.oldTopic], p.source, p.target,
        ),
        R.DISPLAY_MAP[p.oldTopic], part,
      );

      const problems = gate(
        srcPage.body_html, res.body,
        { ...p, railAction: res.rail }, isLesson,
      );
      const tag = problems.length ? 'FAIL' : 'ok  ';
      if (problems.length) failures++;
      console.log(
        `${tag} ${tgtHandle.padEnd(38)} <- ${srcHandle.padEnd(38)} `
        + `${p.oldTopic}->${p.lessonId} rail=${res.rail}`,
      );
      for (const x of problems) console.log(`       ! ${x}`);

      rows.push([tgtPage.id, tgtHandle, title, res.body, 'MERGE']);

      //  The move-aware baseline: the TARGET handle's filename holding the
      //  SOURCE page's live body, which is what this row is actually a
      //  revision of. See the header note on stayed_hidden.
      if (baseOut) {
        fs.mkdirSync(baseOut, { recursive: true });
        fs.writeFileSync(
          path.join(baseOut, `${tgtHandle}.json`),
          JSON.stringify({ page: { ...srcPage, handle: tgtHandle, id: tgtPage.id } }),
          'utf8',
        );
      }
    }
  }

  //  ── THE HUB, AS A 31st ROW ────────────────────────────────────────────────
  //  It ships in THIS sheet rather than separately, and that is not tidiness.
  //  The hub's one outbound lesson link points at lesson-6 and describes TLS,
  //  SSH and DNSSEC. After the three-cycle lesson-6 holds the DETECTION body,
  //  so a hub imported even minutes apart from the pages sends readers to IDS
  //  and SIEM under a heading promising secure protocols. It still resolves and
  //  still renders, which is exactly why it would go unnoticed.
  //
  //  The hub itself needs NO renumbering: its five sections already read the
  //  CED topics correctly. It was right while the lessons were wrong, so the
  //  token pass is deliberately never run over it.
  {
    const hub = await load(R.HUB_HANDLE);
    const { body, actions } = R.transformHub(hub.body_html);
    const bad = [];
    if (!actions.includes('lesson-index-added')) bad.push('lesson index not inserted');
    if (!actions.includes('card-retargeted')) bad.push('enrichment card not retargeted');
    if (/ap-cyber-unit-3-lesson-6"[^>]*>\s*(?:Explore|Go to)/.test(body)) {
      bad.push('a call-to-action still points at lesson-6');
    }
    for (let n = 1; n <= 6; n++) {
      if (!body.includes(`/pages/ap-cyber-unit-3-lesson-${n}"`)) {
        bad.push(`no link to lesson-${n}`);
      }
    }
    if (/not tested on the AP exam/.test(body)) {
      bad.push('the "not tested" warning survives on what is now a core topic');
    }
    const tag = bad.length ? 'FAIL' : 'ok  ';
    if (bad.length) failures++;
    console.log(`${tag} ${R.HUB_HANDLE.padEnd(38)} <- itself${' '.repeat(31)}hub  [${actions.join(', ')}]`);
    for (const x of bad) console.log(`       ! ${x}`);
    rows.push([hub.id, R.HUB_HANDLE, hub.title, body, 'MERGE']);

    //  The hub does not move, so its baseline is simply itself. Written anyway
    //  so stayed_hidden covers the hub too rather than silently skipping the
    //  one page in this sheet whose body was hand-edited rather than renumbered.
    if (baseOut) {
      fs.mkdirSync(baseOut, { recursive: true });
      fs.writeFileSync(
        path.join(baseOut, `${R.HUB_HANDLE}.json`),
        JSON.stringify({ page: hub }), 'utf8',
      );
    }
  }

  if (failures) {
    console.error(`\n${failures} page(s) failed the gate. NO SHEET WRITTEN.`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const csv = [
    ['ID', 'Handle', 'Title', 'Body HTML', 'Command'].join(','),
    ...rows.map((r) => r.map(csvCell).join(',')),
  ].join('\n');
  fs.writeFileSync(out, `${csv}\n`, 'utf8');
  console.log(
    `\nwrote ${out}  (${fs.statSync(out).size} bytes, ${rows.length} rows, Command MERGE)`,
  );
  console.log('Import once via Matrixify. Never open this file in Excel.');
}

main().catch((e) => { console.error(e.message); process.exit(1); });

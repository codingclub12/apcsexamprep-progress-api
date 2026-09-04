'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE PRACTICE SHEET VALIDATOR.
//
//  ── IT REUSES THE TOPIC VALIDATOR RATHER THAN HOLDING A SECOND OPINION ─────
//  tools/ap-cyber-ced/validator.js already owns seven rules and every one of
//  them is mutation tested per rule. Six apply to any cyber page and are called
//  here as functions rather than reimplemented, for the reason CLAUDE.md gives
//  about lib/cyber-ek-density and lib/mojibake: a second copy of a rule is a
//  second thing to keep correct, and the copy is always the one that rots.
//
//  The seventh, R4, checks a page heading against a CED topic title. It does
//  not apply: a unit practice page covers four to six topics, so it HAS no
//  single canonical title. R4 is replaced by P1 below, which is the same idea
//  pointed the other way.
//
//  ── P1 IS THE ANTI-CANNIBALISATION RULE, AND IT IS THE POINT ───────────────
//  The brief this was built from was explicit: add a practice layer without
//  cannibalising what already ranks. AP Cyber has 63 concept spokes and 25
//  unit and topic study pages already competing for the topical keywords, and
//  the 2026-09-03 page audit found 13 CED topics carrying more than one page
//  in the public namespace.
//
//  So intent separation cannot be a convention, because this repo has already
//  proved twice over that a convention does not survive a busy afternoon. P1
//  makes it mechanical: a practice page must SAY it is practice, and must not
//  carry a CED topic title or a unit study page's topical name in its heading.
//  A future session that writes a practice page called "Firewalls" gets a red
//  suite, not a slow ranking loss nobody attributes to this change.
//
//  ── WHAT IT DOES NOT DO ────────────────────────────────────────────────────
//  It does not judge whether a page is any good, and it does not decide that a
//  MERGE row should have been a REDIRECT. Retiring a live page is a decision
//  with ranking equity attached, and it belongs to a human.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const base = require('./validator');
const cyberTopics = require('../../lib/cyber-topics');
const spec = require('../../lib/cyber-practice-spec');
const linkBlock = require('../../lib/link-block');

const RULES = {
  //  Reused, so the ids stay the ones a reader already knows from the topic
  //  sheet. Same rule, same name, same message shape.
  R1: base.RULES.R1,
  R2: base.RULES.R2,
  R3: base.RULES.R3,
  R5: base.RULES.R5,
  R6: base.RULES.R6,
  R7: base.RULES.R7,
  //  New, and specific to a hub and spoke.
  P1: 'a practice page that competes with a concept or topic page for the same keyword',
  P2: 'a created handle outside the practice namespace, or one that already exists as something else',
  P3: 'a hub-and-spoke edge that the sheet does not actually create',
  P4: 'a practice asset that is missing, duplicated, or filed under the wrong unit',
  P5: 'a row that rewrites a live page instead of extending it',
};


// ─────────────────────────────────────────────────────────────────────────────
//  WHAT COUNTS AS TEXT THIS PACKAGE AUTHORED.
//
//  Rules 1, 2, 3 and 7 govern text WE WRITE. On a page this package CREATES the
//  whole body is ours. On a page it EXTENDS, ours is only what sits inside
//  lib/link-block.js's own fences; the rest is a live page somebody else wrote.
//
//  This is not a loosening, it is the rule's actual scope, and the difference
//  is load-bearing. ap-cybersecurity-complete-course-guide carries 40-odd
//  em-dashes in its existing prose. Judging the whole body would refuse a
//  one-link edit over text the edit does not touch, which in practice means
//  the guard gets switched off or the link never ships. Meanwhile a real
//  defect, an em-dash or an EK code or mojibake in the link block we are
//  adding, still lands inside the fence and is still caught. The suite proves
//  that direction with its own mutation rather than asserting it here.
//
//  Structural rules are unaffected and still read the whole row: R5 (an empty
//  Body cell), R6 (a dead link anywhere on the page), P3, P4 and P5.
function authoredText(row, sp) {
  const body = String(row['Body HTML'] == null ? '' : row['Body HTML']);
  if (!sp || sp.created) return body;
  const out = [];
  const grab = (open, close) => {
    let i = 0;
    for (;;) {
      const a = body.indexOf(open, i);
      if (a === -1) return;
      const b = body.indexOf(close, a + open.length);
      if (b === -1) { out.push(body.slice(a)); return; }
      out.push(body.slice(a + open.length, b));
      i = b + close.length;
    }
  };
  grab(linkBlock.MARK_OPEN, linkBlock.MARK_CLOSE);
  grab(linkBlock.CSS_OPEN, linkBlock.CSS_CLOSE);
  return out.join('\n');
}

const flatten = base.flatten;
const stripComments = base.stripComments;

const headingOf = (body) => {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(stripComments(body || ''));
  return m ? flatten(m[1]) : '';
};

// ─────────────────────────────────────────────────────────────────────────────
//  P1: intent separation.
//
//  Two halves, and both are needed. The first is positive: the page must claim
//  practice intent in the Title and in the H1, because a page that does not say
//  what it is competes by accident. The second is negative: it must not carry a
//  CED topic title, which is the concept layer's keyword.
//
//  The negative half is checked against the canonical taxonomy rather than a
//  list of banned words, so a topic renamed in the CED is covered the day
//  config/cyber-topics.json is rebuilt.
// ─────────────────────────────────────────────────────────────────────────────
function rulePracticeIntent(row, sp) {
  const out = [];
  if (!sp || !sp.created) return out;      // only pages this package authors
  const word = spec.intentWord();
  const title = String(row.Title || '');
  const h1 = headingOf(row['Body HTML']);

  if (!title.includes(word)) {
    out.push(`P1 ${RULES.P1}: the Title ${JSON.stringify(title)} does not say ${JSON.stringify(word)},`
      + ' so it competes with the concept page for the same keyword');
  }
  if (h1 && !h1.includes(word)) {
    out.push(`P1 ${RULES.P1}: the page heading ${JSON.stringify(h1)} does not say ${JSON.stringify(word)}`);
  }

  //  A CED topic title in the heading is the concept layer's keyword, and it is
  //  exactly the collision the brief asked to avoid.
  const heading = `${title} ${h1}`;
  for (const t of cyberTopics.topics()) {
    if (heading.includes(t.title)) {
      out.push(`P1 ${RULES.P1}: the practice page ${row.Handle} carries the CED title of topic`
        + ` ${t.topic} (${JSON.stringify(t.title)}), which belongs to the topic page`);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  P2: the namespace. A created handle must end in -practice and must not
//  already be live as something else. MERGE against a live handle overwrites
//  its body, and that near-miss has already happened once on a cyber lab page.
// ─────────────────────────────────────────────────────────────────────────────
function ruleNamespace(rows, specs, liveHandles, opts = {}) {
  const out = [];
  const newHandles = new Set(opts.newHandles || []);
  rows.forEach((row, i) => {
    const sp = specs[i] || {};
    if (!sp.created) return;
    const h = String(row.Handle || '');
    if (!/-practice$/.test(h)) {
      out.push(`P2 ${RULES.P2}: created handle ${JSON.stringify(h)} does not end in "-practice"`);
    }
    //  A created handle that is ALREADY live is a body overwrite wearing the
    //  clothes of a new page. Allowed only when the spec says so explicitly.
    if (newHandles.has(h) && liveHandles.has(h)) {
      out.push(`P2 ${RULES.P2}: ${h} is declared new but is already live.`
        + ' A MERGE would replace the live body.');
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  P3: the edges. lib/cyber-practice-spec.js declares what must link to what;
//  this checks the sheet actually renders each one as an anchor. A hub that
//  says it links its spokes and does not is the failure this whole package
//  exists to prevent, so it is checked against the emitted HTML rather than
//  against the plan that produced it.
// ─────────────────────────────────────────────────────────────────────────────
const LINK = /href\s*=\s*["'](?:https?:\/\/[^/"']*apcsexamprep\.com)?\/pages\/([^"'#?]+)/gi;

function linksIn(body) {
  const out = new Set();
  for (const m of String(body || '').matchAll(LINK)) out.add(m[1]);
  return out;
}

function ruleEdges(rows) {
  const out = [];
  const byHandle = new Map();
  for (const r of rows) byHandle.set(String(r.Handle), linksIn(r['Body HTML']));
  for (const e of spec.requiredEdges()) {
    const have = byHandle.get(e.from);
    if (!have) {
      out.push(`P3 ${RULES.P3}: ${e.from} is not in the sheet, so the edge to ${e.to} cannot exist (${e.why})`);
      continue;
    }
    if (!have.has(e.to)) {
      out.push(`P3 ${RULES.P3}: ${e.from} does not link ${e.to} (${e.why})`);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  P4: coverage. Every asset in the canonical data appears on its own unit's
//  spoke, exactly once, and on no other spoke. The second half is what catches
//  a copy-paste that leaves unit 3's labs on the unit 4 page, which is the
//  error this shape of generator actually makes.
// ─────────────────────────────────────────────────────────────────────────────
function ruleCoverage(rows) {
  const out = [];
  const byHandle = new Map();
  for (const r of rows) byHandle.set(String(r.Handle), r);
  for (const s of spec.spokes()) {
    const row = byHandle.get(s.handle);
    if (!row) { out.push(`P4 ${RULES.P4}: no sheet row for ${s.handle}`); continue; }
    const body = String(row['Body HTML'] || '');
    const links = linksIn(body);
    for (const a of spec.assetHandles(s)) {
      if (!links.has(a)) out.push(`P4 ${RULES.P4}: ${s.handle} does not link its own asset ${a}`);
      const dup = (body.match(new RegExp(`/pages/${a}["'#?]`, 'g')) || []).length;
      if (dup > 1) out.push(`P4 ${RULES.P4}: ${s.handle} links ${a} ${dup} times`);
    }
    //  Another unit's asset on this page.
    for (const other of spec.spokes()) {
      if (other.unit_no === s.unit_no) continue;
      for (const a of spec.assetHandles(other)) {
        if (links.has(a)) {
          out.push(`P4 ${RULES.P4}: ${s.handle} links ${a}, which belongs to unit ${other.unit_no}`);
        }
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  P5: extension, not rewrite.
//
//  Matrixify MERGE writes the WHOLE Body HTML, so an "update" that drops any of
//  the original is a silent deletion of a live page. This repo has already lost
//  90 bytes a page that way once, and every semantic check passed while it did.
//
//  The check is REVERSIBILITY, not containment, and the difference matters.
//  Containment fails on a correct edit, because lib/link-block.js appends its
//  scoped CSS inside the page's own <style> block rather than after it, so the
//  original bytes are no longer one contiguous run. Reversibility is both
//  stricter and honest: everything link-block adds is fenced by its markers, so
//  unmarking the new body must reproduce the old one BYTE FOR BYTE. Anything
//  else, anywhere on the page, is an edit nobody asked for.
// ─────────────────────────────────────────────────────────────────────────────
function ruleExtension(rows, specs) {
  const out = [];
  rows.forEach((row, i) => {
    const sp = specs[i] || {};
    if (sp.created || !sp.base_body) return;
    const body = String(row['Body HTML'] || '');
    const back = linkBlock.unmark(body);
    if (back !== sp.base_body) {
      const at = firstDiff(back, sp.base_body);
      out.push(`P5 ${RULES.P5}: ${row.Handle} is an update to a live page, and removing this`
        + ` package's own additions does not reproduce the body it started from`
        + ` (first difference at byte ${at}). A MERGE would change more than it says.`);
    }
    if (Buffer.byteLength(body) <= Buffer.byteLength(sp.base_body)) {
      out.push(`P5 ${RULES.P5}: ${row.Handle} did not grow, so it added nothing`);
    }
  });
  return out;
}

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i;
  return n;
}

function validate(sheet, opts = {}) {
  const specs = opts.specs || [];
  const liveHandles = opts.liveHandles || new Set();
  const header = sheet.header || [];
  const rows = sheet.rows || [];
  const fail = [];

  rows.forEach((row, i) => {
    const sp = specs[i];
    const where = `row ${i + 1} (${row.Handle})`;
    if (!sp) {
      fail.push(`P4 ${where} has no source spec, so nothing about it can be checked`);
      return;
    }
    //  Content rules read only what this package authored on that row.
    const mine = authoredText(row, sp);
    fail.push(...base.ruleEkCodes(mine));
    fail.push(...base.ruleExamWeighting(mine));
    fail.push(...rulePracticeIntent(row, sp));
    for (const col of header) {
      //  Every other column is short and entirely ours when present, so those
      //  are judged whole. Only the body is split by authorship.
      const value = col === 'Body HTML' ? mine : row[col];
      fail.push(...base.ruleEmDash(value, `${where} column ${JSON.stringify(col)}`));
      fail.push(...base.ruleMojibake(value, `${where} column ${JSON.stringify(col)}`));
    }
  });

  //  R5 needs the spec's body_update flag, which is what the base rule reads.
  fail.push(...base.ruleBodyColumn(rows, specs, header));
  //  R6 resolves every internal link against the live set PLUS the handles this
  //  sheet itself creates: a spoke linking a sibling spoke is not a dead link,
  //  it is the hub and spoke working, and both land in the same import.
  const resolvable = new Set([...liveHandles, ...(opts.newHandles || [])]);
  fail.push(...base.ruleDeadLinks(rows, resolvable));
  fail.push(...ruleNamespace(rows, specs, liveHandles, opts));
  fail.push(...ruleEdges(rows));
  fail.push(...ruleCoverage(rows));
  fail.push(...ruleExtension(rows, specs));

  const byRule = {};
  for (const id of Object.keys(RULES)) byRule[id] = fail.filter((f) => f.startsWith(`${id} `));
  return { fail, byRule, rules: RULES };
}

module.exports = {
  RULES, validate, authoredText,
  rulePracticeIntent, ruleNamespace, ruleEdges, ruleCoverage, ruleExtension,
  linksIn, headingOf,
};

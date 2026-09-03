#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE GENERATOR: canonical taxonomy plus a per-topic content spec, out comes a
//  Matrixify sheet.
//
//  ── THE DIVISION OF LABOUR, WHICH IS THE POINT ──────────────────────────────
//  The spec carries the WORDS. The taxonomy carries the FACTS: the topic
//  number, the official title, the handle, the skill categories. Nothing in a
//  spec may restate a fact the taxonomy owns, because a spec that names its own
//  title is a second opinion about what topic 1.3 is called, and the whole
//  reason data/cyber-topics.json exists is that there used to be several.
//
//  So `title` is not a spec field. It is looked up. A spec that tries to set one
//  is refused rather than honoured.
//
//  ── WHAT IT EMITS ───────────────────────────────────────────────────────────
//  A page shaped like the cyber lesson pages already live: a scoped wrapper, an
//  h1 carrying the canonical title, a lede, concept cards each with ONE
//  orientation tag, auto-graded check-for-understanding widgets with their
//  feedback hidden, an internal-links list, a COLLAPSED Essential Knowledge
//  coverage table for the teacher, and an exit ticket with a teacher answer key.
//
//  The EK codes in this page are all in places the convention protects: the
//  coverage table, the card tags, the answer key. That is deliberate. A
//  generator whose output could not carry a legitimate code would just push
//  every author back to hand-editing, and the validator would never be exercised
//  on the case that actually matters.
//
//  ── WHAT IT WILL NOT DO ─────────────────────────────────────────────────────
//  Write a file that has not passed the validator, and never import anything.
//  Generation and import stay separate acts: a sheet is reviewed, then imported
//  once, in MERGE mode, by a human who read the refusals.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run: node tools/ap-cyber-ced/generate-sheet.js --spec <file.js> --out <file.csv>
//       node tools/ap-cyber-ced/generate-sheet.js --spec <file.js> --dry-run
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const cyberTopics = require('../../lib/cyber-topics');
const { HEADER, PUBLISHED_AT, roundTrip, parseCsv } = require('./sheet-csv');
const { validate } = require('./validator');

const ROOT = path.join(__dirname, '..', '..');
const LIVE_HANDLES = path.join(ROOT, 'smoke', 'fixtures', 'live-page-handles.txt');

function liveHandles(file = LIVE_HANDLES) {
  return new Set(fs.readFileSync(file, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
}

//  HTML-escape everything that came from a spec. The spec is author text, not
//  markup: a stray ampersand in "risk & reward" is a broken entity on a live
//  page, and an author who needs markup adds it to this generator rather than
//  smuggling it through a content field.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const idOf = (topic) => `cyber-topic-${topic.replace('.', '-')}`;
//  The coverage table id the EK density module looks for: ek11-body on 1.1,
//  ek32-body on 3.2. Its shape is that module's contract, not a choice here.
const ekBodyId = (topic) => `ek${topic.replace('.', '')}-body`;

// ─────────────────────────────────────────────────────────────────────────────
//  THE BODY
// ─────────────────────────────────────────────────────────────────────────────
function bodyHtml(spec) {
  const topic = cyberTopics.topic(spec.topic);
  const title = topic.title;
  const wrap = idOf(spec.topic);
  const skills = topic.skill_categories
    .map((c) => cyberTopics.load().skill_categories[c])
    .join(' and ');

  const cards = (spec.concepts || []).map((c) => `
    <div class="atk-card">
      <h3>${esc(c.term)}</h3>
      <span class="atk-tag">${esc(c.tag)}</span>
      <p>${esc(c.body)}</p>
    </div>`).join('');

  const checks = (spec.checks || []).map((q, i) => {
    const n = i + 1;
    const options = q.options.map((opt, k) => `
        <label><input type="radio" name="${wrap}-cfu-${n}" value="${'ABCDE'[k]}"> ${esc(opt)}</label>`).join('');
    return `
    <div class="apcs-ex" id="cfu-${n}" data-lesson-id="${esc(spec.topic)}" data-item-id="${esc(spec.topic)}-cfu-${n}" data-answer="${'ABCDE'[q.answer_index]}">
      <p class="cfu-q">${esc(q.q)}</p>${options}
      <button class="check-btn" type="button">Check answer</button>
      <div class="cfu-feedback-explain" id="cfu-${n}-fb" style="display:none">${esc(q.explain)}</div>
    </div>`;
  }).join('');

  const links = (spec.links || []).map((l) => `
      <li><a href="/pages/${esc(l.handle)}">${esc(l.label)}</a></li>`).join('');

  //  Collapsed by default and labelled for the teacher. This is one of the
  //  three places a CED code earns its place, and it earns it BECAUSE it is an
  //  audit surface rather than something a student reads on the way past.
  const coverage = (spec.ek_coverage || []).map((r) => `
        <tr><td>${esc(r.code)}</td><td>${esc(r.note)}</td></tr>`).join('');

  return `<div id="${wrap}" class="atk-wrap">
  <h1>AP Cybersecurity Topic ${esc(spec.topic)}: ${esc(title)}</h1>
  <p class="atk-lede">${esc(spec.lede)}</p>
  <p class="atk-skills">Skill focus: ${esc(skills)}.</p>
  <div class="atk-cards">${cards}
  </div>
  <div class="atk-checks">${checks}
  </div>
  <div class="atk-next">
    <h2>Keep going</h2>
    <ul>${links}
    </ul>
  </div>
  <details class="atk-ek">
    <summary>Essential Knowledge coverage (teacher reference)</summary>
    <div id="${ekBodyId(spec.topic)}">
      <table>
        <tr><th>Code</th><th>Where it is covered</th></tr>${coverage}
      </table>
    </div>
  </details>
  <div class="atk-exit">
    <h2>Exit ticket</h2>
    <p>${esc(spec.exit_ticket.prompt)}</p>
    <p><strong>Answer Key:</strong> ${esc(spec.exit_ticket.answer_key)}</p>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SPEC CHECKS: refuse a spec that is wrong before a sheet exists to review.
// ─────────────────────────────────────────────────────────────────────────────
function specErrors(specs, opts = {}) {
  const fail = [];
  const seen = new Set();
  specs.forEach((spec, i) => {
    const at = `spec ${i + 1}`;
    if (!spec.topic) { fail.push(`${at} names no topic`); return; }
    const topic = cyberTopics.topic(spec.topic);
    if (!topic) { fail.push(`${at} names topic ${spec.topic}, which the CED does not have`); return; }
    if (seen.has(spec.topic)) fail.push(`${at} is a second spec for topic ${spec.topic}`);
    seen.add(spec.topic);

    //  The taxonomy owns these. A spec that sets one is trying to hold a second
    //  opinion about a fact, which is the failure this whole file is against.
    for (const owned of ['title', 'slug', 'skill_categories']) {
      if (spec[owned] !== undefined) {
        fail.push(`${at} (topic ${spec.topic}) sets ${owned}, which the taxonomy owns.`
          + ' Remove it from the spec; it is looked up.');
      }
    }

    if (!spec.handle) fail.push(`${at} (topic ${spec.topic}) names no handle`);
    //  A FIXTURE spec exercises the generator and the validator without being
    //  able to reach a live page. Its handle has to be one that does not exist,
    //  and main() refuses to write a sheet for it at all, so the shape that
    //  keeps getting proposed ("generate one real page just to test it") is
    //  structurally unavailable rather than merely discouraged.
    else if (spec.fixture) {
      if (!/^fixture-/.test(spec.handle)) {
        fail.push(`${at} is a fixture and its handle must start with "fixture-", not ${spec.handle}`);
      }
      if (opts.liveHandles && opts.liveHandles.has(spec.handle)) {
        fail.push(`${at} is a fixture pointed at ${spec.handle}, which is a LIVE page`);
      }
    } else if (topic.handles.length && !topic.handles.includes(spec.handle)) {
      fail.push(`${at} (topic ${spec.topic}) targets handle ${spec.handle},`
        + ` and the taxonomy says this topic lives at ${topic.handles.join(' or ')}.`
        + ' Creating a second page for a topic that has one is a duplicate, and renaming a live handle is not automatic work.');
    }
    if (!spec.lede) fail.push(`${at} (topic ${spec.topic}) has no lede`);
    if (!spec.exit_ticket || !spec.exit_ticket.prompt || !spec.exit_ticket.answer_key) {
      fail.push(`${at} (topic ${spec.topic}) has no exit ticket`);
    }
    for (const q of spec.checks || []) {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        fail.push(`${at} (topic ${spec.topic}) has a check with fewer than two options`);
      }
      if (!(q.answer_index >= 0) || q.answer_index >= (q.options || []).length) {
        fail.push(`${at} (topic ${spec.topic}) has a check whose answer index is not one of its options`);
      }
    }
  });
  return fail;
}

// ─────────────────────────────────────────────────────────────────────────────
//  GENERATE
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object[]} specs   per-topic content specs
 * @param {object} [opts]    {liveHandles: Set}
 * @returns {{rows: object[], csv: string, drift: string[], report: object,
 *            specs: object[], bytes: number}}
 */
function generate(specs, opts = {}) {
  const handles = opts.liveHandles || liveHandles();
  const bad = specErrors(specs, { liveHandles: handles });
  if (bad.length) {
    const e = new Error(`the spec did not verify:\n  ${bad.join('\n  ')}`);
    e.specErrors = bad;
    throw e;
  }

  const rows = specs.map((spec) => {
    const topic = cyberTopics.topic(spec.topic);
    const title = `AP Cybersecurity Topic ${spec.topic}: ${topic.title}`;
    return {
      Handle: spec.handle,
      Command: 'MERGE',
      Title: title,
      'Body HTML': bodyHtml(spec),
      Published: 'TRUE',
      'Published At': PUBLISHED_AT,
      'SEO Title': spec.seo_title || title,
      'SEO Description': spec.seo_description || spec.lede,
    };
  });

  //  Write and read back before anything judges the content. A body that lost
  //  bytes in the quoting is not the body every other check just approved.
  const { csv, drift, bytes } = roundTrip(rows, HEADER);
  const report = validate(parseCsv(csv), { specs, liveHandles: handles });

  return { rows, csv, drift, report, specs, bytes };
}

/**
 * The other half of the parse-back check: every string the spec supplied has to
 * be present, escaped exactly as the generator escaped it, in the body that came
 * back out of the CSV. The round trip proves the sheet survived; this proves the
 * sheet says what the spec said.
 *
 * @returns {string[]} empty when the sheet carries the spec verbatim
 */
function specDrift(csv, specs) {
  const back = parseCsv(csv);
  const out = [];
  specs.forEach((spec, i) => {
    const row = back.rows[i];
    if (!row) { out.push(`spec ${i + 1} (topic ${spec.topic}) has no row after parse-back`); return; }
    const body = row['Body HTML'];
    const want = [
      spec.lede,
      ...(spec.concepts || []).flatMap((c) => [c.term, c.tag, c.body]),
      ...(spec.checks || []).flatMap((q) => [q.q, q.explain, ...q.options]),
      ...(spec.links || []).map((l) => l.label),
      ...(spec.ek_coverage || []).flatMap((r) => [r.code, r.note]),
      spec.exit_ticket.prompt,
      spec.exit_ticket.answer_key,
    ];
    for (const value of want) {
      if (!value) continue;
      const escaped = esc(value);
      if (!body.includes(escaped)) {
        out.push(`topic ${spec.topic}: the sheet does not carry ${JSON.stringify(String(value).slice(0, 60))}`
          + ` (${Buffer.byteLength(escaped)} bytes of spec text) after parse-back`);
      }
    }
  });
  return out;
}

function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : null;
  };
  const specFile = arg('--spec');
  const out = arg('--out');
  const dry = argv.includes('--dry-run');

  if (!specFile) {
    console.error('usage: generate-sheet.js --spec <file.js> [--out <file.csv> | --dry-run]');
    process.exit(2);
  }

  const loaded = require(path.resolve(specFile));
  const specs = Array.isArray(loaded) ? loaded : loaded.specs;

  let result;
  try {
    result = generate(specs);
  } catch (e) {
    console.error(`REFUSED. ${e.message}`);
    process.exit(1);
  }

  const drift = [...result.drift, ...specDrift(result.csv, specs)];
  const problems = [...result.report.fail, ...drift];

  console.log(`${specs.length} page(s), ${(result.bytes / 1024).toFixed(1)} KB of sheet`);
  for (const [id, label] of Object.entries(result.report.rules)) {
    const n = result.report.byRule[id].length;
    console.log(`  ${id}  ${n ? `${n} FAILURE(S)` : 'clean'.padEnd(11)}  ${label}`);
  }
  console.log(`  parse-back  ${drift.length ? `${drift.length} DRIFT` : 'zero byte drift'}`);

  if (problems.length) {
    console.error(`\nREFUSED, ${problems.length} problem(s). No file written:\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }

  if (specs.some((s) => s.fixture) && out) {
    console.error('\nREFUSED. These specs are fixtures, so no importable sheet is written.'
      + ' A fixture proves the generator and the validator work; it is not a page.');
    process.exit(1);
  }

  if (dry || !out) {
    console.log('\nclean. Nothing written (dry run).');
    return;
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), result.csv);
  console.log(`\nwrote ${out}. Import once, MERGE mode, after reading the sheet.`);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { generate, specDrift, specErrors, bodyHtml, esc, liveHandles, idOf, ekBodyId };

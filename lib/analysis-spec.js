'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ANALYSIS ACTIVITY SPECS: server-held, key-stripped on the way out.
//
//  Same shape and same posture as lib/lab-spec.js, for a different kind of
//  activity: a student reads several source documents and fills in fields about
//  each. The AP Cyber 1.1 phishing lab is the first one.
//
//  WHY IT IS SERVER-HELD AT ALL
//  It used to live in the Shopify page body, all of it, including the answer
//  key. A teacher's lock could not withhold what the browser already had, and
//  `senderKey` was readable in View Source. Both stop being true only when the
//  content is on this side of the wire.
//
//  forBrowser() IS THE WHOLE SECURITY BOUNDARY. Every `answer` block is removed
//  before a spec is serialised for a student, and grading happens here instead.
//  A field added to a spec is invisible to that stripping unless it is inside
//  `answer`, so the stripper works on a WHITELIST of what may go out rather than
//  a blacklist of what must not.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'config', 'analysis');

const errors = [];
const specs = new Map();

function validate(spec, file) {
  const bad = [];
  const need = ['course', 'item_id', 'unit', 'lesson_id', 'points', 'fields', 'specimens'];
  for (const k of need) if (spec[k] === undefined) bad.push(`missing ${k}`);
  if (!Array.isArray(spec.fields) || !spec.fields.length) bad.push('fields is empty');
  if (!Array.isArray(spec.specimens) || !spec.specimens.length) bad.push('specimens is empty');
  if (bad.length) return bad;

  for (const f of spec.fields) {
    if (!f.key) bad.push('a field has no key');
    if (f.kind === 'select' && !(Array.isArray(f.options) && f.options.length)) {
      bad.push(`select ${f.key} has no options`);
    }
    if (f.kind === 'text' && typeof f.min_length !== 'number') {
      bad.push(`text field ${f.key} has no min_length, so it would score on an empty answer`);
    }
  }
  //  Points have to ADD UP, because the gradebook denominator comes from the
  //  manifest and a spec that disagrees with it grades out of the wrong total.
  const expect = spec.points_per_specimen * spec.specimens.length;
  if (expect !== spec.points) bad.push(`points ${spec.points} but ${spec.specimens.length} specimens x ${spec.points_per_specimen} is ${expect}`);

  for (const sp of spec.specimens) {
    if (!sp.answer) { bad.push(`specimen ${sp.n} has no answer block`); continue; }
    for (const f of spec.fields) {
      const a = sp.answer;
      const has = f.kind === 'select' ? a[f.key] !== undefined : Array.isArray(a[f.key + 'Key']);
      if (!has) bad.push(`specimen ${sp.n} has no key for field ${f.key}`);
      if (f.kind === 'select' && a[f.key] !== undefined
        && !f.options.some((o) => o.value === a[f.key])) {
        bad.push(`specimen ${sp.n} answer for ${f.key} is "${a[f.key]}", which is not one of its options`);
      }
    }
  }
  return bad;
}

function load() {
  specs.clear();
  errors.length = 0;
  let files = [];
  try { files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')); } catch (e) { return; }
  for (const file of files) {
    let spec;
    try { spec = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')); } catch (e) {
      errors.push({ file, problems: ['not valid JSON: ' + e.message] });
      continue;
    }
    const problems = validate(spec, file);
    if (problems.length) { errors.push({ file, problems }); continue; }
    specs.set(`${spec.course}/${spec.item_id}`, spec);
  }
}
load();

const get = (course, itemId) => specs.get(`${course}/${itemId}`) || null;
const all = () => [...specs.values()];

//  WHITELIST, not blacklist. Only these keys reach a student, so a new key in a
//  spec file is withheld by default and has to be added here deliberately. The
//  `answer` block is not on the list and cannot be added by accident.
const OUT_TOP = ['course', 'item_id', 'unit', 'lesson_id', 'item_type', 'title',
  'points', 'points_per_specimen', 'page_handle'];
const OUT_SPECIMEN = ['n', 'difficulty', 'bar_title', 'meta', 'body'];
//  A field carries GRADING config too: min_length, and which answer key holds
//  the explanation. The player needs none of it, because every feedback string
//  it renders comes back on the grade response, so none of it is sent. What is
//  left is what it takes to DRAW the control.
const OUT_FIELD = ['key', 'label', 'kind', 'options', 'placeholder', 'rows'];

function forBrowser(spec) {
  const out = {};
  for (const k of OUT_TOP) if (spec[k] !== undefined) out[k] = spec[k];
  out.fields = (spec.fields || []).map((f) => {
    const o = {};
    for (const k of OUT_FIELD) if (f[k] !== undefined) o[k] = f[k];
    return o;
  });
  //  score_bands are the closing messages. They name a total, not an answer, and
  //  the player shows one only after the last specimen is graded, so they could
  //  go either way. They are withheld because the grade response already carries
  //  the chosen message and sending both is a second copy that can disagree.
  out.specimens = spec.specimens.map((sp) => {
    const s = {};
    for (const k of OUT_SPECIMEN) if (sp[k] !== undefined) s[k] = sp[k];
    return s;
  });
  return out;
}

//  The activity names a teacher's gate row might use for this item. Same problem
//  routes/labs.js has: the column a teacher clicks is not always the name the
//  spec calls itself.
const aliases = (spec) => {
  const own = spec.item_type || 'lab';
  const extra = Array.isArray(spec.activity_aliases) ? spec.activity_aliases : [];
  return [...new Set([own, ...extra])];
};

module.exports = { get, all, forBrowser, aliases, errors: () => errors.slice(), reload: load };

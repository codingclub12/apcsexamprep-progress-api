'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  GRADE AN ANALYSIS SUBMISSION, IN TRANSIT, AND KEEP NONE OF IT.
//
//  THE PII LINE, WHICH IS THE WHOLE REASON THIS FILE IS SEPARATE.
//  A student types prose into these fields. That prose reaches the server, is
//  graded here, and is DISCARDED when this function returns. It is never
//  stored, never logged, and never put in an attempt's detail JSON. That is the
//  same contract graded code already runs under in this repo, so it is not a new
//  PII exception: the sandbox exception covers work that is KEPT, and nothing
//  here is kept.
//
//  What may leave this function is what a gradebook needs and nothing more:
//  per-field pass or fail, points, and the author's own feedback strings. Read
//  `result()` below as the whitelist it is. If you are adding a field to the
//  result, ask whether it could contain a character the student typed; if it
//  could, it does not belong.
//
//  BEHAVIOURAL PARITY WITH THE PAGE IT REPLACES.
//  Every rule and every string here comes from the authored page via
//  scripts/extract-analysis-spec.js. A text field scores when it is longer than
//  its threshold AND contains one of its keys, case insensitively. A select
//  scores on an exact match. Nothing was improved on the way across, including
//  two fields that both report as "Impact:", because a migration that also edits
//  copy cannot be verified as a migration.
// ─────────────────────────────────────────────────────────────────────────────

//  The page's own matcher: case-insensitive substring against a key list.
function textMatch(input, keys) {
  const lower = String(input).toLowerCase();
  for (const k of keys) if (lower.indexOf(String(k).toLowerCase()) !== -1) return true;
  return false;
}

//  One field. Returns { ok, points, detail } and NEVER the value it was given.
function gradeField(field, answer, rawValue) {
  const label = (field.feedback && field.feedback.label) || field.key;
  const say = (pts, text) => ({ label, points: pts, text });

  if (field.kind === 'select') {
    const why = answer[field.feedback.explanation_key] || '';
    const ok = rawValue !== undefined && rawValue !== null && String(rawValue) === answer[field.key];
    return { ok, points: ok ? 1 : 0, detail: say(ok ? 1 : 0, why) };
  }

  const value = String(rawValue === undefined || rawValue === null ? '' : rawValue).trim();
  const keys = answer[field.key + 'Key'] || [];
  const long = value.length > field.min_length;
  if (long && textMatch(value, keys)) {
    return { ok: true, points: 1, detail: say(1, field.feedback.correct) };
  }
  if (long) {
    const hint = field.feedback.wrong_from === 'first2' ? keys.slice(0, 2).join(', ') : keys[0];
    return { ok: false, points: 0, detail: say(0, `${field.feedback.wrong_prefix} ${hint}`) };
  }
  return { ok: false, points: 0, detail: say(0, field.feedback.empty) };
}

//  One specimen. `responses` is whatever the client sent for it.
function gradeSpecimen(spec, specimen, responses) {
  const r = responses && typeof responses === 'object' ? responses : {};
  const fields = [];
  let points = 0;
  for (const f of spec.fields) {
    const g = gradeField(f, specimen.answer, r[f.key]);
    points += g.points;
    fields.push({ key: f.key, ok: g.ok, points: g.points, detail: g.detail });
  }
  return { n: specimen.n, points, max: spec.points_per_specimen, fields };
}

//  The whole submission. `submitted` maps specimen number to its responses.
//
//  A specimen the student did not submit scores zero and is marked not attempted,
//  which are different facts and must not render alike, the same rule the
//  gradebook contract states for a column nobody has started.
function grade(spec, submitted) {
  const sub = submitted && typeof submitted === 'object' ? submitted : {};
  const specimens = [];
  let earned = 0;
  let attempted = 0;
  for (const sp of spec.specimens) {
    const has = Object.prototype.hasOwnProperty.call(sub, String(sp.n))
      || Object.prototype.hasOwnProperty.call(sub, sp.n);
    if (!has) {
      specimens.push({ n: sp.n, attempted: false, points: 0, max: spec.points_per_specimen, fields: [] });
      continue;
    }
    attempted++;
    const g = gradeSpecimen(spec, sp, sub[sp.n] !== undefined ? sub[sp.n] : sub[String(sp.n)]);
    earned += g.points;
    specimens.push({ ...g, attempted: true });
  }

  //  The closing message, chosen by the author's own bands. Sorted descending by
  //  the extractor, so the first band the score clears is the right one.
  let message = null;
  for (const b of spec.score_bands || []) {
    if (earned >= b.at_least) { message = b.message; break; }
  }

  return {
    item_id: spec.item_id,
    course: spec.course,
    score: earned,
    max_score: spec.points,
    specimens_attempted: attempted,
    specimens_total: spec.specimens.length,
    complete: attempted === spec.specimens.length,
    message,
    specimens,
  };
}

//  What may be written to an attempt's detail JSON. Per-field booleans and
//  numbers only, matching the repo's rule that a detail carries option indices
//  and booleans and never a student-typed string.
function detailForStorage(result) {
  return result.specimens
    .filter((s) => s.attempted)
    .map((s) => ({ q: s.n, pts: s.points, ok: s.fields.map((f) => (f.ok ? 1 : 0)) }));
}

module.exports = { grade, gradeSpecimen, gradeField, textMatch, detailForStorage };

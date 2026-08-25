'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DEVICE SECURITY ANALYSIS: loader and validator for the cyber FRQ specs.
//
//  The AP Cybersecurity exam has exactly ONE free-response question and it is
//  always the same shape. From the CED (page 147, recorded in
//  docs/cyber-exam-format.md): several simulated sources about a single device,
//  then parts A to E. Suggested time 50 minutes. Skill Categories 2 and 3.
//
//  So these specs are not "an FRQ bank" in the CSA sense, where questions vary
//  by topic and year. Every spec here is the SAME question against a different
//  device. That is why the validator is strict about shape: a set that drifts
//  from parts A to E is not a harder or easier practice question, it is
//  practice for an exam that does not exist.
//
//  ── ZERO PII, AND WHY IT CONSTRAINS THE WHOLE DESIGN ────────────────────────
//  A free-response question asks a student to WRITE. Free text typed by a
//  student is exactly what CLAUDE.md forbids storing, with one named exception
//  that is not this. So a Device Security Analysis set is deliberately
//  self-scored: the student writes in their own editor or on paper, reveals the
//  sample response, and marks themselves. Nothing is transmitted, nothing is
//  stored, and public/frq-player.js contains no POST at all. smoke/frq.js
//  fails the build if one appears.
//
//  That is also why these are ungraded. A self-assessed score is not evidence,
//  and cyber's denominators (docs/cyber-denominator-gaps.md) are not a place to
//  put a number a student chose for themselves.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const FRQ_DIR = path.join(__dirname, '..', 'config', 'frq');

// The five parts, in the CED's order, with the skill each assesses. A spec that
// omits one, adds a sixth, or renames one is rejected.
const PARTS = ['A', 'B', 'C', 'D', 'E'];

// What each part must be ABOUT. Checked against the spec's own declaration, so
// an author cannot quietly turn Part C into a second firewall question and
// leave the exam's permission work unpractised.
const PART_SUBJECT = {
  A: 'policy',
  B: 'password-attack',
  C: 'permissions',
  D: 'firewall',
  E: 'second-attack',
};

// Source kinds the CED's own sample uses. A set may not invent a kind, because
// a student who practises against sources the exam never gives them is
// practising the wrong reading.
const SOURCE_KINDS = ['firewall-rules', 'app-log', 'auth-log', 'process-list',
  'file-listing', 'policy'];

// ── WHAT A HUB NEEDS, AND WHY IT LIVES IN THE SPEC ──────────────────────────
// Every Device Security Analysis set asks the same five parts about a different
// device, so a hub card cannot differentiate them by unit or by topic the way a
// CSA FRQ card can. The only honest discriminator is what a set teaches that the
// others do not: a spray that evades lockout, an attacker with no single IP.
// That is `focus`, and it is required, because a set that cannot say how it
// differs from the other four does not need to exist.
//
// These fields are required rather than optional on purpose. The reason the
// four sets shipped orphaned is that nothing in the pipeline knew they were
// meant to appear together. A hub generated from the specs can only stay
// correct if the specs carry what the hub renders, so the validator refuses a
// set that a hub could not list.
const DIFFICULTIES = ['intro', 'core', 'stretch'];

function load() {
  let files = [];
  try {
    files = fs.readdirSync(FRQ_DIR).filter((f) => f.endsWith('.json')).sort();
  } catch (e) {
    return [];
  }
  const out = [];
  for (const f of files) {
    let spec;
    try {
      spec = JSON.parse(fs.readFileSync(path.join(FRQ_DIR, f), 'utf8'));
    } catch (e) {
      out.push({ _file: f, _parseError: e.message });
      continue;
    }
    spec._file = f;
    out.push(spec);
  }
  return out;
}

function validate(spec, at) {
  const p = [];
  if (spec._parseError) return [`${at}: does not parse: ${spec._parseError}`];

  for (const k of ['course', 'set_id', 'title', 'device', 'sources', 'parts',
    'page_handle', 'blurb', 'focus', 'difficulty']) {
    if (!spec[k]) p.push(`${at}: missing ${k}`);
  }
  if (spec.course && spec.course !== 'ap-cybersecurity') {
    p.push(`${at}: course must be ap-cybersecurity, got '${spec.course}'`);
  }
  if (spec.set_id && !/^dsa-[a-z0-9-]+$/.test(spec.set_id)) {
    p.push(`${at}: set_id '${spec.set_id}' must look like dsa-something`);
  }
  if (spec.est_minutes != null && spec.est_minutes !== 50) {
    p.push(`${at}: est_minutes is ${spec.est_minutes}; the CED suggests 50 for this question`);
  }

  // ── the hub card fields ───────────────────────────────────────────────────
  // A blurb is the sentence a student reads before deciding to spend fifty
  // minutes. Too short and the card says nothing; too long and it stops being a
  // card. The bounds are the same shape as the SEO description rule the page
  // generator already enforces, for the same reason.
  if (spec.blurb != null) {
    if (spec.blurb.length < 60 || spec.blurb.length > 200) {
      p.push(`${at}: blurb is ${spec.blurb.length} chars, must be 60 to 200`);
    }
    if (spec.blurb.includes('\u2014')) p.push(`${at}: blurb contains an em-dash`);
  }
  if (spec.focus != null && (spec.focus.length < 8 || spec.focus.length > 60)) {
    p.push(`${at}: focus is ${spec.focus.length} chars, must be 8 to 60`);
  }
  if (spec.difficulty != null && !DIFFICULTIES.includes(spec.difficulty)) {
    p.push(`${at}: difficulty '${spec.difficulty}' is not one of ${DIFFICULTIES.join(', ')}`);
  }
  if (spec.order != null && (!Number.isInteger(spec.order) || spec.order < 1)) {
    p.push(`${at}: order must be a positive integer`);
  }
  if (spec.page_handle != null && !/^[a-z0-9-]+$/.test(spec.page_handle)) {
    p.push(`${at}: page_handle '${spec.page_handle}' is not a clean slug`);
  }

  // ── sources ───────────────────────────────────────────────────────────────
  if (Array.isArray(spec.sources)) {
    if (spec.sources.length < 4) p.push(`${at}: ${spec.sources.length} sources, need at least 4`);
    const kinds = new Set();
    spec.sources.forEach((s, i) => {
      const w = `${at}: source ${i + 1}`;
      if (!s.kind) p.push(`${w}: missing kind`);
      else if (!SOURCE_KINDS.includes(s.kind)) p.push(`${w}: unknown kind '${s.kind}'`);
      else kinds.add(s.kind);
      if (!s.label) p.push(`${w}: missing label`);
      if (s.kind === 'firewall-rules') {
        if (!Array.isArray(s.rules) || !s.rules.length) p.push(`${w}: firewall source has no rules`);
      } else if (s.kind === 'file-listing') {
        if (!Array.isArray(s.entries) || !s.entries.length) p.push(`${w}: file listing has no entries`);
      } else if (s.kind === 'policy') {
        if (!s.sections || typeof s.sections !== 'object') p.push(`${w}: policy has no sections`);
      } else if (!Array.isArray(s.lines) || !s.lines.length) {
        p.push(`${w}: log source has no lines`);
      }
    });
    // The parts cannot be answered without these three.
    for (const need of ['auth-log', 'file-listing', 'policy']) {
      if (!kinds.has(need)) p.push(`${at}: no '${need}' source, but a part depends on one`);
    }
    if (!kinds.has('firewall-rules')) p.push(`${at}: no firewall rules, but Part D depends on them`);
  }

  // ── parts ─────────────────────────────────────────────────────────────────
  if (spec.parts && typeof spec.parts === 'object') {
    const got = Object.keys(spec.parts).sort();
    if (JSON.stringify(got) !== JSON.stringify(PARTS)) {
      p.push(`${at}: parts are ${got.join(',')}; the exam always asks exactly A,B,C,D,E`);
    }
    for (const letter of PARTS) {
      const part = spec.parts[letter];
      if (!part) continue;
      const w = `${at}: part ${letter}`;
      if (part.subject !== PART_SUBJECT[letter]) {
        p.push(`${w}: subject is '${part.subject}', must be '${PART_SUBJECT[letter]}'`);
      }
      if (!Array.isArray(part.subparts) || !part.subparts.length) {
        p.push(`${w}: has no subparts`);
        continue;
      }
      part.subparts.forEach((sp, i) => {
        const roman = ['i', 'ii', 'iii', 'iv', 'v'][i] || `#${i + 1}`;
        const ww = `${w}(${roman})`;
        if (!sp.prompt) p.push(`${ww}: missing prompt`);
        if (!sp.sample) p.push(`${ww}: missing sample response, so a student cannot self-score`);
        if (!sp.verb) p.push(`${ww}: missing task verb`);
        else if (!['Identify', 'Explain', 'Describe', 'Determine', 'Write'].includes(sp.verb)) {
          p.push(`${ww}: '${sp.verb}' is not a CED task verb`);
        }
        if (!Array.isArray(sp.credit) || !sp.credit.length) {
          p.push(`${ww}: no credit points, so self-scoring has nothing to check against`);
        }
      });
    }

    // Part C exists to make students write a command. The CED sample asks for
    // chmod. A set whose Part C never asks for one has quietly dropped the only
    // place the exam tests the Write verb.
    const c = spec.parts.C;
    if (c && Array.isArray(c.subparts) && !c.subparts.some((sp) => sp.verb === 'Write')) {
      p.push(`${at}: part C never asks the student to Write a command`);
    }
  }

  // ── the PII line ──────────────────────────────────────────────────────────
  // A set must not ask for anything that would identify the student, and must
  // not claim to collect or grade what they write.
  const blob = JSON.stringify(spec).toLowerCase();
  for (const bad of ['your name', 'your email', 'submit your answer', 'we will grade']) {
    if (blob.includes(bad)) p.push(`${at}: asks for or promises something it must not: '${bad}'`);
  }

  return p;
}

function all() { return load().filter((s) => !s._parseError); }

// Cross-set rules. A single spec can be perfectly valid and still break the hub:
// two sets claiming the same page handle would have the hub link one of them
// twice, and two sets sharing a focus would give a student no way to choose
// between them. Neither is visible from inside one file, so it is checked here.
function crossErrors(specs) {
  const p = [];
  const seen = { page_handle: new Map(), order: new Map(), focus: new Map() };
  for (const key of Object.keys(seen)) {
    for (const s of specs) {
      const v = key === 'focus' ? String(s[key] || '').toLowerCase() : s[key];
      if (v == null || v === '') continue;
      if (seen[key].has(v)) {
        p.push(`${s._file}: ${key} '${v}' is already claimed by ${seen[key].get(v)}`);
      } else {
        seen[key].set(v, s._file);
      }
    }
  }
  return p;
}

function errors() {
  const p = [];
  const specs = load();
  for (const s of specs) p.push(...validate(s, s._file));
  p.push(...crossErrors(specs.filter((s) => !s._parseError)));
  return p;
}
function get(course, setId) {
  return all().find((s) => s.course === course && s.set_id === setId) || null;
}
function summary(spec) {
  return {
    course: spec.course,
    set_id: spec.set_id,
    title: spec.title,
    device: spec.device,
    est_minutes: spec.est_minutes || 50,
    sources: (spec.sources || []).length,
    parts: Object.keys(spec.parts || {}).length,
    subparts: Object.values(spec.parts || {}).reduce((n, x) => n + (x.subparts || []).length, 0),
    page_handle: spec.page_handle || null,
    // What a hub card renders. Kept in summary() rather than fetched per set,
    // so a hub is one request no matter how many sets exist.
    blurb: spec.blurb || null,
    focus: spec.focus || null,
    difficulty: spec.difficulty || null,
    order: spec.order == null ? 999 : spec.order,
    url: `/frq/${spec.course}/${spec.set_id}`,
  };
}
function forBrowser(spec) {
  const out = {};
  for (const [k, v] of Object.entries(spec)) {
    if (k === '_comment' || k === '_file') continue;
    out[k] = v;
  }
  return out;
}

module.exports = { load, all, get, errors, crossErrors, validate, summary, forBrowser,
  PARTS, PART_SUBJECT, SOURCE_KINDS, DIFFICULTIES, FRQ_DIR };

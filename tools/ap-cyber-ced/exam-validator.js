'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE EXAM ITEM VALIDATOR.
//
//  Sixty questions is past the point where a human reader catches a drifting
//  answer key or a topic that quietly got three items instead of two. So the
//  blueprint is enforced against the bank rather than consulted while writing,
//  and item craft is enforced too, because the house standard for these is
//  specific and easy to violate under authoring fatigue.
//
//  Content rules (EK codes, fabricated weightings, em-dashes, mojibake) are the
//  ones the topic-sheet validator already owns. They are called here rather
//  than restated, same as the practice hub validator does.
//
//  Every rule is mutation tested in smoke/cyber-exam-replica.js.
// ─────────────────────────────────────────────────────────────────────────────

const base = require('./validator');
const blueprint = require('../../config/cyber-exam-blueprint.json');

const RULES = {
  E1: 'an item whose topic or skill category is not in the CED blueprint',
  E2: 'a per-topic or per-skill count that does not match the blueprint',
  E3: 'a malformed item: wrong option count, missing answer, missing explanation',
  E4: 'an answer key that is not defensible: a banned option, or letter clustering',
  E5: 'a distractor set that gives the answer away by shape',
  E6: 'an item that reuses a stem from the existing study set',
  E7: 'a free response that is not the CED Device Security Analysis shape',
  R1: base.RULES.R1,
  R2: base.RULES.R2,
  R3: base.RULES.R3,
  R7: base.RULES.R7,
};

const LETTERS = ['A', 'B', 'C', 'D'];
const BANNED = /\b(all|none) of the above\b/i;
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// ── E1/E2: the blueprint is the authority on what may exist and how much ────
function ruleBlueprint(items) {
  const out = [];
  const want = new Map();
  for (const r of blueprint.plan) want.set(r.topic, r);

  for (const it of items) {
    const r = want.get(it.topic);
    if (!r) { out.push(`E1 ${RULES.E1}: item ${it.id} names topic ${JSON.stringify(it.topic)}, which the blueprint does not carry`); continue; }
    if (!r.by_skill[it.skill]) {
      out.push(`E1 ${RULES.E1}: item ${it.id} is topic ${it.topic} skill ${it.skill},`
        + ` but that topic carries skill ${Object.keys(r.by_skill).join('/')} in the blueprint`);
    }
  }

  const gotTopic = {};
  const gotSkill = {};
  for (const it of items) {
    gotTopic[it.topic] = (gotTopic[it.topic] || 0) + 1;
    gotSkill[it.skill] = (gotSkill[it.skill] || 0) + 1;
  }
  for (const r of blueprint.plan) {
    const n = gotTopic[r.topic] || 0;
    if (n !== r.items) out.push(`E2 ${RULES.E2}: topic ${r.topic} has ${n} items, blueprint says ${r.items}`);
  }
  for (const [s, n] of Object.entries(blueprint.by_skill)) {
    const g = gotSkill[s] || 0;
    if (g !== n) out.push(`E2 ${RULES.E2}: skill ${s} has ${g} items, blueprint says ${n}`);
  }
  if (items.length !== blueprint.mcq_total) {
    out.push(`E2 ${RULES.E2}: ${items.length} items, blueprint says ${blueprint.mcq_total}`);
  }
  //  The CED band, re-checked on the BANK rather than on the plan, so an item
  //  retagged after the blueprint was built cannot slip out of compliance.
  for (const s of ['1', '2', '3']) {
    const pct = 100 * (gotSkill[s] || 0) / (items.length || 1);
    if (pct < blueprint.band.low || pct > blueprint.band.high) {
      out.push(`E2 skill ${s} is ${pct.toFixed(1)} percent of the bank, outside the CED band`
        + ` ${blueprint.band.low} to ${blueprint.band.high}`);
    }
  }
  return out;
}

// ── E3: shape ──────────────────────────────────────────────────────────────
function ruleShape(items) {
  const out = [];
  const seen = new Set();
  for (const it of items) {
    if (!it.id) { out.push(`E3 ${RULES.E3}: an item has no id`); continue; }
    if (seen.has(it.id)) out.push(`E3 ${RULES.E3}: duplicate item id ${it.id}`);
    seen.add(it.id);
    if (!Array.isArray(it.options) || it.options.length !== 4) {
      out.push(`E3 ${RULES.E3}: item ${it.id} has ${(it.options || []).length} options, every item takes exactly 4`);
      continue;
    }
    if (!LETTERS.includes(it.answer)) out.push(`E3 ${RULES.E3}: item ${it.id} has answer ${JSON.stringify(it.answer)}`);
    if (!String(it.stem || '').trim()) out.push(`E3 ${RULES.E3}: item ${it.id} has no stem`);
    if (String(it.explanation || '').trim().length < 40) {
      out.push(`E3 ${RULES.E3}: item ${it.id} has no real explanation. A practice item without one teaches nothing.`);
    }
    if (new Set(it.options.map(norm)).size !== 4) out.push(`E3 ${RULES.E3}: item ${it.id} repeats an option`);
  }
  return out;
}

// ── E4: the answer key ─────────────────────────────────────────────────────
//  Two failures, and the second is the one authoring fatigue produces. A bank
//  written in topic order drifts toward a letter, and a student who notices
//  scores above their knowledge.
function ruleKey(items) {
  const out = [];
  for (const it of items) {
    for (const o of it.options || []) {
      if (BANNED.test(o)) out.push(`E4 ${RULES.E4}: item ${it.id} offers ${JSON.stringify(String(o).slice(0, 40))}`);
    }
  }
  const counts = {};
  for (const it of items) counts[it.answer] = (counts[it.answer] || 0) + 1;
  const n = items.length;
  for (const L of LETTERS) {
    const c = counts[L] || 0;
    //  Even at 25 percent each; allow a reasonable spread, refuse a lean.
    if (n >= 20 && (c < n * 0.15 || c > n * 0.35)) {
      out.push(`E4 ${RULES.E4}: answer ${L} is used ${c} times in ${n} items`
        + ` (${(100 * c / n).toFixed(0)} percent). Keep every letter between 15 and 35 percent.`);
    }
  }
  //  No run of five consecutive items may use fewer than three distinct
  //  letters, and none may repeat a letter more than twice. House standard.
  for (let i = 0; i + 5 <= items.length; i += 1) {
    const win = items.slice(i, i + 5).map((x) => x.answer);
    const distinct = new Set(win).size;
    if (distinct < 3) {
      out.push(`E4 ${RULES.E4}: items ${items[i].id} to ${items[i + 4].id} use only ${distinct} distinct answers (${win.join('')})`);
    }
    const wc = {};
    for (const a of win) wc[a] = (wc[a] || 0) + 1;
    for (const [L, c] of Object.entries(wc)) {
      if (c > 2) out.push(`E4 ${RULES.E4}: items ${items[i].id} to ${items[i + 4].id} use ${L} ${c} times (${win.join('')})`);
    }
  }
  return out;
}

// ── E5: distractors that give it away ──────────────────────────────────────
//  The classic tell is a correct option noticeably longer than the rest,
//  because the author kept qualifying it. Measured, not eyeballed.
function ruleDistractors(items) {
  const out = [];
  for (const it of items) {
    if (!Array.isArray(it.options) || it.options.length !== 4) continue;
    const lens = it.options.map((o) => String(o).length);
    const ai = LETTERS.indexOf(it.answer);
    if (ai < 0) continue;
    const correct = lens[ai];
    const others = lens.filter((_, i) => i !== ai);
    const maxOther = Math.max(...others);
    if (correct > maxOther * 1.6 && correct - maxOther > 25) {
      out.push(`E5 ${RULES.E5}: item ${it.id} answer ${it.answer} is ${correct} characters against`
        + ` a longest distractor of ${maxOther}. Length is a tell.`);
    }
    //  A lone option that is far SHORTER than the rest is the same tell.
    const minLen = Math.min(...lens);
    const others2 = lens.filter((l) => l !== minLen);
    if (others2.length === 3 && minLen * 2.2 < Math.min(...others2)) {
      out.push(`E5 ${RULES.E5}: item ${it.id} has one option far shorter than the other three`);
    }
  }
  return out;
}

// ── E6: disjoint from the study set ────────────────────────────────────────
function ruleFresh(items, existing) {
  const out = [];
  const old = (existing || []).map(norm).filter(Boolean);
  for (const it of items) {
    const s = norm(it.stem);
    for (const o of old) {
      if (!o || !s) continue;
      //  Exact reuse, or one contained in the other, both count.
      if (s === o || (s.length > 60 && o.includes(s)) || (o.length > 60 && s.includes(o))) {
        out.push(`E6 ${RULES.E6}: item ${it.id} reuses a stem already on the study set`);
        break;
      }
    }
  }
  return out;
}

// ── E7: the free response must be the CED shape ────────────────────────────
function ruleFrq(frq) {
  const out = [];
  const spec = blueprint.frq;
  if (!frq) return [`E7 ${RULES.E7}: there is no free response`];
  if (frq.name !== spec.name) out.push(`E7 ${RULES.E7}: the free response is ${JSON.stringify(frq.name)}, the CED names one ${JSON.stringify(spec.name)}`);
  if ((frq.sources || []).length !== spec.sources) {
    out.push(`E7 ${RULES.E7}: ${(frq.sources || []).length} sources, the CED sample supplies ${spec.sources}`);
  }
  const parts = (frq.parts || []).map((p) => p.part);
  if (parts.join('') !== spec.parts.join('')) {
    out.push(`E7 ${RULES.E7}: parts are ${parts.join('')}, the CED shape is ${spec.parts.join('')}`);
  }
  for (const p of frq.parts || []) {
    if (!spec.skill_categories.includes(p.skill)) {
      out.push(`E7 ${RULES.E7}: part ${p.part} is skill category ${p.skill}.`
        + ` Only ${spec.skill_categories.join(' and ')} are assessed on the free response.`);
    }
    if (!String(p.prompt || '').trim()) out.push(`E7 ${RULES.E7}: part ${p.part} has no prompt`);
    if (!Array.isArray(p.rubric) || !p.rubric.length) out.push(`E7 ${RULES.E7}: part ${p.part} has no rubric`);
  }
  if (frq.minutes !== spec.minutes) out.push(`E7 ${RULES.E7}: ${frq.minutes} minutes, the CED says ${spec.minutes}`);
  return out;
}

//  All student-visible text in the bank, for the content rules.
function visibleText(bank) {
  const bits = [];
  for (const it of bank.items || []) {
    bits.push(it.stem, ...(it.options || []), it.explanation);
  }
  const f = bank.frq;
  if (f) {
    bits.push(f.scenario);
    for (const s of f.sources || []) bits.push(s.title, s.body);
    for (const p of f.parts || []) bits.push(p.prompt, ...(p.rubric || []));
  }
  return bits.filter(Boolean).join('\n');
}

function validate(bank, opts = {}) {
  const items = bank.items || [];
  const fail = [];
  fail.push(...ruleBlueprint(items));
  fail.push(...ruleShape(items));
  fail.push(...ruleKey(items));
  fail.push(...ruleDistractors(items));
  fail.push(...ruleFresh(items, opts.existingStems || []));
  fail.push(...ruleFrq(bank.frq));

  const text = visibleText(bank);
  fail.push(...base.ruleEkCodes(text));
  fail.push(...base.ruleExamWeighting(text));
  fail.push(...base.ruleEmDash(text, 'the item bank'));
  fail.push(...base.ruleMojibake(text, 'the item bank'));

  const byRule = {};
  for (const id of Object.keys(RULES)) byRule[id] = fail.filter((f) => f.startsWith(`${id} `));
  return { fail, byRule, rules: RULES };
}

module.exports = {
  RULES, validate, visibleText,
  ruleBlueprint, ruleShape, ruleKey, ruleDistractors, ruleFresh, ruleFrq,
};

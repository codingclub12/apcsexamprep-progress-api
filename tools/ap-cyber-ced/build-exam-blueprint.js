'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CED BLUEPRINT FOR THE 60 QUESTION REPLICA.
//
//  ── THE MISALIGNMENT THIS EXISTS TO FIX ────────────────────────────────────
//  ap-cybersecurity-practice-exam is 40 MCQ distributed BY UNIT, 7/9/10/8/6.
//  The CED publishes no per-unit weighting at all. The only MCQ weighting it
//  states is per SKILL CATEGORY, 25 to 40 percent each for Analyze Risk,
//  Mitigate Risk and Detect Attacks. So a unit-balanced exam can satisfy the
//  published constraint only by accident, and this one does not: skill 3 lives
//  on five topics that sit at the end of four different units.
//
//  ── THE HARD PART, AND WHY IT IS A BLUEPRINT RATHER THAN A GUIDELINE ───────
//  Read off config/cyber-topics.json, which is built from the CED extracts:
//
//      skill 1  Analyze Risk     9 topics
//      skill 2  Mitigate Risk   15 topics
//      skill 3  Detect Attacks   5 topics
//      skill 4  Collaborate      0 topics, correctly, it is not in the MCQ table
//
//  Every category must carry 15 to 24 of the 60 items. Skill 2 is easy across
//  15 topics. Skill 3 has to carry the same load from FIVE, which is 3 to 5
//  items per topic where skill 2 needs barely one. An author working from
//  intuition writes a unit-balanced exam every time, because units are what
//  the site is organised by. This file is the counterweight.
//
//  ── WHAT IS DERIVED AND WHAT IS CHOSEN ─────────────────────────────────────
//  DERIVED: which topics can carry which skill category. That comes from the
//  taxonomy and is not a judgement.
//  CHOSEN: the 20/20/20 split. Any split inside 25 to 40 percent is CED-legal;
//  20/20/20 is 33.3 percent each, the most defensible point in the band, and it
//  leaves no category near an edge where one retagged item breaks compliance.
//
//  Run: node tools/ap-cyber-ced/build-exam-blueprint.js [--check]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const cyberTopics = require('../../lib/cyber-topics');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'config', 'cyber-exam-blueprint.json');

const MCQ_TOTAL = 60;
const BAND = { low: 25, high: 40 };          // CED, per skill category
const SPLIT = { 1: 20, 2: 20, 3: 20 };       // 33.3% each, mid-band
const SKILL_NAMES = { 1: 'Analyze Risk', 2: 'Mitigate Risk', 3: 'Detect Attacks' };

//  ── WHY THIS ALLOCATES BY TOPIC AND NOT BY CATEGORY ───────────────────────
//  The first version of this file spread each category evenly over its own
//  carrier topics. That is the obvious reading and it produced a bad exam:
//  22 of 60 items landed on Unit 1, 37 percent, because 1.2, 1.3 and 1.4 each
//  carry BOTH skill 1 and skill 2 and so were drawn from twice. Nothing in the
//  CED forbids it, since no per-unit weighting is published, but a teacher
//  opening a practice exam that is more than a third Unit 1 will not trust it,
//  and they would be right not to.
//
//  So allocation runs the other way. Every topic gets a share, and categories
//  are then assigned from what each topic can legally carry:
//
//    single-category topics take their own category, no choice involved
//    dual-category topics (1.2, 1.3, 1.4, 2.1) are the adjustment knob
//
//  The binding constraint is skill 3. It lives on five topics, four of which
//  carry nothing else, so 20 skill-3 items means exactly 4 per topic. That is
//  fixed first and everything else is fitted around it.
const ONLY = (t, s) => (t.skill_categories || []).length === 1 && t.skill_categories[0] === s;
const CARRIES = (t, s) => (t.skill_categories || []).includes(s);

function allocate(topics) {
  const rows = new Map();
  const put = (t, items, skill) => {
    const r = rows.get(t.topic) || { topic: t.topic, unit: t.unit_no, title: t.title, items: 0, by_skill: {} };
    r.items += items;
    r.by_skill[skill] = (r.by_skill[skill] || 0) + items;
    rows.set(t.topic, r);
  };

  //  1. Skill 3 first: 5 topics, 4 items each, because there is no slack here.
  const s3 = topics.filter((t) => CARRIES(t, 3));
  const perS3 = SPLIT[3] / s3.length;
  if (!Number.isInteger(perS3)) throw new Error(`skill 3 does not divide evenly over ${s3.length} topics`);
  for (const t of s3) put(t, perS3, 3);

  //  2. Topics that can only be skill 1, and only skill 2. No choice to make.
  const only1 = topics.filter((t) => ONLY(t, 1));
  const only2 = topics.filter((t) => ONLY(t, 2) && !CARRIES(t, 3));
  for (const t of only1) put(t, 2, 1);
  for (const t of only2) put(t, 2, 2);

  //  3. The dual-category topics absorb whatever each category still needs.
  const dual = topics.filter((t) => CARRIES(t, 1) && CARRIES(t, 2) && !CARRIES(t, 3));
  const have = (s) => [...rows.values()].reduce((n, r) => n + (r.by_skill[s] || 0), 0);
  let need1 = SPLIT[1] - have(1);
  let need2 = SPLIT[2] - have(2);
  for (let i = 0; i < dual.length; i += 1) {
    const t = dual[i];
    const take1 = Math.ceil(need1 / (dual.length - i));
    if (take1 > 0) { put(t, take1, 1); need1 -= take1; }
  }
  //  Skill 2 may now be over or under. Trim the single-category skill 2 topics
  //  rather than the dual ones, so no topic is left with zero items.
  for (let i = 0; i < dual.length && need2 > 0; i += 1) {
    const take = Math.ceil(need2 / (dual.length - i));
    put(dual[i], take, 2); need2 -= take;
  }
  while (need2 < 0) {
    const trimmable = only2.map((t) => rows.get(t.topic)).filter((r) => r.items > 1 && (r.by_skill[2] || 0) > 1);
    if (!trimmable.length) throw new Error('cannot trim skill 2 without emptying a topic');
    const r = trimmable.sort((a, b) => b.items - a.items)[0];
    r.items -= 1; r.by_skill[2] -= 1; need2 += 1;
  }

  return [...rows.values()].sort((a, b) => a.topic.localeCompare(b.topic, undefined, { numeric: true }));
}

function build() {
  const topics = cyberTopics.topics();
  const rows = allocate(topics);

  const perTopic = {};
  for (const t of topics) perTopic[t.topic] = 0;
  for (const r of rows) perTopic[r.topic] = r.items;
  const uncovered = Object.entries(perTopic).filter(([, n]) => n === 0).map(([k]) => k);
  if (uncovered.length) throw new Error(`topics with no item: ${uncovered.join(' ')}`);

  //  The CED compliance check runs HERE, in the builder, so a taxonomy change
  //  that pushes a category out of band fails the rebuild rather than shipping.
  const bySkill = { 1: 0, 2: 0, 3: 0 };
  for (const r of rows) for (const [s2, n] of Object.entries(r.by_skill)) bySkill[s2] += n;
  const total = Object.values(bySkill).reduce((a, b) => a + b, 0);
  if (total !== MCQ_TOTAL) throw new Error(`allocation totals ${total}, expected ${MCQ_TOTAL}`);
  for (const s2 of [1, 2, 3]) {
    const pct = 100 * bySkill[s2] / MCQ_TOTAL;
    if (pct < BAND.low || pct > BAND.high) {
      throw new Error(`skill ${s2} is ${pct.toFixed(1)}%, outside the CED band ${BAND.low} to ${BAND.high}`);
    }
  }

  const perUnit = {};
  for (const r of rows) perUnit[r.unit] = (perUnit[r.unit] || 0) + r.items;

  return {
    _source: {
      generated_by: 'tools/ap-cyber-ced/build-exam-blueprint.js',
      built: '2026-09-04',
      ced: 'Section I is 60 multiple-choice, 70 percent, 80 minutes. Section II is one free-response, 30 percent, 50 minutes.',
      weighting_rule: `each skill category is ${BAND.low} to ${BAND.high} percent of the multiple-choice section`,
      not_published: 'The CED states NO per-unit or per-topic exam weighting. Any such number is fabricated and rule R2 refuses it.',
      skill_4: 'Collaborate does not appear in the CED MCQ weighting table and carries no topics here. It is deliberately absent.',
      allocation: 'Topic-first, then categories assigned from what each topic can carry. Skill 3 is fixed first because it lives on five topics and has no slack.',
    },
    course: 'ap-cybersecurity',
    mcq_total: MCQ_TOTAL,
    band: BAND,
    split: SPLIT,
    skill_names: SKILL_NAMES,
    by_skill: bySkill,
    percent: Object.fromEntries(Object.entries(bySkill).map(([k, v]) => [k, +(100 * v / MCQ_TOTAL).toFixed(1)])),
    plan: rows,
    per_topic: perTopic,
    per_unit: perUnit,
    uncovered_topics: uncovered,
    frq: {
      count: 1,
      name: 'Device Security Analysis',
      minutes: 50,
      weight_percent: 30,
      sources: 6,
      parts: ['A', 'B', 'C', 'D', 'E'],
      skill_categories: [2, 3],
      note: 'Only skill categories 2 and 3 are assessed on the free-response. An FRQ prompt testing category 1 or 4 is mislabeled however good the item is.',
    },
  };
}

function main() {
  const built = build();
  const json = `${JSON.stringify(built, null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const on = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (on !== json) { console.error('config/cyber-exam-blueprint.json does not match a rebuild.'); process.exit(1); }
    console.log('config/cyber-exam-blueprint.json matches a rebuild.');
    return;
  }
  fs.writeFileSync(OUT, json);
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
  const bs = { 1: 0, 2: 0, 3: 0 };
  for (const r of built.plan) for (const [k, n] of Object.entries(r.by_skill)) bs[k] += n;
  for (const s of [1, 2, 3]) {
    console.log(`  skill ${s} ${SKILL_NAMES[s].padEnd(15)} ${bs[s]} items (${(100 * bs[s] / MCQ_TOTAL).toFixed(1)}%)`);
  }
  console.log('  per topic: ' + built.plan.map((r) => r.topic + 'x' + r.items).join(' '));
  console.log(`  per unit: ${Object.entries(built.per_unit).map(([u, n]) => `U${u}=${n}`).join(' ')}`);
  console.log(`  topics with no item: ${built.uncovered_topics.length ? built.uncovered_topics.join(' ') : 'none'}`);
}

if (require.main === module) main();
module.exports = { build, MCQ_TOTAL, BAND, SPLIT };

#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the canonical AP Cybersecurity taxonomy, and a SECOND opinion on it.
//
//  ── WHAT IS BEING GUARDED ───────────────────────────────────────────────────
//  data/cyber-topics.json is now the single authority for what each of the 24
//  CED topics is called, where it lives, and which manifest row denominates it.
//  Every generator and every sheet downstream reads it, which is exactly why a
//  quiet error in it would be worse than no file at all: 24 pages would be
//  wrong in the same direction and every check would agree with itself.
//
//  ── THE RE-DERIVE, AND WHY IT IS A DIFFERENT IMPLEMENTATION ─────────────────
//  The builder reads the framework pages: it finds "TOPIC 3.2", then takes the
//  wrapped lines up to "Required Course Content" as the title. This suite never
//  looks at those headers. It reads the UNIT AT A GLANCE tables instead, which
//  are a different part of the CED laid out in a different shape, and it
//  enumerates the topic NUMBER space from the learning objective codes
//  (2.1.A, 3.4.B) rather than from any header at all.
//
//  Two implementations, two anchors, and the diff has to be zero. That is the
//  point of a re-derive: a bug in how one of them reads a column break shows up
//  as a mismatch instead of as a plausible title.
//
//  HONEST LIMIT, stated rather than buried. The glance tables cover Units 2 to
//  5, which is 19 of the 24 topics. The Unit 1 dump does not carry its glance
//  table, so Unit 1's five titles are re-derived by a second algorithm over the
//  same text: scanning UP from each "Required Course Content" boundary instead
//  of DOWN from the header. That catches a boundary or furniture bug, which is
//  the failure mode these dumps actually have, and it would NOT catch a title
//  that is wrong in the source dump itself. Nineteen of 24 are cross-anchored;
//  five are cross-implemented. The difference is written down so nobody later
//  reads "re-derived" as stronger than it is.
//
//  ── ALSO GUARDED: THE MANIFEST ROWS ─────────────────────────────────────────
//  Seeding cyber visit rows moves a live number (lesson completion), so the
//  shape of those rows is pinned here: 24 of them, one per topic, and every one
//  filed under a lesson id the course config already lists. That last check is
//  the one that matters. lib/gradebook-contract.js builds its lesson grid from
//  the manifest as well as from the config, so a row naming lesson "3.1" (a
//  topic number the site does not teach as a page) would add a phantom column
//  to every cyber gradebook. It is filed under 3.1a instead, and this asserts
//  it stays that way.
//
//  Offline: no network, no secrets, no browser, no database.
//
//  Run: npm run smoke:cybertopics
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cyberTopics = require('../lib/cyber-topics');
const mojibake = require('../lib/mojibake');
const { build, serialize } = require('../tools/ap-cyber-ced/build-topics');
const { SKILL_CATEGORIES, EXPECTED_TOPICS } = require('../tools/ap-cyber-ced/topics-parse');
const { COURSES } = require('../utils');

const ROOT = path.join(__dirname, '..');
const U1 = path.join(ROOT, 'tools', 'ap-cyber-ced', 'CED-UNIT1-EXTRACT.txt');
const U25 = path.join(ROOT, 'tools', 'ap-cyber-ced', 'CED-UNITS-2-5-EXTRACT.txt');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

const doc = cyberTopics.load();
const titles = new Map(doc.topics.map((t) => [t.topic, t.title]));

// ─────────────────────────────────────────────────────────────────────────────
//  IMPLEMENTATION B1: the topic number space, from learning objective codes.
//  Nothing here reads a topic header or a title. A learning objective code is
//  "<unit>.<topic>.<letter>", so the set of topics is whatever the codes name,
//  and it must be the 24 the CED has.
// ─────────────────────────────────────────────────────────────────────────────
function topicNumbersFromCodes() {
  const found = new Set();
  for (const file of [U1, U25]) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\b([1-5])\.(\d)\.[A-Z]\b/g)) found.add(`${m[1]}.${m[2]}`);
  }
  return [...found].sort();
}

// ─────────────────────────────────────────────────────────────────────────────
//  IMPLEMENTATION B2: titles from the UNIT AT A GLANCE tables (Units 2 to 5).
//
//  The glance table writes a topic as its number followed by the title, wrapped
//  over as many lines as the column needed, and then the learning objectives.
//  One row (4.2 Authentication) puts the title and its first objective on the
//  SAME line, so a line is cut at an embedded objective code and the title ends
//  there. Without that cut, 4.2's title comes back as "Authentication" plus
//  half a sentence about hashes, which is the kind of near-miss a re-derive
//  exists to surface.
// ─────────────────────────────────────────────────────────────────────────────
function titlesFromGlanceTables() {
  const lines = fs.readFileSync(U25, 'utf8').split('\n');
  const LO_ANYWHERE = /\s*\b\d\.\d\.[A-Z]\b/;
  const cut = (s) => {
    const m = LO_ANYWHERE.exec(s);
    return (m ? s.slice(0, m.index) : s).trim();
  };

  const out = new Map();
  for (let i = 0; i < lines.length; i++) {
    if (!/^UNIT AT A GLANCE/.test(lines[i].trim())) continue;

    //  The glance table runs until the framework pages begin.
    for (let j = i + 1; j < lines.length; j++) {
      if (/^TOPIC\s+\d\.\d/.test(lines[j].trim())) break;
      const head = /^(\d\.\d)\s+(\S.*)$/.exec(lines[j]);
      if (!head) continue;

      const parts = [];
      const take = (line) => {
        parts.push(cut(line));
        return !LO_ANYWHERE.test(line);        // stop once objectives start
      };
      if (take(head[2])) {
        for (let k = j + 1; k < lines.length; k++) {
          const t = lines[k];
          if (!t.trim()) break;
          if (/^\s*\d\.\d\.[A-Z]/.test(t)) break;
          if (/^\s*\d\.\d\s+\S/.test(t)) break;
          if (!take(t)) break;
        }
      }
      const title = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      if (title && !out.has(head[1])) out.set(head[1], title);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  IMPLEMENTATION B3: Unit 1 titles, read from the bottom boundary upward.
//
//  The builder walks DOWN from "TOPIC 1.3" to "Required Course Content". This
//  walks UP from "Required Course Content" and stops at the first line that is
//  a topic header, taking what lies between. Same text, opposite direction, so
//  an off-by-one at either boundary and any furniture mistake disagree.
// ─────────────────────────────────────────────────────────────────────────────
function unit1TitlesUpward() {
  const lines = fs.readFileSync(U1, 'utf8').split('\n');
  const furniture = (t) => !t || /^\d+$/.test(t) || /Course Framework/.test(t)
    || /^return to contents/.test(t) || t === 'UNIT';

  const out = new Map();
  lines.forEach((line, i) => {
    if (!/^Required Course Content/.test(line.trim())) return;
    const parts = [];
    for (let k = i - 1; k >= 0; k--) {
      const t = lines[k].trim();
      const header = /^TOPIC\s+(\d)\.(\d)\s*$/.exec(t);
      if (header) {
        const topic = `${header[1]}.${header[2]}`;
        if (parts.length && !out.has(topic)) {
          out.set(topic, parts.reverse().join(' ').replace(/\s+/g, ' ').trim());
        }
        return;
      }
      if (!furniture(t)) parts.push(t);
      //  A boundary with no header above it inside a plausible distance is a
      //  parse failure, not a topic. Six lines is longer than the longest
      //  wrapped title in the file (four lines).
      if (parts.length > 6) return;
    }
  });
  return out;
}

console.log('\nCanonical AP Cybersecurity taxonomy\n');

// ── 1. The file itself ───────────────────────────────────────────────────────
check('the taxonomy carries the 24 CED topics, in CED order', () => {
  assert.deepStrictEqual(doc.topics.map((t) => t.topic), EXPECTED_TOPICS);
});

check('there is no topic 2.5, 3.6 or 4.5', () => {
  for (const ghost of ['2.5', '3.6', '4.5']) {
    assert.ok(!titles.has(ghost), `${ghost} is not a CED topic and must not be in the taxonomy`);
  }
});

check('every title is plain ASCII and free of mojibake', () => {
  for (const t of doc.topics) {
    assert.ok(!/[^\x20-\x7e]/.test(t.title), `${t.topic} title is not plain ASCII: ${JSON.stringify(t.title)}`);
    assert.deepStrictEqual(mojibake.analyze(t.title), [], `${t.topic} title carries mojibake`);
  }
});

check('no title picked up page furniture', () => {
  for (const t of doc.topics) {
    assert.ok(!/TOPIC|Required Course Content|return to contents|Course Framework/i.test(t.title),
      `${t.topic}: ${JSON.stringify(t.title)}`);
  }
});

check('every topic names at least one real skill category', () => {
  for (const t of doc.topics) {
    assert.ok(t.skill_categories.length, `${t.topic} names none`);
    for (const c of t.skill_categories) {
      assert.ok(SKILL_CATEGORIES[c], `${t.topic} names category ${c}, which does not exist`);
    }
  }
});

check('the skill categories are the CED\'s three, by number', () => {
  assert.deepStrictEqual(doc.skill_categories,
    { 1: 'Analyze Risk', 2: 'Mitigate Risk', 3: 'Detect Attacks' });
});

//  Pinned deliberately. Topic 1.1's SUGGESTED SKILLS block ends at a page break
//  in this dump, and 1.2 through 1.4 list two categories, so 1.1 may well list a
//  second one on a page the dump does not carry. Recording what the text says
//  and pinning it means a re-extraction that disagrees arrives as a diff to read
//  rather than as a silent change of course content.
check('topic 1.1 lists category 1 only, which is a known dump limit', () => {
  assert.deepStrictEqual(cyberTopics.topic('1.1').skill_categories, [1]);
  assert.ok(doc._source.known_limits.some((l) => /1\.1/.test(l) && /page break/.test(l)),
    'the limit must stay written down next to the data');
});

check('slugs and manifest item ids are unique', () => {
  const slugs = doc.topics.map((t) => t.slug);
  const items = doc.topics.map((t) => t.manifest.item_id);
  assert.strictEqual(new Set(slugs).size, slugs.length, 'two topics share a slug');
  assert.strictEqual(new Set(items).size, items.length, 'two topics share a manifest item id');
});

check('the committed file is exactly what a rebuild produces', () => {
  const rebuilt = serialize(build());
  const committed = fs.readFileSync(cyberTopics.FILE, 'utf8');
  assert.strictEqual(committed, rebuilt,
    'data/cyber-topics.json is hand-edited or stale; run node tools/ap-cyber-ced/build-topics.js');
});

// ── 2. The re-derive ─────────────────────────────────────────────────────────
check('B1: the topic numbers re-derived from objective codes are the same 24', () => {
  assert.deepStrictEqual(topicNumbersFromCodes(), EXPECTED_TOPICS.slice().sort());
});

check('B2: 19 Units 2-5 titles re-derived from the glance tables diff to zero', () => {
  const glance = titlesFromGlanceTables();
  assert.strictEqual(glance.size, 19, `derived ${glance.size} glance titles, expected 19`);
  const diffs = [];
  for (const [topic, title] of glance) {
    if (titles.get(topic) !== title) diffs.push(`${topic}: glance ${JSON.stringify(title)} vs taxonomy ${JSON.stringify(titles.get(topic))}`);
  }
  assert.deepStrictEqual(diffs, []);
});

check('B3: the 5 Unit 1 titles re-derived upward diff to zero', () => {
  const upward = unit1TitlesUpward();
  assert.strictEqual(upward.size, 5, `derived ${upward.size} Unit 1 titles, expected 5`);
  const diffs = [];
  for (const [topic, title] of upward) {
    if (titles.get(topic) !== title) diffs.push(`${topic}: upward ${JSON.stringify(title)} vs taxonomy ${JSON.stringify(titles.get(topic))}`);
  }
  assert.deepStrictEqual(diffs, []);
});

check('the re-derive covers all 24 topics between them', () => {
  const covered = new Set([...titlesFromGlanceTables().keys(), ...unit1TitlesUpward().keys()]);
  assert.deepStrictEqual([...covered].sort(), EXPECTED_TOPICS.slice().sort());
});

//  The 1.3 versus 1.4 swap is the specific error this whole file exists to
//  prevent, so it is asserted by name rather than left to the diff. The site
//  calls 1.3 "Wireless Security"; the CED does not.
check('1.3 is Public Networks and 1.4 is AI-Based attacks, per the CED', () => {
  assert.strictEqual(cyberTopics.titleOf('1.3'), 'Best Practices for Public Networks');
  assert.strictEqual(cyberTopics.titleOf('1.4'), 'AI-Based Cybersecurity Attacks');
  assert.ok(!/wireless/i.test(cyberTopics.titleOf('1.3')), 'the site name is not the CED name');
});

// ── 3. Handles and lesson ids ────────────────────────────────────────────────
check('every topic resolves to at least one live lesson handle', () => {
  const orphans = doc.topics.filter((t) => !t.handles.length).map((t) => t.topic);
  assert.deepStrictEqual(orphans, [], `topics with no live page: ${orphans.join(', ')}`);
});

check('CED 3.1 is the only topic taught across two lesson pages', () => {
  const split = doc.topics.filter((t) => t.lesson_ids.length > 1).map((t) => t.topic);
  assert.deepStrictEqual(split, ['3.1']);
  assert.deepStrictEqual(cyberTopics.topic('3.1').lesson_ids, ['3.1a', '3.1b']);
});

check('a handle resolves back to its topic, and a lesson id to its topic', () => {
  assert.strictEqual(cyberTopics.topicOfHandle('ap-cyber-unit-3-lesson-2').topic, '3.1');
  assert.strictEqual(cyberTopics.topicOfLesson('3.1b').topic, '3.1');
  assert.strictEqual(cyberTopics.topicOfHandle('ap-cybersecurity-unit-1-wireless-security').topic, '1.3');
  assert.strictEqual(cyberTopics.topicOfHandle('not-a-page'), null);
});

check('asking for a topic the CED does not have throws', () => {
  assert.throws(() => cyberTopics.titleOf('3.6'), /no CED topic 3\.6/);
});

// ── 4. The manifest rows this taxonomy asks for ──────────────────────────────
const rows = cyberTopics.manifestRows();

check('the taxonomy asks for exactly 24 manifest rows, all visit rows', () => {
  assert.strictEqual(rows.length, 24);
  assert.deepStrictEqual([...new Set(rows.map((r) => r.item_type))], ['visit']);
  assert.deepStrictEqual([...new Set(rows.map((r) => r.course))], ['ap-cybersecurity']);
});

check('every manifest row is filed under a lesson the course config lists', () => {
  const configured = new Set();
  for (const cfg of Object.values(COURSES['ap-cybersecurity'].units)) {
    for (const lesson of cfg.lessons) configured.add(lesson);
  }
  const phantom = rows.filter((r) => !configured.has(r.lesson_id)).map((r) => `${r.item_id} -> ${r.lesson_id}`);
  assert.deepStrictEqual(phantom, [],
    'a manifest row naming a lesson the config does not list adds a phantom gradebook column');
});

check('topic 3.1 files under 3.1a, and no row names lesson "3.1"', () => {
  assert.strictEqual(rows.find((r) => r.item_id === '3.1-visit').lesson_id, '3.1a');
  assert.ok(!rows.some((r) => r.lesson_id === '3.1'), 'lesson "3.1" is not a page the site teaches');
});

check('the seed builds those 24 rows and nothing else for cyber', () => {
  const { buildRows } = require('../scripts/seed-manifest');
  const cyber = buildRows().filter((r) => r.course === 'ap-cybersecurity');
  assert.strictEqual(cyber.length, 24, `the seed builds ${cyber.length} cyber rows`);
  assert.deepStrictEqual(
    cyber.map((r) => r.item_id).sort(),
    doc.topics.map((t) => `${t.topic}-visit`).sort()
  );
});

console.log('');
if (failures) { console.error(`${failures} FAILED`); process.exit(1); }
console.log('OK - the taxonomy verifies, and a second implementation agrees with it');

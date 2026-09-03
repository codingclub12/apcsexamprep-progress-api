'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CED TOPIC PARSER, IMPLEMENTATION A: read the topic headers.
//
//  ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//  The AP Cybersecurity topic mapping has been living in page bodies, and page
//  bodies disagree with each other. The recurring symptom is the 1.3 versus 1.4
//  swap: the site calls 1.3 "Wireless Security" while the CED calls it "Best
//  Practices for Public Networks", so every session that read a page to learn
//  what 1.3 is learned something different from the session before it.
//
//  So the titles come from the CED text and from nothing else. Not from page
//  HTML, not from a handle, not from memory.
//
//  ── WHAT IT READS ───────────────────────────────────────────────────────────
//  tools/ap-cyber-ced/CED-UNIT1-EXTRACT.txt and CED-UNITS-2-5-EXTRACT.txt, the
//  cleaned text dumps of the course framework pages. The CED itself ships as a
//  file with a .pdf extension and no PDF header, so pdfplumber and pdftotext
//  both fail on it; text is the only form anything here can read.
//
//  ── THE SHAPE IT RELIES ON ──────────────────────────────────────────────────
//  Every one of the 24 topics opens the same way:
//
//      TOPIC 2.2
//      Physical
//      Vulnerabilities
//      and Attacks
//      Required Course Content
//
//  The title is wrapped across as many lines as the PDF column needed, so it is
//  read as "every line between the TOPIC header and Required Course Content"
//  rather than as a fixed number of lines. Two topics (2.3 and 5.3) have no
//  trailing space after the topic number and one (2.1) fits its title on a
//  single line; anchoring on the boundary rather than on the layout absorbs all
//  three without a special case.
//
//  PAGE FURNITURE IS DROPPED, NOT TRUSTED. The dumps carry running heads
//  ("AP Cybersecurity . Course Framework return to contents 37") and bare page
//  numbers, and one of them lands inside a title block. A running head is
//  recognised by its own text, and this is the one place where the mojibake in
//  these dumps matters: the running head in the Unit 1 file reads
//  "AP Cybersecurity<mojibake>Course Framework", so it is matched on the two
//  words that survive intact rather than on the whole line.
//
//  ── SKILL CATEGORIES ────────────────────────────────────────────────────────
//  The two dumps write the SUGGESTED SKILLS block differently, because the PDF
//  lays it out differently in Unit 1 than in Units 2 to 5:
//
//      Unit 1        SUGGESTED SKILLS / 1.A / <the skill sentence>
//      Units 2 to 5  SUGGESTED SKILLS / 1 / Analyze Risk
//
//  Both name the same thing: which of the numbered skill categories the topic
//  can assess. A code like 1.A carries its category in the leading digit, and
//  the numbered form carries it directly, so both are read down to the set of
//  category numbers. Nothing here invents a category a topic does not list.
//
//  This module is deliberately the ONLY thing in the tree that knows what the
//  CED text looks like. Everything downstream reads data/cyber-topics.json.
// ─────────────────────────────────────────────────────────────────────────────

//  The three skill categories the topic-level SUGGESTED SKILLS blocks name.
//  Numbers are the CED's, not an index into this object.
const SKILL_CATEGORIES = {
  1: 'Analyze Risk',
  2: 'Mitigate Risk',
  3: 'Detect Attacks',
};

const CATEGORY_BY_NAME = new Map(
  Object.entries(SKILL_CATEGORIES).map(([n, name]) => [name.toLowerCase(), Number(n)])
);

//  The 24 topics the CED has, written down so a parse that finds 23 or 25 is a
//  failure rather than a new fact. There is no topic 2.5, no 3.6 and no 4.5.
const EXPECTED_TOPICS = [
  '1.1', '1.2', '1.3', '1.4', '1.5',
  '2.1', '2.2', '2.3', '2.4',
  '3.1', '3.2', '3.3', '3.4', '3.5',
  '4.1', '4.2', '4.3', '4.4',
  '5.1', '5.2', '5.3', '5.4', '5.5', '5.6',
];

const TOPIC_HEADER = /^TOPIC\s+(\d)\.(\d)\s*$/;
const BOUNDARY = /^Required Course Content/;

//  A line that is part of the page, not part of the title. The running head is
//  matched on "Course Framework", which survives the encoding damage in these
//  dumps intact; "AP Cybersecurity" does not, because the separator that
//  follows it is corrupted.
function isFurniture(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^\d+$/.test(t)) return true;                    // a bare page number
  if (/Course Framework/.test(t)) return true;          // the running head
  if (/^return to contents/.test(t)) return true;
  if (/^UNIT$/.test(t)) return true;
  return false;
}

//  Collapse the wrapped lines of one title into the single line a human would
//  write. Hyphenation is left alone: "AI-Based" is hyphenated in the CED
//  itself, not by the column break, and there is no way to tell the two apart
//  from the text, so joining never removes a hyphen.
function joinTitle(lines) {
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Every topic block in one CED extract, in file order.
 *
 * @param {string} text the extract, decoded as UTF-8
 * @returns {Array<{topic: string, unit_no: number, title: string,
 *                  skill_categories: number[], line: number}>}
 */
function parseTopics(text) {
  const lines = text.split('\n');
  const starts = [];
  lines.forEach((line, i) => {
    const m = TOPIC_HEADER.exec(line.trim());
    if (m) starts.push({ topic: `${m[1]}.${m[2]}`, unit_no: Number(m[1]), at: i });
  });

  return starts.map((s, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1].at : lines.length;

    //  Title: from the header to "Required Course Content", furniture removed.
    const titleLines = [];
    for (let i = s.at + 1; i < end; i++) {
      if (BOUNDARY.test(lines[i].trim())) break;
      if (!isFurniture(lines[i])) titleLines.push(lines[i].trim());
    }

    return {
      topic: s.topic,
      unit_no: s.unit_no,
      title: joinTitle(titleLines),
      skill_categories: parseSkills(lines.slice(s.at, end)),
      line: s.at + 1,
    };
  });
}

//  The SUGGESTED SKILLS block for one topic, read down to category numbers.
//  Both dump shapes are accepted, and a page number sitting in the block (69,
//  95, 120, 141 all do) is ignored because a category is a single digit and
//  every category that exists is listed in SKILL_CATEGORIES.
function parseSkills(block) {
  const at = block.findIndex((l) => /^SUGGESTED SKILLS/.test(l.trim()));
  if (at < 0) return [];

  const found = new Set();
  //  THE BLOCK ENDS AT THE FIRST BLANK LINE, and that boundary is load-bearing
  //  rather than tidy. What follows the block is the running foot, and in the
  //  Units 2 to 5 dump the running foot is the unit banner:
  //
  //      SUGGESTED SKILLS / 1 / Analyze Risk / <blank> / Securing Spaces / UNIT / 2
  //
  //  A reader that kept going would take the "2" under "UNIT" for skill
  //  category 2 and credit Topic 2.2 with Mitigate Risk, which the CED does not
  //  list for it. Every one of the 24 blocks is terminated by a blank line, so
  //  stopping there needs no per-unit special case.
  for (const raw of block.slice(at + 1)) {
    const t = raw.trim();
    if (!t) break;

    //  Unit 1 shape: a skill code, whose leading digit is the category.
    const code = /^(\d)\.[A-Z]$/.exec(t);
    if (code && SKILL_CATEGORIES[Number(code[1])]) { found.add(Number(code[1])); continue; }

    //  Units 2 to 5 shape: the bare category number.
    if (/^\d$/.test(t) && SKILL_CATEGORIES[Number(t)]) { found.add(Number(t)); continue; }

    //  Units 2 to 5 also print the category name next to the number. Reading
    //  both and requiring them to agree is what catches a block that lists two
    //  names and one number.
    const named = CATEGORY_BY_NAME.get(t.toLowerCase());
    if (named) found.add(named);
  }
  return [...found].sort((a, b) => a - b);
}

module.exports = { parseTopics, parseSkills, SKILL_CATEGORIES, EXPECTED_TOPICS, joinTitle, isFurniture };

'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CYBER UNIT 3 RENUMBERING: site topic numbers -> Fall 2026 CED topic numbers.
//
//  Spec and the reasoning behind every choice here:
//  docs/cyber-unit3-renumbering-spec.md
//
//  WHAT IS BEING FIXED
//  Unit 3's lesson bodies already cite the correct CED EK codes. Only the topic
//  NUMBERS are wrong: site 3.3 and 3.4 are each other's CED topics, site 3.6 is
//  CED 3.2, and site 3.1 and 3.2 are two halves of CED 3.1. So this is a
//  renumbering, not a rewrite, and no prose changes.
//
//  ── THE TRAP ────────────────────────────────────────────────────────────────
//  Three things on a page look alike and only two of them move:
//
//    3.3        plain topic ref     renumber
//    3.3.1      section number      renumber
//    3.4.B.2    EK or LO reference  LEAVE ALONE, already correct
//
//  One page holds both forms of the same digits. ap-cyber-unit-3-lesson-3 has
//  41 plain `3.3` refs that must become `3.4`, and 15 EK refs already reading
//  `3.4.A.1` that must not move. A find and replace of 3.3 to 3.4 corrupts the
//  page in both directions at once: it renumbers the EKs that were right and
//  then cannot tell its own output from its input.
//
//  The discriminator is the character after the SECOND dot. A digit means a
//  section number. A letter A to E means an EK. Everything is matched in ONE
//  pass with a callback, never as a sequence of replaces, because 3.3 -> 3.4
//  followed by 3.4 -> 3.3 ping-pongs every value back to where it started.
//
//  ── WHY 3.1 SPLITS INTO 3.1a AND 3.1b ───────────────────────────────────────
//  CED 3.1 is one topic taught over two pages. The gradebook keys a column on
//  `${lesson}|${activity}` and takes the grade of record per (student, lesson,
//  activity), so two pages sharing the id `3.1` would collapse into one column
//  per activity and let a better score on one part mask the other. Two ids keep
//  eight honest columns.
//
//  Sections take the same a/b prefix rather than continuing part 1's numbering.
//  Both pages number their sections 1 to 11 today, so continuing would need an
//  offset map that silently rots the first time either page gains a section.
//  A prefix swap has no arithmetic in it and cannot drift.
//
//  Students still read "Topic 3.1" on both pages, because both ARE topic 3.1.
//  The parts are disambiguated by the "Part 1 of 2" label and by the section
//  prefix, not by lying about the topic number.
// ─────────────────────────────────────────────────────────────────────────────

//  Old site topic -> new CED topic. A bijection on purpose: it is what makes a
//  cross-reference from one lesson to another remappable without ambiguity.
const SECTION_MAP = {
  '3.1': '3.1a',   // Network Fundamentals and Attack Surface, CED 3.1 LO B/C
  '3.2': '3.1b',   // Network Attacks,                         CED 3.1 LO A
  '3.3': '3.4',    // Firewalls and Packet Filtering,          CED 3.4
  '3.4': '3.3',    // Network Segmentation and VLANs,          CED 3.3
  '3.5': '3.5',    // IDS, IPS and SIEM,                       CED 3.5
  '3.6': '3.2',    // Network Security Policies and Wireless,  CED 3.2
};

//  What a student should READ as the topic number. The 3.1 pair both say 3.1,
//  because both are CED topic 3.1. Used for a page's own plain refs.
const DISPLAY_MAP = {
  '3.1': '3.1', '3.2': '3.1', '3.3': '3.4',
  '3.4': '3.3', '3.5': '3.5', '3.6': '3.2',
};

//  Target handle -> where its body comes from, and what it becomes.
//  A three-cycle over lessons 3, 5 and 6; lessons 1, 2 and 4 keep their bodies.
const PLAN = [
  { target: 1, source: 1, oldTopic: '3.1', lessonId: '3.1a', part: 'Part 1 of 2' },
  { target: 2, source: 2, oldTopic: '3.2', lessonId: '3.1b', part: 'Part 2 of 2' },
  { target: 3, source: 6, oldTopic: '3.6', lessonId: '3.2',  part: null },
  { target: 4, source: 4, oldTopic: '3.4', lessonId: '3.3',  part: null },
  { target: 5, source: 3, oldTopic: '3.3', lessonId: '3.4',  part: null },
  { target: 6, source: 5, oldTopic: '3.5', lessonId: '3.5',  part: null },
];

const ACTIVITIES = ['', '-exercise-1', '-exercise-2', '-lab', '-quiz'];

const handle = (n, suffix) => `ap-cyber-unit-3-lesson-${n}${suffix}`;

//  Matches every 3.N token and captures what follows, so ONE pass can decide
//  per hit which of the three shapes it is. `(?![\w.-])` stops 3.1 matching
//  inside 3.10 or a version string.
const TOKEN = /\b3\.([1-6])(\.([A-E])\b|\.(\d+[a-z]?)\b|(?![\w.-]))/g;

//  A FOURTH shape, found only after reading all 61 cross-references by hand.
//
//  Some plain refs are ALREADY CED numbers, because the author was citing the
//  CED rather than the site: "per CED 3.2.A.3", "the CED 3.2 core covers", and
//  the dual label "Topic 3.6 / CED 3.2" that several pages carry. Remapping
//  those breaks a citation that was correct, and it is invisible afterwards
//  because the result is still a plausible-looking number.
//
//  The discriminator is the word CED immediately before the reference. Checked
//  against every occurrence in Unit 3: every CED-prefixed ref is a real CED
//  citation, and no site-numbered ref is preceded by that word.
const CED_PREFIXED = /(?:CED|College Board)\s*(?:Ref\s*)?[(:]?\s*$/i;

//  The dual label collapses once the page number IS the CED number.
//  "Topic 3.6 / CED 3.2" -> "Topic 3.2". Run after the token pass, when both
//  halves already read the same number.
function collapseDualLabels(body) {
  return body.replace(
    /Topic\s+(3\.\d[ab]?)\s*\/\s*CED\s+\1\b/g,
    'Topic $1',
  );
}

/**
 * Renumber one page body.
 *
 * @param {string} body      raw Shopify body_html
 * @param {string} oldTopic  the page's own current topic, e.g. '3.3'
 * @returns {{body: string, counts: object}}
 */
function renumberBody(body, oldTopic) {
  const counts = {
    plainOwn: 0, plainCross: 0, section: 0, ekPreserved: 0, cedPreserved: 0,
  };

  const out = body.replace(TOKEN, (match, digit, _tail, ekLetter, sectionNum, offset) => {
    const oldRef = `3.${digit}`;

    // Already a CED citation. Preserving these is the whole reason the fourth
    // shape exists; see CED_PREFIXED above.
    if (CED_PREFIXED.test(body.slice(Math.max(0, offset - 24), offset))) {
      counts.cedPreserved++;
      return match;
    }

    // EK or LO reference. Already correct against the CED; never touched.
    if (ekLetter) { counts.ekPreserved++; return match; }

    // Section number: 3.3.1, 3.3.5b. Always takes the bijective prefix so the
    // two halves of 3.1 keep distinct section namespaces.
    if (sectionNum) {
      counts.section++;
      return `${SECTION_MAP[oldRef]}.${sectionNum}`;
    }

    // Plain topic reference. A page talking about ITSELF shows the CED topic
    // number a student should read. A page pointing at ANOTHER lesson uses the
    // bijective form, because "3.1" alone cannot say which half it means.
    if (oldRef === oldTopic) { counts.plainOwn++; return DISPLAY_MAP[oldRef]; }
    counts.plainCross++;
    return SECTION_MAP[oldRef];
  });

  return { body: out, counts };
}

/**
 * Rewrite data-lesson-id to the new id. The attribute is the authority for
 * graded attempts, so it is set explicitly rather than inferred from the handle.
 */
function setLessonId(body, lessonId) {
  return body.replace(/(data-lesson-id=["'])([^"']*)(["'])/g, `$1${lessonId}$3`);
}

/**
 * The acceptance test, and the reason this is checkable at all: after the
 * transform, a page's plain topic number and its EK topic numbers must agree.
 * ap-cyber-unit-3-lesson-5 must read "Topic 3.4" and cite only 3.4.* EKs.
 *
 * Returns [] when the page is consistent, otherwise a list of complaints.
 */
function checkConsistency(body, expectedTopic, lessonId) {
  const problems = [];
  const info = [];
  const base = expectedTopic.replace(/[ab]$/, '');

  //  A page MUST cite its own topic's EKs. It MAY cite another topic's, and
  //  every such case in Unit 3 was read and is a real cross-reference: the
  //  firewall lesson cites 3.3.A.1 because the DMZ it places is a segment, and
  //  the detection lesson cites 3.1.A.4 because Smurf is the attack it detects.
  //  Failing those would be failing the pages for being well written.
  const eks = new Set();
  for (const m of body.matchAll(/\b3\.([1-6])\.[A-E]\b/g)) eks.add(`3.${m[1]}`);
  if (eks.size && !eks.has(base)) {
    problems.push(`cites no EK from its own topic ${base} (found ${[...eks].join(', ')})`);
  }
  for (const ek of eks) if (ek !== base) info.push(`cross-topic EK ${ek}`);

  const stale = new Set();
  for (const m of body.matchAll(/\b3\.([1-6])\.(\d+[a-z]?)\b/g)) stale.add(`3.${m[1]}`);
  for (const s of stale) {
    if (s !== expectedTopic) problems.push(`section prefix ${s}, expected ${expectedTopic}`);
  }

  const ids = new Set(
    [...body.matchAll(/data-lesson-id=["']([^"']*)["']/g)].map((m) => m[1]),
  );
  for (const id of ids) {
    if (id !== lessonId) problems.push(`data-lesson-id ${id}, expected ${lessonId}`);
  }

  return { problems, info };
}

/** The whole transform for one page, in the order the steps must run. */
function transformPage(body, oldTopic, lessonId) {
  const { body: renumbered, counts } = renumberBody(body, oldTopic);
  const withIds = setLessonId(renumbered, lessonId);
  return { body: collapseDualLabels(withIds), counts };
}

module.exports = {
  SECTION_MAP, DISPLAY_MAP, PLAN, ACTIVITIES,
  handle, renumberBody, setLessonId, collapseDualLabels,
  transformPage, checkConsistency,
};

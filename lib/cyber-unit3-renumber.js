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

// ─── THE ucnav RAIL ──────────────────────────────────────────────────────────
//
//  The sticky in-unit navigation. Surveying all 30 pages turned up less work
//  than expected and one real bug:
//
//    - only the five LESSON pages 1 to 5 carry a rail at all
//    - the 24 activity pages carry none, so they need no rail work
//    - every rail lists five topics, 3.1 to 3.5
//    - lesson-6, the wireless lesson, appears in NO rail and has none of its
//      own, so today it is unreachable from the in-unit navigation
//
//  That last one is pre-existing and is why the Unit 3 hub links lesson-6 and
//  nothing else. Rebuilding the rail fixes it rather than carrying it forward.
//
//  The rail cannot be token-substituted. Its labels are positional: after the
//  bodies move, position N links to lesson-N and must READ the topic taught
//  there. Running the renumbering over the old rail would produce the right
//  numbers in the wrong order (3.1a, 3.1b, 3.4, 3.3, 3.5, 3.2), so the rail is
//  regenerated wholesale and the token pass never sees it.
//
//  Rail labels use 3.1a and 3.1b rather than "3.1" twice. The strip is one line
//  of compact text with no room to say "Part 1 of 2", two entries reading 3.1
//  would be a coin flip, and a/b is what the section numbers on those two pages
//  already say. The title attribute carries the descriptive name on hover.
const RAIL_ENTRIES = [
  { label: '3.1a', title: 'Network Fundamentals' },
  { label: '3.1b', title: 'Network Attacks' },
  { label: '3.2', title: 'Policies and Wireless' },
  { label: '3.3', title: 'Segmentation' },
  { label: '3.4', title: 'Firewalls' },
  { label: '3.5', title: 'Detection' },
];

const STEPS = [
  ['', 'Lesson', ' ucn-step-lesson'],
  ['-exercise-1', 'Exercise 1', ''],
  ['-exercise-2', 'Exercise 2', ''],
  ['-lab', 'Lab', ''],
  ['-quiz', 'Quiz', ''],
];

//  Matches the whole rail block. The trailing `\n  </div>\n</div>` is the steps
//  close, the rail close and the ucnav close, and the two-space indent makes it
//  unambiguous: it matches exactly once on each of the five pages that have a
//  rail, all 3449 bytes.
const RAIL_BLOCK = /<div id="ucnav">[\s\S]*?\n {2}<\/div>\n<\/div>/;

/** Build the rail markup, with `currentPos` (1-6) marked open. */
function buildRail(currentPos) {
  const parts = [
    '<div id="ucnav">',
    '  <div class="ucn-rail" id="ucn-rail">',
    '    <a href="/pages/ap-cybersecurity-complete-course-guide" class="ucn-hub">AP Cyber Hub</a>',
    '    <span class="ucn-badge">Unit 3</span>',
  ];
  RAIL_ENTRIES.forEach((entry, i) => {
    const pos = i + 1;
    const open = pos === currentPos ? ' open' : '';
    parts.push(
      `    <div style="cursor:pointer!important;" class="ucn-lesson${open}" ` +
      `onclick="ucnToggle(${pos});" id="ucn-l${pos}" title="${entry.title}">` +
      `${entry.label} <span class="ucn-chevron">&#9660;</span>`,
      '</div>',
      `    <div class="ucn-steps${open}" id="ucn-s${pos}">`,
    );
    for (const [suffix, text, cls] of STEPS) {
      parts.push(
        `      <a href="/pages/ap-cyber-unit-3-lesson-${pos}${suffix}" ` +
        `class="ucn-step${cls}">${text}</a>`,
      );
    }
    parts.push('    </div>');
  });
  parts.push('  </div>', '</div>');
  return parts.join('\n');
}

/**
 * Pull the rail's behaviour script out of a page that already has one.
 *
 * The markup alone is inert: every topic entry calls `ucnToggle`, and the same
 * block also positions the fixed rail under the theme header and strips the
 * padding Shopify's template adds. The wireless lesson carries the ucnav CSS
 * but NOT this script, so inserting only the markup there would ship a rail
 * that renders and does nothing when clicked.
 *
 * Copied from a donor page rather than embedded here so the inserted rail runs
 * byte-identical code to the five that already work, and stays that way if the
 * script is ever revised.
 */
function extractRailScript(donorBody) {
  for (const m of donorBody.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)) {
    if (m[0].includes('function ucnToggle')) return m[0];
  }
  return null;
}

/**
 * Replace the rail, or insert one on a page that has none.
 *
 * Only one page needs the insert: the wireless lesson, which was authored
 * against a different template (an `exhero` header rather than the `ch-badge`
 * course header lessons 1 to 5 use) and never got a rail. The rail is
 * position:fixed, so where it sits in the DOM is not load-bearing and it goes
 * directly after the wrapper opens. `script` is required for that path and
 * ignored when a rail is merely being replaced, since the page already has it.
 */
function applyRail(body, currentPos, script) {
  const rail = buildRail(currentPos);
  if (RAIL_BLOCK.test(body)) {
    return { body: body.replace(RAIL_BLOCK, rail), action: 'replaced' };
  }
  const wrapper = /(<div id="apcyber-wrapper"[^>]*>\n)/;
  if (!wrapper.test(body)) return { body, action: 'none' };
  if (!script) return { body, action: 'needs-script' };
  const already = body.includes('function ucnToggle');
  const payload = already ? rail : `${rail}\n${script}`;
  return { body: body.replace(wrapper, `$1${payload}\n`), action: 'inserted' };
}

/**
 * Mark which half of a two-part topic a page is.
 *
 * Both halves of CED 3.1 correctly read "Topic 3.1", which on its own leaves a
 * student on either page unable to tell which one they are on. Only the H1 is
 * touched: it is the page's own statement of what it is, and rewriting every
 * "Topic 3.1" in the body would put "(Part 1 of 2)" inside sentences that are
 * talking about the topic rather than the page.
 */
function applyPartLabel(body, topic, part) {
  if (!part) return body;
  return body.replace(
    new RegExp(`(<h1[^>]*>\\s*Topic ${topic.replace('.', '\\.')})(\\s*:)`),
    `$1 (${part})$2`,
  );
}

/** The same marker for the SEO title, which has no H1 to carry it. */
function titleWithPart(title, topic, part) {
  if (!part) return title;
  return title.replace(
    new RegExp(`(\\b${topic.replace('.', '\\.')})(\\s*:)`),
    `$1 (${part})$2`,
  );
}

/**
 * The whole transform for one page, in the order the steps must run.
 *
 * The rail is applied LAST and replaces its region wholesale, so whatever the
 * token pass made of the old rail is discarded rather than patched. That is
 * deliberate: the rail's labels are positional and cannot be derived by
 * substitution. `targetPos` is the rail position this page occupies, which
 * after the move equals its handle number; activity pages pass null and get no
 * rail, which matches what they carry today.
 */
function transformPage(body, oldTopic, lessonId, targetPos, railScript, part) {
  const { body: renumbered, counts } = renumberBody(body, oldTopic);
  const withIds = setLessonId(renumbered, lessonId);
  const collapsed = collapseDualLabels(withIds);
  const labelled = applyPartLabel(collapsed, DISPLAY_MAP[oldTopic], part);
  if (targetPos == null) return { body: labelled, counts, rail: 'skipped' };
  const { body: railed, action } = applyRail(labelled, targetPos, railScript);
  return { body: railed, counts, rail: action };
}

// ─── THE UNIT 3 HUB ──────────────────────────────────────────────────────────
//
//  ap-cybersecurity-unit-3-securing-networks. Two things about it are worth
//  knowing before editing, and both were surprises.
//
//  FIRST: THE HUB WAS ALREADY RIGHT. Its five sections read 3.1 Network
//  Vulnerabilities, 3.2 Wireless Security and Managerial Controls, 3.3
//  Segmentation, 3.4 Firewalls, 3.5 Detecting Network Attacks. That is the CED,
//  exactly. The hub and the lesson pages have disagreed all along and the hub
//  was the one telling the truth. So it needs no renumbering: the token pass is
//  never run over it.
//
//  SECOND: IT LINKS ALMOST NOTHING. Its table of contents is in-page anchors,
//  so a reader has no route from the hub to any lesson except one card. That is
//  why the audit found lesson-6 as the hub's only lesson link.
//
//  ── THE CARD THAT WOULD HAVE BROKEN SILENTLY ────────────────────────────────
//  That one card points at /pages/ap-cyber-unit-3-lesson-6 and describes TLS,
//  SSH, SFTP and DNSSEC. After the three-cycle, lesson-6 holds the DETECTION
//  body and the protocol body has moved to lesson-3. Left alone, the card would
//  still resolve, still render, and send a reader to IDS and SIEM under a
//  heading promising secure protocols. Retargeting it is not optional, and it
//  is the reason the hub has to ride in the same import as the 30 pages rather
//  than shipping separately.
const HUB_HANDLE = 'ap-cybersecurity-unit-3-securing-networks';

//  The lesson index the hub has never had. CED order, which after the move is
//  also handle order.
const HUB_LESSONS = [
  [1, '3.1', 'Network Fundamentals and Attack Surface', 'Part 1 of 2'],
  [2, '3.1', 'Network Attacks', 'Part 2 of 2'],
  [3, '3.2', 'Managerial Controls and Wireless Security', null],
  [4, '3.3', 'Network Segmentation', null],
  [5, '3.4', 'Firewalls and Access Control Lists', null],
  [6, '3.5', 'Detecting Network Attacks', null],
];

function buildLessonIndex() {
  const rows = HUB_LESSONS.map(([n, topic, title, part]) => {
    const label = part ? `${topic} <span style="font-weight:400!important;">(${part})</span>` : topic;
    return '                <li style="margin:0 0 8px!important;">'
      + `<a href="/pages/ap-cyber-unit-3-lesson-${n}" `
      + 'style="text-decoration:none!important;color:#1E1B4B!important;">'
      + `<span class="toc-number">${label}</span> ${title}</a></li>`;
  }).join('\n');
  return [
    '',
    '        <!-- LESSON INDEX -->',
    '        <div class="toc" style="margin-top:16px!important;">',
    '            <h2>Unit 3 Lessons</h2>',
    '            <ul class="toc-list">',
    rows,
    '            </ul>',
    '        </div>',
  ].join('\n');
}

/**
 * Apply both hub edits. Returns { body, actions } so the caller can gate on
 * each one having actually matched rather than assuming it did.
 */
function transformHub(body) {
  const actions = [];
  let out = body;

  //  1. Insert the lesson index directly after the existing contents block.
  const tocEnd = /(<h2>Unit 3 Contents<\/h2>[\s\S]*?<\/ul>\n\s*<\/div>)/;
  if (tocEnd.test(out) && !out.includes('Unit 3 Lessons')) {
    out = out.replace(tocEnd, `$1${buildLessonIndex()}`);
    actions.push('lesson-index-added');
  }

  //  2. Retarget and reframe the enrichment card. The page it points at is now
  //     Topic 3.2, a core CED topic, so "not tested on the AP exam" has to go:
  //     it would tell a student to skip a tested topic. What stays true is that
  //     the protocol material inside that lesson is enrichment, so the card now
  //     says that about the section rather than about the lesson.
  out = out.replace(
    /<a href="\/pages\/ap-cyber-unit-3-lesson-6"(\s+style="[^"]*")?>[^<]*<\/a>/,
    '<a href="/pages/ap-cyber-unit-3-lesson-3"$1>Go to Topic 3.2 &rarr;</a>',
  );
  //  The eyebrow carries a literal U+2014 em-dash, which is both why a plain
  //  string replace missed it and a repo-convention violation already live on
  //  the page. Matched by escape so this file stays pure ASCII, and the
  //  replacement drops the dash rather than re-encoding it.
  out = out.replace(
    /Enrichment\s*(?:\u2014|&mdash;|&#8212;|-)\s*Beyond CED Scope/,
    'Inside Topic 3.2',
  );
  out = out.replace(
    'Lesson 3.6: Secure Network Protocols',
    'Topic 3.2 includes a secure protocols section',
  );
  out = out.replace(
    /Covers TLS\/SSL, HTTPS, SSH, SFTP, DNSSEC, and protocol-level defenses that go beyond the five CED topics and are not tested on the AP exam\.\s*Useful context for understanding how encryption protects network traffic, but not required for the AP exam\./,
    'The Topic 3.2 lesson covers TLS/SSL, HTTPS, SSH, SFTP and DNSSEC alongside '
    + 'the CED material. Those protocols are enrichment: useful context for how '
    + 'encryption protects network traffic, and not themselves a CED 3.2 '
    + 'requirement.',
  );
  if (out.includes('/pages/ap-cyber-unit-3-lesson-3')) actions.push('card-retargeted');

  return { body: out, actions };
}

module.exports = {
  SECTION_MAP, DISPLAY_MAP, PLAN, ACTIVITIES, RAIL_ENTRIES,
  HUB_HANDLE, HUB_LESSONS,
  handle, renumberBody, setLessonId, collapseDualLabels,
  buildRail, applyRail, extractRailScript, applyPartLabel, titleWithPart,
  buildLessonIndex, transformHub, transformPage, checkConsistency,
};

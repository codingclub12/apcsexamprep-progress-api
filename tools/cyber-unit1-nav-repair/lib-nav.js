'use strict';
// Shared helpers for the Unit 1 nav repair. Locates the ucnav block by
// counting div depth only, so it works on both the old generation (which uses
// <span class="ucn-steps"> ... </span>) and the new one (<div class="ucn-steps">).

const TOPICS = {
  1: { lesson: 'ap-cybersecurity-unit-1-social-engineering', title: 'Understanding Social Engineering' },
  2: { lesson: 'ap-cybersecurity-unit-1-password-attacks', title: 'Suspicious Website Logins' },
  3: { lesson: 'ap-cybersecurity-unit-1-wireless-security', title: 'Public Wi-Fi Dangers' },
  4: { lesson: 'ap-cybersecurity-unit-1-ai-driven-threats', title: 'AI-Based Attacks' },
  5: { lesson: 'ap-cybersecurity-unit-1-ai-cyber-defense', title: 'AI in Defense' },
};

// The 25 canonical step targets, keyed by lesson number then slot.
const STEP_LABELS = ['Lesson', 'Ex 1', 'Ex 2', 'Lab', 'Quiz'];
function stepTargets(n) {
  return [
    TOPICS[n].lesson,
    `ap-cyber-unit-1-lesson-${n}-exercise-1`,
    `ap-cyber-unit-1-lesson-${n}-exercise-2`,
    `ap-cyber-unit-1-lesson-${n}-lab`,
    `ap-cyber-unit-1-lesson-${n}-quiz`,
  ];
}

const LEGACY_HANDLES = [
  'ap-cybersecurity-unit-1-wireless-security-exercise-1',
  'ap-cybersecurity-unit-1-wireless-security-exercise-2',
  'ap-cybersecurity-unit-1-wireless-security-lab',
  'ap-cybersecurity-unit-1-wireless-security-quiz',
  'ap-cybersecurity-unit-1-ai-cyber-defense-exercise-1',
  'ap-cybersecurity-unit-1-ai-cyber-defense-exercise-2',
  'ap-cybersecurity-unit-1-ai-cyber-defense-lab',
  'ap-cybersecurity-unit-1-ai-cyber-defense-quiz',
  'ap-cybersecurity-unit-1-password-attacks-quiz',
];

// Returns {start, end, html} for the ucnav block, end exclusive.
function findNavBlock(body) {
  const start = body.indexOf('<div id="ucnav"');
  if (start < 0) return null;
  const re = /<div\b|<\/div>/gi;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[0].toLowerCase() === '</div>') {
      depth--;
      if (depth === 0) {
        const end = m.index + m[0].length;
        return { start, end, html: body.slice(start, end) };
      }
    } else {
      depth++;
    }
  }
  return null;
}

function countAll(hay, needle) {
  let n = 0;
  let i = 0;
  for (;;) {
    const j = hay.indexOf(needle, i);
    if (j < 0) return n;
    n++;
    i = j + needle.length;
  }
}

module.exports = { TOPICS, STEP_LABELS, stepTargets, LEGACY_HANDLES, findNavBlock, countAll };

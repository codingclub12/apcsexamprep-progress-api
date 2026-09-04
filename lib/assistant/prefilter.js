'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: THE PRE-FILTER  (spec section 5, layer 5)
//
//  Refuse coursework questions BEFORE a model is called. Two reasons, and the
//  second is the one that makes this a layer rather than an optimisation:
//
//    1. It costs nothing. A refusal here is zero tokens, which matters on a box
//       with a $169 incident on record.
//    2. It is deterministic. Layers 1 to 4 mean the model never receives an
//       answer key, so it cannot emit one. This layer is about the questions it
//       could answer from its own training: "what does this code print" needs no
//       database access to be a tutoring answer on an assessment product.
//
//  THE FAILURE MODE TO DESIGN AGAINST IS THE FALSE POSITIVE, not the miss.
//  Teachers talk about their classes constantly. A filter that trips on the word
//  "class", or "quiz", or "question 3", refuses the exact traffic the assistant
//  exists to serve, and a support desk that refuses support requests gets turned
//  off in a week. So every pattern below is SYNTACTIC (multi-token, punctuation
//  bearing) rather than lexical. `class` is not a Java keyword here; `public
//  class Foo` is.
//
//  The corpus this was tuned against is in smoke/assistant-exfiltration.js:
//  hostile prompts must be caught, and a list of real teacher support questions
//  must ALL pass. Both directions are asserted, because a filter tested only on
//  the attacks it was written for reports success at any threshold.
//
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────

// A fenced block, or HTML that carries code. Anything inside one of these on a
// site that teaches Java and Python is coursework by construction.
const CODE_FENCE = [
  /```/,
  /~~~/,
  /<\s*code[\s>]/i,
  /<\s*pre[\s>]/i,
];

// Java. Every one of these needs a keyword AND its syntax: a bare noun cannot
// match. `public class` and `System.out.print` are not things a teacher writes
// while asking why a quiz is locked.
const JAVA = [
  /\bpublic\s+(static|class|abstract|final|interface|void|int|double|boolean|String)\b/,
  /\bprivate\s+(static|final|int|double|boolean|String|void)\b/,
  /\bSystem\s*\.\s*out\s*\.\s*print/,
  /\bstatic\s+void\s+main\b/,
  /\b(int|double|boolean|char|String)\s*\[\s*\]/,
  /\bfor\s*\(\s*(int|final|String|double)\b/,
  /\bnew\s+[A-Z][A-Za-z0-9_]*\s*(\(|\[)/,
  /\b(ArrayList|HashMap|Scanner|StringBuilder)\s*[<(]/,
  /\.\s*(length|size)\s*\(\s*\)/,
  /\}\s*else\s*\{/,
];

// Python. `print(` with an opening quote or a name, `def name(`, and the
// keywords that have no English use.
const PYTHON = [
  /^\s*def\s+[A-Za-z_]\w*\s*\(/m,
  /^\s*(from\s+[\w.]+\s+)?import\s+[\w.]+\s*$/m,
  /\bprint\s*\(\s*["'f]/,
  /\belif\b/,
  /\bfor\s+\w+\s+in\s+range\s*\(/,
  /^\s*(if|while|for)\s+.+:\s*$/m,
  /\b__(init|name|main)__\b/,
];

// Multiple-choice shapes, named in the spec. `which of the following` is the
// single highest-signal string on the whole site.
const STEM = [
  /which\s+of\s+the\s+following/i,
  /\b(all|none|both)\s+of\s+the\s+above\b/i,
  /\bselect\s+all\s+that\s+apply\b/i,
  /\bwhat\s+(is|will\s+be)\s+the\s+output\b/i,
  /\bwhat\s+(does|will)\s+(this|the\s+following|the)\s+(code|program|method|segment|snippet|loop)\b/i,
  /\b(I{1,3}|IV)\s+(only|and\s+(I{1,3}|IV))\b/,
  /\bis\s+(this|my)\s+answer\s+(right|correct)\b/i,
  /\bwhat\s*'?s?\s+the\s+(correct\s+)?answer\b/i,
  /\bcorrect\s+(answer|option|choice)\s+(for|to)\b/i,
  /\banswer\s+key\b/i,
  // "is the answer B", "the answer is c", "is it D?"
  //
  // ADDED IN PHASE 4, and found by the student suite rather than by review. The
  // rules above were all written while thinking about a TEACHER typing, and a
  // teacher asks "what is the correct answer for 1.1 question 3". A fourteen
  // year old asks "is the answer B", which none of them matched. Same request,
  // four words, straight past a filter that looked complete.
  //
  // The lookahead is what keeps it usable: a bare [A-E] matches the article "a",
  // so "is the answer a good one" would fire without it. Requiring the letter to
  // be the last thing before punctuation or end of input keeps "is the answer B"
  // and drops "is the answer a good one".
  /\bis\s+(?:the\s+|my\s+)?answer\s+[A-E]\b(?!\s*[A-Za-z])/i,
  /\bthe\s+answer\s+is\s+[A-E]\b(?!\s*[A-Za-z])/i,
  /\bis\s+it\s+[A-E]\b(?!\s*[A-Za-z])/i,
];

// Four or more consecutive single-letter option labels, spec section 5. The
// letters are restricted to A-E because that is the option alphabet on every
// activity in this repo, and an unrestricted version matches "I A M" and
// initialisms. Both the spaced form ("1. A 2. C 3. B 4. D") and the compact one
// ("ACBD") are the shape a leaked key actually takes.
// The separator excludes LETTERS, with one narrow exception for a question label
// (Q1, q3), so that "1. A 2. C 3. B 4. D" and "Q1 A, Q2 C, Q3 B, Q4 D" both
// match. Excluding digits as well, which is the obvious way to write this, is
// blind to exactly the numbered form a key is usually written in. Allowing
// letters generally is the opposite mistake and matches "A or B or C".
// Same construction as lib/assistant/output-filter.js, one rung shorter there.
const SEP = '(?:[^A-Za-z]|[Qq]\\d){1,8}';
const LETTER_RUN_SPACED = new RegExp(
  `\\b[A-E]\\b${SEP}\\b[A-E]\\b${SEP}\\b[A-E]\\b${SEP}\\b[A-E]\\b`);
const LETTER_RUN_COMPACT = /\b[A-E]{4,}\b/;

// One refusal string, used for every hit. It names what the assistant CAN do,
// because spec section 4 is right that a bare no generates a second ticket.
const REFUSAL =
  'I do not help with quiz, exercise or exam content, including reading code or ' +
  'checking an answer. That line is what keeps this assistant safe to run next to ' +
  'graded work. I can help with how the site works: why an activity is locked, ' +
  'whether scores are recording, entitlements, rosters, and account settings. ' +
  'For the coursework itself, the lesson page is the place to start.';

const RULES = [
  ['code_fence', CODE_FENCE],
  ['java_syntax', JAVA],
  ['python_syntax', PYTHON],
  ['mcq_stem', STEM],
  ['letter_run', [LETTER_RUN_SPACED, LETTER_RUN_COMPACT]],
];

// Returns { blocked, rule, refusal }. `rule` names WHICH pattern class fired, so
// the taxonomy in chat_messages can tell "someone pasted code" apart from
// "someone asked for an answer key", which are different content problems.
function check(message) {
  const text = typeof message === 'string' ? message : '';
  if (!text.trim()) return { blocked: false, rule: null, refusal: null };
  for (const [rule, patterns] of RULES) {
    for (const re of patterns) {
      if (re.test(text)) return { blocked: true, rule, refusal: REFUSAL };
    }
  }
  return { blocked: false, rule: null, refusal: null };
}

module.exports = { check, REFUSAL, RULES, LETTER_RUN_SPACED, LETTER_RUN_COMPACT, SEP };

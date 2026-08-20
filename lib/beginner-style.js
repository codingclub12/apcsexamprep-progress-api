'use strict';
// -----------------------------------------------------------------------------
//  Find code that no beginner writes.
//
//  ── WHY ─────────────────────────────────────────────────────────────────────
//  `if (steps[d] > goal) { over = over + 1; }` is legal, compact, and an
//  immediate tell that a machine wrote it. A student in their first year writes
//  the brace on its own line because that is how they were taught and how every
//  worked example they have seen is laid out. Code on this site is read as a
//  model to copy, so a one-line body teaches a habit no AP reader expects and no
//  teacher demonstrates.
//
//  This is a DETECTOR, not a formatter, and that is deliberate. Rewriting
//  someone else's code automatically is how a working page turns into a broken
//  one at 2am. Detection is safe and can gate a pull request; the rewrite is a
//  human edit that gets re-run and re-verified afterwards.
//
//  ── WHAT COUNTS ─────────────────────────────────────────────────────────────
//  A construct that opens AND closes its body on the same line. That covers
//  brace languages (`if (x) { y; }`), Python (`if x: y`), and AP pseudocode
//  (`IF(x) { y }`), which the College Board reference sheet also writes with the
//  braces on their own lines.
//
//  ── WHAT DOES NOT COUNT ─────────────────────────────────────────────────────
//  A page's own machinery. Students read starters, solutions, worked examples
//  and pseudocode; they do not read the runner that posts to Judge0. Applying
//  this to internal page script would be a style opinion rather than a teaching
//  one, and it is not what this is for.
// -----------------------------------------------------------------------------

const BRACE_RULES = [
  // The `} else if` and bare `else if` forms both have to be here. Covering only
  // the first left the middle branch of an if/else-if/else chain undetected,
  // which is how one chain shipped with its first branch expanded and its second
  // still on one line.
  { what: 'if', re: /^\s*(\}\s*)?(else\s+)?if\s*\(.*\)\s*\{.*\}/ },
  { what: 'else', re: /^\s*(\}\s*)?else\s*\{.+\}/ },
  { what: 'for', re: /^\s*for\s*\(.*\)\s*\{.*\}/ },
  { what: 'for-of', re: /^\s*for\s*\(.*\bof\b.*\)\s*\{.*\}/ },
  { what: 'while', re: /^\s*while\s*\(.*\)\s*\{.*\}/ },
  { what: 'function', re: /^\s*function\s+\w+\s*\(.*\)\s*\{.*\}/ },
  { what: 'arrow', re: /^\s*(const|let|var)\s+\w+\s*=\s*(function\s*)?\(.*\)\s*(=>)?\s*\{.*\}/ },
  // A braceless body on the same line is the same tell without the braces, and
  // it has to cover `else if` too. Missing that once left a grade chain with its
  // first branch expanded and its second still on one line, which is worse than
  // either style on its own.
  { what: 'braceless-if', re: /^\s*(\}\s*)?(else\s+)?if\s*\(.*\)\s*(?!\{)\S.*;/ },
  { what: 'braceless-else', re: /^\s*(\}\s*)?else\s+(?!if\b)(?!\{)\S.*;/ },
];

const PYTHON_RULES = [
  { what: 'if', re: /^\s*(el)?if\s+.*:\s*\S/ },
  { what: 'else', re: /^\s*else\s*:\s*\S/ },
  { what: 'for', re: /^\s*for\s+.*:\s*\S/ },
  { what: 'while', re: /^\s*while\s+.*:\s*\S/ },
  { what: 'def', re: /^\s*def\s+\w+\s*\(.*\)\s*:\s*\S/ },
];

// AP pseudocode has no statement terminator, so a line that both opens and
// closes a block is the whole test.
const PSEUDO_RULE = { what: 'block', re: /\{.*\}/ };

function rulesFor(lang) {
  if (lang === 'python') return PYTHON_RULES;
  if (lang === 'pseudo') return [PSEUDO_RULE];
  return BRACE_RULES;
}

// `lang` is 'python', 'pseudo', or anything else for a brace language.
// Returns [{ line, what, text }], empty when the code is written the way a
// beginner writes it.
function findOneLiners(code, lang) {
  const rules = rulesFor(lang);
  const hits = [];
  String(code == null ? '' : code).split('\n').forEach((line, i) => {
    for (const r of rules) {
      if (r.re.test(line)) { hits.push({ line: i + 1, what: r.what, text: line.trim() }); break; }
    }
  });
  return hits;
}

// A seed problem carries starters, solutions and pseudocode, all of which a
// student reads. This walks one and reports everything at once.
function findInProblem(problem) {
  const hits = [];
  for (const key of ['starter', 'solution']) {
    const block = problem[key];
    if (!block) continue;
    for (const lang of Object.keys(block)) {
      findOneLiners(block[lang], lang).forEach((h) => hits.push({ where: `${key}.${lang}`, ...h }));
    }
  }
  if (Array.isArray(problem.pseudo)) {
    findOneLiners(problem.pseudo.join('\n'), 'pseudo').forEach((h) => hits.push({ where: 'pseudo', ...h }));
  }
  return hits;
}

module.exports = { findOneLiners, findInProblem, BRACE_RULES, PYTHON_RULES };

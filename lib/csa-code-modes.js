'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA CODE GRADING MODES - what lets a graded exercise be a real program.
//
//  WHY THIS EXISTS
//  The original code grader has exactly one shape: the student submits a BARE
//  SEGMENT and routes/student.js wraps prelude + segment + postlude inside
//
//      public class Main { public static void main(String[] args) { ... } }
//
//  That shape is right for 1.3 (print a+b) and it cannot express most of the
//  course. A segment lives inside a method body, so:
//
//    - it cannot declare a class, which is all of Unit 3 (3.3 Anatomy of a
//      Class, 3.4 Constructors, 3.5 Methods, 3.7 static members). Local classes
//      cannot hold statics and cannot be mutually referential, so the trick that
//      works for the Greenfoot stub does not generalise.
//    - it cannot declare a method, so 3.5 and 3.6 have nothing to write.
//    - it can technically open a Scanner, but 1.4 Assignment Statements and
//      Input is ABOUT reading input, and grading it by injecting `int x = 5;`
//      as a prelude grades everything except the thing the lesson teaches.
//
//  So a lesson either got a toy version of its own topic or got no code item at
//  all. This module adds the two shapes the other 50 lessons need, and changes
//  nothing about the segment path: a case with no `mode` is `segment` and
//  assembles byte for byte as before.
//
//  ── THE THREE MODES ─────────────────────────────────────────────────────────
//
//  segment  (default, unchanged)
//      Student sends a bare segment. The case injects `prelude` before it and
//      `postlude` after, and student.js wraps the whole thing in class/main.
//      Hidden inputs live in the prelude.
//
//  program  (Scanner, and any number of classes)
//      Student sends a COMPLETE program: `class Main` with `main`, plus any
//      helper classes they want. Nothing is wrapped. The case supplies `stdin`,
//      so a Scanner reads real input and the hidden cases are hidden INPUTS.
//      This is the ordinary judge model and it is what makes 1.4 gradeable as
//      1.4 rather than as a fill-in-the-blank.
//
//  driver  (write the class, we exercise it)
//      Student sends class definitions and NO main. The case's `postlude` is a
//      hidden harness (`public class Main` with `main`) that constructs the
//      student's class, calls its methods and prints what it observes. This is
//      the only honest way to grade "write a BankAccount with a constructor, a
//      deposit method and a getter": the student cannot print their way past it,
//      because nothing they print is what the harness measures.
//
//  ── THE ONE JAVA FILE PROBLEM, AND THE ONE TRANSFORMATION ───────────────────
//  Judge0 writes every Java submission to Main.java, compiles it and runs
//  `java Main`. Two consequences that would otherwise land on students as
//  gibberish compiler output:
//
//    1. A top-level type declared `public` whose name is not Main is a compile
//       ERROR ("class Dog is public, should be declared in a file named
//       Dog.java"). But `public class Dog` is exactly what Unit 3 teaches, and a
//       student who writes it has done nothing wrong.
//    2. In driver mode the harness owns `Main`, so a student class named Main
//       collides with it.
//
//  So the assembler strips the `public` modifier from top-level types that are
//  not the entry point, and rejects a driver submission that declares Main with
//  a sentence a student can act on. Nothing else about the source is touched:
//  no reformatting, no rewriting, no injection into their code.
//
//  Stripping is done with a real brace/string/comment scan rather than a regex,
//  because `public` inside a string literal or a comment is not a modifier and
//  a regex cannot tell the difference. Getting that wrong corrupts a correct
//  student's submission, which is the worst failure this file could have.
//
//  DATA POLICY: everything here operates on source in transit. Nothing is
//  stored, logged or returned. Zero PII.
// ─────────────────────────────────────────────────────────────────────────────

const MODES = ['segment', 'program', 'driver'];
const JAVA_LANGUAGE_ID = 62;

// Judge0 compiles to Main.java and runs `java Main`, so this name is fixed by
// the runner, not chosen here.
const ENTRY_CLASS = 'Main';

// A case with no mode is a segment case. Returns null for anything unknown so
// the caller can answer with a specific message rather than throwing a 500 over
// what is really a seeding mistake.
function normalizeMode(raw) {
  const m = String(raw == null || raw === '' ? 'segment' : raw).trim().toLowerCase();
  return MODES.includes(m) ? m : null;
}

// ── TOP-LEVEL JAVA SCAN ──────────────────────────────────────────────────────
// Walks the source once, tracking brace depth while skipping over string
// literals, text blocks, character literals and both comment forms. Reports the
// `public` modifiers and the type declarations that sit at depth 0, which is the
// only depth where a type declaration can be a top-level type.
//
// This is not a Java parser and does not need to be. It needs exactly two facts
// (where the top-level types are, and which `public` tokens modify them), and
// those survive anything a student can legally write.
function scanTopLevel(src) {
  const s = String(src == null ? '' : src);
  const n = s.length;
  const publics = [];   // { start, end } of a `public` token at depth 0
  const types = [];     // { keyword, name, at } for a top-level type declaration
  let depth = 0;
  let i = 0;

  const isIdentStart = (c) => /[A-Za-z_$]/.test(c);
  const isIdentPart = (c) => /[A-Za-z0-9_$]/.test(c);

  while (i < n) {
    const c = s[i];

    if (c === '/' && s[i + 1] === '/') {
      i += 2;
      while (i < n && s[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && s[i + 1] === '*') {
      i += 2;
      while (i < n && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"') {
      if (s.slice(i, i + 3) === '"""') {           // text block
        i += 3;
        while (i < n && s.slice(i, i + 3) !== '"""') {
          if (s[i] === '\\') i++;
          i++;
        }
        i += 3;
        continue;
      }
      i++;
      while (i < n && s[i] !== '"') {
        if (s[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === "'") {
      i++;
      while (i < n && s[i] !== "'") {
        if (s[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { if (depth > 0) depth--; i++; continue; }

    if (isIdentStart(c)) {
      let j = i;
      while (j < n && isIdentPart(s[j])) j++;
      const word = s.slice(i, j);
      if (depth === 0) {
        if (word === 'public') {
          publics.push({ start: i, end: j });
        } else if (word === 'class' || word === 'interface' || word === 'enum' || word === 'record') {
          let k = j;
          while (k < n && /\s/.test(s[k])) k++;
          let e = k;
          while (e < n && isIdentPart(s[e])) e++;
          // `record` is also a legal identifier, so a declaration only counts
          // when a name actually follows it.
          if (e > k) types.push({ keyword: word, name: s.slice(k, e), at: i });
        }
      }
      i = j;
      continue;
    }

    i++;
  }

  return { publics, types };
}

// Remove the `public` modifier from every top-level type except `keep` (the
// entry class, when there is one). Splices from the end so earlier offsets stay
// valid. Only the six characters of the keyword and the whitespace that follows
// it are removed; every other byte of the student's source survives untouched.
function stripTopLevelPublic(src, keep) {
  const s = String(src == null ? '' : src);
  const { publics, types } = scanTopLevel(s);
  if (!publics.length) return s;

  // A `public` modifies the next top-level type declaration after it.
  const keepOffsets = new Set();
  if (keep) {
    for (const p of publics) {
      const t = types.find((x) => x.at > p.start);
      if (t && t.name === keep) keepOffsets.add(p.start);
    }
  }

  let out = s;
  for (let k = publics.length - 1; k >= 0; k--) {
    const p = publics[k];
    if (keepOffsets.has(p.start)) continue;
    let end = p.end;
    while (end < out.length && /[ \t]/.test(out[end])) end++;
    out = out.slice(0, p.start) + out.slice(end);
  }
  return out;
}

// ── IMPORT HOISTING ──────────────────────────────────────────────────────────
// Java requires every import at the top of the file, before any type. In driver
// mode the student's classes are written first and the harness is appended after
// them, so a harness that imports Scanner would put an import in the middle of
// the file and nothing would compile. That is not the student's mistake and must
// never be shown to them as one.
//
// So driver assembly lifts the import lines out of both halves, emits them once
// at the top in first-seen order, and leaves everything else exactly where it
// was. Only a line that is ENTIRELY an import declaration is moved, which is the
// only form the language allows anyway; a line of code that merely mentions the
// word cannot match.
const IMPORT_LINE = /^[ \t]*import[ \t]+(static[ \t]+)?[A-Za-z_$][\w$.]*(\.\*)?[ \t]*;[ \t]*$/;

function splitImports(src) {
  const lines = String(src == null ? '' : src).split('\n');
  const imports = [];
  const rest = [];
  for (const line of lines) {
    if (IMPORT_LINE.test(line)) imports.push(line.trim());
    else rest.push(line);
  }
  return { imports, rest: rest.join('\n') };
}

// Does this source declare a `main` method anywhere? Used only to tell a student
// what is missing, never to decide a grade.
function declaresMain(src) {
  return /\bstatic\s+void\s+main\s*\(/.test(String(src == null ? '' : src));
}

// ── WHAT A STUDENT MUST HAVE SENT ────────────────────────────────────────────
// Returns null when the submission has the right shape for its mode, or a
// sentence written FOR THE STUDENT when it does not. These are the mistakes the
// Judge0 output explains badly or not at all, so saying it plainly here is the
// difference between a fixable message and a wall of javac.
function validateSource(mode, languageId, source) {
  if (languageId !== JAVA_LANGUAGE_ID) return null;   // only Java has the file rule
  const src = String(source == null ? '' : source);

  if (mode === 'program') {
    const { types } = scanTopLevel(src);
    if (!types.some((t) => t.name === ENTRY_CLASS)) {
      return 'This exercise runs your whole program, so it needs a class named Main. '
        + 'Wrap your code in: public class Main { public static void main(String[] args) { ... } }';
    }
    if (!declaresMain(src)) {
      return 'Your program has a class named Main but no main method. '
        + 'Add: public static void main(String[] args) { ... }';
    }
    return null;
  }

  if (mode === 'driver') {
    const { types } = scanTopLevel(src);
    if (!types.length) {
      return 'This exercise grades the class you write, so your answer needs at least one class declaration.';
    }
    if (types.some((t) => t.name === ENTRY_CLASS)) {
      return 'Name your class after what it models, not Main. '
        + 'The grader supplies its own Main that creates your object and calls your methods.';
    }
    return null;
  }

  return null;
}

// ── ASSEMBLY ─────────────────────────────────────────────────────────────────
// Build the single file Judge0 compiles, for every mode including segment.
//
// Segment assembly moved here from routes/student.js unchanged, byte for byte,
// for one reason: scripts/verify-csa-exercises.js has to assemble a program the
// same way the grader does, or it is proving something other than what students
// are graded by. Two copies of this logic would eventually disagree, and the
// disagreement would show up as a student failing a test that passed in CI.
function assemble(mode, languageId, source, opts) {
  const src = String(source == null ? '' : source);
  const post = String((opts && opts.postlude) || '');
  const pre = String((opts && opts.prelude) || '');

  if (mode === 'segment') {
    // The student sends a bare segment; the case injects inputs around it and
    // the whole thing becomes the body of main.
    const body = (pre ? pre + '\n' : '') + src + '\n' + (post ? post + '\n' : '');
    if (languageId === JAVA_LANGUAGE_ID) {
      return 'public class Main {\n  public static void main(String[] args) {\n' + body + '  }\n}\n';
    }
    return body;
  }

  if (mode === 'program') {
    // Nothing is added and nothing is wrapped. The only edit is dropping
    // `public` from helper types, which Judge0's Main.java rule would otherwise
    // reject for source that is perfectly correct Java.
    const body = languageId === JAVA_LANGUAGE_ID ? stripTopLevelPublic(src, ENTRY_CLASS) : src;
    return body.endsWith('\n') ? body : body + '\n';
  }

  if (mode === 'driver') {
    // The student's types, then the hidden harness that drives them. The harness
    // is the file's `public class Main`, so every student type gives up `public`.
    if (languageId !== JAVA_LANGUAGE_ID) {
      return src.replace(/\s+$/, '') + '\n\n' + post.replace(/\s+$/, '') + '\n';
    }
    const student = splitImports(stripTopLevelPublic(src, null));
    const harness = splitImports(post);
    const imports = [];
    for (const line of student.imports.concat(harness.imports)) {
      if (!imports.includes(line)) imports.push(line);
    }
    const head = imports.length ? imports.join('\n') + '\n\n' : '';
    return head + student.rest.replace(/\s+$/, '') + '\n\n' + harness.rest.replace(/^\s+/, '').replace(/\s+$/, '') + '\n';
  }

  throw new Error(`csa-code-modes: assemble() does not handle mode "${mode}"`);
}

module.exports = {
  MODES,
  ENTRY_CLASS,
  normalizeMode,
  scanTopLevel,
  stripTopLevelPublic,
  declaresMain,
  validateSource,
  assemble,
};

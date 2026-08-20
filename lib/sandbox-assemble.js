'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SANDBOX ASSEMBLY - turning a student's FILES into one Judge0 submission.
//
//  WHY THIS EXISTS AT ALL
//  Judge0 compiles a Java submission as a single file: it writes the source to
//  Main.java, runs javac on it and then `java Main`. AP CSA is a course about
//  writing CLASSES, so from Unit 3 onward the natural thing a student does is
//  write a Dog and a Main that uses it. In a file-per-class editor that is two
//  files, and Judge0 has no concept of the second one.
//
//  Java itself is fine with this: any number of top-level types may share one
//  compilation unit. Exactly two things break, and both are FILE rules rather
//  than language rules, which is why they read as nonsense to a student who has
//  done nothing wrong:
//
//    1. `public class Dog` in a file called Main.java is a compile ERROR
//       ("class Dog is public, should be declared in a file named Dog.java").
//       But `public class Dog` is what every textbook, and this course, prints.
//    2. `import` must precede every type declaration. Concatenating a Dog.java
//       that imports ArrayList after a Main.java that does not puts an import
//       in the middle of the file, and nothing compiles.
//
//  So this module concatenates, hoists every import to the top, and strips the
//  `public` modifier from every top-level type except the entry class. The
//  student's own bytes are otherwise untouched, which matters: a line number in
//  a javac error should still mean something, so nothing is reindented and no
//  code is rewritten.
//
//  WHY IT REUSES lib/csa-code-modes.js RATHER THAN PARSING JAVA AGAIN
//  The graded exercises already solved this exact problem, and their scanner is
//  brace-depth and string/comment aware (a `public` inside a string literal is
//  not a modifier). Two independent Java scanners would eventually disagree, and
//  the day they did, a program that compiled in the sandbox would fail in the
//  graded exercise with an error the student cannot act on. One scanner, one
//  behavior. This module adds only what the graded path had no need for:
//  MULTIPLE FILES.
//
//  PYTHON AND JAVASCRIPT
//  Neither has a file rule to work around, and the CSP Create Task is a single
//  program, so those languages assemble to exactly the bytes the student typed.
//  The concatenation path is Java-only on purpose rather than by accident.
// ─────────────────────────────────────────────────────────────────────────────

const {
  ENTRY_CLASS,
  scanTopLevel,
  stripTopLevelPublic,
  declaresMain,
} = require('./csa-code-modes');

// Judge0 CE language ids. These mirror the allow-list in routes/judge0.js, which
// this module never modifies and never calls: the page runs the assembled source
// through that proxy itself, so the proxy's rate limiter still sees the real
// client rather than this server.
const LANGUAGES = {
  java:       { id: 62, label: 'Java',       ext: '.java', defaultFile: 'Main.java' },
  python:     { id: 71, label: 'Python 3',   ext: '.py',   defaultFile: 'main.py' },
  javascript: { id: 63, label: 'JavaScript', ext: '.js',   defaultFile: 'main.js' },
};

// Sized against the Judge0 proxy's own 20000 character ceiling on the assembled
// source: eight files of 20000 each could never run, and a limit a student can
// exceed and only discover at Run time is a limit in the wrong place. Both the
// per-file and the total are checked, so the total is what actually binds.
const MAX_FILES = 8;
const MAX_FILE_CHARS = 20000;
const MAX_TOTAL_CHARS = 20000;
const MAX_TITLE_CHARS = 60;
const MAX_STDIN_CHARS = 4000;
const MAX_NAME_CHARS = 40;

const IMPORT_LINE = /^[ \t]*import[ \t]+(static[ \t]+)?[A-Za-z_$][\w$.]*(\.\*)?[ \t]*;[ \t]*$/;
// A package declaration would put the compiled class somewhere `java Main`
// cannot find it. Judge0 has no package tree, so the line is dropped rather than
// honored, and the student is told plainly instead of meeting a
// NoClassDefFoundError with no visible cause.
const PACKAGE_LINE = /^[ \t]*package[ \t]+[A-Za-z_$][\w$.]*[ \t]*;[ \t]*$/;

function normalizeLanguage(lang) {
  const key = String(lang == null ? '' : lang).trim().toLowerCase();
  if (key === 'java') return 'java';
  if (key === 'python' || key === 'python3' || key === 'py') return 'python';
  if (key === 'javascript' || key === 'js' || key === 'node') return 'javascript';
  return null;
}

// A file name is decoration in the assembled output (Judge0 never sees it), but
// it is the tab label the student reads, so it is kept sane rather than trusted:
// one path segment, no traversal, no control characters.
function sanitizeFileName(name, language, index) {
  const raw = String(name == null ? '' : name).trim();
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/]/g, '')
    .slice(0, MAX_NAME_CHARS);
  if (cleaned && cleaned !== '.' && cleaned !== '..') return cleaned;
  const spec = LANGUAGES[language];
  return index === 0 ? spec.defaultFile : `File${index + 1}${spec.ext}`;
}

// ── VALIDATION ───────────────────────────────────────────────────────────────
// Returns { ok: true, files } or { ok: false, message }. Every message here is
// written to be read by a student mid-task, because that is who sees it.
function validateFiles(language, files) {
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, message: 'Add at least one file before running.' };
  }
  if (files.length > MAX_FILES) {
    return { ok: false, message: `A sandbox program can have at most ${MAX_FILES} files.` };
  }

  const out = [];
  let total = 0;
  const seen = new Set();

  for (let i = 0; i < files.length; i++) {
    const f = files[i] || {};
    const source = typeof f.source === 'string' ? f.source : '';
    if (source.length > MAX_FILE_CHARS) {
      return { ok: false, message: `One file is over the ${MAX_FILE_CHARS} character limit.` };
    }
    total += source.length;

    const name = sanitizeFileName(f.name, language, i);
    // Two tabs sharing one name is confusing rather than dangerous, so it is
    // fixed rather than refused.
    const ext = (name.match(/(\.\w+)$/) || [''])[0];
    const stem = ext ? name.slice(0, -ext.length) : name;
    let unique = name;
    let n = 2;
    while (seen.has(unique)) unique = `${stem}-${n++}${ext}`;
    seen.add(unique);

    out.push({ name: unique, source });
  }

  if (total > MAX_TOTAL_CHARS) {
    return {
      ok: false,
      message: `Your program is ${total} characters and the runner accepts ${MAX_TOTAL_CHARS}. Try trimming it down.`,
    };
  }
  if (!out.some((f) => f.source.trim())) {
    return { ok: false, message: 'There is nothing to run yet. Write some code first.' };
  }
  return { ok: true, files: out };
}

// ── JAVA ─────────────────────────────────────────────────────────────────────
// Which class does `java Main` start in? The entry class is Main when a Main
// exists; otherwise it is whichever type declares a main method, and that name
// is what gets renamed to Main for the run. The second case is worth supporting
// because a student following a textbook writes
// `public class Dog { public static void main(...) }` long before anyone tells
// them the file has to be called Main.
function findEntry(sources) {
  const joined = sources.join('\n');
  const { types } = scanTopLevel(joined);
  if (types.some((t) => t.name === ENTRY_CLASS)) return { entry: ENTRY_CLASS, rename: null };

  // scanTopLevel reports the offset of each declaration, so the body of type k
  // is everything up to the start of type k+1.
  for (let i = 0; i < types.length; i++) {
    const start = types[i].at;
    const end = i + 1 < types.length ? types[i + 1].at : joined.length;
    if (declaresMain(joined.slice(start, end))) {
      return { entry: types[i].name, rename: types[i].name };
    }
  }
  return { entry: null, rename: null };
}

// Rename a top-level type to Main. Word-boundary matched: a class name is an
// identifier, so `Dog` matches `new Dog()` and `Dog d` but never `DogHouse` or
// `myDog`. This runs only when the student named their entry class something
// other than Main, and it is reported back so the page can say so rather than
// silently editing what they wrote.
function renameType(src, from, to) {
  const safe = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return src.replace(new RegExp(`\\b${safe}\\b`, 'g'), to);
}

function assembleJava(files) {
  const imports = [];
  const bodies = [];
  let droppedPackage = false;

  for (const f of files) {
    const kept = [];
    for (const line of f.source.split('\n')) {
      if (IMPORT_LINE.test(line)) {
        const t = line.trim();
        if (!imports.includes(t)) imports.push(t);   // first-seen order, deduped
      } else if (PACKAGE_LINE.test(line)) {
        droppedPackage = true;                        // see PACKAGE_LINE above
      } else {
        kept.push(line);
      }
    }
    const body = kept.join('\n').trim();
    if (body) bodies.push({ name: f.name, body });
  }

  const { entry, rename } = findEntry(bodies.map((b) => b.body));
  if (!entry) {
    return {
      ok: false,
      message: 'None of your files has a main method. Add: public static void main(String[] args) { ... }',
    };
  }

  // The rename runs on the CODE only, before the file labels are added: a label
  // is the student's own file name and renaming Dog.java to Main.java in it
  // would point them at a file that does not exist in their editor.
  //
  // A comment naming each file keeps javac's line numbers pointing somewhere the
  // student can find, now that several files share one compilation unit.
  const joined = bodies
    .map((b) => `// ${b.name}\n${rename ? renameType(b.body, rename, ENTRY_CLASS) : b.body}`)
    .join('\n\n');

  // Exactly one top-level type may be public, and it must be the entry class.
  const head = imports.length ? imports.join('\n') + '\n\n' : '';
  const source = head + stripTopLevelPublic(joined, ENTRY_CLASS) + '\n';

  const notes = [];
  if (rename) {
    notes.push(`The runner starts at a class named Main, so ${rename} ran as Main. Your saved code is unchanged.`);
  }
  if (droppedPackage) {
    notes.push('A package declaration was left out: the runner compiles everything into one default package.');
  }
  return { ok: true, source, notes };
}

// ── PUBLIC ENTRY POINT ───────────────────────────────────────────────────────
// { ok:true, language_id, source, notes[] } or { ok:false, message }.
function assemble(language, files) {
  const lang = normalizeLanguage(language);
  if (!lang) return { ok: false, message: 'Pick Java, Python, or JavaScript.' };

  const checked = validateFiles(lang, files);
  if (!checked.ok) return checked;

  if (lang === 'java') {
    const built = assembleJava(checked.files);
    if (!built.ok) return built;
    if (built.source.length > MAX_TOTAL_CHARS) {
      // Assembly only ever removes characters, so this is close to unreachable.
      // It is here because the Judge0 proxy refuses over 20000 with a message
      // about code length, and that would be the first thing the student saw.
      return { ok: false, message: 'Your assembled program is too long for the runner.' };
    }
    return { ok: true, language_id: LANGUAGES.java.id, source: built.source, notes: built.notes };
  }

  // Python and JavaScript: one program, joined in tab order if the student made
  // more than one file, with nothing rewritten.
  const source = checked.files.map((f) => f.source).join('\n\n');
  return { ok: true, language_id: LANGUAGES[lang].id, source, notes: [] };
}

module.exports = {
  LANGUAGES,
  MAX_FILES,
  MAX_FILE_CHARS,
  MAX_TOTAL_CHARS,
  MAX_TITLE_CHARS,
  MAX_STDIN_CHARS,
  normalizeLanguage,
  sanitizeFileName,
  validateFiles,
  findEntry,
  assemble,
};

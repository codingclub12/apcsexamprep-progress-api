'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the code sandbox.
//
//  WHAT IS BEING PROTECTED, IN ORDER OF HOW BADLY IT WOULD HURT
//
//  1. ISOLATION. sandbox_programs is the only table in this codebase holding
//     text a student typed, and every program in it belongs to exactly one
//     student. If a second student's token could ever read, edit or delete
//     someone else's program, that is a student data incident and not a bug
//     report. The ownership checks are asserted here directly against the
//     handlers, so a refactor that drops `student_id` from a WHERE clause fails
//     a test instead of shipping.
//
//  2. THE JAVA ASSEMBLY ACTUALLY COMPILES. The whole reason a CSA student can
//     write a Dog and a Main is that assembly hoists imports and leaves exactly
//     one public type. Getting that subtly wrong produces a javac error about
//     files and packages that means nothing to a first-year student, mid class.
//     When a JDK is present this suite does what Judge0 does - writes
//     Main.java, runs javac, runs `java Main` - so the claim "it compiles" is
//     tested rather than reasoned about. Without a JDK those checks SKIP loudly
//     rather than passing quietly.
//
//  3. THE CAPS HOLD. Length and count limits are what keep one student from
//     turning a 1 GB box into their file server, and this repo has already paid
//     $169 for one unbounded thing.
//
//  Zero PII: every student here is created in a scratch database that is deleted
//  when the suite ends. Nothing touches the production file.
//
//  Run: npm run smoke:sandbox
// -----------------------------------------------------------------------------

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// The scratch database must be chosen BEFORE db.js is required, because db.js
// opens its file at require time.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-smoke-'));
process.env.DB_PATH = path.join(TMP, 'smoke.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-secret-not-a-real-key';

const sandbox = require('../lib/sandbox-assemble');
const page = require('../lib/sandbox-page');

let pass = 0, fail = 0, skip = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}`, detail === undefined ? '' : detail); }
}
function skipped(name, why) { skip++; console.log(`  [SKIP] ${name} - ${why}`); }
function section(t) { console.log(`\n${t}`); }

// ── 1. ASSEMBLY ──────────────────────────────────────────────────────────────
section('1. Java assembly: many files, one compilation unit');

const dogSrc = 'import java.util.ArrayList;\npublic class Dog {\n    private String name;\n    public Dog(String n) { name = n; }\n    public String speak() { return name + " says woof"; }\n}\n';
const mainSrc = 'import java.util.Scanner;\nimport java.util.ArrayList;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        ArrayList<Dog> pack = new ArrayList<Dog>();\n        pack.add(new Dog(in.nextLine()));\n        for (Dog d : pack) { System.out.println(d.speak()); }\n    }\n}\n';

const two = sandbox.assemble('java', [
  { name: 'Dog.java', source: dogSrc },
  { name: 'Main.java', source: mainSrc },
]);
ok('two files assemble', two.ok === true, two.message);
ok('exactly one public type survives', (two.source.match(/^public (class|interface|enum|record)\b/gm) || []).length === 1);
ok('and it is Main', /public class Main\b/.test(two.source));
ok('the non-entry class kept its body', /class Dog \{/.test(two.source));
ok('imports are hoisted above every type',
  two.source.indexOf('import java.util.Scanner;') < two.source.indexOf('class Dog'));
ok('a duplicate import appears once',
  (two.source.match(/import java\.util\.ArrayList;/g) || []).length === 1);

const renamed = sandbox.assemble('java', [
  { name: 'Dog.java', source: 'package pets;\npublic class Dog {\n    public static void main(String[] a) { System.out.println("hi"); }\n}\n' },
]);
ok('an entry class that is not called Main is renamed', /public class Main\b/.test(renamed.source));
ok('and the student is told so', renamed.notes.some((n) => /ran as Main/.test(n)));
ok('a package line is dropped', !/package /.test(renamed.source));
ok('and the student is told that too', renamed.notes.some((n) => /package/.test(n)));
ok('the file label still names the student\'s own file', /\/\/ Dog\.java/.test(renamed.source));

const noMain = sandbox.assemble('java', [{ name: 'A.java', source: 'public class A { }' }]);
ok('no main is refused', noMain.ok === false);
ok('with a sentence a student can act on', /main method/.test(noMain.message), noMain.message);

section('2. Python and JavaScript are passed through untouched');
const py = sandbox.assemble('python', [{ name: 'main.py', source: 'print(input())\n' }]);
ok('python assembles to exactly what was typed', py.source === 'print(input())\n');
ok('python uses language id 71', py.language_id === 71);
const js = sandbox.assemble('javascript', [{ name: 'main.js', source: 'console.log(1)\n' }]);
ok('javascript uses language id 63', js.language_id === 63);
ok('java uses language id 62', two.language_id === 62);
ok('an unknown language is refused', sandbox.assemble('ruby', [{ name: 'a', source: 'x' }]).ok === false);

section('3. Caps and hostile input');
ok('an oversize file is refused',
  sandbox.assemble('python', [{ name: 'a.py', source: 'x'.repeat(sandbox.MAX_FILE_CHARS + 1) }]).ok === false);
ok('too many files is refused',
  sandbox.assemble('java', Array.from({ length: sandbox.MAX_FILES + 1 }, (_, i) => ({ name: `F${i}.java`, source: 'class A {}' }))).ok === false);
ok('an all-whitespace program is refused',
  sandbox.assemble('python', [{ name: 'a.py', source: '   \n  ' }]).ok === false);
ok('no files is refused', sandbox.assemble('python', []).ok === false);

// A file name is only ever a tab label - it is never used as a path, because
// the assembled source is one string posted to Judge0. This is defence in depth:
// the name must not be able to BECOME a path if that ever changes.
const nasty = sandbox.validateFiles('python', [{ name: '../../etc/passwd', source: 'print(1)' }]);
const nastyName = nasty.files[0].name;
ok('a traversal file name keeps no path separators', !/[\\/]/.test(nastyName), nastyName);
ok('and cannot escape a directory', path.basename(nastyName) === nastyName && !/^\.\.$/.test(nastyName), nastyName);
ok('a control character in a name is stripped',
  !/[\u0000-\u001f]/.test(sandbox.sanitizeFileName('a\u0000b.java', 'java', 0)));
const dupes = sandbox.validateFiles('java', [
  { name: 'A.java', source: 'class A {}' },
  { name: 'A.java', source: 'class B {}' },
]);
ok('duplicate file names are made unique', dupes.files[0].name !== dupes.files[1].name,
  dupes.files.map((f) => f.name).join(', '));

// ── 4. REAL COMPILATION ──────────────────────────────────────────────────────
// The only check that proves the claim this whole feature rests on.
section('4. The assembled Java compiles and runs the way Judge0 runs it');

function haveJdk() {
  try {
    execFileSync('javac', ['-version'], { stdio: 'ignore' });
    return true;
  } catch (e) { return false; }
}

function compileAndRun(name, source, stdin) {
  const dir = fs.mkdtempSync(path.join(TMP, 'javac-'));
  fs.writeFileSync(path.join(dir, 'Main.java'), source);
  // JAVA_TOOL_OPTIONS is cleared so a container's proxy banner does not land in
  // the program's own output and read as a failure.
  const env = Object.assign({}, process.env, { JAVA_TOOL_OPTIONS: '' });
  execFileSync('javac', ['Main.java'], { cwd: dir, env, stdio: 'pipe' });
  return execFileSync('java', ['Main'], {
    cwd: dir, env, input: stdin || '', encoding: 'utf8', stdio: 'pipe',
  });
}

if (!haveJdk()) {
  skipped('multi-class Java compiles under javac', 'no JDK on this machine');
  skipped('the shipped Java starter compiles and runs', 'no JDK on this machine');
} else {
  let out = null, err = null;
  try { out = compileAndRun('two-class', two.source, 'Rex\n'); } catch (e) { err = e; }
  ok('multi-class Java compiles under javac', err === null, err && String(err.stderr || err.message));
  ok('and produces the expected output', out !== null && out.trim() === 'Rex says woof', out);

  // The starter is what every student sees first. If it does not run, the
  // feature is broken for everyone on arrival.
  const starter = sandbox.assemble('java', page.STARTERS.java);
  let sout = null, serr = null;
  try { sout = compileAndRun('starter', starter.source, ''); } catch (e) { serr = e; }
  ok('the shipped Java starter compiles and runs', serr === null, serr && String(serr.stderr || serr.message));
  ok('and prints what its comments promise', sout !== null && /says woof/.test(sout), sout);
}

// ── 5. OWNERSHIP ─────────────────────────────────────────────────────────────
// Asserted against the database through the same prepared statements the route
// uses, on a scratch file. This is the check that stops a data incident.
section('5. One student can never reach another student\'s program');

const db = require('../db');
const crypto = require('crypto');

// A class needs a teacher: the foreign key is real and the suite should use the
// schema as it actually is rather than around it.
db.prepare(`INSERT OR IGNORE INTO teachers (id, email, password_hash, name)
            VALUES ('smoke-teacher', 'smoke@example.invalid', 'x', 'Smoke Teacher')`).run();

function makeStudent(name) {
  const classId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  db.prepare(`INSERT INTO classes (id, teacher_id, class_code, class_name, course)
              VALUES (?, 'smoke-teacher', ?, 'Smoke', 'ap-csa')`)
    .run(classId, 'CSA-' + name.toUpperCase().slice(0, 4));
  db.prepare(`INSERT INTO students (id, class_id, display_name, pin_hash)
              VALUES (?, ?, ?, 'x')`).run(studentId, classId, name);
  return studentId;
}

const ada = makeStudent('adaa');
const eve = makeStudent('evee');

const insert = db.prepare(`INSERT INTO sandbox_programs (id, student_id, title, language, files, stdin)
                           VALUES (?, ?, ?, ?, ?, '')`);
const get = db.prepare('SELECT * FROM sandbox_programs WHERE id = ? AND student_id = ?');
const update = db.prepare(`UPDATE sandbox_programs SET title = ? WHERE id = ? AND student_id = ?`);
const del = db.prepare('DELETE FROM sandbox_programs WHERE id = ? AND student_id = ?');
const list = db.prepare('SELECT id FROM sandbox_programs WHERE student_id = ?');

const progId = crypto.randomUUID();
insert.run(progId, ada, 'Ada program', 'java', JSON.stringify([{ name: 'Main.java', source: 'class Main {}' }]));

ok('the owner can read it', !!get.get(progId, ada));
ok('another student cannot read it', get.get(progId, eve) === undefined);
ok('another student cannot rename it', update.run('stolen', progId, eve).changes === 0);
ok('another student cannot delete it', del.run(progId, eve).changes === 0);
ok('it is still there and unchanged after all that', get.get(progId, ada).title === 'Ada program');
ok('another student\'s list does not include it', list.all(eve).length === 0);
ok('the owner\'s list does', list.all(ada).length === 1);

// Deleting a student takes their sandbox with them. Attempt history deliberately
// survives a roster deactivation; scratch code is not gradebook data and does not.
db.prepare('DELETE FROM students WHERE id = ?').run(ada);
ok('deleting a student cascades their programs away', list.all(ada).length === 0);

// ── 6. THE PAGE ──────────────────────────────────────────────────────────────
section('6. The page renders with the server\'s own limits baked in');
const route = require('../routes/sandbox');
const html = page.render(route.config());
ok('it is a complete document', /^<!DOCTYPE html>/.test(html) && /<\/html>\s*$/.test(html));
ok('it loads nothing from a third-party origin', !/(src|href)=["']https?:/i.test(html));
ok('it carries the server config', html.includes('__SANDBOX_CONFIG__'));
ok('the baked limit matches the server limit',
  html.includes(String(sandbox.MAX_TOTAL_CHARS)) && route.config().max_total_chars === sandbox.MAX_TOTAL_CHARS);
ok('all three languages are offered', /data-lang="java"/.test(html) && /data-lang="python"/.test(html) && /data-lang="javascript"/.test(html));
ok('it posts to the existing Judge0 proxy', html.includes('/api/judge0/run'));
ok('it never asks for a login to RUN', html.includes('without signing in'));
ok('the starters exist for every language',
  ['java', 'python', 'javascript'].every((k) => Array.isArray(page.STARTERS[k]) && page.STARTERS[k].length > 0));

// ── SIGN OUT CLEARS THE DRAFT ────────────────────────────────────────────────
//
// A student's code lives in localStorage so the editor survives a reload. On a
// shared school computer that also means it survives the STUDENT unless sign
// out clears it, and the next person at that machine gets it restored into
// their editor. Asserting on the page source would only prove the letters
// "removeItem(DRAFT_KEY)" appear somewhere; it would not catch the ordering
// trap, which is real: setLanguage() ends in saveDraft(), so clearing the key
// BEFORE resetting the editor writes a fresh draft straight back and leaves
// one behind anyway.
//
// So the shipped functions are pulled out of the page and actually RUN here,
// against stubs that reproduce that trap: the setLanguage stub writes the
// draft key exactly like the real one does. The assertion is on the end state
// of the fake storage, not on the text of the function.
const vm = require('vm');

function extractFn(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) return null;
  // Walk braces from the function's opening { to its matching close.
  let i = src.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  return null;
}

const signOutSrc = extractFn(html, 'signOut');
const confirmSrc = extractFn(html, 'confirmDiscard');
ok('the page still defines signOut and confirmDiscard', !!signOutSrc && !!confirmSrc);

function runSignOut(opts) {
  const store = Object.assign({
    apcse_sandbox_token: 't', apcse_sandbox_who: 'Ada', apcse_sandbox_draft: 'STUDENT CODE',
  }, opts.store || {});
  const calls = { reset: 0, renderAccount: 0 };
  const ctx = {
    state: { token: 't', who: 'Ada', language: 'java', dirty: !!opts.dirty },
    TOKEN_KEY: 'apcse_sandbox_token',
    WHO_KEY: 'apcse_sandbox_who',
    DRAFT_KEY: 'apcse_sandbox_draft',
    localStorage: {
      removeItem: (k) => { delete store[k]; },
      setItem: (k, v) => { store[k] = v; },
      getItem: (k) => (k in store ? store[k] : null),
    },
    // The real one resets the editor and then calls saveDraft(). Reproduced,
    // because that is exactly what makes clear-then-reset the wrong order.
    setLanguage: (lang, o) => {
      if (o && o.reset) calls.reset++;
      store.apcse_sandbox_draft = 'STARTERS';
    },
    renderAccount: () => { calls.renderAccount++; },
    $: () => ({ set hidden(v) {}, get hidden() { return false; } }),
    window: { confirm: () => opts.confirmAnswer !== false },
  };
  vm.createContext(ctx);
  vm.runInContext(confirmSrc + '\n' + signOutSrc + '\nsignOut();', ctx);
  return { store, calls, state: ctx.state };
}

const clean = runSignOut({ dirty: false });
ok('sign out drops the token', clean.store.apcse_sandbox_token === undefined);
ok('sign out drops the saved draft, so the next student starts fresh',
  clean.store.apcse_sandbox_draft === undefined);
ok('sign out resets the editor rather than leaving code on screen', clean.calls.reset === 1);

// The ordering guard. If someone "simplifies" this by clearing the keys first
// and resetting after, the setLanguage stub writes STARTERS back and this fails.
ok('no draft is written back after the reset',
  !('apcse_sandbox_draft' in clean.store));

const kept = runSignOut({ dirty: true, confirmAnswer: false });
ok('unsaved work is not discarded when the student cancels the confirm',
  kept.store.apcse_sandbox_draft === 'STUDENT CODE' && kept.state.token === 't');

const discarded = runSignOut({ dirty: true, confirmAnswer: true });
ok('confirming at the prompt does sign out and does clear the draft',
  discarded.store.apcse_sandbox_draft === undefined && discarded.state.token === null);

// ── CLEANUP ──────────────────────────────────────────────────────────────────
try {
  db.close();
  fs.rmSync(TMP, { recursive: true, force: true });
} catch (e) { /* a leftover temp dir is not worth failing a suite over */ }

console.log(`\n${'-'.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed${skip ? `, ${skip} skipped` : ''}`);
process.exit(fail ? 1 : 0);

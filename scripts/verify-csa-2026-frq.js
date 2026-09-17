'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  RUNS THE 2026 MODEL SOLUTIONS. DOES NOT READ THEM.
//
//  config/csa-frq-2026.json carries College Board's own model and alternate
//  solutions, typed out of ap26-sg-computer-science-a.pdf. Typed is the
//  operative word: the extraction put an EN DASH where `j - 1` belongs in one
//  alternate, and a file that nobody executes would have shipped that to a
//  student as an answer key.
//
//  So every solution in that file is compiled with real javac and run against
//  the examples the QUESTION states, not against anything asserted here. The
//  expectations come from the question text:
//
//    Q1  "Luis-Cruz" taken -> "Luis-Cruz3";  "PSmith" free -> "PSmith"
//        "Amy-Marie-Lin" -> "AmMariLin";     "SammyB3" -> "SammyB3"
//    Q2  the six rows of the sample execution table
//    Q3  the worked roster, which the question says returns 2
//    Q4  getPointsForRow(0) is 1300, getPointsForRow(2) is 2000
//
//  ── AND THEN IT BREAKS THEM ON PURPOSE ──────────────────────────────────────
//  A harness that only ever runs correct code cannot tell you it is measuring
//  anything. `--mutate` applies one named wrong edit per question and REQUIRES
//  the run to go red. A green mutation run is a FAILED check, which is the
//  house rule and the reason two guards in this repo were found hollow.
//
//  Zero PII. Author content and College Board's published solutions only.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const DATA = path.join(__dirname, '..', 'config', 'csa-frq-2026.json');
const spec = JSON.parse(fs.readFileSync(DATA, 'utf8'));

//  javac and java pick up JAVA_TOOL_OPTIONS and print a banner on stderr that
//  is not an error. Blanking it keeps the failure output readable.
const ENV = Object.assign({}, process.env, { JAVA_TOOL_OPTIONS: '' });

// ── THE HARNESSES ────────────────────────────────────────────────────────────
//  Scaffolding only: the classes the question says are "not shown", plus a
//  main that calls the solution with the question's own inputs. The solution
//  text itself is spliced in verbatim from the JSON and never edited here.
//  A `public class` must live in a file of its own name, so question 2's
//  answer is written beside Main rather than inside it.
const EXTRA = {
  2: (sol) => ({ 'Bottle.java': sol[''] }),
};

const HARNESS = {
  1: (sol) => `
import java.util.*;
public class Main {
  static class Account {
    private String username;
    static Set<String> taken = new HashSet<String>();
    public static boolean isAvailable(String str) { return !taken.contains(str); }
${indent(sol.A, 4)}
${indent(sol.B, 4)}
    public String getUsername() { return username; }
  }
  public static void main(String[] a) {
    Account.taken = new HashSet<String>(Arrays.asList("Luis-Cruz", "Luis-Cruz1", "Luis-Cruz2"));
    System.out.println(new Account("Luis-Cruz").getUsername());
    Account.taken = new HashSet<String>();
    System.out.println(new Account("PSmith").getUsername());
    Account amy = new Account("Amy-Marie-Lin");
    System.out.println(amy.getShortenedName());
    System.out.println(amy.getUsername());
    System.out.println(new Account("SammyB3").getShortenedName());
  }
}`,
  2: (sol) => `
import java.util.*;
public class Main {
  public static void main(String[] a) {
    Bottle water = new Bottle(1000.0);
    System.out.println(water.updateAmount(400.0));
    System.out.println(water.updateAmount(100.0));
    System.out.println(water.updateAmount(300.0));
    Bottle shampoo = new Bottle(40.0);
    System.out.println(shampoo.updateAmount(30.0));
    System.out.println(shampoo.updateAmount(1.0));
  }
}`,
  3: (sol) => `
import java.util.*;
class CourseRecord {
  private String id; private int absences;
  CourseRecord(String id, int absences) { this.id = id; this.absences = absences; }
  public String getStudentID() { return id; }
  public int getAbsences() { return absences; }
}
class Attendance {
  private ArrayList<CourseRecord> historyList;
  private ArrayList<CourseRecord> mathList;
  Attendance(ArrayList<CourseRecord> h, ArrayList<CourseRecord> m) { historyList = h; mathList = m; }
${indent(sol[''], 2)}
  int histSize() { return historyList.size(); }
  int mathSize() { return mathList.size(); }
}
public class Main {
  public static void main(String[] a) {
    ArrayList<CourseRecord> h = new ArrayList<CourseRecord>(Arrays.asList(
      new CourseRecord("dr03", 2), new CourseRecord("ot32", 5),
      new CourseRecord("sq98", 4), new CourseRecord("ry00", 1),
      new CourseRecord("zz11", 9)));
    ArrayList<CourseRecord> m = new ArrayList<CourseRecord>(Arrays.asList(
      new CourseRecord("dr03", 2), new CourseRecord("ot32", 1),
      new CourseRecord("sq98", 0), new CourseRecord("ry00", 6),
      new CourseRecord("qq22", 8)));
    Attendance at = new Attendance(h, m);
    System.out.println(at.moreHistoryThanMathAbsences());
    System.out.println(at.histSize() + "," + at.mathSize());
  }
}`,
  4: (sol) => `
import java.util.*;
class Space {
  private String color; private int points;
  Space(String c, int p) { color = c; points = p; }
  public String getColor() { return color; }
  public int getPoints() { return points; }
}
class GameBoard {
  private Space[][] board;
  GameBoard(Space[][] b) { board = b; }
${indent(sol[''], 2)}
}
public class Main {
  public static void main(String[] a) {
    Space[][] b = {
      { new Space("red", 500), new Space("blue", 300), new Space("red", 500) },
      { new Space("red", 100), new Space("red", 100), new Space("blue", 100) },
      { new Space("green", 400), new Space("green", 400), new Space("green", 200) },
      { new Space("blue", 50), new Space("red", 50), new Space("blue", 50) }};
    GameBoard g = new GameBoard(b);
    System.out.println(g.getPointsForRow(0));
    System.out.println(g.getPointsForRow(2));
  }
}`,
};

//  The expected stdout, line for line, taken from the question text. Lines
//  after the answer lines are invariants: Q1 line 4 proves part B did not
//  modify username, Q3 line 2 proves neither list was touched.
const EXPECT = {
  1: ['Luis-Cruz3', 'PSmith', 'AmMariLin', 'Amy-Marie-Lin', 'SammyB3'],
  2: ['600.0', '500.0', '1000.0', '10.0', '40.0'],
  3: ['2', '5,5'],
  4: ['1300', '2000'],
};

//  One named wrong edit per question, each a mistake the page warns about.
//  find/replace against the model solution, exactly like the seed/csa-frq
//  mutants. Every one of these MUST make the run go red.
const MUTANTS = {
  1: { part: 'B', describe: 'part B cuts only the hyphen and leaves the letter before it',
       find: 'result.substring(0, j - 1)', replace: 'result.substring(0, j)' },
  2: { part: '', describe: 'the refill threshold uses <= so a bottle sitting exactly on 25 percent refills',
       find: 'if (currentAmount < capacity * 0.25)', replace: 'if (currentAmount <= capacity * 0.25)' },
  3: { part: '', describe: 'the absence comparison uses >= rather than >',
       find: 'hst.getAbsences() > mth.getAbsences()', replace: 'hst.getAbsences() >= mth.getAbsences()' },
  4: { part: '', describe: 'the row sum is taken down a column instead of across a row',
       find: 'for (Space spc : board[targetRow])\n    {\n        String currentColor = spc.getColor();',
       replace: 'for (int i = 0; i < board.length; i++)\n    {\n        Space spc = board[i][targetRow];\n        String currentColor = spc.getColor();' },
};

function indent(src, n) {
  const pad = ' '.repeat(n);
  return src.split('\n').map((l) => (l.length ? pad + l : l)).join('\n');
}

function runJava(source, extra) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'csa26-'));
  try {
    fs.writeFileSync(path.join(dir, 'Main.java'), source);
    const files = ['Main.java'];
    for (const [name, src] of Object.entries(extra || {})) {
      fs.writeFileSync(path.join(dir, name), src);
      files.push(name);
    }
    try {
      cp.execSync('javac -nowarn -proc:none -d "' + dir + '" '
        + files.map((f) => '"' + path.join(dir, f) + '"').join(' '),
        { encoding: 'utf8', stdio: 'pipe', timeout: 90000, env: ENV });
    } catch (e) {
      return { ok: false, stage: 'compile', out: String(e.stdout || '') + String(e.stderr || '') };
    }
    try {
      const out = cp.execSync('java -cp "' + dir + '" Main', { encoding: 'utf8', stdio: 'pipe', timeout: 60000, env: ENV });
      return { ok: true, stage: 'run', out: out.replace(/\r/g, '').trim() };
    } catch (e) {
      return { ok: false, stage: 'run', out: String(e.stdout || '') + String(e.stderr || '') };
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

//  A solution set is `modelSolution` with one part swapped for an alternate,
//  so an alternate is exercised against the same expectations as the model.
function withAlternate(q, alt) {
  const sol = Object.assign({}, q.modelSolution);
  sol[alt.part] = alt.code;
  return sol;
}

function check(q, sol, label, results) {
  const r = runJava(HARNESS[q.number](sol), EXTRA[q.number] ? EXTRA[q.number](sol) : null);
  const want = EXPECT[q.number];
  const got = r.ok ? r.out.split('\n').map((s) => s.trim()) : [];
  const pass = r.ok && got.length === want.length && want.every((w, i) => got[i] === w);
  results.push({ q: q.number, label, pass, stage: r.stage, want, got, out: r.out });
  return pass;
}

function main() {
  const mutate = process.argv.includes('--mutate');
  const results = [];

  for (const q of spec.questions) {
    check(q, q.modelSolution, 'model solution', results);
    (q.alternateSolutions || []).forEach((alt, i) => {
      check(q, withAlternate(q, alt), 'alternate ' + (i + 1) + (alt.part ? ' (part ' + alt.part + ')' : ''), results);
    });
  }

  let mutantRows = [];
  if (mutate) {
    for (const q of spec.questions) {
      const m = MUTANTS[q.number];
      const sol = Object.assign({}, q.modelSolution);
      const before = sol[m.part];
      if (before.indexOf(m.find) < 0) {
        mutantRows.push({ q: q.number, describe: m.describe, caught: false, why: 'find text is not in the model solution any more' });
        continue;
      }
      sol[m.part] = before.replace(m.find, m.replace);
      const probe = [];
      const passed = check(q, sol, 'MUTANT', probe);
      //  A mutant that still passes means the harness is not measuring the
      //  thing the mistake breaks.
      mutantRows.push({ q: q.number, describe: m.describe, caught: !passed, why: passed ? 'harness still passed' : probe[0].got.join(' ') });
    }
  }

  const fails = results.filter((r) => !r.pass);
  for (const r of results) {
    console.log((r.pass ? '  ok   ' : '  FAIL ') + 'Q' + r.q + '  ' + r.label);
    if (!r.pass) {
      console.log('         stage ' + r.stage);
      console.log('         want  ' + r.want.join(' | '));
      console.log('         got   ' + (r.got.length ? r.got.join(' | ') : '(none)'));
      console.log('         ' + r.out.split('\n').slice(0, 8).join('\n         '));
    }
  }

  if (mutate) {
    console.log('\nmutation: a mutant that PASSES is a failed check');
    for (const m of mutantRows) {
      console.log((m.caught ? '  caught ' : '  MISSED ') + 'Q' + m.q + '  ' + m.describe + '  ->  ' + m.why);
    }
  }

  const missed = mutantRows.filter((m) => !m.caught);
  const total = results.length;
  console.log('\n' + (total - fails.length) + ' of ' + total + ' solution run(s) reproduce the question\'s own examples'
    + (mutate ? ',  ' + (mutantRows.length - missed.length) + ' of ' + mutantRows.length + ' mutants caught' : ''));

  if (fails.length || missed.length) process.exit(1);
}

main();

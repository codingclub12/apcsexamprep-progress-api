'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  HEADLESS GREENFOOT STUB - what makes intro-java code exercises auto-gradable.
//
//  Greenfoot cannot run in Judge0: there is no Greenfoot runtime in the sandbox
//  and no graphical world. But the logic students actually write inside act()
//  is nearly always pure Java. A neighbour check, a bounds test, a score
//  accumulation, a nested loop over a tile map: none of that needs a window, it
//  needs `Actor`, `World` and `Greenfoot` to EXIST as symbols.
//
//  So this file emits a tiny pure-Java implementation of exactly the Greenfoot
//  API surface docs/intro-java-course-spec.md teaches, injected as the prelude
//  of an ordinary Judge0 run. The student's method compiles and runs against a
//  fake world whose state the test case sets and whose result the test case
//  asserts.
//
//  This is NOT a Greenfoot emulator and must never grow into one. It covers the
//  taught surface and throws a labelled error on anything else, so an exercise
//  that drifts outside what students have met fails loudly at authoring time
//  rather than silently mis-grading somebody's kid.
//
//  ── TWO PROPERTIES THAT ARE NOT OPTIONAL ────────────────────────────────────
//
//  1. DETERMINISTIC. Greenfoot.getRandomNumber is a seeded LCG, not real
//     randomness. A test whose expected output depends on real randomness is a
//     flaky test, and a flaky test fails students at random for code that is
//     correct. The seed is set per case.
//  2. SCRIPTABLE INPUT. Greenfoot.isKeyDown reads a per-case key set, so a case
//     can assert "given the left arrow is held, x decreases by 4".
//
//  ── HOW IT GETS PAST THE class/main WRAP ────────────────────────────────────
//
//  routes/student.js buildProgram() wraps prelude + segment + postlude inside
//  `public class Main { public static void main(...) { ... } }`. Java forbids
//  declaring a method inside a method, and local classes cannot hold statics or
//  refer to a local class declared after them (Actor and World are mutually
//  referential, so that ordering rule alone rules local classes out).
//
//  The stub therefore CLOSES main and Main, declares its classes at top level,
//  and reopens a harness class for the student's segment to land in. Brace
//  arithmetic, assembled here so no exercise author ever hand-writes it:
//
//      public class Main {                      <- from buildProgram
//        public static void main(String[] a) {  <- from buildProgram
//      Harness.__main();                        <- PRELUDE: run the case
//      }                                        <- PRELUDE: close main
//      }                                        <- PRELUDE: close Main
//      class Greenfoot { ... }                  <- PRELUDE: top-level stub classes
//      class Actor { ... }
//      class World { ... }
//      class Fruit extends Actor { }            <- PRELUDE: the case's own helpers
//      class Harness extends Actor {            <- PRELUDE: reopen for the student
//        public void slideLeft() { ... }        <- SEGMENT: student methods, CLASS level
//        static void __main() {                 <- POSTLUDE: the case's assertions
//          ...
//        }                                      <- from buildProgram, closes __main
//      }                                        <- from buildProgram, closes Harness
//
//  It balances exactly, and it needs ZERO change to the existing grader, which
//  is the point: CSA's code grading keeps working untouched and there is no
//  second grading path to keep in sync.
//
//  Note WHERE each of the three parts lands, because buildProgram concatenates
//  them in order and that fixes what each one can contain:
//
//    prelude   after the sentinel: TOP-LEVEL declarations only (helper Actor
//              subclasses the case needs). Usually empty.
//    segment   the student's answer, at class level inside Harness, which is
//              what lets an exercise ask for a METHOD. This course does that
//              constantly, and it is the reason the harness exists at all.
//    postlude  the case's assertions, as the body of Harness.__main().
//
//  Putting the assertions in the prelude instead would drop them ABOVE the
//  student's segment, i.e. inside nothing, and every exercise would fail to
//  compile. That was the first version of this file and the smoke test caught it.
//
//  The fragility is real and contained on purpose: it depends on buildProgram
//  appending exactly two closing braces. smoke/greenfoot-stub.js asserts that
//  the assembled program is brace-balanced against the real buildProgram, so if
//  that wrap ever changes, a test goes red instead of every intro-java exercise
//  quietly failing to compile.
// ─────────────────────────────────────────────────────────────────────────────

// A test case opts in by putting this on its own line in the prelude. Anything
// before it is dropped; anything after it is emitted as TOP-LEVEL declarations
// (the case's own helper Actor subclasses). The case's assertions go in the
// POSTLUDE, not here. A case WITHOUT the sentinel is returned untouched, which
// is why every existing CSA case is unaffected.
const SENTINEL = /^[ \t]*\/\/[ \t]*@greenfoot-stub(?:[ \t]+(actor|world|plain))?[ \t]*$/m;

// What the harness extends, chosen by the sentinel's argument:
//   actor (default) - student writes Actor-side code and may call move/turn/getX
//   world           - student writes World-side code: prepare(), addObject, ...
//   plain           - neither; pure-logic methods with no Greenfoot receiver
const HARNESS_BASE = {
  actor: 'class Harness extends Actor {',
  // A 10x10 grid of 32px cells. An exercise needing another size declares its
  // own World subclass in the prelude's helper space and uses that; this
  // default exists so the common case needs no ceremony.
  world: 'class Harness extends World {\n  Harness() { super(10, 10, 32); }',
  plain: 'class Harness {',
};

// ── The stub itself ──────────────────────────────────────────────────────────
// Java 8 compatible on purpose (no var, no diamond-less generics shortcuts, no
// static methods on local classes): Judge0's Java build is not pinned by us and
// has moved before.
const STUB_JAVA = `
// ---- headless Greenfoot stub (generated; see lib/greenfoot-stub.js) ----------
class GreenfootStubError extends RuntimeException {
  GreenfootStubError(String m) { super("greenfoot-stub: " + m); }
}

class Greenfoot {
  private static long seed = 20260816L;
  private static final java.util.Set<String> keys = new java.util.HashSet<String>();

  // Test-case controls. The leading __ marks them as harness-only: no student
  // ever writes these, and no lesson teaches them.
  static void __seed(long s) { seed = s; }
  static void __keys(String... ks) {
    keys.clear();
    if (ks != null) for (String k : ks) if (k != null) keys.add(k.toLowerCase());
  }

  // Seeded LCG, NOT java.util.Random: identical output on every Judge0 build
  // and every Java version, which java.util.Random does not guarantee across
  // implementations. Deterministic grading depends on this.
  static int getRandomNumber(int limit) {
    if (limit <= 0) return 0;
    seed = seed * 6364136223846793005L + 1442695040888963407L;
    int r = (int) ((seed >>> 33) % limit);
    return r < 0 ? r + limit : r;
  }

  static boolean isKeyDown(String k) { return k != null && keys.contains(k.toLowerCase()); }
  static String getKey() { return null; }

  // Presentational and timing calls: no-ops rather than errors. They appear in
  // perfectly correct student code, they cannot affect a logic assertion, and
  // throwing on them would fail working answers.
  static void delay(int n) { }
  static void playSound(String s) { }
  static void setSpeed(int s) { }
  static void start() { }
  static void stop() { }
}

class World {
  private final int width, height, cellSize;
  private final java.util.List<Actor> actors = new java.util.ArrayList<Actor>();

  World(int w, int h, int c) {
    if (w <= 0 || h <= 0 || c <= 0) throw new GreenfootStubError("world dimensions must be positive");
    width = w; height = h; cellSize = c;
  }

  public int getWidth() { return width; }
  public int getHeight() { return height; }
  public int getCellSize() { return cellSize; }

  public void addObject(Actor a, int x, int y) {
    if (a == null) throw new GreenfootStubError("addObject(null, ...)");
    actors.add(a);
    a.__place(this, x, y);
  }

  public void removeObject(Actor a) {
    if (a == null) return;
    actors.remove(a);
    a.__evict();
  }

  public void removeObjects(java.util.List<Actor> list) {
    if (list == null) return;
    // Copy first: removing while iterating the caller's live list is the
    // ConcurrentModificationException this course has a whole error page about.
    for (Actor a : new java.util.ArrayList<Actor>(list)) removeObject(a);
  }

  public int numberOfObjects() { return actors.size(); }

  public java.util.List<Actor> getObjects(Class<?> cls) {
    java.util.List<Actor> out = new java.util.ArrayList<Actor>();
    for (Actor a : actors) if (cls == null || cls.isInstance(a)) out.add(a);
    return out;
  }

  public java.util.List<Actor> getObjectsAt(int x, int y, Class<?> cls) {
    java.util.List<Actor> out = new java.util.ArrayList<Actor>();
    for (Actor a : actors) {
      if (a.__x() == x && a.__y() == y && (cls == null || cls.isInstance(a))) out.add(a);
    }
    return out;
  }

  public void act() { }

  // Deterministic scene dump, for cases that assert on the whole world rather
  // than one value. Sorted so list order can never make a correct answer fail.
  public String __dump() {
    java.util.List<String> parts = new java.util.ArrayList<String>();
    for (Actor a : actors) {
      parts.add(a.getClass().getSimpleName() + "@" + a.__x() + "," + a.__y());
    }
    java.util.Collections.sort(parts);
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < parts.size(); i++) {
      if (i > 0) sb.append(" ");
      sb.append(parts.get(i));
    }
    return sb.toString();
  }
}

class Actor {
  private World world = null;
  private int x = 0, y = 0, rotation = 0;

  // Stable identity, for the trace recorder only. Assigned on first entry to a
  // world and never reused, so the player can tell "the same worm moved" from
  // "that worm died and a different one appeared". Without it a frame is a bag
  // of coordinates and every actor teleports on every redraw.
  private static int __seq = 0;
  private int id = 0;
  int __ident() { return id; }

  // Harness-only accessors that do NOT throw, so world bookkeeping can read an
  // actor's position without tripping the not-in-world guard below.
  int __x() { return x; }
  int __y() { return y; }
  void __place(World w, int nx, int ny) {
    if (id == 0) id = ++__seq;
    world = w; x = nx; y = ny;
  }
  void __evict() { world = null; }

  private void __requireWorld(String what) {
    if (world == null) {
      // The real Greenfoot throws IllegalStateException here and it is one of
      // the most common runtime errors beginners hit, so the stub reproduces
      // it rather than silently returning 0.
      throw new GreenfootStubError(what + " called on an actor that is not in a world");
    }
  }

  public int getX() { __requireWorld("getX()"); return x; }
  public int getY() { __requireWorld("getY()"); return y; }
  public World getWorld() { __requireWorld("getWorld()"); return world; }
  public int getRotation() { return rotation; }
  public void setRotation(int r) { rotation = ((r % 360) + 360) % 360; }

  public void setLocation(int nx, int ny) {
    __requireWorld("setLocation()");
    // Greenfoot clamps to the world rather than throwing, and a lesson depends
    // on that being true (Unit 2 teaches edge clamping against this behaviour).
    x = Math.max(0, Math.min(world.getWidth() - 1, nx));
    y = Math.max(0, Math.min(world.getHeight() - 1, ny));
  }

  public void move(int distance) {
    __requireWorld("move()");
    double r = Math.toRadians(rotation);
    // Greenfoot rounds toward the nearest cell; Math.round matches what a
    // student sees on screen for the rotations this course uses (0/90/180/270).
    setLocation((int) Math.round(x + Math.cos(r) * distance),
                (int) Math.round(y + Math.sin(r) * distance));
  }

  public void turn(int amount) { setRotation(rotation + amount); }

  public void turnTowards(int tx, int ty) {
    __requireWorld("turnTowards()");
    setRotation((int) Math.round(Math.toDegrees(Math.atan2(ty - y, tx - x))));
  }

  public boolean isAtEdge() {
    __requireWorld("isAtEdge()");
    return x <= 0 || y <= 0 || x >= world.getWidth() - 1 || y >= world.getHeight() - 1;
  }

  // Intersection is same-cell, not pixel overlap. The stub has no images and no
  // sizes, so cell equality is the only definition it can honestly implement.
  // Every exercise that grades touching is authored on a cell grid for exactly
  // this reason; see the spec.
  public boolean isTouching(Class<?> cls) { return getOneIntersectingObject(cls) != null; }

  public Actor getOneIntersectingObject(Class<?> cls) {
    __requireWorld("getOneIntersectingObject()");
    for (Actor a : world.getObjectsAt(x, y, cls)) if (a != this) return a;
    return null;
  }

  public java.util.List<Actor> getIntersectingObjects(Class<?> cls) {
    __requireWorld("getIntersectingObjects()");
    java.util.List<Actor> out = new java.util.ArrayList<Actor>();
    for (Actor a : world.getObjectsAt(x, y, cls)) if (a != this) out.add(a);
    return out;
  }

  public void removeTouching(Class<?> cls) {
    __requireWorld("removeTouching()");
    for (Actor a : getIntersectingObjects(cls)) world.removeObject(a);
  }

  public java.util.List<Actor> getNeighbours(int distance, boolean diagonal, Class<?> cls) {
    __requireWorld("getNeighbours()");
    java.util.List<Actor> out = new java.util.ArrayList<Actor>();
    for (Actor a : world.getObjects(cls)) {
      if (a == this) continue;
      int dx = Math.abs(a.__x() - x), dy = Math.abs(a.__y() - y);
      boolean near = diagonal ? (dx <= distance && dy <= distance)
                              : (dx + dy <= distance);
      if (near) out.add(a);
    }
    return out;
  }

  public void act() { }

  // Image and presentation calls. No-ops, same reasoning as Greenfoot.delay:
  // they show up in correct code and cannot change a logic assertion.
  public void setImage(String filename) { }
  public void setImage(Object image) { }
  public Object getImage() { return null; }
}

// ---- trace recorder ---------------------------------------------------------
// Runs the world for N frames and prints what happened, so a browser can replay
// it on a canvas. This is state SAMPLING, not emulation: it reads getX/getY/
// getRotation once a frame and writes them down. Nothing here decides what an
// actor does. The stub's rule that it must never become a Greenfoot emulator is
// unaffected, and deliberately so.
//
// Only the Run button ever calls this. Submit still compares stdout to the
// case's expected output, and a graded case never records, so the grader needs
// no knowledge of any of this.
class GreenfootTrace {
  // Frames and actors are both hard capped. Student code decides how many
  // actors exist, and "unbounded array driven by user input" is exactly the
  // shape that produced a 169 dollar month once already.
  static final int MAX_FRAMES = 240;
  static final int MAX_ACTORS = 300;

  static void record(World w, int frames) {
    if (w == null) throw new GreenfootStubError("record(null, ...)");
    int n = Math.max(1, Math.min(MAX_FRAMES, frames));

    java.util.List<String> types = new java.util.ArrayList<String>();
    StringBuilder out = new StringBuilder();
    String trunc = null;
    String error = null;

    // Frame 0 is the scene BEFORE anything acts. A student whose act() is empty
    // should still see their world, not a blank canvas.
    out.append(frame(w, types));

    for (int i = 1; i < n && trunc == null && error == null; i++) {
      try {
        w.act();
        // Copy before iterating: an actor may remove itself or another during
        // act(), which is the ConcurrentModificationException this course has a
        // help page about. The real Greenfoot copies here too.
        for (Actor a : new java.util.ArrayList<Actor>(w.getObjects(null))) a.act();
      } catch (Throwable t) {
        // A crash is the interesting part, not a reason to show nothing. Record
        // it, keep the frames up to it, and let the page say "ran 12 frames,
        // then threw this".
        error = t.getClass().getSimpleName()
              + (t.getMessage() == null ? "" : ": " + t.getMessage());
        break;
      }
      if (w.numberOfObjects() > MAX_ACTORS) { trunc = "actors"; break; }
      out.append(",").append(frame(w, types));
    }

    StringBuilder head = new StringBuilder();
    head.append("{\\"w\\":").append(w.getWidth())
        .append(",\\"h\\":").append(w.getHeight())
        .append(",\\"c\\":").append(w.getCellSize())
        .append(",\\"t\\":[");
    for (int i = 0; i < types.size(); i++) {
      if (i > 0) head.append(",");
      head.append(quote(types.get(i)));
    }
    head.append("],\\"f\\":[").append(out).append("]");
    if (trunc != null) head.append(",\\"trunc\\":").append(quote(trunc));
    if (error != null) head.append(",\\"error\\":").append(quote(error));
    head.append("}");

    // Sentinels on their own lines. The page strips this block and shows the
    // rest of stdout as console output, so a student's own println still works
    // exactly as it does in Greenfoot's terminal window.
    System.out.println("@@GF-TRACE-BEGIN@@");
    System.out.println(head.toString());
    System.out.println("@@GF-TRACE-END@@");
  }

  // One frame: [[id,typeIndex,x,y,rotation],...]. Indices into a shared name
  // table rather than repeated strings, because "Crab" 240 times is most of the
  // payload otherwise.
  private static String frame(World w, java.util.List<String> types) {
    StringBuilder sb = new StringBuilder("[");
    java.util.List<Actor> all = w.getObjects(null);
    for (int i = 0; i < all.size(); i++) {
      Actor a = all.get(i);
      String name = a.getClass().getSimpleName();
      int ti = types.indexOf(name);
      if (ti < 0) { types.add(name); ti = types.size() - 1; }
      if (i > 0) sb.append(",");
      sb.append("[").append(a.__ident()).append(",").append(ti).append(",")
        .append(a.__x()).append(",").append(a.__y()).append(",")
        .append(a.getRotation()).append("]");
    }
    return sb.append("]").toString();
  }

  // Minimal JSON string escaping. Only ever applied to class names and to a
  // Java exception message, never to anything a student typed: the trace
  // carries coordinates, and student free text is never serialised anywhere.
  private static String quote(String s) {
    StringBuilder sb = new StringBuilder("\\"");
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '"' || c == '\\\\') sb.append('\\\\').append(c);
      else if (c < 0x20) sb.append(' ');
      else sb.append(c);
    }
    return sb.append("\\"").toString();
  }
}
// ---- end stub ---------------------------------------------------------------
`;

/** True if this case opts into the stub. Used by the seed and the smoke test. */
function usesStub(prelude) { return SENTINEL.test(String(prelude || '')); }

/**
 * Expand one test case that opts into the Greenfoot stub.
 *
 * Takes and returns BOTH halves, because the stub has to add a piece to each
 * and they only make sense together. A case WITHOUT the sentinel comes back
 * byte-for-byte unchanged, which is why this is safe to call on every case
 * including every existing CSA one.
 *
 * @param {{prelude?: string, postlude?: string}} testCase
 * @returns {{prelude: string, postlude: string}}
 */
function expandCase(testCase) {
  const prelude = String((testCase && testCase.prelude) || '');
  const postlude = String((testCase && testCase.postlude) || '');

  const m = prelude.match(SENTINEL);
  if (!m) return { prelude, postlude };

  const base = HARNESS_BASE[m[1] || 'actor'];
  if (!base) throw new Error(`greenfoot-stub: unknown harness base "${m[1]}"`);

  // Everything after the sentinel line is top-level declaration space: helper
  // Actor subclasses this case needs, and nothing else. Anything BEFORE the
  // sentinel is discarded rather than emitted somewhere surprising, so the
  // sentinel has to lead.
  const helpers = prelude.slice(m.index + m[0].length).replace(/^\n/, '');

  return {
    prelude: [
      'Harness.__main();',
      '}',   // close main
      '}',   // close Main
      STUB_JAVA,
      helpers,
      base,
    ].join('\n'),
    // The case's assertions become the body of the entry point. buildProgram's
    // own two trailing braces close __main and the harness class.
    postlude: `  static void __main() {\n${postlude}`,
  };
}

// ── Trace runs ───────────────────────────────────────────────────────────────
//  Everything below serves the Run button, never Submit. See docs/greenfoot-
//  trace.md for the format and the reasoning.

const TRACE_BEGIN = '@@GF-TRACE-BEGIN@@';
const TRACE_END = '@@GF-TRACE-END@@';

// Anything interpolated into generated Java is checked against this first.
// A scene is authored in this repo and never by a student, but "authored here"
// is not a security model, and a typo'd type name should fail in Node with a
// clear message rather than as a javac error inside Judge0 that a student sees.
const JAVA_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const KEY_NAME = /^[a-z0-9 ]{1,16}$/;

function needName(v, what) {
  if (!JAVA_NAME.test(String(v || ''))) {
    throw new Error(`greenfoot-stub: ${what} must be a Java identifier, got ${JSON.stringify(v)}`);
  }
  return String(v);
}

function needInt(v, what, lo, hi) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) {
    throw new Error(`greenfoot-stub: ${what} must be an integer in [${lo}, ${hi}], got ${JSON.stringify(v)}`);
  }
  return n;
}

/**
 * Build the two halves of a TRACE run: the world is set up, acted on for a
 * fixed number of frames, and every frame is printed for a browser to replay.
 *
 * Returns the same {prelude, postlude} shape expandCase does, and is in fact
 * implemented through expandCase, so a trace program and a graded program are
 * assembled by the same audited code path. If that wrap ever changes, both move
 * together and smoke/greenfoot-stub.js catches it once rather than twice.
 *
 * @param {object} scene
 * @param {{width:number,height:number,cell:number}} scene.world
 * @param {Array<{type:string,x:number,y:number}>} scene.actors  `Harness` is the
 *        student's own class; list it like any other actor, at the position it
 *        should start in.
 * @param {string} [scene.helpers]  top level Java for the actor types used above
 * @param {number} [scene.frames]   how many times to act, capped at 240 in Java
 * @param {string[]} [scene.keys]   keys held down for the whole run
 * @param {number} [scene.seed]     seeds the LCG, so a run is reproducible
 * @param {'actor'|'world'|'plain'} [scene.base]
 * @returns {{prelude: string, postlude: string}}
 */
function traceCase(scene) {
  const s = scene || {};
  const w = s.world || {};
  const width = needInt(w.width, 'world.width', 1, 200);
  const height = needInt(w.height, 'world.height', 1, 200);
  const cell = needInt(w.cell, 'world.cell', 1, 200);
  const frames = needInt(s.frames === undefined ? 120 : s.frames, 'frames', 1, 240);
  const seed = needInt(s.seed === undefined ? 20260816 : s.seed, 'seed', -2147483648, 2147483647);
  const base = s.base || 'actor';
  if (!HARNESS_BASE[base]) throw new Error(`greenfoot-stub: unknown harness base "${base}"`);

  const keys = (s.keys || []).map((k) => {
    if (!KEY_NAME.test(String(k))) {
      throw new Error(`greenfoot-stub: key must be lowercase letters, digits or spaces, got ${JSON.stringify(k)}`);
    }
    return `"${k}"`;
  });

  const actors = (s.actors || []).map((a, i) => {
    const type = needName(a && a.type, `actors[${i}].type`);
    const x = needInt(a && a.x, `actors[${i}].x`, 0, width - 1);
    const y = needInt(a && a.y, `actors[${i}].y`, 0, height - 1);
    return `    w.addObject(new ${type}(), ${x}, ${y});`;
  });
  if (!actors.length) throw new Error('greenfoot-stub: a trace scene needs at least one actor');

  const postlude = [
    `    Greenfoot.__seed(${seed}L);`,
    `    Greenfoot.__keys(${keys.join(', ')});`,
    `    World w = new World(${width}, ${height}, ${cell});`,
    ...actors,
    `    GreenfootTrace.record(w, ${frames});`,
  ].join('\n');

  return expandCase({
    prelude: `// @greenfoot-stub ${base}\n${s.helpers || ''}`,
    postlude,
  });
}

/**
 * Split a Judge0 stdout into the trace and everything else.
 *
 * The student's own println output is not swallowed: it comes back as `stdout`
 * and the page shows it in a console pane, the way Greenfoot's terminal window
 * does. A run with no trace block returns `trace: null` and the full text, so
 * this is safe to call on any output.
 *
 * `opts.names` renames types for DISPLAY only, and is applied here rather than
 * in the Java on purpose. The recorder prints the real class names, because the
 * trace should say what actually ran. But the student's own code lands in a
 * class called `Harness`, which is an assembly detail nobody should ever read
 * on a lesson about crabs. So the page passes `{ Harness: "Crab" }` and gets a
 * `d` array alongside the truthful `t` one.
 *
 * @param {string} raw
 * @param {{names?: Object<string,string>}} [opts]
 * @returns {{trace: object|null, stdout: string, malformed: boolean}}
 */
function parseTrace(raw, opts) {
  const text = String(raw == null ? '' : raw);
  const a = text.indexOf(TRACE_BEGIN);
  const b = text.indexOf(TRACE_END);
  if (a === -1 || b === -1 || b < a) return { trace: null, stdout: text, malformed: false };

  const body = text.slice(a + TRACE_BEGIN.length, b);
  const stdout = (text.slice(0, a) + text.slice(b + TRACE_END.length)).replace(/\n{3,}/g, '\n\n');
  try {
    const trace = JSON.parse(body.trim());
    const names = (opts && opts.names) || null;
    if (names && Array.isArray(trace.t)) {
      trace.d = trace.t.map((n) => (Object.prototype.hasOwnProperty.call(names, n) ? String(names[n]) : n));
    }
    return { trace, stdout, malformed: false };
  } catch (e) {
    // Truncated stdout is the likely cause (Judge0 caps it). Say so rather than
    // throwing: the console output is still worth showing.
    return { trace: null, stdout, malformed: true };
  }
}

module.exports = { expandCase, usesStub, STUB_JAVA, SENTINEL, HARNESS_BASE,
  traceCase, parseTrace, TRACE_BEGIN, TRACE_END };

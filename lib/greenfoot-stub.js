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

  // Harness-only accessors that do NOT throw, so world bookkeeping can read an
  // actor's position without tripping the not-in-world guard below.
  int __x() { return x; }
  int __y() { return y; }
  void __place(World w, int nx, int ny) { world = w; x = nx; y = ny; }
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

module.exports = { expandCase, usesStub, STUB_JAVA, SENTINEL, HARNESS_BASE };

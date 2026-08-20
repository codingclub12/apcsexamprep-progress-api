# Greenfoot trace replay

Animated output for Intro to Java code exercises, without a Java runtime in the
browser and without a second Judge0 call.

Read this before touching the trace recorder in `lib/greenfoot-stub.js`, the
player in `shopify/greenfoot-player.js`, or authoring a scene.

## The problem it solves

The course teaches game programming and shows the student text. A lesson can
say that `setLocation(getX(), getY() - 1)` moves an actor UP, and the student
can fill that in correctly, and still not have seen it happen. Every visual
option was worse:

| Option | Editable | Real Java | Cost |
|---|---|---|---|
| Greenfoot HTML5 export | no | yes | conversion runs on greenfoot.org, no local export, no AWT |
| CheerpJ (WASM JVM) | yes | yes | tens of MB of runtime per page |
| A JS reimplementation of Greenfoot | yes | **no** | it will eventually disagree with the desktop tool |
| **Trace replay** | yes | yes | zero extra, it is the run you already paid for |

The third row is the one that matters. A JavaScript Greenfoot would drift, and a
course that teaches a behaviour the real tool does not have is worse than a
course with no animation. Everything the player draws was computed by `javac`
and a real JVM running the student's own code.

## How it works

1. The page sends the student's method to a run endpoint.
2. The server assembles the headless stub, the student's segment, and a
   generated scene, through the SAME `codeModes.assemble` path a graded
   submission uses.
3. The program builds a world, runs it for N frames, and prints every frame.
4. The page parses the printed block and animates it on a canvas.

Nothing about grading changes. Submit still compares stdout to the case's
expected output; a graded case never records a trace.

## The format

Printed to stdout between two sentinels, each on its own line:

```
@@GF-TRACE-BEGIN@@
{"w":20,"h":10,"c":40,"t":["Harness","Worm"],"f":[ ... ]}
@@GF-TRACE-END@@
```

| Key | Meaning |
|---|---|
| `w`, `h` | world size in CELLS, not pixels |
| `c` | Greenfoot's cell size. A proportion hint; the player picks its own scale |
| `t` | actor type names, indexed by the frames |
| `f` | one entry per frame |
| `d` | display names, added by `parseTrace` when the page supplies them. Never emitted by the Java |
| `error` | present only if the run threw. The exception name and message |
| `trunc` | present only if a cap stopped the run early. Currently only `"actors"` |

### `t` tells the truth, `d` is for the reader

The recorder prints real Java class names, because a trace should say what
actually ran. But the student's own code lands in a class called `Harness`,
which is an assembly detail nobody should read on a lesson about crabs. So the
page passes a map and gets a parallel array:

```js
parseTrace(stdout, { names: { Harness: 'Crab' } })
// trace.t -> ["Harness", "Worm"]   what ran
// trace.d -> ["Crab",    "Worm"]   what the legend says
```

The player prefers `d` and falls back to `t`.

A frame is a list of actors, each `[id, typeIndex, x, y, rotation]`:

```json
[[1,0,4,5,0],[2,1,12,5,0]]
```

Frame 0 is the scene BEFORE anything acts, so a student whose `act()` is empty
still sees their world rather than a blank canvas.

### The id is not decoration

`id` is assigned when an actor first enters a world and is never reused. It is
what lets the player tell "the same worm moved two cells" from "that worm died
and a different one appeared two cells over". Without it every frame is an
unordered bag of coordinates and everything teleports on every redraw. It is
also what makes fading a removed actor out possible instead of having it blink.

### Why indices instead of names

`"Crab"` repeated across 240 frames is most of the payload. A shared name table
plus an integer per actor takes a 40 frame, 3 actor run to about 1.8 KB and a
full 240 frame run to roughly 11 KB.

## The caps, and why they are not negotiable

`GreenfootTrace` in the stub:

- `MAX_FRAMES = 240`. The recorder clamps whatever it is asked for.
- `MAX_ACTORS = 300`. If the world exceeds this the run stops and sets
  `trunc: "actors"`.

Student code decides how many actors exist. "Unbounded array driven by user
input" is precisely the shape that produced a 169 dollar month on this project
once already, and the fact that it is bounded by a Judge0 timeout is not an
argument: the payload still has to cross the wire and be parsed in a browser.

A student who hits the actor cap is almost always spawning inside `act()`
without a counter, which is help page G-09. The player says so.

## A crash is a feature

If the student's code throws, the recorder catches it, keeps every frame up to
that point, and records the exception name and message.

```
frames: 4  (asked for 12)
error: "ArithmeticException: / by zero"
```

The student watches their actor take three steps and stop, and reads one line
saying what happened. That is a better first debugging experience than a stack
trace, and it is the case where animation earns its place most clearly.

## Authoring a scene

`traceCase()` takes a declarative scene and returns the `{prelude, postlude}`
pair `expandCase` produces, because it is implemented THROUGH `expandCase`. A
trace program and a graded program are assembled by the same audited code path,
so if the class/main wrap ever changes, both move together and
`smoke/greenfoot-stub.js` catches it once rather than twice.

```js
const { traceCase } = require('../lib/greenfoot-stub');
const codeModes = require('../lib/csa-code-modes');

const scene = traceCase({
  world: { width: 20, height: 10, cell: 40 },
  helpers: 'class Worm extends Actor { }',
  actors: [
    { type: 'Harness', x: 2, y: 5 },   // Harness IS the student's class
    { type: 'Worm', x: 12, y: 5 },
  ],
  frames: 40,
  keys: ['left'],      // held for the whole run
  seed: 20260816,      // seeds the LCG, so the run is reproducible
});

const program = codeModes.assemble('segment', 62, studentSegment, scene);
```

`Harness` is the class the student's method lands in. List it like any other
actor, at the cell it should start in.

Every value interpolated into generated Java is validated first: type names
against a Java identifier pattern, coordinates against the world bounds, keys
against a narrow character class. Scenes are authored in this repo and never by
a student, but "authored here" is not a security model, and a typo should fail
in Node with a clear message rather than as a javac error a student sees.

## What the recorder does NOT do

The stub's founding rule is that it must never grow into a Greenfoot emulator,
and the recorder does not breach it. It reads `getX`, `getY` and `getRotation`
once a frame and writes them down. It decides nothing about what an actor does.

Consequences worth stating plainly, because the page should not imply otherwise:

- **No images.** Actors draw as coloured discs with a nose showing rotation.
  `setImage` is a no-op in the stub and always was.
- **Cell collision, not pixel overlap.** `isTouching` is same-cell, because the
  stub has no images and therefore no sizes. Scenes are authored on a grid for
  this reason.
- **No mouse.** `getMouseInfo` is not in the taught surface.
- **Act order** is `World.act()` then each actor's `act()`, over a copy of the
  actor list, which is what the real Greenfoot does and why removing an actor
  mid-frame does not throw.

## Where it runs

The player is `shopify/greenfoot-player.js` and exposes `GreenfootPlayer.mount(host, trace)`.
Autoplay is off. `prefers-reduced-motion` turns tweening off, so actors step
frame to frame instead of sliding.

Three things it draws that are not decoration:

- **The grid.** Greenfoot positions are cell coordinates, and half the bugs in
  Units 1 and 2 come from a student thinking in pixels. With cells visible,
  `setLocation(getX(), getY() - 1)` is obviously one square up.
- **A nose on each actor.** An actor that has turned but not moved is otherwise
  identical to one that did nothing, and `turn()` is a lesson 1.4 idea students
  routinely believe does nothing.
- **A legend.** Without it a student looks at three identical discs and cannot
  tell which one is theirs. That is the first question they would ask.

The Step button matters more than Play. `act()` is called once per frame, and
stepping one frame at a time is the view that teaches lesson 1.6.

## Cost

A trace run is one Judge0 run: **$0.0017**, the same as any other Run press. The
trace rides on stdout of a call the student was already making. This is the
entire reason this design was chosen over anything needing a second execution or
a browser runtime.

The number to watch remains the aggregate, not the burst. `docs/csa-exercise-pages.md`
has the model: 60 students working all 53 CSA exercises is about $124 over a
semester, roughly $31 a month, already at the target. **Adding Intro to Java code
exercises to 42 more lessons roughly doubles that**, and that is a content
decision to make deliberately rather than a side effect of shipping animation.

## Still to build

This pass delivers the recorder, the format, the player and the tests. Not yet
built:

- The run endpoint that assembles a trace program and proxies it to Judge0 with
  per-student rate limiting, in the shape `routes/student.js` already uses.
- Exercise page rendering for Intro to Java lessons, which currently have
  `cfu`, `gap` and `quiz` items only and no code items at all.
- Manifest denominators for those items.

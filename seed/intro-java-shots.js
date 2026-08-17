'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA: WHICH SCREENSHOTS ACTUALLY EXIST.
//
//  The content bank references 158 screenshots. Almost none of them have been
//  taken yet, and taking them properly means building each scenario for real in
//  Greenfoot and shooting as you go, which is a person's afternoon per unit and
//  cannot be faked.
//
//  ── SO THE COURSE SHIPS WITHOUT THEM, AND IMPROVES AS THEY ARRIVE ───────────
//  A missing image is not a broken page here. When a shot is not in AVAILABLE
//  below, the renderer omits the <img> entirely and prints its alt text as a
//  "look at your own screen" instruction instead:
//
//      On your screen: the class diagram panel, showing World with a subclass
//      beneath it and Actor with several subclasses beneath it.
//
//  That is not a graceful degradation so much as a different teaching mode, and
//  for some steps it is arguably the better one: the student is looking at their
//  OWN Greenfoot window rather than a picture of somebody else's. The alt text
//  was already written to describe exactly what matters in the frame, which is
//  what makes this work at all.
//
//  What it must never do is ship a broken image icon with alt text as a caption,
//  which is what would have happened without this file.
//
//  ── HOW TO ADD ONE ──────────────────────────────────────────────────────────
//  1. Take the shot. docs/intro-java-shot-list.md is the working list: it names
//     every file, what to capture, and the code on screen at that step.
//  2. Upload it to the theme with the flattened name the renderer expects, which
//     the shot list prints for you.
//  3. Add that same path here.
//  4. Run `npm run smoke:introjava`. It checks the path is one the bank actually
//     references, so a typo fails rather than silently showing nothing.
//
//  Adding a shot is one line and needs no other change anywhere.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

// Paths exactly as the bank writes them: intro-java/{lesson}/step-{n}.png
const AVAILABLE = [
  // Generated diagrams, not screenshots. scripts/intro-java-figures.js draws
  // these from the bank and rasterises them; they are the images whose job is
  // to show a RELATIONSHIP (an array as boxes, a grid and its indexes, the
  // visiting order of a nested loop) rather than to show what Greenfoot looks
  // like on screen. Re-run `npm run figures` after editing a spec.
  'intro-java/1.1/step-2.png',
  'intro-java/3.5/step-2.png',
  'intro-java/3.5/step-3.png',
  'intro-java/5.1/step-1.png',
  'intro-java/5.1/step-2.png',
  'intro-java/5.2/step-1.png',
  'intro-java/6.1/step-1.png',
  'intro-java/6.2/step-1.png',
  'intro-java/6.2/step-2.png',
  'intro-java/6.2/step-3.png',
  'intro-java/6.3/step-1.png',
  'intro-java/6.4/step-1.png',
  'intro-java/6.6/step-3.png',
  'intro-java/6.7/step-1.png',
  'intro-java/6.7/step-2.png',

  // Still to come: everything showing the Greenfoot window itself, and every
  // running scenario. Those are real captures and cannot be drawn.
];

const SET = new Set(AVAILABLE);

/** Has this screenshot been taken and uploaded? */
function hasShot(src) { return SET.has(String(src)); }

module.exports = { AVAILABLE, SET, hasShot };

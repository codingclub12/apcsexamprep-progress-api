'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA: GENERATE THE FIGURES THAT ARE NOT SCREENSHOTS.
//
//  ── WHY ONLY SOME OF THE 158 ────────────────────────────────────────────────
//  The bank references 158 images. They are not one kind of thing:
//
//   1. The Greenfoot window, its menus, dialogs, object bench and API docs.
//      These have to be captured on a real machine. A mockup is WORSE than the
//      current "On your screen:" fallback, because the job of that image is
//      "this is what your screen looks like" and a mockup that differs slightly
//      sends a beginner hunting for something that is not there.
//
//   2. A running scenario: the crab moved, three actors placed, the world after
//      Reset. Also a real capture.
//
//   3. A picture of code. These are NOT generated here either, and the reason is
//      easy to miss: lib/intro-java-page.js already prints s.code as a <pre>
//      directly beneath the image. A picture of the same code is the same thing
//      twice, and the text version is the better one (selectable, copyable, read
//      aloud correctly). An ANNOTATED code figure would add something, but the
//      annotation is the part that cannot be derived from the bank, so those
//      wait for hand-authored specs.
//
//   4. A relationship: an array as boxes, a grid with its indices, the visiting
//      order of a nested loop, row/col becoming y/x. Nothing on the page carries
//      these, prose carries them badly, and they are exactly the ideas Units 5
//      and 6 stand on. THAT is what this script draws.
//
//  ── HOW ─────────────────────────────────────────────────────────────────────
//  Each figure is HTML, rasterised by the Chromium that ships in this
//  environment. 960x600 at 2x, because that is the size lib/intro-java-page.js
//  declares on every <img> and a wrong width/height attribute is layout shift on
//  a phone. Content is centred rather than top-aligned so a short figure reads
//  as deliberate instead of half-empty.
//
//  The figure never draws its own outer frame: .ij-shot img already carries a
//  1px border and a radius, and drawing a second one inside it looks like a bug.
//
//  ── THE SPECS ARE DATA ──────────────────────────────────────────────────────
//  SPECS below is the whole editorial surface: each entry names the lesson, the
//  step, and what to draw. Every entry is checked against the bank at run time,
//  so a spec pointing at a step that does not exist, or at a step whose alt text
//  has been rewritten, fails loudly rather than shipping a figure that no longer
//  matches its caption.
//
//  Run: npm run figures         (writes PNGs to build/figures)
//       npm run figures -- --check   (validates specs, draws nothing)
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { BANKS } = require('../seed/intro-java-banks');

const W = 960, H = 600, SCALE = 2;
const OUT = path.join(__dirname, '..', 'build', 'figures');
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean);

// Site palette, lifted from lib/intro-java-page.js so a figure cannot drift
// from the page it sits on.
const BLUE = '#0b5cd5';      // step accent
const AMBER = '#B45309';     // the Intro to Java course color
const INK = '#14212e';
const MUTED = '#5b7285';
const RULE = '#d3dbe3';
const WASH = '#f7f9fb';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Primitives ───────────────────────────────────────────────────────────────

/** A 1D array drawn as boxes. cells: array of {v, label, mark}. */
function arrayStrip(cells, opts) {
  const o = opts || {};
  const boxes = cells.map((c, i) => `<div class="cell${c.mark ? ' mark' : ''}">
      <div class="v">${c.v === null || c.v === undefined ? '&nbsp;' : esc(c.v)}</div>
      ${o.indices === false ? '' : `<div class="ix">${c.label !== undefined ? esc(c.label) : i}</div>`}
    </div>`).join('');
  return `<div class="strip">${boxes}</div>`;
}

/**
 * A 2D grid. rows: array of arrays of {v, mark, dim}.
 * opts: {rowLabels, colLabels, path: [[r,c],...], outside: [[r,c],...]}
 */
function grid(rows, opts) {
  const o = opts || {};
  const nCols = Math.max(...rows.map((r) => r.length));
  const head = o.colLabels
    ? `<tr><td class="corner"></td>${Array.from({ length: nCols }, (_, c) =>
      `<td class="hd">${c}</td>`).join('')}</tr>`
    : '';
  const body = rows.map((row, r) => `<tr>
    ${o.rowLabels ? `<td class="hd">${r}</td>` : ''}
    ${row.map((cell, c) => {
    const cls = ['gc'];
    if (cell.mark) cls.push('mark');
    if (cell.dim) cls.push('dim');
    if (o.path && o.path.some(([pr, pc]) => pr === r && pc === c)) cls.push('onpath');
    return `<td class="${cls.join(' ')}">${cell.v === null || cell.v === undefined ? '' : esc(cell.v)}</td>`;
  }).join('')}
  </tr>`).join('');
  return `<table class="grid">${head}${body}</table>`;
}

/** Two panels side by side, each {title, body, tone}. */
function twoUp(a, b) {
  const panel = (p) => `<div class="panel ${p.tone || ''}">
    <div class="ptitle">${esc(p.title)}</div>
    <div class="pbody">${p.body}</div>
    ${p.foot ? `<div class="pfoot">${esc(p.foot)}</div>` : ''}
  </div>`;
  return `<div class="twoup">${panel(a)}${panel(b)}</div>`;
}

/** A box-and-stem hierarchy: {root, kids}. */
function hierarchy(root, kids) {
  return `<div class="hier">
    <div class="hbox root">${esc(root)}</div>
    <div class="stem"></div>
    <div class="kids">${kids.map((k) => `<div class="hbox sub">${esc(k)}</div>`).join('')}</div>
  </div>`;
}

/** A plain table. head: [..], rows: [[..]]. */
function table(head, rows) {
  return `<table class="tbl">
    <tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>
    ${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}
  </table>`;
}

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; }
  body { font: 16px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         background: #fff; color: ${INK}; -webkit-font-smoothing: antialiased; }
  /* Explicit grid rows rather than a flex column. A flex column sizes the middle
     item from its content and will happily push the last row past the fixed
     600px, where it is cropped out of the PNG with no error anywhere: the figure
     just silently ships without its caption. 1fr cannot do that. */
  /* The stage is absolutely positioned rather than a flex or grid sibling of the
     header. Nested flex sizing inside a fixed-height root laid out wrong in the
     headless Chromium used to rasterise these: content drifted off centre and a
     trailing sibling silently failed to paint at all, so a figure could ship
     looking finished with a piece missing and nothing to catch it. Explicit
     insets have no such freedom. top:150 leaves room for a two line heading. */
  .fig { width: ${W}px; height: ${H}px; padding: 30px 34px; position: relative; }
  .eyebrow { font-size: 12.5px; letter-spacing: .1em; text-transform: uppercase;
             color: ${BLUE}; font-weight: 700; }
  h1 { font-size: 23px; line-height: 1.28; font-weight: 700; margin: 9px 0 0; max-width: 830px; }
  /* min-height:0 is load bearing. A flex item defaults to min-height:auto, so a
     tall stage refuses to shrink, overflows the fixed 600px, and pushes the note
     off the bottom edge where it is silently cropped out of the PNG. */
  .stage { position: absolute; left: 34px; right: 34px; top: 146px; bottom: 24px;
           display: flex; align-items: center; justify-content: center; }
  /* A plain block wrapper. A <table> as a direct flex item centres unreliably
     here; a block does not. */
  .art { display: block; }
  .note b { color: ${AMBER}; font-weight: 700; }
  code, .mono { font-family: "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace; }

  /* 1D array */
  .strip { display: flex; gap: 8px; }
  .cell { width: 78px; }
  .cell .v { height: 54px; border: 2px solid ${RULE}; border-radius: 6px; background: ${WASH};
             display: flex; align-items: center; justify-content: center;
             font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 21px; font-weight: 700; }
  .cell.mark .v { border-color: ${AMBER}; background: #fdf3e6; color: ${AMBER}; }
  .cell .ix { text-align: center; font-size: 13px; color: ${MUTED}; margin-top: 6px;
              font-family: "SF Mono", Menlo, Consolas, monospace; }
  .cell.mark .ix { color: ${AMBER}; font-weight: 700; }

  /* 2D grid */
  table.grid { border-collapse: separate; border-spacing: 5px; }
  table.grid td.gc { width: 54px; height: 40px; border: 2px solid ${RULE}; border-radius: 5px;
        background: ${WASH}; text-align: center; vertical-align: middle;
        font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 17px; font-weight: 700; }
  table.grid td.hd { color: ${MUTED}; font-size: 13px; text-align: center;
        font-family: "SF Mono", Menlo, Consolas, monospace; font-weight: 700; }
  table.grid td.mark { border-color: ${AMBER}; background: #fdf3e6; color: ${AMBER}; }
  table.grid td.onpath { border-color: ${BLUE}; background: #eaf1fd; color: ${BLUE}; }
  table.grid td.dim { opacity: .38; border-style: dashed; }

  /* panels */
  .twoup { display: flex; gap: 20px; width: 100%; align-items: stretch; }
  .panel { flex: 1; border: 1px solid ${RULE}; border-radius: 9px; padding: 14px;
           background: ${WASH}; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .panel.bad { border-color: #e0b4ad; background: #fdf4f2; }
  .panel.good { border-color: #a9cdbb; background: #f2faf6; }
  .ptitle { font-size: 14px; font-weight: 700; letter-spacing: .02em; align-self: flex-start;
            font-family: "SF Mono", Menlo, Consolas, monospace; }
  .panel.bad .ptitle { color: #96261b; }
  .panel.good .ptitle { color: #14603c; }
  .pbody { display: flex; align-items: center; justify-content: center; flex: 1; }
  .pfoot { font-size: 13.5px; color: ${MUTED}; text-align: center; }

  /* hierarchy */
  .hier { display: flex; flex-direction: column; align-items: center; }
  .hbox { border-radius: 7px; padding: 10px 20px; font-weight: 700; font-size: 17px;
          font-family: "SF Mono", Menlo, Consolas, monospace; white-space: nowrap; }
  .root { background: ${INK}; color: #fff; }
  .sub { background: #fff; color: ${AMBER}; border: 2px solid ${AMBER}; }
  .stem { width: 2px; height: 22px; background: #b8c3cc; }
  .kids { display: flex; gap: 12px; border-top: 2px solid #b8c3cc; padding-top: 18px; }

  /* table */
  table.tbl { border-collapse: collapse; }
  table.tbl th, table.tbl td { border: 1px solid ${RULE}; padding: 9px 16px; font-size: 15px;
        font-family: "SF Mono", Menlo, Consolas, monospace; text-align: center; }
  table.tbl th { background: ${INK}; color: #fff; font-weight: 700; }
  table.tbl tr:nth-child(even) td { background: ${WASH}; }

  .arrow { font-size: 26px; color: ${AMBER}; font-weight: 700; padding: 0 6px; }
  .row { display: flex; align-items: center; gap: 10px; }
  .stack { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .tag { font-size: 13px; color: ${MUTED}; font-family: "SF Mono", Menlo, Consolas, monospace; }
`;

function html(spec, lesson) {
  return `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
<div class="fig">
  <div class="eyebrow">Lesson ${esc(spec.lesson)} &middot; ${esc(lesson.title)} &middot; Step ${spec.step}</div>
  <h1>${esc(spec.heading)}</h1>
  <div class="stage"><div class="art">${spec.draw()}</div></div>
</div>`;
}

// ── The specs ────────────────────────────────────────────────────────────────
// One entry per figure. `alt` is copied from the bank at run time, never
// retyped, so image and alt text cannot disagree.
const z = (n) => Array.from({ length: n }, () => ({ v: 0 }));
const zrow = (n) => Array.from({ length: n }, () => ({ v: 0 }));

const SPECS = [
  {
    lesson: '1.1', step: 2,
    heading: 'Every class in a scenario sits under World or under Actor',
    draw: () => `<div class="twoup">
      <div class="panel"><div class="pbody">${hierarchy('World', ['CrabWorld'])}</div>
        <div class="pfoot">The world is the place. There is one.</div></div>
      <div class="panel"><div class="pbody">${hierarchy('Actor', ['Crab', 'Lobster', 'Worm'])}</div>
        <div class="pfoot">Actors are the things in it. There can be many.</div></div>
    </div>`,
  },
  {
    lesson: '3.5', step: 2,
    heading: 'A world is three numbers: width, height, and cell size',
    draw: () => `<div class="row">
      <div class="stack">${grid([zrow(6), zrow(6), zrow(6), zrow(6)], {})}
        <div class="tag">width = 6 cells</div></div>
      <div class="stack"><div class="tag">height<br>= 4 cells</div></div>
    </div>`,
  },
  {
    lesson: '3.5', step: 3,
    heading: 'The same coordinate lands somewhere different when cell size changes',
    draw: () => twoUp(
      { title: 'cellSize = 30', body: grid([[{ v: '' }, { v: '' }, { v: '' }], [{ v: '' }, { v: 'X', mark: true }, { v: '' }], [{ v: '' }, { v: '' }, { v: '' }]], {}), foot: 'Cell (1,1) is a big square.' },
      { title: 'cellSize = 1', body: `<div class="stack"><div style="width:150px;height:150px;border:2px solid ${RULE};border-radius:5px;background:${WASH};position:relative"><div style="position:absolute;left:49px;top:49px;width:3px;height:3px;background:${AMBER}"></div></div></div>`, foot: 'Cell (1,1) is one pixel.' }
    ),
  },
  {
    lesson: '5.1', step: 1,
    heading: 'An array is a fixed row of numbered boxes sharing one name',
    draw: () => `<div class="stack">${arrayStrip([{ v: 4 }, { v: 8 }, { v: 15 }, { v: 16 }, { v: 23 }])}
      <div class="tag">scores</div></div>`,
  },
  {
    lesson: '5.1', step: 2,
    heading: 'A new int array starts full of zeros, not empty',
    draw: () => `<div class="stack">${arrayStrip(z(5))}
      <div class="tag">new int[5]</div></div>`,
  },
  {
    lesson: '5.2', step: 1,
    heading: 'The index is the box number, and the last one is length minus 1',
    draw: () => `<div class="stack">${arrayStrip([{ v: 4 }, { v: 8 }, { v: 15 }, { v: 16 }, { v: 23, mark: true }])}
      <div class="tag">length = 5, last index = 4</div></div>`,
  },
  {
    lesson: '6.1', step: 1,
    heading: 'A 2D array is rows of rows',
    draw: () => grid([zrow(4), zrow(4), zrow(4)], { rowLabels: true, colLabels: true }),
  },
  {
    lesson: '6.2', step: 1,
    heading: 'Row first, then column',
    draw: () => grid([
      [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }],
      [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }],
      [{ v: 0 }, { v: 7, mark: true }, { v: 0 }, { v: 0 }],
    ], { rowLabels: true, colLabels: true }),
  },
  {
    lesson: '6.2', step: 2,
    heading: 'Screen coordinates and array indexes are written in opposite orders',
    draw: () => twoUp(
      { title: 'the world', body: `<div class="stack"><div class="mono" style="font-size:19px;font-weight:700">(x, y)</div><div class="tag">across first, then down</div></div>`, tone: 'good' },
      { title: 'the array', body: `<div class="stack"><div class="mono" style="font-size:19px;font-weight:700">[row][col]</div><div class="tag">down first, then across</div></div>`, tone: 'good' }
    ),
  },
  {
    lesson: '6.2', step: 3,
    heading: 'On a non-square grid, swapping the indexes does not just look wrong, it crashes',
    draw: () => twoUp(
      {
        title: 'grid[row][col]',
        body: grid([zrow(5), zrow(5)], { rowLabels: true }),
        foot: '2 rows of 5. Correct.',
        tone: 'good',
      },
      {
        title: 'grid[col][row]',
        // Five rows of two is what the swapped indexes ASK for. Rows 2 to 4 are
        // drawn dashed because they are the ones that do not exist.
        body: grid([
          zrow(2), zrow(2),
          zrow(2).map((c) => ({ ...c, dim: true })),
          zrow(2).map((c) => ({ ...c, dim: true })),
          zrow(2).map((c) => ({ ...c, dim: true })),
        ], { rowLabels: true }),
        foot: 'Asks for row 4 of a 2-row array.',
        tone: 'bad',
      }
    ),
  },
  {
    lesson: '6.3', step: 1,
    heading: 'Nested loops visit every cell, left to right, top to bottom',
    draw: () => grid([
      [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }],
      [{ v: 5 }, { v: 6 }, { v: 7 }, { v: 8 }],
      [{ v: 9 }, { v: 10 }, { v: 11 }, { v: 12 }],
    ], {
      rowLabels: true,
      colLabels: true,
      path: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 2], [2, 3]],
    }),
  },
  {
    lesson: '6.4', step: 1,
    heading: 'Going from the map to the world, col becomes x and row becomes y',
    // The marked cell is deliberately OFF the diagonal. On a diagonal cell the
    // two orders produce the same pair of numbers and the figure would quietly
    // teach that the swap does not matter.
    draw: () => `<div class="row">
      <div class="stack">${grid([[{ v: 0 }, { v: 0 }, { v: 1, mark: true }], [{ v: 0 }, { v: 0 }, { v: 0 }], [{ v: 1 }, { v: 0 }, { v: 0 }]], { rowLabels: true, colLabels: true })}
        <div class="tag">map[0][2]</div></div>
      <div class="arrow">&rarr;</div>
      <div class="stack">${grid([[{ v: '' }, { v: '' }, { v: 'W', mark: true }], [{ v: '' }, { v: '' }, { v: '' }], [{ v: '' }, { v: '' }, { v: '' }]], { rowLabels: true, colLabels: true })}
        <div class="tag">addObject(w, 2, 0)</div></div>
    </div>`,
  },
  {
    lesson: '6.6', step: 3,
    heading: 'A cell on the edge has neighbors that do not exist',
    draw: () => grid([
      [{ v: '' }, { v: '' }, { v: '' }, { v: '' }],
      [{ v: '' }, { v: '' }, { v: '' }, { v: 'N', dim: true }],
      [{ v: '' }, { v: '' }, { v: 'N' }, { v: 'C', mark: true }],
      [{ v: '' }, { v: '' }, { v: '' }, { v: 'N' }],
    ], { rowLabels: true, colLabels: true }),
  },
  {
    lesson: '6.7', step: 1,
    heading: 'To total one row, hold the row still and vary the column',
    draw: () => grid([
      [{ v: 3, dim: true }, { v: 1, dim: true }, { v: 4, dim: true }, { v: 1, dim: true }],
      [{ v: 5, mark: true }, { v: 9, mark: true }, { v: 2, mark: true }, { v: 6, mark: true }],
      [{ v: 5, dim: true }, { v: 3, dim: true }, { v: 5, dim: true }, { v: 8, dim: true }],
    ], { rowLabels: true, colLabels: true }),
  },
  {
    lesson: '6.7', step: 2,
    heading: 'To total one column, hold the column still and vary the row',
    draw: () => grid([
      [{ v: 3, dim: true }, { v: 1, mark: true }, { v: 4, dim: true }, { v: 1, dim: true }],
      [{ v: 5, dim: true }, { v: 9, mark: true }, { v: 2, dim: true }, { v: 6, dim: true }],
      [{ v: 5, dim: true }, { v: 3, mark: true }, { v: 5, dim: true }, { v: 8, dim: true }],
    ], { rowLabels: true, colLabels: true }),
  },
];

// ── Validation ───────────────────────────────────────────────────────────────
// A spec must point at a step that exists and that actually asks for a picture.
// This is what stops a figure surviving an edit to the lesson it illustrates.
function lessonsById() {
  const m = new Map();
  for (const b of BANKS) for (const l of b.lessons) m.set(l.lesson, l);
  return m;
}

function resolve() {
  const byId = lessonsById();
  const out = [];
  const problems = [];
  for (const spec of SPECS) {
    const l = byId.get(spec.lesson);
    if (!l) { problems.push(`${spec.lesson}: no such lesson in the bank`); continue; }
    const step = (l.steps || [])[spec.step - 1];
    if (!step) { problems.push(`${spec.lesson} step ${spec.step}: no such step`); continue; }
    if (!step.shot) { problems.push(`${spec.lesson} step ${spec.step}: the step asks for no image`); continue; }
    out.push({ spec, lesson: l, src: step.shot.src, alt: step.shot.alt });
  }
  const seen = new Set();
  for (const r of out) {
    if (seen.has(r.src)) problems.push(`${r.src}: two specs claim the same image`);
    seen.add(r.src);
  }
  return { figures: out, problems };
}

// The renderer flattens intro-java/1.1/step-2.png to intro-java-1.1-step-2.png,
// which is the name the file must carry in Shopify Files. Derived here from the
// same rule rather than typed out, so the two cannot drift.
function flatName(src) { return src.split('/').join('-'); }

function chrome() {
  for (const c of CHROME_CANDIDATES) if (fs.existsSync(c)) return c;
  throw new Error('No Chromium found. Set CHROME_PATH.');
}

function main() {
  const args = process.argv.slice(2);
  const { figures, problems } = resolve();

  if (problems.length) {
    console.error('Spec problems:');
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }
  console.log(`${figures.length} figures, specs all resolve against the bank.`);

  if (args.includes('--check')) {
    for (const f of figures) console.log(`  ${flatName(f.src).padEnd(34)} ${f.alt}`);
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const bin = chrome();
  const manifest = [];
  for (const f of figures) {
    const name = flatName(f.src).replace(/\.png$/, '');
    const htmlPath = path.join(OUT, name + '.html');
    fs.writeFileSync(htmlPath, html(f.spec, f.lesson));
    execFileSync(bin, [
      '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      `--screenshot=${path.join(OUT, name + '.png')}`,
      `--window-size=${W},${H}`,
      `--force-device-scale-factor=${SCALE}`,
      'file://' + htmlPath,
    ], { stdio: 'ignore' });
    if (!process.env.KEEP_HTML) fs.unlinkSync(htmlPath);
    manifest.push({ src: f.src, file: name + '.png', alt: f.alt });
    console.log('  wrote ' + name + '.png');
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${manifest.length} figures and manifest.json to build/figures.`);
}

if (require.main === module) main();
module.exports = { SPECS, resolve, flatName, W, H };

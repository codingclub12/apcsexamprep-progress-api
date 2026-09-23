'use strict';
// -----------------------------------------------------------------------------
//  RUN THE LESSON-VIDEO WORDING FIX OVER A LOCAL FOLDER OF .pptx DECKS.
//
//  The decks are paid bundle content and are not in this repository, so this
//  is a local check against a folder you downloaded, not a CI suite (that is
//  smoke/cyber-lesson-video-wording.js). It loads scripts/cyber-lesson-video-
//  wording.gs itself and calls its replaceInXml_, so what is checked here is
//  the code Tanner pastes into Apps Script, not a second copy of it.
//
//  For every slide and notes part it asserts:
//    1  no lesson-video wording survives (lesson video, video and lecture,
//       video walks)
//    2  the MARKUP is byte-identical: strip the text out of every <a:t> and
//       the two parts must match, so only text changed, never structure
//    3  every text run that changed now contains one of the replacement
//       sentences, and no run changed that did not need to
//    4  "video" as lesson content (deepfake video calls and the like) is
//       still there in the same count
//  With --write <dir> it also rebuilds each changed deck with `zip` and
//  checks the result opens with python-pptx.
//
//  Run: node scripts/check-lesson-video-wording.js <folder> [--write <dir>]
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');

const GS = path.join(__dirname, 'cyber-lesson-video-wording.gs');

function loadGs() {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(GS, 'utf8'), ctx, { filename: GS });
  return ctx;
}

const LEFTOVER = /lesson video|video and lecture|video walks/i;
const TEXT_PART = /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/;

function runs(xml) {
  return (xml.match(/<a:t>[\s\S]*?<\/a:t>/g) || []).map((r) => r.slice(5, -6));
}
function markup(xml) { return xml.replace(/<a:t>[\s\S]*?<\/a:t>/g, '<a:t/>'); }
function contentVideo(xml) {
  return runs(xml).join(' ').split(/video/i).length - 1
    - (runs(xml).join(' ').match(LEFTOVER) || []).length;
}

function checkDeck(gs, file) {
  const parts = cp.execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).split('\n').filter((p) => TEXT_PART.test(p));
  const out = { file, slide: 0, notes: 0, problems: [], changed: {} };
  for (const part of parts) {
    const before = cp.execFileSync('unzip', ['-p', file, part], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const r = gs.replaceInXml_(before);
    const after = r.x;
    if (!r.n) {
      if (LEFTOVER.test(runs(before).join(' '))) out.problems.push(part + ': lesson-video wording that no replacement matches');
      continue;
    }
    out[part.includes('notesSlides') ? 'notes' : 'slide'] += r.n;
    out.changed[part] = after;
    if (LEFTOVER.test(runs(after).join(' '))) out.problems.push(part + ': wording survives');
    if (markup(before) !== markup(after)) out.problems.push(part + ': markup changed, not only text');
    const b = runs(before), a = runs(after);
    if (b.length !== a.length) out.problems.push(part + ': run count changed');
    const repls = gs.REPLACEMENTS.map((f) => f[1]);
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) continue;
      const plain = a[i].replace(/&apos;/g, "'").replace(/\u2019/g, "'");
      if (!repls.some((s) => plain.includes(s))) out.problems.push(part + ': run ' + i + ' changed without a replacement sentence');
    }
    if (contentVideo(before) !== contentVideo(after)) out.problems.push(part + ': a content use of "video" changed');
  }
  return out;
}

function rebuild(file, changed, dir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lvw-'));
  cp.execFileSync('unzip', ['-q', file, '-d', tmp]);
  for (const [part, xml] of Object.entries(changed)) fs.writeFileSync(path.join(tmp, part), xml);
  const dest = path.join(dir, path.basename(file));
  try { fs.unlinkSync(dest); } catch (e) { /* first write */ }
  cp.execFileSync('zip', ['-q', '-r', '-X', path.resolve(dest), '.'], { cwd: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
  const py = 'import sys\nfrom pptx import Presentation\nPresentation(sys.argv[1])\n';
  cp.execFileSync('python3', ['-c', py, dest]);
  return dest;
}

function main(argv) {
  const dir = argv[0];
  if (!dir) { console.error('usage: node scripts/check-lesson-video-wording.js <folder> [--write <dir>]'); process.exit(2); }
  const w = argv.indexOf('--write');
  const outDir = w > -1 ? argv[w + 1] : null;
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  const gs = loadGs();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.pptx')).map((f) => path.join(dir, f));
  let withWork = 0, onSlide = 0, slideN = 0, notesN = 0, rebuilt = 0;
  const problems = [];
  for (const f of files) {
    const r = checkDeck(gs, f);
    if (r.slide || r.notes) withWork++;
    if (r.slide) onSlide++;
    slideN += r.slide; notesN += r.notes;
    r.problems.forEach((p) => problems.push(path.basename(f) + ' ' + p));
    if (outDir && Object.keys(r.changed).length && !r.problems.length) {
      try { rebuild(f, r.changed, outDir); rebuilt++; } catch (e) { problems.push(path.basename(f) + ': rebuilt deck does not open: ' + e.message.split('\n')[0]); }
    }
  }
  console.log('\n  decks read            ' + files.length);
  console.log('  decks with a change   ' + withWork + '  (' + onSlide + ' on a slide)');
  console.log('  sentences replaced    ' + slideN + ' on slides, ' + notesN + ' in notes');
  if (outDir) console.log('  rebuilt and opened    ' + rebuilt);
  if (problems.length) {
    console.log('\n  ' + problems.length + ' problem(s):');
    problems.forEach((p) => console.log('    ' + p));
    process.exit(1);
  }
  console.log('\n  clean: no lesson-video wording left, markup untouched, content uses of "video" kept\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { loadGs, checkDeck, runs, markup };

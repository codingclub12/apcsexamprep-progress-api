'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: scripts/cyber-lesson-video-wording.gs, the Apps Script that stops the
//  AP Cyber decks promising a lesson video that does not exist.
//
//  The decks are not in this repository, so the corpus run lives in
//  scripts/check-lesson-video-wording.js and is local. This suite pins what can
//  be pinned offline, by loading the .gs itself and calling its functions:
//
//    1  the table: every find names the video, no replacement does, no find
//       sits inside another, pure ASCII, longest first
//    2  replaceInXml_ on synthetic slide XML, in all three apostrophe forms a
//       deck can carry (straight, &apos;, curly), with the markup untouched
//    3  lesson CONTENT about video (deepfake calls) is never touched
//    4  a second run changes nothing, so start() can safely be re-run
//
//  Run: npm run smoke:lessonvideowording
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const { loadGs, markup } = require('../scripts/check-lesson-video-wording');

let pass = 0;
const fail = [];
const ok = (label, cond, extra) => {
  if (cond) { pass++; return; }
  fail.push(label + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
};

const gs = loadGs();
const T = gs.REPLACEMENTS;

// -- 1 the table --------------------------------------------------------------
ok('the table has entries', Array.isArray(T) && T.length >= 17, T && T.length);
T.forEach(([find, repl]) => {
  ok('find names the video: ' + find.slice(0, 50), /video/i.test(find));
  ok('replacement does not: ' + repl.slice(0, 50), !/video/i.test(repl));
  ok('replacement points at the lesson page, or only drops the video: ' + repl.slice(0, 50),
    /lesson page/.test(repl) || /lecture/.test(repl));
  ok('pure ASCII: ' + find.slice(0, 40), /^[\x20-\x7e]*$/.test(find + repl));
  ok('no em-dash: ' + repl.slice(0, 40), !/\u2014/.test(repl));
});
for (let i = 0; i < T.length; i++) {
  for (let j = 0; j < T.length; j++) {
    if (i !== j && T[j][0].includes(T[i][0])) fail.push('find ' + i + ' sits inside find ' + j + ', so order decides the result');
  }
}
pass++;

// -- 2 replaceInXml_ in every apostrophe form ------------------------------------
const run = (t) => '<a:r><a:rPr lang="en-US" sz="1400"/><a:t>' + t + '</a:t></a:r>';
const para = (...rs) => '<a:p>' + rs.join('') + '</a:p>';

const slide = para(run('Prefer self-paced?  '), run('The lesson video covers this exact material, slide for slide.'));
let r = gs.replaceInXml_(slide);
ok('the Your Turn line is replaced, and the result is EXACTLY the expected XML', r.n === 1
  && r.x === para(run('Prefer self-paced?  '), run('The lesson page covers this exact material.')), r);
ok('  and the markup around it is byte-identical', markup(r.x) === markup(slide));
ok('  and the lead-in run is untouched', r.x.includes('<a:t>Prefer self-paced?  </a:t>'));

for (const [label, ap] of [['straight', "'"], ['&apos;', '&apos;'], ['curly', '\u2019']]) {
  const x = para(run('The lesson video covers today' + ap + 's material slide for slide.'));
  r = gs.replaceInXml_(x);
  ok(label + ' apostrophe is matched', r.n === 1, r);
  ok('  and written back in the same form, exactly', r.x === para(run('The lesson page covers today' + ap + 's material.')), r.x);
}

const notes = para(run('Everything is on the site. If you want today again at your own pace, the lesson video walks the material slide for slide.'));
r = gs.replaceInXml_(notes);
ok('a speaker-notes sentence is replaced mid-run, exactly', r.n === 1
  && r.x === para(run('Everything is on the site. If you want today again at your own pace, the lesson page covers the material.')), r.x);

r = gs.replaceInXml_(para(run('Keep your pencil moving throughout the video and lecture.')));
ok('the 1.3 Day 1 pencil line loses only the video', r.n === 1
  && r.x === para(run('Keep your pencil moving throughout the lecture.')), r.x);

// -- 3 content about video is never touched -----------------------------------------
const content = para(run('A company&apos;s help desk gets a video call from someone who looks and sounds exactly like their CFO.'))
  + para(run('Deepfake Voice &amp; Video Avatars'))
  + para(run('\u2022  Scrapes the target&apos;s short videos for clean samples of their voice'));
r = gs.replaceInXml_(content);
ok('deepfake and video-call content is left exactly as it was', r.n === 0 && r.x === content, r);

// -- 4 idempotent ---------------------------------------------------------------------
const once = gs.replaceInXml_(slide + notes).x;
const twice = gs.replaceInXml_(once);
ok('a second run finds nothing, so start() is safe to re-run', twice.n === 0 && twice.x === once, twice.n);

console.log('  lesson-video-wording: ' + pass + ' passed, ' + fail.length + ' failed');
fail.forEach((f) => console.log('    FAIL  ' + f));
process.exit(fail.length ? 1 : 0);

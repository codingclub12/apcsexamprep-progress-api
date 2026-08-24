'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the teacher dashboard's cell actions must actually persist.
//
//  WHY THIS SUITE EXISTS
//  A cyber teacher set a score on /pages/cyber-dashboard, watched the grid
//  change, and was told "Preview only in this session. Saved overrides ship with
//  the next update." Every control in that popover wrote to an in-memory object
//  and nothing else: OVER, RESET and GRANT, cleared by any reload. Four TODO
//  markers had stood in the file where the API calls belonged.
//
//  Wiring them turned out not to be one job but four different answers, and the
//  point of this suite is that the difference is now measured rather than
//  assumed:
//
//    Reset          a real endpoint, verified here end to end.
//    Grant attempt  the same endpoint with reset:false, and it can only mean
//                   something on a quiz submitted as FINAL, because quiz
//                   finalize is the only writer of progress.locked.
//    Set score      NO server path. ap-cybersecurity is a System B course
//                   (score_events, see docs/grading-systems.md) and the only
//                   teacher score-write endpoint is System A, gated on
//                   course_manifest, which cyber has no rows in. Section 4
//                   pins that refusal so the claim stays true.
//    Retry toggles  writable but not READABLE: the teacher progress payload
//                   carries no retry_override, so a wired toggle would show
//                   "Default" on the next load while an override was live.
//                   Section 5 fails the day that field appears, which is the
//                   day the toggles should be wired.
//
//  Zero PII: synthetic names and throwaway PINs, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cellactions
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-cell-actions.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
require('../db');
require('../scripts/seed-cyber-denominators').seedCyberDenominators();

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

let pass = 0;
const fail = [];
const ok = (label, cond, extra) => {
  if (cond) { pass++; return; }
  fail.push(label + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
};

const call = (m, p, body, tok) => fetch(base() + p, {
  method: m,
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const UNIT = 'unit-1', LESSON = '1.4', EX = 'exercise-1';
const SRC = fs.readFileSync(path.join(__dirname, '..', 'shopify/cyber-dashboard.html'), 'utf8');

(async () => {
  const tok = (await call('POST', '/api/teacher/register',
    { email: 'cellactions@example.org', password: 'a-long-enough-password', name: 'Cell Actions' })).body.token;
  const cls = (await call('POST', '/api/teacher/classes',
    { class_name: 'Cyber P1', course: 'ap-cybersecurity' }, tok)).body.class;
  const joined = (await call('POST', '/api/student/join',
    { class_code: cls.class_code, display_name: 'Avery', pin: '1234' })).body;
  const stuTok = joined.token;

  // Read a cell the way the dashboard's cellData() reads it: out of the teacher
  // progress payload, which is also what a page RELOAD would show.
  const cell = async (act) => {
    const p = await call('GET', `/api/teacher/classes/${cls.class_code}/progress`, null, tok);
    const rec = (p.body.summary || [])[0];
    const d = rec && rec.detail && rec.detail[UNIT] && rec.detail[UNIT][LESSON] && rec.detail[UNIT][LESSON][act];
    return { d: d || null, student: rec && rec.student };
  };

  // ── 1. THE PAYLOAD CARRIES WHAT THE ACTIONS ADDRESS ────────────────────────
  await call('POST', '/api/student/score',
    { course: 'ap-cybersecurity', unit: UNIT, lesson: LESSON, activity_type: EX, points: 3, max_points: 7 }, stuTok);
  {
    const { d } = await cell(EX);
    ok('the exercise cell exists after the student works', !!d);
    ok('the cell carries progress_id, which is what Reset addresses', d && typeof d.progress_id === 'string', d && d.progress_id);
    ok('the cell carries locked, which is what gates Grant attempt', d && typeof d.locked === 'boolean');
    ok('an exercise is not locked, so Grant attempt is correctly not offered on it', d && d.locked === false);
    ok('the score the student earned is what the teacher sees', d && d.points_earned === 3 && d.points_possible === 7,
      d && [d.points_earned, d.points_possible]);
  }

  // ── 2. RESET PERSISTS ──────────────────────────────────────────────────────
  //  The assertion that matters: re-read AFTER the call, from the same endpoint
  //  the page reloads with. An in-memory reset passed the old UI and would fail
  //  right here.
  {
    const before = await cell(EX);
    const r = await call('PATCH',
      `/api/teacher/classes/${cls.class_code}/progress/${before.d.progress_id}/unlock`, { reset: true }, tok);
    ok('Reset is accepted', r.status === 200 && r.body.ok === true, r.body);

    const after = await cell(EX);
    ok('and the score is gone when the page is re-read', after.d && after.d.score === null, after.d && after.d.score);
    ok('and the cell reads as not started, never as a zero',
      after.d && after.d.score == null && !after.d.completed);
    // cellData()'s first branch: score null and not completed means "not
    // started", which renders as a dash. A reset must never invent a 0 percent.
    ok('so the grid renders a dash rather than a failing grade', after.d && !after.d.completed);
  }

  // ── 3. GRANT ATTEMPT REOPENS A FINALISED QUIZ, AND KEEPS THE SCORE ─────────
  {
    await call('POST', '/api/student/score',
      { course: 'ap-cybersecurity', unit: UNIT, lesson: LESSON, activity_type: 'quiz', points: 4, max_points: 10 }, stuTok);
    const fin = await call('POST', '/api/student/quiz/finalize',
      { course: 'ap-cybersecurity', unit: UNIT, lesson: LESSON }, stuTok);
    ok('a student can submit a quiz as final', fin.status === 200 && fin.body.locked === true, fin.body);

    const locked = await cell('quiz');
    ok('the teacher sees it as locked', locked.d && locked.d.locked === true);
    const scoreBefore = locked.d.score;

    const g = await call('PATCH',
      `/api/teacher/classes/${cls.class_code}/progress/${locked.d.progress_id}/unlock`, { reset: false }, tok);
    ok('Grant attempt is accepted', g.status === 200 && g.body.ok === true, g.body);

    const after = await cell('quiz');
    ok('and the quiz is open again when the page is re-read', after.d && after.d.locked === false);
    ok('and the score is KEPT, which is what separates it from Reset',
      after.d && after.d.score === scoreBefore, after.d && [after.d.score, scoreBefore]);
  }

  // ── 4. SET SCORE HAS NO SERVER PATH ON THIS COURSE ────────────────────────
  //  Pinned, because the dashboard says so to the teacher in as many words. If
  //  cyber ever gains course_manifest rows this fails, and the popover's note
  //  needs rewriting in the same pass.
  {
    const sid = (await cell(EX)).student.id;
    for (const item of [`${LESSON}-${EX}`, `${LESSON}-quiz`, LESSON]) {
      const o = await call('POST', `/api/teacher/classes/${cls.class_code}/scores`,
        { course: 'ap-cybersecurity', item_id: item, scores: [{ student_id: sid, score: 6 }] }, tok);
      ok(`the System A score endpoint refuses cyber item '${item}'`, o.status === 400, [o.status, o.body]);
      ok('  and says why, naming course_manifest', /course_manifest/.test((o.body || {}).error || ''), o.body);
    }
  }

  // ── 5. THE RETRY TOGGLES CANNOT SHOW THEIR OWN STATE YET ──────────────────
  //  Writable, not readable. When the payload starts carrying retry_override
  //  this section fails, and that failure is the signal to wire the toggles and
  //  drop their "preview only" note.
  {
    const sid = (await cell(EX)).student.id;
    const w = await call('PATCH',
      `/api/teacher/classes/${cls.class_code}/students/${sid}/retry`, { retry_override: true }, tok);
    ok('a per-student retry override can be WRITTEN', w.status === 200 && w.body.retry_override === 1, w.body);

    const { student } = await cell(EX);
    ok('but the dashboard payload still cannot READ it back, so the toggles stay unwired '
      + '(when this fails, wire them and remove the preview note)',
      student && student.retry_override === undefined, student);
  }

  // ── 6. THE SHIPPED PAGE MATCHES WHAT WAS PROVED ABOVE ─────────────────────
  {
    // The three CELL actions are wired, so their placeholders must be gone.
    ['TODO PATCH .../students/:id/score', 'TODO DELETE .../students/:id/score',
      'TODO POST .../students/:id/grant-attempt'].forEach((t) => {
      ok(`the placeholder "${t}" is gone, because that call is now real`, !SRC.includes(t));
    });
    // The retry one STAYS, and stays paired with the note that admits it. An
    // unwired control with no warning is the failure this suite exists for.
    ok('the retry placeholder is still there, matching section 5',
      SRC.includes('TODO PATCH .../students/:id retry_modes'));
    ok('the in-memory OVER/RESET/GRANT state is gone', !/OVER:\{\},\s*RESET:\{\}/.test(SRC));
    ok('the shared action helper calls the real unlock endpoint',
      /\/progress\/'\+pid\+'\/unlock/.test(SRC));
    // Each BUTTON must route into that helper. Asserting only that the helper
    // exists let a revert of applyGrant to a no-op pass this suite, which is the
    // precise failure being guarded against.
    ok('applyReset routes into it, asking for a wipe',
      /applyReset\(\)\{[\s\S]{0,400}_cellAction\(\{reset:true\}/.test(SRC));
    ok('applyGrant routes into it, asking to keep the score',
      /applyGrant\(\)\{[\s\S]{0,200}_cellAction\(\{reset:false\}/.test(SRC));
    ok('both re-read the server instead of patching the grid locally',
      /_cellAction[\s\S]{0,400}loadProgress\(this\._token\(\)\)/.test(SRC));
    ok('Reset is confirmed first, because it clears a grade', /applyReset\(\)\{[\s\S]{0,200}confirm\(/.test(SRC));
    ok('the popover gates its buttons on the data', /canReset\s*=\s*!!cd\.progress_id/.test(SRC)
      && /canGrant\s*=\s*!!cd\.progress_id\s*&&\s*!!cd\.locked/.test(SRC));
    ok('cellData carries progress_id and locked on every branch',
      (SRC.match(/progress_id:pid,locked:lockd/g) || []).length === 3,
      (SRC.match(/progress_id:pid,locked:lockd/g) || []).length);
    ok('the page no longer promises overrides in a future update',
      !/Saved overrides ship with the next update/.test(SRC));
    ok('and the retry panel now admits it does not save',
      /stu-retry[\s\S]{0,600}Preview only in this session/.test(SRC));
  }

  // ── 7. THE ESCAPE FUNCTION MUST ACTUALLY ESCAPE ───────────────────────────
  //  Not a string check. The function is lifted out and RUN, because the way
  //  this breaks is that it still looks correct: Shopify decodes the entity
  //  literals on import and every replacement silently becomes character to
  //  itself. join.html was found this way on 2026-08-22 and this page had the
  //  same identity map. Only calling it can tell the two apart.
  {
    // Brace-matched rather than regex-sliced, so this reads esc() whether it is
    // written on one line or across several. A regex tuned to one shape would
    // report "no esc() found" for the very rewrite it is meant to catch.
    const at = SRC.indexOf('esc(str)');
    let body = null;
    if (at > -1) {
      const open = SRC.indexOf('{', at);
      let depth = 0;
      for (let i = open; i < SRC.length; i++) {
        if (SRC[i] === '{') depth++;
        else if (SRC[i] === '}') { depth--; if (!depth) { body = SRC.slice(at, i + 1); break; } }
      }
    }
    ok('the page has an esc() to lift out', !!body);
    if (body) {
      let escFn = null;
      try { escFn = new Function('return function ' + body)(); } catch (e) { /* reported below */ }
      ok('and it is runnable', typeof escFn === 'function');
      if (typeof escFn === 'function') {
        const out = escFn('<b>&"');
        ok('it escapes angle brackets rather than returning them unchanged', !/[<>]/.test(out), out);
        ok('it escapes the ampersand', /amp;/.test(out), out);
        ok('it escapes the double quote', !/"/.test(out), out);
        ok('a plain name is left readable', escFn('Avery M.') === 'Avery M.', escFn('Avery M.'));
      }
    }
  }

  console.log(`  dashboard-cell-actions: ${pass} passed, ${fail.length} failed`);
  fail.forEach((f) => console.log(`    FAIL  ${f}`));
  server.close();
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error('threw:', e); server.close(); process.exit(1); });

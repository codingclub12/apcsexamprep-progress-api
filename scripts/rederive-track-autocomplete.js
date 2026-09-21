'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REDERIVE: which activity types does a bare visit complete?
//
//  Two paths to the same answer, sharing no code:
//
//    static       read routes/student.js as TEXT and parse the
//                 GRADED_ON_ARRIVAL literal out of it. What the source SAYS.
//    behavioural  POST /api/student/track once per activity token against a
//                 throwaway database and read progress.completed back. What the
//                 code DOES.
//
//  The two must agree on every token the handle vocabulary can produce. Each
//  direction of disagreement means something different:
//
//    listed as graded, completes anyway   the set is being consulted too late,
//                                         or not at all, so writing a type into
//                                         it buys nothing. This is the shape the
//                                         defect would take if the set stayed
//                                         correct and the branch moved.
//    not listed, does not complete        something else is suppressing the
//                                         completion, so the set is no longer
//                                         the policy and a reader of it is
//                                         being misled.
//
//  WHY THIS RATHER THAN A LIVE CHECK. The change it guards stops a FUTURE
//  visit from completing graded work. Nothing observable in production moves
//  when it deploys: the rows already written stay written, so the reporter
//  count does not drop, and the only way to see the new behaviour is to post a
//  visit as a student, which would be writing student data to prove a point.
//  A sha pin would have been a dated receipt rather than a check.
//
//  Zero PII: one synthetic student in a temp database, discarded at exit.
//  No em-dashes, per repo convention.
//
//  Run: npm run rederive:trackautocomplete
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = path.join(__dirname, '..', 'routes', 'student.js');

//  ── STATIC ──────────────────────────────────────────────────────────────────
//  A text parse, deliberately not a require(). Importing the route would ask
//  the module what it thinks, which is the path the behavioural half takes.
function staticSet() {
  const text = fs.readFileSync(SRC, 'utf8');
  const m = text.match(/GRADED_ON_ARRIVAL\s*=\s*new\s+Set\(\s*\[([^\]]*)\]\s*\)/);
  if (!m) throw new Error('GRADED_ON_ARRIVAL is not a shape this can read. If it moved, this check must move with it.');
  const out = new Set(m[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean));
  if (!out.size) throw new Error('GRADED_ON_ARRIVAL parsed as empty, which no version of this route has meant');
  return out;
}

//  ── BEHAVIOURAL ─────────────────────────────────────────────────────────────
async function behaviouralSet() {
  const dbPath = path.join(os.tmpdir(), 'rederive-track-' + process.pid + '.db');
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(dbPath + suf); } catch (e) {} }
  process.env.DB_PATH = dbPath;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'rederive-track-autocomplete-secret-long-enough';

  const express = require('express');
  const db = require('../db');
  const { signStudentToken, ACTIVITY_TOKENS, trailingActivity } = require('../utils');

  const run = (s, ...a) => db.prepare(s).run(...a);
  run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
  run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed)
       VALUES ('c1','CYBER-RDV','Cyber','ap-cybersecurity','t1',1,80,1)`);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

  const app = express();
  app.use(express.json());
  app.use('/api/student', require('../routes/student'));
  const server = app.listen(0);
  const tok = signStudentToken({ id: 's1', class_id: 'c1', display_name: 'A' });
  const port = server.address().port;

  const completes = new Set();
  const reached = [];
  try {
    let n = 0;
    for (const token of ACTIVITY_TOKENS) {
      n += 1;
      const native = trailingActivity('probe-' + token);
      const handle = `ap-cyber-unit-8-lesson-${n}-${token}`;
      await fetch(`http://127.0.0.1:${port}/api/student/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ handle }),
      }).then((r) => r.json());
      const row = db.prepare(`
        SELECT completed FROM progress
        WHERE student_id = 's1' AND lesson = ? AND activity_type = ?
      `).get('8.' + n, native);
      //  No row at all means /track declined the handle entirely (quiz and exam
      //  return before the set is consulted). That is neither side of this
      //  comparison, so it is recorded and skipped.
      if (!row) continue;
      reached.push(native);
      if (row.completed === 1) completes.add(native);
    }
  } finally {
    server.close();
    for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(dbPath + suf); } catch (e) {} }
  }
  return { completes, reached };
}

async function main() {
  const listed = staticSet();
  const { completes, reached } = await behaviouralSet();
  const sorted = (s) => [...s].sort().join(', ') || '(none)';

  //  The set names what must NOT complete, so the behavioural mirror of it is
  //  everything /track reached that did not complete.
  const held = new Set(reached.filter((t) => !completes.has(t)));

  console.log('bare-visit completion, derived two ways');
  console.log('  static, GRADED_ON_ARRIVAL in the source :', sorted(listed));
  console.log('  behavioural, did NOT complete on a visit:', sorted(held));
  console.log('  types /track reached at all             :', reached.sort().join(', '));

  const listedButCompletes = [...listed].filter((t) => reached.includes(t) && !held.has(t));
  const heldButUnlisted = [...held].filter((t) => !listed.has(t));

  if (listedButCompletes.length) {
    console.error('\nLISTED AS GRADED BUT COMPLETES ANYWAY: ' + listedButCompletes.join(', '));
    console.error('The set is not being consulted, so writing a type into it buys nothing.');
  }
  if (heldButUnlisted.length) {
    console.error('\nHELD BACK WITHOUT BEING LISTED: ' + heldButUnlisted.join(', '));
    console.error('Something else suppresses completion, so the set is no longer the policy.');
  }
  if (listedButCompletes.length || heldButUnlisted.length) {
    console.error('\nthe two derivations DISAGREE');
    process.exit(1);
  }
  console.log('\nthe two derivations agree on ' + held.size + ' type(s)');
}

if (require.main === module) {
  main().catch((e) => { console.error('rederive-track-autocomplete:', e.message); process.exit(1); });
}
module.exports = { staticSet, behaviouralSet };

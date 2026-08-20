'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE LAB ANSWER KEY.
//
//  Derived from the spec, never authored beside it. A key that is written out
//  by hand is a key that disagrees with the lab the week after someone edits a
//  check, and a teacher reading a stale key in front of a class is worse than a
//  teacher reading no key at all. So: one source, and the key is a projection
//  of it. Add a check, the key grows a step. Change an answer, the key changes.
//
//  WHAT IT IS HONEST ABOUT
//  This is a teaching document, not a secret. lib/lab-spec.js ships `answer`
//  and `explain` to the browser because the player grades the questions in the
//  page, which means a student who opens devtools can read the correct options
//  out of the spec today. Gating the key stops a student STUMBLING onto it from
//  the teacher page; it does not make the answers secret, and docs/lab-key.md
//  says so in those words. The reference walkthrough is no longer served to the
//  browser at all, which is the one part this actually does take away.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

// A check's `match` object says what the player watches for. A teacher needs
// the same thing in a sentence. Every branch here mirrors a branch of the
// matcher in public/lab-player.js; an unknown event is described rather than
// silently rendered as blank, because a check a teacher cannot explain is a
// check a teacher cannot help with.
function describeMatch(m, spec) {
  if (!m || typeof m !== 'object') return 'Unrecognised check. Read the spec.';
  const host = m.host && spec.hosts && Object.keys(spec.hosts).length > 1
    ? ` on ${(spec.hosts[m.host] && spec.hosts[m.host].label) || m.host}` : '';

  if (m.event === 'cmd') {
    let s = `Runs \`${m.cmd}\`${host}`;
    if (m.args) s += ` with \`${Array.isArray(m.args) ? m.args.join(' ') : m.args}\``;
    if (m.cwdAfter) s += `, ending up in \`${m.cwdAfter}\``;
    return s + '.';
  }
  if (m.event === 'read') return `Reads \`${m.file}\`${host}, by any route that opens it.`;
  if (m.event === 'write' || m.event === 'put') return `Transfers \`${m.file}\`${host}.`;
  if (m.event === 'answer') {
    const q = (spec.questions || []).find((x) => x.id === m.question);
    return q ? `Answers "${q.prompt}" correctly.` : `Answers question '${m.question}' correctly.`;
  }
  return `Matches a ${m.event} event.`;
}

// The reference walkthrough, as a teacher would read it aloud. Command steps
// stay verbatim; an { answer: id } step becomes the question it settles.
function walkthrough(spec) {
  return (spec.solution || []).map((step, i) => {
    if (typeof step === 'string') return { n: i + 1, kind: 'command', text: step };
    if (step && step.answer) {
      const q = (spec.questions || []).find((x) => x.id === step.answer);
      return {
        n: i + 1,
        kind: 'answer',
        text: q ? q.prompt : `Answer '${step.answer}'`,
        correct: q ? q.options[q.answer] : null,
      };
    }
    return { n: i + 1, kind: 'other', text: JSON.stringify(step) };
  });
}

function build(spec) {
  if (!spec) return null;
  return {
    course: spec.course,
    item_id: spec.item_id,
    lesson_id: spec.lesson_id,
    unit: spec.unit,
    title: spec.title,
    graded: !!spec.graded,
    points: spec.points,
    est_minutes: spec.est_minutes || null,

    // One check is one point, so this table IS the rubric.
    rubric: (spec.checks || []).map((c) => ({
      n: c.n,
      points: 1,
      label: c.label,
      satisfied_by: describeMatch(c.match, spec),
    })),

    walkthrough: walkthrough(spec),

    questions: (spec.questions || []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: (q.options || []).map((text, i) => ({ i, text, correct: i === q.answer })),
      correct_index: q.answer,
      correct_text: (q.options || [])[q.answer] || null,
      why: q.explain || null,
    })),

    // Said on the artifact itself, not only in the docs, because the person
    // reading a printed key is exactly the person who should know this.
    disclosure: 'The player grades in the browser, so the correct options are present in the '
      + 'lab spec a student can already fetch. Treat this key as a teaching aid, not as a secret, '
      + 'and do not use these questions as the only evidence in a graded assessment.',
  };
}

module.exports = { build, describeMatch, walkthrough };

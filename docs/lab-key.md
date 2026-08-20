# The lab answer key

`GET /api/labs/:course/:item_id/key`, teacher-gated, rendered by a panel on the
course Command Center.

## Where it comes from

`lib/lab-answer-key.js` derives it from the lab spec. Nothing about a key is
authored twice. Add a check and the rubric grows a row; change a correct option
and the key changes with it. A key written by hand beside a lab is a key that
disagrees with the lab a fortnight later, in front of a class.

It carries three things the lab page does not show a teacher:

- **the rubric**, one row per check, one point per row, each row saying in a
  sentence what a student has to do to satisfy it
- **the reference walkthrough**, the same `solution` array `smoke/labs.js` plays
  through the real player to prove the lab is finishable
- **the questions**, correct option marked, with the `explain` text as the why

## What the gate is, and what it is not

The route fails closed exactly like `routes/files.js`: no token, an invalid
token, a student token, or a teacher without a live entitlement for the course
all get one identical `403 Not available.`, so the endpoint cannot be used to
enumerate labs. An unknown lab returns that same refusal rather than a 404.

**It is not secrecy, and the key says so on itself.** The player grades the
questions in the browser, so the spec a student can already fetch carries the
correct option index. A student who opens devtools can read the answers today.
The gate stops a student stumbling onto the key from the teacher page. It does
not, and cannot, make client-graded answers secret.

This is the same posture already documented for lab scoring: the score is
computed client side and the key ships. Treat a lab as practice with evidence,
not as a secure assessment, and do not let these questions be the only evidence
behind a grade that matters.

What did change: `lib/lab-spec.js` no longer serves `solution` to the browser.
The player never read it, so nothing is lost, and the ready-made walkthrough is
no longer handed to every visitor. `answer` and `explain` still ship because the
page grades with them.

## The panel

`scripts/cyber-lab-key-panel.js` patches the cyber Command Center. The published
markup holds a course and a lab id and nothing else; the key arrives over the
gated route with the teacher's bearer, which is why the page can be public.

The script refuses to write a sheet whose body contains any distinctive answer,
explanation or solution step, on the theory that the one unrecoverable mistake
here is publishing the key inside the page that links to it.

Lessons get a button by having a spec. A new cyber lab appears on the Command
Center with no edit to that script.

# Board #126, the reply to Jukka Rauhala: what was actually true today

Date: 2026-09-02
Agent: Claude Code (inbox pass)
Board: #126, open since 2026-08-26, still open
Artifact: this note plus docs/inbox/contacts.md. Nothing was sent.

## The headline

Two stale premises were found, not one, and they point in opposite directions.

1. **The board task is stale.** #126 says to tell a paying teacher that the 1.1
   quiz is confirmed wrong and to use his offline documents meanwhile. Sending
   that today would tell him to work around a problem that is fixed and would
   fail to mention that both of his asks have shipped.
2. **The correction that replaced it is ALSO overstated.** The inbox agent
   definition records that "all five Unit 1 quizzes had been rebuilt and were
   serving the corrected bank". That is true of the API and false of the
   storefront. Only the 1.1 and 1.2 PAGES call the server. The 1.3, 1.4 and 1.5
   pages still carry their own questions and a plaintext answer key.

The second is the more useful finding, because it is the exact failure the first
was written to prevent: a fix checked at the wrong layer. `GET /api/quiz/...`
answering with five on-topic questions proves a bank exists. It does not prove
any page asks for it.

## What was checked, and how

Storefront, single-threaded, browser UA, following the apex to www redirect:

    lesson  data-apcs-quiz  apcs-quiz-mount.js  ANSWERS in body
    1.1           1                 1                 0
    1.2           1                 1                 0
    1.3           0                 0                 2
    1.4           0                 0                 3
    1.5           0                 0                 2

The keys still on the wire, read from the live page source:

    1.3  ANSWERS={1:'C',2:'C',3:'B',4:'B',5:'A'}
    1.4  ANSWERS={1:'B',2:'B',3:'C',4:'C',5:'C'}
    1.5  ANSWERS={1:'B',2:'B',3:'A',4:'A',5:'B'}
    2.1  ANSWERS = {"q1":"B","q2":"B","q3":"C","q4":"A","q5":"D"}

API, all 27 cyber lesson slots, one request at a time:

    1.1 to 1.5   server bank present, five items each, prompt/options/qid only,
                 no key field on the wire
    2.1 to 5.6   {"error":"No server-scored quiz for this location"}

So the corrected banks exist for all of Unit 1 and reach students on two pages.

Content, read back stem by stem from the live payloads: 1.1 is social
engineering and phishing, 1.2 passwords, 1.3 wireless, 1.4 AI-enabled attack,
1.5 AI defence. The unit-sampler defect that started this is gone. The 1.4 page
is no longer a second copy of 1.3.

Locking, verified three ways rather than one:

- Deployed code. `/api/health` reports commit `2264d03`. `git show
  2264d03:routes/quiz.js` calls `resolveGate` three times (render plus both
  submit checks) and `routes/teacher.js` at that commit carries
  `POST /classes/:code/gate` and `GET /classes/:code/gates`, both behind
  `requireTeacher`.
- Live auth, and specifically that it is TEACHER auth and not admin auth. No
  token 401, junk bearer 401, and the board's own key 401 with "Invalid or
  expired teacher token". A teacher password login is the only way in.
- Behaviour. `npm run smoke:quizgate`, 20 passed 0 failed, including submit
  refused after a close, which is the gap a render-only check would leak.

Not checked: no live class was switched to locked-by-default. That is a paying
teacher's class and not mine to flip.

## The three things the draft says that the board would not have

1. The extent. He reported two quizzes. Five needed rebuilding, and the
   answer-key exposure that actually blocks his request covers 13 of the 27 cyber
   quiz pages, measured directly on 2026-09-02 rather than inferred from the
   server API's silence. Units 4 and 5 and lesson 3.6 are clean. Board 169. The
   original wording, "every cyber quiz
   page outside 1.1 and 1.2.
2. The limit. Locking is real on 1.1 and 1.2 and cosmetic anywhere else, because
   a page that already handed the browser its own key cannot be locked by
   anything. Telling him "locking is done" without that sentence would be the
   more expensive lie, since he would find out by grading a class on it.
3. The deliberate divergence. `seed/cyber-unit-1-web-quizzes.js` states the rule:
   never seed a teacher bundle question into a public bank, because publishing
   it burns the instrument for every teacher using the bundle. So the online
   quiz is short and different by design. His original report, that online and
   offline do not match, is now expected behaviour and he has to be told that
   plainly or he will report it again.

## Found in passing

- The 1.2 quiz page carries a stale badge row reading "12 Questions ... ~25 min"
  directly under body copy that reads "5 questions, about 10 minutes". A teacher
  comparing it to his 12-item paper quiz will read that as the online quiz
  claiming to be the paper one.
- No open board task covers migrating the 1.3, 1.4 and 1.5 pages onto the mount
  point, which is the work that makes locking real for the rest of Unit 1.
  Decisions #11 and #12 are open and adjacent but neither is that migration.
- `/api/student/quiz/status` returns a field called `locked`, and it means "this
  grade is final", not "the teacher has closed this". `apcs-quiz-wiring.js`
  reads that field. Two different locks, one word. Worth renaming before someone
  reads a green client-side lock as gate enforcement.

## What was learned

**An endpoint answering correctly is not a page behaving correctly.** Both stale
premises in this pass came from checking a layer that could not fail the way the
customer would experience it. Before repeating any fix claim, name the layer the
customer touches and check that one.

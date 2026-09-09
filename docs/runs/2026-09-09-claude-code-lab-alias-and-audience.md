# One lab, two columns, two padlocks, and a message that blamed the wrong person

**Board:** 288. Reported by Michelle, the AP Cybersecurity teacher, by email, 2026-09-08
18:56, forwarded the same evening.

> Some of the labs say "Your Teacher has not opened this lab yet." But I have not
> locked them? How do I assign/open them? (For example the 1.2 Terminal Lab)
>
> Also the students cannot see the labs on their dashboards?

Two sentences, two different bugs, and the first one is the same thread that has
now run for four days: 246 shipped the lock, 256 found the cache defeating it,
258 found signing out walking past it, 260 found the gradebook unable to say so
on a phone. This is the fifth, and it is the one where the lock started working
and started lying about who set it.

## What a cyber lesson actually has

Two lab columns, not one.

    utils.js          every cyber unit lists 'lab' in its activities
    course_manifest   a terminal lab's row says 'terminal-lab'

That split is deliberate and lib/gradebook-contract.js says why on the line that
makes it: before it, grading the Topic 1.2 terminal lab rewrote that lesson's lab
denominator from 30 points to 8. Two native names, one canonical activity, and
both of them rendered as `1.2 Lab`. A teacher looking at that row sees two
identical headers with a padlock under each.

`routes/labs.js` has resolved BOTH names since 2026-09-07, narrowest wins, tie to
the closing row. `lib/gradebook-contract.js` resolved ONE. Everything Michelle
reported falls out of that difference:

- A closing row on either name refuses the student. The other column draws open.
  So "I have not locked them" is not a misremembering, it is an accurate report
  of the screen she was looking at.
- `lock_enforceable` came from `labLocations()`, which emitted the spec's name
  only. The `lab` column therefore reported a lock the server cannot enforce, and
  the UI says so in as many words: "this activity keeps its questions in the
  page, so students can still reach them". That is an invitation to click a
  padlock, about a lock that does bite.

The irony is on the record. `analysisLocations()`, twelve lines below
`labLocations()`, already took every alias, and its comment says why: "reporting
only the spec's name is how a real lock got drawn as decorative on the labs". The
lesson was written down beside the code that still had the bug.

## The sentence that produced the email

The anonymous rule, chosen by Tanner on 2026-09-07: an item with an explicit
closing row for ANY class is withheld from every request with no token. Measured
against production at 00:07 UTC today, before any of this shipped:

    ap-cybersecurity/1.2-auth-lab   LOCKED  anonymous-closed-for-activity
    ap-cybersecurity/1.2-lab        LOCKED  anonymous-closed-for-activity
    ap-cybersecurity/2.4-lab        LOCKED  anonymous-closed-for-lesson
    ap-networking/1.4-lab           open
    ap-networking/2.2-lab           open
    ap-networking/3.5-lab           open
    ap-networking/4.3-lab           open

All three cyber labs are closed to anyone signed out, and the player told every
one of those visitors "Your teacher has not opened this lab yet." Three different
people read that sentence: a member of the public, who has no teacher; a student
whose class HAS closed it, for whom it is true and useful; and a student whose
class has opened it who is simply signed out, for whom it is false and who takes
it to their teacher. The third one is how a support email gets written about a
lock nobody set. The 2026-09-07 run note called this out and left it: "it stands
until someone writes a second string for the anonymous case."

## What shipped

- `lib/lab-spec.js` owns the alias list now (`aliases(spec)`), the same shape
  `analysis-spec.js` has. `routes/labs.js` reads it instead of keeping its own.
- `lib/gradebook-contract.js` resolves the whole alias group through
  `resolveAliasGate`, the same call the student path makes, and builds
  enforceability from the same groups. One list, two readers, so they cannot
  drift again.
- The two lab columns get different labels. `1.2 Lab` and `1.2 Terminal Lab`.
  A teacher cannot act on a column they cannot name apart from its twin, and
  Michelle already calls it "the 1.2 Terminal Lab" in her own email.
- `routes/labs.js` sends `locked_for`, and `public/lab-player.js` says
  "This lab opens for signed-in students. Sign in with your class code and open
  it again." to the anonymous refusal. The class refusal keeps its wording.
- `shopify/my-progress.html` renders lab columns. They are conditional per unit,
  because cyber lists a lab on all 24 topics and three exist, and CSA and CSP
  have none at all.

The student dashboard bug is the simplest thing here and was the worst one for a
student: `ACTS` listed lesson, the two exercises and the quiz. A finished lab
arrived from the API, was counted in the unit percentage, and had nowhere to be
drawn, so the lesson row and the unit total under it disagreed and the missing
half was the work the student had actually done.

## What did NOT change

The anonymous rule itself. Whether one class closing a lab should close it for
every signed-out visitor on the internet is board 277, it is open, and it is
Tanner's. Only the wording moved.

The tie rule did not move either. Two rows at the same scope, one closing and one
opening, still resolve CLOSED. A teacher who closes the Lab column and then opens
the Terminal Lab column is still closed, which is correct, and is now visible:
both columns say so. Before today one said open.

## Evidence

- `smoke:labgate` 40 of 40, up from 24. Sections 8 and 9 are new and are the
  report: the board and the student cannot disagree about one lab, and the
  refusal names whose lock it is.
- `smoke:labplayertoken` 19 of 19, `smoke:myprogress` 31 of 31,
  `smoke:gatescope` 70 of 70, `smoke:labgatemutation` 144 of 144 over 27
  mutations, `smoke:gatescopemutation` 108 of 108, `smoke:analysismutation`
  73 of 73.
- Every offline suite ran locally, 221 green. The three that failed are this
  container missing `python-pptx` and `python-docx`, which CI installs:
  `csakitstyle`, `deckvoice`, `exercisekeys`. Two mutation batteries failed on
  that run and are green after the retargets above.
- `deploy-gates/2026-09-09-lab-alias-and-audience.json` passes `--pre`: suite
  and mutation agreeing, live deferred to after the deploy. Five of the
  mutations are new and each breaks its own assertion, including both directions
  of the student page fix (drop the columns, and make them unconditional).
- The Matrixify sheet was parsed back and diffed against its source: 35273 bytes,
  md5 47548ed4935451a8d5efa42bb9f9148a on both sides, byte identical, and all
  three markers survive the round trip. `matrixify-preflight --expect-command
  UPDATE` is clear to import.

Four mutation targets in OTHER batteries broke on this branch and were retargeted
rather than deleted: `smoke/gate-scope-mutation.js` aimed at the contract line I
replaced, `smoke/lab-gate-mutation.js` aimed at the alias list I moved and at the
locked response shape I extended, and `smoke/analysis-mutation.js` aimed at both
halves of the two location lists that became one. A mutation whose find string silently
misses reports a clean run over code it never touched, which is the exact failure
those batteries exist to prevent, so the retarget is the work rather than an
afterthought.

## Still open

- **The sheet needs a human to import it.** One page, `my-progress`. Until it
  lands, students still cannot see their labs; nothing else here depends on it.
- **I do not know whose closing rows those are.** `activity_gates` needs the
  admin key and this session holds only `COMMAND_READ_TOKEN` and `TODO_KEY`, so
  `GET /api/admin/class/:id/gradebook` answers 403 to me. The anonymous refusal
  proves at least one class has each of the three labs closed and says at which
  scope, and no more than that. Michelle can see her own in one read, on her
  assignment board or through `GET /api/teacher/classes/CYBER-XXXX/gates`, and
  after this deploy that board tells the truth about both columns.
- **534 active classes share that anonymous rule.** One teacher anywhere closing
  a cyber lab takes it off the public site for everybody signed out. That is
  board 277 and it is worth deciding soon rather than late: the three cyber labs
  are closed to the public right now.
- **A `terminal-lab` row cannot be written from either teacher UI.** Both the
  Command Center and `/teacher/assignments` post `native_activity`, and the
  Terminal Lab column is a real column, so a teacher CAN write one from the
  board. Whether both columns should exist at all on a lesson is a content
  question I did not touch: merging them would put two scores in one cell out of
  two denominators, which is the collision the split was made to stop.
- **A Terminal Lab cell on the student page carries no link.**
  `lib/lesson-links.js` derives `ap-cyber-unit-1-lesson-2-terminal-lab` for that
  cell, `pageFromHandle` cannot parse it back to the same key, and the resolver
  fails CLOSED rather than linking to the wrong lesson, which is the right
  behaviour and leaves the cell unclickable. The fix is small and is deliberately
  not in this branch: a lab spec already carries its own `page_handle`, so the
  resolver could ask lab-spec for lab activities instead of deriving. It touches
  every course's cells, so it wants its own change and its own test.
- I cannot verify my own work. 288 goes to `needs_verification`, and the check
  worth running is the teacher's own: sign a student out, open the 1.2 lab, and
  read what it says.
- A reply to her is drafted at
  `docs/inbox/drafts/2026-09-09-michelle-labs-and-dashboards.md`. Not sent.

# 2026-08-17 - claude-code - board triage, meta-description sweep, CSP exercise gap

Second run of the session. The first is
`2026-08-17-claude-code-apcs-cli-proxy-and-credential.md`.

## Decisions recovered from the record

Tanner could not recall the state of most open decisions, so each was checked
against the repo and the live systems rather than against memory.

- **#11 quiz auto-lock** is answered by shipping. `retry-policy.js` is merged with
  three modes (`all`, `practice`, `none`) replacing the boolean, existing classes
  mapped from `retry_allowed` by the boot migration so nothing changed on deploy
  day. The task says "confirm before it merges"; it merged. The only live question
  left is whether `practice` is the right default for a new class
  (`retry-policy.js:56`).
- **#13 exam threshold** had no record anywhere: no source doc, no git history, no
  mention in `docs/`. The only related fact is that `shopify/apcs-tracker.js`
  falls back to `80` when the API supplies no threshold (lines 399, 488). Tanner
  confirmed 80 stands. **It still needs writing into the task detail**, because
  right now 80 is a fallback that nobody chose, and the next session will
  re-derive it exactly as this one did.
- **#12 answer review** is undecided, but easier than the brief suggests:
  `routes/progress.js` already stores `{q, sel, ok}` per question, so which option
  a student picked and whether it was right is on the server today. What is
  missing is the correct answer, which is precisely the key-exposure decision.
- **#76 tutoring products** is undecided and the state contradicts the task. All
  three are ACTIVE, last touched 2026-07-23. The URL the task cites as the reason
  to care, `/products/computer-science-tutoring-lesson`, does not exist as a
  product handle.

## Sweeps

**Meta descriptions (#77).** Full pass: 1,121 pages, 151 with no
`global.description_tag`. The task records 12. See
`docs/meta-description-gaps.md`, which groups rather than dumps, because ~127 are
student-facing pages wanting descriptions and 24 are unit tests and internal
dashboards wanting `noindex` instead. #77 cannot be verified and needs reopening.

**CSP dead links (#91).** Could NOT be reproduced as described. On
`ap-csp-teacher-superpack` and `ap-csp-teacher-resources`:

- 201 unique `/pages/` links: 189 x 200, 10 x 301, 0 dead. (Two apparent 404s were
  artifacts of the extracting regex catching truncated JS string concatenation,
  not links on the page.)
- 781 unique `/cdn/shop/files/` links: **781 x 200, zero dead.**

The real defect is structural, not a broken href. CSP has no exercise, quiz or lab
pages at all:

```
ap-csp-course-bi3-iteration-exercise-1   404
ap-csp-course-bi3-iteration-exercise-2   404
ap-csp-course-bi3-iteration-quiz         404
ap-csp-course-bi3-iteration-lab          404
ap-csp-course-bi1-collaboration-exercise-1  404
ap-cyber-unit-5-lesson-5-exercise-1      200
ap-cyber-unit-4-lesson-1-exercise-1      200
```

Cyber carries a full per-lesson set (two exercises, a lab, a quiz). CSP carries
lesson pages plus guided-notes and code pages, and nothing else. The bundle
references exercises that exist only as `.docx` downloads with no web equivalent,
which is exactly what "they're in the bundle but the pages don't exist" describes.

So #91 is not a link repair. At 35 CSP lessons against Cyber's four-page pattern
it is on the order of 140 new pages, plus manifest rows, and it ships through the
Matrixify pipeline rather than this repo. It is filed as `m` and should be `xl`.

**CSP file formats (#90).** The task was filed as "CSP ships as PDFs, make them
editable". There are no PDFs on the CSP teacher pages: 556 `.docx` and 224
`.pptx`, both already editable. The likely real complaint is that `.pptx` imported
into Google Slides loses layout, which reads to a teacher as "not editable". That
is a different fix (native Slides masters with forced-copy links) and the
originating teacher should be asked which file they hit before anything is
converted.

## Still open

- Nothing here is verified. #77, #90 and #91 all need Tanner in the browser.
- #91 and #90 both need retitling to match what was actually found.
- The full CDN sweep covered only the two CSP teacher pages. Other courses'
  resource pages were not swept.

## Learned

Two tasks on this board described a symptom and named a cause, and the cause was
wrong in both cases. #91 said "dead links" and nothing was dead; #90 said "PDFs"
and there are no PDFs. Both reporters were describing something real. The lesson
is not that the reports were bad, it is that a task title that encodes a diagnosis
sends an agent to verify the diagnosis instead of the symptom. Checking the thing
the human actually saw, rather than the thing the title claims, found the real
defect in both cases within minutes.

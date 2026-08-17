# 2026-08-17 claude code: /api/student/entitlement (task #80)

## What was broken

The site-wide theme.liquid script "APCS student entitlement + ad gate" calls
`GET https://progress.apcsexamprep.com/api/student/entitlement` on every
storefront page for any visitor holding a student token. The route never
existed. Confirmed again at the start of this run, before any change:

```
$ curl -sS https://progress.apcsexamprep.com/api/student/entitlement
{"error":"Route not found: GET /api/student/entitlement"}   # 404
```

The script fails open to ads on any non-200, so the practical effect was that
the whole entitlement and ad-gate mechanism has been inert since it shipped:
ads on for everyone, always, and no server-side answer available for content
gating either.

## The contract, read from the deployed script rather than guessed

The client is the source of truth for the shape, so it was pulled from the live
storefront (`curl -sSL https://apcsexamprep.com/`, the inline gate script) and
the keys were copied from it:

```
200 -> { teacherTier: "paid"|"free"|null,
         unitsUnlocked: { "ap-csa": [1,2,3,4] },
         courses: ["ap-csa"] }
```

The script suppresses ads when the page's (course, unit) is in `unitsUnlocked`,
or when the unit is 1 and `teacherTier` is non-null. Those two fields ARE the ad
policy; nothing else it reads can turn an ad off. Its course keys are alias
tolerant (`csa` / `ap-csa`, `cyber` / `ap-cybersecurity`), so the full course id
this codebase uses everywhere else is what gets returned.

## What shipped

- `lib/entitlements.js`: `resolveStudentAccess(studentId)` returns the facts
  (course, enrolled, entitled) from the class and teacher read fresh from the
  database, reusing the module's single definition of a live entitlement.
  `COURSE_UNITS` is derived once at module load from `utils.js` COURSES, so unit
  numbers come from the structure authority and cost no query per request.
  `bi-N` and `unit-N` both normalize to N, which is how the script keys CSP.
- `routes/student.js`: `GET /entitlement`, student-token scoped, `no-store`
  (the URL is identical for every student and the browser cache does not key on
  the Authorization header, so a shared school machine would otherwise answer
  the next student with the last one's entitlement), loose per-IP limiter sized
  to catch a runaway client loop without ever tripping a NAT'd school.
- `smoke/student-entitlement.js` plus `smoke:entitlement`, picked up by CI
  automatically since the offline suite list is derived from package.json.

## The policy decision, and why the default is off

Tanner: "Not sure I am going to actually remove ads for students in a course
anymore but I do want to have the option eventually with a paid version in the
future."

So this ships the plumbing without making the business decision.
`STUDENT_AD_GATE` (unset means off) is the switch:

- OFF (default, and what is deployed): `teacherTier` is null and
  `unitsUnlocked` is `{}` for every student, so no page can suppress an ad.
  Behaviour is indistinguishable from the 404 the script has been fielding.
- ON: `teacherTier` reflects whether the class teacher holds a live entitlement
  for the class course, and a paid seat unlocks that whole course.

The flag is read once at boot, so flipping it on Railway needs a restart.

The honest facts (`course`, `enrolled`, `entitled`) are returned in both phases,
so a future paid-content gate can read this endpoint without waiting on the ad
decision. Zero PII in the response: no name, no id, nothing student-typed.

## Evidence

- All 65 offline smoke suites pass locally, including the new one, which asserts
  both phases (the gate-on half runs as a child process with the flag set).
- The safety property is a test, not a claim: with the gate off, the suite
  replays the deployed script's own decision function against the real response
  and asserts it suppresses nothing at unit 1 or unit 3, for paid, unpaid and
  solo students.
- Live `curl` against production after deploy is the artifact that closes this;
  the pre-change 404 above is the before half.

## Still open

- The theme script treats ANY authenticated teacher as ad-free everywhere,
  purely from the presence of `apcse_teacher_token` in localStorage, with no
  server check. If teacher ad-free should be restricted to PAID teachers, that
  is a theme-repo change reading `/api/gate/check`, not an API change.
- `unitsUnlocked` is whole-course today because entitlements are whole-course.
  Per-unit selling would be a change in the entitlements table, not here.

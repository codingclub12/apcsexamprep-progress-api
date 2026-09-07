# Interactive terminal labs

Read this before authoring a lab, adding a command to the shell, or wiring a lab
into a course.

## What a lab is

A brief, a pretend machine you can type at, and a list of checks. The student
works in a terminal, the page ticks each check the moment the work that satisfies
it happens, and the score is the number of ticked checks.

```
config/labs/<course>-<item>.json   the authored lab: brief, filesystem, checks
lib/lab-spec.js                    loads and validates it at boot
public/lab-player.js               the shell, the matcher and the UI
routes/labs.js                     GET /api/labs, /lab/:course/:item, /lab-player.js
POST /api/progress/attempt         where the grade goes, item_type 'terminal-lab'
smoke/labs.js                      plays every lab's own solution and fails if it cannot be finished
```

One check is one point. `lib/lab-spec.js` refuses a spec whose `points` is not
its check count, and the manifest row is generated from the spec, so the
denominator on the gradebook and the checkboxes on the page cannot disagree.

## The three decisions worth knowing

### 1. The filesystem is simulated, and that is the design

A real shell per student is a container per student. On Railway's 1 vCPU and
1 GB, one class period of thirty students is not a tuning problem, it is a
different bill, and this repo has already paid a $169 month once for something
that grew per request.

Everything these labs assess (navigate, list, read, search, transfer, verify)
is assessable over a simulated tree, and a simulated tree cannot be escaped
into: `..` past the root resolves back to the root because there is nothing
above it. When a lab genuinely needs a real kernel, that is a vendor decision
and a separate conversation, not a patch to `lab-player.js`.

### 2. The command line never leaves the browser

A terminal collects typed strings and a typed string is free text, which this
API never stores. `config/networking-hands-on.json` calls this out on 4.3 as the
one activity whose obvious implementation breaks the zero-PII posture.

So every check is evaluated in the page and the submission carries the check
index and its boolean, nothing else:

```json
{ "item_type": "terminal-lab", "score": 6, "max_score": 8,
  "detail": [{"q":1,"sel":null,"ok":true}, {"q":2,"sel":null,"ok":true}] }
```

`sel` is always null: a check is not a multiple choice question. The typed line
is not truncated or hashed, it is never sent. `smoke/labs.js` greps the submit
body for the variables that hold typed input and fails if any of them appear
there, and the sanitizer in `routes/progress.js` rebuilds `detail` field by
field, so an extra key on a hand-crafted POST is dropped rather than stored.

### 3. The score is client-computed, and the answer key ships

Same posture as every CSA widget: the page works out the score and posts it.
Hiding the key would not change that. A student who wanted to forge a lab grade
would POST a number to `/api/progress/attempt` and never open the lab, and no
amount of key-hiding touches that path. What the key buys is instant feedback
on the page, which is the entire pedagogy of a lab.

If a lab ever needs a grade that cannot be forged, it needs server-side grading
like `/api/progress/choice`, which means the checks must be expressible without
the typed line. Most cannot be. Say so out loud rather than pretending the
current shape is tamper-proof.

## Authoring a lab

```jsonc
{
  "course": "ap-networking",     // must match the class course, or the class is 'solo'
  "item_id": "4.3-lab",
  "lesson_id": "4.3",            // the gradebook cell this lands in
  "unit": "unit-4",
  "item_type": "terminal-lab",     // never plain "lab", see below
  "graded": true,                // stated explicitly, never inferred
  "points": 8,                   // MUST equal checks.length
  "est_minutes": 20,
  "title": "...",
  "brief": ["markdown-lite lines: **bold**, `code`, and 1. numbered steps"],
  "questions": [{ "id": "parts", "prompt": "...", "options": ["..."], "answer": 1, "explain": "..." }],
  "hosts": { "local": { "prompt": "...", "home": "/home/student", "cwd": "/home/student",
                        "fs": { "/home/student": { "dir": { "file.txt": "contents" } } } } },
  "solution": ["pwd", "cd reports", { "answer": "parts" }],
  "checks": [{ "n": 1, "label": "...", "ek": "4.3.A.5", "match": { "event": "cmd", "cmd": "pwd", "host": "local" } }]
}
```

A directory is an object, a file is a string. Each host has exactly one absolute
root and `cwd` must sit inside it.

### Checks match events

The shell emits six event kinds and nothing else:

| event | emitted when | fields you can match on |
|---|---|---|
| `cmd` | any recognised command runs | `cmd`, `host`, `cwd`, `cwdAfter` (cd only) |
| `read` | cat, head, tail, grep, wc read a file | `file` (basename), `host` |
| `help` | `help X`, `man X` or `X --help` | `topicIn` (array of command names) |
| `sftp-open` | an sftp session opens | `host` |
| `transfer` | get or put moves a file | `direction`, `file`, `to` |
| `answer` | a question is answered CORRECTLY | `question` |

Every match may also carry `after: <n>`, which requires an earlier check to be
ticked first. That is how a VERIFY step is expressed: check 8 on the networking
lab is `ls` on the destination **after** the transfer, because listing the folder
before you upload proves nothing, and "no error appeared" is the false proof
students accept.

### `solution` is not optional in practice

`smoke/labs.js` plays it through the real player and fails the build if it does
not tick every check. A lab whose eighth checkbox can never tick is not caught by
reading the spec; it is caught by a student, halfway through a class period.

## Grading, and when to seed a manifest row

`graded: true` produces exactly one `course_manifest` row, generated from the
spec by `scripts/seed-manifest.js`.

`graded: false` produces none, and the lab still runs and still self-checks. Use
it when the page is real but the denominator is not settled. A manifest row is a
denominator: seed one for work a student cannot do, or for a course whose points
arrive through another path, and every student in the class is marked down for a
reason no teacher can see on screen. `ap-cybersecurity` is exactly that case
today (see `docs/cyber-denominator-gaps.md`), so `1.2-lab` ships as practice.
Flipping it later is one field plus `node scripts/seed-manifest.js --update`.

## The activity type is `terminal-lab`, and that is load bearing

Every spec in `config/labs/` declares `item_type: "terminal-lab"`. It used to say
`lab`, and the rename on 2026-09-04 fixed a live defect rather than tidying a
name.

`lib/gradebook-contract.js` `denominatorMap` builds one map keyed
`(lesson, activity_type)`. It writes the authored `course_denominators` first and
the generated `course_manifest` rows second, with `set` rather than `+=`, so when
both describe the same key the manifest silently REPLACES the authored number.

AP Cybersecurity has an authored `1.2|lab` worth 30, for the lab widget on the
Topic 1.2 lesson page. Grading the Topic 1.2 terminal lab put an 8 point manifest
row on that same key, and Topic 1.2's lab column became 8 points for every cyber
student. Nothing threw. The suite was green.

Reproduced against two fresh databases with the real seeders:

    graded:true    manifest 1.2 | 1.2-auth-lab | lab | 8
                   denominatorMap 1.2|lab -> 8   (manifest)
    graded:false   no manifest row
                   denominatorMap 1.2|lab -> 30  (authored)

A simulated shell is not the widget on a lesson page, so it gets its own native
name. `ACTIVITY_MAP` maps `terminal-lab` back to canonical `lab`, so a teacher
still sees a lab; what changes is the KEY, since both `denominatorMap` and
`attempt-rollup` key on the native name. Same shape as the `debug` extension of
2026-09-01.

`npm run smoke:denomcollision` fails if any manifest `(lesson, type)` group ever
lands on an authored denominator again. Measured across every seeder in the repo
the day it was written: 306 manifest groups, 152 authored rows, zero in both. It
is a fact about the data, not a tolerance.

**This section previously predicted the bug and got the direction backwards.** It
said a lone cyber manifest row would ADD points through a second path. It
subtracts them. Recorded because the wrong prediction read as authoritative for a
month and is why nobody checked.

## `graded: false` is still a real setting

The AP Cybersecurity terminal labs, and which of them are graded:

    ap-cybersecurity-1.2-auth-lab.json   graded: true    since 2026-09-04
    ap-cybersecurity-1.2-lab.json        graded: false
    ap-cybersecurity-2.4-lab.json        graded: false
    ap-networking-1.4-lab.json           graded: true
    ap-networking-2.2-lab.json           graded: true
    ap-networking-3.5-lab.json           graded: true
    ap-networking-4.3-lab.json           graded: true

The two that are still `false` say so to the student in as many words: "This one
is practice. It checks your work on the page and records nothing." The page text
and the config agree, so a teacher reporting that one of those shows nothing in
the gradebook has found the design.

That is now a per-lab statement rather than a blanket one, and it has to be: a
teacher who was told "the cyber terminal labs are ungraded by design" in August
was told something that is no longer true of all of them. It was Michelle asking
about exactly this that started the work above.

Say "it records nothing today" rather than implying a permanent choice. A
`points` value is present on the ungraded ones too (6 and 8), which is what makes
the misreading easy: points without `graded: true` prices the checkboxes on the
page, not a gradebook cell.

The five per-lesson Unit 1 labs are a different thing entirely from the two
terminal labs, and a teacher asking about "the Unit 1 labs" almost always means
those. There are only two terminal labs in the whole course.

Nothing downstream needs changing when a lab is added. `lib/gradebook-contract.js`
already maps `lab` to the canonical `lab` activity, so the item appears as
`unit-4/4.3/lab` with its manifest denominator and no view branches on it.

## Embedding a lab on a lesson page

Graded use requires the student's JWT, so the lab must run on a page that already
has it. An iframe of `/lab/...` from the storefront cannot read the token and
cannot grade.

```html
<div id="lab-4-3"></div>
<script>
  window.APCS_LAB = {
    base: 'https://progress.apcsexamprep.com',
    getToken: () => localStorage.getItem('apcs_student_token')  // match the tracker's key
  };
</script>
<script src="https://progress.apcsexamprep.com/lab-player.js"></script>
<script>
  APCSLab.mountById(document.getElementById('lab-4-3'), 'ap-networking', '4.3-lab');
</script>
```

`https://progress.apcsexamprep.com/lab/ap-networking/4.3-lab` is the standalone
page: authoring, review, and a student who is signed in on the API origin.

## Preview

Add `?preview=1` to the standalone URL, or pass `{ preview: true }` to `mount`.
The terminal behaves identically and nothing is posted, so a teacher can walk a
lab without writing an attempt into their own gradebook. That is the one thing
the JuiceMind lab UI does that we had no equivalent for: every other reporter in
this repo treats a teacher walking a page as a student attempt.

## The cache is part of the enforcement path

A teacher closed a lab, the gradebook showed it shut, and their students kept
opening it. Four things were wrong and the fourth is the one worth remembering.

The first three were ordinary: `routes/labs.js` never consulted `activity_gates`
at all, the gradebook counted only `quiz_bank` when deciding whether a lock was
enforceable so it called every lab lock decorative, and the gate was asked about
the activity named `lab` while the spec calls itself `terminal-lab`.

The fourth is that `public/lab-player.js` fetched the spec with no `Authorization`
header. That is the one that made the other three moot: the server cannot apply a
per-class gate to a request it cannot attribute to a student, so a correct route
and a correct gradebook still handed out the lab. Fixed, and pinned by
`npm run smoke:labplayertoken`.

Then the fix shipped and the lab still did not lock, because **the player is the
file that decides whether the token is sent, so a stale copy of it silently turns
the gate off.** The deploy was correct, `/api/health` reported the new commit, and
the CDN served the previous player for hours.

### What the CDN actually does, measured

Do not reason about this from the route source. Measured 2026-09-07 against four
paths on this origin, cache key busted so every response came from us:

| path | route asks for | client receives |
|---|---|---|
| `/lab-player.js` | `max-age=3600` | `max-age=14400` |
| `/practice-hub.js` | `max-age=3600` | `max-age=14400` |
| `/api/intro-java/player.js` | `max-age=86400, immutable` | unchanged |
| `/lab/:course/:item` | `no-store` | unchanged |

So it is not rewriting every header. It raises a SHORT `max-age` on a cacheable
asset to its own four hour browser TTL and leaves a longer one alone, and it
leaves `no-store` alone because that response is never in the cacheable class.

Two things follow, and the first cost a deploy:

- **`max-age=0, must-revalidate` does not work here.** It is shorter than four
  hours, so it is inflated to `max-age=14400` exactly like the `3600` it would
  replace, and the route reads as fixed while nothing changes. That value was
  written, reviewed, passed CI and was one merge from shipping before the table
  above was measured.
- **A purge does not reach a browser.** The header delivered to students was
  `max-age=14400`, so every student who opened a lab page in the preceding four
  hours has the old player pinned locally. Purging the CDN clears the edge and
  those browsers keep serving themselves the broken file until it expires.

`/lab-player.js` is `no-store` now, which is the one value in that table that
arrived intact. It costs one 40KB origin fetch per lab page load across seven
pages.

### The version-the-URL answer, and why it is not taken yet

`no-store` fixes staleness by refusing to cache. Versioning the URL fixes it by
changing the key: `/lab-player.js?v=<build>` has no cached copy anywhere, at the
edge or in a browser, so a deploy reaches every student on their next page load
and the file can then be cached for a day.

It is the better answer and it is not a deploy. The `<script src>` is baked into
the seven lab page bodies by `scripts/lab-pages-csv.js`, so changing it means
regenerating those bodies and importing a Matrixify sheet. Worth doing the next
time those pages are regenerated for another reason.

`/api/intro-java/player.js` has the same latent bug and a worse version of it:
`max-age=86400, immutable`, unversioned. `immutable` tells a browser not to
revalidate at all, so a change to `greenfoot-player.js` can take a day to reach a
student and cannot be purged out of a browser at all. Nothing has gone wrong there
yet because that file changes rarely.

### The spec endpoint had the same bug one hop out

`GET /api/labs/:course/:item_id` answers with the spec for one student and
`locked: true` for another in a class that has closed it, and it inherited
`public, max-age=300` from the `cors()` helper on the OPEN branch. That was true
when every answer was the same and stopped being true when the gate landed. Any
shared cache on the path, and a school proxy is exactly that, could have handed
one class's open spec to a student whose teacher had shut it.

It is `no-store` with `Vary: Authorization` on both branches now. Both branches
matters: marking only the locked answer `no-store` leaves the open spec cacheable,
which is the entire leak, because a cache never holds the lock, it holds the thing
the lock was meant to withhold.

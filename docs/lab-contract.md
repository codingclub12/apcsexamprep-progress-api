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
POST /api/progress/attempt         where the grade goes, item_type 'lab'
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
{ "item_type": "lab", "score": 6, "max_score": 8,
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
  "item_type": "lab",
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

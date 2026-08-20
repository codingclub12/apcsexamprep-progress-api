# 2026-08-20 - Three more AP Networking terminal labs, one per remaining unit

## What I found before writing anything

I set out to build the ten graded configuration activities from
`config/networking-hands-on.json` and discovered **most of that system already
existed**, built by another session from that same spec:

```
config/labs/*.json      authored labs, validated at boot by lib/lab-spec.js
public/lab-player.js    the shell, the matcher, the UI
routes/labs.js          GET /api/labs, /lab/:course/:item, /lab-player.js
scripts/lab-pages-csv.js  builds the storefront page for a lab
smoke/labs.js           plays every lab's own solution and fails if it cannot finish
```

`ap-networking-4.3-lab` was already authored, graded, seeded and live at
`/pages/ap-networking-lab-4-3`. So the work was not to build an engine. It was to
author labs into one that exists.

Two things I checked before committing to that, both of which would have wasted a
lot of effort if I had assumed:

- **`item_type: 'lab'` is accepted by `POST /api/progress/attempt`**, and the
  server hard-rejects a mismatch between the posted type and the manifest's.
- **The deployed theme reporter coerces `item_type` to `quiz` or `cfu`**
  (`payload.item_type === "quiz" ? "quiz" : "cfu"` in
  `assets/ap-networking-reporter.js`). A lab posting through THAT path would 400
  every time. Labs do not use it: `lab-player.js` posts directly. Worth knowing
  before anyone wires a lab into a lesson page through the reporter.

## What shipped

| Lab | Topic | Unit | The work | The turn |
|---|---|---|---|---|
| Audit a device you were just handed | 1.4 | 1 | Read a router's live config files | The factory credentials are alive in a backup config one directory down |
| Document a network nobody wrote down | 2.2 | 2 | Read a DHCP lease table and an ARP cache | Nine devices, eight leases, and one address that is itself the diagnosis |
| Finance cannot reach the reporting server | 3.5 | 3 | Read a firewall rule set top to bottom | No rule is wrong; rule 20 shadows rule 30 |

With the existing 4.3 lab that is one per unit. Each is 8 checks, 8 points, and
`lib/lab-spec.js` refuses a spec whose points are not its check count.

## Why file reading is the right shape here, and where it stops

The shell implements `pwd ls cd cat head tail grep find wc tree echo sftp get put`
and no networking commands at all. That is a real constraint and I did not work
around it, because for these three topics it is not a constraint:

- 2.2's own objective IS documentation, and documenting a network you did not
  build means reading what the network says about itself.
- A firewall rule set is a text file read top to bottom. Reading one in a
  terminal is not a metaphor for 3.5, it is 3.5.
- Auditing an unfamiliar device starts by reading what it is currently set to.

It stops at topics whose work is genuinely interactive configuration. 3.3
(verify a guest network), 3.4 (subnet), 4.4 (routing) and 2.6 (segmentation)
would need either networking commands in the shell or a different widget, and
contorting them into file reading would produce a worse lab than no lab.

## Evidence

```
npm run smoke:labs        114 passed, 0 failed   (was 47)
full offline suite        ALL 87 SUITES PASS
node scripts/lab-pages-csv.js out.csv
                          5 pages built, all hazard rules clean
```

Every lab's reference solution is replayed through the real player by
`smoke/labs.js`. That caught a genuine defect on the first attempt: I had read
the contract's `"fs": { "/home/student": { "dir": {...} } }` example as `dir`
being a keyword, when it is a directory NAME. My tree put everything under
`/home/student/dir/`, so five of eight checks could never tick. Reading the spec
would not have found it; replaying the solution did, in seconds.

## What I added to the suite

Nothing verified that a lab's `ek` codes exist. They are quoted at teachers as
"which part of the framework is this for", and a code that does not exist reads
exactly like one that does. Now checked, along with the subtler failure of citing
a code from ANOTHER topic, which looks right and silently claims coverage the
lesson does not have. Question answer indices and explanations are checked too.

Negative-tested: a `3.5.C.4` changed to `3.5.C.9` turns the suite red.

## Still open

- **Six topics have no lab**: 2.4, 2.6, 3.3, 3.4, 4.4, 4.5. Of these, 4.5 (grep
  an IDS log) and 2.4 (read an AI-generated design and find its defects) fit the
  file shell honestly and are the obvious next two. The other four want either
  networking commands in the shell or a different kind of widget, and that is a
  design decision rather than an authoring task.
- **The pages are not imported.** `ap-networking-labs.csv` carries five MERGE
  rows: the three new labs, the already-live 4.3 page, and the cyber lab page.
  Re-importing the two that exist updates them in place.
- **Terminal labs are 32 of 480 graded points, 6.7%.** The readiness doc's target
  was hands-on at roughly 23.6%, matching the framework's own share of implement
  and verify sub-skills. Four labs is real progress toward it and is not it.
- `NET_HANDS_ON_LIVE` stays `false`. It is not needed: a graded lab spec seeds its
  own manifest row, and `seed-manifest.js` already skips any id a constant
  produced, which the suite pins.

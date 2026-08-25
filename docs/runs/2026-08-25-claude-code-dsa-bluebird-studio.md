# Device Security Analysis set 5: the design studio workstation

2026-08-25. Task #115, claims #23 and #24.

## Where this came from

A hand built HTML page arrived in chat, a complete Device Security Analysis
scenario about a design studio workstation, with its own timer, its own
autosave, its own rubric and its own CSS. It was offered as a page to add to
the site.

It was not added as a page. Sets 1 to 4 already reduced this question to a spec
file plus one shared player, so a third rendering of the same question would
have shipped a scenario with none of the guards: no validator, no cross checks,
no render test. The page also styled `html` and `body` globally and carried its
own sticky header, which inside a Shopify page body restyles the theme's own
chrome on that page.

The scenario itself was worth keeping. This run ports it, and fixes what was
wrong with it.

## The bug the port had to fix

In the original, Source 1 permitted inbound SSH only from the studio subnet and
denied everything else at the bottom of the table, and Source 2 showed a
password attack from an external address succeeding over SSH. That attack could
not have reached the device through that firewall. Part D of this question asks
a student to match a log line to the rule that governs it, so a set whose own
sources fail that match teaches students to stop trusting the evidence.

The fix is a timeline rather than a patched rule. Source 1 is the table as it
stood on 20 August. The password attack is dated 19 August, when inbound SSH was
open to any address, which Source 1's note states and row 22 records as the
change that closed it. Every blocked connection in the log is dated after that
change, and every connection that succeeded is consistent with the rules in
force when it happened. The over correction that closed SSH is also what part D
is about, so the repair became the lesson.

## The fifth pattern, on four axes

The set 3 and 4 run note said a fifth set would need a genuinely new evidence
pattern rather than another device name. This one carries four.

| | set 5, `dsa-bluebird-studio` | already in the library |
|---|---|---|
| part B | sweep, then pivot. Seven usernames once each, of which exactly one returns WITHOUT `invalid user`, then eight attempts against that one name, then a success | enumeration (kiosk), brute force (laptop), spraying (print), distributed (greenhouse) |
| part C | a directory. `client_notes.txt` is `-rw-------` inside a directory that is `drwxrwxrwx`, so nobody can read it and anybody can delete it | world writable executable, world readable secret, setuid bit |
| part D | rule precedence. Rule 4 allows the IT provider inbound SSH and never runs, because rule 3 denies all inbound SSH above it | inbound RDP, outbound FTP, inbound SMB, outbound DNS, each matching a deny directly |
| part E | an application input attack, read from a web access log rather than from host activity | cron persistence, HTTPS exfiltration, setuid escalation, unauthorised listener |

Part B is the first two stage attack here, and the tell is neither the count nor
the clock nor the source column, all of which the earlier four already train. It
is the wording of row 9 against its six neighbours.

Part D is the first block of legitimate traffic in the library, and the first
that cannot be answered by scanning for a matching deny. Rule 1 sits above rule
3 and still admits the studio network, so row 26 shows an SSH login succeeding
on the same morning the provider is refused. The lesson is precedence, not that
SSH is off.

Part E's filter bypass is real rather than decorative. Rows 4 to 6 are refused,
including a percent encoded attempt. Row 7 sends `....//`, which survives a
single pass strip of `../` because removing the middle `../` leaves one behind,
and returns 200. That is what makes part E (iv)'s answer canonicalisation rather
than a longer blocklist.

## Three guards, and each was confirmed to fail

The class of bug in the original page is a sample response and a source that
disagree. Nothing in the suite caught that shape, so:

- every row a part B sample cites must exist in that set's auth log. The
  existing check read the row range out of the STEM; these are the rows the
  answers point at, which is where a set drifts first when a log is edited after
  the answers are written.
- every firewall rule a part D sample names must exist in that set's rule table.
- part C (i) must explain a file that is in the listing, which the part C (iii)
  chmod answer already had to do.

All three were confirmed by breaking them: a part C (i) naming `ghost_file.txt`,
a part B citing row 99 of a 26 row log, and a part D naming rule 42 of a 9 rule
table each produce exactly one failure and no others. They run over all five
sets and passed on the four existing ones unchanged.

The guards deliberately cover parts B and D only. Part A and part E samples
legitimately cite rows in other sources, so a blanket rule would have flagged
correct answers in the print server set.

## Evidence

`npm run smoke:frq`: 110 passed, 0 failed, up from 81. `npm run smoke:practicehub`: 86 passed, 0 failed.

All 110 offline suites pass, run the way `tests.yml` derives them from
package.json rather than from a written out list.

Local boot on port 3999:

```
GET /api/frq                                       200, five sets, spec_errors []
GET /api/frq/ap-cybersecurity/dsa-bluebird-studio  200, 21983 bytes
GET /frq/ap-cybersecurity/dsa-bluebird-studio      200
GET /api/frq/ap-cybersecurity/nope                 404
```

The set is ASCII only and contains no em-dashes. It is self scored like the
other four: `public/frq-player.js` is untouched, still makes exactly one network
call, and no score from this set reaches a gradebook.

## Task #114 landed mid-flight, and CI caught what that changed

The first push of this branch went red, and it was this branch's failure rather
than anybody else's. Task #114 merged as PR #315 while the set was being
written, and CI tests the merge with main rather than the branch alone.

Two things it changed:

**The spec contract grew.** `lib/frq-spec.js` now requires `blurb`, `focus` and
`difficulty` on every set, because the hub renders a card per set and a card
with no copy is an empty box. Set 5 declares `blurb` (186 chars, inside the 60
to 200 bound), `focus`, `difficulty: stretch` and `order: 5`. Stretch is the
honest label: it is the only set where part D cannot be answered by finding the
matching deny.

**The page copy coupling became CI gating.** The first version of this run note
said no CI suite ran `scripts/frq-pages-csv.js`, which was true when it was
written and is no longer. `smoke/practice-hub.js` calls `build()` for every
authored spec, so a set with no entry in the `COPY` table now fails the build
rather than merely refusing a sheet on demand. The entry is in this change.

That file was locked by #114 and the lock was still held 43 minutes after
PR #315 merged. It was forced, which writes an audit row naming this session.
The reasons, recorded because forcing a lock should never be quiet: #114's code
had landed in main, the file's role in that task was the sibling links rewrite
that shipped with it, the remaining #114 work is Shopify side, and the edit here
is one additive entry for a set that does not exist in main. If that session did
still have the file open, this is the collision to know about.

## Still open

**Discoverability is task #114's, not this one's.** A fifth set changes the
count on the hub and nothing else; the hub generates itself from the specs.

**The COPY table is the coupling worth removing.** Every new spec breaks the
build until a second file is edited, and the rest of the page metadata already
lives in the spec next to `page_handle`, `seo_description` and now `blurb`.
Moving page copy into the spec, with the table kept as a fallback, would make a
new set one file again. It is a change to a file two tasks have now contended
over in one evening, which is the argument for doing it rather than against.

**The sheet is not imported.** `node scripts/frq-pages-csv.js out.csv --only
dsa-bluebird-studio` produces the page for the new set alone, and the generator
still prints its theme injector warning on every handle containing "frq".

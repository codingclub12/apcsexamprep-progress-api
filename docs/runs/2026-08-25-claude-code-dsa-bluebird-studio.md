# Device Security Analysis set 5: the design studio workstation

2026-08-25. Task #115, claim #23.

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

`npm run smoke:frq`: 110 passed, 0 failed, up from 81.

All 109 offline suites pass, run the way `tests.yml` derives them from
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

## Still open

**The page copy entry is not in this change.** `scripts/frq-pages-csv.js` holds
page copy in a `COPY` table and `build()` throws for a set that has none, so
with this spec merged the generator refuses to write the sheet for ALL five
sets until the entry lands. Nothing in CI runs that script, so this does not
gate a build, but the next person to generate the sheet will hit it.

The file was locked by task #114, which is building the FRQ hub from these same
specs, and forcing the lock on a live session was not worth it. The copy below
is written and was validated out of tree against the real `build()` and
`checkPage()`, producing a five page sheet with zero problems. It needs pasting
into the `COPY` object and nothing else:

```js
  'dsa-bluebird-studio': [
    'This is the whole of Section II of the AP Cybersecurity exam: one question, six sources, fifty minutes.',
    'The device is a design workstation at a six person studio that runs its own client proofing site. The password attack in this one arrives in two stages, and the firewall question turns on the order of the rules rather than on finding the rule that says deny.',
    'Write your responses on paper or in your own editor first. Each subpart then reveals a sample response and the specific points that earn credit, so you can mark yourself honestly.',
  ],
```

Once it is in, `node scripts/frq-pages-csv.js out.csv --only dsa-bluebird-studio`
produces the sheet for the new page alone.

**Discoverability is task #114's, not this one's.** The four existing pages had
no inbound links, and a fifth changes that count and nothing else.

**The COPY table is the coupling worth removing.** Every new spec breaks the
generator until a second file is edited, and the rest of the page metadata
already lives in the spec next to `page_handle` and `seo_description`. Moving
page copy into the spec, with the table kept as a fallback, would make a new set
one file again. Not done here for the same lock reason.

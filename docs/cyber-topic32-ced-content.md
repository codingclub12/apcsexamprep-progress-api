# Cyber Topic 3.2: authoring the content the page already claimed

Topic 3.2 is `ap-cyber-unit-3-lesson-3`. After the 2026-08-27 renumbering it
carried the right number and the wrong body. This is what was added, why the
shape is what it is, and what is still missing.

Renumbering context: `docs/cyber-unit3-renumbering-spec.md`.
Transform: `lib/cyber-u3-topic32-ced.js`. Sheet: `scripts/cyber-u3-topic32-ced-csv.js`.
Test: `smoke/cyber-topic32-ced.js` (`npm run smoke:cybertopic32`).

## The gap, stated precisely

The page shipped with a collapsed Essential Knowledge panel listing all eight of
Topic 3.2's EKs against two locations:

| Rows | Named location | Existed |
|---|---|---|
| 3.2.A.1 to 3.2.A.4 | "Section 2 - Network Security Policies" | no |
| 3.2.B.1 to 3.2.B.4 | "Section 3 - Wireless Security Controls" | no |

The table was not describing the page. It was describing a page someone intended
to write. The body underneath it was TLS, SSH, SFTP, DNSSEC and the certificate
trust model, across five sections and ten graded checks, and the words "router
security policy", "switch security policy" and "split tunneling" appeared in it
zero times outside that table and a summary box.

This is the same lesson the renumbering run note recorded and is worth keeping
in one sentence: **a citation is not coverage.** An EK code says what a page
claims to be about. Only the body says what it teaches.

## What the CED actually requires

Verbatim from the Fall 2026 CED, pages 73 to 74, via
`tools/ap-cyber-ced/CED-UNITS-2-5-EXTRACT.txt`:

**3.2.A, identify managerial controls related to network security.** Four
policies, each setting a *minimum* standard and each phrased "may include":

- **3.2.A.1 router security policy** - ban local user accounts (all logins via an
  approved authentication server), disable unnecessary services such as Telnet,
  require a firewall (which may be a device separate from the router)
- **3.2.A.2 switch security policy** - ban local user accounts, require port
  security enabled, use MAC filtering
- **3.2.A.3 VPN policy** - a list of roles allowed to use the VPN, authentication
  requirements (public/private key system or MFA), a prohibition against split
  tunneling, also called dual tunneling
- **3.2.A.4 wireless security policy** - authenticate through an extensible
  authentication protocol connected to an approved authentication server, encrypt
  all wireless traffic with AES at a minimum key length, disable beacon frames on
  wireless access points

**3.2.B, configure wireless network security features.**

- **3.2.B.1** disable beacon frame broadcasting on WAPs, to make the network
  harder for adversaries to find and learn about
- **3.2.B.2** control broadcast direction and signal strength so the signal does
  not extend beyond the physical space the AP is meant to cover
- **3.2.B.3** enable strong encryption; WEP, WPS and the original WPA have known
  vulnerabilities and are insecure; WPA3 is currently the strongest
- **3.2.B.4** enable MAC filtering to keep unauthorized devices off, and require
  users to authenticate when joining

Two things the CED does **not** say, and which the page therefore must not:

- It does not classify WPA2. It says WPA3 is currently strongest and names WEP,
  WPS and original WPA as insecure. WPA2 is neither on the insecure list nor the
  strongest, and the page says exactly that much.
- It does not claim disabling beacons hides a network. It says "harder to find".
  The page teaches the limit alongside the control, because teaching the control
  without it is what produces the misconception the page's own Common Mistakes
  table already lists.

## What was written

Five new sections in front of the existing body, because they are the topic:

| Section | Covers |
|---|---|
| 3.2.1 Policy Comes Before Configuration | framing: what a managerial control is |
| 3.2.2 Router and Switch Security Policies | 3.2.A.1, 3.2.A.2 |
| 3.2.3 VPN Policy | 3.2.A.3 |
| 3.2.4 Wireless Security Policy | 3.2.A.4 |
| 3.2.5 Configuring Wireless Security | 3.2.B.1 to 3.2.B.4 |

Five new graded checks numbered 1 to 5, one per idea: router/switch requirements
as a matching item, split tunneling, wireless policy requirements as a select-all,
encryption strength, and what each wireless configuration control achieves.

The five protocol sections renumber to 3.2.6 to 3.2.10 and the ten protocol
checks to 6 to 15, all behind a banner naming them as background. **Nothing was
deleted.** The material is good, Unit 3 has no better home for it, and the
policies above it keep referring to protocols without explaining them.

Also fixed, all of them inherited from the body's old home at lesson-6 and all
of them live defects rather than cosmetics:

- The H1 read "Lesson 3.2: Secure Network Protocols" while the page `<title>`
  read "Network Security Policies & Wireless". The two had disagreed since the
  renumbering.
- The footer nav pointed back at `lesson-5` and forward at
  `lesson-6-exercise-1`. The forward link sent a student to Topic 3.5's exercise,
  which still resolves, still renders, and files their visit under the wrong
  lesson. Now `lesson-2` and `lesson-3-exercise-1`.
- The JSON-LD breadcrumb still resolved to `/pages/ap-cyber-unit-3-lesson-6`.
- Nine EK codes sat in student-visible prose, five in the bellringer answer line
  and four in the Common Mistakes table. Every one keeps its claim and loses its
  citation, per "Citing the CED to students" in
  `docs/ap-cyber-unit1-ced-realignment.md`.

## The renumbering trap, and the test that exists for it

The ten existing checks shift from 1-10 to 6-15. **The target range overlaps the
source range.** An ascending pass renames `cfu-1` to `cfu-6`, then reaches 6 and
renames it again, and two blocks end up sharing an id. The page still renders,
the grader still runs, one of the two checks silently stops recording, and the
score reports out of a total that no longer matches what is on screen. Nothing
throws.

So `shiftCfus` runs descending, every splice asserts its own match count through
`once()`, and `smoke/cyber-topic32-ced.js` pins it. Reversing the loop direction
fails the build at `cfu 6 block id: expected 1 match(es), found 2`, which was
confirmed by doing it.

The check that matters most is the one that would otherwise be invisible: **each
of the ten pre-existing answer keys has to land on the question it started on.**
A shift that renumbers perfectly but pairs question 7 with question 8's key
regrades ten items and looks correct in every other check. It is asserted in the
smoke test and again in the sheet gate, and a deliberately drifted key was used
to confirm both refuse to write a sheet.

## Evidence

- `npm run smoke:cybertopic32`: 35 assertions, exit 0.
- All 141 offline suites pass, derived from `package.json` the way CI derives
  them.
- Generator gate clean against the live body: 152,008 to 190,527 bytes, 15 checks
  numbered 1-15, all 10 pre-existing keys on their own questions, sections 1-10
  in order, student-visible EK codes 9 to 0, coverage table still holding all 8,
  tag balance unchanged on every tag counted, rail untouched.
- `validate_csv.py --baseline`: `PASS ap-cyber-unit-3-lesson-3`, exit 0.
- The CSV body round-trips byte-identically to the transformed HTML.

Read the exit code directly. Piping the validator into `head` or `tail` reports
the pager's status, which is how a red gate read green once already.

## Still missing, and it is not small

**The four activity pages under this lesson still teach protocols.** They moved
here with the body and all four report as lesson `3.2`:

| Page | Heading |
|---|---|
| `-exercise-1` | Exercise 1, Secure Protocol Analysis |
| `-exercise-2` | Exercise 2, Protocol Migration Planning |
| `-lab` | Lab, Operation Cipher Sweep: Protocol Security Audit |
| `-quiz` | Lesson 3.2 Quiz: Secure Network Protocols |

So a student now reads a lesson on security policies and is assessed on TLS and
DNSSEC. That is better than before, when the lesson was wrong too, and it is not
finished. Realigning them is authoring four instruments rather than splicing
sections, which is why it is not folded into this diff. Denominators do not
change when it happens: `3.2|exercise-1` is 6, `-2` is 24, lab 30, quiz 5, and
those are measured from the pages' own score readouts, not from content.

The lesson page's own denominator is unaffected by going from 10 checks to 15.
The tracker derives the total from the DOM at runtime and reports a percent, and
`gradebook-contract` prices an already-attempted cell from the ledger rather than
from the table, so no past submission is regraded.

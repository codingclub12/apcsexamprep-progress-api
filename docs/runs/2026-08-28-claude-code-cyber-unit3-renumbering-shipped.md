# 2026-08-28, Claude Code: Cyber Unit 3 renumbered to the CED, live

The Unit 3 renumbering shipped. Sheet generated from the live pages, imported by
Tanner, verified live. Spec and reasoning: `docs/cyber-unit3-renumbering-spec.md`.

## What is live now

| Handle | Lesson id | Topic | Body came from |
|---|---|---|---|
| `ap-cyber-unit-3-lesson-1` | `3.1a` | 3.1 Part 1 of 2, Network Fundamentals | itself |
| `ap-cyber-unit-3-lesson-2` | `3.1b` | 3.1 Part 2 of 2, Network Attacks | itself |
| `ap-cyber-unit-3-lesson-3` | `3.2` | Network Security Policies and Wireless | lesson-6 |
| `ap-cyber-unit-3-lesson-4` | `3.3` | Network Segmentation and VLANs | itself |
| `ap-cyber-unit-3-lesson-5` | `3.4` | Firewalls and Packet Filtering | lesson-3 |
| `ap-cyber-unit-3-lesson-6` | `3.5` | IDS, IPS and SIEM | lesson-5 |

31 rows: 30 pages plus the hub, `Command: MERGE`, 2,223,786 bytes.

## Evidence

- Generator exit 0, 31/31 rows ok, run against the LIVE bodies rather than a cache.
- `validate_csv.py --baseline` exit 0, 31/31 PASS, with the move-aware baseline.
- `verify_import.py` exit 0, **31/31 PASS** after the import, `updated_at`
  2026-08-28T17:06 across the set.
- All 30 live pages re-fetched and re-checked: plain topic number, section
  prefixes and `data-lesson-id` agree on every one. Lesson ids read 3.1a, 3.1b,
  3.2, 3.3, 3.4, 3.5. Every lesson page carries a 6-entry rail with the open
  marker on its own position.
- Hub live: links all six lessons, carries the new lesson index, the card is
  retargeted to lesson-3, the stale lesson-6 call to action is gone, and the
  "not tested on the AP exam" line is gone.

Two byte deltas are expected and are the documented Shopify normalisation, not a
loss: lesson-6 sheet 197,374 vs live 197,338, hub 68,124 vs 68,119. Entities are
decoded on store, so a clean body comes back shorter.

## What was learned

**A citation is not coverage.** The spec mapped lesson-6 to CED 3.2 because the
page cites all eight of that topic's EK codes. Those citations sit in a "What Is
Testable" table; the 91 KB teaching body is TLS, SSH, VPN architecture, DNSSEC
and PKI. Router, switch and wireless security policies appear zero times in it.
**Unit 3 teaches CED 3.2 nowhere**, and the hub's own 3.2 section does not close
the gap either. The audit had this right and the spec's mapping table lost it by
reading the numbering back from the citations. An EK code says what a page claims
to be about; only the body says what it teaches.

**The hub was right and the lessons were wrong.** Its five sections already read
the CED topics correctly. Worth remembering the next time two artefacts disagree:
the one with fewer moving parts had been correct for months.

**A link can break without breaking.** The hub's one lesson link pointed at
lesson-6 describing TLS and DNSSEC. After the three-cycle lesson-6 holds the
detection body, so the card would still have resolved and still rendered, sending
readers to IDS and SIEM under a heading promising secure protocols. That is why
the hub shipped as a row in the same sheet rather than a separate import.

## Still open

1. **CED 3.2 content.** ~~Author 3.2.A router, switch, VPN and wireless policies
   and 3.2.B wireless configuration into the Topic 3.2 lesson.~~ Done on the
   lesson page later the same day: all eight EKs are sections 3.2.1 to 3.2.5 with
   five checks on them, and the protocol body is background at 3.2.6 to 3.2.10.
   Run note: `docs/runs/2026-08-28-claude-code-cyber-topic32-ced-content.md`.
   Tanner's call was to renumber first and track the gap rather than hide it
   behind a wrong number, and tracking it is what made it easy to close.
   **What remains:** the lesson's four activity pages still teach protocols.
2. **Denominators.** 8 adds (`3.1a|*`, `3.1b|*`), 8 removes (`3.1|*`, `3.6|*`),
   no value changes, because the old 3.2, 3.3, 3.4 totals were numerically
   identical to their new occupants. Needs Railway or admin auth.
3. **The rename sweep**, deliberately excluded from this pass so the diff stayed
   about one thing. Live counts from `ced_audit_v2.py --unit=3` after the import:
   dns spoofing on 10 pages, arp spoofing on 4, packet sniffing on 3, event log on
   2, kill chain and input validation on 1 each. Plus off-CED terms: SCADA,
   RADIUS, 3DES, botnet, exploitation.

The `WRONG-UNIT` count in that audit is 30, which is every page and is NOT a
regression. That category flags any term the CED files under another unit, so a
Unit 3 page saying "https" (Unit 1) or "patch" (Units 2 and 4) trips it. It read
the same before the renumbering. The signal that matters is the acceptance test,
and it passes on all 30.

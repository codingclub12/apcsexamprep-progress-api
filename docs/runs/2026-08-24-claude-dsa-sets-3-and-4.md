# Device Security Analysis: sets 3 and 4

2026-08-24. Task #113, claim #20 (same task as the first two sets).

## The library is now four sets

Every set is the same exam question against a different device: 6 sources,
parts A to E, 14 subparts, 50 minutes. What varies is the evidence.

| set | part B password attack | part D block | part E second attack |
|---|---|---|---|
| `dsa-library-kiosk` | enumeration: one try each, usernames that do NOT exist, 1 per second | inbound RDP | persistence, backdoor appended to a cron-run script |
| `dsa-athletics-laptop` | brute force: many tries, ONE account, one source, 2 per second | outbound FTP | exfiltration over HTTPS, then history cleared |
| `dsa-print-server` | spraying: one try each across accounts that DO exist, 3 minutes apart | inbound SMB | privilege escalation via a setuid root binary |
| `dsa-greenhouse-controller` | distributed: many tries, ONE account, SIX source addresses | outbound DNS | unauthorised listening service, enabled to persist |

The four part B patterns are genuinely different and the difference is the
skill. Enumeration shows `invalid user`, spraying shows `Failed password for
<real name>` spaced to dodge lockout, brute force hammers one account from one
place, and the distributed one looks like brute force until you read the source
column.

**Being honest about part E:** the kiosk and the greenhouse are both
persistence. They differ in mechanism and in which source gives them away, the
kiosk by modifying an existing scheduled job that Source 4 shows is
world-writable, the greenhouse by installing a new service whose port only
appears in Source 5. That is a real difference in what a student has to read,
but it is not a fourth distinct attack category, and the table above should not
be read as claiming one.

## Part C now covers three permission lessons

- kiosk: world-writable executable, `chmod 640`
- laptop and greenhouse: world-readable secrets, `chmod 600`, including a
  private key that every account can read
- print server: the setuid bit, reading `-rwsr-xr-x` and what the `s` does

## Two things I got wrong and fixed

**Set 4 originally departed from the exam's phrasing.** Because the attack is
distributed, I wrote part B(ii) as "identify the source addresses, and explain
why blocking one does not work". That is a better teaching question and it is
not the question the exam asks. The CED asks "Identify the IP address of the
adversary". The set now asks exactly that, answers with the address the
successful login came from, and the distribution lesson moved into B(i), which
is where describing the evidence belongs. Format fidelity is the whole premise
of this library; the moment a set teaches its own better question it stops being
practice for the real one.

**A smoke check was testing prose, not facts.** It required part B's Identify
sample to be a bare IP string, which only passed because the first three sets
happened to answer in one line. It now extracts addresses with a regex and
checks each against the log. Third guard in this stretch to have the same shape
of bug, after the em-dash counter and the `sendBeacon` search: a check that
matched the text of an answer rather than the thing the answer is about.

## Evidence

`npm run smoke:frq`: 81 passed, 0 failed, up from 51.

Cross-checks now run over four sets: each part B row range must exist in that
set's auth log, every IP part B names must appear in the log, and each part C
`chmod` answer must name a file in that set's listing.

Neighbours unchanged: `smoke:labs`, `smoke:cyberexamtruth`, `smoke:cyberclarity`,
`smoke:manifestprune`, `smoke:denominators`, `smoke:gradebook` all pass.

## Still open

- The pages sheet builds all four but still must not be imported until theme
  PR #73 lands, which narrows the FRQ CTA injector to CSA pages. The generator
  prints the warning on every run.
- Four sets is a usable library for one exam question. A fifth would need a
  genuinely new evidence pattern, not another device name.

# 2026-08-16 - the board report was publishing names to a public log

## What was found

While planning an ergonomics change (post the reconcile report somewhere a phone
renders it), the question "where does this text end up?" got asked for the first
time.

**This repo is public. So are its Actions logs.** Anyone can read a job log with
no login. `verify-board.js` prints task titles, and titles are free text a human
typed about their own business. Five live runs had already published, into a
world-readable log:

```
#49  Personal follow-up to <teacher name> - access code delivered, never opened
#50  Chase <person>'s unpaid PO #<number>
#51  Delete the five orphaned Gmail drafts from the CSA preview-link incident
```

A real person's name, an unpaid purchase order number, and an internal incident
description.

The product's posture is zero PII: no student emails, no free-text student input,
ever. That constraint was applied carefully to the student path and never asked
about the operator tooling built around it. The tooling does not get an
exemption; a public log is a publication.

## Why it nearly got worse

The change being planned was to post the report as a GitHub issue comment, so it
would arrive as a phone notification. That would have taken a leak nobody had
noticed and given it a URL, a title, and a push notification. The ergonomics work
is on hold until the surface question is settled.

## The fix

`--redact` drops task titles. Everything else stays: ids, artifact URLs, signals,
and the reason a task could not be checked. A task id is enough to act on, and
the title lives on the board behind a credential, which is where free text
belongs.

The workflow passes it unconditionally:

```yaml
args="--redact"
```

Not an input. An input is a thing a run can forget, and the failure mode is
silent and permanent - a log cannot be unpublished from whoever already read it.

Redaction reaches `--json` too. Redacting only the markdown would leave the flag
decorative on the output most likely to be piped somewhere else.

The default stays titles-ON, because the CLI's output goes to a terminal the
operator owns. Only the public surface is redacted.

## Testing

`smoke/verify-board.js` section 11, 10 assertions, 43 -> 53.

Covers: titles present by default, no title surviving `--redact`, ids and signals
and not-checkable reasons still present, artifact URLs still present (already
public), `--json --redact` stripping titles from task objects.

The two that matter are guards on the workflow rather than the script, because
the script defaults to titles ON and the workflow is the only thing keeping them
out of the public log:

- `11.9` fails if the workflow stops passing `--redact`. Verified by removing it:
  `52 passed, 1 failed`.
- `11.10` fails if `redact` ever becomes an optional input. Scoped to the inputs
  block, since a greedy match hits the comment explaining the flag and would fail
  the test for documenting itself.

All 60 offline suites pass.

## Also in this pass

The panel button said **Run it on GitHub**. It does not run anything - it opens
the workflow page, where the run needs two more taps. Relabelled to **Open the
workflow on GitHub**. A button that looks pressed is not a workflow that ran, and
that exact confusion already cost one round today.

## Open, and needs a decision

- **The five existing runs still carry the names.** Deleting their logs is
  irreversible, so it was not done unilaterally. `delete_workflow_run_logs` on
  runs 1-5 of `verify-board.yml` removes the exposure.
- **Mobile readability is still unsolved.** GitHub's app does not render job
  summaries, so the report is only reachable by tapping into the step log. The
  redacted report is readable there. Any nicer surface needs the public-repo
  question answered first.
- The `#71`/`#82` "exactly 3 duplicated blocks" question is untouched.

# Site assistant Phase 1: the knowledge base

**Ask:** start Phase 1.

**Outcome:** shipped. `kb_articles`, versions, FTS with the triggers the review
flagged, an editor at `/admin/kb`, a public help page at `/help`, and thirteen
draft stubs. Still no model.

## What changed

| File | Why |
| --- | --- |
| `db.js` | `kb_articles`, `kb_article_versions`, `kb_fts` and its three triggers |
| `lib/assistant/kb.js` | The store: save, version, revert, list, search. Touches only `kb_*` |
| `routes/admin.js` | Admin CRUD, mounted here so it inherits `requireAdmin` rather than a second copy of the gate |
| `routes/assistant.js` | Public search and article read, published only |
| `public/kb.html` | The editor |
| `public/help.html` | The help page |
| `scripts/seed-kb.js` | Thirteen draft stubs, idempotent |
| `smoke/assistant-kb.js` | 47 assertions |

## The finding worth keeping

`kb_fts` is external content, so **sqlite does not maintain it**. Without the
three triggers the index silently stops matching the table and search quietly
returns fewer results. The v1 handoff specified `content='kb_articles'` and no
triggers; `docs/site-assistant-review.md` caught it on paper and this is where it
gets fixed and tested.

The detail that is easy to get wrong: the `'delete'` command rows must carry the
**old** values, so the update trigger is a delete followed by an insert.

## An honest note about how that got verified

My first three attempts to test the triggers all reported a failure that was not
there. In order: I searched for a word that lived in the title while only editing
the body, I searched `pineapple` against the text `pineapples` (fts5 does not
stem by default), and then I wrote an INSERT with five columns and four values
twice. The triggers were correct the whole time.

Worth recording because the shape recurs: a test that fails for a reason inside
the test looks exactly like a bug in the thing under test, and the instinct to
start patching the code is wrong. The suite now asserts each direction with a
distinct sentinel word in a distinct field, which is what I should have written
first.

## Decisions

**Admin routes live in `routes/admin.js`**, not `routes/assistant.js`, so they
inherit the real `requireAdmin`. A second copy of a fail-closed check is a second
thing that can be wrong.

**The seed writes stubs, not answers.** Each carries a brief for the author and
says it is unwritten. The spec is explicit that Tanner writes the bodies, and a
confidently wrong answer about site mechanics is worse than none because the
reader believes it and stops looking.

**Drafts are filtered in SQL**, not by callers. There is no code path that can
serve one.

## Evidence

47 assertions. The two that matter most are the trigger sweep (insert, update,
title-only update, delete, `integrity-check`, row-count parity) and the corpus
separation: `quiz_bank` is seeded with sentinel prompt, option and explanation
text and the KB search is asked for each; finding nothing is the assertion.

Adjacent suites after the change: `assistantdiag` 48, `assistantreport` 92,
`posthog` 53 (up from 51, having picked up both new pages), `admingates` 43,
`admin` OK.

## Two sweep failures, neither of them this change

`smoke:codegrade` looked red and is not. My sweep grepped output for
`N failed`, and that suite prints a string matching it while reporting `ALL
PASS`. The detector was wrong, not the suite. Worth knowing before someone else
writes the same grep.

`smoke:csakitstyle` fails with `ModuleNotFoundError: No module named 'pptx'`,
identically on clean `main` in a worktree with no changes. It is a missing Python
dependency in this container rather than a defect, and CI installs it (PR #516,
"CSA teacher kit quality fixes and the CI deps they need").

## Still open

- **Nobody has written an article yet.** Thirteen drafts exist and nothing is
  published, so `/help` correctly shows nothing. That is Tanner's to fill.
- `npm run seed:kb` has to be run against production once to create the stubs.
  It is idempotent and only ever creates drafts.
- Linking `/help` from the storefront is theme work.

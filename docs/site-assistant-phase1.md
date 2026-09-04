# Site assistant, Phase 1: the knowledge base

Answers about how the site works, written by a person, served without a model.

```
GET  /help                        the searchable help page
GET  /api/assistant/help?q=       public search, published articles only
GET  /api/assistant/help/:slug    one published article
GET  /admin/kb                    the editor
GET  /api/admin/kb                list, any status
POST /api/admin/kb                create or update, versioned
POST /api/admin/kb/:id/revert     restore an earlier version
```

## Why it lives in the database

So that correcting a wrong answer does not need a deploy. That is the whole
reason, and it is worth the extra table.

## The part the v1 handoff got wrong

`kb_fts` is an **external content** fts5 table: it stores no copy of the text and
reads through to `kb_articles` by rowid. That is the right shape and it has one
consequence that is easy to miss and silent when missed. SQLite does not maintain
it. Without `INSERT`, `UPDATE` and `DELETE` triggers the index simply stops
matching reality, and the failure is a search returning fewer results rather than
an error anyone sees.

`docs/site-assistant-review.md` flagged this against the v1 handoff, which
specified `content='kb_articles'` and no triggers. The triggers are in `db.js`,
and `smoke:assistantkb` asserts all three directions plus fts5's own
`integrity-check`, because a guard nobody tests is how this went wrong the first
time.

One detail worth keeping: the `'delete'` command rows must carry the **old**
values, which is why the update trigger is a delete followed by an insert rather
than an update.

## Drafts are not public

`kb.search` filters to `status='published'` in SQL, so there is no code path that
could serve a draft to a caller who forgot to check. A draft answers the same 404
as a nonexistent slug, so unfinished articles cannot be found by guessing.

Half-written site mechanics are worse than silence: a person who reads a wrong
answer stops looking.

## The corpus contains site mechanics and nothing else

No lesson bodies, no quiz text, no answer keys, ever. This is spec layer 1, and
it is what makes retrieval safe to run next to an assessment product: the corpus
cannot leak what it never contained.

The suite proves it rather than asserting it. `quiz_bank` is seeded with sentinel
prompt, option and explanation text, and the KB search is asked for each one.
Finding nothing is the assertion.

`lib/assistant/kb.js` touches only `kb_*` tables. Account and class state is read
by `lib/assistant/reads.js` and nowhere else, and the two do not overlap.

## The seed is stubs, not answers

`npm run seed:kb` creates one **draft** stub per escalation category, thirteen in
all, matching the taxonomy in `lib/assistant/report.js` so answers group against
the same schema as the questions.

Each stub carries a brief describing what the finished article must cover, and
says plainly that it has not been written. It does not attempt the answer. The
spec is explicit that Tanner writes the bodies and the assistant must not invent
site mechanics, and a confidently wrong answer about how the site works is worse
than none because the reader believes it.

The seed is idempotent: an existing slug is left exactly as it is, so running it
can never overwrite something a human wrote.

## Writing an article

`/admin/kb`, behind the same session cookie as every other admin page. Pick an
article or start a new one, write markdown, set status to `published` when it is
true. Version history is listed under the editor and any version is one click
from being restored. Reverting is itself a save, so history grows rather than
rewinds and nothing is ever destroyed.

## Tests

`npm run smoke:assistantkb`, 47 assertions, offline and secret-free. Covers the
three trigger directions and `integrity-check`, draft invisibility from both the
module and HTTP, version and revert behaviour, corpus separation from `quiz_bank`,
admin routes failing closed without the key, and that a person typing punctuation
into the search box gets an answer rather than a 500.

## What Phase 1 is not

No model, no chat, no retrieval into a prompt. The corpus and its editor exist
first so that Phase 2 has something correct to retrieve from.

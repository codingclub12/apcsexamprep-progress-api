# Stage 1 redirects: the six empty hub pages

Generated 2026-09-16. Board task 339.

## Importing this sheet on its own changes nothing

Every Path below returns **HTTP 200 today**. Shopify's own rule: "You can
redirect only from broken URLs. If the URL still loads a valid webpage, then
the URL redirect won't work."

So the import order is not optional:

1. **A human unpublishes the six pages.** Unpublishing a handle is `NEVER_AUTO`.
   It is not an agent's to do, and this sheet does not do it.
2. Confirm each Path now answers 404.
3. Import `stage-1-empty-hub-redirects.csv` (Matrixify, MERGE mode, one import).
4. Confirm each Path now answers 301 to its Target.

Run step 3 before step 1 and you get six redirects that silently never fire,
and it looks like it worked: Matrixify logs the rows and the redirects appear
in Admin, while every URL still serves the empty shell.

Nothing needs exporting first. These pages have no body worth keeping, which
is the whole reason they are on this list.

## What is being redirected, and why it is safe

All six serve the identical empty shell: a page title and the global contact
widget, nothing else. Measured live 2026-09-16, word count inside `<main>`:

| Path | main words | Target | Target status |
|---|---|---|---|
| `/pages/ap-csa` | 2315 | `/pages/ap-csa-course` | 200 |
| `/pages/ap-csp` | 2315 | `/pages/ap-csp-course` | 200 |
| `/pages/practice-exams` | 2315 | `/collections/practice-exams` | 200 |
| `/pages/flashcards` | 2314 | `/collections/flashcards` | 200 |
| `/pages/bundles` | 2314 | `/collections/bundles` | 200 |
| `/pages/quick-reference` | 2315 | `/collections/quick-reference` | 200 |

The word counts are within one word of each other because the content is the
same global chrome on all six. A real page on this site runs far longer.

The last four each share a slug with a real collection, so the page and the
collection have been competing for the same term. The redirect hands the slug
to the collection, which is the thing that actually has products on it.

Every Target was status checked live on 2026-09-16 through
`lib/storefront-fetch.js` before its row was written. A redirect to a 404 is
worse than no redirect: it turns a soft landing into a loop through a dead
page.

## What is deliberately NOT in this sheet

The stage-1 list was originally scoped as "six empty pages and four
zero-traffic duplicates". Only the six are here.

The four duplicates were identified from a Search Console join that this
session could not reach: the Ahrefs GSC connector answers "No GSC data
available for the requested date range" for this project on every range tried.
Redirecting a page because it is believed to have no traffic, without being
able to read its traffic, is how a ranking page gets deleted. They stay out
until somebody can read the numbers.

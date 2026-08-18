# Two CSP lesson pages record nothing when their game is finished

Measured 2026-08-18 against the live storefront.

## The defect

Every CSP lesson page that embeds a topic game carries a bridge that turns the
game's completion into a gradebook entry:

```js
/* Bridge: the embedded topic game dispatches 'apcsGameScore' on completion.
   Convert that single completion into the standard exercise-2 gradebook hook. */
document.addEventListener('apcsGameScore', function(e){
  _activity({activity:'exercise-2', earned:1, possible:1});
});
```

Counted across all 35 lesson pages:

| | Pages |
|---|---|
| Embed a game (dispatch `apcsGameScore`) | 19 |
| Carry the bridge (listen for it) | 17 |
| **Embed a game with NO bridge** | **2** |

The two:

- `/pages/ap-csp-course-bi3-developing-algorithms`
- `/pages/ap-csp-course-bi3-developing-procedures`

A student finishes the game on either page and **nothing is recorded**. No
`exercise-2`, no error, no sign anything is wrong. The teacher sees an empty
column and cannot tell it apart from a student who never played.

## The fix

Add the bridge block above to each page's own `<script>`, immediately before its
closing `</script>` tag, which is where it sits on the working 17. Nothing else
changes. `_activity` is already defined on both pages.

Verify with:

```
grep -c "addEventListener('apcsGameScore'" <page body>   # must become 1
```

## Why this is not shipped from this repo

Page bodies ship via Matrixify from the chat-side pipeline, and this repo is not
canonical for them. More practically, a safe edit needs the authoritative body:
extracting it from the rendered storefront page produced an unbalanced result
here (3 script opens against 6 closes), and an unbalanced body would break the
page. Shopify keeps no version history for a page body, so a bad write has no
undo.

Apply it with the real body in hand, and snapshot both pages to
`shopify/page-snapshots/` first.

## Worth fixing at the same time, or instead

The bridge is duplicated inline on 17 pages and missing from 2. Moving it into
the theme asset that already loads on every CSP page (`assets/ap-csp-reporter.js`)
would make it impossible to omit on a new page, and would delete 17 copies. That
is a theme-repo change and a larger decision, but this defect is the argument
for it.

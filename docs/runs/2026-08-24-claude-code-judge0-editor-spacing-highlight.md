# Judge0 editors: doubled line breaks on Enter, invisible selection

## What was wrong

Two separate bugs, both in the storefront editors rather than in the Judge0
proxy. The proxy was not touched.

**Doubled line break on Enter.** Every code textarea on the storefront is
enhanced by one shared handler in the theme's `layout/theme.liquid` (section 8,
"TAB INDENTATION FOR CODE TEXTAREAS"). It cancels the keydown and writes the
new line plus the previous line's indent itself. When the engine still delivers
that keystroke as a `beforeinput` line break, its insertion lands on top of the
one already written, so the caret ends up two lines down. The same handler also
assigned `.value` directly, which wipes the browser's undo stack: Cmd+Z threw
away the whole editing session.

**Selection not visible.** Dawn's `assets/base.css` sets a global
`::selection { background-color: rgba(var(--color-foreground), 0.2) }`. The
page foreground is near-black, so over the editors' dark background (`#0f172a`
on CSA pages, `#022C22` on CSP) a selection is near-black at 20 percent alpha:
effectively invisible. Nothing was wrong with the selection itself, which is
why copy and paste worked.

## What changed

Theme (`layout/theme.liquid`), PR: codingclub12/apcsexamprep-theme

- All four editing branches (Tab, Shift+Tab, Enter, closing brace) route
  through one `replaceRange` helper that inserts with
  `document.execCommand('insertText')` and falls back to `.value` assignment.
  Undo works again as a side effect.
- The helper marks the keystroke as handled; a `beforeinput` listener on the
  same textarea drops the engine's duplicate insertion.
- New CSS section 0 restates `::selection` for textareas, inputs, `pre` and
  `code` as white on `#2563eb`, with `!important` to beat base.css.

API repo (`lib/sandbox-page.js`)

- The same `::selection` rule for the sandbox editor served off
  progress.apcsexamprep.com, so it does not depend on browser defaults.

## Evidence

Chromium, driven against the live CSA exercise page markup with the patched
theme block spliced in:

```
plain    "int x = 1;\ny"                  caret 12   (one newline, not two)
brace    "  if (a) {\n      "             caret 17
pair     "  if (a) {\n      z\n  }"       caret 18
tab      "int a;    "                     caret 10
shifttab "x"                              caret 1
closer   "if (a) {\n    b;\n}"            caret 17
undo     "abc"                            caret 3    (Enter undone)
sel      rgb(37, 99, 235) / rgb(255, 255, 255)
```

No page errors beyond the two Shopify CDN modules that cannot load from a
local file.

## Still open

- The theme PR has to merge and the theme deploy has to land before students
  see either fix; both live entirely in `theme.liquid`, so no Matrixify sheet
  and no page re-import is needed.
- Not reproduced on the reporter's own browser, since the doubled break did not
  occur in headless Chromium. The `beforeinput` guard is engine-agnostic and
  the fix holds either way, but confirming on the machine that saw it is worth
  one minute.

## Learned

The editors have no per-page key handling at all: every one of them is the one
handler in `theme.liquid`. A bug reported as "all the editors" is therefore one
fix in one file, and page CSS in this repo is the wrong place to look first.

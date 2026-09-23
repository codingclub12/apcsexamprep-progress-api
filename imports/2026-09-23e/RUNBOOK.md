# 2026-09-23e: login pages layout, and a Command Center link to them

One sheet, two rows, both MERGE with Body HTML only (titles and publish dates
untouched). Built by `node scripts/build-cyber-login-pages-sheet.js --update`.

| Row | Page | What changes |
|---|---|---|
| 1 | `ap-cyber-unit-1-lesson-3-sample-login-pages` | Cards are four across on desktop, two by two on tablets, one per row on phones. Never 3 + 1. The "Not secure" badge drops above the address when a card is narrow. No text changes (the builder refuses one). |
| 2 | `cyber-command-center` | Lesson 1.3, Student pages row: a new "Login Warmup" button with its copy-link button. No other lesson changes. |

Import the one file. Then:

| Check | Expected |
|---|---|
| Open the login pages page on a laptop | four cards on one line |
| Command Center, expand 1.3 | Student pages: Lesson page, Quiz, Scenario 1, Scenario 2, Login Warmup |
| Expand 1.2 or 1.4 | no Login Warmup button |

Built from the live bodies read at build time. If either page is edited in
the admin before this is imported, rebuild first: the builder refuses when the
live login page text no longer matches the repo, and the Command Center row
refuses when its two target strings are not each present exactly once.

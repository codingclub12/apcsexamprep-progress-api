# 2026-09-23d: AP Cyber 1.3 Day 3 sample login pages

One sheet, one NEW page. MERGE creates it because the handle does not exist
yet; the builder refused to write the sheet unless the handle answered 404.

| Step | Do | Expected |
|---|---|---|
| 0 | Open https://www.apcsexamprep.com/pages/ap-cyber-unit-1-lesson-3-sample-login-pages | 404. If it already serves a page, stop: something else is on that handle |
| 1 | Import `cyber-1-3-sample-login-pages.csv` (MERGE, QUOTE_ALL, utf-8-sig) | 1 page created, published |
| 2 | Reload the URL | "Real or Fake? Four Wi-Fi Login Pages", four login screens, a collapsed Teacher key |

Then, by hand in Drive (not done here):

- Deck `AP-CYBER_1-3_Day3_Deck_TEACHER`, slide 2, and the matching STUDENT deck:
  change "are on the board" to point at the URL above, and add the URL to the
  first line of the speaker notes.
- The 1.3 Teacher Guide, Materials and setup: add "Day 3 warmup: project the
  Sample Login Pages page (URL)".

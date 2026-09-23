# 2026-09-23f: the two missing role pages from the Re-Ask email

One sheet, two rows. Both are new pages (MERGE on a handle that does not exist
creates it). Built by `node scripts/build-confirm-role-pages-sheet.js`, which
refuses if either handle already serves a page or any link on them is broken.

| Row | Page | Links to |
|---|---|---|
| 1 | `confirm-teacher` | CSA, CSP and Cybersecurity teacher dashboards |
| 2 | `confirm-parent` | `ap-csa-course`, `ap-csp`, `ap-cybersecurity-course` |

Before importing, check it is still needed:

    node scripts/verify-confirm-role-pages-live.js

Expected BEFORE: two FAILs (both answer 404), `confirm-csa` and `confirm-csp` ok.
If either role page already serves, somebody made it; delete this sheet instead.

Import the one file. Then run the same command. Expected AFTER: all clear.

Nothing in Klaviyo needs changing. The flow's splits read the clicked URL, which
is already `https://apcsexamprep.com/pages/confirm-teacher` and `.../confirm-parent`.

# Phase 4: Entitlements + Shopify Webhook

The Teacher Command Center primitives. Entitlements record which teacher "owns"
a course or unit; the Shopify order webhook grants them automatically on
purchase. Everything here is recorded and readable but NOT yet enforced, so it
never blocks existing access. Enforcement (gating content on an entitlement) is a
later, deliberate step.

## Going live: what you must configure

1. **Set `SHOPIFY_WEBHOOK_SECRET`** in the Railway environment to the webhook
   signing secret from the Shopify admin (Settings > Notifications > Webhooks, or
   the app's webhook subscription). Until it is set, the webhook **fails closed**:
   every call returns 503 and nothing is granted.
2. **Register the webhook in Shopify** pointing at
   `POST https://progress.apcsexamprep.com/api/webhooks/shopify/orders`, topic
   `orders/paid` (recommended) or `orders/create`. Format JSON.
3. **Fill in the real SKUs** in `data/shopify-entitlements.js`. The keys there are
   placeholders (`CYBER-FULL`, `CYBER-U1`, ...); replace them with the exact
   variant SKU strings from the Shopify products. A SKU not in the map is ignored
   (the order still returns 200), so an unmapped product grants nothing.

## Webhook: `POST /api/webhooks/shopify/orders`

- Verifies `X-Shopify-Hmac-Sha256` with a constant-time compare over the raw
  request body before parsing. Mounted with a raw body parser ahead of
  `express.json` so the bytes are intact.
- Matches the order's `email` (or `customer.email`) to a teacher by email. The
  entitlement is keyed by that email, so a purchase made before the teacher
  registers still resolves: teacher registration backfills `teacher_id`, and
  reads match on email meanwhile.
- Maps each line item's `sku` through `data/shopify-entitlements.js` to a
  `{ course, unit }`. `unit: null` grants the whole course.
- Idempotent: the order id is stored in `external_ref` and deduped on a unique
  `(external_ref, course, unit)` index, so Shopify's at-least-once retries never
  double-grant. A replay returns `granted: 0`.
- Returns 200 on business no-ops (no email, unmapped SKUs) so Shopify marks the
  webhook delivered; only a bad signature (401), missing secret (503), or
  malformed JSON (400) is non-2xx.

## Reading entitlements

- **Teacher (own):** `GET /api/teacher/entitlements` — resolves by `teacher_id`
  or email, filters out expired rows, and returns both the raw rows and a
  `courses` rollup (`{ whole_course: bool, units: [...] }`).
- **Admin (all):** `GET /api/admin/entitlements?email=&course=&teacher_id=` and
  `POST /api/admin/entitlement { email, course, unit?, source? }` for a manual or
  comp grant. Granting is admin-only on purpose: a teacher self-granting a paid
  entitlement would bypass the paywall, so the roadmap's "teacher POST
  entitlement" lives behind `requireAdmin` here. The webhook is the automated
  path.

## The other two Command Center endpoints

- **Continue Teaching:** `GET /api/teacher/classes/:code/continue` returns the
  furthest lesson the class has reached and the next one, in the lesson order
  `course_manifest` defines (via `courseStructure`), plus `lessons_reached` /
  `total_lessons`.
- **N need help:** `GET /api/teacher/classes/:code/need-help` returns the students
  whose most recent scored activity is below the class `mastery_threshold`
  (read live, so a settings change re-evaluates with no migration). Deactivated
  students are excluded. One window-function pass, no N+1.

## Data model

`entitlements(id, email, teacher_id, course, unit, source, external_ref, active,
granted_at, expires_at)`. `unit` NULL means the whole course. `source` is
`shopify` | `manual` | `comp`. Additive migration; no existing data is touched,
and nothing enforces these rows yet.

## Conventions carried from CLAUDE.md

- Zero PII: only the purchaser email (already the teacher's login identity) is
  stored; no student data touches this table.
- No em-dashes in code, comments, or user-facing strings.
- Additive only: existing routes and access are unchanged.

# MASTER TODO

Single source of truth for tasks. Flat structure: append to INBOX, mark items
done in place. Tag items by area, e.g. (code).

## INBOX

- [ ] Confirm JWT_SECRET is set in the Railway production environment before merging PR #9, or the deploy from main will fail closed by design (code)
- [ ] Phase 5: questions table (qid, course, unit, lesson, ek, difficulty, type, stem, options, server-only correct, explanation, pool) with N-of-M pool selection, server-side order/option shuffle, and order_token; seed from the cyber quiz JSON first (code)
- [ ] Phase 2: flip scoring endpoints to grade server-side against the question bank and strip answer keys from page source / client JS (blocked on Phase 5) (code)
- [ ] Phase 3 cleanup: denominator inconsistency. CSV export and /classes/:code/progress compute totals from the COURSES config in utils.js, not course_manifest, so they can disagree with the gradebook. Move them onto the manifest (code)
- [ ] Phase 3: teacher threshold clamp is 0-100 in the routes vs the spec's 50-100 (code)
- [ ] Phase 4: entitlements table + POST /api/teacher/entitlement + Shopify order webhook (the "owns Unit N" flag); Continue Teaching endpoint (furthest-complete lesson); "N need help" endpoint (students below threshold on latest activity) (code)
- [ ] Phase 6: analytics endpoints (completion rate, avg score, avg time, abandonment, retry rate, per-question percent missed) as reads over attempts + score_events (code)
- [ ] Decide policy: DELETE /api/teacher/classes/:code and class delete still cascade away student progress/attempts/quiz history. Students are now soft-deactivated, but whole-class delete is still destructive (code)

## DONE

- [x] Audit the repo against the 6-phase build roadmap; write docs/roadmap-gap-report.md (code) — PR #9
- [x] Guardrail fix: student hard-delete changed to soft-deactivate (students.active column, additive migration, PATCH { active }, login block, active surfaced in roster/gradebook reads) (code) — PR #9
- [x] Security: JWT_SECRET fails closed in production when unset or the dev default; warns in dev (code) — PR #9

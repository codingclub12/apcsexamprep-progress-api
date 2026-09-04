'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: site assistant Phase 1, the knowledge base
//
//  The headline assertion is the one docs/site-assistant-review.md raised against
//  the v1 handoff: kb_fts is an EXTERNAL CONTENT fts5 table, sqlite does not
//  maintain it, and without triggers the index silently stops matching reality.
//  The failure mode is a search that returns fewer results, not an error anyone
//  sees, so it is asserted here in all three directions: insert, update and
//  delete, plus fts5's own integrity-check.
//
//  Second: DRAFTS ARE NOT PUBLIC. Half-written site mechanics are worse than
//  silence, so an unpublished article must be invisible to search and answer the
//  same 404 as one that does not exist, or slugs become guessable.
//
//  Third: the corpus contains site mechanics and nothing else. quiz_bank is
//  seeded here with sentinel text and the KB search is asked for it; finding
//  nothing is the point, because that separation is what makes retrieval safe to
//  run next to an assessment product.
//
//  Offline and secret-free. Zero PII. No em-dashes.
//  Run: npm run smoke:assistantkb
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-assistant-kb.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
const ADMIN_KEY = 'smoke-admin-key-0123456789abcdef';
process.env.ADMIN_KEY = ADMIN_KEY;

const express = require('express');
const db = require('../db');
const kb = require('../lib/assistant/kb');
const { seed } = require('../scripts/seed-kb');
const { CATEGORIES } = require('../lib/assistant/report');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(require('../routes/assistant'));
app.use('/api/admin', require('../routes/admin'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const get = (u, key) => fetch(base() + u, key === null ? {} : { headers: { 'x-admin-key': key || ADMIN_KEY } })
  .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const post = (u, b, key) => fetch(base() + u, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, key === null ? {} : { 'x-admin-key': key || ADMIN_KEY }),
  body: JSON.stringify(b || {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

const match = (q) => db.prepare(
  'SELECT a.slug FROM kb_fts f JOIN kb_articles a ON a.rowid = f.rowid WHERE kb_fts MATCH ?'
).all(q).map((r) => r.slug);

(async () => {
  // ── 1) THE V1 GAP: external-content fts5 needs triggers ───────────────────
  kb.save({ slug: 'trig-a', title: 'Gate behaviour', body_md: 'alphaword explains it', status: 'published' }, 't');
  kb.save({ slug: 'trig-b', title: 'PIN resets', body_md: 'rosterword explains it', status: 'published' }, 't');
  ok('insert is indexed', match('alphaword').includes('trig-a'), match('alphaword'));

  kb.save({ slug: 'trig-a', body_md: 'betaword replaced it' }, 't');
  ok('update REMOVES the old term from the index', match('alphaword').length === 0, match('alphaword'));
  ok('update adds the new term', match('betaword').includes('trig-a'), match('betaword'));

  kb.save({ slug: 'trig-a', title: 'Renamed gammaword heading' }, 't');
  ok('a title-only edit is indexed too', match('gammaword').includes('trig-a'), match('gammaword'));

  db.prepare("DELETE FROM kb_articles WHERE slug = 'trig-b'").run();
  ok('delete removes it from the index', match('rosterword').length === 0, match('rosterword'));

  let integrity = 'threw';
  try { db.prepare("INSERT INTO kb_fts(kb_fts) VALUES('integrity-check')").run(); integrity = 'ok'; }
  catch (e) { integrity = e.message; }
  ok('fts5 integrity-check passes', integrity === 'ok', integrity);
  ok('index row count matches the content table',
    db.prepare('SELECT COUNT(*) n FROM kb_fts').get().n === db.prepare('SELECT COUNT(*) n FROM kb_articles').get().n);

  // ── 2) Drafts are not public ──────────────────────────────────────────────
  kb.save({ slug: 'secret-draft', title: 'Unfinished answer', body_md: 'draftonlyword', status: 'draft' }, 't');
  ok('a draft is indexed but not searchable publicly', kb.search('draftonlyword').results.length === 0);
  ok('the module never returns a draft from published()', kb.published('secret-draft') === null);
  const draftHttp = await get('/api/assistant/help/secret-draft', null);
  const missingHttp = await get('/api/assistant/help/no-such-article-at-all', null);
  ok('a draft is 404 over HTTP', draftHttp.status === 404, draftHttp.status);
  ok('and answers identically to a nonexistent slug, so slugs are not guessable',
    JSON.stringify(draftHttp.body) === JSON.stringify(missingHttp.body), [draftHttp.body, missingHttp.body]);
  ok('publishing makes it searchable',
    (kb.save({ slug: 'secret-draft', status: 'published' }, 't'),
      kb.search('draftonlyword').results.length === 1));

  // ── 3) Versioning is append only ──────────────────────────────────────────
  const a = kb.get('trig-a');
  ok('edits bump the version', a.version >= 3, a.version);
  ok('each replaced version is kept', kb.versions(a.id).length === a.version - 1, kb.versions(a.id).length);
  const before = kb.versions(a.id).length;
  const rev = kb.revert(a.id, 1, 't');
  ok('revert restores the old body', /alphaword/.test(rev.article.body_md), rev.article.body_md.slice(0, 40));
  ok('revert is itself a save, so history grows rather than rewinds',
    rev.article.version === a.version + 1 && kb.versions(a.id).length === before + 1,
    { v: rev.article.version, hist: kb.versions(a.id).length });
  ok('and the index followed the revert', match('alphaword').includes('trig-a'), match('alphaword'));

  // ── 4) The corpus is site mechanics only ──────────────────────────────────
  db.prepare(`INSERT INTO quiz_bank (qid,course,unit,lesson,activity_type,q_order,prompt,options,correct_index,explanation,points,active)
              VALUES ('q1','ap-cybersecurity','unit-1','1.1','quiz',1,'SENTINEL_QUIZ_PROMPT','["SENTINEL_OPTION"]',0,'SENTINEL_EXPLANATION',1,1)`).run();
  ok('KB search cannot reach quiz_bank prompts', kb.search('SENTINEL_QUIZ_PROMPT').results.length === 0);
  ok('KB search cannot reach quiz_bank options', kb.search('SENTINEL_OPTION').results.length === 0);
  ok('KB search cannot reach quiz_bank explanations', kb.search('SENTINEL_EXPLANATION').results.length === 0);
  const httpSearch = await get('/api/assistant/help?q=SENTINEL_QUIZ_PROMPT', null);
  ok('nor over HTTP', httpSearch.status === 200 && httpSearch.body.results.length === 0, httpSearch.body);

  // ── 5) A person typing punctuation gets an answer, not a 500 ──────────────
  for (const q of ["NOT ' OR x", '"', 'AND OR NEAR(', '*', '', '   ']) {
    const r = await get('/api/assistant/help?q=' + encodeURIComponent(q), null);
    ok(`odd query ${JSON.stringify(q)} does not error`, r.status === 200, r.status);
  }

  // ── 6) Admin routes fail closed ───────────────────────────────────────────
  ok('no admin key is refused', (await get('/api/admin/kb', null)).status === 403);
  ok('a wrong admin key is refused', (await get('/api/admin/kb', 'wrong-key-but-long-enough-xxxx')).status === 403);
  ok('the right key lists articles', (await get('/api/admin/kb')).status === 200);
  // Seed a draft for this specifically: by now the only earlier draft has been
  // published, so asserting against leftovers would be asserting against luck.
  kb.save({ slug: 'admin-visible-draft', title: 'Draft the admin must see', body_md: 'x', status: 'draft' }, 't');
  const draftList = await get('/api/admin/kb?status=draft');
  ok('admin CAN see drafts',
    draftList.body.articles.some((x) => x.slug === 'admin-visible-draft'),
    draftList.body.articles.map((x) => x.slug));
  ok('and the public search still cannot',
    (await get('/api/assistant/help?q=' + encodeURIComponent('Draft the admin must see'), null))
      .body.results.every((r) => r.slug !== 'admin-visible-draft'));
  ok('writing needs the key too', (await post('/api/admin/kb', { title: 'x' }, null)).status === 403);

  // ── 7) Create and edit over HTTP ──────────────────────────────────────────
  const created = await post('/api/admin/kb', { title: 'Made over HTTP', body_md: 'httpword', status: 'published' });
  ok('admin can create', created.status === 200 && created.body.created === true, created.body);
  ok('a created article is searchable', kb.search('httpword').results.length === 1);
  const edited = await post('/api/admin/kb', { id: created.body.article.id, body_md: 'editedword' });
  ok('admin can edit, version bumps', edited.body.article.version === 2, edited.body.article.version);
  ok('the edit re-indexed', kb.search('editedword').results.length === 1 && kb.search('httpword').results.length === 0);
  ok('a title is required', (await post('/api/admin/kb', { body_md: 'no title' })).status === 400);

  // ── 8) The seed: stubs, not answers ───────────────────────────────────────
  const first = seed();
  ok('the seed creates one stub per category', first.created === CATEGORIES.length, first);
  const second = seed();
  ok('the seed is idempotent', second.created === 0 && second.kept === CATEGORIES.length, second);
  const stubs = kb.list({ status: 'draft' }).filter((x) => CATEGORIES.includes(x.category));
  ok('every stub is a draft', stubs.length === CATEGORIES.length, stubs.length);
  ok('so none of them is served publicly',
    stubs.every((s) => kb.published(s.slug) === null));
  ok('every escalation category has a stub',
    CATEGORIES.every((c) => stubs.some((s) => s.category === c)),
    CATEGORIES.filter((c) => !stubs.some((s) => s.category === c)));
  const oneStub = kb.get(stubs[0].slug);
  ok('a stub says it is unwritten rather than pretending to answer',
    /DRAFT|has not been written/i.test(oneStub.body_md), oneStub.body_md.slice(0, 60));

  // ── 9) The pages are served and clean ─────────────────────────────────────
  const help = await fetch(base() + '/help');
  const helpHtml = await help.text();
  ok('the help page is served', help.status === 200, help.status);
  ok('the help page is pure ASCII', !/[^\x00-\x7F]/.test(helpHtml));
  ok('the help page escapes article text before rendering markdown', /function esc\(/.test(helpHtml));

  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });

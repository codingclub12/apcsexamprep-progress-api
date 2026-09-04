'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: THE KNOWLEDGE BASE  (Phase 1)
//
//  Answers about how the site WORKS, written by a person, served without a
//  model. It lives in the database rather than in the repo for one reason: a
//  wrong answer must be correctable without a deploy.
//
//  THIS IS THE ASSISTANT'S ENTIRE RETRIEVAL CORPUS (spec layer 1). It holds
//  site mechanics and nothing else. No lesson bodies, no quiz text, no answer
//  keys, ever. That is what makes retrieval safe to run next to an assessment
//  product: the corpus cannot leak what it never contained.
//
//  This module touches only kb_* tables. Account and class state is read by
//  lib/assistant/reads.js and nowhere else; the two do not overlap.
//
//  DRAFTS ARE NOT PUBLIC. search() filters to status='published' in SQL rather
//  than in a caller, so an unfinished answer cannot be served by a caller that
//  forgot to check. Half-written site mechanics are worse than silence.
//
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const db = require('../../db');

const STATUSES = ['draft', 'published', 'archived'];
const AUDIENCES = ['all', 'teacher', 'student', 'anonymous'];

// Bounded, because this is authored content on a 1 GB box and an editor is a
// text box that a paste can fill.
const LIMITS = { title: 200, body: 20000, slug: 120, tags: 300, category: 60, course: 40 };

function clip(v, n) {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) : t;
}

function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, LIMITS.slug) || null;
}

const stBySlug = db.prepare(`
  SELECT id, slug, title, body_md, audience, category, course, tags, status, version, updated_at, updated_by
  FROM kb_articles WHERE slug = ?
`);
const stById = db.prepare(`
  SELECT id, slug, title, body_md, audience, category, course, tags, status, version, updated_at, updated_by
  FROM kb_articles WHERE id = ?
`);

function get(idOrSlug) {
  if (!idOrSlug) return null;
  return stById.get(idOrSlug) || stBySlug.get(String(idOrSlug).toLowerCase()) || null;
}

const stInsert = db.prepare(`
  INSERT INTO kb_articles (id, slug, title, body_md, audience, category, course, tags, status, version, updated_at, updated_by)
  VALUES (@id, @slug, @title, @body_md, @audience, @category, @course, @tags, @status, 1, datetime('now'), @who)
`);
const stUpdate = db.prepare(`
  UPDATE kb_articles
  SET title=@title, body_md=@body_md, audience=@audience, category=@category, course=@course,
      tags=@tags, status=@status, version=@version, updated_at=datetime('now'), updated_by=@who
  WHERE id=@id
`);
const stSnapshot = db.prepare(`
  INSERT INTO kb_article_versions (id, article_id, version, title, body_md, status, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Create or update, keeping the version being replaced. One transaction so a
// snapshot can never exist without the write that caused it, or the reverse.
const saveTxn = db.transaction((patch, who) => {
  const existing = patch.id ? stById.get(patch.id) : (patch.slug ? stBySlug.get(patch.slug) : null);

  const status = STATUSES.includes(patch.status) ? patch.status : (existing ? existing.status : 'draft');
  const audience = AUDIENCES.includes(patch.audience) ? patch.audience : (existing ? existing.audience : 'all');
  const title = clip(patch.title, LIMITS.title) || (existing ? existing.title : null);
  const body = patch.body_md !== undefined
    ? (clip(patch.body_md, LIMITS.body) || '')
    : (existing ? existing.body_md : '');

  if (!title) return { error: 'title is required' };

  if (!existing) {
    const slug = clip(patch.slug, LIMITS.slug) ? slugify(patch.slug) : slugify(title);
    if (!slug) return { error: 'could not derive a slug' };
    if (stBySlug.get(slug)) return { error: `slug already in use: ${slug}` };
    const id = 'kb_' + crypto.randomBytes(9).toString('hex');
    stInsert.run({
      id, slug, title, body_md: body, audience,
      category: clip(patch.category, LIMITS.category),
      course: clip(patch.course, LIMITS.course),
      tags: clip(patch.tags, LIMITS.tags),
      status, who: who || null,
    });
    return { article: stById.get(id), created: true };
  }

  // Snapshot what is being replaced BEFORE overwriting it.
  stSnapshot.run(
    'kbv_' + crypto.randomBytes(9).toString('hex'),
    existing.id, existing.version, existing.title, existing.body_md, existing.status, who || null
  );
  stUpdate.run({
    id: existing.id, title, body_md: body, audience,
    category: patch.category !== undefined ? clip(patch.category, LIMITS.category) : existing.category,
    course: patch.course !== undefined ? clip(patch.course, LIMITS.course) : existing.course,
    tags: patch.tags !== undefined ? clip(patch.tags, LIMITS.tags) : existing.tags,
    status, version: existing.version + 1, who: who || null,
  });
  return { article: stById.get(existing.id), created: false };
});

function save(patch, who) {
  try { return saveTxn(patch || {}, who); }
  catch (e) { return { error: e.message }; }
}

const stVersions = db.prepare(`
  SELECT version, title, status, created_at, created_by
  FROM kb_article_versions WHERE article_id = ? ORDER BY version DESC
`);
const stVersionBody = db.prepare(
  'SELECT title, body_md, status FROM kb_article_versions WHERE article_id = ? AND version = ?'
);

function versions(id) { return id ? stVersions.all(id) : []; }

// Revert is a normal save of an old body, so it snapshots too. The history is
// append only and reverting is never destructive.
function revert(id, version, who) {
  const old = stVersionBody.get(id, Number(version));
  if (!old) return { error: 'no such version' };
  return save({ id, title: old.title, body_md: old.body_md }, who);
}

// Admin listing. Sees every status, which is the point.
function list(opts = {}) {
  const where = [];
  const args = [];
  if (opts.status && STATUSES.includes(opts.status)) { where.push('status = ?'); args.push(opts.status); }
  if (opts.category) { where.push('category = ?'); args.push(String(opts.category)); }
  const sql = `
    SELECT id, slug, title, audience, category, course, tags, status, version, updated_at, updated_by,
           LENGTH(body_md) AS body_length
    FROM kb_articles
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY status, category, title
  `;
  return db.prepare(sql).all(...args);
}

// ── search ───────────────────────────────────────────────────────────────────
// Published only, filtered in SQL. A caller cannot forget to exclude drafts
// because there is no code path here that returns one.
//
// The query is passed to fts5 as a quoted phrase rather than raw, so a person
// typing an apostrophe or a bare NOT does not get a syntax error where they
// expected an answer.
const stSearch = db.prepare(`
  SELECT a.id, a.slug, a.title, a.category, a.course, a.audience,
         snippet(kb_fts, 1, '[', ']', ' ... ', 18) AS excerpt
  FROM kb_fts f
  JOIN kb_articles a ON a.rowid = f.rowid
  WHERE kb_fts MATCH ? AND a.status = 'published'
  ORDER BY rank
  LIMIT ?
`);
const stBrowse = db.prepare(`
  SELECT id, slug, title, category, course, audience
  FROM kb_articles WHERE status = 'published'
  ORDER BY category, title LIMIT ?
`);

function ftsQuery(raw) {
  // Keep word characters, drop everything fts5 would read as an operator, then
  // quote each term. An empty result means "browse" rather than an error.
  const terms = String(raw || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  if (!terms.length) return null;
  return terms.slice(0, 8).map((t) => `"${t}"*`).join(' OR ');
}

function search(q, opts = {}) {
  const limit = Math.min(Number(opts.limit) || 10, 25);
  const query = ftsQuery(q);
  if (!query) return { query: null, results: stBrowse.all(limit) };
  let rows;
  try { rows = stSearch.all(query, limit); }
  catch (e) { return { query, results: [], error: 'search failed' }; }
  // Audience is a display hint, not a gate: everything published is public.
  // Nothing here is account state, so there is nothing to withhold.
  if (opts.audience && AUDIENCES.includes(opts.audience)) {
    rows = rows.filter((r) => r.audience === 'all' || r.audience === opts.audience);
  }
  return { query, results: rows };
}

// One published article, for the help page.
function published(slug) {
  const a = get(slug);
  return a && a.status === 'published' ? a : null;
}

module.exports = { STATUSES, AUDIENCES, LIMITS, slugify, get, save, list, search, published, versions, revert, ftsQuery };

'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a leaderboard name can never carry markup, in or out.
//
//  WHY THIS EXISTS
//  The leaderboard row builder on 29 AP CSP game pages writes remote data into
//  .innerHTML through an esc() that was collapsed into a no-op, so the page's
//  own escaping is worth nothing. Repairing those pages is board 383 and it is
//  29 Matrixify imports. This suite pins the other half: the server must not
//  hand a page markup in the first place, so a page that is still broken, or a
//  page a future generator clones the broken component onto, has nothing to
//  render.
//
//  Three properties, and the second is the one that is easy to forget:
//
//   1. WRITE SIDE. A hostile name submitted for anonymous play is cleaned
//      before it is stored. The 16 character cap is not a defense and this
//      suite says so out loud: '<svg onload=x()>' is exactly 16 characters.
//
//   2. READ SIDE. Rows written BEFORE the write-side fix are still in the
//      table. A backfill is a migration and is not this change's to make, so
//      the read path has to neutralize them. Section 2 puts a poisoned row in
//      by hand, exactly as a pre-fix submission would have, and asks the API
//      what it serves.
//
//   3. VALUE. A non-numeric value never reaches the second unescaped sink,
//      fmt(), which returns its input on both branches of its ternary.
//
//  Section 4 is the one that ties the server to the actual page: it runs the
//  BROKEN row builder, byte for byte as it is live today, over what this API
//  now returns, and asserts that nothing executable reaches the document. That
//  is the claim that matters, and it is different from "the server strips <".
//
//  Zero PII: synthetic anonymous play names only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:gamename
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-game-name.db');
process.env.JWT_SECRET = 'smoke-game-name-secret-long-enough';
process.env.IP_HASH_SALT = 'smoke-game-name-salt';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const GAME = 'two-sides';       // a real registry id, 0..10000, higher is better
const hasMarkup = (s) => /[<>]/.test(String(s));

(async () => {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/game', require('../routes/game'));
  const server = app.listen(0);
  const PORT = server.address().port;

  const post = async (body) => {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/game/score`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  };
  const board = async (window = 'all') => {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/game/leaderboard?game=${GAME}&window=${window}&limit=50`);
    let j = null; try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  };
  const storedNames = () => db.prepare('SELECT name FROM game_scores').all().map((r) => r.name);

  // ── 1. WRITE SIDE ──────────────────────────────────────────────────────────
  section('1. a hostile name is cleaned before it is stored');

  // Exactly 16 characters, so the cap lets it through untouched. This is the
  // payload that made the cap look like a defense.
  const ONE_SHOT = '<svg onload=x()>';
  ok('1.0 the sample payload really is within the cap, so the cap is not the guard',
    ONE_SHOT.length === 16);

  await post({ game: GAME, value: 10, name: ONE_SHOT });
  ok('1.1 a self-contained 16 character payload is not stored as markup',
    !storedNames().some(hasMarkup), storedNames());

  // Split across two rows. The row markup between them lands inside the
  // attribute the first half opened, so each half is harmless alone and the
  // pair is not. Scores chosen so they sort adjacent.
  await post({ game: GAME, value: 21, name: '<svg onload="/*' });
  await post({ game: GAME, value: 20, name: '*/alert(1)">' });
  ok('1.2 neither half of a split payload is stored as markup',
    !storedNames().some(hasMarkup), storedNames());

  const onlyMarkup = await post({ game: GAME, value: 30, name: '<<<>>>' });
  ok('1.3 a name that is nothing but markup is refused, not stored empty',
    onlyMarkup.status === 400, onlyMarkup);

  const legit = await post({ game: GAME, value: 40, name: 'Ada L' });
  ok('1.4 an ordinary name still works', legit.status === 200, legit);
  ok('1.5 and is stored unchanged', storedNames().includes('Ada L'), storedNames());

  ok('1.6 nothing in the table carries a tag character at all',
    !storedNames().some(hasMarkup), storedNames());

  // ── 2. READ SIDE ───────────────────────────────────────────────────────────
  section('2. a row poisoned BEFORE the fix is neutralized on the way out');

  // Written straight to the table, which is what a pre-fix submission did.
  db.prepare(`INSERT INTO game_scores (game, metric, value, student_id, name, ip_hash, ua)
              VALUES (?, 'score', ?, NULL, ?, 'smoke', NULL)`)
    .run(GAME, 9000, '<img src=x onerror=alert(1)>');
  ok('2.0 the poisoned row really is in the table, so section 2 is testing something',
    storedNames().some(hasMarkup), storedNames());

  const b2 = await board();
  const served = (b2.body.entries || []).map((e) => e.name);
  ok('2.1 the leaderboard serves no tag character', !served.some(hasMarkup), served);
  ok('2.2 the poisoned row is still ranked, it was cleaned and not dropped',
    (b2.body.entries || []).some((e) => e.value === 9000), b2.body.entries);
  ok('2.3 the clean names are untouched',
    served.includes('Ada L'), served);

  // ── 3. VALUE ───────────────────────────────────────────────────────────────
  section('3. a non-numeric value never reaches fmt()');

  const before = storedNames().length;
  const badVals = ['<img src=x>', 'NaN', {}, [], true, null];
  const statuses = [];
  for (const v of badVals) statuses.push((await post({ game: GAME, value: v, name: 'Probe' })).status);
  ok('3.1 every non-numeric value is refused with a 400',
    statuses.every((s) => s === 400), statuses);
  ok('3.2 and none of them was stored', storedNames().length === before, storedNames().length);

  const b3a = await board();
  ok('3.3 every value the leaderboard serves is a finite number',
    (b3a.body.entries || []).every((e) => typeof e.value === 'number' && Number.isFinite(e.value)),
    (b3a.body.entries || []).map((e) => e.value));

  // SQLite's REAL affinity does not REJECT text, it stores what it cannot
  // convert. So 'value REAL NOT NULL' will hold a string, and MAX() sorts text
  // above every number, which puts such a row at rank 1. POST /score can no
  // longer create one. The column can still hold one, and that is what makes
  // the read-side Number() load bearing rather than decoration.
  db.prepare(`INSERT INTO game_scores (game, metric, value, student_id, name, ip_hash, ua)
              VALUES (?, 'score', ?, NULL, 'TextVal', 'smoke', NULL)`)
    .run(GAME, '<img src=x onerror=alert(1)>');
  const ty = db.prepare("SELECT typeof(value) ty FROM game_scores WHERE name = 'TextVal'").get().ty;
  ok('3.4 the REAL column really did accept text, so 3.5 is testing something', ty === 'text', ty);

  const b3 = await board();
  const vals = (b3.body.entries || []).map((e) => e.value);
  ok('3.5 no value the leaderboard serves is a string',
    !vals.some((v) => typeof v === 'string'), vals);
  ok('3.6 and none of them carries a tag character',
    !vals.some((v) => hasMarkup(v)), vals);

  // ── 4. THE BROKEN PAGE, FED BY THIS API ────────────────────────────────────
  section('4. the row builder that is live today, over what this API now returns');

  // esc() and fmt() copied from a live ap-csp-game-* body. Both are no-ops:
  // esc maps every character to itself, fmt returns v on both branches. They
  // are reproduced here on purpose. If the server is the only thing standing
  // between remote data and .innerHTML, this is what it is standing in front of.
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&', '<': '<', '>': '>', '"': '"' }[c]));
  const fmt = (v) => ((typeof v === 'number' && isFinite(v)) ? v : v);
  const buildRows = (entries) => entries.map((e, i) => {
    const rk = e.rank || i + 1;
    return '<div class="lb-row' + (rk === 1 ? ' top1' : '') + '"><div class="rk">' + rk + '</div>'
         + '<div class="nm">' + esc(e.name || 'anon') + '</div><div class="vl">' + fmt(e.value) + '</div></div>';
  }).join('');

  const html = buildRows(b3.body.entries || []);
  ok('4.0 the copied esc() really is a no-op, so section 4 is not testing a fixed page',
    esc('<b>') === '<b>');
  // Every tag in the output must be one the builder itself wrote.
  const tags = [...html.matchAll(/<\/?([a-z][a-z0-9]*)/gi)].map((m) => m[1].toLowerCase());
  ok('4.1 the only elements in the rendered rows are the div the builder writes',
    tags.every((t) => t === 'div'), [...new Set(tags)]);
  // Only text INSIDE a tag can be an attribute. Stripping < and > turns a
  // poisoned name into inert text that may still read 'onerror=', and matching
  // that anywhere in the string reports a defect that is not there. Scan the
  // tags themselves, which is the only place an attribute can live.
  const tagBodies = [...html.matchAll(/<[^>]*>/g)].map((m) => m[0]);
  ok('4.2 no tag in the document carries an event handler attribute',
    !tagBodies.some((t) => /\son[a-z]+\s*=/i.test(t)), tagBodies.filter((t) => /\son[a-z]+\s*=/i.test(t)));
  ok('4.2b every tag is one of the builder\'s own, carrying only a class',
    tagBodies.every((t) => /^<\/?div(\s+class="[^"<>]*")?>$/.test(t)),
    tagBodies.filter((t) => !/^<\/?div(\s+class="[^"<>]*")?>$/.test(t)));
  ok('4.3 no script, svg, img or iframe reached the document',
    !/<\s*(script|svg|img|iframe|object|embed)\b/i.test(html), html.slice(0, 200));
  ok('4.4 the row count is what the board returned, nothing was swallowed',
    (html.match(/class="lb-row/g) || []).length === (b3.body.entries || []).length);

  server.close();
  db.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

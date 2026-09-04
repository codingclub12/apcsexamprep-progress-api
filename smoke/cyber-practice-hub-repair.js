'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE ONE MISSING EDGE, AND THE STALE SHEET THAT WOULD HAVE COST MORE THAN IT
//  FIXED.
//
//  scripts/verify-cyber-practice-live.js reports 34 of 35 live checks passing:
//  ap-cybersecurity-practice links none of its five unit spokes. The row that
//  would fix it already exists in imports/2026-09-04/, so the reflex is to
//  re-import that file, and the whole point of this suite is that doing so
//  would DELETE a Question of the Day block the live page has gained since.
//
//  Every check below is derived from the live body and the two sheets rather
//  than from a description of them.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const gen = require('../tools/ap-cyber-ced/generate-practice-hub-repair.js');
const linkBlock = require('../lib/link-block.js');
const { parseCsv } = require('../tools/ap-cyber-ced/sheet-csv');
const spec = require('../lib/cyber-practice-spec');

const ROOT = path.join(__dirname, '..');
const FIXTURES = path.join(__dirname, 'fixtures', 'live-bodies');
const HANDLE = spec.umbrella().handle;

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

const live = fs.readFileSync(path.join(FIXTURES, `${HANDLE}.html`), 'utf8');
const built = gen.generate({ bodies: FIXTURES });
const body = built.body;
const sheet = parseCsv(built.csv).rows[0];

const staleFile = path.join(ROOT, 'imports', '2026-09-04', 'cyber-practice-hub-links-pages.csv');
const staleRow = parseCsv(fs.readFileSync(staleFile, 'utf8')).rows
  .find((r) => r.Handle === HANDLE);

console.log('\ncyber practice hub, the missing spoke edge\n');

// ── the edge itself ─────────────────────────────────────────────────────────
const spokes = spec.spokes();
ok('the spec still names five unit spokes', spokes.length === 5, spokes.length);
ok('the live body links none of them, which is the defect',
  spokes.every((s) => !live.includes(s.handle)),
  spokes.filter((s) => live.includes(s.handle)).map((s) => s.handle).join(', '));
ok('the new body links all five',
  spokes.every((s) => body.includes(`/pages/${s.handle}`)),
  spokes.filter((s) => !body.includes(`/pages/${s.handle}`)).map((s) => s.handle).join(', '));
ok('each link is labelled with its unit name, not with a bare handle',
  spokes.every((s) => body.includes(`Unit ${s.unit_no} practice: ${s.unit_name}`)));

// ── nothing on the live page is lost ────────────────────────────────────────
//  A MERGE republishes the whole Body HTML, so this is the check that matters
//  most and the one the stale sheet fails.
ok('every section the live page carries is still in the new body',
  gen.CARRIED.every((c) => !live.includes(c.marker) || body.includes(c.marker)),
  gen.CARRIED.filter((c) => live.includes(c.marker) && !body.includes(c.marker))
    .map((c) => c.what).join(', '));
ok('and the live body survives as a contiguous prefix, so the block only adds',
  body.startsWith(live.slice(0, 4400)));

// ── the stale sheet, measured rather than described ─────────────────────────
const QOTD = 'data-practice-kind="daily"';
ok('the Question of the Day block is on the live page', live.includes(QOTD));
ok('THE FINDING: the sheet already in imports/2026-09-04 does NOT carry it',
  staleRow && !staleRow['Body HTML'].includes(QOTD));
ok('so re-importing that sheet would delete it, and this one does not',
  body.includes(QOTD));
ok('the stale row is smaller than the live body plus a link block, which is the tell',
  staleRow['Body HTML'].length < body.length,
  `stale ${staleRow['Body HTML'].length}, new ${body.length}`);

// ── the sheet ───────────────────────────────────────────────────────────────
ok('one row, so a MERGE touches one page', parseCsv(built.csv).rows.length === 1);
ok('it targets the practice hub', sheet.Handle === HANDLE, sheet.Handle);
ok('the command is MERGE', sheet.Command === 'MERGE', sheet.Command);
ok('the sheet carries Body HTML only, so no other column is blanked',
  gen.HEADER.join(',') === 'Handle,Command,Body HTML', gen.HEADER.join(','));
ok('the Body HTML cell is not empty, which under MERGE erases the page',
  sheet['Body HTML'].length > 10000, sheet['Body HTML'].length);
ok('the sheet round-trips through CSV with no drift',
  sheet['Body HTML'] === body);

// ── content rules on what this pass authored ────────────────────────────────
//  Only the inserted block. The hub's own prose is not ours and a MERGE ships
//  it either way; judging it would refuse the row over content it does not
//  touch, which is the mistake the reverse-edge pass already made once.
const authored = body.slice(live.length - 1) + (body.match(/\/\* apcs-related-links \*\/[\s\S]*?\}\s*\n/) || [''])[0];
const rules = require('../tools/ap-cyber-ced/validator.js');
ok('the authored block carries no em-dash, no EK code and no mojibake',
  rules.ruleEmDash(authored, 'body').length === 0
  && rules.ruleEkCodes(authored).length === 0
  && rules.ruleMojibake(authored, 'body').length === 0,
  `R3=${rules.ruleEmDash(authored, 'body').length} R1=${rules.ruleEkCodes(authored).length}`
  + ` R7=${rules.ruleMojibake(authored, 'body').length}`);

// ── mutations ───────────────────────────────────────────────────────────────
//  Each puts the generator into a state that would ship a worse page, and the
//  generator has to refuse. A guard that is never proven red is decoration.
console.log();
//  1. THE ONE THAT MATTERS: a body that has lost the QOTD block must refuse.
{
  //  Removing a marker from the INPUT leaves the guard nothing to protect, so it
  //  correctly stays quiet. The mutation that matters is the other direction: a
  //  build that drops from the OUTPUT something the live page had.
  ok('MUTATION: dropping the carried marker from the output is refused',
    (() => {
      const orig = gen.CARRIED[0].marker;
      try {
        gen.CARRIED[0].marker = 'ph-card-title';   // present on live, and the
        //  mutated build below strips it, so the guard must catch the loss.
        const realBuild = linkBlock.build;
        linkBlock.build = (b, l, r, o) => {
          const out = realBuild(b, l, r, o);
          return { ...out, body: out.body.split('ph-card-title').join('ph-card-gone') };
        };
        try { gen.buildBody(live); return false; }
        catch (e) { return /would delete/.test(e.message); }
        finally { linkBlock.build = realBuild; }
      } finally { gen.CARRIED[0].marker = orig; }
    })());
}

//  2. An empty stored body must never become an empty Body HTML cell.
{
  let msg = '';
  try { gen.buildBody('   '); } catch (e) { msg = e.message; }
  ok('MUTATION: an empty stored body is refused', /empty/.test(msg), msg);
}

//  3. A body that already carries all five links is a no-op, and a no-op sheet
//     that reads as a fix is worse than no sheet.
{
  let msg = '';
  try { gen.buildBody(body); } catch (e) { msg = e.message; }
  //  The refusal arrives from link-block rather than from this module's own
  //  no-op branch, because build() notices the body did not grow first. Either
  //  is the property under test: a second application must not produce a sheet.
  ok('MUTATION: a body that already has the links is refused as a no-op',
    /no-op|already carries|did not grow/.test(msg), msg);
}

//  4. The spoke count is derived from the spec, not typed. Fewer spokes must
//     refuse rather than quietly ship a partial edge.
{
  const real = spec.spokes;
  let msg = '';
  try {
    spec.spokes = () => real().slice(0, 3);
    gen.buildBody(live);
  } catch (e) { msg = e.message; } finally { spec.spokes = real; }
  ok('MUTATION: a spec with three spokes instead of five is refused',
    /expected to add 5/.test(msg), msg);
}

//  5. A missing body file refuses instead of writing a blank cell.
{
  let msg = '';
  try { gen.generate({ bodies: path.join(FIXTURES, 'nope') }); } catch (e) { msg = e.message; }
  ok('MUTATION: a missing stored body is refused, never an empty cell',
    /no stored body/.test(msg), msg);
}

console.log();
if (fails.length) {
  console.log(`FAIL - ${fails.length} of ${pass + fails.length} checks`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK - ${pass} checks, 5 mutations, every one caught by the rule that claims it`);

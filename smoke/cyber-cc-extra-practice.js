'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: the cyber Command Center pacing strip.
//
//  Six lines become four. The whole risk in an edit this small is that the
//  pattern stops matching and the program reports a clean run having changed
//  nothing, so section 1 is the one that matters: the strip is matched
//  verbatim against the LIVE body, and a body without it is refused loudly.
//
//  Section 3 is the other half. The day values are removed from the DISPLAY and
//  must stay in the DATA, because unitDays() sums them into every unit's day
//  span and the running day numbers down the page are built from that. Deleting
//  them would silently move 37 days of pacing a teacher may already be planning
//  against.
//
//  Run: npm run smoke:ccpacing
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const m = require('../scripts/cyber-cc-extra-practice');

let pass = 0; let fail = 0;
const ok = (n, c, x) => {
  if (c) { pass += 1; console.log('  [PASS] ' + n); }
  else { fail += 1; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const LIVE = fs.readFileSync(path.join(__dirname, 'fixtures', 'cyber-command-center-body.html'), 'utf8');
const run = (b) => m.repair(b, { checkLive: false });

console.log('\n1. THE STRIP IS MATCHED VERBATIM, OR NOTHING HAPPENS');
{
  ok('the live body contains the strip exactly once', LIVE.split(m.BEFORE).length - 1 === 1);
  const r = run(LIVE);
  ok('nothing is refused', r.problems.length === 0, r.problems);
  ok('and it actually changed the body', r.changed);

  //  A body without the strip must REFUSE, not report a clean no-op. This is
  //  the failure that would look like success on every future run.
  const edited = LIVE.replace('Days set aside in this unit', 'Days planned for this unit');
  const r2 = run(edited);
  ok('a body whose strip has been edited elsewhere is refused',
    r2.problems.some((p) => /not found verbatim/.test(p)), r2.problems);

  const twice = LIVE.replace(m.BEFORE, m.BEFORE + '\n' + m.BEFORE);
  ok('two strips are refused', run(twice).problems.some((p) => /appears 2 times/.test(p)));
}

console.log('\n2. WHAT THE STRIP SAYS AFTERWARDS');
{
  const { after } = run(LIVE);
  ok('the day budget label is gone', !/Days set aside/.test(after));
  ok('it reads "Extra practice"', after.includes('<span class="wplbl">Extra practice</span>'));
  ok('free response is marked as growing', after.includes('Free response (adding more)'));
  //  The destination heads itself "AP Cybersecurity Terminal Labs", so the link
  //  says where it goes rather than what it used to be called.
  ok('the labs link says Terminal labs, which is what the target calls itself',
    after.includes('Terminal labs (adding more)') && !after.includes('Lab / project'));
  ok('the review and unit test row is gone entirely', !/Review & unit test/.test(after));
  ok('no day count is rendered any more',
    ['frqDays', 'labDays', 'testDays'].every((f) => !after.includes("+(u." + f + "||0)+'d")));
  //  Two separators for three items, one for two.
  const seps = (after.match(m.BEFORE) ? 0 : (after.split('<span class="wpsep">|</span>').length - 1));
  ok('one separator remains, for the two items that remain', seps === 1, seps);
  //  Only the two emoji already on the page survive. A new codepoint here is a
  //  change nobody asked for, in a script block that has to stay clean.
  const newEmoji = [...m.AFTER].filter((c) => c.codePointAt(0) > 0x2000 && !m.BEFORE.includes(c));
  ok('no emoji is introduced that was not already there', newEmoji.length === 0, newEmoji);
}

console.log('\n3. THE DAY VALUES LEAVE THE DISPLAY AND STAY IN THE ARITHMETIC');
{
  const { after } = run(LIVE);
  ok('unitDays() survives', /function unitDays/.test(after));
  for (const f of ['frqDays', 'labDays', 'testDays']) {
    ok('  ' + f + ' still feeds unitDays()', after.includes('u.' + f));
  }
  //  If a future edit drops the data as well as the display, every day number
  //  on the page moves. That has to be a refusal, not a surprise.
  const stripped = run(LIVE).after.replace(/\(u\.frqDays\|\|0\)/g, '(0)');
  ok('removing the data from unitDays() is refused',
    m.repair(stripped.replace(m.AFTER, m.BEFORE), { checkLive: false })
      .problems.some((p) => /no longer feeds unitDays/.test(p)));
}

console.log('\n4. THE EDIT TOUCHES NOTHING ELSE');
{
  const { after } = run(LIVE);
  const blank = (s) => s.replace(m.BEFORE, '<<STRIP>>').replace(m.AFTER, '<<STRIP>>');
  ok('every byte outside the strip is identical', blank(LIVE) === blank(after));
  ok('and the body got smaller, not larger', after.length < LIVE.length);
}

console.log('\n5. THE SHEET');
{
  const { after } = run(LIVE);
  const csv = m.sheet(m.HANDLE, after);
  ok('utf-8 BOM', csv.charCodeAt(0) === 0xfeff);
  ok('one row, three columns', /^"Handle","Command","Body HTML"$/.test(csv.split('\r\n')[0].replace(/^﻿/, '')));
  ok('MERGE', csv.includes('"cyber-command-center","MERGE","'));
  //  No Published At column at all: this is a body edit and writing a time here
  //  would republish the page.
  ok('no Published At column', !csv.includes('Published At'));
  ok('records end CRLF and no bare CR exists', csv.endsWith('\r\n') && !/\r(?!\n)/.test(csv));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);

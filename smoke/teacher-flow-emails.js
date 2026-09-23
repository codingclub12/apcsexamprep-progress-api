'use strict';
//  Offline checks for scripts/build-teacher-flow-emails.js. Each refusal is
//  broken on purpose, alone, and must fire for its own reason. The committed
//  emails must be exactly what the builder produces now. No em-dashes.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const b = require('../scripts/build-teacher-flow-emails');

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

const good = b.EMAILS.map((e) => b.shell(e.body));
good.forEach((html, i) => ok(b.checkEmail(i + 1, html).length === 0, 'email ' + (i + 1) + ' passes: ' + b.checkEmail(i + 1, html)));

const base = good[0];
const cases = [
  ['non-ASCII', base.replace('Tanner</p>', 'Tanner' + String.fromCharCode(0xa0) + '</p>'), 1],
  ['em-dash', base.replace('Tanner</p>', 'Tanner &mdash;</p>'), 1],
  ['dollar sign', base.replace('Tanner</p>', 'Tanner, 5 dollars or $5</p>'), 1],
  ['unsubscribe', base.replace('{% unsubscribe %}', ''), 1],
  ['no link to the site', base.split('https://www.apcsexamprep.com/').join('https://example.com/'), 1],
];
for (const [rule, broken, want] of cases) {
  ok(broken !== base, rule + ': injection did not land');
  const got = b.checkEmail(1, broken);
  ok(got.length === want, rule + ': expected ' + want + ' refusal, got ' + JSON.stringify(got));
  ok(got[0].indexOf(rule) !== -1, rule + ': refused for the wrong reason: ' + got[0]);
}

//  Four emails, four distinct flow template ids, send order 1..4.
ok(new Set(b.EMAILS.map((e) => e.template)).size === 4, 'four distinct template ids');
ok(b.EMAILS.map((e) => e.n).join() === '1,2,3,4', 'send order');

for (const e of b.EMAILS) {
  const f = path.join(__dirname, '..', 'klaviyo', 'teacher-flow', 'email-' + e.n + '.html');
  ok(fs.existsSync(f) && fs.readFileSync(f, 'utf8') === b.shell(e.body), 'klaviyo/teacher-flow/email-' + e.n + '.html matches the builder');
}
console.log('smoke:teacherflow ' + n + ' checks passed');

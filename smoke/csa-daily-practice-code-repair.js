'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: the mangled code blocks on the CSA daily-practice articles.
//
//  25 of 429 articles serve a class attribute where the first line of a Java
//  program should be. The repair is a deletion, so the whole risk is that it
//  deletes a character it should not have and nobody notices, because a body
//  with one bound changed still renders perfectly and now teaches a wrong
//  answer.
//
//  Section 4 is the one that would catch that, and it is the reason this suite
//  is worth more than its line count: it runs each recovered program and
//  requires the output to be the option the article marks correct. The answer
//  key is on the far side of the page from the code block and the repair never
//  touches it, so the two agreeing is evidence rather than a restatement.
//
//  Fixtures are the 25 live bodies in full, plus two controls: the hyphenated
//  twin (same template, clean, and a DIFFERENT question, which is why its body
//  is a reference for the convention and never for the code) and a clean
//  article from the mangled family itself.
//
//  Run: npm run smoke:dpcode
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const m = require('../scripts/csa-daily-practice-code-repair');
const T = require('../scripts/mini-java-trace');

let pass = 0; let fail = 0;
const ok = (n, c, x) => {
  if (c) { pass += 1; console.log('  [PASS] ' + n); }
  else { fail += 1; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const DIR = path.join(__dirname, 'fixtures', 'csa-daily-practice-code');
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const names = fs.readdirSync(DIR).filter((f) => f.endsWith('.html'));
const MANGLED = names.filter((f) => !f.startsWith('CONTROL-'));
const CONTROLS = names.filter((f) => f.startsWith('CONTROL-'));
const articles = MANGLED.map((f) => ({ handle: f.replace(/\.html$/, ''), body: read(f) }));

console.log('\n1. THE DEFECT, READ OFF THE LIVE PAGE');
{
  ok('25 articles are in the fixture set', articles.length === 25, articles.length);
  const total = articles.reduce((a, x) => a + [...x.body.matchAll(m.MANGLE)].length, 0);
  ok('200 mangled spans across them', total === 200, total);
  ok('every one is in the unit2-cycle2 family',
    articles.every((a) => a.handle.startsWith('unit2-cycle2-')));

  //  The exact bytes, so a future reader does not have to trust the prose.
  const one = '<span class="&lt;span">"apcs-keyword"</span>&gt;int total = ';
  ok('day 10 serves the documented shape verbatim', articles
    .find((a) => a.handle === 'unit2-cycle2-day-10-iteration-accumulation').body.includes(one));

  //  Strip tags first, decode second. Reversed, the escaped "&lt;span" becomes a
  //  tag and gets deleted, and the defect vanishes from the very check meant to
  //  see it.
  ok('visible() shows the reader what the reader sees',
    m.visible('<span class="&lt;span">"apcs-keyword"</span>&gt;int x;') === '"apcs-keyword">int x;');
  //  This one and not the line above is what pins the ORDER, and getting here
  //  took two wrong tests. Reversed, visible() on a mangled span lands on the
  //  same answer, and so does an escaped tag written &lt;b&gt;, because nothing
  //  becomes a REAL tag until a literal > is already present. The damage in the
  //  actual bodies comes from the escaped less-than inside the Java: decode
  //  "i &lt;= 4" first and the "<=" swallows every character up to the next real
  //  closing bracket, which is most of the rest of the article.
  ok('visible() strips a real tag before it decodes an escaped one',
    m.visible('a &lt;= 4 <b>c</b>') === 'a <= 4 c');
}

console.log('\n1b. THE TWO SUBSTITUTIONS, ONE AT A TIME');
{
  //  Asserted on a hand-written block rather than on a fixture, and before
  //  build() runs, so these still speak when the repair refuses everything.
  ok('the mangle pattern consumes the stranded angle bracket',
    m.repairBlock('<pre><code><span class="&lt;span">"apcs-keyword"</span>&gt;int x;</code></pre>')
      === '<pre><code>int x;</code></pre>');
  ok('a well-formed highlight span is unwrapped, text kept and tags dropped',
    m.repairBlock('<pre><code>System.<span class="apcs-function">out</span>.x</code></pre>')
      === '<pre><code>System.out.x</code></pre>');
  ok('an escaped less-than that is part of the Java is left alone',
    m.repairBlock('<pre><code>for (int i = 1; i &lt;= 4; i++)</code></pre>')
      === '<pre><code>for (int i = 1; i &lt;= 4; i++)</code></pre>');
  ok('a span that is not the highlighter is left alone',
    m.repairBlock('<pre><code><span class="other">x</span></code></pre>')
      === '<pre><code><span class="other">x</span></code></pre>');
}

console.log('\n2. THE REPAIR IS A DELETION AND ONLY A DELETION');
{
  const { rows, problems } = m.build(articles);
  ok('nothing is refused', problems.length === 0, problems.slice(0, 3));
  ok('all 25 produce a row', rows.length === 25, rows.length);

  //  Over every ARTICLE, not over the accepted rows. Asserted on rows, a repair
  //  broken badly enough to refuse all 25 leaves this loop with nothing to say
  //  and the proof silently stops being run at the moment it matters most.
  for (const a of articles) {
    const drift = m.onlyDeclaredDeletions(a.body, m.repairBody(a.body));
    ok('  ' + a.handle.replace(/^unit2-cycle2-/, '') + ': only declared deletions', drift === null, drift);
  }

  const after = rows.map((r) => r.after).join('');
  ok('no mangled span survives anywhere', ![...after.matchAll(m.MANGLE)].length);
  ok('no escaped span markup survives anywhere', !/&lt;\/?span/.test(after));
  ok('no highlight span survives inside a code block',
    rows.every((r) => (r.after.match(m.CODE_BLOCK) || []).every((b) => !/<span/.test(b))));

  //  Everything outside a code block has to be byte-identical. The mangling is
  //  entirely inside them and a repair that reaches further is out of scope.
  //  Each block collapses to the SAME marker on both sides, so the comparison is
  //  about the surrounding bytes and not about the blocks changing length.
  const blank = (s) => s.replace(m.CODE_BLOCK, '<<CODE>>');
  ok('every byte outside the code blocks is untouched',
    rows.every((r) => blank(r.before) === blank(r.after)));
  ok('and the code blocks really did change', rows.every((r) => r.before !== r.after));

  //  The count is the count: 200 artifacts in, 200 gone.
  const removed = rows.reduce((a, r) => a + r.mangles, 0);
  ok('200 spans deleted, matching the 200 counted', removed === 200, removed);
}

console.log('\n3. WHAT IT REFUSES, WHICH IS THE HALF A GREEN RUN HIDES');
{
  const one = articles[0];
  const bad = (body) => m.inspect('x', body).problems;

  //  A repair scoped to code blocks cannot reach prose, so an article with
  //  mangling in its prose must stop the sheet rather than report success.
  const loose = one.body.replace('<div class="apcs-question-text">',
    '<div class="apcs-question-text"><span class="&lt;span">"apcs-keyword"</span>&gt;');
  ok('mangling OUTSIDE a code block is refused',
    bad(loose).some((p) => /OUTSIDE a code block/.test(p)), bad(loose));

  //  An escaped closing tag is a second defect. This rule was written against
  //  the opener and must say so rather than half-fix a page.
  const closer = one.body.replace('<pre><code>', '<pre><code>x &lt;/span&gt; ');
  ok('an escaped "&lt;/span&gt;" is refused', bad(closer).some((p) => /closers are a defect/.test(p)));

  //  Non-greedy unwrapping picks the wrong close tag when spans nest.
  const nested = one.body.replace('<pre><code>',
    '<pre><code><span class="apcs-keyword">a<span class="apcs-number">b</span></span>');
  ok('nested spans in a code block are refused',
    bad(nested).some((p) => /nested spans|unbalanced/.test(p)), bad(nested));

  //  A clean article is not silently "repaired" into a no-op row.
  for (const c of CONTROLS) {
    const problems = bad(read(c));
    ok('  control ' + c.replace('CONTROL-', '').replace('.html', '') + ' is refused as unmangled',
      problems.some((p) => /does not belong in the sheet/.test(p)), problems);
  }
  //  And the controls really are clean, which is what makes them controls.
  ok('neither control contains the defect',
    CONTROLS.every((c) => ![...read(c).matchAll(m.MANGLE)].length));
  //  The twin is a DIFFERENT question. This is the fixture that stops anyone
  //  ever "repairing" these by copying the clean twin's body across.
  const twin = read(CONTROLS.find((c) => c.includes('unit-2-cycle-2-day-10')));
  const mine = articles.find((a) => a.handle === 'unit2-cycle2-day-10-iteration-accumulation');
  ok('the twin asks a different question (sums to 15, not 10)',
    m.codeOf(twin).includes('i <= 5') && m.codeOf(m.repairBody(mine.body)).includes('i <= 4'));
}

console.log('\n4. THE RECOVERED PROGRAM AGREES WITH THE ARTICLE OWN ANSWER KEY');
{
  const { rows } = m.build(articles);
  let agreed = 0;
  for (const r of rows) {
    const v = m.crossCheckAnswerKey(r.after);
    if (v.agrees) agreed += 1;
    ok('  ' + r.handle.replace(/^unit2-cycle2-/, '') + ': ' + (v.agrees || v.disagrees || v.skipped),
      !!v.agrees, v);
  }
  ok('all 25 agree, none skipped', agreed === 25, agreed);

  //  If the checker cannot tell a wrong program from a right one it is
  //  decoration. Break the bound and it must say so.
  //  Built directly rather than pulled out of build()'s output: a repair broken
  //  enough to refuse every row would otherwise leave this undefined and take
  //  the rest of the suite down with it, and a suite that stops early reports
  //  fewer failures than it found.
  const src = articles.find((a) => a.handle === 'unit2-cycle2-day-10-iteration-accumulation');
  const r0 = { before: src.body, after: m.repairBody(src.body) };
  const wrong = r0.after.replace('i &lt;= 4', 'i &lt;= 5');
  const v = m.crossCheckAnswerKey(wrong);
  ok('a one-character change to a bound is caught', !!v.disagrees, v);
  //  The bound lives on the far side of a mangled span in the LIVE body, so the
  //  mutation has to be made in the bytes as they actually are.
  const BOUND = '</span>&gt;4; i++)';
  ok('the mutation target appears exactly once', r0.before.split(BOUND).length === 2);
  ok('and inspect() refuses a body whose code disagrees with its key',
    m.inspect('x', r0.before.replace(BOUND, '</span>&gt;5; i++)'))
      .problems.some((p) => /answer key/.test(p)));
}

console.log('\n5. THE INTERPRETER, ON THE THINGS THAT WOULD MAKE IT AGREE BY LUCK');
{
  //  Java truncates integer division, JavaScript does not, and day 5 turns on
  //  exactly that: (7 / 3 == 2) is true in Java and false anywhere that keeps
  //  the remainder.
  ok('integer division truncates', T.trace('int a=7; int b=3; System.out.println(a / b);').output === '2\n');
  ok('and a question that depends on it comes out right',
    T.trace('int a = 3; int b = 7; boolean r = (a > 3) || (b / a == 2) && (b % a == 1); System.out.println(r);')
      .output === 'true\n');
  //  && binds tighter than ||, which two of the 25 questions exist to test.
  ok('&& binds tighter than ||',
    T.trace('System.out.println(false || true && false);').output === 'false\n');
  ok('&& short circuits before dividing by zero',
    T.trace('int x = 0; System.out.println((x != 0) && (10 / x > 1));').output === 'false\n');
  //  A for-loop variable is scoped to its loop, so a nested "for (int j..)"
  //  redeclares j on every outer pass. A flat scope calls that an error and
  //  silently skips six of the nested-loop questions.
  ok('a nested loop variable is re-declarable',
    T.trace('int c=0; for(int i=0;i<2;i++){ for(int j=0;j<3;j++){ c++; } } System.out.println(c);').output === '6\n');
  ok('but a genuine redeclaration in one scope is refused',
    !!T.trace('int x = 1; int x = 2;').refused);
  ok('break leaves only the inner loop',
    T.trace('int c=0; for(int i=1;i<=3;i++){ for(int j=1;j<=3;j++){ if(j==2){break;} c++; } } System.out.println(c);').output === '3\n');
  ok('continue skips one pass and no more',
    T.trace('int s=0; for(int i=1;i<=5;i++){ if(i==3){continue;} s+=i; } System.out.println(s);').output === '12\n');
  ok('print does not add a newline and println does',
    T.trace('System.out.print("X"); System.out.println("Y");').output === 'XY\n');
  ok('a boolean prints as true or false', T.trace('System.out.println(1 < 2);').output === 'true\n');
  ok('string concatenation of an int', T.trace('int i=3; System.out.println(i + " ");').output === '3 \n');

  //  It refuses rather than guesses, and a refusal is a reported skip rather
  //  than a silent pass. These are the constructs the next batch will bring.
  for (const src of ['int[] a = {1,2}; System.out.println(a[0]);', 'double d = 1.5;',
    'String s = "a"; System.out.println(s.length());', 'foo(); ']) {
    ok('  refused: ' + JSON.stringify(src.slice(0, 40)), !!T.trace(src).refused);
  }
  ok('a runaway loop is refused rather than hanging',
    !!T.trace('int i = 0; while (i >= 0) { i++; }').refused);
  ok('and it never throws for input it cannot handle', (() => {
    try { T.trace('!!! not java at all $$$'); return true; } catch (e) { return false; }
  })());
}

console.log('\n6. THE SHEET');
{
  const { rows } = m.build(articles);
  const sh = m.sheet(rows);
  const head = sh.csv.split('\r\n')[0];
  ok('one row per repaired article', sh.rows === 25);
  ok('utf-8 BOM', sh.csv.charCodeAt(0) === 0xfeff);
  //  Records are separated by CRLF. The newlines INSIDE a quoted Body HTML are
  //  the article's own and are LF, which is valid CSV, so the property to assert
  //  is that no carriage return ever appears on its own.
  ok('records end CRLF and no bare CR exists',
    sh.csv.endsWith('\r\n') && !/\r(?!\n)/.test(sh.csv));
  ok('one record separator per row plus the header',
    (sh.csv.match(/\r\n/g) || []).length === sh.rows + 1);
  ok('every field quoted', /^"Blog: Handle","Handle","Command","Body HTML"$/.test(head.replace(/^﻿/, '')));
  ok('MERGE, never REPLACE', sh.csv.split('\r\n').slice(1).filter(Boolean).every((l) => l.includes('","MERGE","')));
  //  A blank cell is an erase in every column, so a column no row fills must
  //  not be in the sheet at all.
  ok('no Published At column', !head.includes('Published At'));
  ok('no empty cell anywhere', !/,""(,|$)/.test(sh.csv));
  ok('the blog handle is on every row',
    sh.csv.split('\r\n').slice(1).filter(Boolean).every((l) => l.startsWith('"ap-csa-daily-practice",')));
  ok('the Body HTML is the repaired body, not the live one',
    rows.every((r) => sh.csv.includes(r.after.replace(/"/g, '""'))));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);

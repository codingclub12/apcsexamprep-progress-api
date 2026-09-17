'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: scripts/scan-inline-scripts.js
//
//  The detector for board 175. Two live pages were serving JavaScript that
//  could not run and every check in this repo was green, so what this suite has
//  to establish is not "does it run" but "would it have caught THOSE two".
//
//  Both real defects are reproduced below from the shapes recorded on
//  2026-09-03, and each must be caught on its own:
//
//    re / turn        a hard SyntaxError. The browser skips the whole block.
//    getAtt / ribute  parses, because ASI inserts a semicolon, then throws
//                     ReferenceError at runtime. A syntax check alone is GREEN
//                     on this one, which is why rule 2 exists.
//
//  THE FALSE POSITIVES ARE TESTED AS HARD AS THE FAULTS, because a scanner that
//  cries wolf gets switched off in a day and then the next dead page ships. Two
//  were found while building this, both against the real CSA 1.9 body:
//
//    ld+json          five structured-data blocks per page. They are JSON, so
//                     compiling them as script fails on the first colon. A
//                     scanner that does not filter by type reports five errors
//                     per page on a HEALTHY site.
//    Java in a
//    template literal the lesson pages seed a Java starter program inside
//                     backticks. A newline there is legal JavaScript and means
//                     nothing. The first two attempts at the re/turn mutation
//                     landed in one of these and in visible prose, and both
//                     came back green: the detector was right and the MUTATION
//                     was wrong. A mutation that does not change the thing
//                     under test proves nothing, however red or green it goes.
//
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:inlinescripts
// ---------------------------------------------------------------------------
const s = require('../scripts/scan-inline-scripts.js');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + String(x).slice(0, 200) : '')); }
};

const page = (...blocks) => `<h1>x</h1>\n${blocks.join('\n')}\n<p>done</p>`;
const js = (src, attrs) => `<script${attrs ? ' ' + attrs : ''}>${src}</script>`;

const HEALTHY_JS = `
  (function () {
    var editors = {};
    function normalize(str) {
      if (!str) {
        return '';
      }
      return str.replace(/\\r\\n/g, '\\n');
    }
    document.querySelectorAll('.opt').forEach(function (opt) {
      var chosen = opt.getAttribute('data-letter');
      if (chosen) { editors[chosen] = normalize(opt.textContent); }
    });
  })();
`;

const LD_JSON = `{"@context":"https://schema.org","@type":"Course","name":"AP CSA 1.9"}`;

// The lesson pages carry Java inside a template literal. Newlines are legal
// there and carry no JavaScript meaning at all.
const JAVA_IN_TEMPLATE = `
  var starter = {
    code: \`public class Main
{
    public static void main(String[] args)
    {
        System.out.println(Tools.triple(5));
    }
}

class Tools
{
    public static int triple(int n)
    {
        return n * 3;
    }
}\`,
    hint: 'look at the return value'
  };
`;

console.log('\nSMOKE: inline script scanner\n');

// ---- 1. a healthy page is silent ------------------------------------------
console.log('a healthy page says nothing');
{
  const r = s.scanBody(page(js(HEALTHY_JS)));
  ok('no findings on clean JavaScript', r.findings.length === 0, JSON.stringify(r.findings));
  ok('it actually checked the script', r.checked === 1, r.checked);
}

// ---- 2. the false positives that would switch this off ---------------------
console.log('\nthings that are NOT faults');
{
  const withLd = page(js(HEALTHY_JS), js(LD_JSON, 'type="application/ld+json"'));
  const r = s.scanBody(withLd);
  ok('ld+json is not compiled as script', r.findings.length === 0, JSON.stringify(r.findings));
  ok('and it is not counted as executable', r.checked === 1, r.checked);

  // five of them, which is what the real pages carry
  const many = page(js(HEALTHY_JS), ...Array(5).fill(js(LD_JSON, 'type="application/ld+json"')));
  ok('five ld+json blocks stay silent', s.scanBody(many).findings.length === 0);

  ok('application/json is not compiled either',
    s.scanBody(page(js('{"a":1}', 'type="application/json"'))).findings.length === 0);
  ok('a templating type is not compiled',
    s.scanBody(page(js('{{#each x}}<b>{{y}}</b>{{/each}}', 'type="text/x-template"'))).findings.length === 0);

  ok('an external script is not compiled',
    s.scanBody(page(js('', 'src="https://cdnjs.cloudflare.com/x.js"'))).checked === 0);

  ok('Java inside a template literal is not a fault',
    s.scanBody(page(js(JAVA_IN_TEMPLATE))).findings.length === 0,
    JSON.stringify(s.scanBody(page(js(JAVA_IN_TEMPLATE))).findings));

  // ordinary method chaining puts the dot at the START of the next line
  ok('method chaining across lines is not an ASI split',
    s.scanBody(page(js("var x = foo.bar()\n  .baz()\n  .qux();"))).findings.length === 0);

  ok('a keyword opening the next line is not a split',
    s.asiSplits("var a = obj.prop\nif (a) { go(); }").length === 0);

  ok('an empty script is not a syntax error', s.syntaxError('   \n  ') === null);
}

// ---- 3. THE TWO REAL DEFECTS, each on its own ------------------------------
console.log('\nthe two faults from 2026-09-03, independently');
{
  // defect 1: return split in half, inside real JavaScript
  const hard = HEALTHY_JS.replace('return str.replace', 're\nturn str.replace');
  const r1 = s.scanBody(page(js(hard)));
  ok('re / turn is caught', r1.findings.some((f) => f.rule === 'syntax'), JSON.stringify(r1.findings));

  // defect 2: getAttribute split in half. This one PARSES.
  const asi = HEALTHY_JS.replace("opt.getAttribute('data-letter')", "opt.getAtt\nribute('data-letter')");
  ok('the ASI defect really does still parse (which is why rule 2 exists)',
    s.syntaxError(asi) === null, s.syntaxError(asi));
  const r2 = s.scanBody(page(js(asi)));
  ok('getAtt / ribute is caught by rule 2',
    r2.findings.some((f) => f.rule === 'asi-split'), JSON.stringify(r2.findings));
  ok('and it names the identifier it joins to',
    r2.findings.some((f) => /getAttribute/.test(f.detail)), JSON.stringify(r2.findings));
}

// ---- 4. the fault must survive being surrounded by healthy blocks ----------
console.log('\na fault is still found in a realistic page');
{
  const realistic = page(
    js(LD_JSON, 'type="application/ld+json"'),
    js('', 'src="https://cdnjs.cloudflare.com/codemirror.min.js"'),
    js(JAVA_IN_TEMPLATE),
    js(HEALTHY_JS.replace("opt.getAttribute('data-letter')", "opt.getAtt\nribute('data-letter')")),
    js(LD_JSON, 'type="application/ld+json"')
  );
  const r = s.scanBody(realistic);
  ok('exactly one finding among five blocks', r.findings.length === 1, JSON.stringify(r.findings));
  ok('and it is the asi-split', r.findings[0] && r.findings[0].rule === 'asi-split');
  // five blocks, but only the Java one and the broken one are executable:
  // two are ld+json and one carries a src.
  ok('the executable count excludes ld+json and src', r.checked === 2, r.checked);
}

// ---- 5. the guard is not hollow -------------------------------------------
//  Rule 5.1 of smoke/storefront-fetch.js: a scan over an empty set passes and
//  proves nothing. Assert the scanner can tell nothing from clean.
console.log('\nthe scan is not vacuous');
{
  ok('a page with no scripts checks nothing', s.scanBody('<p>hi</p>').checked === 0);
  ok('extractScripts finds every block',
    s.extractScripts(page(js('a()'), js('b()'), js('c()'))).length === 3);
  ok('attrs are parsed for single quotes too',
    s.attrValue("type='application/ld+json'", 'type') === 'application/ld+json');
  ok('syntaxError returns a message, not just a boolean',
    typeof s.syntaxError('function (') === 'string');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);

'use strict';
// -----------------------------------------------------------------------------
//  AP CSP PSEUDOCODE, THE EXAM REFERENCE SHEET SUBSET, AS A SECOND IMPLEMENTATION.
//
//  Written for board 425 to re-derive answer keys by RUNNING a page's own
//  pseudocode instead of agreeing with a table somebody traced by hand, which is
//  how that page got seven wrong keys. Moved here from
//  smoke/csp-pseudocode-post-repair.js for board 429, when a second repair
//  needed the same thing; the rule is that a module and its migration land
//  together, so both suites now require this file.
//
//  Semantics are the reference sheet's, each held to a test in that suite:
//  lists are 1-indexed and an index outside 1..LENGTH is an error; assigning a
//  list assigns a COPY ("Assigns a copy of the list bList to the list aList");
//  AND and OR are defined by truth value, so both sides are evaluated; REPEAT
//  UNTIL tests before every pass, the first included (CED AAP-2.K.5).
//
//  Covers what the questions here use: assignment, DISPLAY, IF/ELSE, REPEAT n
//  TIMES, REPEAT UNTIL, FOR EACH, PROCEDURE and RETURN, INSERT, APPEND, REMOVE,
//  LENGTH. No RANDOM, no INPUT, no robot. Test support, never served.
//
//  No em-dashes; non-ASCII is written as escapes. Zero PII.
// -----------------------------------------------------------------------------
const ARROW = '\u2190'; const NE = '\u2260'; const LE = '\u2264'; const GE = '\u2265';

function codeText(html) {
  return html.replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

function tokenize(src) {
  const toks = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
    const rest = src.slice(i); let m;
    if ((m = /^\d+(\.\d+)?/.exec(rest))) { toks.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
    if ((m = /^"([^"]*)"/.exec(rest))) { toks.push({ t: 'str', v: m[1] }); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { toks.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
    if ('()[]{},+-*/=<>'.includes(c) || [ARROW, NE, LE, GE].includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    throw new Error('tokenize: unexpected ' + JSON.stringify(c));
  }
  return toks;
}

function parse(src) {
  const toks = tokenize(src); let p = 0;
  const peek = (k) => toks[p + (k || 0)];
  const is = (v, k) => { const t = peek(k); return !!t && t.t !== 'num' && t.t !== 'str' && t.v === v; };
  const eat = (v) => { if (!is(v)) throw new Error('parse: expected ' + v + ', got ' + JSON.stringify(peek())); return toks[p++]; };
  const name = () => { const t = toks[p++]; if (!t || t.t !== 'id') throw new Error('parse: expected a name'); return t.v; };
  const list = (close, item) => { const xs = []; while (!is(close)) { xs.push(item()); if (is(',')) eat(','); } eat(close); return xs; };
  const block = () => { eat('{'); const body = []; while (!is('}')) body.push(stmt()); eat('}'); return body; };

  function stmt() {
    if (is('IF')) {
      eat('IF'); eat('('); const c = expr(); eat(')'); const a = block();
      let b = null; if (is('ELSE')) { eat('ELSE'); b = block(); }
      return { k: 'if', c, a, b };
    }
    if (is('REPEAT') && is('UNTIL', 1)) { eat('REPEAT'); eat('UNTIL'); eat('('); const c = expr(); eat(')'); return { k: 'until', c, body: block() }; }
    if (is('REPEAT')) { eat('REPEAT'); const n = expr(); eat('TIMES'); return { k: 'times', n, body: block() }; }
    if (is('FOR')) { eat('FOR'); eat('EACH'); const v = name(); eat('IN'); const l = expr(); return { k: 'each', v, l, body: block() }; }
    if (is('PROCEDURE')) { eat('PROCEDURE'); const n = name(); eat('('); const params = list(')', name); return { k: 'proc', name: n, params, body: block() }; }
    if (is('RETURN')) { eat('RETURN'); eat('('); const e = expr(); eat(')'); return { k: 'return', e }; }
    if (is('DISPLAY')) { eat('DISPLAY'); eat('('); const e = expr(); eat(')'); return { k: 'display', e }; }
    if (peek().t === 'id' && is(ARROW, 1)) { const n = name(); eat(ARROW); return { k: 'set', name: n, e: expr() }; }
    if (peek().t === 'id' && is('[', 1)) {
      const save = p; const n = name(); eat('['); const i = expr(); eat(']');
      if (is(ARROW)) { eat(ARROW); return { k: 'setAt', name: n, i, e: expr() }; }
      p = save;
    }
    return { k: 'expr', e: expr() };
  }
  function expr() { return or(); }
  function or() { let l = and(); while (is('OR')) { eat('OR'); l = { k: 'or', l, r: and() }; } return l; }
  function and() { let l = not(); while (is('AND')) { eat('AND'); l = { k: 'and', l, r: not() }; } return l; }
  function not() { if (is('NOT')) { eat('NOT'); return { k: 'not', e: not() }; } return cmp(); }
  function cmp() {
    const l = add();
    for (const op of ['=', NE, '<', '>', LE, GE]) if (is(op)) { eat(op); return { k: 'cmp', op, l, r: add() }; }
    return l;
  }
  function add() { let l = mul(); while (is('+') || is('-')) { const op = toks[p++].v; l = { k: 'bin', op, l, r: mul() }; } return l; }
  function mul() { let l = unary(); while (is('*') || is('/') || is('MOD')) { const op = toks[p++].v; l = { k: 'bin', op, l, r: unary() }; } return l; }
  function unary() { if (is('-')) { eat('-'); return { k: 'neg', e: unary() }; } return postfix(); }
  function postfix() { let e = primary(); while (is('[')) { eat('['); const i = expr(); eat(']'); e = { k: 'at', e, i }; } return e; }
  function primary() {
    const t = peek();
    if (!t) throw new Error('parse: unexpected end');
    if (t.t === 'num' || t.t === 'str') { p++; return { k: 'lit', v: t.v }; }
    if (is('true') || is('false')) { p++; return { k: 'lit', v: t.v === 'true' }; }
    if (is('[')) { eat('['); return { k: 'list', items: list(']', expr) }; }
    if (is('(')) { eat('('); const e = expr(); eat(')'); return e; }
    if (t.t === 'id') {
      p++;
      if (is('(')) { eat('('); return { k: 'call', name: t.v, args: list(')', expr) }; }
      return { k: 'var', name: t.v };
    }
    throw new Error('parse: unexpected ' + JSON.stringify(t));
  }
  const prog = []; while (p < toks.length) prog.push(stmt());
  return prog;
}

//  Semantics, each from the reference sheet: lists are 1-indexed and an index
//  outside 1..LENGTH is an error; assigning a list assigns a COPY; AND and OR
//  are defined by truth value, so both sides are evaluated; REPEAT UNTIL tests
//  before every pass, the first included (AAP-2.K.5).
function run(src, vars) {
  const out = []; const procs = {};
  const globals = Object.assign({}, vars || {});
  class Ret { constructor(v) { this.v = v; } }
  const truth = (v) => { if (typeof v !== 'boolean') throw new Error('not a Boolean: ' + JSON.stringify(v)); return v; };
  const slot = (l, i) => {
    if (!Array.isArray(l)) throw new Error('not a list');
    if (i < 1 || i > l.length || i !== Math.floor(i)) throw new Error('index ' + i + ' outside 1..' + l.length);
    return i - 1;
  };
  const get = (env, n) => {
    if (Object.prototype.hasOwnProperty.call(env, n)) return env[n];
    if (Object.prototype.hasOwnProperty.call(globals, n)) return globals[n];
    throw new Error('undefined variable ' + n);
  };
  function call(n, args) {
    if (n === 'INSERT') { const [l, i, v] = args; slot(l, i); l.splice(i - 1, 0, v); return undefined; }
    if (n === 'APPEND') { args[0].push(args[1]); return undefined; }
    if (n === 'REMOVE') { const l = args[0]; l.splice(slot(l, args[1]), 1); return undefined; }
    if (n === 'LENGTH') return args[0].length;
    const pr = procs[n];
    if (!pr) throw new Error('undefined procedure ' + n);
    const local = {}; pr.params.forEach((pn, k) => { local[pn] = args[k]; });
    try { exec(pr.body, local); } catch (x) { if (x instanceof Ret) return x.v; throw x; }
    return undefined;
  }
  function ev(e, env) {
    switch (e.k) {
      case 'lit': return e.v;
      case 'list': return e.items.map((x) => ev(x, env));
      case 'var': return get(env, e.name);
      case 'at': { const l = ev(e.e, env); return l[slot(l, ev(e.i, env))]; }
      case 'neg': return -ev(e.e, env);
      case 'not': return !truth(ev(e.e, env));
      case 'and': { const a = truth(ev(e.l, env)); const b = truth(ev(e.r, env)); return a && b; }
      case 'or': { const a = truth(ev(e.l, env)); const b = truth(ev(e.r, env)); return a || b; }
      case 'cmp': {
        const a = ev(e.l, env); const b = ev(e.r, env);
        return { '=': a === b, [NE]: a !== b, '<': a < b, '>': a > b, [LE]: a <= b, [GE]: a >= b }[e.op];
      }
      case 'bin': {
        const a = ev(e.l, env); const b = ev(e.r, env);
        return { '+': a + b, '-': a - b, '*': a * b, '/': a / b, MOD: a % b }[e.op];
      }
      case 'call': return call(e.name, e.args.map((x) => ev(x, env)));
      default: throw new Error('eval: ' + e.k);
    }
  }
  function exec(stmts, env) {
    for (const s of stmts) {
      if (s.k === 'set') { const v = ev(s.e, env); env[s.name] = Array.isArray(v) ? v.slice() : v; }
      else if (s.k === 'setAt') { const l = get(env, s.name); l[slot(l, ev(s.i, env))] = ev(s.e, env); }
      else if (s.k === 'display') out.push(ev(s.e, env));
      else if (s.k === 'if') { if (truth(ev(s.c, env))) exec(s.a, env); else if (s.b) exec(s.b, env); }
      else if (s.k === 'until') {
        let n = 0;
        while (!truth(ev(s.c, env))) { if (++n > 100000) throw new Error('REPEAT UNTIL never stops'); exec(s.body, env); }
      }
      else if (s.k === 'times') { const n = ev(s.n, env); for (let k = 0; k < n; k++) exec(s.body, env); }
      else if (s.k === 'each') { for (const item of ev(s.l, env).slice()) { env[s.v] = item; exec(s.body, env); } }
      else if (s.k === 'proc') procs[s.name] = s;
      else if (s.k === 'return') throw new Ret(ev(s.e, env));
      else ev(s.e, env);
    }
  }
  exec(parse(src), globals);
  return { out, shown: out.map((v) => (Array.isArray(v) ? JSON.stringify(v) : String(v))).join(' '), vars: globals, call };
}

module.exports = { ARROW, NE, LE, GE, codeText, tokenize, parse, run };

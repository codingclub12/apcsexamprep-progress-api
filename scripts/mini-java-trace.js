// ─────────────────────────────────────────────────────────────────────────────
//  RUN A DAILY-PRACTICE CODE SNIPPET AND SAY WHAT IT PRINTS.
//
//  This exists to answer a question no diff can: after a body repair recovers
//  the Java out of mangled markup, is the recovered program the one the question
//  was written against? A deletion that ate a bound turns "i <= 4" into "i < 4"
//  and the page still looks perfect, still validates, and now teaches the wrong
//  answer. The article's own answer key is the check, because the repair never
//  touches it.
//
//  So: interpret the snippet, print what it prints, and compare that to the
//  option the article marks correct. Two facts from opposite ends of the same
//  page, and they either agree or the repair is wrong.
//
//  IT INTERPRETS, IT DOES NOT EVALUATE
//  There is no eval, no new Function, no transpile-then-run. The input is text
//  lifted off a live storefront page, and handing that to a JavaScript engine
//  would be the wrong instinct even behind a whitelist. Everything below walks a
//  parse tree over a fixed grammar and REFUSES anything outside it, which is
//  also what makes a refusal informative: an unsupported construct is a snippet
//  this checker has no opinion about, not a snippet that passed.
//
//  THE SUBSET, AND WHY IT IS SMALL ON PURPOSE
//    int / boolean / String locals, assignment and += -= *= /= %=, ++ and --
//    if / else if / else, while, for, break, continue
//    System.out.print and println
//    + - * / % with JAVA integer division (truncating), not JavaScript's
//    < <= > >= == != && || ! with short-circuit, string concatenation
//  That is the whole of Unit 2 Cycle 2. Anything a real Java program needs and
//  this lacks (objects, arrays, methods, casts) is a refusal, and a refusal is
//  the correct answer for a checker that would otherwise have to guess.
//
//  Integer division is the one place a lazy implementation would silently
//  disagree with Java on a question specifically about it: 7 / 3 is 2, and
//  day-5 turns on exactly that.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

class Refused extends Error {}
const refuse = (msg) => { throw new Refused(msg); };

//  ── tokens ──────────────────────────────────────────────────────────────────
const PUNCT = ['<=', '>=', '==', '!=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=',
  '{', '}', '(', ')', ';', ',', '+', '-', '*', '/', '%', '<', '>', '=', '!', '.'];

function lex(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i += 1; continue; }
    if (/[0-9]/.test(c)) {
      let j = i; while (j < src.length && /[0-9]/.test(src[j])) j += 1;
      if (src[j] === '.') refuse('a decimal literal is outside this subset');
      out.push({ t: 'num', v: Number(src.slice(i, j)) }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j += 1;
      out.push({ t: 'word', v: src.slice(i, j) }); i = j; continue;
    }
    if (c === '"') {
      let j = i + 1; let s = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\') { s += ({ n: '\n', t: '\t', '"': '"', '\\': '\\' })[src[j + 1]] ?? refuse('unknown escape'); j += 2; }
        else { s += src[j]; j += 1; }
      }
      if (j >= src.length) refuse('unterminated string literal');
      out.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    const p = PUNCT.find((q) => src.startsWith(q, i));
    if (!p) refuse('character outside this subset: ' + JSON.stringify(c));
    out.push({ t: 'punct', v: p }); i += p.length;
  }
  return out;
}

//  ── parser ──────────────────────────────────────────────────────────────────
//  Precedence climbing, lowest first. Java's own table, and the two questions
//  about && binding tighter than || are the reason it is a table rather than a
//  left-to-right chain.
const LEVELS = [['||'], ['&&'], ['==', '!='], ['<', '<=', '>', '>='], ['+', '-'], ['*', '/', '%']];

function parser(tokens) {
  let p = 0;
  const peek = (k = 0) => tokens[p + k];
  const at = (v, k = 0) => peek(k) && peek(k).v === v && peek(k).t !== 'str';
  const take = (v) => { if (!at(v)) refuse('expected ' + v + ' but found ' + JSON.stringify(peek() ? peek().v : '<end>')); return tokens[p++]; };
  const name = () => { const t = peek(); if (!t || t.t !== 'word') refuse('expected a name'); p += 1; return t.v; };

  function primary() {
    const t = peek();
    if (!t) refuse('expression ended early');
    if (t.t === 'num') { p += 1; return { k: 'lit', v: t.v }; }
    if (t.t === 'str') { p += 1; return { k: 'lit', v: t.v }; }
    if (at('(')) { p += 1; const e = expr(0); take(')'); return e; }
    if (at('!')) { p += 1; return { k: 'not', a: primary() }; }
    if (at('-')) { p += 1; return { k: 'neg', a: primary() }; }
    if (t.t === 'word') {
      if (t.v === 'true' || t.v === 'false') { p += 1; return { k: 'lit', v: t.v === 'true' }; }
      //  A dot means a method call, and System.out.print* is the only one here.
      if (at('.', 1)) refuse('a method call is outside this subset: ' + t.v + '.' + (peek(2) || {}).v);
      if (at('(', 1)) refuse('a method call is outside this subset: ' + t.v + '(');
      p += 1;
      if (at('++') || at('--')) { const op = tokens[p++].v; return { k: 'post', name: t.v, op }; }
      return { k: 'var', name: t.v };
    }
    return refuse('unexpected ' + JSON.stringify(t.v));
  }

  function expr(level) {
    if (level >= LEVELS.length) return primary();
    let left = expr(level + 1);
    while (peek() && peek().t === 'punct' && LEVELS[level].includes(peek().v)) {
      const op = tokens[p++].v;
      left = { k: 'bin', op, a: left, b: expr(level + 1) };
    }
    return left;
  }

  function block() {
    if (at('{')) { p += 1; const body = []; while (!at('}')) { if (!peek()) refuse('unclosed block'); body.push(statement()); } p += 1; return body; }
    return [statement()];
  }

  function simple() {
    //  One statement without its semicolon: a declaration, an assignment, or
    //  a bare increment. Used for a for-loop's init and update too.
    if (at('int') || at('boolean') || at('String')) {
      const type = tokens[p++].v; const n = name(); take('='); return { k: 'decl', type, name: n, value: expr(0) };
    }
    const t = peek();
    if (t && t.t === 'word' && (at('++', 1) || at('--', 1))) { p += 1; const op = tokens[p++].v; return { k: 'incr', name: t.v, op }; }
    if (t && t.t === 'word' && peek(1) && ['=', '+=', '-=', '*=', '/=', '%='].includes(peek(1).v)) {
      p += 1; const op = tokens[p++].v; return { k: 'assign', name: t.v, op, value: expr(0) };
    }
    return refuse('statement outside this subset, starting at ' + JSON.stringify(t ? t.v : '<end>'));
  }

  function statement() {
    if (at(';')) { p += 1; return { k: 'empty' }; }
    if (at('if')) {
      p += 1; take('('); const cond = expr(0); take(')');
      const then = block();
      let other = null;
      if (at('else')) { p += 1; other = at('if') ? [statement()] : block(); }
      return { k: 'if', cond, then, other };
    }
    if (at('while')) { p += 1; take('('); const cond = expr(0); take(')'); return { k: 'while', cond, body: block() }; }
    if (at('for')) {
      p += 1; take('(');
      const init = at(';') ? null : simple(); take(';');
      const cond = at(';') ? null : expr(0); take(';');
      const update = at(')') ? null : simple(); take(')');
      return { k: 'for', init, cond, update, body: block() };
    }
    if (at('break')) { p += 1; take(';'); return { k: 'break' }; }
    if (at('continue')) { p += 1; take(';'); return { k: 'continue' }; }
    if (at('System') && at('.', 1) && at('out', 2) && at('.', 3)) {
      p += 4; const fn = name();
      if (fn !== 'print' && fn !== 'println') refuse('System.out.' + fn + ' is outside this subset');
      take('('); const arg = at(')') ? { k: 'lit', v: '' } : expr(0); take(')'); take(';');
      return { k: 'print', nl: fn === 'println', arg };
    }
    const s = simple(); take(';'); return s;
  }

  const program = [];
  while (p < tokens.length) program.push(statement());
  return program;
}

//  ── interpreter ─────────────────────────────────────────────────────────────
const BREAK = { signal: 'break' };
const CONTINUE = { signal: 'continue' };

//  Java prints an int, not a float, and truncates division toward zero. Both are
//  the difference between agreeing with the answer key and only looking like it.
const idiv = (a, b) => { if (b === 0) refuse('division by zero'); return Math.trunc(a / b); };
const show = (v) => (typeof v === 'boolean' ? String(v) : String(v));

function run(src, limit = 200000) {
  const ast = parser(lex(src));
  //  A scope CHAIN, not one flat map. Java scopes a for-loop's variable to its
  //  loop, so a nested "for (int j ...)" declares a fresh j on every pass of the
  //  outer loop; a flat map calls that a redeclaration and refuses six of the
  //  nested-loop questions this checker exists to check.
  let scopes = [new Map()];
  const find = (n) => { for (let i = scopes.length - 1; i >= 0; i -= 1) if (scopes[i].has(n)) return scopes[i]; return null; };
  let out = '';
  let steps = 0;
  const tick = () => { steps += 1; if (steps > limit) refuse('did not terminate within ' + limit + ' steps'); };
  const get = (n) => { const s = find(n); if (!s) refuse('undeclared variable ' + n); return s.get(n); };
  const set = (n, v) => { const s = find(n); if (!s) refuse('assignment to undeclared variable ' + n); s.set(n, v); };
  const declare = (n, v) => {
    if (scopes[scopes.length - 1].has(n)) refuse('redeclared variable ' + n + ' in the same scope');
    scopes[scopes.length - 1].set(n, v);
  };
  const scoped = (fn) => { scopes.push(new Map()); try { return fn(); } finally { scopes.pop(); } };

  function ev(e) {
    switch (e.k) {
      case 'lit': return e.v;
      case 'var': return get(e.name);
      case 'not': return !ev(e.a);
      case 'neg': return -ev(e.a);
      case 'post': { const before = get(e.name); set(e.name, before + (e.op === '++' ? 1 : -1)); return before; }
      case 'bin': {
        if (e.op === '&&') return ev(e.a) ? ev(e.b) : false;
        if (e.op === '||') return ev(e.a) ? true : ev(e.b);
        const a = ev(e.a);
        const b = ev(e.b);
        switch (e.op) {
          case '+': return (typeof a === 'string' || typeof b === 'string') ? show(a) + show(b) : a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return idiv(a, b);
          case '%': { if (b === 0) refuse('modulo by zero'); return a % b; }
          case '<': return a < b;
          case '<=': return a <= b;
          case '>': return a > b;
          case '>=': return a >= b;
          case '==': return a === b;
          case '!=': return a !== b;
          default: return refuse('operator outside this subset: ' + e.op);
        }
      }
      default: return refuse('expression node outside this subset: ' + e.k);
    }
  }

  function exec(stmts) {
    for (const s of stmts) {
      tick();
      switch (s.k) {
        case 'empty': break;
        case 'decl':
          declare(s.name, ev(s.value));
          break;
        case 'assign': {
          const v = ev(s.value);
          if (s.op === '=') { set(s.name, v); break; }
          const cur = get(s.name);
          const op = s.op[0];
          set(s.name, op === '+' ? ((typeof cur === 'string') ? cur + show(v) : cur + v)
            : op === '-' ? cur - v : op === '*' ? cur * v : op === '/' ? idiv(cur, v) : cur % v);
          break;
        }
        case 'incr': set(s.name, get(s.name) + (s.op === '++' ? 1 : -1)); break;
        case 'print': out += show(ev(s.arg)) + (s.nl ? '\n' : ''); break;
        case 'break': return BREAK;
        case 'continue': return CONTINUE;
        case 'if': {
          const c = ev(s.cond);
          if (typeof c !== 'boolean') refuse('a condition that is not boolean');
          const r = c ? scoped(() => exec(s.then)) : (s.other ? scoped(() => exec(s.other)) : null);
          if (r) return r;
          break;
        }
        case 'while':
          for (;;) {
            tick();
            const c = ev(s.cond);
            if (typeof c !== 'boolean') refuse('a condition that is not boolean');
            if (!c) break;
            const r = scoped(() => exec(s.body));
            if (r === BREAK) break;
            if (r && r !== CONTINUE) return r;
          }
          break;
        case 'for': {
          //  The init declares into the loop's OWN scope, which is popped when
          //  the loop ends, so the next "for (int j ...)" starts clean.
          scopes.push(new Map());
          try {
            if (s.init) exec([s.init]);
            for (;;) {
              tick();
              if (s.cond) {
                const c = ev(s.cond);
                if (typeof c !== 'boolean') refuse('a condition that is not boolean');
                if (!c) break;
              }
              const r = scoped(() => exec(s.body));
              if (r === BREAK) break;
              if (r && r !== CONTINUE) return r;
              if (s.update) exec([s.update]);
            }
          } finally { scopes.pop(); }
          break;
        }
        default: refuse('statement node outside this subset: ' + s.k);
      }
    }
    return null;
  }

  exec(ast);
  return out;
}

//  Returns { output } or { refused } and never throws for a snippet it cannot
//  handle, so a caller can tell "disagrees with the key" from "not checkable".
function trace(src) {
  try { return { output: run(src) }; }
  catch (e) { if (e instanceof Refused) return { refused: e.message }; throw e; }
}

module.exports = { lex, parser, run, trace, Refused };

/* =========================================================================
 * PseudoCompile Core v2 — 面向《数据结构与算法分析》课程的中文/英文伪代码编译器
 * 纯离线内核：词法 → 语法 → 语义 → 1-based 数组代码生成 → 复杂度静态推导
 *             + 沙箱执行 + 操作计数 + 数据驱动复杂度拟合 + 自检用例
 * 约定：数组下标一律从 1 开始；关键字中英混用、end/}/fi/od 混用均可
 * ========================================================================= */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.PseudoCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ===================== 0. 基础工具 ===================== */

  function uniq(a) {
    var out = [], i;
    for (i = 0; i < a.length; i++) if (out.indexOf(a[i]) < 0) out.push(a[i]);
    return out;
  }
  function mulberry32(seed) {
    var t = (seed >>> 0) || 1;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rndInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function clock() {
    if (typeof performance !== 'undefined' && performance && performance.now) return performance.now();
    return Date.now();
  }

  var CN_NAME = '\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af';
  var RE_CN = new RegExp('[' + CN_NAME + ']');

  /* ===================== 1. 词法分析 ===================== */

  var KEYWORDS = ['and', 'or', 'not', 'mod', 'div', 'to', 'downto', 'step', 'by', 'then', 'do', 'else', 'end',
    'if', 'for', 'foreach', 'each', 'in', 'while', 'repeat', 'until', 'return', 'print', 'read', 'input',
    'output', 'begin', 'var', 'array', 'of', 'int', 'integer', 'float', 'real', 'double', 'bool', 'boolean',
    'string', 'char', 'true', 'false', 'null', 'nil', 'new', 'swap', 'break', 'continue', 'function', 'procedure',
    'length', 'len', 'void', 'elseif', 'elif', 'endif', 'endfor', 'endwhile', 'fi', 'od'];

  var KEYWORD_CN = {
    '如果': 'if', '若': 'if', '当': 'while', '循环': 'while', '对于': 'foreach', '遍历': 'foreach',
    '否则': 'else', '结束': 'end', '返回': 'return', '输出': 'print', '打印': 'print', '输入': 'input',
    '读取': 'read', '重复': 'repeat', '直到': 'until', '函数': 'function', '过程': 'procedure', '定义': 'function',
    '且': 'and', '并且': 'and', '与': 'and', '或': 'or', '或者': 'or', '非': 'not', '取模': 'mod',
    '整除': 'div', '交换': 'swap', '跳出': 'break', '继续': 'continue', '真': 'true', '假': 'false',
    '空': 'null', '从': 'from', '到': 'to', '步长': 'step', '为止': 'to', '做': 'do', '那么': 'then',
    '数组': 'array', '整数': 'int', '实数': 'float', '布尔': 'bool', '字符串': 'string', '逻辑': 'bool',
    '令': 'let', '设': 'let', '声明': 'let', '返回结果': 'return', '主函数': 'function'
  };

  var OP3 = ['<-', '->', ':=', '+=', '-=', '*=', '/=', '%=', '..', '==', '!=', '<=', '>=', '&&', '||'];
  var OP2 = ['++', '--', '<=', '>=', '==', '!=', '<-', '->', ':=', '+=', '-=', '*=', '/=', '%=', '..', '&&', '||'];
  var OP1 = '+-*/%^=<>!&|,;:(){}[]#';
  var ASSIGN_OPS = ['=', '+=', '-=', '*=', '/=', '%='];

  function Lexer(src) {
    this.src = String(src == null ? '' : src).replace(/\r\n?/g, '\n');
    this.i = 0;
    this.line = 1;
  }
  Lexer.prototype.fail = function (msg, col) {
    throw new SyntaxError(msg + '（第 ' + this.line + ' 行）');
  };
  Lexer.prototype.tokenize = function () {
    var out = [], s = this.src, n = s.length, ch, c2, c3, start, line, id, m;
    while (this.i < n) {
      ch = s[this.i]; c2 = s.substr(this.i, 2); c3 = s.substr(this.i, 3);
      if (ch === '\n') { this.i++; this.line++; continue; }
      if (ch === ' ' || ch === '\t' || ch === '\u3000' || ch === '\ufeff') { this.i++; continue; }
      if (c2 === '//' || ch === '#') { while (this.i < n && s[this.i] !== '\n') this.i++; continue; }
      if (c2 === '/*') { this.i += 2; while (this.i < n && s.substr(this.i, 2) !== '*/') { if (s[this.i] === '\n') this.line++; this.i++; } this.i += 2; continue; }
      start = this.i; line = this.line;
      if (ch >= '0' && ch <= '9') {
        while (this.i < n && s[this.i] >= '0' && s[this.i] <= '9') this.i++;
        if (s[this.i] === '.' && s[this.i + 1] !== '.') { this.i++; while (this.i < n && s[this.i] >= '0' && s[this.i] <= '9') this.i++; }
        out.push({ t: 'number', v: parseFloat(s.slice(start, this.i)), num: parseFloat(s.slice(start, this.i)), line: line, col: start + 1 });
        continue;
      }
      if (ch === '"' || ch === "'") {
        var q = ch; this.i++; var buf = '';
        while (this.i < n && s[this.i] !== q) {
          if (s[this.i] === '\\') { var e = s[this.i + 1]; buf += e === 'n' ? '\n' : e === 't' ? '\t' : e; this.i += 2; }
          else buf += s[this.i++];
        }
        if (this.i >= n) this.fail('字符串缺少闭合引号');
        this.i++;
        out.push({ t: 'string', v: buf, line: line, col: start + 1 });
        continue;
      }
      if (RE_CN.test(ch)) {
        while (this.i < n && RE_CN.test(s[this.i])) this.i++;
        id = s.slice(start, this.i);
        if (Object.prototype.hasOwnProperty.call(KEYWORD_CN, id)) out.push({ t: 'kw', v: KEYWORD_CN[id], cn: id, line: line, col: start + 1 });
        else out.push({ t: 'id', v: id, line: line, col: start + 1 });
        continue;
      }
      if (/[A-Za-z_]/.test(ch)) {
        while (this.i < n && /[A-Za-z0-9_]/.test(s[this.i])) this.i++;
        id = s.slice(start, this.i);
        var low = id.toLowerCase();
        if (KEYWORDS.indexOf(low) >= 0) out.push({ t: 'kw', v: low, line: line, col: start + 1 });
        else out.push({ t: 'id', v: id, line: line, col: start + 1 });
        continue;
      }
      if (OP3.indexOf(c3) >= 0) { this.i += 3; out.push({ t: 'op', v: c3, line: line, col: start + 1 }); continue; }
      if (OP2.indexOf(c2) >= 0) { this.i += 2; out.push({ t: 'op', v: c2, line: line, col: start + 1 }); continue; }
      if (OP1.indexOf(ch) >= 0) { this.i++; out.push({ t: 'op', v: ch, line: line, col: start + 1 }); continue; }
      this.fail('无法识别的字符 “' + ch + '”');
    }
    out.push({ t: 'eof', line: this.line, col: n + 1 });
    return out;
  };

  var BLOCK_TERMS = ['end', 'endif', 'endfor', 'endwhile', 'until', '}'];

  /* ===================== 2. 语法分析 ===================== */

  function N(v) { return { k: 'num', v: v }; }
  function V(name) { return { k: 'var', name: name }; }
  function B(op, l, r) { return { k: 'bin', op: op, l: l, r: r }; }
  function U(op, e) { return { k: 'un', op: op, e: e }; }
  function IX(obj, index) { return { k: 'index', obj: obj, index: index }; }
  function C(name, args) { return { k: 'call', name: name, args: args || [] }; }

  var PREC = {
    'or': 1, '||': 1, 'and': 2, '&&': 2,
    '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3,
    '+': 4, '-': 4, '*': 5, '/': 5, 'div': 5, 'mod': 5, '%': 5,
    '^': 7, '**': 7
  };
  var TYPE_KW = ['array', 'int', 'integer', 'float', 'real', 'double', 'bool', 'boolean', 'string', 'char', 'void'];
  var NORM_TYPE = { integer: 'int', real: 'float', double: 'float', boolean: 'bool', char: 'string' };

  function Parser(toks) {
    this.ts = toks; this.p = 0; this.diags = [];
  }
  Parser.prototype.peek = function (k) { return this.ts[this.p + (k || 0)] || { t: 'eof' }; };
  Parser.prototype.at = function (v) { var t = this.peek(); return t.t !== 'eof' && t.v === v; };
  Parser.prototype.atT = function (t) { return this.peek().t === t; };
  Parser.prototype.isKw = function (v) { var t = this.peek(); return t.t === 'kw' && t.v === v; };
  Parser.prototype.next = function () { return this.ts[this.p++] || { t: 'eof' }; };
  Parser.prototype.accept = function (v) { if (this.at(v)) { this.p++; return true; } return false; };
  Parser.prototype.acceptKw = function (v) { if (this.isKw(v)) { this.p++; return true; } return false; };
  Parser.prototype.expect = function (v) { if (this.at(v)) { this.p++; return true; } this.err('缺少 “' + v + '”'); return false; };
  Parser.prototype.err = function (msg) { var t = this.peek(); this.diags.push({ level: 'error', line: t.line || 1, col: t.col || 1, msg: msg }); };
  Parser.prototype.sync = function () {
    var guard = 0;
    while (!this.atT('eof') && guard++ < 2000) {
      if (this.at(';')) { this.p++; return; }
      var t = this.peek();
      if (t.t === 'kw' && ['if', 'for', 'foreach', 'while', 'return', 'print', 'repeat', 'function', 'procedure', 'break', 'continue', 'end', 'else', 'for_each'].indexOf(t.v) >= 0) return;
      if (t.t === 'id' && this.peek(1) && (this.peek(1).v === '=' || this.peek(1).v === '<-' || this.peek(1).v === ':')) return;
      this.p++;
    }
  };

  // C/Java 风格函数头：int solve(...) / void sort(...) → 等价于 function solve(...)
  Parser.prototype.normalizeSignatures = function () {
    var ts = this.ts, i;
    for (i = 0; i + 2 < ts.length; i++) {
      var a = ts[i], b = ts[i + 1], c = ts[i + 2];
      if (a.t !== 'kw' || TYPE_KW.indexOf(a.v) < 0) continue;
      if (!b || b.t !== 'id') continue;
      if (!c || c.t !== 'op' || c.v !== '(') continue;
      // 前面必须是行首（上行结束 / 语句分隔），避免命中 `x = int y(...)` 这类误写
      var prev = ts[i - 1];
      if (prev && prev.t !== 'kw' && prev.t !== 'op') continue;
      if (prev && prev.t === 'op' && [';', '}', '{'].indexOf(prev.v) < 0) continue;
      ts[i] = { t: 'kw', v: 'function', line: a.line, col: a.col };
    }
    return this;
  };

  Parser.prototype.parseProgram = function () {
    try { this.normalizeSignatures(); } catch (e) { }
    var stmts = this.parseBlock(BLOCK_TERMS);
    if (!this.atT('eof')) this.err('多余的闭合符号 “' + (this.peek().v || '') + '”');
    if (!stmts.length) this.err('没有解析到任何语句');
    return { k: 'program', body: stmts };
  };

  Parser.prototype.parseBlock = function (terms) {
    var stmts = [];
    while (!this.atT('eof')) {
      if (this.at(';')) { this.p++; continue; }
      if (this.at('}')) break;
      var t = this.peek();
      if (t.t === 'kw') {
        if (terms.indexOf(t.v) >= 0) break;
        if (t.v === 'else' || t.v === 'elseif' || t.v === 'elif' || t.v === 'fi' || t.v === 'od') break;
        if (t.v === 'endif' || t.v === 'endfor' || t.v === 'endwhile') { if (terms.indexOf(t.v) >= 0 || terms.indexOf('end') >= 0) break; }
        if (t.v === 'end' && terms.indexOf('end') >= 0) break;
      }
      var before = this.p;
      var s = this.parseStatement();
      if (s) stmts.push(s);
      if (this.p === before) {
        this.diags.push({ level: 'error', line: t.line || 1, col: t.col || 1, msg: '无法识别的语句，已跳过：' + (t.v !== undefined ? t.v : t.t) });
        this.p++;
      }
    }
    return stmts;
  };

  function isRangeShape(e) {
    var g = 0;
    while (e && e.k === 'index' && g++ < 8) {
      if (!(e.index && e.index.k === 'range')) return false;
      e = e.obj;
    }
    return !!(e && e.k === 'var' && g > 0);
  }

  Parser.prototype.parseStatement = function () {
    var t = this.peek();
    if (t.t === 'op' && t.v === ';') { this.p++; return null; }
    if (t.t === 'kw') {
      switch (t.v) {
        case 'if': return this.parseIf();
        case 'while': return this.parseWhile();
        case 'repeat': case 'do': return this.parseRepeat();
        case 'for': case 'foreach': case 'each': return this.parseFor();
        case 'return': {
          this.p++;
          var rt = this.peek();
          if (this.at(';') || this.at('}') || this.atT('eof') ||
            (rt.t === 'kw' && ['end', 'endif', 'endfor', 'endwhile', 'else', 'until', 'fi', 'od'].indexOf(rt.v) >= 0))
            return { k: 'return', e: null };
          return { k: 'return', e: this.parseExpr() };
        }
        case 'print': case 'output': this.p++; return { k: 'output', args: this.parseArgs() };
        case 'swap': this.p++; return this.parseSwap();
        case 'break': this.p++; return { k: 'break' };
        case 'continue': this.p++; return { k: 'continue' };
        case 'function': case 'procedure': return this.parseFunction();
        case 'let': case 'var': {
          this.p++;
          var nm = this.next();
          if (nm.t !== 'id' && nm.t !== 'kw') { this.err('声明缺少变量名'); return null; }
          var init = null;
          while (this.at('[')) this.parseIndexSpec();
          if (this.accept('=') || this.accept('<-')) init = this.parseExpr();
          return { k: 'decl', name: nm.v, init: init, type: 'auto', kind: 'scalar', line: nm.line };
        }
        case 'input': case 'read': {
          this.p++;
          return { k: 'input', target: this.parseExpr(), line: t.line };
        }
      }
    }
    // 类型前缀声明：int x / integer x = 3 / real s / bool flag（等价于 声明 + 可选初始化）
    if (t.t === 'kw' && TYPE_KW.indexOf(t.v) >= 0) {
      var saveP = this.p;
      var tyTok = this.next();
      var tyName = NORM_TYPE[tyTok.v] || (tyTok.v === 'array' ? 'auto' : tyTok.v);
      var nmTok = this.peek();
      if (nmTok.t === 'id') {
        this.p++;
        var dInit = null;
        if (this.accept('=') || this.accept('<-')) dInit = this.parseExpr();
        return { k: 'decl', name: nmTok.v, kind: 'scalar', type: tyName, init: dInit, line: t.line };
      }
      this.p = saveP;
    }
    var start = this.p;
    var startsWithId = (t.t === 'id');
    var ex = this.parseExpr();
    var guard = 0;
    while (startsWithId && this.at('[') && guard++ < 8) {
      this.p++;
      var ix0 = this.parseExpr();
      if (this.at('..')) { this.p++; ix0 = { k: 'range', lo: ix0, hi: this.parseExpr() }; }
      this.expect(']');
      ex = IX(ex, ix0);
    }
    if (ex.k === 'var' && this.atT('id') && String(this.peek().v).toLowerCase() === 'as') {
      this.p++;
      var asTok = this.peek();
      var asType = 'auto';
      if (asTok.t === 'kw' && TYPE_KW.indexOf(asTok.v) >= 0) { asType = NORM_TYPE[asTok.v] || asTok.v; this.p++; }
      else if (asTok.t === 'id') { asType = asTok.v; this.p++; }
      var asInit = null;
      if (this.accept('=') || this.accept('<-')) asInit = this.parseExpr();
      return { k: 'decl', name: ex.name, kind: 'scalar', type: asType, init: asInit, line: t.line };
    }
    if (ex.k === 'var' && this.at(':')) {
      this.p++;
      return this.parseVarDecl(ex, t.line);
    }
    if (isRangeShape(ex) && !this.at('=') && !this.at('<-') && !this.at('.') && !this.at('(')) {
      // 允许 dp[1..n] : int / dp[0..W] as int 这类「先写形状再写类型」的声明
      if (this.at(':') || (this.atT('id') && String(this.peek().v).toLowerCase() === 'as')) return this.parseVarDecl(ex, t.line);
      var szs = [], node = ex;
      while (node.k === 'index') { szs.unshift({ lo: node.index.lo, hi: node.index.hi }); node = node.obj; }
      if (node.k === 'var') return { k: 'decl', name: node.name, kind: 'array', sizes: szs, type: 'auto', init: null, line: t.line };
    }
    if (ex.k === 'index' && ex.index.k === 'range' && (this.at('=') || this.at('<-'))) {
      this.p++;
      return { k: 'sliceAssign', target: ex, e: this.parseExpr(), line: t.line };
    }
    if (this.at('=') || this.at('<-') || this.at('+=') || this.at('-=') || this.at('*=') || this.at('/=') || this.at('%=')) {
      var op = this.next().v;
      if (op === '<-') op = '=';
      var rhs = this.parseExpr();
      if (ex.k === 'var') return { k: 'assign', target: ex, op: op, e: rhs, line: t.line };
      if (ex.k === 'index') return { k: 'assignIndex', target: ex, op: op, e: rhs, line: t.line };
      this.err('赋值号左边必须是变量或数组元素');
      return { k: 'exprstmt', e: ex };
    }
    if (ex.k === 'call') return { k: 'exprstmt', e: ex };
    if (ex.k === 'index' && isRangeShape(ex)) {
      var szs = [], node = ex;
      while (node.k === 'index') { szs.unshift({ lo: node.index.lo, hi: node.index.hi }); node = node.obj; }
      if (node.k === 'var') return { k: 'decl', name: node.name, kind: 'array', sizes: szs, type: 'auto', init: null, line: t.line };
      this.err('数组声明写法有误');
      return { k: 'exprstmt', e: ex };
    }
    if (ex.k !== 'var' && ex.k !== 'index' && ex.k !== 'member') {
      this.err('无法理解的语句');
      return { k: 'exprstmt', e: ex };
    }
    this.p = start;
    return this.parseFallbackAssign(t);
  };

  Parser.prototype.parseFallbackAssign = function (t) {
    if (t.t !== 'id') { this.err('无法理解的语句'); this.p++; return null; }
    var name = this.next().v;
    var probe = V(name), guard = 0;
    while (this.at('[') && guard++ < 8) {
      this.p++;
      var ix = this.parseExpr();
      if (this.at('..')) { this.p++; ix = { k: 'range', lo: ix, hi: this.parseExpr() }; }
      this.expect(']');
      probe = IX(probe, ix);
    }
    if (this.at(':')) { this.p++; return this.parseVarDecl(probe.k === 'var' ? probe : { k: 'var', name: name }, t.line); }
    if (this.at('=') || this.at('<-')) {
      this.p++;
      var rhs = this.parseExpr();
      return probe.k === 'var' ? { k: 'assign', target: probe, op: '=', e: rhs, line: t.line } : { k: 'assignIndex', target: probe, op: '=', e: rhs, line: t.line };
    }
    this.err('无法理解的语句');
    return { k: 'exprstmt', e: probe };
  };

  Parser.prototype.parseVarDecl = function (ex, line) {
    var kind = 'scalar', type = 'auto', sizes = [];
    var colonLead = this.at(':');
    if (colonLead) this.p++;
    if (this.atT('id') && String(this.peek().v).toLowerCase() === 'array') { var aw = this.peek(); this.ts[this.p] = { t: 'kw', v: 'array', line: aw.line, col: aw.col }; }
    var t = this.peek();
    if (t.t === 'kw' && TYPE_KW.indexOf(t.v) >= 0) {
      if (t.v === 'array') {
        this.p++; kind = 'array';
        while (this.at('[')) sizes.push(this.parseIndexSpec());
        if (this.acceptKw('of')) { var u = this.peek(); if (u.t === 'kw' && TYPE_KW.indexOf(u.v) >= 0) { type = NORM_TYPE[u.v] || u.v; this.p++; } else if (u.t === 'id') { type = u.v; this.p++; } }
      } else {
        type = NORM_TYPE[t.v] || t.v;
        this.p++;
        while (this.at('[')) { kind = 'array'; sizes.push(this.parseIndexSpec()); }
      }
    } else if (t.t === 'id' && String(t.v).toLowerCase() !== 'as') {
      type = t.v; this.p++;
      while (this.at('[')) { kind = 'array'; sizes.push(this.parseIndexSpec()); }
    }
    if (!colonLead && this.at(':')) { colonLead = true; this.p++; }
    if (this.atT('id') && String(this.peek().v).toLowerCase() === 'as') {
      this.p++;
      var asT = this.peek();
      if (asT.t === 'kw' && TYPE_KW.indexOf(asT.v) >= 0) { if (asT.v === 'array') kind = 'array'; else type = NORM_TYPE[asT.v] || asT.v; this.p++; }
      else if (asT.t === 'id') { type = asT.v; this.p++; }
    }
    if (ex && ex.k === 'index') {
      var shp = [], node2 = ex;
      while (node2 && node2.k === 'index') { shp.unshift(node2.index); node2 = node2.obj; }
      if (node2 && node2.k === 'var') {
        var allRange = shp.length > 0, si;
        for (si = 0; si < shp.length; si++) if (!shp[si] || shp[si].k !== 'range') allRange = false;
        if (allRange) { kind = 'array'; sizes = shp.map(function (r2) { return { lo: r2.lo, hi: r2.hi }; }); }
      }
    }
    if (kind === 'array' && !sizes.length && ex && ex.k === 'index' && ex.index && ex.index.k === 'range')
      sizes = [{ lo: ex.index.lo, hi: ex.index.hi }];
    var init = null;
    if (this.accept('=') || this.accept('<-')) init = this.parseExpr();
    if (kind === 'array' && !sizes.length) sizes.push({ lo: N(1), hi: N(8) });
    return { k: 'decl', name: ex.name, kind: kind, sizes: sizes, type: type, init: init, line: line };
  };

  Parser.prototype.skipType = function (startLine) {
    var guard = 0;
    while (guard++ < 6) {
      var t = this.peek();
      if (t.t !== 'kw' || TYPE_KW.indexOf(t.v) < 0) break;
      var nx = this.peek(1);
      // 同一行里「类型 + 变量名」→ 那是声明（如 int cur = A[1]），不是返回类型
      if (nx && nx.t === 'id' && t.v !== 'array' && nx.line === t.line) break;
      // 类型关键字另起一行 → 同样是声明，不是返回类型
      if (this.p > 0) {
        var prev = this.ts[this.p - 1];
        if (prev && prev.line !== t.line && t.v !== 'array') break;
      }
      this.p++;
      if (t.v === 'array') {
        while (this.at('[')) { this.p++; var g2 = 0; while (!this.at(']') && !this.atT('eof') && g2++ < 50) this.p++; this.accept(']'); }
        if (this.acceptKw('of')) { var u = this.peek(); if (u.t === 'kw' && TYPE_KW.indexOf(u.v) >= 0) this.p++; else if (u.t === 'id') this.p++; }
      }
    }
  };

  Parser.prototype.parseFunction = function (retType) {
    var t = this.next();
    var nameT = this.next();
    if (nameT.t !== 'id') { this.err('函数定义缺少函数名'); nameT = { v: 'anonymous' }; }
    var name = nameT.v;
    var params = [];
    if (this.at('(')) {
      this.p++;
      while (!this.at(')') && !this.atT('eof')) {
        var p = this.next();
        var pPreType = null;
        // C/Java 风格形参：int n / integer x / real s / array A[1..n]
        if (p.t === 'kw' && TYPE_KW.indexOf(p.v) >= 0) {
          pPreType = (p.v === 'array') ? 'auto' : (NORM_TYPE[p.v] || p.v);
          p = this.next();
        }
        if (p.t !== 'id') { this.err('参数列表写法有误'); break; }
        var pi = { name: p.v, kind: 'scalar', sizes: [], type: pPreType || 'auto' };
        while (this.at('[')) { pi.kind = 'array'; pi.sizes.push(this.parseIndexSpec()); }
        if (this.accept(':')) {
          var ty = this.peek();
          if (ty.t === 'kw' && TYPE_KW.indexOf(ty.v) >= 0) {
            if (ty.v === 'array') {
              pi.kind = 'array'; this.p++;
              while (this.at('[')) pi.sizes.push(this.parseIndexSpec());
              if (this.acceptKw('of')) { var u2 = this.peek(); if (u2.t === 'id' || (u2.t === 'kw' && TYPE_KW.indexOf(u2.v) >= 0)) this.p++; }
            } else { pi.type = NORM_TYPE[ty.v] || ty.v; this.p++; while (this.at('[')) { pi.kind = 'array'; pi.sizes.push(this.parseIndexSpec()); } }
          } else if (ty.t === 'id') { pi.type = ty.v; this.p++; while (this.at('[')) { pi.kind = 'array'; pi.sizes.push(this.parseIndexSpec()); } }
        }
        if (pi.kind === 'array' && !pi.sizes.length) pi.sizes.push({ lo: N(1), hi: N(8) });
        params.push(pi);
        if (!this.accept(',')) break;
      }
      this.expect(')');
    }
    if (this.at(':')) { this.p++; this.skipType(); }
    // 只有紧跟函数头同一行的 “return” 才是返回类型标注；函数体里的 return 绝不能被吞掉
    if (this.isKw('return') && this.peek().line === t.line) { this.p++; this.skipType(); }
    if (this.isKw('do') || this.isKw('then')) this.p++;
    var body;
    if (this.at('{')) { this.p++; body = this.parseBlock(['}']); this.expect('}'); }
    else { body = this.parseBlock(BLOCK_TERMS.concat(['function', 'procedure'])); this.accept('end'); }
    return { k: 'func', name: name, params: params, body: body, line: t.line };
  };

  Parser.prototype.parseIf = function () {
    var t = this.next();
    var cond = this.parseExpr();
    if (this.isKw('then') || this.isKw('do')) this.p++;
    var body;
    if (this.at('{')) { this.p++; body = this.parseBlock(['}']); this.expect('}'); }
    else body = this.parseBlock(BLOCK_TERMS.concat(['else']));
    var els = null;
    if (this.isKw('else')) {
      this.p++;
      if (this.isKw('if')) els = [this.parseIf()];
      else if (this.at('{')) { this.p++; els = this.parseBlock(['}']); this.expect('}'); }
      else els = this.parseBlock(BLOCK_TERMS.concat(['else']));
    }
    if (this.at('}')) { this.p++; }
    else if (this.isKw('end') || this.isKw('endif') || this.isKw('fi')) this.p++;
    return { k: 'if', cond: cond, body: body, els: els, line: t.line };
  };

  Parser.prototype.parseWhile = function () {
    var t = this.next();
    var cond = this.parseExpr();
    if (this.isKw('do') || this.isKw('then')) this.p++;
    var body;
    if (this.at('{')) { this.p++; body = this.parseBlock(['}']); this.expect('}'); }
    else body = this.parseBlock(BLOCK_TERMS.concat(['od']));
    if (this.at('}')) this.p++;
    else if (this.isKw('end') || this.isKw('endwhile') || this.isKw('od')) this.p++;
    return { k: 'while', cond: cond, body: body, line: t.line };
  };

  Parser.prototype.parseRepeat = function () {
    var t = this.next();
    var body;
    if (this.at('{')) { this.p++; body = this.parseBlock(['}']); this.expect('}'); }
    else body = this.parseBlock(['until']);
    this.acceptKw('until');
    var cond = this.parseExpr();
    return { k: 'repeat', body: body, cond: cond, line: t.line };
  };

  Parser.prototype.parseFor = function () {
    var kw = this.next();
    var eachMode = (kw.v === 'each' || kw.v === 'foreach');
    var kw2 = this.peek(1);
    if (eachMode && kw2) {
      if (kw2.t === 'op' && ['=', ':=', '<-'].indexOf(kw2.v) >= 0) eachMode = false;
      else if (kw2.t === 'kw' && ['from', 'to', 'downto', 'step', 'by'].indexOf(kw2.v) >= 0) eachMode = false;
    }
    if (!eachMode && this.isKw('each')) { this.p++; eachMode = true; }
    if (this.peek().t === 'id' && this.peek(1) && this.peek(1).t === 'kw' && this.peek(1).v === 'in') {
      var v2 = this.next().v; this.p++;
      var rng = this.parseExpr();
      if (this.isKw('do') || this.isKw('then')) this.p++;
      var b2;
      if (this.at('{')) { this.p++; b2 = this.parseBlock(['}']); this.expect('}'); }
      else { b2 = this.parseBlock(BLOCK_TERMS.concat(['endfor'])); if (this.at('}')) this.p++; else if (this.isKw('end') || this.isKw('endfor')) this.p++; }
      if (rng.k === 'range') return { k: 'for', v: v2, from: rng.lo, to: rng.hi, step: N(1), body: b2, line: kw.line };
      if (rng.k === 'call' && (rng.name === 'range' || rng.name === 'rangeList') && rng.args.length === 1 && rng.args[0].k === 'range')
        return { k: 'for', v: v2, from: rng.args[0].lo, to: rng.args[0].hi, step: N(1), body: b2, line: kw.line };
      return { k: 'foreach', v: v2, arr: rng, body: b2, line: kw.line };
    }
    if (eachMode) {
      var v3 = this.next();
      if (v3.t !== 'id') this.err('for-each 缺少循环变量');
      this.acceptKw('in');
      var arr3 = this.parseExpr();
      if (this.isKw('do') || this.isKw('then')) this.p++;
      var b3;
      if (this.at('{')) { this.p++; b3 = this.parseBlock(['}']); this.expect('}'); }
      else { b3 = this.parseBlock(BLOCK_TERMS.concat(['endfor'])); if (this.at('}')) this.p++; else if (this.isKw('end') || this.isKw('endfor')) this.p++; }
      return { k: 'foreach', v: v3.t === 'id' ? v3.v : '_i', arr: arr3, body: b3, line: kw.line };
    }
    var vt = this.next();
    if (vt.t !== 'id') { this.err('for 语句缺少循环变量'); return { k: 'block', body: [], line: kw.line }; }
    this.accept('='); this.accept(':='); this.accept('<-');
    if (this.at('from') || this.isKw('from')) this.p++;
    var from = this.parseExpr();
    var down = this.acceptKw('downto');
    if (this.at('to')) this.p++;
    if (!down) this.accept('..');
    var to = this.parseExpr();
    var step = N(1);
    if (this.at('step') || this.at('by')) { this.p++; step = this.parseExpr(); }
    if (down) step = U('-', step);
    if (this.isKw('do') || this.isKw('then')) this.p++;
    var body;
    if (this.at('{')) { this.p++; body = this.parseBlock(['}']); this.expect('}'); }
    else { body = this.parseBlock(BLOCK_TERMS.concat(['endfor'])); if (this.at('}')) this.p++; else if (this.isKw('end') || this.isKw('endfor')) this.p++; }
    return { k: 'for', v: vt.v, from: from, to: to, step: step, body: body, line: kw.line };
  };

  Parser.prototype.parseSwap = function () {
    var wrap = this.accept('(');
    var a = this.parseExpr();
    if (!this.accept(',')) this.accept(';');
    var b = this.parseExpr();
    if (wrap) this.accept(')');
    return { k: 'swap', a: a, b: b };
  };

  Parser.prototype.parseArgs = function () {
    var args = [];
    if (this.accept('(')) {
      if (!this.at(')')) { do { args.push(this.parseExpr()); } while (this.accept(',')); }
      this.expect(')');
    } else {
      var guard = 0;
      while (guard++ < 40) {
        if (this.at(';') || this.atT('eof') || this.at('}')) break;
        var t = this.peek();
        if (t.t === 'kw' && BLOCK_TERMS.concat(['else', 'endif', 'endfor', 'endwhile', 'od', 'fi']).indexOf(t.v) >= 0) break;
        if (t.t === 'id' && this.peek(1) && this.peek(1).v === '=') break;
        args.push(this.parseExpr());
        if (!this.accept(',')) break;
      }
    }
    return args;
  };

  Parser.prototype.parseIndexSpec = function () {
    this.expect('[');
    var e1 = this.parseExpr();
    var e2 = null;
    if (this.accept('..')) e2 = this.parseExpr();
    this.expect(']');
    if (e2 == null) e2 = B('+', e1, N(1));
    return { lo: e1, hi: e2 };
  };

  Parser.prototype.parseExpr = function () { return this.parseTernary(); };
  Parser.prototype.parseTernary = function () {
    var c = this.parseBin(1);
    if (this.at('?')) { this.p++; var a = this.parseExpr(); this.expect(':'); var b = this.parseExpr(); return { k: 'tern', cond: c, a: a, b: b }; }
    return c;
  };
  Parser.prototype.parseBin = function (minPrec) {
    var left = this.parseUnary();
    for (;;) {
      var t = this.peek();
      if (!t || (t.t !== 'op' && t.t !== 'kw')) break;
      var op = t.v;
      if ((op === 'or' && this.peek(1) && this.peek(1).v === 'else') || (op === 'and' && this.peek(1) && this.peek(1).v === 'also')) { }
      var prec = PREC[op];
      if (prec === undefined || prec < minPrec) break;
      this.p++;
      if ((op === 'or' && this.isKw('else'))) this.p++;
      if ((op === 'and' && this.isKw('also'))) this.p++;
      var nextMin = (op === '^' || op === '**') ? prec : prec + 1;
      var right = this.parseBin(nextMin);
      left = B(op, left, right);
    }
    return left;
  };
  Parser.prototype.parseUnary = function () {
    var t = this.peek();
    if (t.t === 'op' && (t.v === '-' || t.v === '+' || t.v === '!')) { this.p++; return U(t.v, this.parseUnary()); }
    if (t.t === 'kw' && t.v === 'not') { this.p++; return U('not', this.parseUnary()); }
    return this.parsePostfix(this.parsePrimary());
  };
  Parser.prototype.parsePostfix = function (e) {
    for (;;) {
      if (this.at('[')) {
        this.p++;
        var ix = this.parseExpr();
        if (this.accept('..')) ix = { k: 'range', lo: ix, hi: this.parseExpr() };
        this.expect(']');
        e = IX(e, ix);
        continue;
      }
      if (this.at('(') && e.k === 'var') {
        this.p++;
        var args = [];
        if (!this.at(')')) { do { args.push(this.parseExpr()); } while (this.accept(',')); }
        if (this.at(']')) this.p++;
        else this.expect(')');
        e = C(e.name, args);
        continue;
      }
      if (this.at('.')) {
        var nx = this.peek(1);
        if (nx && nx.t === 'id' && (nx.v === 'length' || nx.v === 'len' || nx.v === 'size')) { this.p += 2; e = C('len', [e]); continue; }
        if (nx && nx.t === 'id') {
          this.p += 2;
          if (this.at('(')) {
            this.p++;
            var a2 = [];
            if (!this.at(')')) { do { a2.push(this.parseExpr()); } while (this.accept(',')); }
            this.expect(')');
            e = { k: 'methodcall', obj: e, name: nx.v, args: a2 };
          } else e = { k: 'member', obj: e, name: nx.v };
          continue;
        }
      }
      break;
    }
    return e;
  };
  Parser.prototype.parsePrimary = function () {
    var t = this.next();
    if (t.t === 'number') return N(t.num);
    if (t.t === 'string') return { k: 'str', v: t.v };
    if (t.t === 'kw') {
      if (t.v === 'true') return { k: 'bool', v: true };
      if (t.v === 'false') return { k: 'bool', v: false };
      if (t.v === 'null' || t.v === 'nil') return { k: 'null' };
      if (t.v === 'new') { this.acceptKw('array'); while (this.at('[')) this.parseIndexSpec(); return { k: 'newarray', sizes: [] }; }
      if (t.v === 'not') return U('not', this.parseUnary());
      if ((t.v === 'length' || t.v === 'len') && this.at('(')) {
        this.p++;
        var largs = [];
        if (!this.at(')')) { do { largs.push(this.parseExpr()); } while (this.accept(',')); }
        this.expect(')');
        return C('len', largs);
      }
    }
    if (t.t === 'id') {
      if (this.at('(')) {
        this.p++;
        var args = [];
        if (!this.at(')')) { do { args.push(this.parseExpr()); } while (this.accept(',')); }
        this.expect(')');
        return C(t.v, args);
      }
      return V(t.v);
    }
    if (t.t === 'op' && t.v === '(') {
      var inner = this.parseExpr();
      if (this.at('..')) { this.p++; var hi = this.parseExpr(); this.expect(')'); return { k: 'range', lo: inner, hi: hi }; }
      this.expect(')');
      return inner;
    }
    if (t.t === 'op' && t.v === '[') {
      var items = [];
      if (!this.at(']')) { do { items.push(this.parseExpr()); } while (this.accept(',')); }
      this.expect(']');
      return { k: 'arraylit', items: items };
    }
    this.err('表达式有误，遇到 “' + (t.v !== undefined ? t.v : t.t) + '”');
    return N(0);
  };

  function parse(src) {
    var toks;
    try { toks = new Lexer(src).tokenize(); }
    catch (e) { return { ast: null, diags: [{ level: 'error', line: 1, col: 1, msg: String(e.message || e) }] }; }
    var p = new Parser(toks);
    var ast = null;
    try { ast = p.parseProgram(); }
    catch (e) { p.diags.push({ level: 'error', line: 1, col: 1, msg: '解析中断：' + String(e.message || e) }); }
    return { ast: ast, diags: p.diags };
  }

  /* ===================== 3. 复杂度代数 ===================== */

  var VLOG = '\u2113';
  function term(coef, exp, opt) {
    var t = { coef: coef === undefined ? 1 : coef, exp: exp || {}, opt: !!opt };
    trim(t); return t;
  }
  function trim(t) { for (var k in t.exp) if (!t.exp[k]) delete t.exp[k]; return t; }
  function tKey(t) { var ks = Object.keys(t.exp).sort(); return ks.map(function (k) { return k + '^' + t.exp[k]; }).join('*') + (t.opt ? '~' : ''); }
  function tDeg(t) { var d = 0; for (var k in t.exp) d += t.exp[k]; return d; }
  function isConst(t) { return Object.keys(t.exp).length === 0 && !t.big; }
  function soleVar(t) { var ks = Object.keys(t.exp); return (ks.length === 1 && t.exp[ks[0]] === 1) ? ks[0] : null; }
  function isTermLike(x) {
    return !!(x && typeof x === 'object' && !Array.isArray(x) && x.exp && typeof x.coef === 'number');
  }
  function collectTerms(node, acc, depth) {
    depth = depth || 0;
    if (depth > 6 || node == null) return acc;
    if (Array.isArray(node)) {
      for (var i = 0; i < node.length; i++) collectTerms(node[i], acc, depth + 1);
      return acc;
    }
    if (isTermLike(node)) acc.push(node);
    return acc;
  }
  function sumTerms(list) {
    var terms = collectTerms(list, [], 0), map = {}, i, t, key;
    for (i = 0; i < terms.length; i++) {
      t = terms[i];
      key = tKey(t);
      if (!map[key]) {
        map[key] = { coef: 0, exp: {}, opt: !!t.opt, big: t.big, fn: t.fn };
        for (var ek in t.exp) map[key].exp[ek] = t.exp[ek];
      }
      map[key].coef += t.coef;
      map[key].opt = map[key].opt && t.opt;
      if (!map[key].fn) map[key].fn = t.fn;
      if (!map[key].big) map[key].big = t.big;
    }
    var out = [];
    for (var k in map) if (map[k] && (map[k].coef !== 0 || map[k].big || map[k].fn)) out.push(map[k]);
    return out;
  }
  function mulTerms(list) {
    var res = [term(1, {})], i, a, b, k, ts, e, next;
    for (i = 0; i < list.length; i++) {
      ts = list[i] || [];
      if (!ts.length) continue;
      next = [];
      for (a = 0; a < res.length; a++) for (b = 0; b < ts.length; b++) {
        e = {};
        for (k in res[a].exp) e[k] = res[a].exp[k];
        for (k in ts[b].exp) e[k] = (e[k] || 0) + ts[b].exp[k];
        var nt = term(res[a].coef * ts[b].coef, e, res[a].opt && ts[b].opt);
        nt.fn = res[a].fn || ts[b].fn;
        if (res[a].big) nt.big = res[a].big;
        next.push(nt);
      }
      res = next;
    }
    return sumTerms([res]);
  }
  function scaleTerm(t, c) { var n = term(t.coef * c, {}, t.opt); for (var k in t.exp) n.exp[k] = t.exp[k]; n.big = t.big; n.fn = t.fn; return n; }
  function scaleList(ts, c) { return (ts || []).map(function (t) { return scaleTerm(t, c); }); }
  function growthRank(t) {
    if (t.big) return 1e9;
    var L = t.exp[VLOG] || 0;
    var D = 0, k;
    for (k in t.exp) if (k !== VLOG) D += t.exp[k];
    var nv = 0;
    for (k in t.exp) if (k !== VLOG) nv++;
    if (D === 0 && L === 0) return 0;
    if (D === 0) return 0.5 + L * 0.01;          // log 级
    return D * 100 + L * 10 + nv;                 // 多项式：先次数，再 log 因子，再多变量
  }
  function cmpTerm(a, b) {
    var ra = growthRank(a), rb = growthRank(b);
    if (ra !== rb) return rb - ra;
    var wa = Math.abs(a.coef) * (a.opt ? 0.4 : 1);
    var wb = Math.abs(b.coef) * (b.opt ? 0.4 : 1);
    if (wa !== wb) return wb - wa;
    return tDeg(b) - tDeg(a);
  }
  function sortTerms(ts) { return (ts || []).slice().sort(cmpTerm); }
  function dominant(ts) { var s = sortTerms(ts); return s.length ? s[0] : term(1, {}); }
  function fmtTerm(t) {
    if (t.big) return '2^' + t.big;
    var ks = Object.keys(t.exp).sort(), parts = [], i;
    for (i = 0; i < ks.length; i++) {
      var k = ks[i], p = t.exp[k];
      if (k === VLOG) parts.push(p === 1 ? 'log n' : 'log^' + p + ' n');
      else parts.push(p === 1 ? k : k + '^' + p);
    }
    var mag = Math.abs(t.coef);
    var magStr = Math.abs(mag - Math.round(mag)) < 1e-9 ? String(Math.round(mag)) : String(Math.round(mag * 100) / 100);
    var sign = t.coef < 0 ? '-' : '';
    if (!parts.length) return (t.coef < 0 ? '-' : '') + magStr;
    return (mag === 1 ? sign : sign + magStr) + parts.join('\u00b7');
  }
  function fmtExpr(ts) {
    var s = sortTerms(ts);
    if (!s.length) return '0';
    return s.map(fmtTerm).join(' + ');
  }
  function maxList(a, b) {
    var sa = sortTerms(a), sb = sortTerms(b);
    if (!sa.length) return sb;
    if (!sb.length) return sa;
    return cmpTerm(sa[0], sb[0]) <= 0 ? sa : sb;
  }
  function classOf(ts) {
    var d = dominant(ts);
    if (!d) return 'O(1)';
    if (d.big) return 'O(2^' + d.big + ')';
    var L = d.exp[VLOG] || 0, D = 0, _k;
    for (_k in d.exp) if (_k !== VLOG) D += d.exp[_k];
    var vs = Object.keys(d.exp).filter(function (k) { return k !== VLOG; });
    if (D === 0 && L === 0) return 'O(1)';
    if (vs.length === 1 && vs[0] === 'n') {
      if (L === 0) return D === 1 ? 'O(n)' : 'O(n^' + D + ')';
      if (D === 1 && L === 1) return 'O(n log n)';
      if (D === 1 && L === 2) return 'O(n log^2 n)';
      return 'O(n^' + D + ' log^' + L + ' n)';
    }
    var nm = vs.length ? vs.join('\u00b7') : 'n';
    if (D === 1 && L === 1) return 'O(' + nm + ' log ' + nm + ')';
    if (D === 1 && L === 0) return 'O(' + nm + ')';
    if (D === 0 && L === 1) return 'O(log ' + nm + ')';
    return 'O(' + (D === 1 ? nm : nm + '^' + D) + (L ? ' log^' + L + ' ' + nm : '') + ')';
  }
  function isPolynomial(ts) { for (var i = 0; i < ts.length; i++) if (ts[i].big) return false; return true; }
  function fmtNum(x) {
    if (typeof x !== 'number' || !isFinite(x)) return String(x);
    var ax = Math.abs(x);
    if (ax >= 1e6 || (ax < 1e-3 && x !== 0)) return x.toExponential(2);
    return String(Math.round(x * 1000) / 1000);
  }

  /* ===================== 4. 语义分析 ===================== */

  var BUILTINS = ['len', 'length', 'min', 'max', 'abs', 'sqrt', 'floor', 'ceil', 'pow', 'swap', 'sort', 'reverse',
    'sum', 'random', 'range', 'print', 'str', 'int', 'float', 'copy', 'fill', 'log2'];

  function freeNames(e, out) {
    out = out || {};
    if (!e) return out;
    switch (e.k) {
      case 'var': out[e.name] = 1; break;
      case 'bin': freeNames(e.l, out); freeNames(e.r, out); break;
      case 'un': freeNames(e.e, out); break;
      case 'index': freeNames(e.obj, out); freeNames(e.index, out); break;
      case 'call':
        if (BUILTINS.indexOf(e.name) < 0) out[e.name] = 1;
        (e.args || []).forEach(function (a) { freeNames(a, out); });
        break;
      case 'range': freeNames(e.lo, out); freeNames(e.hi, out); break;
      case 'tern': freeNames(e.cond, out); freeNames(e.a, out); freeNames(e.b, out); break;
      case 'arraylit': (e.items || []).forEach(function (a) { freeNames(a, out); }); break;
      case 'member': freeNames(e.obj, out); break;
    }
    return out;
  }
  function rootName(e) { var g = 0; while (e && e.k === 'index' && g++ < 30) e = e.obj; return e && e.k === 'var' ? e.name : '?'; }
  function containsCall(expr, target) {
    var found = false;
    (function w(x) {
      if (!x || found) return;
      if (x === target) { found = true; return; }
      if (x.k === 'bin') { w(x.l); w(x.r); return; }
      if (x.k === 'un') { w(x.e); return; }
      if (x.k === 'index') { w(x.obj); w(x.index); return; }
      if (x.k === 'call') { (x.args || []).forEach(w); return; }
      if (x.k === 'tern') { w(x.cond); w(x.a); w(x.b); return; }
      if (x.k === 'arraylit') { (x.items || []).forEach(w); return; }
    })(expr);
    return found;
  }
  function isBoolExpr(e) {
    return !!(e && ((e.k === 'bin' && ['<', '>', '<=', '>=', '==', '!=', 'and', 'or', '&&', '||'].indexOf(e.op) >= 0) || e.k === 'bool' || (e.k === 'un' && e.op === 'not')));
  }
  function strOf(e) {
    if (!e) return '?';
    switch (e.k) {
      case 'num': return String(e.v);
      case 'var': return e.name;
      case 'bin': return '(' + strOf(e.l) + ' ' + e.op + ' ' + strOf(e.r) + ')';
      case 'un': return e.op + strOf(e.e);
      case 'call': return e.name + '(' + (e.args || []).map(strOf).join(',') + ')';
      case 'index': return strOf(e.obj) + '[' + strOf(e.index) + ']';
      case 'str': return JSON.stringify(e.v);
      default: return '?';
    }
  }
  function similarName(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (RE_CN.test(b) && a.indexOf(b) >= 0) return 0.9;
    if (RE_CN.test(a) && b.indexOf(a) >= 0) return 0.9;
    return 0;
  }

  function buildEnv(ast) {
    var env = { params: [], vars: [], arrays: {}, scalars: {}, decls: [], funcNames: {} }, i, j;
    for (i = 0; i < ast.body.length; i++) {
      if (ast.body[i].k !== 'func') continue;
      var fn = ast.body[i];
      env.funcNames[fn.name] = 1;
      for (j = 0; j < fn.params.length; j++) {
        var p = fn.params[j];
        env.params.push(p.name);
        if (p.kind === 'array') env.arrays[p.name] = [p.sizes && p.sizes.length ? p.sizes : [{ lo: N(1), hi: N(8) }]];
        else env.scalars[p.name] = p.type && p.type !== 'auto' ? p.type : 'int';
      }
    }
    (function () {
      function walk(list) {
        for (var q = 0; q < (list || []).length; q++) {
          var s = list[q]; if (!s) continue;
          if (s.k === 'decl' && s.kind === 'array' && !env.arrays[s.name]) env.arrays[s.name] = [s.sizes];
          else if (s.k === 'block' || s.k === 'program') walk(s.body);
          else if (s.k === 'if') { walk(s.body); walk(s.els); }
          else if (s.k === 'for' || s.k === 'foreach' || s.k === 'while' || s.k === 'repeat') walk(s.body);
        }
      }
      for (var q2 = 0; q2 < ast.body.length; q2++) if (ast.body[q2].k === 'func') walk(ast.body[q2].body);
    })();
    for (i = 0; i < ast.body.length; i++) {
      if (ast.body[i].k !== 'decl') continue;
      var d = ast.body[i];
      env.decls.push(d);
      env.vars.push(d.name);
      if (d.kind === 'array') env.arrays[d.name] = [d.sizes];
      else env.scalars[d.name] = d.type && d.type !== 'auto' ? d.type : 'auto';
    }
    return env;
  }

  function collectAssigned(ast) {
    var out = [];
    (function walk(nodes) {
      for (var i = 0; i < (nodes || []).length; i++) {
        var s = nodes[i]; if (!s) continue;
        if (s.k === 'assign') out.push(s.target.name);
        else if (s.k === 'assignIndex' || s.k === 'sliceAssign') out.push(rootName(s.target.obj));
        else if (s.k === 'block' || s.k === 'program') walk(s.body);
        else if (s.k === 'if') { walk(s.body); walk(s.els); }
        else if (s.k === 'for' || s.k === 'foreach' || s.k === 'while' || s.k === 'repeat') walk(s.body);
      }
    })(ast.body);
    return uniq(out);
  }
  function collectLoopVars(ast) {
    var out = {};
    (function walk(nodes) {
      for (var i = 0; i < (nodes || []).length; i++) {
        var s = nodes[i]; if (!s) continue;
        if (s.k === 'for' || s.k === 'foreach') { if (s.v) out[s.v] = 1; walk(s.body); }
        else if (s.k === 'while' || s.k === 'repeat') walk(s.body);
        else if (s.k === 'if') { walk(s.body); walk(s.els); }
      }
    })(ast.body);
    return out;
  }

  /* ---- 单个函数的控制流 / 复杂度分析 ---- */

  function analyzeFunction(fn, env, diags) {
    var info = {
      name: fn.name, params: [], body: [], peak: [], locals: [], loopVars: [], maxDepth: 0,
      freeVars: {}, selfCalls: [], callSites: [], memoWrites: 0, recursion: null, source: fn
    };
    var i;
    for (i = 0; i < fn.params.length; i++) info.params.push(fn.params[i].name);
    var assigned = collectAssigned({ body: fn.body });
    var loopVars = collectLoopVars({ body: fn.body });
    var locals = [];
    for (i = 0; i < assigned.length; i++) if (info.params.indexOf(assigned[i]) < 0 && !loopVars[assigned[i]]) locals.push(assigned[i]);
    for (i = 0; i < fn.body.length; i++) if (fn.body[i].k === 'decl') locals.push(fn.body[i].name);
    info.locals = uniq(locals);
    for (var lv in loopVars) info.loopVars.push(lv);

    /* 规模变量闭包：由 n 直接/间接推导出的变量（lo=n, hi=n, j=i-1 等） */
    var nScale = {};
    (function () {
      var eq = {};
      for (var q = 0; q < fn.body.length; q++) {
        var sq = fn.body[q];
        var tgt = null, rhs = null;
        if (sq.k === 'assign' && sq.target.k === 'var') { tgt = sq.target.name; rhs = sq.e; }
        if (tgt) eq[tgt] = rhs;
      }
      nScale['n'] = 1; nScale['N'] = 1;
      for (var pass = 0; pass < 4; pass++) {
        for (var k in eq) {
          if (nScale[k]) continue;
          var fs = Object.keys(freeNames(eq[k], {}));
          for (var z = 0; z < fs.length; z++) if (nScale[fs[z]]) { nScale[k] = 1; break; }
        }
      }
    })();
    info.nScale = nScale;

    function ctx(depth, loops) { return { depth: depth, loops: loops, holderId: null, inCond: false }; }
    var holderSeq = 0;
    function withHolder(c, id, inCond, expr) {
      return { depth: c.depth, loops: c.loops, holderId: id, inCond: !!inCond, holderExpr: expr || null };
    }
    function costSym(name) {
      if (name === 'n' || name === 'N' || name === 'size' || name === 'len') { var t = term(1, {}); t.exp = { n: 1 }; return [t]; }
      if (name === 'm' || name === 'M') { var t2 = term(1, {}); t2.exp = { m: 1 }; return [t2]; }
      return [term(1, {})];
    }
    function normExpr(ts) {
      var isC = function (t) { return !t.big && !t.fn && Object.keys(t.exp).length === 0; };
      var allC = true, i;
      for (i = 0; i < (ts || []).length; i++) if (!isC(ts[i])) allC = false;
      if (allC) return [term(1, {})];
      var out = [];
      for (i = 0; i < ts.length; i++) if (!isC(ts[i])) out.push(ts[i]);
      return out.length ? out : [term(1, {})];
    }
    function boundTerms(e) {
      if (!e) return [term(1, {})];
      var ts = costLocal(e, null), out = [], i, sawVar = false;
      for (i = 0; i < ts.length; i++) {
        var t = ts[i];
        if (!t.big && !t.fn && Object.keys(t.exp).length === 0) {
          if (t.coef > 1) out.push(term(1, {}));
        } else { out.push(t); sawVar = true; }
      }
      if (!out.length) out = [term(1, {})];
      return sawVar ? out : (out.length === 1 && out[0].coef === 1 ? [term(1, {})] : [term(1, {})]);
    }
    function costLocal(e, enclosingLoops) {
      if (!e) return [term(1, {})];
      var es = strOf(e);
      var base;
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(es)) base = costSym(es);
      else if (e.k === 'num') base = [term(e.v, {})];
      else base = exprCost(e, ctx(0, []));
      var names = Object.keys(freeNames(e, {}));
      var depends = false;
      for (var q = 0; q < names.length; q++) if (enclosingLoops && enclosingLoops.indexOf(names[q]) >= 0) depends = true;
      if (depends) base = mulTerms([base, [term(1, { n: 1 })]]);
      return base;
    }

    function exprCost(e, c) {
      if (!e) return [];
      switch (e.k) {
        case 'num': case 'str': case 'bool': case 'null': return [term(1, {})];
        case 'var': return costSym(e.name);
        case 'bin':
          if (e.op === '^' || e.op === '**') return [term(1, {})];
          return sumTerms([exprCost(e.l, c), exprCost(e.r, c), [term(1, {})]]);
        case 'un': return sumTerms([exprCost(e.e, c), [term(1, {})]]);
        case 'index': return sumTerms([exprCost(e.obj, c), exprCost(e.index, c), [term(1, {})]]);
        case 'member': return exprCost(e.obj, c);
        case 'tern': return sumTerms([exprCost(e.cond, c), maxList(exprCost(e.a, c), exprCost(e.b, c))]);
        case 'arraylit': return sumTerms([sumTerms((e.items || []).map(function (a) { return exprCost(a, c); })), [term(1 + (e.items ? e.items.length : 0), {})]]);
        case 'newarray': return [term(1, {})];
        case 'call': {
          var args = sumTerms((e.args || []).map(function (a) { return exprCost(a, c); }));
          if (e.name === fn.name) {
            var hid = c.holderId == null ? -1 : c.holderId;
            var inCond = !!c.inCond;
            var dup = 0, q;
            for (q = 0; q < info.selfCalls.length; q++) if (info.selfCalls[q].holderId === hid) dup++;
            info.selfCalls.push({ node: e, inLoop: c.loops.length > 0, holderId: hid, inCond: inCond, dupIndex: dup, holderExpr: c.holderExpr || null });
          }
          if (BUILTINS.indexOf(e.name) >= 0) {
            if (e.name === 'sort' || e.name === 'copy' || e.name === 'fill' || e.name === 'reverse' || e.name === 'sum') {
              var sz = sizeOfExpr((e.args || [])[0]);
              return sumTerms([args, sz, [term(1, {})]]);
            }
            return [term(1, {})];
          }
          var t = term(1, {});
          t.fn = e.name;
          return sumTerms([args, [t]]);
        }
        default: return [term(1, {})];
      }
    }
    function sizeOfExpr(e) {
      var nm = e && e.k === 'var' ? e.name : (e ? rootName(e) : '?');
      if (env.arrays[nm]) {
        var dims = env.arrays[nm][0] || [];
        if (dims.length) {
          var hi = dims[dims.length - 1].hi;
          var s = strOf(hi);
          if (/^\d+$/.test(s)) return [term(parseInt(s, 10), {})];
          return [term(1, { n: 1 })];
        }
      }
      return [term(1, {})];
    }
    function loopVarNames(n) {
      var out = [];
      if (n.k === 'for' || n.k === 'foreach') out.push(n.v);
      return out;
    }
    function logUpdate(n) {
      var res = { log: false, mul: false, half: false };
      var assigned = {};
      (function walk(nodes) {
        for (var i = 0; i < (nodes || []).length; i++) {
          var s = nodes[i]; if (!s) continue;
          if (s.k === 'assign' && s.target.k === 'var') assigned[s.target.name] = s.e;
          else if (s.k === 'block') walk(s.body);
          else if (s.k === 'if') { walk(s.body); walk(s.els); }
          else if (s.k === 'for' || s.k === 'foreach' || s.k === 'while' || s.k === 'repeat') walk(s.body);
        }
      })(n.body);
      function isHalving(e, depth) {
        if (!e || depth > 6) return false;
        if (e.k === 'bin' && (e.op === '/' || e.op === 'div')) return true;
        if (e.k === 'call' && (e.name === 'floor' || e.name === 'ceil' || e.name === 'int')) return isHalving(e.args && e.args[0], depth + 1);
        if (e.k === 'bin' && (e.op === '+' || e.op === '-')) return isHalving(e.l, depth + 1) || isHalving(e.r, depth + 1);
        if (e.k === 'var' && assigned[e.name]) return isHalving(assigned[e.name], depth + 1);
        return false;
      }
      var v;
      for (v in assigned) {
        if (isHalving(assigned[v], 0)) { res.log = true; res.half = true; }
        if (assigned[v] && assigned[v].k === 'bin' && assigned[v].op === '*') res.mul = true;
      }
      var condVars = n.cond ? freeNames(n.cond, {}) : {};
      for (var c2 in condVars) if (assigned[c2] && isHalving(assigned[c2], 0)) { res.log = true; res.half = true; }
      return res;
    }
    function iterations(n, c) {
      var c2 = ctx(c.depth, c.loops.concat(loopVarNames(n)));
      if (n.k === 'for') {
        var selfDep = !!freeNames(n.to, {})[n.v];
        var outerDep = false, nm2;
        var nms = Object.keys(freeNames(n.to, {}));
        for (nm2 = 0; nm2 < nms.length; nm2++) if (c.loops.indexOf(nms[nm2]) >= 0) outerDep = true;
        var to = boundTerms(n.to);
        if (selfDep) to = scaleList(to, 0.5);
        return to;
      }
      if (n.k === 'foreach') return sumTerms([sizeOfExpr(n.arr), [term(1, {})]]);
      var lu = logUpdate(n);
      if (lu.half || lu.log) { var lt = term(1, {}); lt.exp[VLOG] = 1; return sumTerms([[lt], [term(1, {})]]); }
      if (n.k === 'while' || n.k === 'repeat') {
        var cond = n.cond;
        var refs = cond ? freeNames(cond, {}) : {};
        var bound = null;
        function pickCmp(x) {
          if (!x || x.k !== 'bin') return null;
          if (['<', '<=', '>', '>=', '!=', '=='].indexOf(x.op) >= 0) {
            var loopVars = {};
            (function collectLV(nodes) {
              for (var q = 0; q < (nodes || []).length; q++) {
                var sq = nodes[q]; if (!sq) continue;
                if (sq.k === 'assign' && sq.target.k === 'var') loopVars[sq.target.name] = 1;
                else if (sq.k === 'block') collectLV(sq.body);
                else if (sq.k === 'if') { collectLV(sq.body); collectLV(sq.els); }
                else if (sq.k === 'for' || sq.k === 'foreach' || sq.k === 'while' || sq.k === 'repeat') collectLV(sq.body);
              }
            })(n.body);
            var hasLoop = function (y) {
              var fs = freeNames(y, {});
              for (var kk in fs) if (loopVars[kk]) return true;
              return false;
            };
            var hasN = function (y) { return !!freeNames(y, {})['n']; };
            if (hasLoop(x.l)) return x.l;
            if (hasLoop(x.r)) return x.r;
            if (hasN(x.l)) return x.l;
            if (hasN(x.r)) return x.r;
            return x.r;
          }
          if (x.op === 'and' || x.op === 'or') return pickCmp(x.l) || pickCmp(x.r);
          return null;
        }
        bound = pickCmp(cond);
        if (bound) {
          var bStr = strOf(bound);
          var t2 = boundTerms(bound);
          // 若上界是纯常量但条件里引用了参数/数组规模，说明循环次数与规模同阶
          var isConstTerm = t2.length === 1 && !t2[0].big && !t2[0].fn && Object.keys(t2[0].exp).length === 0;
          if (isConstTerm) {
            // 常量上界：若条件（或其变量）与输入规模有关，则按一次规模计
            var varsInCond = Object.keys(refs), scaleName = null, vi2;
            for (vi2 = 0; vi2 < varsInCond.length; vi2++) {
              var vn2 = varsInCond[vi2];
              if (info.params.indexOf(vn2) >= 0) { scaleName = (vn2 === 'n' || vn2 === 'N') ? 'n' : vn2; break; }
              if (env.arrays[vn2]) { scaleName = 'n'; break; }
              if (info.nScale && info.nScale[vn2]) { scaleName = 'n'; break; }
            }
            if (scaleName) return costSym(scaleName);
            return t2;
          }
          return t2;
        }
        return sumTerms([costSym(strOf(cond)), [term(1, {})]]);
      }
      return [term(1, {})];
    }

    function stmts(list, c) {
      var acc = [];
      for (var i = 0; i < list.length; i++) acc = acc.concat(stmt(list[i], c));
      return acc;
    }
    function stmt(s, c) {
      if (!s) return [];
      var i, j;
      switch (s.k) {
        case 'block': case 'program': return stmts(s.body, c);
        case 'func': return [];
        case 'decl': {
          if (s.kind === 'array') {
            var sz = [];
            for (j = 0; j < s.sizes.length; j++) {
              var hi = exprCost(s.sizes[j].hi, c);
              var lo = exprCost(s.sizes[j].lo, c);
              var span = sumTerms([hi, scaleList(lo, -1), [term(1, {})]]);
              sz = j === 0 ? span : mulTerms([sz, span]);
            }
            info.peak.push(sz);
            return sumTerms([sz, s.init ? exprCost(s.init, c) : [term(0.5, {})]]);
          }
          if (s.init) return exprCost(s.init, c);
          return [term(0.5, {})];
        }
        case 'assign': case 'assignIndex': {
          if (s.k === 'assignIndex') {
            var ix = s.target.index;
            if (ix && ix.k === 'var' && info.params.indexOf(ix.name) >= 0) info.memoWrites++;
          }
          return sumTerms([exprCost(s.e, withHolder(c, ++holderSeq, false, s.e)), [term(1, {})]]);
        }
        case 'sliceAssign': {
          var syn = { k: 'for', v: '__sl' + (c.depth + 1), from: s.target.index.lo, to: s.target.index.hi, step: N(1), body: [{ k: 'assignIndex', target: IX(s.target.obj, V('__sl' + (c.depth + 1))), e: s.e }] };
          return stmt(syn, c);
        }
        case 'exprstmt': return exprCost(s.e, withHolder(c, ++holderSeq, false, s.e));
        case 'return': return s.e ? exprCost(s.e, withHolder(c, ++holderSeq, false, s.e)) : [term(0.5, {})];
        case 'output': return sumTerms((s.args || []).map(function (a) { return exprCost(a, c); }));
        case 'swap': return sumTerms([exprCost(s.a, c), exprCost(s.b, c), [term(1, {})]]);
        case 'break': case 'continue': case 'input': return [term(1, {})];
        case 'if': {
          var head = exprCost(s.cond, withHolder(c, ++holderSeq, true));
          var bodyMax = [term(1, {})];
          var parts = [s.body, s.els].filter(Boolean);
          for (i = 0; i < parts.length; i++) bodyMax = maxList(bodyMax, stmts(parts[i], c));
          return sumTerms([head, bodyMax]);
        }
        case 'for': case 'foreach': case 'while': case 'repeat': {
          var depth = c.depth + 1;
          if (depth > info.maxDepth) info.maxDepth = depth;
          var inner = stmts(s.body, ctx(depth, c.loops.concat(loopVarNames(s))));
          var savedLoops = c.loops;
          c.loops = savedLoops.concat(loopVarNames(s));
          var cnt = iterations(s, c);
          c.loops = savedLoops;
          if (s.k === 'repeat') cnt = sumTerms([cnt, [term(1, {})]]);
          if (!inner.length) inner = [term(1, {})];
          inner = normExpr(inner);
          return mulTerms([cnt, inner]);
        }
        default: return [term(1, {})];
      }
    }
    info.body = sumTerms([stmts(fn.body, ctx(0, []))]);
    var fv = {};
    (function collectFree(nodes) {
      for (var i = 0; i < (nodes || []).length; i++) {
        var s = nodes[i]; if (!s) continue;
        var holder = s.e || s.cond || null;
        if (s.k === 'output') holder = { k: 'arraylit', items: s.args || [] };
        if (holder) {
          var f = freeNames(holder, {});
          for (var k in f) {
            if (info.params.indexOf(k) < 0 && info.locals.indexOf(k) < 0 && info.loopVars.indexOf(k) < 0 && k !== fn.name && !env.funcNames[k]) fv[k] = 1;
          }
          if (s.k === 'assign' || s.k === 'assignIndex') {
            var tg = s.k === 'assign' ? s.target.name : rootName(s.target.obj);
            if (info.params.indexOf(tg) < 0 && info.locals.indexOf(tg) < 0 && info.loopVars.indexOf(tg) < 0 && !env.funcNames[tg]) fv[tg] = 1;
          }
        }
        if (s.k === 'block' || s.k === 'program') collectFree(s.body);
        else if (s.k === 'if') { collectFree(s.body); collectFree(s.els); }
        else if (s.k === 'for' || s.k === 'foreach' || s.k === 'while' || s.k === 'repeat') {
          if (s.from) { var f1 = freeNames(s.from, {}); for (var k1 in f1) fv[k1] = 1; }
          collectFree(s.body);
        }
        else if (s.k === 'decl') collectFree(s.body);
      }
    })(fn.body);
    info.freeVars = fv;
    return info;
  }

  /* ---- 递归结构识别 ---- */

  function classifyRecursion(info) {
    var d = { pattern: 'none', patternName: '无递归', complexity: [], detail: [], confidence: 'high', calls: info.selfCalls.length };
    if (!info.selfCalls.length) return d;
    var inLoop = info.selfCalls.filter(function (c) { return c.inLoop; }).length;
    var outside = info.selfCalls.length - inLoop;
    var condCalls = info.selfCalls.filter(function (c) { return c.inCond; }).length;
    var sameExpr = false, sameIdx = {};
    info.selfCalls.forEach(function (c) {
      if (c.holderId == null || c.holderId < 0) return;
      sameIdx[c.holderId] = (sameIdx[c.holderId] || 0) + 1;
    });
    for (var sk in sameIdx) if (sameIdx[sk] >= 2) sameExpr = true;
    d.sameExpr = sameExpr; d.condCalls = condCalls;
    var halving = false, minusConst = false, i;
    for (i = 0; i < info.selfCalls.length; i++) {
      var args = info.selfCalls[i].node.args || [];
      for (var j = 0; j < args.length; j++) {
        var a = args[j];
        if (a.k === 'bin' && (a.op === '/' || a.op === 'div')) halving = true;
        if (a.k === 'bin' && a.op === '-' && a.r && (a.r.k === 'num' || a.r.k === 'var')) minusConst = true;
      }
    }
    var memo = info.memoWrites > 0;
    if (memo) {
      d.pattern = 'memo';
      d.patternName = '记忆化递归 / 动态规划';
      d.detail.push('检测到以下标为目标的写入（dp 表），每个状态只计算一次');
      var n1 = term(1, {}); n1.exp = { n: 1 };
      var m1 = term(0.5, { n: 1 });
      d.complexity = info.freeVars && Object.keys(info.freeVars).length > 1 ? [n1, m1] : [n1];
      d.confidence = 'medium';
      return d;
    }
    if (inLoop > 0) {
      d.pattern = 'linear';
      d.patternName = '线性递归（单支递归 + 循环）';
      d.detail.push('递归调用出现在循环体内：每层递归只减少常数规模，递归深度为 n');
      var t = term(1, {}); t.exp = { n: 1 };
      d.complexity = [t];
      d.confidence = 'medium';
      return d;
    }
    if (outside >= 2 && sameExpr) {
      d.pattern = 'exponential';
      d.patternName = '分支递归（同一表达式内多个自调用）';
      d.detail.push('同一个表达式里出现 ' + outside + ' 次自调用（如 fib(n-1)+fib(n-2)），每层展开为 2 个子问题 → 指数级');
      var e = term(1, {}); e.big = 'n';
      d.complexity = [e];
      d.confidence = 'high';
      return d;
    }
    if (outside >= 2 && condCalls >= 2) {
      d.pattern = 'divide';
      d.patternName = '分治递归（顺序多支调用）';
      d.detail.push(outside + ' 次自调用位于顺序语句/不同分支中，逐层合并 → 递归树每层规模为 n');
      var dn = term(1, {}); dn.exp = { n: 1 };
      d.complexity = [dn];
      d.confidence = 'medium';
      return d;
    }
    if (outside >= 2) {
      d.pattern = 'exponential';
      d.patternName = '分支递归（每层多个子问题）';
      d.detail.push('同一层出现 ' + outside + ' 次自调用且结构无法确定，保守判定为指数级');
      var e2 = term(1, {}); e2.big = 'n';
      d.complexity = [e2];
      d.confidence = 'low';
      return d;
    }
    if (outside === 1 && halving) {
      d.pattern = 'divide';
      d.patternName = '分治递归（规模减半）';
      d.detail.push('单次自调用且参数为 n/2 形式 → 递归深度 log n');
      var lg = term(1, {}); lg.exp[VLOG] = 1;
      d.complexity = [lg];
      d.confidence = 'high';
      return d;
    }
    if (outside === 1 && minusConst) {
      d.pattern = 'linear';
      d.patternName = '线性递归（规模减常数）';
      d.detail.push('单次自调用且参数形如 n-1 → 递归深度 n');
      var t2 = term(1, {}); t2.exp = { n: 1 };
      d.complexity = [t2];
      d.confidence = 'high';
      return d;
    }
    d.pattern = 'unknown';
    d.patternName = '递归（结构未识别）';
    d.detail.push('递归调用结构无法自动归类，请人工核对');
    d.complexity = [term(1, {})];
    d.confidence = 'low';
    return d;
  }
  function substFn(terms, name, fnInfo, depth) {
    var out = [], i;
    depth = depth || 0;
    for (i = 0; i < (terms || []).length; i++) {
      var t = terms[i];
      if (t.fn === name) {
        if (fnInfo && fnInfo.recursion && fnInfo.recursion.complexity && fnInfo.recursion.complexity.length && depth < 4)
          out = out.concat(scaleList(fnInfo.recursion.complexity, t.coef));
        else { var c = term(1, {}, true); out.push(c); }
      } else if (t.fn && fnInfo && t.fn === fnInfo.name) out.push(t);
      else out.push(t);
    }
    return sumTerms([out]);
  }

  /* ===================== 5. 代码生成（数组下标从 1 开始） ===================== */

  function indentCode(lines) {
    var depth = 0, out = [], i, k;
    for (i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (/^\s*[}\])]/.test(ln)) depth = Math.max(0, depth - 1);
      var pad = '';
      for (k = 0; k < depth; k++) pad += '  ';
      out.push(pad + ln);
      var opens = (ln.match(/[{(]/g) || []).length;
      var closes = (ln.match(/[})]/g) || []).length;
      depth += opens - closes;
      if (depth < 0) depth = 0;
    }
    return out.join('\n');
  }

  function CodeGen(ctx) {
    this.ctx = ctx;
    this.arrays = ctx.arrays || {};
    this.globals = ctx.globals || {};
    this.funcNames = ctx.funcNames || {};
  }
  CodeGen.prototype.expr = function (e) {
    var self = this;
    if (!e) return 'undefined';
    switch (e.k) {
      case 'num': return e.v < 0 ? '(' + e.v + ')' : String(e.v);
      case 'str': return JSON.stringify(e.v).replace(/<\//g, '<\\/');
      case 'bool': return e.v ? 'true' : 'false';
      case 'null': return 'null';
      case 'var': return e.name;
      case 'bin': {
        var map = { 'and': '&&', 'or': '||', 'mod': '%', 'div': '/' };
        if (e.op === '^' || e.op === '**') return 'Math.pow(' + self.expr(e.l) + ', ' + self.expr(e.r) + ')';
        return '(' + self.expr(e.l) + ' ' + (map[e.op] || e.op) + ' ' + self.expr(e.r) + ')';
      }
      case 'un': return e.op === 'not' ? '(!' + self.expr(e.e) + ')' : '(' + e.op + self.expr(e.e) + ')';
      case 'index': {
        var base = self.arrays[rootName(e.obj)];
        var cur = e, s = self.expr(e.obj), ii = 0;
        if (base && base[0] && base[0].length > 1) {
          while (cur.k === 'index' && ii < base[0].length) {
            s += '[' + self.expr(cur.index) + ']';
            cur = cur.obj; ii++;
          }
          if (cur.k === 'var') return s;
          if (ii > 0) return s;
        }
        return self.expr(e.obj) + '[' + self.expr(e.index) + ']';
      }
      case 'call': {
        var args = (e.args || []).map(function (a) { return a.k === 'range' ? '[' + self.expr(a.lo) + ', ' + self.expr(a.hi) + ']' : self.expr(a); });
        var n = e.name;
        if (n === 'len' || n === 'length') return '((' + args[0] + ').length - 1)';
        if (n === 'sort') return '(function (a) { var r = [0].concat(a.slice(1)); r.sort(function (x, y) { return x - y; }); return r; })(' + args[0] + ')';
        if (n === 'reverse') return '(function (a) { return [0].concat(a.slice(1).reverse()); })(' + args[0] + ')';
        if (n === 'copy') return '(function (a) { return [0].concat(a.slice(1)); })(' + args[0] + ')';
        if (n === 'sum') return '(function (a) { var s = 0; for (var i = 1; i < a.length; i++) s += a[i]; return s; })(' + args[0] + ')';
        if (n === 'fill') return '(function (v, s) { var r = [0]; for (var i = 1; i <= s; i++) r.push(v); return r; })(' + args.join(', ') + ')';
        if (n === 'str') return 'String(' + args[0] + ')';
        if (n === 'int') return 'Math.trunc(' + args[0] + ')';
        if (n === 'float') return 'Number(' + args[0] + ')';
        if (['abs', 'sqrt', 'floor', 'ceil', 'min', 'max', 'pow', 'log2'].indexOf(n) >= 0) {
          if (n === 'log2') return '(Math.log(' + args[0] + ') / Math.LN2)';
          return 'Math.' + n + '(' + args.join(', ') + ')';
        }
        if (n === 'random') return 'Math.random()';
        return n + '(' + args.join(', ') + ')';
      }
      case 'range': return '[' + self.expr(e.lo) + ', ' + self.expr(e.hi) + ']';
      case 'tern': return '(' + self.expr(e.cond) + ' ? ' + self.expr(e.a) + ' : ' + self.expr(e.b) + ')';
      case 'arraylit': return '[0' + (e.items && e.items.length ? ', ' + e.items.map(function (a) { return self.expr(a); }).join(', ') : '') + ']';
      case 'newarray': return '[]';
      case 'member': return self.expr(e.obj) + '.' + e.name;
      default: return 'undefined';
    }
  };
  CodeGen.prototype.lvalue = function (t) {
    if (t.k === 'var') return t.name;
    if (t.k === 'index') return this.expr(t);
    return this.expr(t);
  };
  CodeGen.prototype.step = function (e) {
    if (!e) return '1';
    if (e.k === 'un' && e.op === '-') return e.e.k === 'num' ? String(e.e.v) : '-1';
    if (e.k === 'num') return String(e.v);
    return '1';
  };
  CodeGen.prototype.negStep = function (e) { return !!(e && ((e.k === 'un' && e.op === '-') || (e.k === 'num' && e.v < 0))); };

  CodeGen.prototype.statements = function (list) {
    var self = this, out = [];
    for (var i = 0; i < list.length; i++) out = out.concat(self.stmt(list[i]));
    return out;
  };
  CodeGen.prototype.stmt = function (s) {
    var self = this, out = [], i;
    if (!s) return out;
    switch (s.k) {
      case 'block': case 'program': return self.statements(s.body);
      case 'func': return self.func(s);
      case 'decl': {
        if (s.kind === 'array') {
          if (self.globals[s.name] && !self.ctx.inFunction) return [];
          var dims = s.sizes || [];
          if (dims.length >= 2) out.push('var ' + s.name + ' = __watch(__makeMatrix(' + self.expr(dims[0].hi) + ', ' + self.expr(dims[1].hi) + '));');
          else out.push('var ' + s.name + ' = __watch(' + (s.init ? self.expr(s.init) : '__makeArray(' + self.expr(dims[0].hi) + ')') + ');');
          return out;
        }
        if (self.globals[s.name] && !self.ctx.inFunction) return s.init ? [s.name + ' = ' + self.expr(s.init) + ';'] : [];
        return ['var ' + s.name + ' = ' + (s.init ? self.expr(s.init) : '0') + ';'];
      }
      case 'assign': {
        var op = s.op === '=' ? '' : s.op.charAt(0);
        return ['__st();', s.target.name + ' ' + (op ? op + '=' : '=') + ' ' + self.expr(s.e) + ';'];
      }
      case 'assignIndex': return ['__st();', self.expr(s.target) + ' = ' + self.expr(s.e) + ';'];
      case 'sliceAssign': {
        var rng = s.target.index;
        var base = self.expr(s.target.obj);
        var it = '__sl' + (self.ctx.sliceSeq = (self.ctx.sliceSeq || 0) + 1);
        out.push('for (var ' + it + ' = ' + self.expr(rng.lo) + '; ' + it + ' <= ' + self.expr(rng.hi) + '; ' + it + '++) {');
        out.push('__st();');
        out.push(base + '[' + it + '] = ' + self.expr(s.e) + ';');
        out.push('}');
        return out;
      }
      case 'exprstmt': return [self.expr(s.e) + ';'];
      case 'return': return ['return ' + (s.e ? self.expr(s.e) : 'undefined') + ';'];
      case 'output': return ['__out(' + (s.args || []).map(function (a) { return self.expr(a); }).join(', ') + ');'];
      case 'input': return [];
      case 'swap': return ['__swap(' + self.expr(s.a) + ', ' + self.expr(s.b) + ');'];
      case 'break': return ['break;'];
      case 'continue': return ['continue;'];
      case 'if': {
        out.push('if (' + self.expr(s.cond) + ') {');
        out = out.concat(self.statements(s.body));
        if (s.els && s.els.length) {
          if (s.els.length === 1 && s.els[0].k === 'if') {
            var sub = self.stmt(s.els[0]);
            out.push('} else ' + sub[0]);
            for (i = 1; i < sub.length; i++) out.push(sub[i]);
          } else {
            out.push('} else {');
            out = out.concat(self.statements(s.els));
          }
        }
        out.push('}');
        return out;
      }
      case 'for': {
        var st = self.step(s.step);
        var neg = self.negStep(s.step);
        var upd = Math.abs(parseFloat(st)) === 1 ? (neg ? '--' : '++') : (neg ? ' -= ' + Math.abs(parseFloat(st)) : ' += ' + Math.abs(parseFloat(st)));
        out.push('for (' + s.v + ' = ' + self.expr(s.from) + '; ' + s.v + (neg ? ' >= ' : ' <= ') + self.expr(s.to) + '; ' + s.v + upd + ') {');
        out.push('__st();');
        out = out.concat(self.statements(s.body));
        out.push('}');
        return out;
      }
      case 'foreach': {
        out.push('for (var __it = 1; __it < (' + self.expr(s.arr) + ').length; __it++) {');
        out.push(s.v + ' = (' + self.expr(s.arr) + ')[__it];');
        out.push('__st();');
        out = out.concat(self.statements(s.body));
        out.push('}');
        return out;
      }
      case 'while': {
        out.push('while (' + self.expr(s.cond) + ') {');
        out.push('__st();');
        out = out.concat(self.statements(s.body));
        out.push('}');
        return out;
      }
      case 'repeat': {
        out.push('do {');
        out.push('__st();');
        out = out.concat(self.statements(s.body));
        out.push('} while (!(' + self.expr(s.cond) + '));');
        return out;
      }
      default: return out;
    }
  };
  CodeGen.prototype.func = function (fn) {
    var self = this;
    var saved = self.ctx.inFunction;
    self.ctx.inFunction = true;
    var out = ['function ' + fn.name + '(' + fn.params.map(function (p) { return p.name; }).join(', ') + ') {',
      '__st(); if (__steps > __budget) throw new Error("步数超限（可能是死循环或递归过深）");'];
    out = out.concat(self.statements(fn.body));
    out.push('}');
    self.ctx.inFunction = saved;
    return out;
  };

  /* ===================== 6. 编译入口 ===================== */
  function compile(source, opts) {
    opts = opts || {};
    var result = {
      ok: false, diagnostics: [], code: '', analysis: null, ast: null,
      inputSpec: [], outputs: [], entry: null, diagnosticsText: '', language: 'python'
    };
    var pr = parse(source);
    result.ast = pr.ast;
    result.diagnostics = pr.diags || [];
    var hardErrors = result.diagnostics.filter(function (d) { return d.level === 'error'; });
    if (!pr.ast || hardErrors.length) {
      result.diagnosticsText = formatDiags(result.diagnostics);
      return result;
    }
    var env = buildEnv(pr.ast);
    var funcs = [], i;
    for (i = 0; i < pr.ast.body.length; i++) if (pr.ast.body[i].k === 'func') funcs.push(pr.ast.body[i]);

    var fnInfos = {};
    for (i = 0; i < funcs.length; i++) fnInfos[funcs[i].name] = analyzeFunction(funcs[i], env, result.diagnostics);

    /* 入口函数 */
    var entryFn = null, entry = opts.entry || null;
    if (entry) for (i = 0; i < funcs.length; i++) if (funcs[i].name === entry) entryFn = funcs[i];
    if (!entryFn) {
      var pick = null;
      for (i = 0; i < funcs.length; i++) if (funcs[i].name === 'solve') pick = funcs[i];
      if (!pick) for (i = 0; i < funcs.length; i++) if (funcs[i].name === 'main') pick = funcs[i];
      if (!pick) for (i = 0; i < funcs.length; i++) if (funcs[i].params.length) { pick = funcs[i]; break; }
      if (!pick && funcs.length) pick = funcs[0];
      entryFn = pick; entry = pick ? pick.name : null;
    }
    if (!entryFn && !funcs.length) {
      result.diagnostics.push({ level: 'error', line: 1, col: 1, msg: '需要至少一个函数定义（例如 function solve(A[1..n])）' });
      result.diagnosticsText = formatDiags(result.diagnostics);
      return result;
    }

    /* 输入规格 */
    var inputSpec = [];
    var paramNames = entryFn ? entryFn.params.map(function (p) { return p.name; }) : [];
    if (entryFn) {
      for (i = 0; i < entryFn.params.length; i++) {
        var p = entryFn.params[i];
        var spec = {
          name: p.name, kind: p.kind === 'array' ? 'array' : 'scalar',
          type: p.type && p.type !== 'auto' ? p.type : 'int', dims: [], title: p.name
        };
        if (p.kind === 'array') {
          var dd = p.sizes && p.sizes.length ? p.sizes : [{ lo: N(1), hi: N(8) }];
          spec.dims = dd.map(function (x) { return strOf(x.hi); });
          if (dd.length >= 2) spec.kind = 'matrix';
          if (dd[0] && dd[0].lo && dd[0].lo.k === 'num') spec.base = dd[0].lo.v;
        }
        inputSpec.push(spec);
      }
    }
    for (i = 0; i < env.decls.length; i++) {
      var d = env.decls[i];
      if (paramNames.indexOf(d.name) >= 0) continue;
      if (d.kind === 'array') {
        inputSpec.push({
          name: d.name, kind: d.sizes.length >= 2 ? 'matrix' : 'array', type: 'int',
          dims: d.sizes.map(function (x) { return strOf(x.hi); }), global: true, title: d.name
        });
      } else if (d.init == null) {
        inputSpec.push({ name: d.name, kind: 'scalar', type: d.type && d.type !== 'auto' ? d.type : 'int', dims: [], global: true, title: d.name });
      }
    }
    if (!inputSpec.length) inputSpec.push({ name: 'n', kind: 'scalar', type: 'int', dims: [], title: 'n' });

    /* 规模变量（n、m）：既补进输入，又标出可从 len(A) 推导的那些 */
    var isName = function (arr, nm) { for (var q = 0; q < arr.length; q++) if (arr[q].name === nm) return arr[q]; return null; };
    var dimVars = {};
    for (i = 0; i < inputSpec.length; i++) {
      var s2 = inputSpec[i];
      for (var j = 0; j < s2.dims.length; j++) {
        var vars = Object.keys(freeNames(parseExprText(s2.dims[j]), {}));
        for (var v = 0; v < vars.length; v++) {
          dimVars[vars[v]] = 1;
          if (!isName(inputSpec, vars[v])) inputSpec.push({ name: vars[v], kind: 'scalar', type: 'int', dims: [], title: vars[v], inferred: true });
        }
      }
    }
    for (var vk in dimVars) { var hit = isName(inputSpec, vk); if (hit) hit.isDim = true; }
    /* 入口函数里被真正使用的标量参数（如二分查找的 x、背包的 W）也要生成数据 */
    var allScalarParams = [];
    for (i = 0; i < funcs.length; i++) {
      for (var pp = 0; pp < funcs[i].params.length; pp++) {
        var prm = funcs[i].params[pp];
        if (prm.kind === 'array') continue;
        if (allScalarParams.indexOf(prm.name) < 0) allScalarParams.push(prm.name);
      }
    }
    for (i = 0; i < allScalarParams.length; i++) {
      var spn = allScalarParams[i];
      if (isName(inputSpec, spn)) continue;
      var acc2 = { vars: {}, assigned: {}, funcs: {}, calls: {} };
      pyUsedNames(pr.ast, acc2);
      if (acc2.vars[spn]) inputSpec.push({ name: spn, kind: 'scalar', type: 'int', dims: [], title: spn });
    }
    for (i = 0; i < inputSpec.length; i++) {
      var spA = inputSpec[i];
      if (spA.kind !== 'array' && spA.kind !== 'matrix') continue;
      var dtA = spA.dims[0];
      if (!dtA || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(dtA)) continue;
      if (paramNames.indexOf(dtA) >= 0) continue;
      spA.inferredName = dtA;
      for (var qA = 0; qA < inputSpec.length; qA++) if (inputSpec[qA].name === dtA) inputSpec[qA].inferred = true;
    }

    /* 函数体内声明的数组：避免主流程重复声明造成遮蔽 */
    var fnArrayLocals = {};
    (function () {
      function walkBody(list) {
        for (var q = 0; q < (list || []).length; q++) {
          var s = list[q]; if (!s) continue;
          if (s.k === 'decl' && s.kind === 'array') fnArrayLocals[s.name] = 1;
          else if (s.k === 'block' || s.k === 'program') walkBody(s.body);
          else if (s.k === 'if') { walkBody(s.body); walkBody(s.els); }
          else if (s.k === 'for' || s.k === 'foreach' || s.k === 'while' || s.k === 'repeat') walkBody(s.body);
        }
      }
      for (var q2 = 0; q2 < funcs.length; q2++) walkBody(funcs[q2].body);
    })();

    /* 输出变量 */
    var assignedAll = collectAssigned(pr.ast);
    var outputs = [], candidates = [];
    if (entryFn) {
      var info = fnInfos[entry];
      for (i = 0; i < assignedAll.length; i++) {
        var nm = assignedAll[i];
        if (paramNames.indexOf(nm) >= 0) continue;
        if (fnArrayLocals[nm]) continue;
        if (candidates.indexOf(nm) < 0) candidates.push(nm);
      }
      var arraysOut = Object.keys(env.arrays).filter(function (a) { return candidates.indexOf(a) >= 0; });
      var retExpr = entryFunctionReturnExpr(entryFn);
      var prefer = ['ans', 'result', 'res', 'output', 'best', 'maxsum', 'maxSum', 'sum', 'count', 'total'];
      if (opts.outputs && opts.outputs.length) outputs = opts.outputs.slice();
      else {
        if (retExpr) {
          var retNames = Object.keys(freeNames(retExpr, {})).filter(function (nm2) {
            return paramNames.indexOf(nm2) < 0 && !fnArrayLocals[nm2];
          });
          if (retNames.length) outputs = retNames;
        }
        if (!outputs.length) for (i = 0; i < candidates.length; i++) if (prefer.indexOf(candidates[i]) >= 0) outputs.push(candidates[i]);
        if (!outputs.length && arraysOut.length) outputs = [arraysOut[0]];
        if (!outputs.length && candidates.length) outputs = [candidates[0]];
      }
    }

    /* 生成 Python（0 下标） */
    var bases = {};
    (function () {
      var k;
      for (k in env.arrays) {
        var dims0 = env.arrays[k] && env.arrays[k][0];
        var loV = 0;
        if (dims0 && dims0[0] && dims0[0].lo) {
          if (dims0[0].lo.k === 'num') loV = dims0[0].lo.v;
          else { var loTxt = String(strOf(dims0[0].lo)); loV = /^[0-9]+$/.test(loTxt) ? parseInt(loTxt, 10) : 1; }
        }
        bases[k] = loV;
      }
    })();
    var pyCtx = {
      arrays: env.arrays, globals: {}, funcNames: env.funcNames, inFunction: false, bases: bases, fnArrayLocals: fnArrayLocals, arrNames: env.arrays,
      names: (function () { var s = {}, k; for (k in env.arrays) s[k] = 1; for (k in env.scalars) s[k] = 1; return s; })()
    };
    for (i = 0; i < env.decls.length; i++) pyCtx.globals[env.decls[i].name] = 1;
    var pyGen = new PyGen(pyCtx);
    var pyProgram = [];
    function pyCollect(list) {
      var acc = [], q;
      for (q = 0; q < list.length; q++) acc = acc.concat(pyGen.stmt(list[q]));
      return acc;
    }
    pyProgram = pyCollect(funcs);
    pyProgram.push(PPass());
    (function () {
      var stmts = [], q;
      for (q = 0; q < pr.ast.body.length; q++) {
        var st0 = pr.ast.body[q];
        if (st0.k === 'func') continue;
        stmts = stmts.concat(pyGen.stmt(st0));
      }
      pyProgram = pyProgram.concat(stmts);
    })();
    /* 规模变量推导：n = len(A)（0 下标时长度就是 n） */
    (function () {
      var acc = { vars: {}, assigned: {}, funcs: {}, calls: {} };
      pyUsedNames(pyProgram, acc);
      var done = {};
      for (var q = 0; q < inputSpec.length; q++) {
        var sp = inputSpec[q];
        if (sp.kind !== 'array' && sp.kind !== 'matrix') continue;
        var dt = sp.inferredName;
        if (dt && acc.vars[dt] && !done[dt]) {
          done[dt] = 1;
          pyProgram.push(PAssign(PVar(dt), PCall('len', [PVar(sp.name)])));
        }
      }
    })();
    /* 入口函数体内被就地写入（下标赋值）的变量：这类输出不参与“未定义就用返回值兜底” */
    var inplaceOut = {};
    if (entryFn) {
      (function () {
        function walk(list) {
          for (var q = 0; q < (list || []).length; q++) {
            var s = list[q]; if (!s) continue;
            if (s.k === 'assignIndex') {
              var rt = rootName(s.target.obj);
              if (rt && rt !== '?') inplaceOut[rt] = 1;
            }
            if (s.k === 'sliceAssign') {
              var st2 = rootName(s.target.obj);
              if (st2 && st2 !== '?') inplaceOut[st2] = 1;
            }
            if (s.k === 'swap') {
              if (s.a && s.a.k === 'index') { var sa = rootName(s.a.obj); if (sa && sa !== '?') inplaceOut[sa] = 1; }
              if (s.b && s.b.k === 'index') { var sb = rootName(s.b.obj); if (sb && sb !== '?') inplaceOut[sb] = 1; }
            }
            if (s.k === 'block' || s.k === 'program') walk(s.body);
            else if (s.k === 'if') { walk(s.body); walk(s.els); }
            else if (s.k === 'for' || s.k === 'foreach' || s.k === 'while' || s.k === 'repeat') walk(s.body);
          }
        }
        walk(entryFn.body);
      })();
    }
    if (entryFn) {
      for (i = 0; i < outputs.length; i++) {
        if (env.arrays[outputs[i]] || env.scalars[outputs[i]] !== undefined) continue;
        if (fnArrayLocals[outputs[i]]) continue;
        pyProgram.push(PAssign(PVar(outputs[i]), PNone()));
      }
      var callArgNames = buildCallArgs();
      if (outputs.length === 0) {
        pyProgram.push(PExprStmt(PCall(entry, callArgNames.map(function (x) { return PVar(x); }))));
      } else {
        pyProgram.push(PAssign(PVar('__res'), PCall(entry, callArgNames.map(function (x) { return PVar(x); }))));
        for (i = 0; i < outputs.length; i++) {
          if (inplaceOut[outputs[i]]) continue;    // 就地修改的数组：函数已写好，不做兜底
          pyProgram.push(PIf(PBin('==', PVar(outputs[i]), PNone()), [PAssign(PVar(outputs[i]), PVar('__res'))], null));
        }
      }
      var packItems = outputs.map(function (o) { return PVar(o); });
      pyProgram.push(PReturn(PList(packItems)));
    }
    function buildCallArgs() {
      var specByName = {}, nm, k2;
      for (k2 = 0; k2 < inputSpec.length; k2++) specByName[inputSpec[k2].name] = inputSpec[k2];
      var argNames = [];
      for (k2 = 0; k2 < entryFn.params.length; k2++) {
        nm = entryFn.params[k2].name;
        if (specByName[nm]) { argNames.push(nm); continue; }
        if (env.arrays[nm]) {
          var probe = (/^(r|right|hi|end|last)$/i.test(nm)) ? (specByName['n'] ? 'n' : '1') : '1';
          if (!specByName[probe] && specByName['n']) probe = 'n';
          argNames.push(specByName[probe] ? probe : '1');
        } else if (fnArrayLocals[nm]) {
          argNames.push('1');
        } else {
          argNames.push(specByName['n'] ? 'n' : '1');
        }
      }
      return argNames;
    }

    for (var fname in fnInfos) fnInfos[fname].recursion = classifyRecursion(fnInfos[fname]);

    /* 复杂度汇总 */
    var timeTerms = [];
    for (i = 0; i < pr.ast.body.length; i++) {
      if (pr.ast.body[i].k === 'func') continue;
      timeTerms = timeTerms.concat(analyzeTopStmt(pr.ast.body[i], fnInfos, env));
    }
    if (entryFn && fnInfos[entry]) timeTerms = timeTerms.concat(fnInfos[entry].body);
    timeTerms = sumTerms(timeTerms);
    for (var fk in fnInfos) timeTerms = substFn(timeTerms, fk, fnInfos[fk], 0);

    var spaceTerms = sumTerms([entryFn && fnInfos[entry] ? fnInfos[entry].peak : [], env.decls.filter(function (x) { return x.kind === 'array'; }).map(function (x) {
      var sz = [];
      for (var q = 0; q < x.sizes.length; q++) {
        var e2 = quickCost(parseExprText(strOf(x.sizes[q].hi)));
        sz = q === 0 ? e2 : mulTerms([sz, e2]);
      }
      return sz;
    })]);

    var patterns = [];
    for (var pk in fnInfos) {
      var inf = fnInfos[pk];
      if (inf.recursion && inf.recursion.pattern !== 'none') {
        patterns.push({ fn: pk, pattern: inf.recursion.pattern, patternName: inf.recursion.patternName, detail: inf.recursion.detail, complexity: inf.recursion.complexity, confidence: inf.recursion.confidence });
      }
    }

    result.ok = true;
    result.code = null;
    result.pyProgram = pyProgram;
    result.language = 'python';
    result.stmtCount = pyProgram.length;
    result.entry = entry;
    result.outputs = outputs;
    result.inputSpec = inputSpec;
    result.assignedAll = assignedAll;
    result.env = env;
    result.bases = bases;
    result.analysis = {
      funcs: fnInfos, order: funcs.map(function (f) { return f.name; }), patterns: patterns,
      timeTerms: timeTerms, spaceTerms: spaceTerms,
      timeClass: classOf(timeTerms), spaceClass: classOf(spaceTerms),
      exprTime: fmtExpr(timeTerms), exprSpace: fmtExpr(spaceTerms),
      loopDepth: fnInfos[entry] ? fnInfos[entry].maxDepth : 0,
      locals: fnInfos[entry] ? fnInfos[entry].locals : [],
      expWarn: !isPolynomial(timeTerms),
      staticConfidence: patterns.length ? 'medium' : (fnInfos[entry] && fnInfos[entry].maxDepth >= 3 ? 'medium' : 'high')
    };
    result.diagnosticsText = formatDiags(result.diagnostics);
    return result;
  }

/* =========================================================================
 * Python 代码生成（0 下标，标准 Python 风格）+ 内置 Python 子集解释器
 * 说明：学生写 1-based 伪代码（A[1] 是第一个元素），生成器自动平移成
 *       Python 的 0 下标：A[i] → A[i - 1]，A[1..n] → 长度 n 的列表
 * ========================================================================= */

  /* ---------------- 1. Python AST 节点 ---------------- */
  function PNum(v) { return { t: 'num', v: v }; }
  function PStr(v) { return { t: 'str', v: v }; }
  function PBool(v) { return { t: 'bool', v: v }; }
  function PNone() { return { t: 'none' }; }
  function PVar(n) { return { t: 'var', n: n }; }
  function PBin(op, l, r) { return { t: 'bin', op: op, l: l, r: r }; }
  function PUn(op, e) { return { t: 'un', op: op, e: e }; }
  function PIdx(obj, index) { return { t: 'index', obj: obj, index: index }; }
  function PSlice(obj, lo, hi) { return { t: 'slice', obj: obj, lo: lo, hi: hi }; }
  function PCall(f, args) { return { t: 'call', f: f, args: args || [] }; }
  function PList(items) { return { t: 'list', items: items || [] }; }
  function PTuple(items) { return { t: 'tuple', items: items || [] }; }
  function PIfExp(c, a, b) { return { t: 'ifexp', cond: c, a: a, b: b }; }
  function PListComp(expr, v, iter, cond) { return { t: 'listcomp', expr: expr, v: v, iter: iter, cond: cond || null }; }
  function PAssign(target, value) { return { t: 'assign', target: target, value: value }; }
  function PIf(cond, body, els) { return { t: 'if', cond: cond, body: body, els: els }; }
  function PWhile(cond, body) { return { t: 'while', cond: cond, body: body }; }
  function PFor(v, start, stop, step, body) { return { t: 'for', v: v, start: start, stop: stop, step: step, body: body }; }
  function PRepeat(body, cond) { return { t: 'repeat', body: body, cond: cond }; }
  function PFuncDef(name, params, body) { return { t: 'funcdef', name: name, params: params, body: body }; }
  function PReturn(e) { return { t: 'return', e: e }; }
  function PPass() { return { t: 'pass' }; }
  function PBreak() { return { t: 'break' }; }
  function PContinue() { return { t: 'continue' }; }
  function PExprStmt(e) { return { t: 'exprstmt', e: e }; }

  /* ---------------- 2. Python 源码输出 ---------------- */
  var PY_PREC = { 'or': 3, 'and': 4, 'not': 5, '==': 6, '!=': 6, '<': 6, '>': 6, '<=': 6, '>=': 6, '+': 8, '-': 8, '*': 9, '/': 9, '//': 9, '%': 9, '**': 11 };
  function pyPrec(e) {
    if (!e) return 100;
    switch (e.t) {
      case 'bin': return PY_PREC[e.op] || 8;
      case 'un': return e.op === 'not' ? 5 : 10;
      case 'ifexp': return 2;
      default: return 100;
    }
  }
  function pyStr(e, minPrec) {
    var s = pyRaw(e);
    if (pyPrec(e) < (minPrec == null ? 0 : minPrec)) return '(' + s + ')';
    return s;
  }
  function pyRaw(e) {
    if (!e) return 'None';
    switch (e.t) {
      case 'num': return e.v < 0 ? '(' + e.v + ')' : String(e.v);
      case 'str': return JSON.stringify(e.v).replace(/<\//g, '<\\/');
      case 'bool': return e.v ? 'True' : 'False';
      case 'none': return 'None';
      case 'var': return e.n;
      case 'bin': {
        var p = pyPrec(e), l = pyStr(e.l, p), r = pyStr(e.r, e.op === '**' ? p : p + 1);
        return l + ' ' + e.op + ' ' + r;
      }
      case 'un': return e.op === 'not' ? ('not ' + pyStr(e.e, 6)) : (e.op + pyStr(e.e, 10));
      case 'index': return pyStr(e.obj, 100) + '[' + pyStr(e.index) + ']';
      case 'slice': return pyStr(e.obj, 100) + '[' + (e.lo == null ? '' : pyStr(e.lo)) + ':' + (e.hi == null ? '' : pyStr(e.hi)) + ']';
      case 'call': return e.f + '(' + e.args.map(function (a) { return pyStr(a); }).join(', ') + ')';
      case 'list': return '[' + e.items.map(function (a) { return pyStr(a); }).join(', ') + ']';
      case 'tuple': return '(' + e.items.map(function (a) { return pyStr(a); }).join(', ') + ')';
      case 'listcomp': return '[' + pyStr(e.expr) + ' for ' + e.v + ' in ' + pyStr(e.iter) + (e.cond ? ' if ' + pyStr(e.cond) : '') + ']';
      case 'ifexp': return pyStr(e.a, 3) + ' if ' + pyStr(e.cond, 3) + ' else ' + pyStr(e.b, 3);
      default: return 'None';
    }
  }
  function pyStmts(stmts, indent) {
    var pad = '', i;
    for (i = 0; i < indent; i++) pad += '    ';
    var lines = [];
    for (i = 0; i < stmts.length; i++) lines = lines.concat(pyStmt(stmts[i], indent));
    if (!lines.length) lines.push(pad + 'pass');
    return lines;
  }
  function pyStmt(s, indent) {
    var pad = '', i, out = [], t;
    for (i = 0; i < indent; i++) pad += '    ';
    switch (s.t) {
      case 'assign': return [pad + (s.target.t === 'var' ? s.target.n : pyRaw(s.target)) + ' = ' + pyRaw(s.value)];
      case 'exprstmt': return [pad + pyRaw(s.e)];
      case 'return': return [pad + 'return' + (s.e ? ' ' + pyRaw(s.e) : '')];
      case 'pass': return [pad + 'pass'];
      case 'break': return [pad + 'break'];
      case 'continue': return [pad + 'continue'];
      case 'if':
        out.push(pad + 'if ' + pyRaw(s.cond) + ':');
        out = out.concat(pyStmts(s.body, indent + 1));
        if (s.els && s.els.length) { out.push(pad + 'else:'); out = out.concat(pyStmts(s.els, indent + 1)); }
        return out;
      case 'while':
        out.push(pad + 'while ' + pyRaw(s.cond) + ':');
        return out.concat(pyStmts(s.body, indent + 1));
      case 'for':
        t = 'for ' + s.v + ' in range(' + pyRaw(s.start) + ', (' + pyRaw(s.stop) + ') + 1' +
          ((s.step && s.step.t === 'num' && s.step.v === 1) ? '' : ', ' + pyRaw(s.step)) + '):';
        out.push(pad + t);
        return out.concat(pyStmts(s.body, indent + 1));
      case 'repeat':
        out.push(pad + 'while True:');
        out = out.concat(pyStmts(s.body, indent + 1));
        out.push(pad + '    if ' + pyRaw(s.cond) + ':');
        out.push(pad + '        break');
        return out;
      case 'funcdef':
        out.push(pad + 'def ' + s.name + '(' + s.params.join(', ') + '):');
        return out.concat(pyStmts(s.body, indent + 1));
      default: return [pad + 'pass'];
    }
  }
  function pyRender(stmts) { return pyStmts(stmts, 0).join('\n'); }

  /* ---------------- 3. 伪代码 AST → Python AST（1-based 伪代码 → 0 下标 Python） ---------------- */
  function PyGen(ctx) {
    this.ctx = ctx;
    this.arrays = ctx.arrays || {};
    this.globals = ctx.globals || {};
    this.seq = 0;
  }
  PyGen.prototype.tmp = function () { return '__t' + (++this.seq); };
  PyGen.prototype.base = function (name) {
    var d = this.arrays[name];
    if (d && d[0] && d[0][0] && d[0][0].lo) {
      if (d[0][0].lo.k === 'num') return d[0][0].lo.v;
      var t = String(strOf(d[0][0].lo));
      return /^[0-9]+$/.test(t) ? parseInt(t, 10) : 1;
    }
    if (this.ctx.bases && this.ctx.bases[name] != null) return this.ctx.bases[name];
    if (this.ctx.isArrayName && this.ctx.isArrayName(name)) return 1;   // 已知是数组：默认按 1 起始
    return 1;
  };
  PyGen.prototype.arrayBase = function (e) {
    var nm = (e && e.k === 'var') ? e.name : rootName(e);
    var known = !!(this.arrays[nm] || (this.ctx.arrNames && this.ctx.arrNames[nm]));
    return { name: nm, base: this.base(nm), known: known };
  };
  /* 把伪代码下标（1-based）平移成 Python 下标（0-based） */
  PyGen.prototype.shift = function (ix, nm) {
    var b = this.base(nm);
    var out = this.expr(ix);
    var shifted;
    if (b === 1) shifted = (out.t === 'num') ? PNum(out.v - 1) : PBin('-', out, PNum(1));
    else if (b === 0) shifted = out;
    else shifted = PBin('-', out, PNum(b));
    // 下标可能算成 0 或负数（例如 j - wt[i]）：用 max(..., 0) 兜住，避免 Python 负索引回绕
    if (shifted.t === 'num') return shifted.v < 0 ? PNum(0) : shifted;
    return PCall('max', [shifted, PNum(0)]);
  };
  PyGen.prototype.sizeExpr = function (e) {
    var ab = this.arrayBase(e);
    if (!ab.known) return PCall('len', [this.expr(e)]);
    return PCall('len', [PVar(ab.name)]);
  };
  PyGen.prototype.expr = function (e) {
    var self = this;
    if (!e) return PNone();
    switch (e.k) {
      case 'num': return PNum(e.v);
      case 'str': return PStr(e.v);
      case 'bool': return PBool(e.v);
      case 'null': return PNone();
      case 'var': return PVar(e.name);
      case 'bin': {
        if (e.op === 'and' || e.op === 'or') return PBin(e.op, self.expr(e.l), self.expr(e.r));
        var ops = { 'mod': '%', 'div': '//', '^': '**', '%': '%' };
        return PBin(ops[e.op] || e.op, self.expr(e.l), self.expr(e.r));
      }
      case 'un': return PUn(e.op === 'not' ? 'not' : e.op, self.expr(e.e));
      case 'index': {
        var chain = [], cur = e;
        while (cur.k === 'index') { chain.unshift(cur.index); cur = cur.obj; }
        var ab = self.arrayBase(cur);
        if (chain.length === 1 && chain[0].k === 'range') {
          return PSlice(self.expr(cur), self.shift(chain[0].lo, ab.name), self.shift(chain[0].hi, ab.name));
        }
        var out = self.expr(cur);
        for (var ci2 = 0; ci2 < chain.length; ci2++) {
          out = PIdx(out, self.shift(chain[ci2], ab.name));
        }
        return out;
      }
      case 'member': return PVar(e.name);
      case 'methodcall': return { t: 'method', obj: self.expr(e.obj), name: e.name, args: (e.args || []).map(function (a) { return self.expr(a); }) };
      case 'tern': return PIfExp(self.expr(e.cond), self.expr(e.a), self.expr(e.b));
      case 'arraylit': return PList((e.items || []).map(function (x) { return self.expr(x); }));
      case 'newarray': return PList([]);
      case 'range': return PList([self.expr(e.lo), self.expr(e.hi)]);
      case 'call': {
        var nm = e.name, args = (e.args || []).map(function (a) { return self.expr(a); });
        switch (nm) {
          case 'len': case 'length':
            return (e.args && e.args[0]) ? self.sizeExpr(e.args[0]) : PNum(0);
          case 'sort': return PCall('sorted', [args[0]]);
          case 'reverse': return PSlice(args[0], null, null) && PIdx(PCall('list', [args[0]]), PSlice(null, null, null));
          case 'copy': return PCall('list', [args[0]]);
          case 'sum': return PCall('sum', [args[0]]);
          case 'fill': return PListComp(args[0] || PNum(0), '__i' + (++self.seq), PCall('range', [args[1] || PNum(1)]), null);
          case 'str': return PCall('str', [args[0] || PNone()]);
          case 'int': return PCall('int', [args[0] || PNum(0)]);
          case 'float': return PCall('float', [args[0] || PNum(0)]);
          case 'abs': return PCall('abs', [args[0] || PNum(0)]);
          case 'min': case 'max': return PCall(nm, args);
          case 'pow': return PBin('**', args[0] || PNum(0), args[1] || PNum(1));
          case 'sqrt': return PBin('**', args[0] || PNum(0), PBin('/', PNum(1), PNum(2)));
          case 'floor': return PCall('int', [PBin('//', args[0] || PNum(0), PNum(1))]);
          case 'ceil': return PCall('__ceil', [args[0] || PNum(0)]);
          case 'log2': return PCall('__log2', [args[0] || PNum(1)]);
          case 'random': return PCall('__random', []);
          case 'range': return PCall('__range', args);
          default: return PCall(nm, args);
        }
      }
      default: return PNone();
    }
  };
  function ptypeIsBoolLike(e) {
    if (!e) return false;
    if (e.t === 'bool') return true;
    if (e.t === 'bin' && ['==', '!=', '<', '>', '<=', '>=', 'in', 'not in', 'and', 'or'].indexOf(e.op) >= 0) return true;
    if (e.t === 'un' && e.op === 'not') return true;
    return false;
  }
  PyGen.prototype.cond = function (e) { return this.expr(e); };
  PyGen.prototype.stmts = function (list) {
    var out = [], i;
    for (i = 0; i < list.length; i++) out = out.concat(this.stmt(list[i]));
    return out;
  };
  PyGen.prototype.fresh = function (prefix) {
    var names = this.ctx.names || {}, n = prefix + (++this.seq);
    while (names[n]) n = prefix + (++this.seq);
    names[n] = 1;
    return n;
  };
  PyGen.prototype.stmt = function (s) {
    var self = this, out = [], i;
    if (!s) return out;
    switch (s.k) {
      case 'block': case 'program': return self.stmts(s.body);
      case 'decl': {
        var dims = s.sizes || [];
        if (!self.ctx.inFunction && self.ctx.isMain && self.ctx.fnArrayLocals && self.ctx.fnArrayLocals[s.name]) return [];
        if (s.kind === 'array') {
          if (self.globals[s.name] && !self.ctx.inFunction) return [];
          if (s.init) return [PAssign(PVar(s.name), self.expr(s.init))];
          if (dims.length >= 2) {
            var rows = self.fresh('__r'), cols = self.fresh('__c'), ri = self.fresh('__ri'), ci = self.fresh('__ci');
            return [
              PAssign(PVar(rows), PBin('+', self.expr(dims[0].hi), PNum(1))),
              PAssign(PVar(cols), PBin('+', self.expr(dims[1].hi), PNum(1))),
              PAssign(PVar(s.name), PList([])),
              PFor(ri, PNum(0), PBin('-', PVar(rows), PNum(1)), PNum(1), [
                PExprStmt(PCall(s.name + '.append', [PListComp(PNum(0), ci, PCall('range', [PVar(cols)]), null)]))
              ])
            ];
          }
          return [PAssign(PVar(s.name), PListComp(PNum(0), self.fresh('__i'), PCall('range', [PBin('+', self.expr(dims[0].hi), PNum(1))])))];
        }
        if (self.globals[s.name] && !self.ctx.inFunction) return s.init ? [PAssign(PVar(s.name), self.expr(s.init))] : [];
        return [PAssign(PVar(s.name), s.init ? self.expr(s.init) : PNum(0))];
      }
      case 'assign': return [PAssign(PVar(s.target.name), self.expr(s.e))];
      case 'assignIndex': return [PAssign(self.expr(s.target), self.expr(s.e))];
      case 'sliceAssign': {
        var it = self.fresh('__i');
        var ab = self.arrayBase(s.target.obj);
        return [PFor(it, self.shift({ k: 'num', v: 0 }, ab.name), PNum(0), PNum(1), [])].slice(0, 0).concat([
          PFor(it, self.expr(s.target.index.lo), self.expr(s.target.index.hi), PNum(1),
            [PAssign(PIdx(self.expr(s.target.obj), self.shift(PVar(it), ab.name)), self.expr(s.e))])
        ]);
      }
      case 'exprstmt': return [PExprStmt(self.expr(s.e))];
      case 'return': return [PReturn(s.e ? self.expr(s.e) : null)];
      case 'output': return (s.args && s.args.length) ? [PExprStmt(PCall('print', s.args.map(function (a) { return self.expr(a); })))] : [PPass()];
      case 'input': return [];
      case 'swap': {
        var t1 = self.fresh('__sw');
        return [PAssign(PVar(t1), self.expr(s.a)), PAssign(self.expr(s.a), self.expr(s.b)), PAssign(self.expr(s.b), PVar(t1))];
      }
      case 'break': return [PBreak()];
      case 'continue': return [PContinue()];
      case 'if': {
        var body = self.stmts(s.body);
        var els = s.els && s.els.length ? self.stmts(s.els) : null;
        return [PIf(self.cond(s.cond), body.length ? body : [PPass()], els)];
      }
      case 'for': return [PFor(s.v, self.expr(s.from), self.expr(s.to), self.expr(s.step || { k: 'num', v: 1 }), self.stmts(s.body))];
      case 'foreach': {
        var arrNode = s.arr;
        var ab2 = self.arrayBase(arrNode);
        var idx = self.fresh('__i');
        var body2 = [PAssign(PVar(s.v), PIdx(self.expr(arrNode), self.shift(PVar(idx), ab2.name)))].concat(self.stmts(s.body));
        return [PFor(idx, PNum(0), PBin('-', PCall('len', [self.expr(arrNode)]), PNum(1)), PNum(1), body2)];
      }
      case 'while': return [PWhile(self.cond(s.cond), self.stmts(s.body).length ? self.stmts(s.body) : [PPass()])];
      case 'repeat': return [PRepeat(self.stmts(s.body).length ? self.stmts(s.body) : [PPass()], self.cond(s.cond))];
      case 'func': return [PFuncDef(s.name, s.params.map(function (p) { return p.name; }), self.stmts(s.body))];
      default: return out;
    }
  };

  /* ---------------- 4. 内置 Python 子集解释器（标准 0 下标列表语义） ---------------- */
  function PList_(items) { this.v = items || []; }
  function pyLen(v) {
    if (v instanceof PList_) return v.v.length;
    if (typeof v === 'string') return v.length;
    if (Array.isArray(v)) return v.length;
    return 0;
  }
  function pyNumVal(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v === null || v === undefined) return 0;
    if (v instanceof PList_) return v.v.length;
    if (typeof v === 'string') { var n = parseFloat(v); return isFinite(n) ? n : 0; }
    return 0;
  }
  function pyTruth(v) {
    if (v === null || v === undefined || v === false) return false;
    if (v === true) return true;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') return v.length > 0;
    if (v instanceof PList_) return v.v.length > 0;
    return true;
  }
  function pyEq(a, b) {
    if (a === undefined || b === undefined) return false;   // Python 里不存在 undefined
    if (a instanceof PList_ || b instanceof PList_) return a === b;
    return a === b;
  }
  function pyCmp(a, b) {
    if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : (a > b ? 1 : 0);
    var x = pyNumVal(a), y = pyNumVal(b);
    return x < y ? -1 : (x > y ? 1 : 0);
  }
  function pyIndex(i, len) {
    var k = Math.trunc(pyNumVal(i));
    return (k < 0) ? k + len : k;
  }
  function pyGetItem(obj, key) {
    if (obj instanceof PList_) {
      state.arrOps++;
      var k = pyIndex(key, obj.v.length);
      if (k < 0 || k >= obj.v.length) { state.oob++;
        if (state.oob <= 3) state.logs.push('# 下标越界读取：' + pyNumVal(key) + '（数组长度 ' + obj.v.length + '）');
        return null;
      }
      if (k > state.maxIdx) state.maxIdx = k;
      return obj.v[k];
    }
    if (typeof obj === 'string') return obj.charAt(pyIndex(key, obj.length));
    return null;
  }
  function pySetItem(obj, key, val) {
    if (obj instanceof PList_) {
      state.writes++;
      var k = pyIndex(key, obj.v.length);
      if (k < 0 || k >= obj.v.length) { state.oob++; state.oobWrites++;
        if (state.oobWrites <= 3) state.logs.push('# 下标越界写入：' + pyNumVal(key) + '（数组长度 ' + obj.v.length + '）');
        return false;
      }
      if (k > state.maxIdx) state.maxIdx = k;
      obj.v[k] = val;
      return true;
    }
    return false;
  }
  function pyMethod(obj, name, args) {
    if (obj instanceof PList_) {
      if (name === 'append') { obj.v.push(args[0]); state.writes++; state.ops++; return null; }
      if (name === 'pop') { state.ops++; return obj.v.pop(); }
      if (name === 'reverse') { obj.v.reverse(); state.ops += obj.v.length; return null; }
      if (name === 'sort') { obj.v.sort(function (a, b) { return pyNumVal(a) - pyNumVal(b); }); state.ops += obj.v.length * 2; return null; }
      if (name === 'index') { state.ops++; return obj.v.indexOf(args[0]); }
      if (name === 'count') { state.ops++; return obj.v.filter(function (x) { return pyEq(x, args[0]); }).length; }
    }
    if (typeof obj === 'string' && name === 'split') return new PList_(obj.split(args[0] === undefined ? /s+/ : args[0]));
    return null;
  }
  function pySlice(v, lo, hi) {
    if (!(v instanceof PList_)) return new PList_([]);
    var len = v.v.length;
    var a = (lo === null || lo === undefined) ? 0 : pyIndex(lo, len);
    var b = (hi === null || hi === undefined) ? len : pyIndex(hi, len) + 1;
    if (a < 0) a = 0;
    if (b > len) b = len;
    var out = [];
    for (var i = a; i < b; i++) out.push(v.v[i]);
    return new PList_(out);
  }
  function pyDeepPlain(v) {
    if (v instanceof PList_) return v.v.map(pyDeepPlain);
    return v === undefined ? null : v;
  }
  var state = { ops: 0, steps: 0, arrOps: 0, writes: 0, maxIdx: 0, outBuf: [], logs: [], oob: 0, oobWrites: 0, budget: 2000000, input: {} };

  function Env(parent) { this.vars = {}; this.parent = parent; }
  Env.prototype.get = function (n) {
    var e = this;
    while (e) { if (Object.prototype.hasOwnProperty.call(e.vars, n)) return e.vars[n]; e = e.parent; }
    if (state.input && Object.prototype.hasOwnProperty.call(state.input, n)) return state.input[n];
    return undefined;
  };
  Env.prototype.set = function (n, v) {
    var e = this;
    while (e) { if (Object.prototype.hasOwnProperty.call(e.vars, n)) { e.vars[n] = v; return; } e = e.parent; }
    this.vars[n] = v;
  };
  Env.prototype.define = function (n, v) { this.vars[n] = v; };

  /* 输入的 0 下标数组 → 解释器内部列表 */
  function pyFromHost(spec, value) {
    if (spec.kind === 'matrix') {
      var rows = Array.isArray(value) ? value : [];
      return new PList_(rows.map(function (row) {
        return new PList_((Array.isArray(row) ? row : []).map(function (x) { return x; }));
      }));
    }
    var arr = Array.isArray(value) ? value : [];
    return new PList_(arr.map(function (x) { return x; }));
  }
  function pyAdaptInput(specs, input) {
    var out = {}, i;
    for (i = 0; i < specs.length; i++) {
      var sp = specs[i], v = input ? input[sp.name] : undefined;
      if (sp.kind === 'array' || sp.kind === 'matrix') out[sp.name] = pyFromHost(sp, v);
      else out[sp.name] = (typeof v === 'number') ? v : (v === null || v === undefined ? 0 : (typeof v === 'string' ? (parseFloat(v) || 0) : 0));
    }
    return out;
  }

  function pyBinOp(op, l, r) {
    state.ops++;
    switch (op) {
      case 'and': return pyTruth(l) ? r : l;
      case 'or': return pyTruth(l) ? l : r;
      case '+':
        if (typeof l === 'string' || typeof r === 'string') return String(pyRawVal(l)) + String(pyRawVal(r));
        if (l instanceof PList_ && r instanceof PList_) return new PList_(l.v.concat(r.v));
        return pyNumVal(l) + pyNumVal(r);
      case '-': return pyNumVal(l) - pyNumVal(r);
      case '*':
        if (l instanceof PList_ && typeof r === 'number') { var rep = []; for (var q = 0; q < r; q++) rep = rep.concat(l.v); return new PList_(rep); }
        return pyNumVal(l) * pyNumVal(r);
      case '/': { var d = pyNumVal(r); return d === 0 ? 0 : pyNumVal(l) / d; }
      case '//': { var d2 = pyNumVal(r); return d2 === 0 ? 0 : Math.floor(pyNumVal(l) / d2); }
      case '%': { var d3 = pyNumVal(r); if (d3 === 0) return 0; var m = pyNumVal(l) % d3; return m < 0 ? m + Math.abs(d3) : m; }
      case '**': return Math.pow(pyNumVal(l), pyNumVal(r));
      case '==': return pyEq(l, r);
      case '!=': return !pyEq(l, r);
      case '<': return pyCmp(l, r) < 0;
      case '>': return pyCmp(l, r) > 0;
      case '<=': return pyCmp(l, r) <= 0;
      case '>=': return pyCmp(l, r) >= 0;
      default: return 0;
    }
  }
  function pyRawVal(v) { return v instanceof PList_ ? pyDeepPlain(v) : (v === undefined ? null : v); }
  function pyUnOp(op, v) {
    state.ops++;
    if (op === 'not') return !pyTruth(v);
    if (op === '-') return -pyNumVal(v);
    if (op === '+') return pyNumVal(v);
    return v;
  }
  function pyEval(e, env) {
    if (!e) return undefined;
    switch (e.t) {
      case 'num': case 'str': case 'bool': case 'none': return e.t === 'none' ? null : e.v;
      case 'var': return env.get(e.n);
      case 'bin': {
        var l = pyEval(e.l, env);
        if (e.op === 'and') { state.ops++; return pyTruth(l) ? pyEval(e.r, env) : l; }
        if (e.op === 'or') { state.ops++; return pyTruth(l) ? l : pyEval(e.r, env); }
        return pyBinOp(e.op, l, pyEval(e.r, env));
      }
      case 'un': return pyUnOp(e.op, pyEval(e.e, env));
      case 'index': return pyGetItem(pyEval(e.obj, env), pyEval(e.index, env));
      case 'method': return pyMethod(pyEval(e.obj, env), e.name, (e.args || []).map(function (a) { return pyEval(a, env); }));
      case 'slice': return pySlice(pyEval(e.obj, env), e.lo ? pyEval(e.lo, env) : null, e.hi ? pyEval(e.hi, env) : null);
      case 'list': {
        var n = e.items.length, arr = new Array(n), i;
        for (i = 0; i < n; i++) arr[i] = pyEval(e.items[i], env);
        return new PList_(arr);
      }
      case 'listcomp': {
        var seq = pyEval(e.iter, env), out = [], items = (seq instanceof PList_) ? seq.v : [];
        for (var k = 0; k < items.length; k++) {
          env.set(e.v, items[k]);
          if (e.cond && !pyTruth(pyEval(e.cond, env))) continue;
          out.push(pyEval(e.expr, env));
          state.ops++;
        }
        return new PList_(out);
      }
      case 'tuple': { var ta = []; for (var ti = 0; ti < e.items.length; ti++) ta.push(pyEval(e.items[ti], env)); return ta; }
      case 'ifexp': return pyTruth(pyEval(e.cond, env)) ? pyEval(e.a, env) : pyEval(e.b, env);
      case 'call': return pyCall(e, env);
      default: return undefined;
    }
  }
  function pyCall(e, env) {
    var name = e.f, args = e.args || [], i;
    state.ops++;
    if (name && name.indexOf('.') >= 0) {
      var parts = name.split('.');
      var baseName = parts[0], method = parts[1];
      var obj = env.get(baseName);
      var mvals = args.map(function (a) { return pyEval(a, env); });
      return pyMethod(obj, method, mvals);
    }
    switch (name) {
      case 'len': return pyLen(args.length ? pyEval(args[0], env) : null);
      case 'int': return Math.trunc(pyNumVal(pyEval(args[0], env)));
      case 'float': return pyNumVal(pyEval(args[0], env));
      case 'str': return String(pyRawVal(pyEval(args[0], env)));
      case 'abs': return Math.abs(pyNumVal(pyEval(args[0], env)));
      case 'list': { var lv = pyEval(args[0], env); return new PList_(lv instanceof PList_ ? lv.v.slice() : []); }
      case 'sum': {
        var arr = pyEval(args[0], env), s = 0, items = arr instanceof PList_ ? arr.v : [];
        for (i = 0; i < items.length; i++) { s += pyNumVal(items[i]); state.ops++; }
        return s;
      }
      case 'sorted': {
        var src = pyEval(args[0], env), items2 = src instanceof PList_ ? src.v.slice() : [];
        items2.sort(function (a, b) { return pyNumVal(a) - pyNumVal(b); });
        state.ops += items2.length * Math.max(1, Math.log(items2.length + 1) / Math.LN2);
        return new PList_(items2);
      }
      case 'min': case 'max': {
        var vals = [];
        for (i = 0; i < args.length; i++) {
          var av = pyEval(args[i], env);
          if (av instanceof PList_) { for (var j = 0; j < av.v.length; j++) vals.push(pyNumVal(av.v[j])); }
          else vals.push(pyNumVal(av));
        }
        if (!vals.length) return 0;
        return name === 'min' ? Math.min.apply(null, vals) : Math.max.apply(null, vals);
      }
      case '__ceil': return Math.ceil(pyNumVal(pyEval(args[0], env)));
      case '__log2': return Math.log(Math.max(pyNumVal(pyEval(args[0], env)), 1e-12)) / Math.LN2;
      case '__random': return Math.random();
      case 'range': case '__range': {
        var a0 = Math.trunc(pyNumVal(pyEval(args[0], env)));
        var a1 = args.length > 1 ? Math.trunc(pyNumVal(pyEval(args[1], env))) : a0;
        var lo = args.length > 1 ? a0 : 0;
        var st = args.length > 2 ? Math.trunc(pyNumVal(pyEval(args[2], env))) : 1;
        var out = [];
        if (st > 0) for (i = lo; i < a1; i += st) out.push(i); else for (i = lo; i > a1; i += st) out.push(i);
        return new PList_(out);
      }
      case 'print': {
        var pr = [];
        for (i = 0; i < args.length; i++) pr.push(pyRawVal(pyEval(args[i], env)));
        state.logs.push(pr.map(function (x) { return typeof x === 'string' ? x : JSON.stringify(x); }).join(' '));
        return null;
      }
      default: {
        var fn = env.get(name);
        if (!fn || fn.t !== 'userfunc') return undefined;
        var vals2 = args.map(function (a) { return pyEval(a, env); });
        return pyCallUser(fn, vals2);
      }
    }
  }
  function pyCollectLocals(body) {
    var names = [];
    (function walk(list) {
      for (var i = 0; i < (list || []).length; i++) {
        var s = list[i]; if (!s) continue;
        if (s.t === 'assign' && s.target && s.target.t === 'var') { if (names.indexOf(s.target.n) < 0) names.push(s.target.n); }
        else if (s.t === 'for') { if (names.indexOf(s.v) < 0) names.push(s.v); walk(s.body); }
        else if (s.t === 'if') { walk(s.body); walk(s.els); }
        else if (s.t === 'while' || s.t === 'repeat') walk(s.body);
        else if (s.t === 'funcdef') { }
      }
    })(body);
    return names;
  }
  function pyCallUser(fn, vals) {
    state.ops++; state.steps++;
    if (state.steps > state.budget) throw new Error('步数超限（可能是死循环或递归过深）');
    var local = new Env(fn.closure);
    for (var i = 0; i < fn.params.length; i++) local.define(fn.params[i], vals[i]);
    var locals0 = pyCollectLocals(fn.body);
    for (var q = 0; q < locals0.length; q++) {
      var ln = locals0[q];
      if (fn.params.indexOf(ln) < 0 && !Object.prototype.hasOwnProperty.call(local.vars, ln)) local.define(ln, PNone());
    }
    var res = pyExecBlock(fn.body, local);
    if (res && res.__ret) return res.value;
    return undefined;
  }
  function pyAssignTarget(target, value, env) {
    if (!target) return;
    if (target.t === 'var') { env.set(target.n, value); return; }
    if (target.t === 'index') { pySetItem(pyEval(target.obj, env), pyEval(target.index, env), value); return; }
    if (target.t === 'slice') {
      var obj = pyEval(target.obj, env);
      if (obj instanceof PList_) {
        var len = obj.v.length;
        var a = target.lo ? pyIndex(pyEval(target.lo, env), len) : 0;
        var b = target.hi ? pyIndex(pyEval(target.hi, env), len) + 1 : len;
        for (var i = Math.max(0, a); i < Math.min(len, b); i++) { obj.v[i] = value; state.writes++; }
      }
    }
  }
  function pyEvalCond(e, env) { return pyTruth(pyEval(e, env)); }
  function pyExecBlock(stmts, env) {
    for (var i = 0; i < stmts.length; i++) {
      var r = pyExecStmt(stmts[i], env);
      if (r) return r;
    }
    return null;
  }
  function pyExecStmt(s, env) {
    if (!s) return null;
    state.ops++; state.steps++;
    if (state.steps > state.budget) throw new Error('步数超限（可能是死循环或递归过深）');
    switch (s.t) {
      case 'assign': pyAssignTarget(s.target, pyEval(s.value, env), env); return null;
      case 'exprstmt': pyEval(s.e, env); return null;
      case 'return': return { __ret: true, value: s.e ? pyEval(s.e, env) : null };
      case 'pass': return null;
      case 'break': return { __break: true };
      case 'continue': return { __cont: true };
      case 'if':
        if (pyEvalCond(s.cond, env)) return pyExecBlock(s.body, env);
        if (s.els && s.els.length) return pyExecBlock(s.els, env);
        return null;
      case 'while': {
        while (pyEvalCond(s.cond, env)) {
          state.ops++; state.steps++;
          if (state.steps > state.budget) throw new Error('步数超限（可能是死循环或递归过深）');
          var r2 = pyExecBlock(s.body, env);
          if (r2 && r2.__ret) return r2;
          if (r2 && r2.__break) break;
        }
        return null;
      }
      case 'repeat': {
        for (;;) {
          state.ops++; state.steps++;
          if (state.steps > state.budget) throw new Error('步数超限（可能是死循环或递归过深）');
          var r3 = pyExecBlock(s.body, env);
          if (r3 && r3.__ret) return r3;
          if (r3 && r3.__break) break;
          if (pyEvalCond(s.cond, env)) break;
        }
        return null;
      }
      case 'for': {
        var start = Math.trunc(pyNumVal(pyEval(s.start, env)));
        var stop = Math.trunc(pyNumVal(pyEval(s.stop, env)));
        var step = Math.trunc(pyNumVal(s.step ? pyEval(s.step, env) : 1)) || 1;
        var v = start;
        while (step > 0 ? (v <= stop) : (v >= stop)) {
          state.ops++; state.steps++;
          if (state.steps > state.budget) throw new Error('步数超限（可能是死循环或递归过深）');
          env.set(s.v, v);
          var r4 = pyExecBlock(s.body, env);
          if (r4 && r4.__ret) return r4;
          if (r4 && r4.__break) break;
          v = pyNumVal(env.get(s.v)) + step;
        }
        return null;
      }
      case 'funcdef':
        env.define(s.name, { t: 'userfunc', name: s.name, params: s.params, body: s.body, closure: env });
        return null;
      default: return null;
    }
  }
  function pyRun(program, input, opts) {
    opts = opts || {};
    state.ops = 0; state.steps = 0; state.arrOps = 0; state.writes = 0;
    state.maxIdx = 0; state.logs = []; state.oob = 0; state.oobWrites = 0;
    state.budget = opts.budget || 2000000;
    state.input = (opts.specs && input) ? pyAdaptInput(opts.specs, input) : (input || {});
    var out = { err: null, ops: 0, ms: 0, out: null, arrOps: 0, writes: 0, maxIdx: 0, logs: [], oob: 0, oobWrites: 0 };
    var root = new Env(null);
    var t0 = clock();
    try {
      for (var i = 0; i < program.length; i++) {
        var st = program[i];
        if (st.t === 'funcdef') { pyExecStmt(st, root); continue; }
        var r = pyExecStmt(st, root);
        if (r && r.__ret) { out.out = r.value; break; }
      }
      if (out.out === undefined) out.out = null;
    } catch (e) { out.err = e; }
    out.ms = clock() - t0;
    out.ops = state.ops;
    out.arrOps = state.arrOps;
    out.writes = state.writes;
    out.maxIdx = state.maxIdx;
    out.logs = state.logs.slice();
    out.oob = state.oob;
    out.oobWrites = state.oobWrites;
    return out;
  }
  function pyPlain(v) {
    if (v instanceof PList_) return v.v.map(pyPlain);
    if (v === null || v === undefined) return null;
    return v;
  }
  /* 统一输出形状：单元素数组视为标量，便于显示与对拍 */
  function pyUnwrap(v) {
    var guard = 0;
    while (Array.isArray(v) && v.length === 1 && guard++ < 5) v = v[0];
    return v;
  }
  function pyAdaptInputPublic(specs, input) { return pyAdaptInput(specs, input); }

  /* ---- 独立可运行的 Python 源码（含 input() 读入与 print 输出） ---- */
  function pyUsedNames(node, acc) {
    if (!node) return acc;
    if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) pyUsedNames(node[i], acc); return acc; }
    if (typeof node !== 'object') return acc;
    if (node.t === 'var' && acc.vars) acc.vars[node.n] = 1;
    if (node.t === 'assign' || node.t === 'for') acc.assigned = acc.assigned || {};
    for (var k in node) {
      if (k === 't') continue;
      var v = node[k];
      if (typeof v === 'string') {
        if (k === 'n' && node.t === 'var') acc.vars[v] = 1;
        if (k === 'v' && node.t === 'for') acc.assigned[v] = 1;
        if ((k === 'name') && node.t === 'funcdef') acc.funcs[v] = 1;
        if ((k === 'f') && node.t === 'call') acc.calls[v] = 1;
      } else if (v && typeof v === 'object') pyUsedNames(v, acc);
    }
    return acc;
  }
  function pyStandalone(compiled) {
    var program = compiled.pyProgram;
    if (!program) return compiled.code;
    var specs = compiled.inputSpec || [];
    var acc = { vars: {}, assigned: {}, funcs: {}, calls: {} };
    pyUsedNames(program, acc);
    var lines = [];
    var reads = [], params = [];
    for (var i = 0; i < specs.length; i++) {
      var sp = specs[i];
      if (sp.kind === 'scalar' && sp.inferred) continue;
      if (sp.global && sp.kind === 'scalar') { lines.push(sp.name + ' = int(input())'); params.push(sp.name); }
      else if (sp.kind === 'scalar') { reads.push(sp.name); params.push(sp.name); }
      else { reads.push(sp.name); params.push(sp.name); }
    }
    if (!params.length && acc.vars['n']) { lines.push('n = int(input())'); params.push('n'); }
    if (acc.vars['n'] && lines.indexOf('n = int(input())') < 0 && params.indexOf('n') < 0) { lines.push('n = int(input())'); params.push('n'); }
    for (i = 0; i < reads.length; i++) {
      var nm = reads[i];
      var spec = null, q;
      for (q = 0; q < specs.length; q++) if (specs[q].name === nm) spec = specs[q];
      if (spec && spec.kind === 'array') {
        lines.push(nm + ' = [int(x) for x in input().split()]');
      } else if (spec && spec.kind === 'matrix') {
        lines.push(nm + ' = []');
        lines.push('for __r in range(' + (spec.dims[0] || 'n') + '):');
        lines.push('    ' + nm + '.append([int(x) for x in input().split()])');
      } else {
        lines.push(nm + ' = int(input())');
      }
    }
    // 规模变量的推导：n = len(A) - 1（1-based 数组长度）
    var derived = [];
    for (i = 0; i < specs.length; i++) {
      var sp2 = specs[i];
      if (sp2.kind !== 'array' && sp2.kind !== 'matrix') continue;
      var dt = sp2.inferredName;
      if (dt && params.indexOf(dt) < 0 && derived.indexOf(dt) < 0) {
        derived.push(dt);
        lines.push(dt + ' = len(' + sp2.name + ')');
      }
    }
    var inParams = [];
    for (i = 0; i < (compiled.outputs || []).length; i++) { /* 占位，下面用 calls 判断 */ }
    // 入口调用的实参名即为“输入数组/标量”
    (function () {
      for (var pi = 0; pi < program.length; pi++) {
        var nd = program[pi];
        if (nd.t === 'assign' && nd.value && nd.value.t === 'call') {
          for (var ai = 0; ai < (nd.value.args || []).length; ai++) {
            var a = nd.value.args[ai];
            if (a.t === 'var' && inParams.indexOf(a.n) < 0) inParams.push(a.n);
          }
        }
      }
    })();
    var head = '# 独立可运行版本：粘贴到 python3 直接跑（按提示用标准输入给数据）' + '\n' + lines.join('\n');
    var defs = [], body = [];
    for (i = 0; i < program.length; i++) {
      if (program[i].t === 'funcdef') defs.push(program[i]);
      else if (i === program.length - 1 && program[i].t === 'return') continue;  // 末尾打包用 return，独立版去掉
      else body.push(program[i]);
    }
    var outs = (compiled.outputs || []).filter(function (o) { return inParams.indexOf(o) < 0; });
    if (outs.length === 1) body.push(PExprStmt(PCall('print', [PVar(outs[0])])));
    else if (outs.length > 1) body.push(PExprStmt(PCall('print', outs.map(function (o) { return PVar(o); }))));
    var prelude = [];
    for (i = 0; i < outs.length; i++) {
      var onm = outs[i];
      var isArrOut = false, q3;
      for (q3 = 0; q3 < specs.length; q3++) if (specs[q3].name === onm) isArrOut = true;
      if (isArrOut) continue;
      prelude.push(PAssign(PVar(onm), PNone()));
    }
    if (derived.length && !prelude.length) prelude.push(PPass());
    var mainBody = prelude.concat(body);
    if (!mainBody.length) mainBody = [PPass()];
    var src = head + '\n\n' + pyRender(defs) + '\n\n' + pyRender([PFuncDef('main', [], mainBody)]) + '\n\nmain()\n';
    return src;
  }

  function executeCompiled(compiled, input, opts) {
    opts = opts || {};
    if (!compiled || !compiled.pyProgram) {
      return { err: new Error('未编译成功'), ops: 0, ms: 0, out: null, arrOps: 0, writes: 0, maxIdx: 0, logs: [], oobWrites: 0 };
    }
    var res = pyRun(compiled.pyProgram, input || {}, { budget: opts.budget || 3000000, specs: compiled.inputSpec });
    res.out = pyUnwrap(pyPlain(res.out));
    return res;
  }


  /* ===================== 7. 编译辅助 ===================== */
  function entryFunctionReturnExpr(fn) {
    if (!fn) return null;
    var found = null;
    (function walk(list) {
      for (var i = 0; i < (list || []).length && !found; i++) {
        var s = list[i]; if (!s) continue;
        if (s.k === 'func') continue;
        if (s.k === 'return') { if (s.e) found = s.e; continue; }
        if (s.k === 'block' || s.k === 'program') walk(s.body);
        else if (s.k === 'if') { walk(s.body); walk(s.els); }
        else if (s.k === 'for' || s.k === 'foreach' || s.k === 'while' || s.k === 'repeat') walk(s.body);
      }
    })(fn.body);
    return found;
  }
  function parseExprText(txt) {
    var r = parse('x = ' + txt);
    if (r.ast && r.ast.body.length && r.ast.body[0].k === 'assign') return r.ast.body[0].e;
    return null;
  }
  function quickCost(e) {
    if (!e) return [term(1, {})];
    switch (e.k) {
      case 'num': return [term(e.v, {})];
      case 'var': return (e.name === 'n' || e.name === 'N') ? [term(1, { n: 1 })] : [term(1, {})];
      case 'bin':
        if (e.op === '+' || e.op === '-') return sumTerms([quickCost(e.l), quickCost(e.r)]);
        if (e.op === '*') return mulTerms([quickCost(e.l), quickCost(e.r)]);
        if (e.op === '/') return quickCost(e.l);
        return [term(1, {})];
      default: return [term(1, {})];
    }
  }
  function formatDiags(diags) {
    if (!diags || !diags.length) return '✓ 无语法/语义问题';
    return diags.map(function (d) {
      return (d.level === 'error' ? '✗ 错误' : '⚠ 提示') + ' 第 ' + d.line + ' 行：' + d.msg;
    }).join('\n');
  }
  function analyzeTopStmt(s, fnInfos, env) {
    var acc = [];
    function exprCost(e) {
      if (!e) return [];
      switch (e.k) {
        case 'num': case 'str': case 'bool': case 'null': case 'var': case 'newarray': return [term(1, {})];
        case 'bin': return (e.op === '^' || e.op === '**') ? [term(1, {})] : sumTerms([exprCost(e.l), exprCost(e.r), [term(1, {})]]);
        case 'un': return sumTerms([exprCost(e.e), [term(1, {})]]);
        case 'index': return sumTerms([exprCost(e.obj), exprCost(e.index), [term(1, {})]]);
        case 'member': return exprCost(e.obj);
        case 'tern': return sumTerms([exprCost(e.cond), exprCost(e.a), exprCost(e.b)]);
        case 'arraylit': return [term(1 + (e.items ? e.items.length : 0), {})];
        case 'range': return sumTerms([exprCost(e.lo), exprCost(e.hi)]);
        case 'call': {
          var t = term(1, {});
          if (BUILTINS.indexOf(e.name) < 0) t.fn = e.name;
          return sumTerms([sumTerms((e.args || []).map(exprCost)), [t]]);
        }
        default: return [term(1, {})];
      }
    }
    function walk(list) {
      for (var k = 0; k < list.length; k++) {
        var s = list[k];
        if (!s) continue;
        if (s.k === 'block' || s.k === 'program') { walk(s.body); continue; }
        if (s.k === 'func') continue;
        if (s.k === 'if') { acc = acc.concat(exprCost(s.cond)); walk(s.body); walk(s.els); continue; }
        if (s.k === 'for') {
          var cnt = sumTerms([exprCost(s.to), [term(1, {})]]);
          var saved = acc; acc = [];
          walk(s.body);
          var inner = acc; acc = saved;
          acc = acc.concat(mulTerms([cnt, inner.length ? inner : [term(1, {})]]));
          continue;
        }
        if (s.k === 'foreach' || s.k === 'while' || s.k === 'repeat') {
          var saved2 = acc; acc = [];
          walk(s.body);
          var inner2 = acc; acc = saved2;
          acc = acc.concat(mulTerms([[term(1, { n: 1 })], inner2.length ? inner2 : [term(1, {})]]));
          continue;
        }
        if (s.k === 'assign' || s.k === 'assignIndex' || s.k === 'sliceAssign') acc = acc.concat(exprCost(s.e), [term(1, {})]);
        else if (s.k === 'decl') acc = acc.concat(s.init ? exprCost(s.init) : [term(0.5, {})]);
        else if (s.k === 'exprstmt') acc = acc.concat(exprCost(s.e));
        else if (s.k === 'return') acc = acc.concat(s.e ? exprCost(s.e) : []);
        else if (s.k === 'output') acc = acc.concat(sumTerms((s.args || []).map(exprCost)));
        else if (s.k === 'swap') acc = acc.concat(exprCost(s.a), exprCost(s.b), [term(1, {})]);
      }
    }
    walk([s]);
    return sumTerms(acc);
  }

  /* ===================== 8. 测试数据生成 ===================== */

  function dimValue(str, size, inputs) {
    if (str == null) return Math.max(1, size);
    var s = String(str).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    if (/^(n|N|size|len|m)$/.test(s)) return Math.max(1, size);
    var m = /^\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*([-+])\s*(\d+)\s*\)?$/.exec(s);
    if (m) {
      var base = /^(n|N|size|len|m)$/.test(m[1]) ? size : (inputs && typeof inputs[m[1]] === 'number' ? inputs[m[1]] : size);
      return Math.max(1, base + (m[2] === '-' ? -1 : 1) * parseInt(m[3], 10));
    }
    m = /^\(?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\/\s*(\d+)\s*\)?$/.exec(s);
    if (m) {
      var base2 = /^(n|N|size|len|m)$/.test(m[1]) ? size : (inputs && typeof inputs[m[1]] === 'number' ? inputs[m[1]] : size);
      return Math.max(1, Math.floor(base2 / parseInt(m[2], 10)));
    }
    m = /^(\d+)\s*\*\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(s);
    if (m) {
      var base3 = /^(n|N|size|len|m)$/.test(m[2]) ? size : (inputs && typeof inputs[m[2]] === 'number' ? inputs[m[2]] : size);
      return Math.max(1, parseInt(m[1], 10) * base3);
    }
    if (inputs && typeof inputs[s] === 'number') return Math.max(1, inputs[s]);
    return Math.max(1, size);
  }
  function generateInput(specs, size, rng, entryName) {
    var inputs = {}, i, j, k;
    var scale = { min: -99, max: 99 };
    for (i = 0; i < specs.length; i++) {
      var s = specs[i];
      if (s.kind === 'array') {
        var len = dimValue(s.dims[0], size, inputs);
        inputs[s.name] = genArray(len, rng, entryName, s);
      } else if (s.kind === 'matrix') {
        var r = dimValue(s.dims[0], size, inputs), c = dimValue(s.dims[1], size, inputs);
        var m = [];
        for (j = 0; j < r; j++) {
          var row = [];
          for (k = 0; k < c; k++) row.push(rndInt(rng, scale.min, scale.max));
          m.push(row);
        }
        inputs[s.name] = m;
      } else {
        var sn = String(s.name).toLowerCase();
        var looksIndex = /^(l|r|lo|hi|left|right|start|end|beg|begin|p|q|top|bottom|first|last|from|to)$/.test(sn);
        if (s.isDim) inputs[s.name] = size;
        else if (looksIndex) inputs[s.name] = 1;
        else inputs[s.name] = size;
      }
    }
    return inputs;
  }
  function genArray(len, rng, fname, spec) {
    var f = String(fname || '').toLowerCase(), i, a = [];
    if (/perm|shuffle|randomiz/.test(f)) {
      for (i = 1; i <= len; i++) a.push(i);
      for (i = len - 1; i > 0; i--) { var j = rndInt(rng, 0, i), t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    var lo = -99, hi = 99;
    if (/sum|max|min|subarray|profit|stock/.test(f)) { lo = -40; hi = 40; }
    if (/posit|weight|value|cost|price/.test(f)) { lo = 1; hi = 60; }
    for (i = 0; i < len; i++) a.push(rndInt(rng, lo, hi));
    return a;
  }


  /* 按输入规格顺序生成数据：先规模，再数组/矩阵（矩阵按 spec 顺序，若未知就跳过） */
  function pyGenerateInput(specs, size, rng, entryName) {
    var inputs = {};
    for (var i = 0; i < specs.length; i++) {
      var sp = specs[i];
      if (sp.kind === 'scalar') continue;
      var d0 = sp.dims[0];
      var v0 = (d0 && inputs[d0] !== undefined) ? inputs[d0] : (d0 && /^[A-Za-z_]/.test(String(d0)) && inputs[String(d0)] !== undefined ? inputs[String(d0)] : size);
      if (sp.kind === 'array') {
        inputs[sp.name] = genArray(v0, rng, entryName, sp);
      } else if (sp.kind === 'matrix') {
        var d1 = sp.dims[1];
        var v1 = (d1 && inputs[d1] !== undefined) ? inputs[d1] : size;
        var m = [];
        for (var r = 0; r < v0; r++) {
          var row = [];
          for (var c = 0; c < v1; c++) row.push(rndInt(rng, -99, 99));
          m.push(row);
        }
        inputs[sp.name] = m;
      }
    }
    for (i = 0; i < specs.length; i++) {
      var s2 = specs[i];
      if (s2.kind !== 'scalar') continue;
      if (s2.inferred) { inputs[s2.name] = inputs[s2.name]; continue; }
      var arrName = null;
      for (var q = 0; q < specs.length; q++) if (specs[q].kind === 'array') { arrName = specs[q].name; break; }
      var nameLow = String(s2.name).toLowerCase();
      if (/^(x|key|target|find|search|v|value)$/.test(nameLow) && arrName && Array.isArray(inputs[arrName]) && inputs[arrName].length) {
        inputs[s2.name] = rng() < 0.7 ? inputs[arrName][Math.floor(rng() * inputs[arrName].length)] : rndInt(rng, -99, 99);
      } else {
        inputs[s2.name] = size;
      }
    }
    return inputs;
  }

  /* ===================== 9. 复杂度拟合 ===================== */

  var CLASSES = [
    { key: 'constant', label: 'O(1)', basis: function (n) { return 1; } },
    { key: 'log', label: 'O(log n)', basis: function (n) { return Math.log(Math.max(n, 2)); } },
    { key: 'sqrt', label: 'O(n^(1/2))', basis: function (n) { return Math.sqrt(n); } },
    { key: 'linear', label: 'O(n)', basis: function (n) { return n; } },
    { key: 'nlogn', label: 'O(n log n)', basis: function (n) { return n * Math.log(Math.max(n, 2)); } },
    { key: 'n2', label: 'O(n^2)', basis: function (n) { return n * n; } },
    { key: 'n3', label: 'O(n^3)', basis: function (n) { return n * n * n; } },
    { key: 'n4', label: 'O(n^4)', basis: function (n) { return Math.pow(n, 4); } },
    { key: 'expo', label: 'O(2^n)', basis: function (n) { return Math.pow(2, n); } },
    { key: 'nlog2', label: 'O(n log^2 n)', basis: function (n) { return n * Math.pow(Math.log(Math.max(n, 2)), 2); } },
    { key: 'log2', label: 'O(log^2 n)', basis: function (n) { return Math.pow(Math.log(Math.max(n, 2)), 2); } }
  ];
  function solveLinear(A, b) {
    var n = b.length, i, j, k, M = [];
    for (i = 0; i < n; i++) M.push(A[i].slice().concat([b[i]]));
    for (i = 0; i < n; i++) {
      var piv = i;
      for (j = i + 1; j < n; j++) if (Math.abs(M[j][i]) > Math.abs(M[piv][i])) piv = j;
      if (Math.abs(M[piv][i]) < 1e-12) return null;
      var tmp = M[i]; M[i] = M[piv]; M[piv] = tmp;
      for (j = i + 1; j < n; j++) {
        var f = M[j][i] / M[i][i];
        for (k = i; k <= n; k++) M[j][k] -= f * M[i][k];
      }
    }
    var x = new Array(n).fill(0);
    for (i = n - 1; i >= 0; i--) {
      var s = M[i][n];
      for (j = i + 1; j < n; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }
  function fitComplexity(points) {
    var n = points.length;
    if (n < 5) return { ok: false, reason: '样本点不足（至少需要 5 个数据规模）' };
    var useTime = points.every(function (p) { return p.ms > 0.005; }) && points[points.length - 1].ms > points[0].ms * 4;
    var y = points.map(function (p) { return useTime ? p.ms : p.ops; });
    var Aexp = points.map(function (p) { return [1, Math.log(Math.max(p.n, 2))]; });
    var logY = y.map(function (v) { return Math.log(Math.max(v, 1e-9)); });
    var fitExp = solveLinear([[Aexp.length, Aexp.reduce(function (a, r) { return a + r[1]; }, 0)], [Aexp.reduce(function (a, r) { return a + r[1]; }, 0), Aexp.reduce(function (a, r) { return a + r[1] * r[1]; }, 0)]],
      [logY.reduce(function (a, v) { return a + v; }, 0), Aexp.reduce(function (a, r, i) { return a + r[1] * logY[i]; }, 0)]);
    var slope = fitExp ? fitExp[1] : NaN;
    var fits = [];
    for (var i = 0; i < CLASSES.length; i++) {
      var c = CLASSES[i], xs = points.map(function (p) { return c.basis(p.n); });
      var f = lstsq2(xs, y);
      if (!f) continue;
      fits.push({ key: c.key, label: c.label, r2: f.r2, coef: f.a, rss: f.rss });
    }
    // 幂次参考值：用于在同 R² 的候选中挑“阶数最接近”的简单类
    var POW = { constant: 0, log: 0, log2: 0, sqrt: 0.5, linear: 1, nlogn: 1, nlog2: 1, n2: 2, n3: 3, n4: 4, expo: 99 };
    var SIMPLE = { constant: 0, log: 1, sqrt: 2, linear: 3, nlogn: 4, nlog2: 5, n2: 6, n3: 7, n4: 8, log2: 9, expo: 10 };
    if (isFinite(slope)) {
      var expGuess = null;
      if (points.length >= 4) {
        var ratios = [], ei;
        for (ei = 1; ei < points.length; ei++) {
          if (points[ei].n - points[ei - 1].n <= 3 && points[ei - 1].ops > 0) ratios.push(points[ei].ops / points[ei - 1].ops);
        }
        if (ratios.length >= 3) {
          var rmin = Math.min.apply(null, ratios), rmax = Math.max.apply(null, ratios);
          if (rmin > 1.4 && rmax < 2.8 && (rmax - rmin) < 0.6) expGuess = 'expo';
        }
      }
      fits.sort(function (a, b) {
        if (expGuess) {
          if (a.key === expGuess) return -1;
          if (b.key === expGuess) return 1;
        }
        var ra = Math.abs((POW[a.key] || 0) - slope), rb = Math.abs((POW[b.key] || 0) - slope);
        if (Math.abs(slope) < 0.35) {
          var rankOf = function (k) { return ({ constant: 0, log: 1, log2: 2, sqrt: 3 })[k]; };
          var ka = rankOf(a.key), kb = rankOf(b.key);
          if (ka != null && kb != null && ka !== kb) return ka - kb;
        }
        if (a.r2 > 0.85 && b.r2 > 0.85) {
          // 斜率是更可靠的增长阶证据：斜率差 > 0.18 时直接按斜率排序
          if (ra < rb - 0.18) return -1;
          if (rb < ra - 0.18) return 1;
          if (b.r2 - a.r2 > 0.008) return b.r2 - a.r2;
          return (SIMPLE[a.key] || 0) - (SIMPLE[b.key] || 0);
        }
        return b.r2 - a.r2;
      });
    } else {
      fits.sort(function (a, b) { return b.r2 - a.r2; });
    }
    /* 增长阶判定：指数特征 → 斜率分桶（桶内按 R² 精选） */
    if (fits.length && points.length >= 5 && isFinite(slope)) {
      var expHit = null, ei2;
      var ratios2 = [];
      for (ei2 = 1; ei2 < points.length; ei2++) {
        if (points[ei2].n - points[ei2 - 1].n <= 4 && points[ei2 - 1].ops > 0) ratios2.push(points[ei2].ops / points[ei2 - 1].ops);
      }
      if (ratios2.length >= 3) {
        var rmin2 = Math.min.apply(null, ratios2), rmax2 = Math.max.apply(null, ratios2);
        var stepC = points[1].n / Math.max(points[0].n, 1);
        var kPer = Math.log(rmax2) / Math.log(stepC);
        if (kPer > 1.5 && kPer < 3.8 && (rmax2 - rmin2) / rmax2 < 0.22) expHit = 'expo';
        else if (rmin2 > 1.42 && rmax2 < 2.1 && (rmax2 - rmin2) < 0.4) expHit = 'expo';
      }
      function pickAmong(keys) {
        var best = null;
        for (var q = 0; q < fits.length; q++) if (keys.indexOf(fits[q].key) >= 0) { if (!best || fits[q].r2 > best.r2) best = fits[q]; }
        return best;
      }
      var chosen = null;
      if (expHit) chosen = pickAmong([expHit]);
      else if (slope < -0.5) chosen = pickAmong(['linear', 'constant', 'log']);   // 近常数（大量提前返回）：交由静态推导
      else if (slope < 0.35) chosen = pickAmong(['log', 'constant']);
      else if (slope < 0.78) chosen = pickAmong(['sqrt', 'linear', 'log']);
      else if (slope < 1.45) {
        var half = Math.max(1, Math.floor(points.length / 2));
        var avg = function (a, b) { var s = 0, c = 0; for (var z = a; z < b; z++) { s += points[z].ops / points[z].n; c++; } return c ? s / c : 0; };
        var drift = avg(points.length - half, points.length) / Math.max(avg(0, half), 1e-9);
        chosen = pickAmong(drift > 1.18 ? ['nlogn', 'nlog2', 'linear'] : ['linear', 'nlogn']);
      }
      else if (slope < 1.75) chosen = pickAmong(['nlogn', 'nlog2', 'n2']);
      else if (slope < 2.5) chosen = pickAmong(['n2', 'n3']);
      else if (slope < 3.01) chosen = pickAmong(['n3', 'n2']);
      else if (slope < 3.5) chosen = pickAmong(['n3']);
      else if (slope < 4.5) chosen = pickAmong(['n4', 'n3']);
      else chosen = pickAmong(['expo']);
      if (chosen) {
        fits.sort(function (a, b) {
          if (a.key === chosen.key) return -1;
          if (b.key === chosen.key) return 1;
          return b.r2 - a.r2;
        });
      }
    }
    var guess = null;
    if (isFinite(slope)) {
      var bestD = 1e9;
      for (var q = 0; q < CLASSES.length; q++) {
        var c2 = CLASSES[q];
        if (c2.key === 'expo') continue;
        var r1 = c2.basis(500), r2 = c2.basis(1000);
        if (!(r1 > 0)) continue;
        var loc = Math.log(r2 / r1) / Math.LN2;
        var dd = Math.abs(loc - slope);
        if (dd < bestD) { bestD = dd; guess = c2.label; }
      }
    }
    return { ok: true, slope: slope, guessClass: guess, fits: fits, metric: useTime ? 'ms' : 'ops', points: points };
  }
  function lstsq2(xs, ys) {
    var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0, i;
    for (i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
    var den = n * sxx - sx * sx;
    if (Math.abs(den) < 1e-12) return null;
    var a = (n * sxy - sx * sy) / den;
    var b = (sy - a * sx) / n;
    var rss = 0, sst = 0, my = sy / n;
    for (i = 0; i < n; i++) { rss += Math.pow(a * xs[i] + b - ys[i], 2); sst += Math.pow(ys[i] - my, 2); }
    return { a: a, b: b, rss: rss, r2: sst > 0 ? 1 - rss / sst : 1 };
  }

  function defaultSizes(maxSize, expo) {
    if (expo) return [10, 12, 14, 16, 18, 20];
    var base = Math.max(20, Math.min(maxSize || 400, 640));
    var out = [];
    for (var i = 0; i < 6; i++) out.push(Math.round(base * Math.pow(1.6, i) / 10) * 10);
    return out;
  }

  function measureSolution(compiled, opts) {
    opts = opts || {};
    var expo = compiled.analysis && compiled.analysis.expWarn;
    var sizes = opts.sizes && opts.sizes.length ? opts.sizes : defaultSizes(opts.maxSize, expo);
    var points = [], errors = [], sample = null, i, r;
    var rounds = opts.rounds || 2;
    for (i = 0; i < sizes.length; i++) {
      var size = sizes[i], best = null;
      for (r = 0; r < rounds; r++) {
        var rng = mulberry32(97 + r * 7919 + size * 104729);
        var input = opts.makeInput ? opts.makeInput(size, rng) : pyGenerateInput(compiled.inputSpec, size, rng, compiled.entry);
        var res = executeCompiled(compiled, input, { budget: opts.budget || 3000000 });
        if (res.err) { errors.push({ n: size, msg: String(res.err.message || res.err) }); continue; }
        if (!best || res.ops < best.ops) { best = res; best.input = input; }
      }
      if (best) {
        points.push({ n: size, ops: best.ops, ms: best.ms, arrOps: best.arrOps, writes: best.writes, maxIdx: best.maxIdx, out: best.out });
        if (sample == null) sample = { n: size, out: best.out, input: best.input };
      }
    }
    return { points: points, fit: fitComplexity(points), errors: errors, sample: sample, sizes: sizes };
  }

  /* ===================== 10. 多解交叉验证 ===================== */

  /* 实测不可靠（斜率≈0 且样本漂移很小）时，用静态推导兜底 */
  function robustClass(fit, staticClass) {
    if (!fit || !fit.ok || !fit.fits || !fit.fits.length) return staticClass;
    var best = fit.fits[0];
    var drift = false;
    if (fit.points && fit.points.length >= 4) {
      var a = fit.points[0].ops / Math.max(fit.points[0].n, 1);
      var b = fit.points[fit.points.length - 1].ops / Math.max(fit.points[fit.points.length - 1].n, 1);
      drift = Math.abs(b - a) / Math.max(a, 1e-9) > 0.15;
    }
    if (!drift && fit.slope < 0.35 && best.label !== 'O(1)') return staticClass || best.label;
    return best.label;
  }
  function compareSolutions(compiledList, opts) {
    opts = opts || {};
    var expo = compiledList.some(function (c) { return c.analysis && c.analysis.expWarn; });
    var sizes = opts.sizes && opts.sizes.length ? opts.sizes : defaultSizes(opts.maxSize, expo).slice(0, 5);
    var rows = [], i, j, r;
    for (i = 0; i < sizes.length; i++) {
      var size = sizes[i];
      var rng = mulberry32(20240 + size * 31);
      var input = opts.makeInput ? opts.makeInput(size, rng) : generateInput(compiledList[0].inputSpec, size, rng, compiledList[0].entry);
      var row = { n: size, cells: [], ok: true };
      for (j = 0; j < compiledList.length; j++) {
        var res = executeCompiled(compiledList[j], input, { budget: opts.budget || 3000000 });
        row.cells.push({ out: res.out, ops: res.ops, ms: res.ms, err: res.err ? String(res.err.message || res.err) : null });
      }
      for (j = 1; j < row.cells.length; j++) {
        if (row.cells[j].err || row.cells[0].err) { row.ok = false; continue; }
        if (norm(row.cells[j].out) !== norm(row.cells[0].out)) row.ok = false;
      }
      rows.push(row);
    }
    var agree = rows.every(function (x) { return x.ok; });
    return { rows: rows, agree: agree, sizes: sizes };
  }
  function norm(v) {
    if (Array.isArray(v)) return '[' + v.slice(1).map(norm).join(',') + ']';
    if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6);
    if (v === undefined) return 'undefined';
    if (v && typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return String(v); } }
    return String(v);
  }

  /* ===================== 11. 自检用例 ===================== */

  var PRE = 'var INF = 1000000000;\n';

  function caseList() {
    return [
      {
        name: '① 最大子段和 · 动态规划', entry: 'maxSubArray', outputs: ['best'], sizes: [64, 128, 256, 512, 1024, 2048], want: 'O(n)',
        src: PRE + 'function maxSubArray(A[1..n]) : int\n  cur = A[1]\n  best = A[1]\n  for i = 2 to n do\n    if cur > 0 then cur = cur + A[i] else cur = A[i] end\n    if cur > best then best = cur end\n  end\n  return best\nend'
      },
      {
        name: '② 最大子段和 · 三重枚举', entry: 'maxSubArraySlow', outputs: ['best'], sizes: [40, 60, 90, 130, 190, 270], want: 'O(n^3)',
        src: PRE + 'function maxSubArraySlow(A[1..n]) : int\n  best = A[1]\n  for i = 1 to n do\n    for j = i to n do\n      s = 0\n      for k = i to j do\n        s = s + A[k]\n      end\n      if s > best then best = s end\n    end\n  end\n  return best\nend'
      },
      {
        name: '③ 二分查找 · while + 折半', entry: 'binarySearch', outputs: ['r'], sizes: [1000, 2000, 4000, 8000, 16000, 32000], input: 'sorted', want: 'log',
        src: PRE + 'function binarySearch(A[1..n], x) : int\n  lo = 1\n  hi = n\n  while lo <= hi do\n    mid = floor((lo + hi) / 2)\n    if A[mid] == x then return mid end\n    if A[mid] < x then lo = mid + 1 else hi = mid - 1 end\n  end\n  return -1\nend'
      },
      {
        name: '④ 归并排序 · 分治递归', entry: 'mergeSort', outputs: ['A'], sizes: [64, 128, 256, 512, 1024, 2048], want: 'n',
        src: PRE + 'function mergeSort(A[1..n], l, r)\n  if l >= r then return end\n  mid = floor((l + r) / 2)\n  mergeSort(A, l, mid)\n  mergeSort(A, mid + 1, r)\n  B[1..n]\n  i = l\n  j = mid + 1\n  k = 1\n  while i <= mid and j <= r do\n    if A[i] <= A[j] then B[k] = A[i] ; i = i + 1 else B[k] = A[j] ; j = j + 1 end\n    k = k + 1\n  end\n  while i <= mid do B[k] = A[i] ; i = i + 1 ; k = k + 1 end\n  while j <= r do B[k] = A[j] ; j = j + 1 ; k = k + 1 end\n  for t = l to r do A[t] = B[t - l + 1] end\n  return\nend'
      },
      {
        name: '⑤ 0/1 背包 · 二维 DP', entry: 'knapsack', outputs: ['ans'], sizes: [10, 14, 19, 26, 36, 50], want: 'n',
        src: PRE + 'function knapsack(n, W, wt[1..n], val[1..n]) : int\n  dp[1..n][1..W]\n  for j = 1 to W do\n    if wt[1] <= j then dp[1][j] = val[1] else dp[1][j] = 0 end\n  end\n  for i = 2 to n do\n    for j = 1 to W do\n      dp[i][j] = dp[i - 1][j]\n      if wt[i] <= j then\n        if dp[i - 1][j - wt[i]] + val[i] > dp[i][j] then dp[i][j] = dp[i - 1][j - wt[i]] + val[i] end\n      end\n    end\n  end\n  return dp[n][W]\nend'
      },
      {
        name: '⑥ 斐波那契 · 朴素递归（应判指数级）', entry: 'fib', outputs: ['ans'], sizes: [8, 10, 12, 14, 16, 18], want: '2^', expo: true,
        src: PRE + 'function fib(n) : int\n  if n <= 1 then return n end\n  return fib(n - 1) + fib(n - 2)\nend'
      },
      {
        name: '⑦ 1-based 下标验证 + 中文关键字', entry: 'firstIndex', outputs: ['ans'], sizes: [64, 128, 256, 512, 1024, 2048], want: 'O(n)', input: 'hasX',
        src: PRE + '函数 firstIndex(A[1..n], x) : 整数\n  如果 A[1] == x 那么\n    返回 1\n  结束\n  对于 i 从 1 到 n 步长 1 做\n    如果 A[i] == x 那么\n      返回 i\n    结束\n  结束\n  返回 0\n结束'
      },
      {
        name: '⑧ 冒泡排序 · swap 语句', entry: 'bubbleSort', outputs: ['A'], sizes: [40, 70, 110, 170, 260, 400], want: 'O(n^2)',
        src: PRE + 'function bubbleSort(A[1..n])\n  for i = 1 to n - 1 do\n    for j = 1 to n - i do\n      if A[j] > A[j + 1] then swap A[j], A[j + 1] end\n    end\n  end\n  return\nend'
      },
      {
        name: '⑨ 插入排序 · while 循环', entry: 'insertionSort', outputs: ['A'], sizes: [40, 70, 110, 170, 260, 400], want: 'O(n^2)',
        src: PRE + 'function insertionSort(A[1..n])\n  for i = 2 to n do\n    key = A[i]\n    j = i - 1\n    while j >= 1 and A[j] > key do\n      A[j + 1] = A[j]\n      j = j - 1\n    end\n    A[j + 1] = key\n  end\n  return\nend'
      },
      {
        name: '⑩ Floyd · 三重循环 + 矩阵', entry: 'floyd', outputs: ['ans'], sizes: [10, 14, 19, 26, 36, 50], want: 'O(n^3)',
        src: PRE + 'function floyd(d[1..n][1..n]) : int\n  for k = 1 to n do\n    for i = 1 to n do\n      for j = 1 to n do\n        if d[i][k] + d[k][j] < d[i][j] then d[i][j] = d[i][k] + d[k][j] end\n      end\n    end\n  end\n  return 0\nend'
      },
      {
        name: '⑪ 数组元素最大值 · 简单遍历', entry: 'maxValue', outputs: ['ans'], sizes: [64, 128, 256, 512, 1024, 2048], want: 'O(n)',
        src: PRE + 'function maxValue(A[1..n]) : int\n  m = A[1]\n  for i = 2 to n do\n    if A[i] > m then m = A[i] end\n  end\n  return m\nend'
      },
      {
        name: '⑫ 计数排序 · 线性时间（值域固定）', entry: 'countingSort', outputs: ['A'], sizes: [64, 128, 256, 512, 1024, 2048], want: 'O(n)',
        src: PRE + 'function countingSort(A[1..n])\n  cnt[1..200]\n  for i = 1 to 200 do cnt[i] = 0 end\n  for i = 1 to n do\n    v = A[i] + 100\n    cnt[v] = cnt[v] + 1\n  end\n  k = 1\n  for v = 1 to 200 do\n    for t = 1 to cnt[v] do\n      A[k] = v - 100\n      k = k + 1\n    end\n  end\n  return\nend'
      }
    ];
  }

  function selfTest(onProgress) {
    var cases = caseList(), results = [], i;
    for (i = 0; i < cases.length; i++) {
      if (onProgress) onProgress(i, cases[i]);
      results.push(runCase(cases[i]));
    }
    return results;
  }

  function makeInputFor(compiled, c, size, seed) {
    var rng = mulberry32(seed * 7919 + size * 104729 + 13);
    var input = generateInput(compiled.inputSpec, size, rng, compiled.entry);
    if (c.input === 'sorted') {
      for (var k in input) if (Array.isArray(input[k])) input[k] = input[k].slice().sort(function (a, b) { return a - b; });
      if ('x' in input) input.x = (rng() < 0.5 && input[compiled.inputSpec[0].name]) ? input[compiled.inputSpec[0].name][Math.min(size - 1, Math.floor(rng() * size))] : rndInt(rng, -99, 99);
    }
    if (c.input === 'hasX') {
      var arrName = null;
      for (var k2 in input) if (Array.isArray(input[k2])) arrName = k2;
      if (arrName && 'x' in input) input.x = rng() < 0.7 ? input[arrName][Math.min(size - 1, Math.floor(rng() * size))] : 12345;
    }
    return input;
  }

  function runCase(c) {
    var out = { name: c.name, ok: true, steps: [], want: c.want };
    var push = function (state, title, detail) { out.steps.push({ state: state, title: title, detail: detail }); if (state === 'fail') out.ok = false; };
    var t0 = clock();
    var comp = compile(c.src, { outputs: c.outputs, entry: c.entry });
    out.compileMs = Math.round((clock() - t0) * 100) / 100;
    var errs = (comp.diagnostics || []).filter(function (d) { return d.level === 'error'; });
    if (!comp.ok || errs.length) {
      push('fail', '编译失败', errs.map(function (e) { return '第' + e.line + '行: ' + e.msg; }).join('\n') || '未知错误');
      return out;
    }
    push('pass', '编译通过', '入口 ' + comp.entry + '（输出 ' + (comp.outputs.join(', ') || '—') + '；输入 ' + comp.inputSpec.map(function (s) { return s.name + ':' + s.kind + (s.dims.length ? '[' + s.dims.join('][') + ']' : ''); }).join(', ') + '）');
    out.compiled = comp;

    var name = comp.inputSpec[0].name;
    var one = null;
    try {
      var input = makeInputFor(comp, c, c.sizes[2] || 100, 1);
      one = executeCompiled(comp, input, { budget: 4000000 });
      if (one.err) { push('fail', '运行出错', String(one.err.message || one.err)); return out; }
      out.sample = { input: input, out: one.out, ops: one.ops, ms: one.ms };
      push('pass', '运行成功', '规模 ' + (c.sizes[2] || 100) + '：' + one.ops + ' 次基本操作，' + fmtNum(one.ms) + ' ms；输出 ' + JSON.stringify(one.out).slice(0, 80));
    } catch (e) {
      push('fail', '运行异常', String(e.message || e));
      return out;
    }

    var staticClass = comp.analysis.timeClass;
    var staticOk = c.want ? staticClass.indexOf(c.want.split(' ')[0]) === 0 || staticClass === c.want : true;
    push(staticOk ? 'pass' : 'warn', '静态复杂度推导 = ' + staticClass,
      '推导式 ' + comp.analysis.exprTime + '；循环最大嵌套 ' + comp.analysis.loopDepth + ' 层' + (comp.analysis.expWarn ? '；⚠ 判定为指数级' : ''));

    var meas = measureSolution(comp, { sizes: c.sizes, rounds: 2, makeInput: function (size, rng) { return makeInputFor(comp, c, size, 1); } });
    out.measure = meas;
    if (!meas.points.length) { push('fail', '实测无有效数据', (meas.errors[0] || {}).msg || ''); return out; }
    var ops = meas.points.map(function (p) { return p.n + '→' + p.ops; }).join('  ');
    push('pass', '实测操作计数', ops + (meas.errors.length ? '（部分规模失败：' + meas.errors[0].msg + '）' : ''));
    if (meas.fit && meas.fit.ok) {
      var best = meas.fit.fits[0];
      var ev = '最佳拟合 ' + best.label + ' (R²=' + fmtNum(best.r2) + ')，log-log 斜率 ' + fmtNum(meas.fit.slope);
      var hit = meas.fit.fits.filter(function (f) { return f.label === staticClass; })[0];
      if (hit) ev += '；静态推导 ' + staticClass + ' R²=' + fmtNum(hit.r2);
      var agree = hit ? (meas.fit.fits.indexOf(hit) <= 1) : (best.label === staticClass);
      push(agree ? 'pass' : 'warn', '静态推导 vs 实测拟合', ev + (agree ? ' —— 一致' : ' —— 不一致，请人工核对'));
    } else {
      push('warn', '拟合未完成', (meas.fit && meas.fit.reason) || '');
    }
    return out;
  }


  /* ===================== 伪代码评测打分 ===================== */
  function parseWantComplexity(text) {
    if (!text) return null;
    var t = String(text).toLowerCase().replace(/\s+/g, '');
    var m = t.match(/o\((2\^n|n\^?\d*|n)?\*?\(?log\^?\d*\)?n?\^?\d*\)/);
    if (!m) return null;
    var body = m[1] || 'n';
    var pow = { 'constant': 0, 'log': 0, 'log2': 0, 'sqrt': 0.5, 'linear': 1, 'nlogn': 1.1, 'nlog2': 1.2, 'n2': 2, 'n3': 3, 'n4': 4 };
    var key = null;
    if (/2\^n/.test(t)) key = 'expo';
    else if (/nlog\^?2/.test(t)) key = 'nlog2';
    else if (/nlogn/.test(t)) key = 'nlogn';
    else if (/n\^3/.test(t)) key = 'n3';
    else if (/n\^2/.test(t)) key = 'n2';
    else if (/n\^4/.test(t)) key = 'n4';
    else if (/^logn$/.test(body) || /^log/.test(body)) key = 'log';
    else if (/^n$/.test(body)) key = 'linear';
    else if (/^1$/.test(body)) key = 'constant';
    var rank = { constant: 0, log: 1, log2: 1.5, sqrt: 2, linear: 3, nlogn: 4, nlog2: 4.5, n2: 5, n3: 6, n4: 7, expo: 9 };
    return key ? { key: key, rank: rank[key] || 3, text: m[0] } : null;
  }
  function classRank(label) {
    var rank = { 'O(1)': 0, 'O(log n)': 1, 'O(log^2 n)': 1.5, 'O(n^(1/2))': 2, 'O(n)': 3, 'O(n log n)': 4, 'O(n log^2 n)': 4.5, 'O(n^2)': 5, 'O(n^3)': 6, 'O(n^4)': 7, 'O(2^n)': 9 };
    return rank[label] == null ? 3 : rank[label];
  }
  function gradePseudo(source, opts) {
    opts = opts || {};
    var report = { score: 0, total: 100, dims: [], findings: [], ok: false, measured: null, staticClass: null, entry: null };
    function dim(name, got, full, note) { report.dims.push({ name: name, score: Math.round(got * 10) / 10, full: full, note: note || '' }); }
    function find(level, text, hint) { report.findings.push({ level: level, text: text, hint: hint || '' }); }

    /* ① 编译（25 分） */
    var comp = compile(source, { entry: opts.entry, outputs: opts.outputs });
    var errs = (comp.diagnostics || []).filter(function (d) { return d.level === 'error'; });
    if (!comp.ok || errs.length) {
      dim('语法与编译', 0, 25, '未通过编译');
      errs.slice(0, 6).forEach(function (e) { find('error', '第 ' + e.line + ' 行：' + e.msg, '按提示修正语法（数组 1 起、function … end 配对、比较用 ==）'); });
      report.diagText = errs.map(function (e) { return '第' + e.line + '行 ' + e.msg; }).join('；');
      return report;
    }
    report.ok = true;
    report.entry = comp.entry;
    report.staticClass = comp.analysis.timeClass;
    dim('语法与编译', 25, 25, '编译通过，入口 ' + comp.entry);

    /* ② 运行与鲁棒性（30 分） */
    var base = opts.size || 256;
    var patterns = [
      { name: '常规随机数据', gen: function (n, rng) { return generateInput(comp.inputSpec, n, rng, comp.entry); } },
      { name: '最小规模', gen: function (n, rng) { return generateInput(comp.inputSpec, 1, rng, comp.entry); } },
      { name: '小规模', gen: function (n, rng) { return generateInput(comp.inputSpec, 2, rng, comp.entry); } },
      { name: '递增有序', gen: function (n, rng) { var inp = generateInput(comp.inputSpec, n, rng, comp.entry); sortArrays(inp, 1); return inp; } },
      { name: '递减有序', gen: function (n, rng) { var inp = generateInput(comp.inputSpec, n, rng, comp.entry); sortArrays(inp, -1); return inp; } },
      { name: '全部相同', gen: function (n, rng) { var inp = generateInput(comp.inputSpec, n, rng, comp.entry); flatArrays(inp, 7); return inp; } },
      { name: '极值数据', gen: function (n, rng) { var inp = generateInput(comp.inputSpec, n, rng, comp.entry); extremeArrays(inp); return inp; } }
    ];
    function sortArrays(inp, dir) {
      for (var k in inp) if (Array.isArray(inp[k]) && k !== 'n' && inp[k].length > 3) inp[k] = inp[k].slice().sort(function (a, b) { return dir * (a - b); });
    }
    function flatArrays(inp, v) { for (var k in inp) if (Array.isArray(inp[k]) && inp[k].length > 3 && typeof inp[k][0] !== 'object') inp[k] = inp[k].map(function () { return v; }); }
    function extremeArrays(inp) {
      for (var k in inp) if (Array.isArray(inp[k]) && inp[k].length > 3 && typeof inp[k][0] !== 'object') {
        inp[k] = inp[k].map(function (x, i) { return (i % 2 === 0) ? 999999 : -999999; });
      }
    }
    var runs = [], failed = [];
    patterns.forEach(function (pt, pi) {
      var rng = mulberry32(1000 + pi * 97);
      var input = pt.gen(base, rng);
      var res = executeCompiled(comp, input, { budget: 2000000 });
      if (res.err) failed.push({ pattern: pt.name, msg: String(res.err.message || res.err) });
      runs.push({ pattern: pt.name, err: res.err ? String(res.err.message || res.err) : null, ops: res.ops, out: res.out, maxIdx: res.maxIdx, ms: res.ms });
    });
    var runScore = 30 * (runs.length - failed.length) / runs.length;
    if (failed.length) {
      failed.forEach(function (f) { find('error', '在「' + f.pattern + '」下运行失败：' + f.msg, '检查边界条件：1-based 下标越界、除零、空数组、数组上界是否越界'); });
    }
    var outOfRange = runs.filter(function (r) { return !r.err && r.maxIdx > (base + 2); }).length;
    if (outOfRange) { find('warn', '检测到访问下标远大于数组规模（可能把 1-based 当成 0-based 或上界写错）'); runScore -= 4; }
    dim('运行与鲁棒性', Math.max(0, runScore), 30, failed.length ? (failed.length + ' / ' + runs.length + ' 种数据下失败') : (runs.length + ' 种数据全部正常（含最小/有序/重复/极值）'));

    /* ③ 正确性（25 分）：与其他解法对拍 + 结果合理性 */
    var cross = null, crossScore = 0;
    if (opts.compareWith && opts.compareWith.length) {
      var others = [];
      for (var ci = 0; ci < opts.compareWith.length; ci++) {
        var oc = compile(opts.compareWith[ci].code, { outputs: opts.compareWith[ci].outputs });
        if (oc.ok) others.push({ name: opts.compareWith[ci].name || ('解法' + (ci + 1)), comp: oc });
      }
      if (others.length) {
        var sizes = defaultSizes(base, comp.analysis.expWarn).slice(0, 4);
        var bad = [];
        for (var si = 0; si < sizes.length; si++) {
          var rng2 = mulberry32(555 + sizes[si]);
          var inp2 = generateInput(comp.inputSpec, sizes[si], rng2, comp.entry);
          var mine = executeCompiled(comp, inp2, { budget: 2000000 });
          if (mine.err) { bad.push('n=' + sizes[si] + ' 本解运行失败'); continue; }
          for (var oi = 0; oi < others.length; oi++) {
            var theirs = executeCompiled(others[oi].comp, inp2, { budget: 2000000 });
            if (theirs.err) continue;
            if (norm(mine.out) !== norm(theirs.out)) {
              bad.push('n=' + sizes[si] + ' 与「' + others[oi].name + '」结果不一致：' + norm(mine.out).slice(0, 24) + ' vs ' + norm(theirs.out).slice(0, 24));
            }
          }
        }
        if (bad.length) {
          crossScore = 6;
          bad.slice(0, 3).forEach(function (b) { find('error', '多解对拍不一致：' + b, '两边输出不同说明至少有一个写错，重点看边界与初始值'); });
        } else {
          crossScore = 20;
          find('pass', '多解对拍通过：在 ' + sizes.length + ' 个规模上与其它解法输出完全一致');
        }
      }
    }
    var sampleOut = runs[0] && !runs[0].err ? runs[0].out : null;
    if (sampleOut === null || sampleOut === undefined) {
      find('warn', '没有取到有效输出（可能函数没有 return，也没有修改数组）', '确认入口函数有 return，或返回被修改的数组变量');
      crossScore += 2;
    } else crossScore += 5;
    dim('结果正确性', Math.min(25, crossScore), 25, cross ? ('对拍 ' + cross.tested + ' 个规模，' + (cross.mismatches.length ? cross.mismatches.length + ' 处不一致' : '全部一致')) : '未提供对照解法，仅做输出存在性检查');

    /* ④ 复杂度达标（12 分） */
    var meas = null;
    try { meas = measureSolution(comp, { maxSize: base, rounds: 2 }); } catch (e) { meas = null; }
    var measuredClass = (meas && meas.fit && meas.fit.ok && meas.fit.fits.length) ? meas.fit.fits[0].label : null;
    report.measured = measuredClass;
    report.timeClass = comp.analysis.timeClass;
    report.declared = comp.analysis.exprTime;
    var want = parseWantComplexity(opts.requireTime || '');
    var cScore = 0, cNote = '';
    if (comp.analysis.timeClass || measuredClass) {
      var mainClass = comp.analysis.timeClass || measuredClass;
      cNote = '推导 ' + mainClass + (comp.analysis.exprTime ? '（' + comp.analysis.exprTime + '）' : '') +
        (measuredClass && measuredClass !== mainClass ? '；实测参考 ' + measuredClass : '');
      if (want) {
        var mr = classRank(mainClass), wr = want.rank;
        if (mr <= wr + 0.01) { cScore = 12; cNote += '，达到要求 ' + want.text; }
        else if (mr <= wr + 1.01) { cScore = 8; cNote += '，略高于要求 ' + want.text; find('warn', '复杂度比要求的 ' + want.text + ' 略高（推导 ' + mainClass + '）', '尝试更优的算法或去掉内层可省略的循环'); }
        else { cScore = 3; cNote += '，明显高于要求 ' + want.text; find('error', '复杂度过高：要求 ' + want.text + '，推导约 ' + mainClass, '需要换算法（如排序/分治/DP/双指针）'); }
      } else { cScore = 9; cNote += '，未指定要求'; }
    } else {
      cNote = '样本不足，未能拟合（规模太小或运行太快）';
      cScore = 6;
    }
    if (comp.analysis.expWarn && !(want && want.key === 'expo')) {
      cScore = Math.min(cScore, 3);
      find('error', '判定为指数级算法（如朴素递归 fib），数据稍大就会超时', '改用记忆化、动态规划或迭代写法');
    }
    dim('复杂度达标', cScore, 12, cNote);

    /* ⑤ 空间占用（4 分） */
    var sRank = classRank(comp.analysis.spaceClass);
    var sScore = sRank <= 4 ? 4 : 2;
    dim('空间复杂度', sScore, 4, '静态推导 ' + comp.analysis.spaceClass + '（' + comp.analysis.exprSpace + '）');
    if (sRank > 4) find('warn', '额外空间达到 ' + comp.analysis.spaceClass + '，注意是否能原地完成');

    /* ⑥ 规范与习惯（4 分） */
    var styleScore = 4, styleNotes = [];
    var zeroIdx = runs.filter(function (r) { return !r.err && r.maxIdx === 0; }).length;
    if (zeroIdx === runs.length && runs.length) {
      var arrInputs = (comp.inputSpec || []).filter(function (s) { return s.kind === 'array' || s.kind === 'matrix'; });
      if (arrInputs.length) {
        styleNotes.push('似乎没有访问数组元素（数组题应从 A[1] 开始）');
        styleScore -= 2;
        find('warn', '没有观察到数组访问：数组下标应从 1 开始，A[1] 是第一个元素');
      }
    }
    if (comp.analysis.loopDepth === 0 && !comp.analysis.patterns.length) { styleNotes.push('没有循环也没有递归'); styleScore -= 1; }
    if (comp.analysis.patterns.length) styleNotes.push('递归结构：' + comp.analysis.patterns.map(function (p) { return p.patternName; }).join('/'));
    styleNotes.push('输出变量 ' + ((comp.outputs || []).join(', ') || '（就地修改）'));
    dim('代码规范', Math.max(0, styleScore), 4, styleNotes.join('；'));

    var sum = 0;
    report.dims.forEach(function (d) { sum += d.score; });
    report.score = Math.max(0, Math.min(100, Math.round(sum)));
    report.level = report.score >= 90 ? '优秀' : report.score >= 75 ? '良好' : report.score >= 60 ? '及格' : '需要改进';
    report.compiled = comp;
    return report;
  }

  /* ===================== 12. 导出 ===================== */

  return {
    version: '2.0.0',
    parse: parse,
    compile: compile,
    executeCompiled: executeCompiled,
    measureSolution: measureSolution,
    compareSolutions: compareSolutions,
    generateInput: pyGenerateInput,
    generateInputLegacy: generateInput,
    makeInputFor: makeInputFor,
    fitComplexity: fitComplexity,
    selfTest: selfTest,
    caseList: caseList,
    fmtNum: fmtNum,
    fmtExpr: fmtExpr,
    classOf: classOf,
    norm: norm,
    pyRun: pyRun,
    gradePseudo: gradePseudo,
    parseWantComplexity: parseWantComplexity,
    pyPlain: pyPlain,
    pyUnwrap: pyUnwrap,
    robustClass: robustClass,
    pyStandalone: pyStandalone,
    mulberry32: mulberry32,
    defaultSizes: defaultSizes
  };
});
/* =========================================================================
 * 界面层：题目 / 多解编辑器 + AI 测评打分（组长终审）+ 复杂度 + 题库
 * ========================================================================= */
(function () {
  'use strict';
  var C = window.PseudoCore;
  var LSKEY = 'pseudo-course-workbench-v1';
  var OLD_KEYS = ['pseudo-course-workbench-v3', 'pseudo-course-workbench-v2', 'pseudo-course-workbench'];
  var WRITEKEY = 'pseudo-course-workbench-lastwrite';
  var CFGKEY = 'pseudo-ai-config-v1';
  var ed = null;
  var state = { problems: [], currentId: null, tab: 'analysis', gradeTab: 'overview', diagOpen: false, banks: [], bootKey: null, bookSel: {}, bookOpen: {}, bookQ: '' };

  function uid() { return Math.random().toString(36).slice(2, 9); }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safe(fn, label) {
    try { return fn(); } catch (e) {
      try { console.error('[workbench] ' + label, e); } catch (e2) { }
      var t = document.getElementById('toast');
      if (t) { t.textContent = label + '出错：' + (e && e.message); t.className = 'toast show bad'; }
      return null;
    }
  }
  function toast(msg, kind) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (kind || '');
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.className = 'toast'; }, 3400);
  }
  function joinLines(arr) { return arr.join('\n'); }
  function currentProblem() {
    for (var i = 0; i < state.problems.length; i++) if (state.problems[i].id === state.currentId) return state.problems[i];
    return null;
  }
  function currentSolution() {
    var p = currentProblem();
    if (!p || !p.solutions || !p.solutions.length) return null;
    for (var i = 0; i < p.solutions.length; i++) if (p.solutions[i].id === p.currentSol) return p.solutions[i];
    p.currentSol = p.solutions[0].id;
    return p.solutions[0];
  }
  /* ---------------- 题库持久化（只在 v1 一个键里，绝不丢数据） ---------------- */
  function readKey(k) {
    try {
      var raw = localStorage.getItem(k);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!Array.isArray(data) || !data.length) return null;
      return data;
    } catch (e) { return null; }
  }
  /* 本机保存过的所有题库版本：每个键都是一份完整快照，谁都不删 */
  function readMeta() {
    try { var m = JSON.parse(localStorage.getItem(WRITEKEY) || '{}'); return (m && typeof m === 'object') ? m : {}; } catch (e) { return {}; }
  }
  function bankKeys() {
    var ks = [LSKEY];
    var i;
    for (i = 0; i < OLD_KEYS.length; i++) if (ks.indexOf(OLD_KEYS[i]) < 0) ks.push(OLD_KEYS[i]);
    ks.push('pseudo-course-workbench-backup');
    var snaps = snapKeys();
    for (i = 0; i < snaps.length; i++) if (ks.indexOf(snaps[i]) < 0) ks.push(snaps[i]);
    try {
      for (i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('pseudo-course-workbench') !== 0) continue;
        if (k.indexOf('-lastwrite') >= 0) continue;
        if (ks.indexOf(k) < 0) ks.push(k);
      }
    } catch (e2) { }
    return ks;
  }
  function scanBanks() {
    var meta = readMeta(), found = [];
    bankKeys().forEach(function (k) {
      var raw = readKey(k);
      if (!raw) return;
      var fixed = null;
      try { fixed = sanitizeProblems(raw); } catch (e) { fixed = null; }
      if (!fixed || !fixed.length) return;
      var t = typeof meta[k] === 'number' ? meta[k] : 0;
      found.push({ key: k, list: fixed, n: fixed.length, at: t });
    });
    found.sort(function (a, b) { return (b.at - a.at) || (b.n - a.n); });
    return found;
  }
  function loadStoredProblems() {
    var banks = scanBanks();
    if (!banks.length) return null;
    state.banks = banks;
    // 优先用主键 v1；v1 没有才退回最新的那一份，并且只读、不回写别的键
    var best = banks[0], i;
    for (i = 0; i < banks.length; i++) if (banks[i].key === LSKEY) { best = banks[i]; break; }
    state.bootKey = best.key;
    return best.list;
  }
  // 启动时只用本机已保存的题库；不提供任何会切换/覆盖题库的界面
  var SNAP_N = 3;
  function snapKeys() {
    var a = [];
    for (var i = 0; i < SNAP_N; i++) a.push('pseudo-course-workbench-snap-' + i);
    return a;
  }
  function save() {
    var txt = '';
    try { txt = JSON.stringify(state.problems); } catch (e) { return; }
    var now = Date.now();
    var meta = readMeta();
    var turn = (typeof meta['snapTurn'] === 'number') ? meta['snapTurn'] : 0;
    var ks = [LSKEY, 'pseudo-course-workbench-backup', snapKeys()[turn % SNAP_N]];
    for (var i = 0; i < ks.length; i++) {
      try { localStorage.setItem(ks[i], txt); meta[ks[i]] = now; } catch (e2) { }
    }
    try {
      meta['snapTurn'] = (turn + 1) % SNAP_N;
      localStorage.setItem(WRITEKEY, JSON.stringify(meta));
    } catch (e4) { }
    state.savedAt = now;
    var dot = document.getElementById('saveDot');
    if (dot) {
      dot.textContent = '已自动保存 ' + new Date(now).toLocaleTimeString();
      dot.className = 'save-dot';
    }
  }
  var autoTimer = null;
  function autosave() {
    if (autoTimer) clearTimeout(autoTimer);
    var dot0 = document.getElementById('saveDot');
    if (dot0) dot0.className = 'save-dot busy';
    autoTimer = setTimeout(function () {
      autoTimer = null;
      try { save(); } catch (e) { }
    }, 350);
  }

  /* ---------------- 数据体检 ---------------- */
  function sanitizeProblems(list) {
    if (!Array.isArray(list)) return null;
    var out = [];
    list.forEach(function (p) {
      if (!p || typeof p !== 'object') return;
      var prob = {
        id: p.id || uid(),
        title: (typeof p.title === 'string' ? p.title : ''),
        statement: (typeof p.statement === 'string' ? p.statement : ''),
        notes: (typeof p.notes === 'string' ? p.notes : ''),
        size: (typeof p.size === 'number' && p.size > 0) ? p.size : 512,
        solutions: [], currentSol: null
      };
      (Array.isArray(p.solutions) ? p.solutions : []).forEach(function (s, i) {
        if (!s || typeof s !== 'object') return;
        prob.solutions.push({
          id: s.id || uid(),
          name: (typeof s.name === 'string' && s.name) ? s.name : ('解法 ' + (i + 1)),
          code: (typeof s.code === 'string') ? s.code : '',
          outputs: Array.isArray(s.outputs) ? s.outputs : null,
          badgeText: (typeof s.badgeText === 'string') ? s.badgeText : '未编译',
          badgeKind: s.badgeKind || '',
          grade: s.grade || null,
          result: null, measure: null, measuredClass: null
        });
      });
      if (!prob.solutions.length) {
        prob.solutions.push({ id: uid(), name: '解法一', code: joinLines(['function solve(n) : int', '  ans = 0', '  return ans', 'end']), outputs: null, badgeText: '未编译', badgeKind: '', grade: null, result: null });
      }
      prob.currentSol = prob.solutions[0].id;
      out.push(prob);
    });
    return out.length ? out : null;
  }

  /* ---------------- 示例题目 ---------------- */
  function demoProblem() {
    var sols = [
      { id: uid(), name: '解法一 · 动态规划 O(n)', outputs: ['best'], badgeText: '未编译',
        code: joinLines(['// 最大子段和：Kadane 算法（数组下标从 1 开始）', 'function maxSubArray(A[1..n]) : int', '  cur = A[1]', '  best = A[1]', '  for i = 2 to n do', '    if cur > 0 then cur = cur + A[i] else cur = A[i] end', '    if cur > best then best = cur end', '  end', '  return best', 'end']) },
      { id: uid(), name: '解法二 · 前缀和最值 O(n)', outputs: ['best'], badgeText: '未编译',
        code: joinLines(['// 最大子段和：前缀和最小值', 'function maxSubArrayPrefix(A[1..n]) : int', '  s = 0', '  minS = 0', '  best = A[1]', '  for i = 1 to n do', '    s = s + A[i]', '    if s - minS > best then best = s - minS end', '    if s < minS then minS = s end', '  end', '  return best', 'end']) },
      { id: uid(), name: '解法三 · 三重枚举 O(n^3)', outputs: ['best'], badgeText: '未编译',
        code: joinLines(['// 最大子段和：朴素枚举（对照用）', 'function maxSubArraySlow(A[1..n]) : int', '  best = A[1]', '  for i = 1 to n do', '    for j = i to n do', '      s = 0', '      for k = i to j do', '        s = s + A[k]', '      end', '      if s > best then best = s end', '    end', '  end', '  return best', 'end']) }
    ];
    return {
      id: uid(), title: '最大子段和',
      statement: joinLines([
        '给定 n 个整数（可正可负）组成的序列 A[1..n]，求形如 A[i..j]（1 ≤ i ≤ j ≤ n）的连续子段的最大和。', '',
        '输入：第一行整数 n；第二行 n 个整数 A[1..n]。',
        '输出：一个整数，表示最大子段和（若全为负数，取最大的单个元素）。', '',
        '示例：n = 8，A = [4, -3, 5, -2, -1, 2, 6, -2]，答案 11。'
      ]),
      notes: '要求 O(n) 或 O(n log n)',
      size: 512, solutions: sols, currentSol: sols[0].id
    };
  }

  /* ---------------- 语法高亮 ---------------- */
  var KW = ['function', 'procedure', 'if', 'then', 'else', 'end', 'for', 'to', 'downto', 'step', 'while', 'do', 'repeat', 'until', 'return', 'print', 'output', 'input', 'swap', 'break', 'continue', 'and', 'or', 'not', 'mod', 'div', 'foreach', 'in', 'new', 'array', 'of', 'true', 'false', 'int', 'integer', 'float', 'real', 'bool', 'boolean', 'string', 'void', 'var', 'let'];
  var CNKW = ['如果', '那么', '否则', '结束', '对于', '从', '到', '步长', '做', '当', '重复', '直到', '返回', '输出', '输入', '交换', '函数', '过程', '定义', '且', '或', '非', '数组', '整数', '实数', '布尔', '字符串', '真', '假', '遍历', '令', '设', '取模', '整除'];
  var BSL = String.fromCharCode(92);
  var kwRe = new RegExp(BSL + 'b(' + KW.join('|') + ')' + BSL + 'b', 'g');
  var cnRe = new RegExp('(' + CNKW.join('|') + ')', 'g');
  function highlight(src) {
    var out = esc(src);
    out = out.replace(/(\/\/[^\n]*|#[^\n]*)/g, '\u0001$1\u0002');
    var parts = out.split('\u0001');
    for (var i = 1; i < parts.length; i++) {
      var seg = parts[i].split('\u0002');
      parts[i] = '<span class="c-cm">' + seg[0] + '</span>' + (seg[1] || '');
    }
    out = parts.join('');
    out = out.replace(/(&quot;[^&\n]*?&quot;|&#39;[^&\n]*?&#39;)/g, '<span class="c-st">$1</span>');
    out = out.replace(kwRe, '<span class="c-kw c-kw-big">$1</span>');
    out = out.replace(cnRe, '<span class="c-kw c-kw-big">$1</span>');
    out = out.replace(/(\b\d+(\.\d+)?\b)/g, '<span class="c-nu">$1</span>');
    out = out.replace(/([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*)(\s*\[)/g, '<span class="c-ar">$1</span>$2');
    return out;
  }

  /* ---------------- 编辑器 ---------------- */
  function Editor() {
    var self = this;
    this.ta = $('edInput');
    this.gutter = $('edGutter');
    this.hl = $('edHl');
    this.history = [''];
    this.index = 0;
    this.timer = null;
    this.lastSnap = '';
    this.onChange = null;
    this.snapshot = function (force) {
      var v = self.ta.value;
      if (!force && v === self.lastSnap) return;
      if (self.index < self.history.length - 1) self.history = self.history.slice(0, self.index + 1);
      self.history.push(v);
      if (self.history.length > 150) self.history.shift();
      self.index = self.history.length - 1;
      self.lastSnap = v;
      updateUndo();
    };
    this.ta.addEventListener('input', function () {
      self.render();
      if (self.timer) clearTimeout(self.timer);
      self.timer = setTimeout(function () { self.snapshot(false); }, 480);
      if (self.onChange) self.onChange();
    });
    this.ta.addEventListener('blur', function () { if (self.timer) clearTimeout(self.timer); self.snapshot(false); });
    this.ta.addEventListener('paste', function () { setTimeout(function () { self.snapshot(true); }, 0); });
    this.ta.addEventListener('scroll', function () {
      self.gutter.scrollTop = self.ta.scrollTop;
      self.hl.scrollTop = self.ta.scrollTop;
      self.hl.scrollLeft = self.ta.scrollLeft;
    });
    this.ta.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      var k = (e.key || '').toLowerCase();
      if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); self.undo(); }
      else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); self.redo(); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        var s = self.ta.selectionStart, en = self.ta.selectionEnd;
        self.ta.value = self.ta.value.slice(0, s) + '  ' + self.ta.value.slice(en);
        self.ta.selectionStart = self.ta.selectionEnd = s + 2;
        self.render(); self.snapshot(true);
      }
    });
  }
  Editor.prototype.setValue = function (v, reset) {
    this.ta.value = v == null ? '' : v;
    if (reset) { this.history = [this.ta.value]; this.index = 0; this.lastSnap = this.ta.value; }
    this.render(); updateUndo();
  };
  Editor.prototype.value = function () { return this.ta.value; };
  Editor.prototype.undo = function () {
    if (this.timer) clearTimeout(this.timer);
    if (this.index > 0) {
      if (this.history[this.index] !== this.ta.value) this.history[this.index] = this.ta.value;
      this.index--;
      this.ta.value = this.history[this.index];
      this.lastSnap = this.ta.value;
      this.render(); updateUndo();
      if (this.onChange) this.onChange();
    }
  };
  Editor.prototype.redo = function () {
    if (this.index < this.history.length - 1) {
      this.index++;
      this.ta.value = this.history[this.index];
      this.lastSnap = this.ta.value;
      this.render(); updateUndo();
      if (this.onChange) this.onChange();
    }
  };
  Editor.prototype.render = function () {
    var lines = this.ta.value.split('\n').length;
    var g = '';
    for (var i = 1; i <= Math.max(lines, 1); i++) g += i + '\n';
    this.gutter.textContent = g;
    this.hl.innerHTML = highlight(this.ta.value) + '\n';
    var st = $('edStat');
    if (st) st.textContent = lines + ' 行 · ' + this.ta.value.length + ' 字符 · 数组下标从 1 开始';
  };
  function updateUndo() {
    if (!ed) return;
    var u = $('btnUndo'), r = $('btnRedo');
    if (u) u.disabled = ed.index <= 0;
    if (r) r.disabled = ed.index >= ed.history.length - 1;
  }

  /* ---------------- 左侧列表 ---------------- */
  function renderProblems() {
    var box = $('probList');
    box.innerHTML = '';
    var cnt = $('bankCount');
    if (cnt) cnt.textContent = String(state.problems.length);
    state.problems.forEach(function (p) {
      var d = el('div', 'prob-item' + (p.id === state.currentId ? ' active' : ''));
      d.appendChild(el('div', 'prob-title', p.title || '未命名题目'));
      d.appendChild(el('div', 'prob-meta', (p.solutions ? p.solutions.length : 0) + ' 个解法'));
      d.onclick = function () { state.currentId = p.id; save(); renderAll(); };
      box.appendChild(d);
    });
  }
  function renderSolutions() {
    var p = currentProblem(), box = $('solList');
    box.innerHTML = '';
    if (!p || !p.solutions.length) return;
    p.solutions.forEach(function (s, idx) {
      if (!s) return;
      var d = el('div', 'sol-item' + (s.id === p.currentSol ? ' active' : ''));
      var head = el('div', 'sol-head');
      head.appendChild(el('span', 'sol-name', s.name || ('解法 ' + (idx + 1))));
      head.appendChild(el('span', 'badge' + (s.badgeKind ? ' ' + s.badgeKind : ''), s.badgeText || '未编译'));
      d.appendChild(head);
      var sub = '';
      if (s.grade) sub += 'AI ' + s.grade.score + ' 分';
      if (s.result && s.result.analysis) sub += (sub ? ' · ' : '') + '推导 ' + s.result.analysis.timeClass;
      if (sub) d.appendChild(el('div', 'sol-sub', sub));
      d.onclick = function () { p.currentSol = s.id; save(); renderAll(); };
      box.appendChild(d);
    });
  }

  /* ---------------- 编译 / 渲染 ---------------- */
  function compileCurrent(measure) {
    var p = currentProblem(), s = currentSolution();
    if (!p || !s) return null;
    if (typeof s.code !== 'string') s.code = '';
    var res = C.compile(s.code, { outputs: s.outputs || undefined });
    s.result = res;
    if (!res.ok) {
      s.badgeText = '未通过编译'; s.badgeKind = 'warn'; s.measuredClass = null; s.measure = null;
      return res;
    }
    s.badgeText = res.analysis.timeClass;
    s.badgeKind = 'ok';
    if (measure !== false) {
      try {
        var m = C.measureSolution(res, { maxSize: p.size || 512, rounds: 2 });
        s.measure = m;
        if (m.fit && m.fit.ok && m.fit.fits.length) s.measuredClass = m.fit.fits[0].label;
      } catch (e) { s.measure = null; }
    }
    return res;
  }

  function renderAll() {
    var p = currentProblem();
    if (!p) return;
    $('probTitle').value = p.title || '';
    $('probStatement').value = p.statement || '';
    $('probNotes').value = p.notes || '';
    $('probSize').value = p.size || 512;
    var s = currentSolution();
    safe(function () { ed.setValue(s ? s.code : '', true); }, '载入编辑器');
    safe(renderProblems, '题目列表');
    safe(renderSolutions, '解法列表');
    safe(renderWorkspace, '结果面板');
  }

  function renderWorkspace() {
    var s = currentSolution();
    if (!s) return;
    var res = s.result;
    $('entryHint').textContent = res && res.ok ? ('入口 ' + res.entry) : '';
    var dg = $('diagBox');
    dg.innerHTML = '';
    if (res) {
      var errs = res.diagnostics.filter(function (d) { return d.level === 'error'; });
      var warns = res.diagnostics.filter(function (d) { return d.level !== 'error'; });
      var ok = res.ok && !errs.length;
      var line = el('div', 'comp-status' + (ok ? ' ok' : ' warn'));
      if (ok) {
        line.appendChild(el('span', 'cs-dot', '✓'));
        line.appendChild(el('span', 'cs-text', '编译通过 · 入口 ' + (res.entry || '—') + (warns.length ? ' · ' + warns.length + ' 条提示' : '')));
      } else {
        line.appendChild(el('span', 'cs-dot', 'ⓘ'));
        line.appendChild(el('span', 'cs-text', '未通过编译 —— 不影响 AI 测评（只看算法思路与逻辑，格式/语法/记号不扣分）'));
      }
      dg.appendChild(line);
      var det = el('div', 'comp-detail' + (state.diagOpen ? '' : ' hidden'));
      res.diagnostics.slice(0, 12).forEach(function (d) {
        det.appendChild(el('div', 'diag ' + (d.level === 'error' ? 'err' : 'warn'), (d.level === 'error' ? '第 ' + d.line + ' 行：' : '提示：') + d.msg));
      });
      dg.appendChild(det);
      var tg = el('div', 'comp-toggle', state.diagOpen ? '收起编译器提示' : '查看编译器提示');
      tg.onclick = function () { state.diagOpen = !state.diagOpen; renderWorkspace(); };
      dg.appendChild(tg);
    }
    safe(function () { renderGrade(s); }, '评分面板');
    var ana = $('anaBox');
    if (ana) {
      ana.innerHTML = '';
      if (res && res.ok) {
        var mc = el('div', 'ana-line');
        mc.appendChild(el('span', 'ana-k', '时间复杂度'));
        mc.appendChild(el('span', 'ana-v', res.analysis.timeClass));
        mc.appendChild(el('span', 'ana-k', '空间'));
        mc.appendChild(el('span', 'ana-v', res.analysis.spaceClass));
        if (s.measuredClass) mc.appendChild(el('span', 'ana-tag', '实测参考 ' + s.measuredClass));
        ana.appendChild(mc);
      }
    }
  }

  /* ---------------- 复杂度面板 ---------------- */
  function renderComplexity(res, s) {
    var box = $('anaBox');
    box.innerHTML = '';
    if (!res || !res.ok) { box.appendChild(el('div', 'empty', '编译通过后，这里给出复杂度推导；编译不通过也可以直接做 AI 测评。')); return; }
    var a = res.analysis;
    var fits = (s.measure && s.measure.fit && s.measure.fit.ok) ? s.measure.fit.fits : null;
    var c1 = el('div', 'card');
    c1.appendChild(el('div', 'card-title', '时间复杂度'));
    var big = el('div', 'big');
    big.appendChild(el('span', 'big-main', a.timeClass));
    big.appendChild(el('span', 'big-tag', '按代码结构推导'));
    c1.appendChild(big);
    c1.appendChild(el('div', 'card-note', '推导式：' + a.exprTime + ' · 循环最大嵌套 ' + a.loopDepth + ' 层'));
    if (fits && fits.length) {
      c1.appendChild(el('div', 'card-note', '实测参考：' + fits.slice(0, 3).map(function (f) { return f.label + '（R²=' + (Math.round(f.r2 * 1000) / 1000) + '）'; }).join(' · ') + '（计数器含常数开销，量级以推导为准）'));
    }
    box.appendChild(c1);
    var c2 = el('div', 'card');
    c2.appendChild(el('div', 'card-title', '空间复杂度'));
    var b2 = el('div', 'big');
    b2.appendChild(el('span', 'big-main', a.spaceClass));
    c2.appendChild(b2);
    c2.appendChild(el('div', 'card-note', '推导式：' + a.exprSpace));
    box.appendChild(c2);
    if (a.patterns && a.patterns.length) {
      var c3 = el('div', 'card');
      c3.appendChild(el('div', 'card-title', '递归结构'));
      a.patterns.forEach(function (p) {
        c3.appendChild(el('div', 'pat-name', p.fn + '：' + p.patternName));
        (p.detail || []).forEach(function (d) { c3.appendChild(el('div', 'card-note', '· ' + d)); });
      });
      box.appendChild(c3);
    }
    var c4 = el('div', 'card');
    c4.appendChild(el('div', 'card-title', '接口契约（自动生成测试数据用）'));
    c4.appendChild(el('div', 'card-note', '入口函数：' + (res.entry || '—')));
    res.inputSpec.forEach(function (sp) {
      var kindName = { array: '数组（1-based）', matrix: '二维数组（1-based）', scalar: '整数' }[sp.kind] || sp.kind;
      c4.appendChild(el('div', 'card-note', '输入 ' + sp.name + '：' + kindName + (sp.dims && sp.dims.length ? ' 规模 ' + sp.dims.join(' × ') : '')));
    });
    c4.appendChild(el('div', 'card-note', '输出：' + ((res.outputs || []).join(', ') || '（就地修改的数组）')));
    box.appendChild(c4);
  }

  /* ---------------- AI 测评：评审 + 组长终审 ---------------- */
  var AI_GRADE_SYS = [
    '你是《数据结构与算法分析》课程的助教，负责给学生手写的伪代码测评打分。',
    '',
    '【最重要的评分原则】',
    '1. 只看算法思路与逻辑是否正确，完全不在意格式：缩进、关键字拼写、大小写、中英文混用、标点、有没有写 end、写成 Python/C 风格，都不扣分。',
    '2. **表示符号（记号）上的问题一律不算问题**：用 = 代替 ←、用 <> 表示不等、数组写成 A(1..n) 或 A[1..n]、用自然语言描述「第 i 个元素」、变量起名随意、≤ 还是 <= 还是「不超过」，只要含义能被理解，都按正确处理，不得因此扣分。',
    '3. 即使伪代码语法不完全正确、编译器报错，只要思路对，依然算对。不要把语法错误或无法编译当作扣分理由。',
    '4. 判断依据依次是：(a) 算法思想是否适配这道题；(b) 关键步骤（初始化、循环边界、递推/转移、终止条件）是否正确；(c) 时间复杂度是否满足要求；(d) 边界情况（空、单元素、全负、重复、极值、下标越界）是否被正确考虑。',
    '5. 如果给了运行结果或实测数据，那是辅助证据；数据看不出问题时不要凭空判错，但若明显与题意矛盾要指出。',
    '',
    '评分维度（满分 100）：思路正确性 40、关键步骤 25、复杂度 20、边界与鲁棒 10、表达清晰 5。',
    '',
    '只输出 JSON，不要多余文字：',
    '{"score": 0-100 的整数, "verdict": "一句话总评", "dims": [{"name":"思路正确性","score":数字,"full":40,"note":"理由"}], "issues": [{"level":"error|warn|info","text":"问题","hint":"建议"}], "strengths": ["优点"], "better": "更优解法（没有就留空）"}'
  ].join('\n');

  var AI_LEAD_SYS = [
    '你是这门课的**评分组长（终审）**，要给出**最终分数**。',
    '',
    '现在有若干位评审各自独立给出了意见（他们互相看不到彼此）。你的任务不是取平均，而是**亲自把代码审一遍**，再综合成最终结论。',
    '',
    '【工作方式】',
    '1. 先自己独立判断：算法思路对不对？关键步骤（初始化、循环边界、递推/转移、终止条件）对不对？边界（空、单元素、全负、重复、极值、越界）考虑了没有？',
    '2. 再逐条审视评审意见：哪些是真问题、哪些是误报（例如把格式或符号写法当成错误）、哪些评审漏掉了、哪些评分明显偏高或偏低。',
    '3. **不要简单取平均**。多数评审判错而你判断正确，就按正确的判；多数评审漏掉真实缺陷（如数组下标从 0 开始、边界漏一项、递推少一项、未初始化），要指出并扣分。',
    '4. 同样**完全不在意格式与记号**：缩进、拼写、大小写、中英文混用、标点、有没有 end、写成 Python/C 风格都不扣分；**符号写法（= 还是 ←、A(1..n) 还是 A[1..n]、自然语言描述第 i 个元素等）也不算问题**；语法不完全正确但思路对，依然算对。',
    '5. 复核时若发现某位评审因为「符号写法 / 记号不规范」而扣分，要把它列为**不认可的判断**并恢复分数。',
    '6. 只有确实找到逻辑错误才判低分；找不到问题时不要为了显得严格而硬扣分。',
    '',
    '评分维度（满分 100）：思路正确性 40、关键步骤 25、复杂度 20、边界与鲁棒 10、表达清晰 5。',
    '',
    '只输出 JSON，不要多余文字：',
    '{"finalScore": 0-100 的整数, "verdict": "最终总评", "dims": [{"name":"思路正确性","score":数字,"full":40,"note":"理由"}], "agreeWith": [{"score":数字,"assessment":"认可的判断"}], "dissent": [{"score":数字,"assessment":"不认可的判断","why":"理由"}], "issues": [{"level":"error|warn|info","text":"确实存在的问题","hint":"建议"}], "missed": ["评审漏掉的问题"], "strengths": ["优点"], "better": "更优解法（没有就留空）"}'
  ].join('\n');

  function fence(txt) {
    var t = String.fromCharCode(96).repeat(3);
    return t + '\n' + txt + '\n' + t;
  }

  function promptContext(p, s, res, extra) {
    var parts = [];
    parts.push('【题目】');
    parts.push(String(p.statement || p.title || '（未填写题目，请按标题推测）').trim());
    if (p.notes) parts.push('题目要求：' + p.notes);
    if (extra && extra.requireTime) parts.push('时间复杂度要求（从题目识别）：' + extra.requireTime);
    parts.push('');
    parts.push('【学生伪代码】');
    parts.push(fence(s.code || '（空）'));
    parts.push('');
    parts.push('【编译器参考信息（仅供辅助，格式问题不算错）】');
    if (res && res.ok) {
      parts.push('- 推导时间复杂度：' + res.analysis.timeClass + '（' + res.analysis.exprTime + '）');
      parts.push('- 空间复杂度：' + res.analysis.spaceClass);
      if (extra && extra.measured) parts.push('- 实测参考：' + extra.measured);
      if (extra && extra.runInfo) parts.push('- 运行情况：' + extra.runInfo);
    } else {
      var errs = ((res && res.diagnostics) || []).filter(function (d) { return d.level === 'error'; }).slice(0, 5).map(function (d) { return '第' + d.line + '行 ' + d.msg; });
      parts.push('- 编译器未能解析（这不影响你判对错）：' + (errs.join('；') || '未知'));
    }
    if (extra && extra.others && extra.others.length) {
      parts.push('');
      parts.push('【同题其他解法（对照，不是标准答案）】');
      extra.others.forEach(function (o, i) { parts.push((i + 1) + '. ' + (o.name || '')); parts.push(fence(o.code)); });
    }
    return parts.join('\n');
  }

  function buildReviewerPrompt(p, s, res, extra) {
    return promptContext(p, s, res, extra) + '\n\n请按系统要求只输出 JSON 结果。';
  }

  function buildLeadPrompt(p, s, res, extra, reviews) {
    var parts = [promptContext(p, s, res, extra), ''];
    parts.push('【各位评审的独立意见（共 ' + reviews.length + ' 份）】');
    reviews.forEach(function (r, i) {
      parts.push('---- 评审 ' + (i + 1) + '：给分 ' + r.score + ' ----');
      if (r.verdict) parts.push('总评：' + r.verdict);
      (r.dims || []).forEach(function (d) { parts.push('· ' + (d.name || '') + ' ' + (d.score || 0) + '/' + (d.full || '') + '：' + (d.note || '')); });
      (r.issues || []).forEach(function (it) { parts.push('· [' + (it.level || 'info') + '] ' + (it.text || '') + (it.hint ? '（建议：' + it.hint + '）' : '')); });
      if (r.strengths && r.strengths.length) parts.push('· 优点：' + r.strengths.join('；'));
    });
    parts.push('');
    parts.push('请你作为组长亲自复核后给出最终结论（只输出 JSON）。');
    return parts.join('\n');
  }

  function aiReviewOnce(p, s, res, extra) {
    return aiCall(AI_GRADE_SYS, buildReviewerPrompt(p, s, res, extra)).then(function (txt) {
      var j = extractJson(txt);
      if (!j) throw new Error('AI 返回内容无法解析为 JSON');
      if (typeof j.score !== 'number') throw new Error('AI 未给出 score');
      return j;
    });
  }
  function aiLeadFinal(p, s, res, extra, reviews) {
    return aiCall(AI_LEAD_SYS, buildLeadPrompt(p, s, res, extra, reviews)).then(function (txt) {
      var j = extractJson(txt);
      if (!j) throw new Error('组长返回内容无法解析为 JSON');
      var sc = (typeof j.finalScore === 'number') ? j.finalScore : j.score;
      if (typeof sc !== 'number') throw new Error('组长未给出 finalScore');
      j.finalScore = Math.max(0, Math.min(100, Math.round(sc)));
      return j;
    });
  }

  function gradeWithAI() {
    var p = currentProblem(), s = currentSolution();
    if (!p || !s) return;
    var btn = $('btnGrade');
    if (btn && btn.disabled) return;
    s.code = ed.value();
    var cfg = loadCfg();
    if (!cfg.key || !cfg.model) {
      toast('请先在 AI 设置里填写 Base URL、模型与 Key', 'bad');
      fillCfgForm();
      $('aiMask').classList.remove('hidden');
      return;
    }
    var rounds = Math.max(1, Math.min(5, parseInt(cfg.rounds, 10) || 3));
    if (btn) { btn.disabled = true; btn.textContent = '评审中…（' + rounds + ' 次）'; }
    toast('AI 测评中：' + rounds + ' 位评审独立测评 → 组长终审', '');
    var others = (p.solutions || []).filter(function (x) { return x.id !== s.id && x.code; })
      .map(function (x) { return { name: x.name, code: x.code }; });
    var req = '';
    var mm = (p.notes || '').match(/O\s*\([^)]+\)/i);
    if (mm) req = mm[0];
    var res = (s.result && s.result.ok) ? s.result : C.compile(s.code, { outputs: s.outputs || undefined });
    var measured = null, runInfo = null;
    try {
      if (res && res.ok) {
        var m = C.measureSolution(res, { maxSize: p.size || 256, rounds: 2 });
        s.measure = m;
        if (m.fit && m.fit.ok && m.fit.fits.length) { measured = m.fit.fits[0].label; s.measuredClass = measured; }
        var run = C.executeCompiled(res, C.generateInput(res.inputSpec, Math.min(p.size || 256, 256), C.mulberry32(7), res.entry), {});
        runInfo = run.err ? ('运行报错 ' + run.err.message)
          : ('样例输出 ' + JSON.stringify(C.pyUnwrap ? C.pyUnwrap(run.out) : run.out).slice(0, 80) + (run.oob ? ('；越界 ' + run.oob + ' 次') : ''));
      }
    } catch (e) { }
    var extra = { others: others, requireTime: req, measured: measured, runInfo: runInfo };
    var tasks = [];
    for (var ri = 0; ri < rounds; ri++) tasks.push(aiReviewOnce(p, s, res, extra).catch(function (e) { return { __err: String(e.message || e) }; }));
    Promise.all(tasks)
      .then(function (list) {
        var okList = list.filter(function (x) { return x && !x.__err; });
        if (!okList.length) {
          toast('AI 测评失败：' + String((list[0] && list[0].__err) || '未知').slice(0, 60), 'bad');
          return null;
        }
        if (btn) btn.textContent = '组长终审中…';
        return aiLeadFinal(p, s, res, extra, okList).then(function (lead) {
          var final = lead.finalScore;
          var merged = [], seen = {};
          (lead.issues || []).forEach(function (it) {
            var key = String(it.text || '').slice(0, 24);
            if (seen[key]) return; seen[key] = 1; merged.push(it);
          });
          (lead.missed || []).forEach(function (t) {
            var key = String(t || '').slice(0, 24);
            if (seen[key]) return; seen[key] = 1;
            merged.push({ level: 'warn', text: t, hint: '各位评审都漏掉的问题' });
          });
          var rank = { error: 0, warn: 1, info: 2 };
          merged.sort(function (a, b) { return (rank[a.level] == null ? 3 : rank[a.level]) - (rank[b.level] == null ? 3 : rank[b.level]); });
          var sc = okList.map(function (x) { return x.score; }).sort(function (a, b) { return a - b; });
          s.grade = {
            ai: true, score: final, wanted: rounds, reviewers: okList.length,
            level: final >= 90 ? '优秀' : final >= 75 ? '良好' : final >= 60 ? '及格' : '需要改进',
            runs: okList.map(function (x) { return { score: x.score, verdict: x.verdict, dims: x.dims || [] }; }),
            dims: lead.dims || okList[0].dims || [],
            findings: merged,
            agreeWith: lead.agreeWith || [],
            dissent: lead.dissent || [],
            strengths: (lead.strengths || okList[0].strengths || []),
            better: lead.better || '',
            spread: sc[sc.length - 1] - sc[0],
            verdict: lead.verdict || ''
          };
          if (res && res.ok) { s.result = res; s.badgeText = res.analysis.timeClass; s.badgeKind = 'ok'; }
          save();
          state.gradeTab = 'overview';
          switchTab('analysis');
          renderGrade(s); renderSolutions(); renderWorkspace();
          toast('AI 终审：' + final + ' 分 · ' + s.grade.level, final >= 60 ? 'ok' : 'bad');
          return true;
        }).catch(function (e) {
          var mid = okList.map(function (x) { return x.score; }).sort(function (a, b) { return a - b; })[Math.floor(okList.length / 2)];
          s.grade = {
            ai: true, score: mid, wanted: rounds, reviewers: okList.length, leadFailed: String(e.message || e).slice(0, 80),
            level: mid >= 90 ? '优秀' : mid >= 75 ? '良好' : mid >= 60 ? '及格' : '需要改进',
            runs: okList.map(function (x) { return { score: x.score, verdict: x.verdict, dims: x.dims || [] }; }),
            dims: okList[0].dims || [], findings: [], agreeWith: [], dissent: [], strengths: [], better: '',
            spread: 0, verdict: okList[0].verdict || ''
          };
          if (res && res.ok) s.result = res;
          save(); state.gradeTab = 'overview';
          renderGrade(s); renderSolutions();
          toast('组长终审失败（' + String(e.message || e).slice(0, 40) + '），暂显示评审中位数', 'bad');
          return false;
        });
      })
      .then(function () { restore(); }, function () { restore(); });
    function restore() { if (btn) { btn.disabled = false; btn.textContent = 'AI 测评打分'; } }
  }

  /* ---------------- 评分面板（分页） ---------------- */
  function gradeCard(title, notes) {
    var c = el('div', 'card');
    if (title) c.appendChild(el('div', 'card-title', title));
    (notes || []).forEach(function (t) { if (t) c.appendChild(el('div', 'card-note', t)); });
    return c;
  }

  function renderGrade(s) {
    var box = $('gradeBox');
    box.innerHTML = '';
    var g = s && s.grade;
    if (!g) {
      box.appendChild(gradeCard('AI 测评打分', [
        '点上方「AI 测评打分」：先由多位评审各自独立测评，再由新的一位 AI 当组长终审（不取平均）。',
        '只看算法思路与逻辑 —— 格式、语法、记号（符号写法）问题都不扣分。',
        '未配置接口时会提示你先到「AI 设置」填 Base URL / 模型 / Key。'
      ]));
      return;
    }
    var tabs = [['overview', '总览'], ['complexity', '复杂度'], ['issues', '问题'], ['advice', '建议'], ['reviews', '评审过程']];
    var bar = el('div', 'subtabs');
    tabs.forEach(function (t) {
      if (t[0] === 'reviews' && !(g.runs && g.runs.length > 1)) return;
      var btn = el('button', state.gradeTab === t[0] ? 'on' : '', t[1]);
      btn.onclick = function () { state.gradeTab = t[0]; renderGrade(currentSolution()); };
      bar.appendChild(btn);
    });
    box.appendChild(bar);
    var tab = state.gradeTab || 'overview';

    if (tab === 'overview') {
      var card = el('div', 'card');
      var wrap = el('div', 'score-wrap');
      var ring = el('div', 'score-ring');
      ring.style.setProperty('--p', String(g.score));
      var inner = el('div');
      inner.appendChild(el('div', 'score-num', String(g.score)));
      inner.appendChild(el('div', 'score-lab', g.level || ''));
      ring.appendChild(inner);
      wrap.appendChild(ring);
      var head = el('div', 'dim-list');
      head.appendChild(el('div', 'card-title', '组长终审' + (g.reviewers ? '（综合 ' + g.reviewers + ' 份评审）' : '')));
      if (g.verdict) head.appendChild(el('div', 'card-note', '总评：' + g.verdict));
      if (g.better) head.appendChild(el('div', 'card-note', '更优解法：' + g.better));
      if (g.leadFailed) head.appendChild(el('div', 'card-note', '⚠ 组长终审失败（' + g.leadFailed + '），当前为评审中位数。'));
      wrap.appendChild(head);
      card.appendChild(wrap);
      box.appendChild(card);
      /* 驳回申诉入口：对分数有异议就点它，组长会带着你的理由重新复核 */
      var act = el('div', 'grade-actions');
      var rejBtn = el('button', 'reject-btn', '驳回 · 申请重审');
      rejBtn.title = '对这次评分有异议？点这里把理由写给组长，重新复核一次';
      rejBtn.onclick = openReject;
      act.appendChild(rejBtn);
      act.appendChild(el('span', 'hint', '对分数有异议就点它：组长会带着你的理由重新独立复核，可能改判也可能维持'));
      box.appendChild(act);
      if (g.appeals && g.appeals.length) {
        var lastAp = g.appeals[g.appeals.length - 1];
        box.appendChild(gradeCard('驳回记录（' + g.appeals.length + ' 次）', [
          '最近一次：' + (lastAp.result || '') + ' · ' + lastAp.oldScore + ' → ' + lastAp.newScore + ' 分',
          '理由：' + (lastAp.reason || ''),
          lastAp.response ? ('组长答复：' + lastAp.response) : ''
        ]));
      }
      var errors = (g.findings || []).filter(function (f) { return f.level === 'error'; });
      var others = (g.findings || []).length - errors.length;
      box.appendChild(gradeCard('结论速览', [
        errors.length ? ('主要问题 ' + errors.length + ' 条：' + errors.slice(0, 2).map(function (f) { return f.text; }).join('；')) : '没有发现逻辑性错误。',
        others ? ('另有 ' + others + ' 条提醒，见「问题」页。') : '',
        (g.strengths && g.strengths.length) ? ('优点：' + g.strengths.slice(0, 3).join('；')) : ''
      ]));
      return;
    }

    if (tab === 'complexity') {
      renderComplexity(s.result, s);
      var ana = $('anaBox');
      if (ana && ana.children.length) {
        while (ana.firstChild) box.appendChild(ana.firstChild);
      } else {
        box.appendChild(gradeCard('复杂度', ['编译未通过，暂无复杂度推导。']));
      }
      if (g.dims && g.dims.length) {
        var cdim = g.dims.filter(function (d) { return String(d.name || '').indexOf('复杂度') >= 0; });
        if (cdim.length) {
          cdim.forEach(function (d) {
            box.appendChild(gradeCard(d.name + '：' + (d.score || 0) + '/' + (d.full || ''), [d.note || '']));
          });
        }
      }
      return;
    }

    if (tab === 'issues') {
      var errs = (g.findings || []).filter(function (f) { return f.level === 'error'; });
      var warns = (g.findings || []).filter(function (f) { return f.level === 'warn'; });
      var infos = (g.findings || []).filter(function (f) { return f.level !== 'error' && f.level !== 'warn'; });
      function block(title, list, cls, mark) {
        if (!list.length) return;
        var c = el('div', 'card');
        c.appendChild(el('div', 'card-title', title + '（' + list.length + '）'));
        list.forEach(function (f) {
          var d = el('div', 'finding ' + cls, mark + (f.text || ''));
          if (f.hint) d.appendChild(el('span', 'hint2', '建议：' + f.hint));
          c.appendChild(d);
        });
        box.appendChild(c);
      }
      block('确实存在的问题', errs, 'error', '✗ ');
      block('需要注意', warns, 'warn', '⚠ ');
      block('提示', infos, 'pass', '• ');
      if (!(g.findings || []).length) box.appendChild(gradeCard('问题', ['没有发现逻辑性问题。']));
      if (g.dissent && g.dissent.length) {
        var dc = el('div', 'card');
        dc.appendChild(el('div', 'card-title', '组长不认可的评审判断'));
        g.dissent.forEach(function (x) {
          var d = el('div', 'finding warn', '· ' + (x.score != null ? ('评审给 ' + x.score + ' 分：') : '') + (x.assessment || ''));
          if (x.why) d.appendChild(el('span', 'hint2', '组长理由：' + x.why));
          dc.appendChild(d);
        });
        box.appendChild(dc);
      }
      return;
    }

    if (tab === 'advice') {
      if (g.better) box.appendChild(gradeCard('更优解法', [g.better]));
      var hints = (g.findings || []).filter(function (f) { return f.hint; });
      if (hints.length) {
        var c = el('div', 'card');
        c.appendChild(el('div', 'card-title', '改进建议'));
        hints.forEach(function (f) { c.appendChild(el('div', 'card-note', '· ' + f.hint)); });
        box.appendChild(c);
      }
      if (g.strengths && g.strengths.length) box.appendChild(gradeCard('做得好的地方', g.strengths.map(function (t) { return '· ' + t; })));
      if (!hints.length && !g.better && !(g.strengths || []).length) box.appendChild(gradeCard('建议', ['组长没有额外建议。']));
      return;
    }

    if (tab === 'reviews') {
      var line = (g.runs || []).map(function (r, i) { return '第' + (i + 1) + '位 ' + r.score; }).join(' · ');
      box.appendChild(gradeCard('各位评审原始给分', [line, '上方大字为组长终审结果，不是这些分数的平均值。']));
      (g.runs || []).forEach(function (r, i) {
        var c = el('div', 'card');
        c.appendChild(el('div', 'card-title', '评审 ' + (i + 1) + ' · ' + r.score + ' 分'));
        if (r.verdict) c.appendChild(el('div', 'card-note', r.verdict));
        (r.dims || []).forEach(function (d) {
          c.appendChild(el('div', 'card-note', '· ' + (d.name || '') + ' ' + (d.score || 0) + '/' + (d.full || '') + (d.note ? '：' + d.note : '')));
        });
        box.appendChild(c);
      });
      if (g.agreeWith && g.agreeWith.length) {
        var ac = el('div', 'card');
        ac.appendChild(el('div', 'card-title', '组长认可的判断'));
        g.agreeWith.forEach(function (x) {
          ac.appendChild(el('div', 'card-note', '· ' + (x.score != null ? ('评审 ' + x.score + ' 分：') : '') + (x.assessment || '')));
        });
        box.appendChild(ac);
      }
      return;
    }
  }

  /* ---------------- AI 接口 ---------------- */
  function loadCfg() { try { return JSON.parse(localStorage.getItem(CFGKEY)) || {}; } catch (e) { return {}; } }
  function saveCfg(c) { try { localStorage.setItem(CFGKEY, JSON.stringify(c)); } catch (e) { } }
  function endpoint(cfg) {
    var b = String(cfg.base || '').replace(/\/+$/, '');
    if (cfg.protocol === 'anthropic') return b + '/v1/messages';
    if (cfg.protocol === 'gemini') return b + '/v1beta/models/' + cfg.model + ':generateContent?key=' + encodeURIComponent(cfg.key);
    return b + '/chat/completions';
  }
  function headers(cfg) {
    var h = { 'Content-Type': 'application/json' };
    if (cfg.protocol === 'anthropic') {
      h['x-api-key'] = cfg.key;
      h['anthropic-version'] = '2023-06-01';
      h['anthropic-dangerous-direct-browser-access'] = 'true';
    } else if (cfg.protocol !== 'gemini') {
      h['Authorization'] = 'Bearer ' + cfg.key;
    }
    return h;
  }
  function buildBody(cfg, system, user, images) {
    if (cfg.protocol === 'anthropic') {
      var content = [{ type: 'text', text: user }];
      (images || []).forEach(function (im) { content.push({ type: 'image', source: { type: 'base64', media_type: im.type, data: im.data } }); });
      return { model: cfg.model, max_tokens: cfg.maxTokens || 4000, system: system, messages: [{ role: 'user', content: content }] };
    }
    if (cfg.protocol === 'gemini') {
      var parts = [{ text: user }];
      (images || []).forEach(function (im) { parts.push({ inline_data: { mime_type: im.type, data: im.data } }); });
      return { contents: [{ role: 'user', parts: parts }], systemInstruction: { parts: [{ text: system }] } };
    }
    var mc = user;
    if (images && images.length) {
      mc = [{ type: 'text', text: user }];
      images.forEach(function (im) { mc.push({ type: 'image_url', image_url: { url: 'data:' + im.type + ';base64,' + im.data } }); });
    }
    return { model: cfg.model, temperature: cfg.temp == null ? 0.2 : cfg.temp, max_tokens: cfg.maxTokens || 4000, messages: [{ role: 'system', content: system }, { role: 'user', content: mc }] };
  }
  function pickText(cfg, json) {
    try {
      if (cfg.protocol === 'anthropic') return (json.content || []).map(function (x) { return x.text || ''; }).join('');
      if (cfg.protocol === 'gemini') {
        var cand = (json.candidates || [])[0] || {};
        return (((cand.content || {}).parts) || []).map(function (p) { return p.text || ''; }).join('');
      }
      var ch = (json.choices || [])[0] || {};
      if (ch.message && typeof ch.message.content === 'string') return ch.message.content;
      if (Array.isArray(ch.message && ch.message.content)) return ch.message.content.map(function (p) { return p.text || ''; }).join('');
      if (ch.text) return ch.text;
      return '';
    } catch (e) { return ''; }
  }
  function extractJson(text) {
    if (!text) return null;
    var t = String.fromCharCode(96).repeat(3);
    var fenced = text.match(new RegExp(t + '(?:json)?\\s*([\\s\\S]*?)' + t));
    var body = fenced ? fenced[1] : text;
    var start = body.indexOf('{'), end = body.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    var slice = body.slice(start, end + 1);
    try { return JSON.parse(slice); } catch (e) { }
    try { return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1')); } catch (e) { }
    return null;
  }
  function aiLog(msg, cls) {
    var box = $('aiRunLog');
    box.appendChild(el('div', cls || '', msg));
    box.scrollTop = box.scrollHeight;
  }
  function openAiRun(title) { $('aiRunTitle').textContent = title; $('aiRunLog').innerHTML = ''; $('aiRunMask').classList.remove('hidden'); }
  function closeAiRun() { $('aiRunMask').classList.add('hidden'); }
  function aiCall(system, user, images) {
    var cfg = loadCfg();
    if (!cfg.model) return Promise.reject(new Error('请先在 AI 设置里填写接口地址与模型'));
    if (!cfg.key) return Promise.reject(new Error('请先在 AI 设置里填写 API Key'));
    if (!cfg.base) return Promise.reject(new Error('请先在 AI 设置里填写 Base URL'));
    return fetch(endpoint(cfg), { method: 'POST', headers: headers(cfg), body: JSON.stringify(buildBody(cfg, system, user, images)) })
      .then(function (r) {
        return r.text().then(function (txt) {
          if (!r.ok) throw new Error('接口返回 ' + r.status + '：' + txt.slice(0, 200));
          var json;
          try { json = JSON.parse(txt); } catch (e) { throw new Error('响应不是 JSON：' + txt.slice(0, 160)); }
          var out = pickText(cfg, json);
          if (!out) throw new Error('响应里没有文本内容（检查模型名或协议）');
          return out;
        });
      });
  }
  function readCfgForm() {
    return {
      protocol: $('cfgProto').value,
      model: $('cfgModel').value.trim(),
      base: $('cfgBase').value.trim(),
      key: $('cfgKey').value.trim(),
      temp: parseFloat($('cfgTemp').value) || 0.2,
      maxTokens: parseInt($('cfgTokens').value, 10) || 4000,
      rounds: Math.max(1, Math.min(5, parseInt($('cfgRounds').value, 10) || 3))
    };
  }
  function fillCfgForm() {
    var c = loadCfg();
    $('cfgProto').value = c.protocol || 'openai';
    $('cfgModel').value = c.model || 'deepseek-chat';
    $('cfgBase').value = c.base || 'https://api.deepseek.com/v1';
    $('cfgKey').value = c.key || '';
    $('cfgTemp').value = c.temp == null ? 0.2 : c.temp;
    $('cfgTokens').value = c.maxTokens || 4000;
    $('cfgRounds').value = String(Math.max(1, Math.min(5, c.rounds || 3)));
  }
  function testApi() {
    saveCfg(readCfgForm());
    $('cfgTestOut').textContent = '正在请求…';
    aiCall('你是测试助手，只回复两个字：就绪', '请回复：就绪').then(function (t) {
      $('cfgTestOut').textContent = '✓ 连接成功，模型回复：' + String(t).slice(0, 40);
      toast('AI 接口可用', 'ok');
    }).catch(function (e) {
      $('cfgTestOut').textContent = '✗ ' + e.message;
      toast('连接失败：' + e.message.slice(0, 60), 'bad');
    });
  }

  /* ---------------- AI 摘取题目 ---------------- */
  var SYS_EXTRACT = [
    '你是《数据结构与算法分析》课程的助教。学生会粘贴或上传题目原文（可能有格式混乱、截图转写、多余文字）。',
    '请抽取并整理成完整题目，只输出 JSON：',
    '{"title":"简短题目名","statement":"完整题意（含输入描述、输出描述、样例、数据范围，分段用换行）","notes":"关键约束或时间复杂度要求，没有就留空","suggestedSizes":[512,1024]}'
  ].join('\n');

  function aiExtractProblem() {
    var p = currentProblem();
    if (!p) return;
    var stmt = $('probStatement').value.trim();
    if (!stmt && !(p._pendingImages && p._pendingImages.length)) { toast('先粘贴或上传题目内容', 'bad'); return; }
    openAiRun('AI 正在摘取题目…');
    aiLog('解析题干，抽取标题 / 输入输出 / 样例 / 数据范围…');
    var user = ['下面是学生粘贴的课程作业原文，可能有格式混乱或图片转写内容。请抽取并整理成完整题目。', '', stmt].join('\n');
    aiCall(SYS_EXTRACT, user, p._pendingImages || []).then(function (txt) {
      var j = extractJson(txt);
      if (!j) throw new Error('AI 返回内容无法解析为 JSON');
      if (j.title) p.title = j.title;
      if (j.statement) p.statement = j.statement;
      if (j.notes) p.notes = j.notes;
      if (j.suggestedSizes && j.suggestedSizes.length) p.size = j.suggestedSizes[j.suggestedSizes.length - 1];
      p._pendingImages = null;
      save(); renderAll();
      $('probHint').textContent = '已整理，可继续修改';
      aiLog('✓ 已整理题目：' + p.title, 'step pass');
      toast('题目已整理，可继续手动修改', 'ok');
      setTimeout(closeAiRun, 700);
    }).catch(function (e) { aiLog('✗ ' + e.message, 'step fail'); toast(e.message, 'bad'); });
  }

  function fileToText(f) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result || '')); };
      fr.onerror = function () { rej(new Error('读取失败')); };
      fr.readAsText(f);
    });
  }
  function fileToBase64(f) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        var s = String(fr.result || '');
        var i = s.indexOf(',');
        res({ type: f.type || 'image/png', data: i >= 0 ? s.slice(i + 1) : s, name: f.name });
      };
      fr.onerror = function () { rej(new Error('读取失败')); };
      fr.readAsDataURL(f);
    });
  }
  function handleProbFiles(files) {
    var p = currentProblem();
    if (!files || !files.length || !p) return;
    var list = Array.prototype.slice.call(files);
    var imgs = list.filter(function (f) { return /^image\//.test(f.type) || /\.pdf$/i.test(f.name); });
    var texts = list.filter(function (f) { return !/^image\//.test(f.type) && !/\.pdf$/i.test(f.name); });
    Promise.all(texts.map(fileToText)).then(function (contents) {
      if (contents.length) {
        $('probStatement').value = ($('probStatement').value ? $('probStatement').value + '\n\n' : '') + contents.join('\n\n');
        p.statement = $('probStatement').value;
        save();
        toast('已导入 ' + contents.length + ' 个文本文件，可点「AI 摘取题目」整理', 'ok');
      }
      if (imgs.length) {
        return Promise.all(imgs.map(fileToBase64)).then(function (arr) {
          p._pendingImages = (p._pendingImages || []).concat(arr);
          $('probHint').textContent = '已附带 ' + p._pendingImages.length + ' 张图片/PDF，点「AI 摘取题目」时一起发送';
          toast('图片已就绪，点「AI 摘取题目」识别', 'ok');
        });
      }
      return null;
    }).catch(function (e) { toast(e.message, 'bad'); });
  }
  function handlePaste(e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image') === 0) {
        var f = items[i].getAsFile();
        if (f) { handleProbFiles([f]); e.preventDefault(); return; }
      }
    }
  }
  /* ---------------- 题库视图 ---------------- */
  function renderBank() {
    var box = $('bankGrid');
    if (!box) return;
    box.innerHTML = '';
    var hint = $('bankHint');
    if (hint) hint.textContent = state.problems.length + ' 道题 · 点击卡片打开';
    if (!state.problems.length) { box.appendChild(el('div', 'empty', '题库是空的，点右上「新建题目」开始。')); return; }
    state.problems.forEach(function (p) {
      var card = el('div', 'bank-card');
      card.appendChild(el('div', 'bank-title', p.title || '未命名题目'));
      var st = String(p.statement || '').replace(/\s+/g, ' ');
      if (st) card.appendChild(el('div', 'bank-desc', st.slice(0, 110) + (st.length > 110 ? '…' : '')));
      card.appendChild(el('div', 'bank-meta', (p.solutions ? p.solutions.length : 0) + ' 个解法' + (p.notes ? ' · ' + p.notes : '')));
      var del = el('button', 'bank-del', '删除');
      del.title = '删除这道题';
      del.onclick = function (ev) {
        ev.stopPropagation();
        if (!confirm('删除题目「' + (p.title || '未命名') + '」？（其他题目不受影响）')) return;
        state.problems = state.problems.filter(function (x) { return x.id !== p.id; });
        if (!state.problems.length) state.problems = [demoProblem()];
        if (state.currentId === p.id) state.currentId = state.problems[0].id;
        save(); renderAll(); renderBank();
        toast('已删除该题目', 'ok');
      };
      card.appendChild(del);
      card.onclick = function () { state.currentId = p.id; save(); renderAll(); switchTab('analysis'); };
      box.appendChild(card);
    });
  }

  /* ---------------- 视图切换（题库 / 评测） ---------------- */
  function switchTab(name) {
    state.tab = name;
    var isBank = (name === 'bank');
    $('bankView').classList.toggle('hidden', !isBank);
    var bankBtn = $('btnBank');
    if (bankBtn) bankBtn.classList.toggle('on', isBank);
    var work = document.querySelector('.work');
    if (work) {
      Array.prototype.forEach.call(work.children, function (ch) {
        if (ch.id === 'bankView') return;
        ch.classList.toggle('hidden', isBank);
      });
    }
    if (isBank) safe(renderBank, '题库');
    $('rightTitle').textContent = isBank ? '题库' : '评测与复杂度';
  }

  function bindToggle(btn, body, key) {
    if (!btn || !body) return;
    var closed = false;
    try { closed = localStorage.getItem(key) === '1'; } catch (e) { }
    var apply = function () { body.classList.toggle('hidden', closed); btn.classList.toggle('closed', closed); };
    apply();
    btn.onclick = function () { closed = !closed; try { localStorage.setItem(key, closed ? '1' : '0'); } catch (e) { } apply(); };
  }

  function clickBtn(id, fn, label) {
    var b = $(id);
    if (!b) return;
    b.onclick = function () { safe(fn, label || id); };
  }
  /* ---------------- 事件绑定 ---------------- */
  // 兜底保存：关页、切后台、以及每 10 秒各存一次（正在输入时不会打断，只是补一份）
  function bindTopFields() {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('beforeunload', function () { try { save(); } catch (e) { } });
      window.addEventListener('pagehide', function () { try { save(); } catch (e) { } });
      document.addEventListener('visibilitychange', function () { try { save(); } catch (e) { } });
    }
    setInterval(function () { try { save(); } catch (e) { } }, 10000);
  }

  /* ---------------- 书本习题（CLRS 算法导论 4th） ---------------- */
  function bookData() {
    var b = (typeof window !== 'undefined' && window.PseudoBook) ? window.PseudoBook : null;
    if (b && b.chapters) return b;
    return null;
  }
  function bookSelectedRefs() {
    var out = [];
    for (var k in state.bookSel) if (state.bookSel[k]) out.push(k);
    return out;
  }
  function findBookItem(ref) {
    var b = bookData();
    if (!b) return null;
    for (var i = 0; i < b.chapters.length; i++) {
      var ex = b.chapters[i].exercises || [];
      for (var j = 0; j < ex.length; j++) {
        if (ex[j].ref === ref) {
          var it = {};
          for (var k in ex[j]) it[k] = ex[j][k];
          it.chapter = b.chapters[i].num;
          it.chapterTitle = b.chapters[i].title;
          it.chapterTitleCN = b.chapters[i].titleCN || '';
          return it;
        }
      }
    }
    return null;
  }
  function openBook() {
    var b = bookData();
    if (!b) { toast('书本习题数据还没装进来，请刷新页面（Ctrl+F5）', 'bad'); return; }
    $('bookMask').classList.remove('hidden');
    renderBook();
  }
  function bookHits() {
    var b = bookData();
    if (!b) return [];
    var q = String(state.bookQ || '').trim().toLowerCase();
    var hits = [];
    b.chapters.forEach(function (ch) {
      var list = (ch.exercises || []).filter(function (e) {
        if (!q) return true;
        return (e.ref + ' ' + (e.title || '') + ' ' + (e.statement || '') + ' ' + (e.hint || '')).toLowerCase().indexOf(q) >= 0;
      });
      if (list.length) hits.push({ ch: ch, list: list });
    });
    return hits;
  }
  function renderBook() {
    var box = $('bookList');
    if (!box) return;
    box.innerHTML = '';
    var b = bookData();
    var stat = $('bookStat');
    if (!b) { box.appendChild(el('div', 'empty', '书本习题数据尚未载入。')); return; }
    var hits = bookHits();
    var total = 0, shown = 0;
    b.chapters.forEach(function (ch) { total += (ch.exercises || []).length; });
    hits.forEach(function (h) { shown += h.list.length; });
    if (stat) stat.textContent = '《' + (b.bookTitle || '算法导论 4th') + '》共 ' + total + ' 题 · 当前显示 ' + shown + ' 题';
    var lastPart = null;
    hits.forEach(function (h) {
      var ch = h.ch;
      if (ch.partTitle && ch.partTitle !== lastPart) {
        lastPart = ch.partTitle;
        box.appendChild(el('div', 'book-part', ch.partTitle));
      }
      var open = !!state.bookOpen[ch.num];
      var card = el('div', 'book-ch' + (open ? ' open' : ''));
      var head = el('div', 'book-ch-head');
      head.appendChild(el('span', 'book-ch-num', '第 ' + ch.num + ' 章'));
      head.appendChild(el('span', 'book-ch-title', ch.title + (ch.titleCN ? ' · ' + ch.titleCN : '')));
      head.appendChild(el('span', 'book-ch-n', h.list.length + ' 题'));
      head.appendChild(el('span', 'caret', open ? '▾' : '▸'));
      card.appendChild(head);
      var body = el('div', 'book-items' + (open ? '' : ' hidden'));
      var lastSec = null;
      h.list.forEach(function (e) {
        if (e.section && e.section !== lastSec) { lastSec = e.section; body.appendChild(el('div', 'book-sec', e.section)); }
        var row = el('div', 'book-it');
        var cb = el('input');
        cb.type = 'checkbox';
        cb.checked = !!state.bookSel[e.ref];
        cb.onchange = function () { state.bookSel[e.ref] = cb.checked; updateBookSel(); };
        row.appendChild(cb);
        var main = el('div', 'book-it-main');
        main.appendChild(el('div', 'book-it-t', e.title || e.ref));
        main.appendChild(el('div', 'book-it-s', e.statement || ''));
        var meta = e.ref + ' · ' + (e.kindCN || e.kind || '') + (e.hint ? ' · 提示：' + e.hint : '');
        main.appendChild(el('div', 'book-it-m', meta));
        row.appendChild(main);
        body.appendChild(row);
      });
      card.appendChild(body);
      head.onclick = function () { state.bookOpen[ch.num] = !state.bookOpen[ch.num]; renderBook(); };
      box.appendChild(card);
    });
    if (!hits.length) box.appendChild(el('div', 'empty', '没有匹配的题目，换个关键字试试。'));
    updateBookSel();
  }
  function updateBookSel() {
    var n = bookSelectedRefs().length;
    var h = $('bookSelHint');
    if (h) h.textContent = '已选 ' + n + ' 题';
    var c = $('bookCount');
    if (c) c.textContent = String(n);
  }
  function bookStarter(it) {
    var rawEntry = String(it.entry || 'solve').split('/')[0].split('(')[0].trim();
    var fn = rawEntry.replace(/[^A-Za-z0-9_]/g, '_').toLowerCase().replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    if (!fn || /^[0-9]/.test(fn)) fn = 'solve';
    if (fn.length > 40) fn = fn.slice(0, 40).replace(/_+$/g, '');
    var ins = String(it.inputs || '');
    var params = [];
    var m = ins.match(/[A-Za-z][A-Za-z0-9]*\s*\[1\.\.n\]/g) || [];
    m.forEach(function (p) { var nm = p.split('[')[0].trim(); if (params.indexOf(nm) < 0) params.push(nm + '[1..n]'); });
    (ins.match(/(?:^|[，,、])\s*([a-zA-Z][A-Za-z0-9]*)\s*(?=[，,、]|$)/g) || []).forEach(function (p) {
      var nm = p.replace(/[，,、]/g, '').trim();
      if (/^(n|m|k|x|y|w|t|target|key)$/i.test(nm) && params.indexOf(nm) < 0) params.push(nm);
    });
    if (!params.length) params.push('n');
    // 再从「输入」描述里补上标量参数（v、x、n、m、k、a、b 之类），免得模板少参数
    var scalarPool = ['v', 'x', 'n', 'm', 'k', 'a', 'b', 'target', 'key', 'W', 't'];
    var desc = String(it.inputs || '') + ' ' + String(it.statement || '').slice(0, 200);
    scalarPool.forEach(function (nm) {
      if (params.length >= 3) return;
      if (params.indexOf(nm) >= 0) return;
      var re2 = new RegExp('(^|[^A-Za-z0-9_])' + nm + '([^A-Za-z0-9_]|$)');
      if (re2.test(desc)) params.push(nm);
    });
    var lines = [];
    lines.push('// ' + (it.ref || '') + ' ' + (it.title || ''));
    var stmt = String(it.statement || '').replace(/\s+/g, ' ').trim();
    var wrap = [];
    while (stmt && wrap.length < 3) {
      if (stmt.length <= 34) { wrap.push(stmt); break; }
      var cut = 34;
      for (var ci = 34; ci > 12; ci--) { if (' ，。；、,)）'.indexOf(stmt.charAt(ci)) >= 0) { cut = ci + 1; break; } }
      wrap.push(stmt.slice(0, cut).trim());
      stmt = stmt.slice(cut).trim();
    }
    wrap.forEach(function (w) { lines.push('// ' + w.trim()); });
    lines.push('// 完整题意见左侧「题目内容」');
    if (it.hint) {
      var hint = String(it.hint).replace(/\s+/g, ' ').trim();
      if (hint.length > 40) hint = hint.slice(0, 40) + '…';
      lines.push('// 提示：' + hint);
    }
    lines.push('function ' + fn + '(' + params.join(', ') + ')');
    lines.push('  ans = 0');
    lines.push('  // TODO: 在这里写你的算法（数组下标从 1 开始）');
    lines.push('  return ans');
    lines.push('end');
    return joinLines(lines);
  }
  function importBook() {
    var refs = bookSelectedRefs();
    if (!refs.length) { toast('先勾选要加入的题目', 'bad'); return; }
    var added = 0, skipped = 0;
    var have = {};
    state.problems.forEach(function (p) { if (p.fromBook) have[p.fromBook] = 1; });
    refs.forEach(function (ref) {
      var it = findBookItem(ref);
      if (!it) return;
      if (have[ref]) { skipped++; return; }
      var sol = {
        id: uid(),
        name: '我的解法',
        code: bookStarter(it),
        outputs: null,
        badgeText: '未编译',
        badgeKind: '',
        grade: null,
        fromBook: ref
      };
      var stmt = [];
      stmt.push('【' + (it.title || '') + '】（《算法导论》4th · 第 ' + (it.chapter || '') + ' 章 ' + (it.chapterTitleCN || it.chapterTitle || '') + ' · ' + (it.ref || '') + '）');
      stmt.push('');
      stmt.push(it.statement || '');
      if (it.inputs) stmt.push(''); stmt.push('输入：' + it.inputs);
      if (it.outputs) stmt.push('输出：' + it.outputs);
      if (it.note) stmt.push(''); stmt.push('（书上原题另有要求：' + it.note + '）');
      var p = {
        id: uid(),
        title: '[算法导论 ' + (it.ref || '') + '] ' + (it.title || '书本习题'),
        statement: joinLines(stmt),
        notes: '来源：《算法导论》4th · 第 ' + (it.chapter || '') + ' 章 ' + (it.chapterTitleCN || it.chapterTitle || '') + ' · ' + (it.ref || '') + (it.hint ? ' · 提示：' + it.hint : ''),
        size: 256,
        solutions: [sol],
        currentSol: sol.id,
        fromBook: ref
      };
      state.problems.push(p);
      if (added === 0) state.currentId = p.id;
      added++;
    });
    save(); renderAll(); renderProblems(); renderBank();
    updateBookSel();
    toast('已加入 ' + added + ' 题' + (skipped ? ('，' + skipped + ' 题已在题库里') : ''), added ? 'ok' : '');
  }

  function bind() {
    safe(bindTopFields, '自动保存');
    clickBtn('btnUndo', function () { ed.undo(); }, '撤销');
    clickBtn('btnRedo', function () { ed.redo(); }, '重做');
    clickBtn('btnCompile', function () { doCompile(false); }, '编译');
    clickBtn('btnCompileRun', function () { doCompile(true); }, '实测');
    clickBtn('btnGrade', gradeWithAI, '测评');
    clickBtn('btnReject', openReject, '驳回');
    clickBtn('btnRejectCancel', function () { $('rejectMask').classList.add('hidden'); }, '驳回');
    clickBtn('btnRejectSend', submitReject, '提交驳回');
    clickBtn('btnRejectClose', function () { $('rejectMask').classList.add('hidden'); }, '驳回');
    clickBtn('btnBank', function () { switchTab(state.tab === 'bank' ? 'analysis' : 'bank'); }, '题库');
    clickBtn('btnBankNew', function () { $('btnNewProb').click(); renderBank(); }, '新建');
    clickBtn('btnBankImport', function () { $('fileProb').click(); }, '导入');
    clickBtn('btnImportFile', function () { $('fileProb').click(); }, '导入');
    clickBtn('btnPasteImg', function () { toast('直接在题目框里 Ctrl+V 粘贴图片即可'); }, '提示');
    clickBtn('btnAiExtract', aiExtractProblem, '摘取题目');
    clickBtn('btnTestApi', testApi, '测试接口');
    clickBtn('btnCloseCfg', function () { $('aiMask').classList.add('hidden'); }, '关闭');
    clickBtn('btnAiRunClose', closeAiRun, '关闭');
    clickBtn('btnAiCfg', function () { fillCfgForm(); $('aiMask').classList.remove('hidden'); }, '打开设置');
    clickBtn('btnSaveCfg', function () { saveCfg(readCfgForm()); toast('已保存到本机', 'ok'); $('aiMask').classList.add('hidden'); }, '保存设置');
    clickBtn('btnAddSol', function () {
      var p = currentProblem();
      var s = { id: uid(), name: '解法 ' + (p.solutions.length + 1), code: ed.value(), outputs: null, badgeText: '未编译' };
      p.solutions.push(s); p.currentSol = s.id; save(); renderAll();
    }, '新增解法');
    clickBtn('btnDelSol', function () {
      var p = currentProblem(), s = currentSolution();
      if (!s || p.solutions.length <= 1) { toast('至少保留一个解法', 'bad'); return; }
      p.solutions = p.solutions.filter(function (x) { return x.id !== s.id; });
      p.currentSol = p.solutions[0].id; save(); renderAll();
    }, '删除解法');
    clickBtn('btnNewProb', newProblem, '新建题目');
    clickBtn('btnExport', exportAll, '导出');
    clickBtn('btnBook', openBook, '书本习题');
    clickBtn('btnBookClose', function () { $('bookMask').classList.add('hidden'); }, '关闭');
    clickBtn('btnBookImport', importBook, '加入题库');
    clickBtn('btnBookAll', function () {
      bookHits().forEach(function (h) { h.list.forEach(function (e) { state.bookSel[e.ref] = true; }); });
      renderBook();
    }, '全选');
    clickBtn('btnBookNone', function () { state.bookSel = {}; renderBook(); }, '清空');
    var bs = $('bookSearch');
    if (bs) bs.addEventListener('input', function () { state.bookQ = bs.value; renderBook(); });
    var fp = $('fileProb');
    if (fp) fp.onchange = function (e) { safe(function () { handleProbFiles(e.target.files); e.target.value = ''; }, '导入'); };
    var ps = $('probStatement');
    if (ps) ps.addEventListener('input', function () { var p = currentProblem(); if (p) { p.statement = ps.value; autosave(); } });
    var pt = $('probTitle');
    if (pt) pt.addEventListener('input', function () { var p = currentProblem(); if (p) { p.title = pt.value; autosave(); renderProblems(); } });
    var pn = $('probNotes');
    if (pn) pn.addEventListener('input', function () { var p = currentProblem(); if (p) { p.notes = pn.value; autosave(); } });
    var pz = $('probSize');
    if (pz) pz.addEventListener('change', function () { var p = currentProblem(); if (p) { p.size = parseInt(pz.value, 10) || 512; autosave(); } });
    document.addEventListener('paste', function (e) { if (e.target && e.target.id === 'probStatement') handlePaste(e); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { $('aiMask').classList.add('hidden'); closeAiRun(); $('rejectMask').classList.add('hidden'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); var b = $('btnCompileRun'); if (b) b.click(); }
    });
    bindToggle($('tglProblem'), $('bodyProblem'), 'sec-problem');
    bindToggle($('tglSolution'), $('bodySolution'), 'sec-solution');
  }

  function doCompile(measure) {
    var p = currentProblem(), s = currentSolution();
    if (!p || !s) return;
    s.code = ed.value();
    p.statement = $('probStatement').value; p.title = $('probTitle').value;
    p.notes = $('probNotes').value; p.size = parseInt($('probSize').value, 10) || 512;
    var res = compileCurrent(!!measure);
    save(); renderWorkspace(); renderSolutions(); renderProblems();
    if (res && res.ok) {
      toast('编译通过：' + res.analysis.timeClass + (measure && s.measuredClass ? ' · 实测参考 ' + s.measuredClass : ''), 'ok');
    } else {
      toast('编译未通过（不影响 AI 测评）', 'bad');
    }
  }

  function newProblem() {
    var sol = { id: uid(), name: '解法一', code: joinLines(['function solve(n) : int', '  ans = 0', '  return ans', 'end']), outputs: null, badgeText: '未编译' };
    var p = { id: uid(), title: '新题目', statement: '', notes: '', size: 512, solutions: [sol], currentSol: sol.id };
    state.problems.unshift(p); state.currentId = p.id; save(); renderAll(); renderBank();
  }

  function exportAll() {
    var blob = new Blob([JSON.stringify(state.problems, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pseudocode-problems.json';
    a.click();
    toast('已导出题库 JSON', 'ok');
  }
  var NL = String.fromCharCode(10);
  function requireTimeOf(p) {
    var m = String(p.notes || '').match(/O[ ]*\([^)]+\)/i);
    return m ? m[0] : '';
  }

  /* ---------------- 驳回重审 ---------------- */
  var AI_APPEAL_SYS = [
    '你是这门课的**评分组长**，现在在处理学生对你上次评分的**驳回申诉**。',
    '',
    '请务必客观、仔细：不要因为学生申诉就无条件改判，也不要为了维护原判而回避自己可能的错误。',
    '流程：',
    '1. 重新完整读一遍伪代码与题目，独立判断思路与关键步骤是否正确；',
    '2. 逐条审视学生的申诉理由：说得对就采纳并改判；说得不对就说明为什么不成立；',
    '3. 若发现自己上次确实判错（尤其是把格式/记号问题当成了错误），要明确承认并给出更正的分数；',
    '4. 再次强调：格式、语法、记号（符号写法）问题都不算错；思路对就算对。',
    '',
    '只输出 JSON，不要多余文字：',
    '{"result":"改判 或 维持", "finalScore": 0-100 的整数, "verdict": "最终总评", "response": "给学生看的答复", "changed": ["改动了什么"], "issues": [{"level":"error|warn|info","text":"仍存在的问题","hint":"建议"}], "dims": [{"name":"思路正确性","score":数字,"full":40,"note":"理由"}]}'
  ].join('\n');

  function buildAppealPrompt(p, s, res, extra, g, reason) {
    var parts = [promptContext(p, s, res, extra), ''];
    parts.push('【你上次的终审结论】');
    parts.push('分数：' + g.score + '（' + (g.level || '') + '）');
    if (g.verdict) parts.push('总评：' + g.verdict);
    (g.findings || []).forEach(function (f) { parts.push('· [' + (f.level || 'info') + '] ' + (f.text || '')); });
    if (g.runs && g.runs.length) parts.push('当时各评审给分：' + g.runs.map(function (r) { return r.score; }).join(' / '));
    parts.push('');
    parts.push('【学生的驳回理由】');
    parts.push(reason || '（未填写具体理由，请自行重新复核一遍）');
    parts.push('');
    parts.push('请重新复核并给出最终结论（只输出 JSON）。');
    return parts.join(NL);
  }

  function openReject() {
    var s = currentSolution();
    if (!s || !s.grade) { toast('先做一次 AI 测评，才能驳回', 'bad'); return; }
    $('rejectScore').textContent = '当前终审分数：' + s.grade.score + ' 分（' + (s.grade.level || '') + '）';
    $('rejectReason').value = '';
    $('rejectOut').textContent = '';
    $('rejectMask').classList.remove('hidden');
    $('rejectReason').focus();
  }

  function submitReject() {
    var p = currentProblem(), s = currentSolution();
    if (!p || !s || !s.grade) { toast('先做一次 AI 测评', 'bad'); return; }
    var reason = String($('rejectReason').value || '').trim();
    if (!reason) { toast('请填写驳回理由', 'bad'); return; }
    var btn = $('btnRejectSend');
    if (btn) { btn.disabled = true; btn.textContent = '重审中…'; }
    $('rejectOut').textContent = '组长正在重新复核…';
    var res = (s.result && s.result.ok) ? s.result : C.compile(s.code, { outputs: s.outputs || undefined });
    var others = (p.solutions || []).filter(function (x) { return x.id !== s.id && x.code; }).map(function (x) { return { name: x.name, code: x.code }; });
    var extra = { others: others, requireTime: requireTimeOf(p) };
    var g = s.grade;
    function done() { if (btn) { btn.disabled = false; btn.textContent = '提交驳回'; } }
    aiCall(AI_APPEAL_SYS, buildAppealPrompt(p, s, res, extra, g, reason)).then(function (txt) {
      var j = extractJson(txt);
      if (!j) throw new Error('组长返回内容无法解析为 JSON');
      var ns = (typeof j.finalScore === 'number') ? Math.max(0, Math.min(100, Math.round(j.finalScore))) : g.score;
      var old = g.score;
      var result = (j.result === '改判' || ns !== old) ? '改判' : '维持';
      var appeals = (g.appeals || []).slice();
      appeals.push({ reason: reason, oldScore: old, newScore: ns, result: result, response: j.response || '', at: Date.now() });
      s.grade = {
        ai: true, score: ns, wanted: g.wanted, reviewers: g.reviewers,
        level: ns >= 90 ? '优秀' : ns >= 75 ? '良好' : ns >= 60 ? '及格' : '需要改进',
        runs: g.runs || [], dims: j.dims || g.dims || [], findings: j.issues || g.findings || [],
        agreeWith: g.agreeWith || [], dissent: g.dissent || [], strengths: g.strengths || [],
        better: j.better || g.better || '', spread: g.spread || 0,
        verdict: j.verdict || g.verdict || '',
        appeals: appeals, appealed: true, appealResult: result, changed: j.changed || []
      };
      if (res && res.ok) { s.result = res; s.badgeText = res.analysis.timeClass; }
      save();
      state.gradeTab = 'overview';
      renderGrade(s); renderSolutions();
      $('rejectOut').textContent = '组长结论：' + result + '（' + old + ' → ' + ns + ' 分）' + (j.response ? NL + j.response : '');
      toast('驳回重审完成：' + result + '，' + old + ' → ' + ns + ' 分', result === '改判' ? 'ok' : '');
    }).catch(function (e) {
      $('rejectOut').textContent = '重审失败：' + e.message;
      toast('重审失败：' + String(e.message || e).slice(0, 50), 'bad');
    }).then(done, done);
  }

  function fatal(msg, err) {
    try { console.error('[workbench]', msg, err); } catch (e) { }
    var t = $('toast');
    if (t) { t.textContent = msg; t.className = 'toast show bad'; }
  }

  function boot() {
    var restored = null;
    try { restored = loadStoredProblems(); } catch (e) { restored = null; }
    state.problems = restored && restored.length ? restored : [];
    state.restored = state.problems.length;
    if (!state.problems.length) state.problems = [demoProblem()];
    state.currentId = state.problems[0].id;
    ed = new Editor();
    ed.onChange = function () { var s = currentSolution(); if (s) s.code = ed.value(); autosave(); };
    try {
      if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('error', function (ev) { toast('页面出错：' + (ev && ev.message ? ev.message : '未知'), 'bad'); });
      }
      bind();
      renderAll();
      switchTab('analysis');
    } catch (e) {
      fatal('界面初始化出错（' + (e && e.message) + '）—— 题库数据没有被删除，可刷新重试', e);
      if (!state.problems.length) state.problems = [demoProblem()];
      state.currentId = state.problems[0].id;
      try { bind(); renderAll(); switchTab('analysis'); } catch (e3) { fatal('初始化仍然失败：' + (e3 && e3.message), e3); }
    }
    setTimeout(function () {
      safe(function () { compileCurrent(true); renderWorkspace(); renderSolutions(); }, '首次编译');
      var nsol = state.problems.reduce(function (a, p) { return a + ((p.solutions && p.solutions.length) || 0); }, 0);
      if (state.restored) toast('已载入本机题库：' + state.problems.length + ' 道题 · ' + nsol + ' 个解法（改动会实时自动保存）', 'ok');
      else toast('本机没有找到已保存的题库，先给你一道示例题；导入过 JSON 的话可以用「导入」找回', 'bad');
    }, 120);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

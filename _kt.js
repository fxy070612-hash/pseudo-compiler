const fs=require('fs'),path=require('path');
const dir=(process.env.PCDIR||__dirname)+path.sep;
const C=require(path.join(dir,'core_py.js'));
const NL=String.fromCharCode(10);
const cases=[
 ['maxSubArray', ['function maxSubArray(A[1..n]) : int','  cur = A[1]','  best = A[1]','  for i = 2 to n do','    cur = max(cur + A[i], A[i])','    if cur > best then best = cur end','  end','  return best','end']],
 ['bubble-sort-C', ['void bubbleSort(int A[1..n], int n)','  for i = 1 to n - 1 do','    for j = 1 to n - i do','      if A[j] > A[j+1] then','        swap(A[j], A[j+1])','      end','    end','  end','end']],
 ['binary-search', ['function bsearch(A[1..n], x) : int','  lo = 1','  hi = n','  while lo <= hi do','    mid = (lo + hi) div 2','    if A[mid] == x then return mid end','    if A[mid] < x then lo = mid + 1 else hi = mid - 1 end','  end','  return -1','end']],
 ['median', ['function median(A[1..n]) : float','  for i = 1 to n - 1 do','    for j = 1 to n - i do','      if A[j] > A[j+1] then swap(A[j], A[j+1]) end','    end','  end','  if n mod 2 == 1 then return A[(n + 1) div 2] end','  return (A[n div 2] + A[n div 2 + 1]) / 2','end']],
 ['fib-memo', ['function fib(n) : int','  dp[1..n] : int','  dp[1] = 1','  dp[2] = 1','  for i = 3 to n do','    dp[i] = dp[i-1] + dp[i-2]','  end','  return dp[n]','end']],
 ['knapsack', ['function knap(W, wt[1..n], val[1..n]) : int','  dp[0..W] : int','  for w = 0 to W do dp[w] = 0 end','  for i = 1 to n do','    for w = W downto wt[i] do','      if dp[w - wt[i]] + val[i] > dp[w] then dp[w] = dp[w - wt[i]] + val[i] end','    end','  end','  return dp[W]','end']],
 ['gcd', ['function gcd(a, b) : int','  while b != 0 do','    t = b','    b = a mod b','    a = t','  end','  return a','end']],
 ['cn-keywords', ['函数 solve(A[1..n]) : int','  最优 = A[1]','  对于 i 从 2 到 n 做','    如果 A[i] > 最优 那么','      最优 = A[i]','    结束','  结束','  返回 最优','结束']],
 ['merge-count', ['function invCount(A[1..n]) : int','  cnt = 0','  for i = 1 to n - 1 do','    for j = i + 1 to n do','      if A[i] > A[j] then cnt = cnt + 1 end','    end','  end','  return cnt','end']],
 ['prefix-sum', ['function prefixMax(A[1..n]) : int','  best = A[1]','  s = 0','  minS = 0','  for i = 1 to n do','    s = s + A[i]','    if s - minS > best then best = s - minS end','    if s < minS then minS = s end','  end','  return best','end']]
];
let ok=0, run=0, out=0;
cases.forEach(function(c){
  var code=c[1].join(NL);
  var isVoid=/void\s+\w+/.test(code);
  var r=C.compile(code,{});
  if(r.ok) ok++; else console.log('COMPILE FAIL', c[0], JSON.stringify(r.diagnostics.slice(0,3)));
  if(!r.ok) return;
  var m=C.measureSolution(r,{maxSize:64,rounds:1});
  run++;
  if(m && m.points && m.points.length) out++;
  console.log('OK', c[0], '| entry', r.entry, '| time', r.analysis.timeClass, '| space', r.analysis.spaceClass, '| measured', (m&&m.points&&m.points.length)?('n='+m.points[m.points.length-1].n+' ops='+m.points[m.points.length-1].ops):'none');
});
console.log('---');
console.log('compile', ok+'/'+cases.length, '| run', run+'/'+cases.length, '| measured', out+'/'+cases.length);
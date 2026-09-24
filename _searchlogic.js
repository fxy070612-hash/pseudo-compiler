const fs=require('fs'),path=require('path');
const book=JSON.parse(fs.readFileSync(path.join(process.env.PCDIR||__dirname,'book_data.json'),'utf8'));
// 复现 ui.js 的 bookHits() 过滤逻辑
function hits(q){
  q=String(q||'').trim().toLowerCase(); var out=[];
  book.chapters.forEach(function(ch){
    var list=(ch.exercises||[]).filter(function(e){
      if(!q) return true;
      return (e.ref+' '+(e.title||'')+' '+(e.statement||'')+' '+(e.hint||'')).toLowerCase().indexOf(q)>=0;
    });
    if(list.length) out.push({num:ch.num,n:list.length});
  });
  return out;
}
['最短路','二分','heapsort','红黑树','矩阵链','背包','拓扑'].forEach(function(q){
  var r=hits(q); var total=r.reduce(function(a,b){return a+b.n;},0);
  console.log('搜索 '+q.padEnd(8)+' → '+total+' 题，命中章节 '+r.length+' 个：'+r.map(function(x){return 'ch'+x.num+'('+x.n+')';}).join(' '));
});
console.log('空关键字 → '+hits('').reduce(function(a,b){return a+b.n;},0)+' 题（应为 287）');
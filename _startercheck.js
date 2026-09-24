const fs=require('fs'),path=require('path');
const C=require(path.join(process.env.PCDIR||__dirname,'core_py.js'));
const book=JSON.parse(fs.readFileSync(path.join(process.env.PCDIR||__dirname,'book_data.json'),'utf8'));
const NL=String.fromCharCode(10);
function wrapText(stmt,limit,maxLines){var out=[],s=String(stmt||'').replace(/\s+/g,' ').trim();
  while(s&&out.length<maxLines){ if(s.length<=limit){out.push(s);break;} var cut=limit;
    for(var ci=limit;ci>12;ci--){ if(' ，。；、,)）'.indexOf(s.charAt(ci))>=0){cut=ci+1;break;} }
    out.push(s.slice(0,cut).trim()); s=s.slice(cut).trim(); } return out; }
function starter(it){
  var raw=String(it.entry||'solve').split('/')[0].split('(')[0].trim();
  var fn=raw.replace(/[^A-Za-z0-9_]/g,'_').toLowerCase().replace(/_+/g,'_').replace(/^_+|_+$/g,'')||'solve';
  var ins=String(it.inputs||''),params=[];
  (ins.match(/[A-Za-z][A-Za-z0-9]*\s*\[1\.\.n\]/g)||[]).forEach(function(p){var nm=p.split('[')[0].trim();if(params.indexOf(nm)<0&&params.length<4)params.push(nm+'[1..n]');});
  ['v','n','m','k'].forEach(function(nm){if(params.length>=3)return;if(params.indexOf(nm)>=0)return;if(new RegExp('(^|[^A-Za-z0-9_])'+nm+'([^A-Za-z0-9_]|$)').test(ins))params.push(nm);});
  if(!params.length)params.push('n');
  var lines=['// '+it.ref+' '+it.title];
  wrapText(it.statement,34,3).forEach(function(w){lines.push('// '+w);});
  lines.push('// 完整题意见左侧「题目内容」');
  lines.push('function '+fn+'('+params.join(', ')+')','  ans = 0','  // TODO: 在这里写你的算法（数组下标从 1 开始）','  return ans','end');
  return lines.join(NL);
}
let ok=0,bad=0;
book.chapters.forEach(function(ch){ ch.exercises.forEach(function(e){
  var code=starter(e);
  try{ var r=C.compile(code,{}); if(r&&r.ok) ok++; else { bad++; if(bad<=4) console.log('FAIL',e.ref,JSON.stringify((r.diagnostics||[]).slice(0,1))); } }
  catch(err){ bad++; if(bad<=4) console.log('THROW',e.ref,err.message); }
});});
console.log('起步模板可编译:', ok+'/'+(ok+bad));
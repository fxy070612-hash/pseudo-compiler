const fs=require('fs'),path=require('path');
const book=JSON.parse(fs.readFileSync(path.join(process.env.PCDIR||__dirname,'book_data.json'),'utf8'));
function wrapText(stmt, limit, maxLines){
  var out=[], s=String(stmt||'').replace(/\s+/g,' ').trim();
  while(s && out.length<maxLines){
    if(s.length<=limit){out.push(s);break;}
    var cut=limit;
    for(var ci=limit;ci>12;ci--){ if(' ，。；、,)）'.indexOf(s.charAt(ci))>=0){cut=ci+1;break;} }
    out.push(s.slice(0,cut).trim()); s=s.slice(cut).trim();
  }
  return out;
}
let maxLine=0, worst=null;
book.chapters.forEach(function(ch){ ch.exercises.forEach(function(e){
  var w=wrapText(e.statement,34,3);
  var hint=String(e.hint||''); if(hint.length>40) hint=hint.slice(0,40)+'…';
  var lines=['// '+e.ref+' '+e.title].concat(w.map(function(x){return '// '+x;})).concat(['// 完整题意见左侧「题目内容」']);
  if(hint) lines.push('// 提示：'+hint);
  lines.push('function '+(e.entry||'solve')+'()','  ans = 0','  // TODO','  return ans','end');
  lines.forEach(function(L){ if(L.length>maxLine){maxLine=L.length;worst=[e.ref,L];} });
  if(0>0){} 
  }); });
function L_MAX(){return 0;}
console.log('全部起步模板里最长的一行 = '+maxLine+' 字符');
console.log('  出自 '+worst[0]+' : '+worst[1]);
// 中文按等宽 13px 估宽：一行 34 个汉字约 34*13=442px，编辑器最窄也有 ~600px
console.log('估算宽度 ≈ '+(maxLine*13)+'px（编辑器可用宽度一般 ≥ 600px）');
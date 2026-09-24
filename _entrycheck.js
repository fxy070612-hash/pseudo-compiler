const fs=require('fs'),path=require('path');
const book=JSON.parse(fs.readFileSync(path.join(process.env.PCDIR||__dirname,'book_data.json'),'utf8'));
function bookStarter(it){
  var rawEntry=String(it.entry||'solve').split('/')[0].split('(')[0].trim();
  var fn=rawEntry.replace(/[^A-Za-z0-9_]/g,'_').toLowerCase().replace(/_+/g,'_').replace(/^_+|_+$/g,'');
  if(!fn||/^[0-9]/.test(fn)) fn='solve';
  if(fn.length>40) fn=fn.slice(0,40).replace(/_+$/g,'');
  var ins=String(it.inputs||'');var params=[];
  (ins.match(/[A-Za-z][A-Za-z0-9]*\s*\[1\.\.n\]/g)||[]).forEach(function(p){var nm=p.split('[')[0].trim();if(params.indexOf(nm)<0&&params.length<4)params.push(nm+'[1..n]');});
  ['v','n','m','k'].forEach(function(nm){ if(params.length>=3) return; if(params.indexOf(nm)>=0) return; if(new RegExp('(^|[^A-Za-z0-9_])'+nm+'([^A-Za-z0-9_]|$)').test(ins)) params.push(nm); });
  if(!params.length) params.push('n');
  return 'function '+fn+'('+params.join(', ')+')';
}
let bad=0, checked=0;
book.chapters.forEach(function(ch){ ch.exercises.forEach(function(e){
  var head=bookStarter(e); checked++;
  if(!/^function [a-z_][a-z0-9_]*\([^)]*\)$/.test(head)){ bad++; if(bad<=5) console.log('BAD', e.ref, JSON.stringify(e.entry), '->', head); }
  else if(checked<=6) console.log('OK ', e.ref, '->', head);
});});
console.log('检查', checked, '条，函数头非法', bad);
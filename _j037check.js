const fs=require('fs'),path=require('path');
const p=path.join(process.env.PCDIR||__dirname,'book_out','j037.json');
const raw=fs.readFileSync(p,'utf8');
const errs=[];
let d;
try{ d=JSON.parse(raw); }catch(e){ console.log('PARSE FAIL: '+e.message); process.exit(1); }
if(!Array.isArray(d)) errs.push('not an array');
console.log('isArray:', Array.isArray(d), '| count:', d.length, '| expected: 13');
if(d.length!==13) errs.push('count != 13');
const FIELDS=['ref','chapter','chapterTitle','section','page','kind','title','statement','entry','inputs','outputs','hint','note'];
d.forEach((o,i)=>{
  const k=Object.keys(o);
  if(k.length!==13) errs.push(i+' '+o.ref+': field count '+k.length);
  if(JSON.stringify(k)!==JSON.stringify(FIELDS)) errs.push(i+' '+o.ref+': order/name mismatch -> '+k.join('|'));
  FIELDS.forEach(f=>{ if(f!=='page' && typeof o[f]!=='string') errs.push(i+' '+o.ref+': '+f+' not string'); });
  if(typeof o.page!=='number') errs.push(i+' '+o.ref+': page not number');
  if(!o.ref||!o.title||!o.statement||!o.entry||!o.inputs||!o.outputs||!o.hint) errs.push(i+' '+o.ref+': empty required field');
});
let inStr=false, esc=false, bad=0, line=1;
for(let i=0;i<raw.length;i++){
  const c=raw[i];
  if(c==='\n'){ if(inStr) bad++; line++; continue; }
  if(esc){ esc=false; continue; }
  if(c==='\\'){ if(inStr) esc=true; continue; }
  if(c==='"') inStr=!inStr;
}
console.log('raw newlines inside string literals:', bad);
if(bad) errs.push('raw newline inside string');
const ctrl=[];
(function walk(v,path){ if(typeof v==='string'){ for(const ch of v){ if(ch.charCodeAt(0)<32) ctrl.push(path); } } else if(v&&typeof v==='object'){ for(const k in v) walk(v[k],path+'.'+k); } })(d,'root');
console.log('control chars inside values:', ctrl.length?ctrl.join(','):'none');
const src=['26.1-1','26.1-3','26.1-5','26.1-6','26.1-7','26.1-8','26.1-9','26.1-10','26.2-1','26.2-3','26.2-4','26.2-5','26.3-2','26.3-3','26.3-4','26.3-5'];
const kept=d.map(o=>o.ref);
console.log('kept   :', kept.join(', '));
console.log('dropped:', src.filter(r=>!kept.includes(r)).join(', '));
console.log('unknown refs:', kept.filter(r=>!src.includes(r)).join(', ')||'none');
console.log('kinds  :', JSON.stringify(d.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{})));
console.log('with note:', d.filter(o=>o.note).map(o=>o.ref).join(', '));
console.log(errs.length? 'ERRORS:\n'+errs.join('\n') : 'ALL CHECKS PASSED');

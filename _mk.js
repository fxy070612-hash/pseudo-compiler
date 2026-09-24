const fs=require('fs'),path=require('path');
const dir=process.env.PCDIR;
const rd=n=>fs.readFileSync(path.join(dir,n),'utf8');
const esc=s=>s.split('</script>').join('<\\/script>');
let html=rd('shell.html');
const core=rd('core_py.js'), ui=rd('ui.js');
let book='';
try{ book=rd('book_data.js'); }catch(e){ book='window.PseudoBook=null;'; }
for(const ph of ['/*__BOOK__*/','/*__CORE__*/','/*__UI__*/']) if(html.indexOf(ph)<0) throw new Error('placeholder missing: '+ph);
html=html.replace('/*__BOOK__*/',()=>esc(book)).replace('/*__CORE__*/',()=>esc(core)).replace('/*__UI__*/',()=>esc(ui));
fs.writeFileSync(path.join(dir,'伪代码编译器.html'),html,'utf8');
const segs=[];const re=/<script>([\s\S]*?)<\/script>/g;let m;while((m=re.exec(html)))segs.push(m[1]);
segs.forEach((s,i)=>{try{new Function(s);console.log('inline#'+(i+1)+' OK ('+s.length+' bytes)');}catch(e){console.log('inline#'+(i+1)+' ERR: '+e.message);}});
console.log('html bytes', html.length);
const fs=require('fs');
const p='C:\\ProgramData\\pseudo-compiler\\shell.html';
let t=fs.readFileSync(p,'utf8');
const R=[
 ['.modal-body{padding:16px 18px;display:grid;gap:11px}', '.modal-body{padding:16px 18px;display:flex;flex-direction:column;gap:11px;min-width:0}'],
 ['.book-bar{display:flex;align-items:center;gap:10px;margin-bottom:10px}', '.book-bar{display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap}'],
 ['.book-part{font-size:12px;font-weight:700;color:var(--ink3);letter-spacing:.04em;margin:14px 0 6px}', '#bookList{display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:8px;align-items:start;min-width:0}\n#bookList .empty{grid-column:1/-1}\n.book-part{grid-column:1/-1;font-size:12px;font-weight:700;color:var(--ink3);letter-spacing:.04em;margin:12px 0 2px}'],
 ['.book-ch{border:1px solid var(--line);border-radius:10px;margin-bottom:8px;overflow:hidden;background:#fff}', '.book-ch{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;min-width:0}'],
 ['.book-ch-head{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;background:#fafbfd}', '.book-ch-head{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;background:#fafbfd;position:sticky;top:-1px;z-index:1}'],
 ['.book-it input{margin-top:3px}', '.book-it input[type=checkbox]{flex:none;width:15px;height:15px;margin:3px 0 0;accent-color:var(--accent)}'],
 ['.book-it-main{flex:1;min-width:0}', '.book-it-main{flex:1 1 auto;min-width:0}'],
 ['<div class="modal" style="width:min(940px,94vw)">', '<div class="modal" style="width:min(1240px,96vw);display:flex;flex-direction:column;overflow:hidden">'],
 ['<div class="modal-body" style="max-height:64vh;overflow:auto">', '<div class="modal-body" style="max-height:70vh;min-height:52vh;overflow:auto;flex:1 1 auto">']
];
let n=0;
for(const [a,b] of R){ if(t.indexOf(a)<0){ console.log('MISS:', JSON.stringify(a.slice(0,60))); continue; } t=t.split(a).join(b); n++; }
fs.writeFileSync(p,t,'utf8');
console.log('applied',n,'/',R.length);
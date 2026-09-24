const fs=require('fs'),path=require('path');
const dir=(process.env.PCDIR||__dirname)+path.sep;
const coreSrc=fs.readFileSync(path.join(dir,'core_py.js'),'utf8');
const uiSrc=fs.readFileSync(path.join(dir,'ui.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'伪代码编译器.html'),'utf8');
const NL=String.fromCharCode(10);
const ids=[...new Set((html.match(/id="([^"]+)"/g)||[]).map(s=>s.slice(4,-1)))];
const missing=[];const re=/\$\('([A-Za-z0-9_]+)'\)/g;let m;
while((m=re.exec(uiSrc))) if(ids.indexOf(m[1])<0) missing.push(m[1]);
console.log('ids='+ids.length+'  missing='+JSON.stringify([...new Set(missing)]));
const errors=[];
function mkEl(tag){var e={tagName:tag,_cls:'',children:[],_text:'',_html:'',value:'',disabled:false,title:'',id:'',scrollTop:0,scrollLeft:0,selectionStart:0,selectionEnd:0,style:{setProperty:function(){}},
  classList:{_s:{},add:function(c){this._s[c]=1;},remove:function(c){delete this._s[c];},contains:function(c){return !!this._s[c];},toggle:function(c,f){var on=(f===undefined)?!this._s[c]:!!f;if(on)this._s[c]=1;else delete this._s[c];return on;}},
  appendChild:function(c){this.children.push(c);return c;},addEventListener:function(){},setAttribute:function(){},getAttribute:function(){return null;},querySelector:function(){this._q=this._q||mkEl('div');return this._q;},querySelectorAll:function(){return [];},focus:function(){},click:function(){if(this.onclick)this.onclick();},remove:function(){},get firstChild(){return this.children[0]||null;}};
  Object.defineProperty(e,'textContent',{get:function(){return e._text;},set:function(v){e._text=String(v);}});
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=String(v);e.children=[];}});
  Object.defineProperty(e,'className',{get:function(){return e._cls;},set:function(v){e._cls=String(v);}});
  return e;}
const els={};ids.forEach(function(id){const e=mkEl('div');e.id=id;els[id]=e;});
['edInput','probSize','probStatement','probTitle','probNotes','cfgProto','cfgTemp','cfgTokens','cfgRounds','rejectReason'].forEach(function(k){if(els[k])els[k].value=k==='probSize'?'256':(k==='cfgProto'?'openai':(k==='cfgTemp'?'0.2':(k==='cfgTokens'?'4000':(k==='cfgRounds'?'3':''))));});
const work=mkEl('div');work.children=[els.bankView,mkEl('div'),mkEl('div')];
const doc={readyState:'complete',getElementById:function(id){return els[id]||null;},createElement:mkEl,querySelector:function(sel){if(sel==='.work')return work;return null;},querySelectorAll:function(){return [];},addEventListener:function(){},body:mkEl('body')};
const store={};
const win={PseudoCore:null,localStorage:{getItem:function(k){return store[k]===undefined?null:store[k];},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];},key:function(i){return Object.keys(store)[i]||null;},get length(){return Object.keys(store).length;}},
  fetch:function(){return Promise.reject(new Error('no net'));},navigator:{clipboard:{writeText:function(){return Promise.resolve();}}},document:doc,addEventListener:function(){},
  Blob:function(){},URL:{createObjectURL:function(){return 'blob:x';}},FileReader:function(){this.readAsText=function(){};this.readAsDataURL=function(){};},
  setTimeout:function(f){return setTimeout(f,0);},clearTimeout:clearTimeout,setInterval:function(){return 0;},console:{log:console.log,error:function(){errors.push(Array.prototype.slice.call(arguments).join(' '));},warn:function(){}},
  Promise:Promise,JSON:JSON,Math:Math,Date:Date,RegExp:RegExp,String:String,Number:Number,Object:Object,Array:Array,Error:Error,isFinite:isFinite,parseInt:parseInt,parseFloat:parseFloat,Intl:Intl,
  encodeURIComponent:encodeURIComponent,decodeURIComponent:decodeURIComponent,confirm:function(){return true;}};
new Function('window','globalThis',coreSrc+'\nreturn window.PseudoCore;')(win,win);
global.confirm=function(){return true;};
const code=['function median(A[1..n]) : float','  return A[1]','end'].join(NL);
const grade={ai:true,score:82,wanted:'',reviewers:3,level:'良好',runs:[{score:80},{score:85},{score:82}],dims:[{name:'思路正确性',score:34,full:40,note:'思路对'}],findings:[{level:'warn',text:'边界可再检查',hint:'加一句判断'}],strengths:['结构清晰'],better:'可用快速选择做到 O(n)',spread:5,verdict:'整体正确',appeals:[{reason:'我的边界是对的',oldScore:82,newScore:88,result:'改判',response:'确认边界无误',at:Date.now()}]};
const bank=[{id:'p1',title:'中位数',statement:'求中位数',notes:'',size:256,currentSol:'s1',solutions:[{id:'s1',name:'解法一 · 排序取中',code:code,outputs:['m'],badgeText:'O(n^2)',grade:grade}]},{id:'p2',title:'最长公共子序列',statement:'DP',notes:'',size:256,currentSol:'s2',solutions:[{id:'s2',name:'解法一 · DP',code:code,outputs:['m'],badgeText:'未编译'}]}];
store['pseudo-course-workbench-v1']=JSON.stringify(bank);
new Function('window','document','localStorage','setTimeout','clearTimeout','console','fetch','navigator','Blob','URL','FileReader','Promise','JSON','Math','Date','RegExp','String','Number','Object','Array','Error','isFinite','parseInt','parseFloat','Intl','encodeURIComponent','decodeURIComponent',uiSrc)(
  win,doc,win.localStorage,win.setTimeout,clearTimeout,win.console,win.fetch,win.navigator,win.Blob,win.URL,win.FileReader,Promise,JSON,Math,Date,RegExp,String,Number,Object,Array,Error,isFinite,parseInt,parseFloat,Intl,encodeURIComponent,decodeURIComponent);
setTimeout(function(){
  const gb=els.gradeBox;
  function findText(node,needle,out){ out=out||[]; if(!node) return out; if(String(node._text||'').indexOf(needle)>=0) out.push(node._text); (node.children||[]).forEach(function(c){findText(c,needle,out);}); return out; }
  const btnTexts=[]; (function walk(n){ (n.children||[]).forEach(function(c){ if(c.tagName==='button') btnTexts.push(c._text); walk(c); }); })(gb);
  console.log('gradeBox 按钮: '+JSON.stringify(btnTexts));
  console.log('驳回记录: '+JSON.stringify(findText(gb,'驳回记录')));
  console.log('anaBox: '+JSON.stringify(findText(els.anaBox,'时间复杂度')));
  if(els.btnBank&&els.btnBank.onclick){ els.btnBank.onclick(); }
  setTimeout(function(){
    console.log('题库卡片数='+((els.bankGrid.children||[]).length)+' hint='+(els.bankHint._text||''));
    console.log('运行时错误='+JSON.stringify(errors));
    console.log('toast='+(els.toast._text||''));
  },120);
},700);
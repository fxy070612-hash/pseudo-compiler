const fs=require('fs'),path=require('path');
const dir=(process.env.PCDIR||__dirname)+path.sep;
const coreSrc=fs.readFileSync(path.join(dir,'core_py.js'),'utf8');
const bookSrc=fs.readFileSync(path.join(dir,'book_data.js'),'utf8');
const uiSrc=fs.readFileSync(path.join(dir,'ui.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'伪代码编译器.html'),'utf8');
const ids=[...new Set((html.match(/id="([^"]+)"/g)||[]).map(s=>s.slice(4,-1)))];
const missing=[];const re=/\$\('([A-Za-z0-9_]+)'\)/g;let m;
while((m=re.exec(uiSrc))) if(ids.indexOf(m[1])<0) missing.push(m[1]);
console.log('ids='+ids.length+' missing='+JSON.stringify([...new Set(missing)]));
const errors=[];
function mkEl(tag){var e={tagName:tag,_cls:'',children:[],_text:'',_html:'',value:'',disabled:false,title:'',id:'',checked:false,type:'',scrollTop:0,scrollLeft:0,selectionStart:0,selectionEnd:0,style:{setProperty:function(){}},
  classList:{_s:{},add:function(c){this._s[c]=1;},remove:function(c){delete this._s[c];},contains:function(c){return !!this._s[c];},toggle:function(c,f){var on=(f===undefined)?!this._s[c]:!!f;if(on)this._s[c]=1;else delete this._s[c];return on;}},
  appendChild:function(c){this.children.push(c);return c;},addEventListener:function(){},setAttribute:function(){},getAttribute:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},focus:function(){},click:function(){if(this.onclick)this.onclick();},remove:function(){}};
  Object.defineProperty(e,'textContent',{get:function(){return e._text;},set:function(v){e._text=String(v);}});
  Object.defineProperty(e,'innerHTML',{get:function(){return e._html;},set:function(v){e._html=String(v);e.children=[];}});
  Object.defineProperty(e,'className',{get:function(){return e._cls;},set:function(v){e._cls=String(v);}});
  return e;}
const els={};ids.forEach(function(id){const e=mkEl('div');e.id=id;els[id]=e;});
['edInput','probSize','probStatement','probTitle','probNotes','cfgProto','cfgTemp','cfgTokens','cfgRounds','bookSearch'].forEach(function(k){if(els[k])els[k].value=k==='probSize'?'256':(k==='cfgProto'?'openai':(k==='cfgTemp'?'0.2':(k==='cfgTokens'?'4000':(k==='cfgRounds'?'3':''))));});
const work=mkEl('div');work.children=[els.bankView,mkEl('div'),mkEl('div')];
const doc={readyState:'complete',getElementById:function(id){return els[id]||null;},createElement:mkEl,querySelector:function(sel){if(sel==='.work')return work;return null;},querySelectorAll:function(){return [];},addEventListener:function(){},body:mkEl('body')};
const store={};
const win={PseudoCore:null,localStorage:{getItem:function(k){return store[k]===undefined?null:store[k];},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];},key:function(i){return Object.keys(store)[i]||null;},get length(){return Object.keys(store).length;}},
  fetch:function(){return Promise.reject(new Error('no net'));},navigator:{clipboard:{writeText:function(){return Promise.resolve();}}},document:doc,addEventListener:function(){},
  Blob:function(){},URL:{createObjectURL:function(){return 'blob:x';}},FileReader:function(){this.readAsText=function(){};this.readAsDataURL=function(){};},
  setTimeout:function(f){return setTimeout(f,0);},clearTimeout:clearTimeout,setInterval:function(){return 0;},
  console:{log:console.log,error:function(){errors.push(Array.prototype.slice.call(arguments).join(' '));},warn:function(){}},
  Promise:Promise,JSON:JSON,Math:Math,Date:Date,RegExp:RegExp,String:String,Number:Number,Object:Object,Array:Array,Error:Error,isFinite:isFinite,parseInt:parseInt,parseFloat:parseFloat,Intl:Intl,
  encodeURIComponent:encodeURIComponent,decodeURIComponent:decodeURIComponent,confirm:function(){return true;}};
new Function('window', bookSrc)(win);
console.log('PseudoBook 章节数='+(win.PseudoBook?win.PseudoBook.chapters.length:'null')+' 总题数='+(win.PseudoBook?win.PseudoBook.stats.exercises:0));
new Function('window','globalThis',coreSrc+'\nreturn window.PseudoCore;')(win,win);
new Function('window','document','localStorage','setTimeout','clearTimeout','console','fetch','navigator','Blob','URL','FileReader','Promise','JSON','Math','Date','RegExp','String','Number','Object','Array','Error','isFinite','parseInt','parseFloat','Intl','encodeURIComponent','decodeURIComponent',uiSrc)(
  win,doc,win.localStorage,win.setTimeout,clearTimeout,win.console,win.fetch,win.navigator,win.Blob,win.URL,win.FileReader,Promise,JSON,Math,Date,RegExp,String,Number,Object,Array,Error,isFinite,parseInt,parseFloat,Intl,encodeURIComponent,decodeURIComponent);
setTimeout(function(){
  function texts(n,out){out=out||[];(n.children||[]).forEach(function(c){if(c._text)out.push(c._text);texts(c,out);});return out;}
  els.btnBook.onclick();
  const heads=(els.bookList.children||[]).filter(function(c){return (c._cls||'').indexOf('book-ch')>=0;});
  console.log('书本弹窗: 章节卡='+heads.length+' 统计='+(els.bookStat._text||''));
  // 展开第一章并按全选
  heads[0].children[0].onclick();
  setTimeout(function(){
    els.btnBookAll.onclick();
    console.log('全选后按钮计数='+(els.bookCount._text||'')+' 提示='+(els.bookSelHint._text||''));
    els.btnBookImport.onclick();
    setTimeout(function(){
      console.log('导入后题库题数='+((els.probList.children||[]).length)+' 题目='+(els.probTitle.value||''));
      console.log('编辑器中是否含 function='+(String(els.edInput.value||'').indexOf('function')>=0));
      console.log('保存键含书本题='+((store['pseudo-course-workbench-v1']||'').indexOf('fromBook')>=0));
      console.log('运行时错误='+JSON.stringify(errors.slice(0,3)));
      console.log('toast='+(els.toast._text||''));
      process.exit(0);
    },400);
  },200);
},600);
Object.prototype.ref=function(k){ return this[k].bind(this); }
var qs=document.ref("querySelector"), qsEach=(css,op)=>document.querySelectorAll(css).forEach(op), $=$||qs;
Element.prototype.wrapBy=function(get_e1){
  let e1=get_e1(this); this.replaceWith(e1); e1.appendChild(this);
}
Array.prototype.mapAppend=function(e0,op){
  for (let x of this) e0.appendChild(op(x));
  return e0
}
Array.prototype.partition=function(p){
  let a=[],b=[];
  for(let x of this)(p(x)?a:b).push(x);
  return [a,b];
}

Object.mapValues_=function(o,op){
  for (let k of Object.keys(o)) o[k]=op(o[k]);
}
function forEntries(o,op){for(let [k,v] of Object.entries(o))op(k,v);}
function copy(o){return o}//TODO
function enable_(o) {
  for (let k in o) if(k[k.length-1]=="_") {
    let op = o[k];
    o[k.slice(0,-1)]= (!!o.prototype)? function(){ arguments[0]=copy(arguments[0]); op.apply(this, arguments); return arguments[0] } :
    function(){ let o1=copy(this); op.apply(o1, arguments); return o1 };
  }
}
function assertEq(expect,v) {
  if(v!=expect) throw TypeError(`assert: ${v} != ${expect}`);
}
function ifCatch(op_cond, a,b) {
  try { op_cond(); return b; }
  catch (ex) { return a; }
}
enable_(Object);

String.prototype.replaceLazy=ifCatch(()=> assertEq("axbc","abc".replace("bc",k=>"x"+k)), function(s,get_s1){
  let i=this.indexOf(s);
  return (i==-1)? this : this.replace(s,get_s1(s));
},String.prototype.replace);

function dateFmt(fmt) {//TODO 支持 :simp
  function fillZ(n){return n<10?"0"+n:String(n)}
  if(!Symbol.replace)function subst(op) {
    let acc=fmt;
    for (let k in dateFmt.toks) acc = acc.replaceLazy(k, op);
    return acc
  }else function subst(op){ // 丑.
    return dateFmt.toks.re[Symbol.replace](fmt, (m1)=>{ return m1&&m1.length==2&&(m1[0]==m1[1])? fillZ(op(m1[0])):op(m1); })
  }
  let ks = [], re = RegExp(subst(k=>{ks.push(k);return "(.*?)"}), "g");
  return (t,s)=>{
    if(!!s) {
      let m = re.exec(s);
      for(let i=1;i<m.length;i++) t["set"+dateFmt.toks[ks[i-1]] ].call(t, m[i]); // 就是以 m=[0,...ms] 为中心去迭代 i
      return t;
    }
    return subst(k=>t["get"+dateFmt.toks[k]].call(t));
  };
}
dateFmt.toks={
  "yyyy": "FullYear", "yy":"Year2", "m": "Month", "d": "Date",
  "h": "Hours", "M": "Minutes","s":"Seconds",
  get re(){
    let ks=Object.keys(this); ks.splice(ks.indexOf("re"));
    let [cOne,cs] = ks.partition(k=>k.length==1);
    return RegExp(`[${cOne.join("")}]{1,2}|`+cs.map(c=>`(${c})`).join("|"), "g")
  }
}; // 不支持 p/am 和 week
Object.assign(dateFmt, Object.mapValues({
  cnAll:"yyyy年mm月dd日hh时MM分ss秒",
  cnDay:"mm月dd日",
  cnTime:"hh时MM分",
  cnSimp:"mm月dd日 hh:MM",
  all: "yyyy-mm-dd hh:MM:ss",
  simp: "mm-dd hh:MM"
}, dateFmt));

function timerRate(dt_ms, op) {
  var id,opAgain;
  (function(){ if(!op())id=setTimeout(opAgain||(opAgain=arguments.callee.bind(null,arguments)), dt_ms);})();
  return function cancel(){clearTimeout(id)};
}
const timedToggle=(dt_ms,k)=>(ev)=>{
  let evt=ev.target; evt[k]=true;
  setTimeout(()=>{evt[k]=false},dt_ms);
};
function newArray(n,get){var a=Array(n),i;for(i=0;i<n;i++)a[i]=get(i);return a}
String.prototype.extractFlag=function(s_pre){
  return this.startsWith(s_pre)? [true,this.substr(s_pre.length)]:[false,this];
}
const rand=(a,b)=>Math.random()*b%a,randInt=(a,b)=>Math.floor(Math.random()*b)%a;

const reParens=/\((.*?)\)/g,reVar=/%(.*?)%/g;
function elemMatchMapper(fmt,op_ks=(k,s)=>{ let e=emet_(k);e.textContent=s; return e }) {
  let [isAllFind,sFmt] = fmt.extractFlag("?");
  let ks=[], nIncs=[];
  let sre = reVar[Symbol.replace](sFmt, (m0,k)=>k.splitCond("|",
    k=>{ks.push(k); return "(.*?)"},
    (ssre,n_inc,k)=>{nIncs.push(parseInt(n_inc)); ks.push(k); return ssre}, 3)
  ),
  re = RegExp(isAllFind? sre : "^"+sre+"$",isAllFind?"g":"");
  let search = isAllFind? s=>[...re[Symbol.matchAll](s)] : s=>reGroupAsMatch(re.exec(s));
  return window.cell=(e0,s) => {
    var i1 = 0; // of last span
    search(s).forEach((m,idx)=> { // 天哪咱竟然习惯了 JS Array+input&index RegMatch 格式
      let raw=s.slice(i1,m.index); if(raw!="") e0.append(raw);
      i1 = m.index+m[1].length+(nIncs[idx]||0); // 只是用 RE 提取句分，它index始终==0，正则不包含常量长信息，故此
      e0.appendChild(op_ks( ks[idx], m[1] ));
    });
    let raw=s.slice(i1); if(raw!="") e0.append(raw);
    return e0;
  }
}
function reGroupAsMatch(m) {
  if(m==null)return [];
  var i0 = m.index,idx;
  return newArray(m.length-1, i=>{ let s=m[1+i], idx=i0;i0+=s.length; return {0:m[0],1:s,index:idx+i,length:2} });//FIXME why+i
}


function enableStyleSetprop() {
  var k,s;
  for (let sh of document.styleSheets) if((k=sh.ownerNode.getAttribute("setprop"))!=null) { // 可以作 cyclic 序列
    for (let r of [...sh.rules]) if((s=r.style).content!="") {
      let v=s.content;s.content="";
      if(v[0]=="\"") v=JSON.parse(v);
      qsEach(r.selectorText, e=>{ e.setAttribute(k,v); });
    }
  }
}

function enableClock(e){
  let k=e.getAttribute("fmt"), fmt = k[0]==":"? dateFmt[k.substr(1)] : dateFmt(k);
  enableClock.all.push(timerRate(1000,()=>{
    e.textContent = fmt(new Date);
  }))
}
enableClock.all=[];

function expandTable(e0,code) {
  let cell=elemMatchMapper(e0.getAttribute("gen"));
  code.split("\n").mapAppend(e0, row=>row.split("|").mapAppend(emet("tr"), col=>
    cell(emet("td"), col)
  ));
}
function expandForm(e0,code) {
  code=code||e0.firstChild.textContent.trim();
  code.split("\n").mapAppend(e0, sInp=>{
    let [k,t]=sInp.split(":",2);
    let e= emet(`label input[name=${k}${k.endsWith("At")?",type=datetime-local":""}]`);
    e[1].placeholder=t;e[0].insertBefore(document.createTextNode(t+"："),e[0].firstChild); return e[0];
  })
}
function expandsPropMap(k,on_each,map){
  function fmter(k,v){
    let a = expandsPropMap.fmtRe.find(a=>a[0].test(k));
    return (!!a)? a[1](v) : String(v)
  }
  if(typeof on_each=="string")on_each=qsEach.bind(null,on_each);
  on_each(e=>{ e[k]=fmter(e[k],map.get(e[k])); })
}
expandsPropMap.fmtRe=[];
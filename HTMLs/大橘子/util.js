Object.prototype.ref=function(k){ return this[k].bind(this); }
var qs=document.ref("querySelector"), qsEach=(css,op)=>document.querySelectorAll(css).forEach(op), $=$||qs;
Element.prototype.wrapBy=function(get_e1){
  let e1=get_e1(this); this.replaceWith(e1); e1.appendChild(this);
}
Array.prototype.mapAppend=function(e0,op){
  for (let x of this) e0.appendChild(op(x));
  return e0
}

Object.mapValues_=function(o,op){
  for (let k of Object.keys(o)) o[k]=op(o[k]);
}
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
enable_(Object)

String.prototype.replaceLazy=ifCatch(()=> assertEq("axbc","abc".replace("bc",k=>"x"+k)), function(s,get_s1){
  let i=this.indexOf(s);
  return (i==-1)? this : this.replace(s,get_s1(s));
},String.prototype.replace)
function dateFmt(fmt) {
  function subst(op) {
    let acc=fmt; // bad, improve with RegExp Symbol. replace/split
    for (let k in dateFmt.toks) acc = acc.replaceLazy(k, op);
    return acc
  }
  let ks = [], re = RegExp(subst(k=>{ks.push(k);return "(.*?)"}), "g");
  return (t,s)=>{
    if(!!s) {
      let m = re.exec(s);
      for(let i=1;i<m.length;i++) t["set"+dateFmt.toks[ks[i-1]] ].call(t, m[i]);
    }
    return subst(k=>t["get"+dateFmt.toks[k]].call(t));
  };
}
dateFmt.toks={
  "yyyy": "FullYear", "yy":"Year2", "mm": "Month", "dd": "Date",
  "hh": "Hours", "MM": "Minutes","ss":"Seconds"};
Object.assign(dateFmt, Object.mapValues({
  cnAll:"yyyy年mm月dd日hh时MM分ss秒",
  cnDay:"mm月dd日",
  cnTime:"hh时MM分",
  cnSimp:"mm月dd日 hh:MM",
  all: "yyyy-mm-dd hh:MM:ss",
  simp: "mm-dd hh:MM"
}, dateFmt))

function timerRate(dt_ms, op) {
  var id,opAgain;
  (function(){ if(!op())id=setTimeout(opAgain||(opAgain=arguments.callee.bind(null,arguments)), dt_ms);})();
  return function cancel(){clearTimeout(id)};
}
function newArray(n,get){var a=Array(n),i;for(i=0;i<n;i++)a[i]=get(i);return a}

const reParens=/\((.*?)\)/g;
function elemMatchMapper(fmt,op_ks) {
  let ks = [], re = RegExp(""+reParens[Symbol.replace](fmt, (m0,k)=>{ ks.push(k); return "(.*?)"; })+"", "g"); //FIXME
  return (e0,s) => {
    var i1 = 0; // of last span
    //let m0 = re.exec(s);
    for (let m of re[Symbol.matchAll](s)) {
      let raw=s.slice(i1,m.index); if(raw!="") e0.append(raw);
      i1 = m.index+(m[0].length-1); // 天哪咱竟然习惯了 JS Array+input&index RegMatch 格式
      for (let i=1;i<m.length; i++) e0.appendChild(op_ks( ks[i-1], m[i] )); // 就是以 m=[0,...ms] 为中心去迭代 i
    }
    let raw=s.slice(i1); if(raw!="") e0.append(raw);
    return e0;
  }
}
function reGroupAsMatch(m) {
  if(m==null)return [];
  var i0 = 0;
  return newArray(m.length-1, i=>{ let s=m[1+i], idx=i0+i;i0+=s.length; return {0:m[0],1:s,index:idx,length:2} });
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

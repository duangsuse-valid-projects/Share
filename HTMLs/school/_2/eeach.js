Element.prototype.popAttr=function(k){let v=this.getAttribute(k);this.removeAttribute(k);return v}
Object.prototype.mapKey=function(k,op){this[k]=op(this[k]);}
isLoaded=false;
const lets=(o,op,v_nul)=>(!!o)?op(o):v_nul,
  onLoaded=(op)=>(...args)=>isLoaded? op(...args) : document.addEventListener("DOMContentLoaded",()=>op(...args)),
  qsEach=onLoaded((css,op)=>document.querySelectorAll(css).forEach(op)),

  wrapBy=onCall=>(op)=>(...a)=>{let y=op(...a);onCall(a,y);return y},logs=wrapBy(console.log),
  logsFnArg=(op)=>(...a)=>op(...(a.map((f,i)=>(typeof f==="function")? wrapBy(console.log.bind(null,i))(f):f))),
  qChain=(o,k)=>(k=="")? o : k.split(".").reduce((a,kk)=>a[kk], o),
  qaChain=(o,k, v)=>{ let i=k.lastIndexOf("."); return (i==-1)? (o[k]=v) : (qChain(o,k.slice(0,i))[k.slice(i+1)]=v); }

  reDolls=[/\$(\w+)/g,/\$\{(.*?)\}/g],
  replaceAll=(s,subst,re)=>{return re.reduce((s1,gre)=>gre[Symbol.replace](s1,subst), s) },
  evalTepl=(s,it)=>replaceAll(decodeURIComponent(s), (_,m1)=>eval(m1), reDolls),
  evalEq=(s,it,op_else)=>(s!=""&&s[0]=="=")? eval(s.slice(1)) : op_else(s); //才想起有with(o){eval}
onLoaded(()=>{isLoaded=true})();

String.prototype.split2D=function(sep,sep1){return this.split(sep).map(r=>r.split(sep1))}
//each="a:b" repeat="" key="textContent+href=$it:label" pos="parentNode.parentNode"
qsEach("[each]", e=>{
    let ga=k=>e.popAttr(k), willDel=false,
      e0=lets(ga("pos"),k=>{willDel=true;return qChain(e,k)},e),
      eCopy=qChain(e,ga("repeat")||""), sep=ga("sep")||":";
    lets(ga("data"), v=>{e.data=JSON.parse(v);});
    let
      orExpand=s=>evalTepl(s,e).split2D(" ",sep), // 能方便写单项
      vs=evalEq(ga("each"), e, orExpand), k=(ga("key")||"textContent").split2D(sep,"+");//TODO 支持.中指定不同主语
    const // 今天才知道可以用系统自带的escape 不必改split
      setOrEval=(o,k, v)=>{ let kv=k.split("=",2),n1=(kv.length==1); qaChain(o,n1?k:kv[0], n1?v:evalTepl(kv[1],v) ); },
      assign=(eDst,v)=>k.forEach((r,i)=>{ r.forEach(kk=>{setOrEval(eDst,kk,v[i]);}) });
    vs.forEach(v=>{ assign(e,v); let e1=eCopy.cloneNode(true); e0.appendChild(e1); })
    if(willDel)e.remove(); else e[k]="";//since orig e modified.
})

function procStyleSheet(k_enable,p_style,op) {
	for(let ss of document.styleSheets)if(ss.ownerNode.hasAttribute(k_enable)) {
		for(let r of ss.cssRules) if(p_style(r.style)) op(r);
	}
}
mapKey("procStyleSheet",onLoaded);

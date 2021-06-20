Element.prototype.popAttr=function(k){let v=this.getAttribute(k);this.removeAttribute(k);return v}
Object.prototype.mapKey=function(k,op){this[k]=op(this[k]);}
isLoaded=false;
const lets=(o,op,v_nul)=>(o!=null)?op(o):v_nul,
  letsv=(o,op,op_v)=>(o!=null)? (!!op? op(o):o):op_v(),
  onLoaded=(op)=>(...args)=>isLoaded? op(...args) : document.addEventListener("DOMContentLoaded",()=>op(...args)),
  qsEach=onLoaded((css,op)=>document.querySelectorAll(css).forEach(op)),

  wrapBy=onCall=>(op)=>(...a)=>{let y=op(...a);onCall(a,y);return y},logs=wrapBy(console.log),
  logsFnArg=(op)=>(...a)=>op(...(a.map((f,i)=>(typeof f==="function")? wrapBy(console.log.bind(null,i))(f):f))),
  qChain=(o,k)=>(k=="")? o : k.split(".").reduce((a,kk)=>a[kk], o),
  qaChain=(o,k, v)=>{ let i=k.lastIndexOf("."); if (i==-1) {o[k]=v;return o} else {let o1=qChain(o,k.slice(0,i)); o1[k.slice(i+1)]=v; return o1}},
  mayPipe=(f,x)=>(typeof f==="function")? f(x) : x,

  reDolls=[/\$(\w+)/g, /\$\{(.*?)\}/g],
  replaceAll=(s,subst,re)=>{return re.reduce((s1,gre)=>gre[Symbol.replace](s1,subst), s) },
  evalTepl=(s,it)=>replaceAll(decodeURIComponent(s), (_,m1)=>eval(m1), reDolls),
  evalEq=(s,it,op_else)=>(s!=""&&s[0]=="=")? eval(s.slice(1)) : op_else(s), //才想起有with(o){eval}
  fillElemOpts=(d_deft,d,e)=>{if(typeof d!=="object"||!d)d={}; for(let k in d_deft)if(!(k in d)) d[k] = letsv(e.popAttr(k),null, ()=>d_deft[k]);  return d},
  objConf=(kvs,k_ops)=>{ let o={},n=0, op0=k_ops._all_,opD=k_ops._deft_; for(let [k,v] of kvs) {let f=k_ops[k]; o[k]=mayPipe(op0,mayPipe(f||opD,v)); n++; } o.nKey=n; return o; },
  insertElem=(e1, place, e)=>{
  	switch(place) { // 亦可利用 insertAdjHTML
  		case "before": e.parentNode.insertBefore(e1,e); break;
  		case "after": letsv(e.nextSibling, eR=>e.parentNode.insertBefore(e1,eR), ()=>e.parentNode.appendChild(e1)); break;
  		case "in": e.appendChild(e1); break; //beforeEnd
  		case "in0": letsv(e.firstChild, ee0=>e.insertBefore(e1, ee0), ()=>e.appendChild(e1)); break; //afterStart
  	}
  };
onLoaded(()=>{isLoaded=true})();

String.prototype.split2D=function(sep,sep1){return this.split(sep).map(r=>r.split(sep1))}

//each="a:b" repeat="" key="textContent+href=$it:label" pos="parentNode.parentNode" posa="in"
function expandElem(e, opts) {
    let c=fillElemOpts(expandElem.opts,opts,e), willDel=false,
      e0=lets(c.pos,k=>{willDel=true;return qChain(e,k)},e), // 考虑到我们只能父节点尾新child语义不定，暂时不默认在 parent
      eCopy=qChain(e,c.repeat);
    lets(c.data, v=>{e.data=(typeof v==="string")?JSON.parse(v):v;});
    let
      orExpand=s=>evalTepl(s,e).split2D(" ",c.sep), // 能方便写单项
      vs=evalEq(c.each, e, orExpand), k=c.key.split2D(c.sep,"+");
    const // 今天才知道可以用系统自带的escape 不必改split
      setOrEval=(o,k, v)=>{ let kv=k.split("=",2),n1=(kv.length==1); qaChain(o,n1?k:kv[0], n1?v:evalTepl(kv[1], kv[1].indexOf("it.e")==-1? v: Object.assign(v,{eBase:e,e:o,e0,eCopy})) ); },
	  setsProp=(e,v)=>k=>{setOrEval(e,k,v);}/*copy val for k.*/,
      assign=(eDst,v)=>(vs[0] instanceof Array)? k.forEach((r,i)=>{ r.forEach(setsProp(eDst,v[i])) }) : k[0].forEach(setsProp(eDst,v));
    vs.forEach(v=>{ assign(e,v); let e1=eCopy.cloneNode(true); insertElem(e1,c.posa,e0); })
    if(willDel)(c.pos==""?eCopy:e).remove(); else e[k]="";//since orig e modified.
}
expandElem.opts={pos:null,posa:"in", repeat:"", sep:":", data:null, each:null,key:"textContent"};
qsEach("[each]", e=>expandElem(e,void 0));

function procStyleSheet(k_enable,p_style,op) {
	for(let ss of document.styleSheets)if(ss.ownerNode.hasAttribute(k_enable)) {
		for(let r of ss.cssRules) if(r.type==CSSRule.STYLE_RULE&&p_style(r.style)) op(r);
	}
}
mapKey("procStyleSheet",onLoaded);

{
    const sPre="url(\"#", xsr=(new XMLSerializer), url=u=>`url(${u})`;
    const toDataRef=v=>{
        let e = document.getElementById(v.slice(sPre.length,-"\")".length));
        if(e.src) return url(e.src);
		let xml = xsr.serializeToString(e);
		return url("data:image/svg+xml;base64,"+btoa(xml));
	};//NOTE 可以选择 memo 缓存，但性质是后处理，内联svg不便跨页引用，本属hack实际没必要；亦可作 svg/a.svg 简写但适作预处理
	procStyleSheet("bgsvg",c=>{let u;return !!(u=c.backgroundImage)&&u.startsWith(sPre)/*if(!!())只多2字符但会回undef*/}, r=>r.style.mapKey("backgroundImage",toDataRef));
}
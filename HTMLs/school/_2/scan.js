function stream(s){var i=0,n=s.length; return (d)=>{
	let slice=(i0,i1,ld)=>(ld==1)? s[i0] : (ld==0)? new StrPoint(s,i) : s.slice(i0,i1);
	if(d<0){let i0=i; i+=(-d); return slice(i0,i,-d);}
	else return i<n? slice(i,i+d,d) : null;
}}
const
  toks=s=>stream(s.split(" ")),
  newAry=(n,op)=>{let a=Array(n),i=0;for(;i<n;i++)a[i]=op(i);return a},
	readRest=s=>{ let a=new MixedSeq; for(let x;(x=s(1))!==null;){a.p(s(-1));} return a.cat(); },
	typeUnion=(T,T1)=>(T==T1)? T : Object/*not serious*/,
  wrap=(f,f1)=>x=>{let y=f(x); return f1(x,y)||y},
	ext=(T,fns)=>Object.assign(T.prototype, fns)/*(!fns)? res=T.prototype*/,
  div=(a,b)=>Math.floor(a/b);


class MixedSeq {
	constructor(){this.a=[]; this.utype=String;}
	p(item) { this.a.push(item); this.utype=typeUnion(this.utype,item.constructor); }
	cat() { let a=this.a; return (this.utype==String&&a.every(x=>x.length==1))? a.join("") : a;  }
	clear() { this.a.splice(0); }
}
class StrPoint {
	constructor(s,i){this.s=s,this.i=i; this.nVp=5;}
	error(msg){ throw Error(`Parse "${this.s.slice(0,this.nVp)}" fail @${this.i}, "${this.peek}"`) }
	get peek() { let {s,i,nVp}=this; let nV=div(nVp,2); return s.slice((nV>i)?0: i-nV, i)+"^"+s.slice(i,i+nV); }
}

ext(Array, {mapWhile:function(p,op){
	let ys=[];
	for(let x of this) {let y=op(x); if(!p(y))return ys;  ys.push(y)} return ys
}, firstMap:function(p,op){
	for(let x of this){let y=op(x); if(p(y))return y} return null
}
});
ext(Object).takeIf=function(p){return p(this)?this:null}
const /*null means notParsed*/
  pSeq=(...ps)=>s=>ps.mapWhile(r=>r!=null, p=>p(s)).takeIf(rs=> rs.length==ps.length),
  pOne=(...ps)=>s=>ps.firstRes(p=>p(s));
  pMore=(fold,p)=>{ let rs=fold(),r; for(;(r=p(s))!=null;){rs.add(r)} return rs.done() },
  pOpt=(p,k)=>s=>p(s)||k,
  pTakeIf=(test)=>s=>test(s(1))? s(-1) : null,
	pIs=k=>pTakeIf(c=>c==k), pIsnt=k=>pTakeIf(c=>c!=k),
	constant=k=>(_=>k),
	pRE=(sRe,dOk)=>s=>{ dOk=dOk||0;
		let re=(sRe instanceof RegExp)? RegExp("^"+sRe.source,sRe.flags) : RegExp("^"+sRe)/*so no care m.index*/,
				d=1, s0="", m0=null,ml0=0/*detect 2-length inc-stop, we don't known len(of s or m)*/;
		function length(m) {let sum=0; for(let i=1;i<m.length;i++) sum+=(!!m[i])?m[i].length:0;  return sum}
		function finish(skip,m) {
			skip(-(length(m)+dOk)); return [...m].slice(1)/*its groups*/;
		}
		for(;;d+=2) { let sNew=s(d); if(sNew==null||sNew.length==s0.length)return (!!m0)?finish(s,m0):null;  s0=sNew;
			m=re.exec(s0); if(!!m) if(length(m)==ml0) return finish(s,m); else m0=m,ml0=length(m); }
	};

ext(Function).then=function(op1){return x=>op1(this(x))}
jsonP=pToBeDef();
const /*the=theroical*/
  theNumP=pSeq(pOpt(pIs('-'),'+'), pRE(/([1-9]\d*)/), pOpt(pRE(/\.(\d+)/,1),"0"),
						pOpt(pSeq(pRE(/e/i,1), pRE(/([-+]?\d+)/) ),['E',"1"]) ),
	numP=pRE(/(-?[1-9]\d*)(\.\d+)?(e[-+]?\d+)?/i/*int,frac,exp*/).then(parseFloat),
	strP=pMore(),
	objP=pJoin(",", ),
	aryP=pJoin(",", ),
	tokP.val=pOne(
		surr("\"\"").p(strP), surr("{}").p(objP), surr("[]").p(aryP), numP,
		kwPs({"null":null,"true":true,"false":false,"NaN":NaN,"Infinity":Infinity,"-Infinity":-Infinity})
	);

stream=wrap(stream, (s,f)=>{console.log(JSON.stringify(s),`n=${s.length}`); return wrap(f,console.log)})
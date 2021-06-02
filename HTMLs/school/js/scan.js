function stream(s,fold_sloc=null,si0=0){var i=si0,n=s.length; return (d)=>{
	let slice=(i0,i1,ld)=>(ld===1)? s[i0] : s.slice(i0,i1);
	if(d<0){let i0=i; i+=(-d); return slice(i0,i,-d);}
	else return i<n? (d!==0? slice(i,i+d,d) : new StrPoint(s,i)) : null/*EOF*/;
}}
class StrPoint {
	constructor(s,i){this.s=s,this.i=i,this.sloc=null; this.nVp=5;}
	error(msg){ throw Error(`Parse "${this.s.slice(0,this.nVp)}" fail @${this.i}, "${this.peek}"`) }
	get peek() { let {s,i,nVp}=this; let nV=div(nVp,2); return s.slice((nV>i)?0: i-nV, i)+"^"+s.slice(i,i+nV); }
}

const
  toks=s=>stream(s.split(" ")),
  newAry=(n,op)=>{let a=Array(n),i=0;for(;i<n;i++)a[i]=op(i);return a},
  wrap=(f,f1)=>x=>{let y=f(x); return f1(x,y)||y},
	ext=(T,fns)=>Object.assign(T.prototype, fns)/*(!fns)? res=T.prototype*/,
  div=(a,b)=>Math.floor(a/b),
	readRest=s=>{ let a=new MixedSeq; for(let x;(x=s(1))!==null;){a.p(s(-1));} return a.cat(); },
	typeInsect=(T,T1)=>(T==T1)? T : Object/*not serious, common ancestor*/;


class MixedSeq {
	constructor(){this.a=[]; this.utype=String;} //: Union Type is not checked, so utype means unifiedType
	p(item) { this.a.push(item); this.utype=typeInsect(this.utype,item.constructor); }
	cat() { let a=this.a; return (this.utype==String&&a.every(x=>x.length==1))? a.join("") : a;  }
	clear() { this.a.splice(0); }
}

ext(Array, {mapWhile:function(p,op){
	let ys=[];
	for(let x of this) {let y=op(x); if(!p(y))return ys;  ys.push(y)} return ys
}, firstMap:function(p,op){
	for(let x of this){let y=op(x); if(p(y))return y} return null
}
});
ext(Object).takeIf=function(p){return p(this)?this:null}
ext(String).mapFirst=function(op){return this.length==0?this: op(this[0]).concat(this.slice(1))}
function defCtorFun(T) {
	globalThis[T.name.mapFirst(c0=>c0.toLowerCase())]=(...args)=>new T(...args);
}
const /*null means notParsed*/
  isParsed=(r=>r!=null),
  pSeq=(...ps)=>s=>ps.mapWhile(isParsed, p=>p(s)).takeIf(rs=> rs.length==ps.length),
  pOne=(...ps)=>s=>ps.firstMap(isParsed, p=>p(s)),
  pMore=(fold,p)=>{ let rs=fold(),r; for(;(r=p(s))!=null;){rs.add(r)} return rs.done() },
  pOpt=(p,k)=>s=>p(s)||k,
  pTakeIf=(test)=>s=>test(s(1))? s(-1) : null,
	pIs=k=>pTakeIf(c=>c==k), pIsnt=k=>pTakeIf(c=>c!=k),
	constantly=k=>(_=>k), itself=(x=>x)
	pRE=(sRe,dOk)=>s=>{ dOk=dOk||0;
		let re=(sRe instanceof RegExp)? RegExp("^"+sRe.source,sRe.flags) : RegExp("^"+sRe)/*so no care m.index*/,
				d=1, s0="", m0=null,ml0=0/*detect 2-length inc-stop, we don't known len(of s or m)*/;
		function length(m) {let sum=0; for(let i=1;i<m.length;i++) sum+=(!!m[i])?m[i].length:0;  return sum}
		function finish(skip,m) {
			skip(-(length(m)+dOk)); return [...m].slice(1)/*its groups*/;
		}
		for(;;d+=2) { let sNew=s(d); if(sNew==null||sNew.length==s0.length)return (!!m0)?finish(s,m0):null;  s0=sNew;
			m=re.exec(s0); if(!!m) if(length(m)==ml0) return finish(s,m); else m0=m,ml0=length(m); }
	},
	pMap=map=>pTakeIf(x=>map.has(x)).then(x=>map.get(x)),
	pKWs=(kvs)=>s=>{  },
  pDeferred=(make_p)=>{
		let made = null, run=s=>made(s)/*delegate*/;
		run.provide=(p_req)=>{if(!made) made=make_p(p_req||run);}
		return run //just reference its "deferred" delegate.
	},
	pPaired=(sur,p)=>{},
  pJoin=(fold,p_sep,p)=>{},
  comma=(fold,p)=>pJoin(fold,pIs(","),p);

ext(Function).ap=function(...args) {return this.bind(null, args)/*=.bind.call(this,[null]+args)*/ }
class Fold {
	add(x){} done(){}
	reduce(xs){for(let x of xs)this.add(x);  return this.done()}
}
class FoldFrom extends Fold {
	constructor(init,modify) { this._cat=modify; this.acc=init; }
	add(x) { this.acc=this._cat(this.acc,x); }
	done() {return this.acc}
}
class FoldOnto extends Fold {
	constructor(get_init,accept,finish){ this._op=accept,this._done=finish||itself; this.obj=get_init(); }
	add(x) { this._op(this.obj,x); }
	done() {return this._done(this.obj)}
}
const
  asList, asStr,
	asObj = foldOnto.ap(()=>Object.create(null), (o,[k,v])=>{o[k]=v});
{
	let newA=()=>[], push=(a,v)=>a.push(v);
	asList=foldOnto.ap(newA, push), asStr=foldOnto.ap(newA, push, a=>a.join(""));
};

class Surr {
	constructor(s_pair) { this.a=s_pair[0],this.b=s_pair[1]; }
	p(p_inner) {let{a,b}=this; return pPaired([pIs(a),pIs(b)], p_inner)}
}
defCtorFun(Surr);

ext(Function, {
	then:function(op1){return x=>{let y=this(x); return y!==null? op1(y):y}},
	also:function(op){return x=>{op(x); return this(x)}}
});
stream=wrap(stream, (s,f)=>{console.log(JSON.stringify(s),`n=${s.length}`); return wrap(f,console.log)});
const /*the=theroical*/
  theNumP=pSeq(pOpt(pIs('-'),'+'), pRE(/([1-9]\d*)/), pOpt(pRE(/\.(\d+)/,1),"0"),
						pOpt(pSeq(pRE(/e/i,1), pRE(/([-+]?\d+)/) ),['E',"1"]) ),
	numP=pRE(/(-?[1-9]\d*)(\.\d+)?(e[-+]?\d+)?/i/*int,frac,exp*/).then(parseFloat),
	strP=surr("\"\"").p(pMore(asStr, pOne(
		pSeq(pIs("\\"),pMap(escapes)).then(r=>r[1]),
		pTakeIf(constantly(true)) )));
const
	nameP=pKWs({"null":null,"true":true,"false":false,"NaN":NaN,"Infinity":Infinity,"-Infinity":-Infinity}),
	jsonP=pDeferred(self=>pOne(
		strP, numP, nameP,
		surr("{}").p(comma(asObj, Seq(strP,pIs(":"),self).also(r=>{ r.splice(1,1) }) )),
		surr("[]").p(comma(asList, self))
	))();


function stream(s,fold_sloc=null,si0=0){var i=si0,n=s.length; return (d)=>{
	let slice=(i0,i1,one)=>one? s[i0] : s.slice(i0,i1);
	if(d<0){let i0=i; i+=(-d); return slice(i0,i,d==-1);}
	else return i<n? (d!==0? slice(i,i+d,d==1) : new StrPoint(s,i)) : null/*EOF*/;
}}
class StrPoint {
	constructor(s,i){this.s=s,this.i=i,this.sloc=null; this.nVp=5;}
	error(msg){ throw Error(`Parse "${this.s.slice(0,this.nVp)}" fail @${this.i}, "${this.peek}"`) }
	get peek() { let {s,i,nVp}=this; let nV=div(nVp,2); return s.slice((nV>i)?0: i-nV, i)+"^"+s.slice(i,i+nV); }
	get n() {return this.s.length-this.i} // not for real stream
}

const
  toks=s=>stream(s.split(" ")),
  newAry=(n,op)=>{let a=Array(n),i=0;for(;i<n;i++)a[i]=op(i);return a},
  div=(a,b)=>Math.floor(a/b),
  wrap=(f,f1)=>x=>{let y=f(x); return f1(x,y)||y},
  mayPipe=(x,f)=>(typeof f==="function")? f(x) : x,
  ext=(T,fns)=>Object.assign(T.prototype, fns)/*(!fns)? res=T.prototype*/,
	readRest=s=>{ let a=new MixedSeq; for(let x;(x=s(1))!==null;){a.p(s(-1));} return a.cat(); },
	typeInsect=(T,T1)=>(T==T1)? T : Object/*not serious, common ancestor*/,
	runCatching=(op,op_ex)=>{try{return op();}catch(ex){return mayPipe(ex,op_ex);}},
	execRe=(re,s,op)=>{let m=re.exec(s); return (!!m)? op([...m].slice(1)) : m};


class MixedSeq {
	constructor(){this.a=[]; this.utype=String;} //: Union Type is not checked, so utype means unifiedType
	p(item) { this.a.push(item); this.utype=typeInsect(this.utype,item.constructor); }
	cat() { let a=this.a; return (this.utype==String&&a.every(x=>x.length==1))? a.join("") : a;  }
	clear() { this.a.splice(0); }
}

ext(Array, {mapWhile:function(p,op){ // for Seq+One
	let ys=[];
	for(let x of this) {let y=op(x); if(!p(y))return ys;  ys.push(y)} return ys
}, firstMap:function(p,op){
	for(let x of this){let y=op(x); if(p(y))return y} return null
}, zip:function(seconds){return this.map((x,i)=>[x,seconds[i]])}
});
var globalThis=globalThis||window;
ext(Object).takeIf=function(p){return p(this)?this:null}
ext(String).mapFirst=function(op){return this.length==0?this: op(this[0]).concat(this.slice(1))}
function defCtorFun(T) {
	globalThis[T.name.mapFirst(c0=>c0.toLowerCase())]=(...args)=>new T(...args);
}

const /*null means notParsed*/
  isParsed=(r=>r!=null), ap=x=> (p=>p(x)),
  pSeq=(...ps)=>s=>ps.mapWhile(isParsed, ap(s)).takeIf(rs=> rs.length==ps.length),
  pOne=(...ps)=>s=>ps.firstMap(isParsed, ap(s)),
  pMore=(fold,p)=>s=>{ let rs=fold(),r; for(;(r=p(s))!=null;){rs.add(r)} return rs.done() },
  pOpt=(p,k)=>s=>p(s)||k,
  eTakeIf=(test)=>s=>test(s(1))? s(-1) : null, // can support op !|&
	eIs=k=>eTakeIf(c=>c==k), eIsnt=k=>eTakeIf(c=>c!=k),
	eIn=s=>eTakeIf(c=>s.indexOf(c)!=-1),
	eAny=eTakeIf(c=>c!=null),
	constantly=k=>(_=>k), itself=(x=>x),
	poSliced={step:2}, poEOS=(s0,sNew)=>(sNew==null||sNew.length==s0.length),
	pSlicedTry=(op,op_exc_i1=ex=>execRe(/(\d+)/,ex.message,parseInt),re_exc_eof=/(end)|(eof)/i/*no g(mut-pos)!*/)=>s=>{ // end...unexpected-tok
		let d=1, s0="", res0=null, i1=0,  ld=poSliced.step;
		for(;;d+=ld) { let sNew=s(d); if(poEOS(s0,sNew))return res0;  s0=sNew;
			//res0=runCatching(()=>op(s0), ex=>{if(!re_exc_eof.test(ex.message)) i1=op_exc_i1(ex); if(i1==null)throw ex; return res0;})
			try{res0=op(s0);}catch(ex){
				if(!re_exc_eof.test(ex.message)) i1=op_exc_i1(ex);
				if(i1==null)throw ex; if(i1!=0){res0=op(s0.slice(0,i1)); s(-i1); return res0;}
			}
		}
	},
	pRE=(sRe,dOk)=>s=>{ dOk=dOk||0;
		let re=(sRe instanceof RegExp)? RegExp("^"+sRe.source,sRe.flags) : RegExp("^"+sRe)/*so no care m.index*/,
				d=1, s0="", m0=null,ml0=0/*detect 2-length inc-stop, we don't known len(of s or m)*/,  ld=poSliced.step;
		function length(m) {let sum=0; for(let i=1;i<m.length;i++) sum+=(!!m[i])?m[i].length:0;  return sum}
		function finish(skip,m) {
			skip(-(length(m)+dOk)); return [...m].slice(1)/*its groups*/;
		}
		for(;;d+=ld) { let sNew=s(d); if(poEOS(s0,sNew))return (!!m0)?finish(s,m0):null;  s0=sNew;
			m=re.exec(s0); if(!!m) if(length(m)==ml0) return finish(s,m); else m0=m,ml0=length(m); }
	},
	eMap=map=>eTakeIf(x=>map.has(x)).then(x=>map.get(x)),
    pDeferred=(make_p)=>{
	  let made = null, run=s=>made(s)/*delegate*/;
	  run.provide=(p_req)=>{if(!made) made=make_p(p_req||run); return made};
	  return run; //just reference its "deferred" delegate.
	},
	pKWs=(o)=>(kvs=> s=>{
		for(let [k,v] of kvs) if(s(k.length)==k){s(-k.length);return v;}
	})(Object.entries(o)),
	pPaired=(sur,p)=>s=>{
		if(!isParsed(sur.a(s)))return null;
		let r=p(s);
		if(!isParsed(sur.b(s)))return null;
		return r;
	},
  pJoin=(fold,p_sep,p)=>s=>{
  	let r1=p(s), rs=fold();
	if(!isParsed(r1))return null;
  	rs.add(r1);
  	for(; isParsed(p_sep(s));) rs.add(p(s));
  	return rs.done();
  },
  comma=(fold,p)=>pJoin(fold,eIs(","),p),
  pSeq1=(prefix,p)=>pSeq(eIs(prefix),p).then(r=>r[1]),
  zipSplit=(sep,a,b)=>a.split(sep).zip(b.split(sep)),
  run=(p,ins,sep)=>(!!sep)? ins.split(sep).map((s,i)=>{let r=p(stream(s));console.log(i,s,r);return r}) : p(stream(ins));

ext(Function).ap=function(...args) {return this.bind(null, ...args)/*=.bind.call(this,[null]+args)*/ }
class Fold {
	add(x){} done(){}
	reduce(xs){for(let x of xs)this.add(x);  return this.done()}
}
class FoldFrom extends Fold {
	constructor(init,modify) { super();this._cat=modify; this.acc=init; }
	add(x) { this.acc=this._cat(this.acc,x); }
	done() {return this.acc}
}
class FoldOnto extends Fold {
	constructor(get_init,accept,finish){ super();this._op=accept,this._done=finish||itself; this.obj=get_init(); }
	add(x) { this._op(this.obj,x); }
	done() {return this._done(this.obj)}
}
[FoldFrom,FoldOnto].forEach(defCtorFun);
const [asList, asStr, asObj] = (function foldFuncs(){
	let newA=()=>[], push=(a,v)=>a.push(v);
	return [foldOnto.ap(newA, push), foldOnto.ap(newA, push, a=>a.join("")), foldOnto.ap(()=>Object.create(null), (o,[k,v])=>{o[k]=v})];
})();

class Surr {
	constructor(s_pair) { if(typeof s_pair==="string")s_pair=[...s_pair].map(eIs); this.a=s_pair[0],this.b=s_pair[1];}
	p(p_inner) {return pPaired(this, p_inner)}
}
defCtorFun(Surr);

ext(Function, {
	then:function(op1){return x=>{let y=this(x); return y!==null? op1(y):y}},
	also:function(op){return x=>{let y=this(x); if(y!==null)op(y); return y}}
});
stream=wrap(stream, (s,f)=>{console.log(JSON.stringify(s),`n=${s.length}`); return wrap(f,console.log)});
const /*the=theroical*/
  theNumP=pSeq(pOpt(eIn("-+"),'+'), pRE(/([1-9]\d*)/), pOpt(pRE(/\.(\d+)/,1),"0"),
						pOpt(pSeq(pRE(/e/i,1), pRE(/([-+]?\d+)/) ),['E',"1"]) ),
	escapes=new Map(zipSplit("","tnrvf\"","\t\n\r\v\f\"")),
	numP=pRE(/(-?[1-9]\d*)(\.\d+)?(e[-+]?\d+)?/i/*int,frac,exp*/).then(_3=>_3.join("")).then(parseFloat),
	strP=surr("\"\"").p(pMore(asStr, pOne(
		pSeq1("\\",pOne(
		  eMap(escapes),
		  pSeq1("u", s=>String.fromCodePoint(parseInt(s(-4),16)))
		)),
		eIsnt("\"")/*not eAny || eTakeIf(constantly(true))*/) ));
const
	nameP=pKWs({"null":null,"true":true,"false":false,"NaN":NaN,"Infinity":Infinity,"-Infinity":-Infinity}),
	jsonP=pDeferred(self=>pOne(
		strP, numP, nameP,
		surr("{}").p(comma(asObj, pSeq(strP,eIs(":"),self).also(r=>{ r.splice(1,1)/*:*/ }) )),
		surr("[]").p(comma(asList, self))
	)).provide(),
	ptJson=pSlicedTry(JSON.parse);

function* pairsAry(kvs) {
	let n=kvs.length; if(n%2!=0) throw Error("odd len", kvs);
	for(let i=0; i<kvs.length; i+=2) yield [kvs[i],kvs[i+1]]
}
function expecting(...ios) {
	let parse;
	for(let [k,v] of pairsAry(ios)) if (typeof k==="function") {
		parse=k;
		console.log("== "+v);
	}
	else {
		let r=runCatching(()=>parse(stream(k)), ex=>ex.message)
		console.log(k,r); if(r!=v)console.log(r,"!=",v);
	}
}

let examNums=[
"123",123,
"+123.32",123.32,
"-666e+88",-666e+88];
expecting(
	theNumP, "numP0",
	...examNums,
	numP, "numP",
	...examNums,
	strP, "string",
	String.raw`"hello\nworld\"x"`, "hello\nworld\"x",
	String.raw`"yu \u1fdb\r"`, "yu \u1fdb\r", //newAry(1000,i=>String.fromCodePoint(0x1c00+i)); (0x1c00+987).toString(16)
	nameP, "keywords",
	"true ", true,
	jsonP, "json",
	"[[1]]",[[1]],
	"[[1.0,false]]", [[1.0,false]],
	String.raw`{"hello":NaN}`, {"hello":NaN},
	ptJson, "sliced JSON",
	"  true", true,
	"false1",false,
)

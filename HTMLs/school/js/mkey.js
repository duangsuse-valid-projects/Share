const chkType=K=>o=>(typeof o===K),
  isStr=chkType(`string`),
  ss=s=>!isStr(s)?s : s.split(" "), n=o=>o.length,
  [isSym,isObj,isNon,isFunc]=ss(`symbol object undefined function`).map(chkType),
  argNames=f=>/\s*,\s*/[Symbol.split]( /\(?(.*?)\)?\s*=>/.exec(f)[1].trim() )

function* interleave(rs){ let i=0,n=rs.length; while(n!=0) { let x=next(rs[i]); if(isNon(x)){rs.splice(i,1);n--} else yield x;  i=(i+1)%n } }
const next=g=>g.next().value,
  nextN=(n,g)=>{
    if(!isStrm(g))throw g;  if(!g.next)g=g();
    let inf=!isFinite(n), a=inf? [] : Array(n), i=0,r;
    if(inf)while(true){r=next(g); if(isNon(r))break; a.push(r);}
    else for(;i<n;i++)if(isNon(a[i]=next(g))){a.splice(i,n-i); break;}  return a // type-check&lazy stream
  },
  isStrm=o=>o.next||isFunc(o),
  map2D=(op,a)=>a.map(r=>r.map(op)),

  useEquiv=([f,back], get_op)=>(r=>!r.n_st1? r.vals.map(back) : map2D(back,r.vals) )(st.go(get_op(f), equ.nGo))
{
  const
    plist=([x,...xs])=>!x? null : [x,plist(xs)],
    listp=p=>(p===null)?[] : [p[0], ...listp(p[1])]
  equ= {list:[plist,listp], peano:[n=>plist(Array(n).fill(1)), p=>n(listp(p))]} // pairlist&peano==[] equivalence, since we dont support [x,...xs] relation
}

/** Home for substitution vars and goals, use [go] with eq(a,b) to introduce value, use get to deep-[grab] found value from symset */
class State{
  constructor(d=new Map){this.d=d} copy(){return new State(new Map(this.d))}
  toString(){
    let {eqSym:[_,desc], toS_sep:[sp0,sp1]}=State.cfg;
    return "{"+[...this.d.entries()].map(([k,v])=> desc(k)+((v==null)?"": isSym(v)? ("="+desc(v)) : sp1+this.get(v)) ).join(sp0)+"}"
  }

  // fork,unify:eq, get:grab; vars, go Iter: puts
  fork(k,v){let s1=this.copy(); s1.d.set(k,v); return s1} // only 1 Map required, just for name-dup. Sym are unique.
  unify(a,b){
    let s0=this, s1=null; //v NOTE famous unification single-step proc.
    a=s0.get(a), b=s0.get(b);
    let {canUnify,isEq, cfg:{isSym,keys}}=State;

    if(canUnify(a,b)) return keys(a).reduce((st, k)=>!st?null: st.unify(a[k], b[k]), s0); // extract vars on datatypes, grab() will merge them onfinish.
    if(isEq(a,b))s1=s0; //makeEq ab: vv(eq or null) rv&rr vr
    else if(isSym(a))s1=s0.fork(a,b); else if(isSym(b))s1=s0.fork(b,a);
    return s1;
  }
  get(v){
    let {grab,cfg:{undef}}=State;
    let r=this.d.get(v); return (r!==undef)? grab(this,r)||r : grab(this,v)||v // null is value.
  }

  vars(ks){let {eqSym:[sym,_],undef}=State.cfg; return ks.map(k=>{ let v=sym(k); this.d.set(v,undef); return v})} // look, v and "v alue". k is just Symbol tag
  goIter(f){return f(...this.vars(argNames(f)))(this)}
  go(goal_ctx,n_st1=null){
    State.cfg.onRun(this);
    let vs=this.vars(argNames(goal_ctx)); let rs=goal_ctx(...vs)(this);
    let st=!n_st1? next(rs)||null : nextN(n_st1,rs),  tr=st=>vs.map(v=>st.get(v)); // TODO add .next(n=nSt)
    return Object.assign(st, {vs, n_st1, get vals(){return !n_st1? (!st?st: tr(st)) : st.map(s=>tr(s)) }  })
  }
  static cfg={
    onRun(st){st.d.clear()},
    eqSym:[Symbol, o=>o.description], isSym,
    keys:Object.keys,
    undef: undefined,
    toS_sep:[", ",":"]
  }
  static deepEq=(a,b)=>{
    let {isEq,cfg}=State;
    if(a instanceof Array){ if(n(a)!=n(b))return false; for(let i=0,N=n(a);i<N;i++)if(!isEq(a[i], b[i]))return false; }
    else{
      for(let k of new Set([a,b].flatMap(cfg.keys))) { if(!isEq(a[k],b[k]))return false; }
    }
    return true;
  }
  static deepCopy=(s0,o)=>{
    let o1;
    if(o instanceof Array){ o1=Array(n(o)); for(let i=0,N=n(o1);i<N;i++)o1[i]=s0.get(o[i]); }
    else{ o1=Object.create(o.__proto__); State.cfg.keys(o).forEach(k=>{ o1[k]=s0.get(o[k]); }) }
    return o1
  }
  static canUnify(a,b){return false} // can/is: used in unification
  static isEq(a,b){return a===b}
  static grab(s0,v){return v}
}
st=new State
const go={
  eq:(a,b)=>s=>{let s1=s.unify(a,b); return (!s1?[]:[s1]).values()}, // NOTE =|& and |x,xs|{} basic four
  puts:f=>s=>s.goIter(f),

  one:(...gs)=>s=>interleave(gs.map(g=>g(s))), //<v fork/merge-ing
  all:(g,...gs)=>s=>gs.reduce((ss,g)=>(
    interleave( nextN(Infinity,ss).flatMap(s1=>g(s1)) )
  ), g(s))
}

if(`support product type like [a,b]`)Object.assign(State, {
  canUnify(a,b){
    const isO=v=>isObj(v)&&v!==null, isA=o=>!!n(o), po=o=>o.__proto__;
    return isO(a)&&isO(b)&&(
      isA(a)&&isA(b)? n(a)==n(b) :
      po(a)==po(b))
  },
  isEq(a,b){
    return (State.canUnify(a,b)&&State.deepEq(a,b)) ||a===b
  },
  grab(s0,v){
    let {keys}=State.cfg; //v NOTE pull a=b,b=c,a=c keeping last(see in toS), and unify() should know
    if(isSym(v)){let d=s0.d,v1=d.get(v); v1=State.grab(s0,v1)||v1; d.set(v,v1); return v1}
    return !State.canUnify(v,v)?null : State.deepCopy(s0,v);
  }
})
class GroupCnt extends Map {
  inc(k) {let i=this.get(k)||0; this.set(k,i+1); return i}
  incZ(v_0,k) { let v=this.inc(k); return v==0? v_0:v}
}
if(`number duplicate names`){
  State.nameDup=new GroupCnt;
  State.cfg.eqSym[0]=k=>Symbol(k+State.nameDup.incZ("",k));
  State.cfg.onRun=st=>{st.d.clear(); State.nameDup.clear();}
}


lg=(...a)=>console.log(...isFunc(a[0])? a.map(a.shift()) : a, ...a.map(String))

test=0
if(test)lg(argNames,
  (  a => x ),
  (a,b)=>{a},
  ( (f)=>{f()} ),
  ()=>{}
)
if(test)lg(a=>nextN(10, interleave(a.map(r=>r.values()))),
  [[1,5,6], ss("a b c")],
  [[9,8,6,7], ss("甲 乙 丙")],
  [ ss("甲 乙 丙"), [9,8,6,7]]
)
if(test)with(State){
   lg(Number,canUnify([1],[2]),
   canUnify([1],[2,5]),
   deepEq([1],[1]),
   isEq([1],[2]),
   isEq([1],[2,5]),
   deepEq({name:"dse",boy:true}, {boy:true,name:"dse"}),
   deepEq({name:"dse",boy:true}, {boy:false,name:"sed"}),
   deepEq({a:true}, {}), 10100100)
}
{
  let {eq,all}=go;
  lg(
    st.go((a,b,c)=>all(eq(a,1), eq(b,2), eq(c,3))),
     st.go((a,b,c)=>all(eq(a,1), eq(b,2), eq(c,a)))
  )
  lg(
    st.go((a,b,c)=>all(eq(a,b), eq(b,c), eq(c,"good"))),
     st.go((a,b,c)=>all(eq("good",a), eq(b,c), eq(c,"good")))
  )
}
{
  let {eq,one,all,puts}=go;
  lg(
    st.go(x=>one(eq(x,1),eq(x,2)),2),
    st.go((x,y,z)=>all(eq(x,5), eq(z,9), eq(y,1), eq(z,9)))
  )
  lg(
    st.go((x,y)=>eq([3,x], [y, [5,y]]) ),
    st.go((a,b,c)=>eq([3,b,2], [3,9,c]) ),
    st.go((x,y)=>eq({name:"dse",boy:x}, {boy:true,name:y}) ),
    st.go((x,y)=>all(eq({boy:true,name:y}, {name:"dse",boy:x}), eq(y,"dse")) ),
    st.go((x,y)=>puts((x1,y1)=>one(all(eq(y1,y),eq(x,x1)), eq(x,0) ) ), 2)
  )
}

const // fuzzy parsing, short, sorry. no stream/stmt separating parse so mainly for REPL/inline
  pairedIdx=([a,b],s,i=0)=>{let N=n(s), nA=0; for(;i<N;i++)if(0== ((s[i]==a)?++nA : (s[i]==b)?--nA : 1))return i;},
  parens=ss("( )"),braces=ss("{ }"),
  subPaired=(pr,re,d_m0,op)=>s=>{
    let s1=[...s]; // ->() to puts()
    for(let {index:i, [1]:sArg, [0]:m0} of re[Symbol.matchAll](s)) {
      let i1=pairedIdx(pr, s,i+d_m0); if(!i1)throw s;
      let sIn=s1.slice(i+n(m0), i1);
      s1.splice(i, i1-i +1, ...op(sArg,sIn.join("")));
    }
    return s1.join("")
  },
  nosplitIf=(re,s, p_ab)=>{
    let a=re[Symbol.split](s), n=a.length;
    if(n<2)return a; //v detect single & char, vp:3  x/x1,i-1
    for(let x,x1="",i=n-1; i>=0; i--){ x=a[i]; if(p_ab(a[i-1], x,x1)){
      a[i-1]=a[i-1]+x+x1; a.splice(i,2) }; x1=x }
    return a
  },

  opChain=(x,o,lev)=>{
    let aTop=[0,], oR;//rec
    const only=(o0,a)=>{ //v for b|a=1&x depth:1,3,2
      let v,o1, l=lev,  iArg, _p=()=>{v=x(); if(!v)throw[o0,a,aTop,oR]; iArg=a.push(v);}
      _p();
      let l0=l(o0), l1;
      while ((o1=o())) { l1=l(o1);
        if(l0>l1) return(o1); else// b<a means b tops/forks a
        if(l0<l1 ||o1!=o0) {
          a1=[o1,a.pop()];a.push(a1); oR=only(o1,a1);  if(oR){
          if(Math.abs(l0-l1)>1 && l0<l1&&l(oR)<l1 ||o0==0)  { //won't find & layer: o_01R |=& 1,3,2
            let grab=a.splice(iArg-1,1)[0]; a1=[oR,grab];a.push(a1);a=a1; //v*2: try create &replace layer
          } else if(l0>=l(oR)) {
            a.unshift(oR, a.splice(0,n(a))); // as-parent [oR, orig, ...arg]
          }
          else return oR;   o0=oR,l0=l(o0); _p();}
        } else _p();//same.
      }
      return null; // done, not fall-rewrite
    }
    only(0,aTop); return aTop
  },
  readOptab=(d,ss)=>{
    let op=p=>()=>{let v=ss.next().value; return (v in d)==p? v:null; }, res=opChain(op(false), op(true), o=>d[o][0]),
    run=(t=res, walk=(ko,arg,d)=>{let o=d[ko][1]; return n(o)==0? o(arg) : arg.reduce(o)})=>walk(t[0], t.slice(1).map(tt=> (tt instanceof Array)? run(tt,walk) : tt), d);
    return Object.assign(res, {run})
  },

  goal=s=>{
    //goal= {(Args)(a1) body}=(...a)=>body
    //->(Args){body} = puts((...a)=>body)
    // in eval UI, ()body can denote ->() // NOTE nope, use Proxy ,dynamic get free-vars: with(new Proxy({},{get:console.log,has:(o,k)=>k!="eval"})){eval("x")}
    const
      expr=s=>goExpr(puts(s)).run(),
      puts=subPaired(braces, /->\(([\w\s,]*?)\)\s*{/, n("->"), (sa,code)=>`puts((${ss(sa).join()})=> ${expr(code)})` ), // inner fst.
      gos=s=>{if(s[0]!='(') return s;
        let i1=pairedIdx(parens,s), r=gos(s.slice(i1+1)); return [ss(s.slice(1,i1)), isObj(r)? `(${r[0].join()})=>${expr(r[1])}`: expr(r)];
      };
      let r=gos(s);
      if(isObj(r)){
        let [argv,code]=r; argv.unshift(`{${Object.keys(go).join()}}`);
        let gofn=Function(argv.join(), "return "+code), rec=(...a)=>gofn.call(rec,go,...a); argv.shift();
        return Object.assign(rec, {code: String(gofn), src: s, args: argv}) //gofn. bind() no supp. currying
      } else with(go){return eval(r)}
  },
  scall=(name,dup="")=>(a,b)=>`${name}(${a.startsWith(name)? dup+a.slice(n(name)):a}, ${b})`,
  goExpr=(s,optab={ //^ yes, due to eval order, opChain not always flat. but rel semantic has no "ordering". offen 1st arg same-op
    ["="]:[5, scall("eq")],
    ["&"]:[4, scall("all", "...inn")],
    ["|"]:[3, scall("one", "...inn")],
    [0]:[0,a=>a[0]]
  })=>readOptab(optab, nosplitIf(/([=&|])(?!\1)/g, s, (xLast,o,x1)=>o in optab&&(xLast.endsWith(o) ||o=='='&&x1.startsWith(">") )).values());
globalThis.inn=(...a)=>a;

propCall=(c,o={})=>new Proxy(o, isObj(c)?c : {get:(_,k)=>(...a)=>c(k)(...a)}),
kSet=o=>propCall(k=>get_v1=>{if(o[k])o[k]=get_v1(o[k])}),
prop=o=>propCall({set:(o,sp,v)=>{ //kw:Meta
  let m=/([gs]et)_([^_]+)(_[Crev]*)?/.exec(sp), c={}; if(!m)return (o[sp]=v);
  let [_, mod,k,flg]=m;
  const fs=ss("configurable readonly enumerable value"); // get_k_v=1; set_k_v=[get|v0, set]; set_k=(v0,v)=>v; prop(doc).location/qs
  if(flg)for(let fl of flg.slice(1)){let i="Crev".indexOf(fl); c[fs[i]]=i<2? false:true}
  let v0, isF=isObj(v)&&isFunc(v[1]); //console.log(c,isF,flg,v)
  if(c.value) if(isF){c[mod]=v[1]; isFunc(v[0])?(c.get=v[0]):(v0=v[0]); delete c.value} else c.value=v; else { c[mod]=v; isF=true; }
  if(isF) { kSet(c).get(g=>()=>g(v0)); kSet(c).set(g=>(v)=>{v0=g(v0,v)}) }
  return Object.defineProperty(o,k, c)
}, get:(o,k)=>isFunc(o[k])?o[k].bind(o):o[k]}, o),
logs=op=>(...a)=>{let r=op(...a); console.log(r,...a); return r}

{
  let join=goal(`(a b s) b=s&a=null | ->(x,ra,rs){ a=[x,ra]&s=[x,rs]&this(ra,b,rs) }`), add,times,  goes=op=>op() // don't =r on returned
  lg("compiled", join)
  lg(
    st.go(x=>join(null,[1,null],x)),
    useEquiv(equ.list, f=>x=>join(f("he"),f("llo"), x ))
  )
  prop(equ).get_nGo_v=[10, (v)=>(/\bgo.*s\s/.test(Error().stack))? v:null];
  goL=go=>useEquiv(equ.list, go);
  goN=go=>useEquiv(equ.peano, go);
  lg(
    goL(f=>x=>join(x,f("llo"), f("hello") )),
    goes(()=>goL(f=>(a,b)=>join(a,b,f("hello"))) )
  )
  lg(
    goN(f=>x=>join(f(5),f(2),x)),
    goN(f=>x=>join(x,f(2),f(5))),
    goes(()=>goN(f=>(a,b)=>join(a,b,f(8))) )
  )
  add=goal(`(b a c) a=null&b=c | ->(ra rc){ a=[1,ra]&c=[1,rc]&this(b,ra,rc) }`); go.add=add;
  times=goal(`(b a c) a=null&c=null | ->(ra rc){ a=[1,ra]&add(rc,b,c)&this(b,ra,rc) }`);
  lg(
    goN(f=>x=>add(f(2),f(5),x)),
    goN(f=>x=>times(f(2),f(5),x)),
    goN(f=>a=>times(a,f(2),f(10)))
  )
}

/*
那么，mkey 将会单开项目，继续开发；内部及语言 API 的测试将被抽离。
我发现了 opChain 的更易算法 逆波兰，语言上亦有小偏差，比如 {(a) a} 和 {x+1=2} 成为唯一形式，完全成为 JS mk.load 子语言，语句划分都不做
之前的计划 :someGoal(a) end 和 ;; 切分显得比较幼稚，我相信子语言对 JS 侧更友好，也期待未来几天能学到更多关于相等关系的程序。

作为重中之重的 UI ，我希望 横(历史(可展开表格), 竖(编辑器,输入框)) ；移动端则 历史,输入框,编辑器 ，编辑器能有示例

Monkey.js 是最近的我唯一能在对编程的认识上和 OI,Math/SMach/Phys 大佬站在同层次的展示性项目，也是我从编程或函数式以来的梦想、里程碑
尽管大头是重写，我会努力让它能被人喜欢，认识到非 app/game 开发者并不低能；它含 DOM UI 会混合物理命名法与 el() 写在仅二 ES6 文件内。

mk.op["+"]=infixL(9, symVers((a,a1)=>, (n,n1)=> )) 自定义运算符会令 {a+b=10 ;; "he"+x="hello"} 的直白表达成为可能，甚至能 let{x}=mk(`x+1=10+1`); mk(x=>x+1*5==num, _=>y) 做到真正的内联关系式求解，这会是有利的，也显示了物理命名的用途(拿bound变量名)。
未来 unify() 有机会支持所有 ES6 destruct ，类似 [a,...b] 前缀我想接口为 [a,rA] 即 [a,goP.rest(a)] 的「变量位置属性」的代码形式影响归一化算法
它还将支持 a+1*2 == rel(+,rel(*,1,2),var.a) 的可逆关系 unify(5,it) ，peano 只成为入门示例
*/

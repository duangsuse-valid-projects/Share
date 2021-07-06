const
  chkType=s=>(o=>typeof o===s), isStr=chkType("string"),
  ss=s=>!isStr(s)?s.map(String): s.split(" "), n=o=>o.length,
  onCopy=(o,op)=>{let o1=o.copy(); op(o1); return o1},
  lets=(x,op)=>(x==null)?x: op(x),

  Sym=Symbol, symDesc=o=>o.description,
  argNames=f=>n(f)!=1? _ssParen(f) : lets(/^\s*(\w+)\s*=>\s*{?/.exec(f), m=>addM_i1(m,[m[1]]))||_ssParen(f),
  _ssParen=f=>lets(/\(\s*(.*?)\)\s*=?>?\s*{?/.exec(f), m=>addM_i1(m,/\s*,/[Sym.split](m[1]))),
  addM_i1=(m,o)=>Object.assign(o,{i1:m.index+n(m[0])})
const [isSym, isObj, isNon, isNum, isFunc]=ss("symbol object undefined number function").map(chkType)

lgs=[/.*/],lg=(s,...a)=>!lgs.some(r=>r.test(s))?0: console.log(s, ...isFunc(a[0])? a.map(a.shift()) : a); // 副作用

class Group extends Map {
  add(k,v){let a=this.get(k); if(!a){a=[];this.set(k,a)} a.push(v); return a}  each(k,op){let a=this.get(k);if(!!a)a.forEach(op)}
  inc(k) {let i=this.get(k)||0; this.set(k,i+1); return i}
  incZ(v_0,k) { let v=this.inc(k); return v==0? v_0:v}
} // 辅助名编号

// 正片 不可变数据结构 State(puts,unify,get; vars,of)
class State {
  constructor(d=new Map){this.d=d} copy(){return new State(new Map(this.d))}
  toString(sp0=", ",sp1=":"){
    return "{"+[...this.d.entries()].map(([k,v])=> symDesc(k)+((v==null)?"": isSym(v)? "="+symDesc(v) : sp1+this.get(v)) ).join(sp0)+"}"
  }

  puts(k,v){return onCopy(this, s1=>{s1.d.set(k,v);})}
  unify(a,b){
    let s0=this, s1=null;
    a=s0.get(a), b=s0.get(b);

    if(State.canUnify(a,b)) {
      return State.keys(a).reduce((st, k)=>!st?null: st.unify(a[k], b[k]), s0);
    }
    if(State.isEq(a,b))s1=s0; //makeEq ab: vv(eq or null) rv&rr vr ; NOTE sym1 != other
    else if(isSym(a))s1=s0.puts(a,b); else if(isSym(b))s1=s0.puts(b,a);
    return s1;
  }
  get(v){let r=this.d.get(v); return !isNon(r)?State.deref(this,r)||r: State.deref(this,v)||v} // NOTE undef cannot be val. val could be null

  vars(names,vs){return onCopy(this,s1=>{
    ss(names).forEach((k,i)=>{let v=vs[i]; vs[i]=Sym(k+State.nameDup.incZ("",k)); s1.d.set(vs[i], v);})
  })}
  of(goal_ctx,n_st1=null){
    State.nameDup.clear();
    let [rs,vs]=this.ofSeq(goal_ctx); let st=!n_st1? next(rs)||null : nextN(n_st1,rs);
    return Object.assign(st, {vs, get vals(){return !n_st1? (!st?st: vs.map(v=>st.get(v))) : st.map(s=>vs.map(v=>s.get(v)))  }} )
  }
  ofSeq(g){
    let ks=argNames(g), vs=Array(ks.length), s1=this.vars(ks,vs); return [g(...vs)(s1), vs]
  }

  static canUnify=(a,b)=>{
    const isO=v=>isObj(v)&&v!==null, isA=o=>!!n(o), po=o=>o.__proto__;
    return isO(a)&&isO(b)&&(
      isA(a)&&isA(b)? n(a)==n(b) :
      po(a)==po(b)
    )
  }
  static deref=(s0,v)=>{
    if(!State.canUnify(v,v))return null; // no for sym
    let o;
    if(v instanceof Array){ o=Array(n(v)); for(let i=0,n=o.length;i<n;i++)o[i]=s0.get(v[i]); }
    else{ o=Object.create(v.__proto__); State.keys(v).forEach(k=>{ o[k]=s0.get(v[k]); }) }
    return o
  }
  static isEq(a,b){
    if(State.canUnify(a,b))if(State.deepEq(a,b))return true;
    return a===b
  }
  static deepEq=(a,b)=>{
    if(!State.canUnify(a,b))return false;
    if(a instanceof Array){ if(n(a)!=n(b))return false; for(let i=0,n=a.length;i<n;i++)if(!State.isEq(a[i], b[i]))return false; }
    else{
      for(let k of new Set([a,b].flatMap(State.keys))) { if(!State.isEq(a[k],b[k]))return false; }
    }
    return true;
  }
  static keys(o){return Object.keys(o)}
  static nameDup=new Group;
}
st=new State;

const
  next=g=>g.next().value, values=(...a)=>a.values(), iter=(arg,s)=>eval(`(function*(${ss(arg).join()}){${s.replaceAll("got(","yield(")}})`),
  nextN=(n,g)=>{
    if(!g.next)g=g(); let inf=!isFinite(n), a=inf? [] : Array(n), i=0,r;
    if(inf)while(true){r=next(g); if(isNon(r))break; a.push(r);}
    else for(;i<n;i++)if(isNon(a[i]=next(g))){a.splice(i,n-i); break;}  return a
  },
  isStrm=o=>o.next||isFunc(o),

  interleave=iter(`xs i=0`, `while(n(xs)!=0) { let r=next(xs[i]); if(isNon(r))xs.shift(); else got(r);  i=(i+1)%n(xs); }`), //^ 这次不会要直接的 Iterator 也不隐式元编程
  _rng=iter(`fst last step=1`, `for(let i=fst;i<last;i+=step)got(i)`),
  map=iter(`op xs`, `for(let x of xs)got(op(x))`),
  rng=(...a)=>isNum(a[0])? _rng(...a) : map(String.fromCodePoint, _rng(...a.slice(0,2).map(s=>s.codePointAt(0)), a[2]) )

lg("函数签名元信息", argNames,
   (  a => x ),
   ( (f)=>{f()} ),
   function() { x},
   ()=>{},
   (a,b)=>{a},
   (a,b)=>b,
   (function(  a , b , c ){}), (x)=>{}, x=> {}
)
lg("基本惰性流",
   nextN(5,rng(1,10)),
   [...interleave([rng(0,10),rng('a','z')]) ],
   nextN(Infinity, rng(0,9)),
   nextN(10, rng(0,5))
)
vs=[1,2,3]; stA=st.vars("a b c",vs);
{
  let [a,b,c]=vs;
  lg("基本State",
    a, String(stA), //toString
    a==a, a==b, a==Sym("a")
  )
  let s1=stA.puts(c, "三"); 
  s1.d.set(a,b); s1.d.set(b,c); //a=b,b=c,c=三
  lg("待unify",
    String(s1), s1.get(a), s1.get(7) // mkey 里没了哈哈
  )
}
// 用 goal 表达会清晰很多, s=st=state
const go={
  eq:(a,b)=>s=>{let s1=s.unify(a,b); return !s1?values() : values(s1)},
  puts:f=>s=>s.ofSeq(f)[0], //v 副作用小王子行为……
  say:(...gs)=>s0=>{let s,s1s;gs.forEach(g=>{s=g(s0); console.log(String(s0), ...!isStrm(s)? [s,"not st"] : [ss(s1s=nextN(Infinity,s)), g] );}); return s1s.values()},
  
  one:(...gs)=>s=>interleave(gs.map(g=>g(s))),
  all:(g,...gs)=>s=>gs.reduce((s0,g)=>{
    return interleave( nextN(Infinity,s0).flatMap(s1=>g(s1)) )
  }, g(s))
}
{
  //let vs=[,], s1=st.vars("x y", vs),s2; let [x,y]=vs
  const{eq,say,one,all}=go;
  let y_,x_, s1=st.of((x,y)=> say(eq(x,x), eq(y,x), s=>{x_=x,y_=y; return s.get(x)}, eq(y,y)));
  s2=s1.unify(y_,6);
  lg("unify",String,
    st.of((x,y)=>eq(x,y)),
    s1.unify(5,x_), s2.unify(x_,5), s2.unify(y_,2), `注意末2 y=6,x=5 和 y=2=6 有内味了` // 如果 xy 是某 pair 上的呢？
  )
  lg("unify one/all",String,
    st.of(x=>one(eq(x,1),say(eq(x,2))),2), `两个 state 被 unify:puts 给 fork 出来了`,
    st.of((x,y,z)=>all(eq(x,5), say(eq(z,9), eq(y,1)), eq(z,9))), `其二在其一的基础上合并`
  )
}
lg("unify pairs",String,
  st.of((x,y)=>go.eq([3,x], [y, [5,y]]) ),
  st.of((a,b,c)=>go.eq([3,b,2], [3,9,c]) ),
  st.of((x,y)=>go.eq({name:"dse",boy:x}, {boy:true,name:y}) ), `只要是 product type 积类型都支持，不止 [a,b] 或 [...xs]`
  //^ 所以就不必引入 linked-list pairs 和 peano num 的等价关系了
)
lg("unify/get/eq",
   State.canUnify([1],[2]),
   State.canUnify([1],[2,5]),
   State.deepEq([1],[1]),
   State.isEq([1],[2]),
   State.isEq([1],[2,5]),
   State.deepEq({name:"dse",boy:true}, {boy:true,name:"dse"}),
   State.deepEq({name:"dse",boy:true}, {boy:false,name:"sed"}),
   State.deepEq({a:true}, {})
)
eqLList=(T)=>{ let recA, recB;
  return [(recA=([x,...xs])=>!x?null:T(x,recA(xs))), (recB=(x)=>(x===null)?[]:[x[0],...recB(x[1])]) ]
}, eqPair=eqLList((a,b)=>[a,b], a=>a[0], a=>a[1]), eqNum=[n=>eqPair[0](Array(n).fill(1)), p=>n(eqPair[1](p))], logs=f=>(...a)=>st=>{console.log(...a.map(v=>st.get(v))); return f(...a)(st)};
{
  // 关系式编程！
  const {eq,one,all,puts}=go;
  join=logs((a,b, s)=>one(
    all(eq(b,s),eq(a,null)),
    puts((x,ra,rs)=>all(
      eq(a,[x,ra]), eq(s,[x,rs]),
      join(ra,b,rs) //递归目标是把 a 移到 b=s
    ))
  ));
  let r1, s=eqPair[0], nu=eqNum[0];
  lg("关系式编程 join(a,b s)",
      (r1=st.of(x=>join(s("he"),s("l"), x ))),
     eqPair[1](r1.vals[0])
  )
  lg("_2",
     st.of(x=>join(x,s("llo"), s("hello") ))
  )
  lg("_3 unification 比反函数有趣处",
     (r1=st.of((a,b)=>join(a,b, s("hello") ), 6)),
     r1.vals.map(r=>r.map(eqPair[1]))
  )
  lg("Peano nums",
     (r1=st.of(x=>join(nu(5),nu(3), x ))),
     eqNum[1](r1.vals[0]),
      (r1=st.of((a,b)=>join(a,b,nu(8)), 9)),
     r1.vals.map(r=>r.map(eqNum[1]))
  )

  // 最后一件事。
  let _0=null
  add=(b, a,c)=>one(
    all(eq(a,_0), eq(b,c)),
    puts((ra,rc)=>all(
      eq(a, [1,ra]), eq(c, [1,rc]),
      add(b,ra,rc)
    ))
  )
  times=(b, a,c)=>one( // a changes
    all(eq(_0, a), eq(_0, c)),
    puts((ra,rc)=>all(
      eq(a, [1, ra]), add(rc, b, c),
      times(b,ra,rc)
    ))
  )
  lg("peano *",
     st.of(x=> add(nu(2),nu(3), x) ),
     st.of(x=> times(nu(2),nu(2), x) ) // 十転九起，耶！你好，定义式编程的老朋友——关系式！
  )
}
/*opReduce: 很久没发现的传递性问题，(b&a=1|c) 这种在 =| 的时候 & 早就准备去当后面的|的爸爸了
    assoc=(base,o_left)=>{ // base +o1 (x1 *o2 3)
      let o1=o_left||o(); if(!o1)return base
      let x1=x(); if(!x)return null
      let o2=o(); if(!o2)return prec_joins[o1][1](base,x1)

      let [l1,op1]=prec_joins[o1], c2=prec_joins[o2], l2=c2[0];
      if (l1>=l2)return assoc(op1(base,x1), o2) // for b&a=1|c
      else { c2[0]=Math.min(l2, l1); lg(JSON.stringify,prec_joins);let r=assoc(x1,o2); r=!r?r: op1(base, r); c2[0]=l2; return r} // +* less means assocR
    }
    
lev=o=>prec_joins[o][0],
    addTree=(arg)=>{ // adds item >lev0
      let v,o1,l1, l0;
      do {
        v=x(); lg(v);if(!v) throw [o0,arg,t];
        o1=o(); if(!o1){arg.push(v);return;}
        l1=lev(o1), l0=lev(arg[0]);
        if(l1>l0) { let t1=[o1,v]; arg.push(t1); let k=addTree(t1);if(n(k)){if(k[0]>l0) return k; else {arg.push(k[1],k[2]); continue;}} }
        else if(l1==l0) arg.push(o1,v); else return [l1,v,o1];
      } while((o1=o()));
    }
    let v=x(); if(!v) throw oxs;
    t=[o(),v]; addTree(t); return Object.assign(t, { run: ()=>t })
    
    addTree=(a, nlev)=>{ // adds item >lev0
      let n = nlev, e=x(), f,f0; if(!e) throw[a,t];
      peek:do {
        if(!!f0){f=f0;f0=null} else { f=o(); if(!f) return [n,null]; }
        let n1=lev(f); if (n1<n){a.push(e); console.log(e,f,a);return [n1,f];}
        else if (n1==n) a.push(e);
        else {
          let a1 = [f,e]; a.push(a1); let nc_f = addTree(a1, lev(f));
          let [nc, fEnd] = nc_f; console.log(nc_f,n,a,lev_t);
          if (nc<n) if(n!=lev_t) return nc_f; else {a=[fEnd,a];t=a;}
          else {f0=fEnd;continue peek}
        }
      } while (!!(e=x()));
    }

    addTree=(a, nlev)=>{ // adds item >lev0
      let n = nlev, e=x(), f; if(!e) throw[a,t];
      do {
        f=o(); if(!f){a.push(e); return [n,null];}
        let n1=lev(f); if (n1<n){a.push(e); console.log(e,f,n,a);return [n1,f];}
        else if (n1==n) a.push(e);
        else {
          let a1 = [f,e]; a.push(a1); let nc_f = addTree(a1, lev(f));
          let [nc, fEnd] = nc_f; console.log(nc_f,n,a,lev_t);
          if (nc<n) if(n!=lev_t) return nc_f; else {a=[fEnd,a];t=a;}
          else { a=[fEnd,a] ;lg(a)}
        }
      } while (!!(e=x()));
    }
    let e=x(),f; if(!e)throw oxs;
    f=o(); if(!!f){t.push(f,e);addTree(t,(lev_t=lev(f)));} else t.push(e);    
    
    
    addTree=(abase, nlev)=>{ // adds item >lev0
      let n = nlev, a=abase, e=x(), f,_p=v=>a.push(v); if(!e) throw[a,t];
      do {
        f=o(); if(!f){_p(e); return [n,null,a];}
        let n1=lev(f); if (n1<n){_p(e); console.log(e,f,n,a);return [n1,f,a];}
        else if (n1==n) _p(e);
        else {
          let a1 = [f,e]; _p(a1); let nc_f = addTree(a1, lev(f));
          let [nc, fEnd] = nc_f; console.log(nc_f,n,a,lev_t);
          if (nc<n)if(n!=lev_t) return nc_f; else a=[fEnd,a];
          else { a1=a[a.length-1]=[fEnd,a1] ;_p=v=>a1.push(v) ;lg(a)}
        }
      } while (!!(e=x()));
    }
    let e=x(),f; if(!e)throw oxs;
    f=o(); if(!!f){t=addTree([f,e],(lev_t=lev(f)) )[2];} else t.push(e);
    return Object.assign(t, { run: ()=>t })

  const only=(o0,a, oCaller)=>{
    let v,o1, l=lev, iArg, _p=()=>{v=x(); if(!v)throw[o0,a,aTop,oR]; iArg=a.push(v);}
    _p();
    while ((o1=o())) {
      if(l(o0)>l(o1)) return(o1); else// b<a means b tops/forks a
      if(l(o0)<l(o1) ||o1!=o0){
        a1=[o1,a.pop()];a.push(a1); oR=only(o1,a1, o0);   if(oR){
          lg(oCaller,o0,oR,o1)
        if((logs(Math.abs)(l(oCaller)-l(o0),oCaller,o0)>1||oCaller==0)&&l(oCaller)<l(o0)){ o0=oR; a.splice(iArg-1,0,oR); _p();lg(a,o0)}
        else if(l(o0)>=l(oR)){a.unshift(oR); _p()}
        else return oR;}
      } else _p();
    }
    return null; // no fall-rewrite
  }    
*/

/*今天咱来谈谈关系式（即逻辑式）求解器模型与算法的问题
建模五基元： State,Var,Eq, And,Or
其中，状态表 State 和 Var 是 1:N ， Var 即可(自)变量必须有办法引入，函数式里常作为参数，这里仅有全局作用域故建模成 intro("a b c", "a+b=c") 单次变量集方法
intro 含的求解算法和 State 又是 1:N ，相信你已经明白这是类似“暴力破解”的穷举算法了

unification (归一化)是指这个： state.unify(a,b)= when(a){ v->when(b){ v->eq, r->r(v)  }, r->when(b){ v->r(v), r->st[b]=a } }

不好理解吧，关系式 a=1&b=0&a=b 是假(无解)，而假设 a=1&b=2 ，a+b=5 就是不可能的，发没发现这俩实质相同 (a=1&a+b=1+4&b=2)。
unify 的实质是单等号 (=) ，它给两个量(值/变量)建立等同(identity)关系，它是一切逻辑关系与组合的基元，如果你说 a=1 时 a 有何可能值，那必然只有 a:1 符合要求。

因为这俩量(a,b) 可能是立即值，也可能是变量，不难发现有 2*2 四个组合， (r r) 时两变量相等（一般是在 name-valr map 上再做 Val(v) 二层引用）而 (v v) 时测试相等性，失败就下一位 State

我们算法输出的“结果”并不是单一的，它是符合咱定义关系式(约束)的许多变量表，不难猜出，And Or 这些逻辑关系，除了能做判断还能做枚举！

*/
//https://codon.com/hello-declarative-world#functions-and-relations

class Group extends Map { add(k,v){let a=this.get(k); if(!a){a=[];this.set(k,a)} a.push(v); return a}  each(k,op){let a=this.get(k);if(!!a)a.forEach(op)} }
ss=s=>s.push? s : s.split(" ");
class State {
  constructor(d=new Map){this.d=d; this.grpEq=new Group}
  get(k){return this.d.get(k)||k} // dont get var.v
  set(k,v){
    if(!v)return this.set(k.k,k);
    this.d.set(k,v);
    let link=qk=>this.grpEq.each(qk, r=>(r.v=this.get(k)) )
    if(k.v||v.v){ link(k);link(v); }
  }
  v(value,name="v"){let s0=this,o=function(v){o.v=(v.r)? v.v : v; return s0}; o.r=true;o.k=name;o.v=value; o.toString=()=>(s0.get(o.k)===o&&o.v? "":o.k+"=")+o.v; return o}
  vars(sk,vs=[]){ // assign: vs.each(v=>v(1))
    let s1=this.copy();
    ss(sk).forEach((k,i)=>{vs[i]=s1.v(vs[i],k)});
    vs.forEach(v=>s1.set(v));
    return s1;
  }
  copy(){return new State(new Map(this.d))}
  unify(a,b){ // rr rv vr vv
    if(a.r) if(b.r) { this.grpEq.add(a,b); return this} else  return a(b);
    else if(b.r) return b(a); else { return !this.equal(a,b)?null : this};
  }
  equal(a,b){return a==b}
  toString(){return this.d.toString;}
}

st=new State, lg=console.log
{
  let [x,y]=ss("x y").map(k=>st.v(k,k))
  lg(x,y, st.v(1,"x"))
  lg(x==x, x==y, x==st.v(1,"x"))
}
{
  let vs=[,,5], s1=st.vars("x y z", vs);
  let [x,y,z]=vs
  s1.set(x,y); s1.set(y,z); //x=y,y=z,z=5
  lg(s1,vs)
  lg(s1.get(x), s1.get(7))
}
{
  let vs=[,], s1=st.vars("x y", vs); let [x,y]=vs
  lg(s1.unify(x,x), s1.unify(x,y), s1.get(x), s1.unify(5,x), s1, s1.unify(y,6))
}

//goal 的组合子
let
  goEq=(a,b)=>st=>{let s1=st.unify(a,b); return s1?[s1]:[] },
  goWith=op=>st=>{ let ks=paramNames(op), vs=Array(ks.length),s1=st.vars(ks,vs),g; g=op(vs); return g(s1)},
  paramNames=op=>{let s=op.toString(), i=ss("( )").map(sP=>s.indexOf(sP)); return /,\s*/[Symbol.split](s.slice(i[0]+1,i[1]).trim())};
{
  let vs=[9,,], s1=st.vars("x y z", vs); let [x,y]=vs
  lg(s1,goEq(y,5)(s1)) //[0].get(x).v
} // 设计失败：不该有 .v() 二重引用，只该由 state

goOr=(...gs)=>st=>interleave(gs.map(st)),
interleave=(...xs)=>iter(i=>(()=>{
  if(i==xs.length)i=0;
  i++; return nextOr(xs[i-1], ()=>{ xs.splice(i-1,1); return xs[i] }) // until empty: shift, yield, push
})(0)) // a-z, 1-10; abc, 1~inf take 10 

goWith((x)=>goOr(goEq(x,1),goEq(x,2)))
goWith((x,y)=>goAnd(goEq(x,5),goEq(y,7)))
goWith((a,b)=>goAnd(goEq(x,7),goOr(
    goEq(b,5), goEq(b,6) )))

goWith(x=>goAnd(goEq(1,x),goEq(x,2)))

goAnd=(g0,...gs)=>st=>gs.reduce((a,g)=>
  interleave(g(a.shift()), a)
, g0(st))
// and x:xs = interleave(g(x), and(xs))

//Pair(a,b) unify,get mapVAsVar: ab left&right; results=d.values()
goWith((x,y)=>goEq(pair(2,x),pair(y,pair(5,y)))) //y=2, x=(5,2)

/*
失败小笔记：st.v 的变量对象、二层引用来绑定 ra=rb 引用的，多此一举。Map 本身的意义就是给符号以值，v 对象拿字典引用足矣不应该自己存，各种判定麻烦死
 */

eqLList=(T,isT)=>{ let recA, recB;
  return [(recA=([x,...xs])=>!x?null:T(x,recA(xs))), (recB=([x,pair])=>!isT(pair)?[x]:[x,...recB(pair)]) ]
}, eqPair=eqLList((a,b)=>[a,b], o=>(o instanceof Array), a=>a[0], a=>a[1]);

goWith((x,y,z)=>goEq(list(x,2,z),list(1,y,7)))
//https://codon.com/hello-declarative-world#numbers

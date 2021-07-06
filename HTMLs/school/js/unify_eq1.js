/*第二次谈关系式求解器

谈到“比 Haskell 与类型上编程还难理解的编程方法”，大家一定会想到 逻辑式, Coq, unification 这类高大上的名字，今天带你入门神秘的『归一化』求可能解。

关系式类似 SQL 语句， (select (v,k) from kvs where k=1&v>10) 但其数据集不是由用户定义、既存的，是一切可能性里自动生成的。
比如等式 a+b=5 ，若 b=2 则仅可能 a=3 ；关系式 a+2<4 ，则正整数 a 可能是 0,1,2

这并不是靠数学上移项化简，而是“猜”出来的，怎么可能猜呢？首先要把关系式描述给计算机，(=) 显然是种关系，那么 (+) (<) 是吗？它们又如何驱动整体算法？前言会说明，但别想太多到数字上了。

我们会从最基础的相等关系，谈到数据体间的(=)号，利用 (a,b) 二元组与 [] 数组、正整数(类似 [].length)的等价关系，推广出 unification 算法的奇妙用法！

此算法的输入是 contraint ，即关系约束，输出是符合约束的 符号-值表 的集合（枚举器）
三大基元： State/var,eq,Goal(one,all) ；下文 st=State, v=var, g=goal
- goal 即目标，这个词相当于“满足”关系约束的一种方法，它往往用来组合其他 goal ，含义是 eq(= 是),one(| 或),all(& 且) ，unify 指的是 eq(a,b) 这个目标
- 它是枚举与过滤的结合（其实是只枚举符合要求的状态表）；其操作单位是 state ，例如 st.of((x,y)=> goAll(goEq(1,x),goOne(goEq(y,2),goEq(y,x))) 解出来 x,y 是 [1,2] [1,1]
- 别奇怪没有四则运算！在这个还只有逻辑且或非的世界里，数字的定义要慢慢来
- var 不意味自变量，st 求解中也没有作用域问题，那个概念只是变动性的标签，我们要做的是定义符号间的关系如 (a,1)=(2,b)，靠 goOne,goEq 之类来指定其可能性
*/
class State {
  constructor(d=new Map){this.d=d} copy(){return new State(new Map(this.d))}
  toString(){return `{${[...this.d.keys()].map(o=>this===o.s0? o:o.k+":"+this.get(o)).join()}}`;}
  static equal(a,b){return a==b} // 辅助数据体相等性判断

  v(name="v"){let o=function(){}; o.k=name;o.s0=this; o.toString=()=> (v=>(v===o)?v.k : (o.k+": "+v))(o.s0.get(o)); return o}
  get(v){return this.d.get(v)||v}
  set(k,v){this.d.set(k,v); if(k.s0)k.s0=this;}
}
const on=(T,mode)=>new Proxy(T.prototype, {set: (o,k,v)=>(o[k]=(mode=="copy")?function(...a){let o1=this.copy(); v(o1,...a); return o1} : function(...a){return v(this,...a)}) }),
ss=s=>(typeof s=="string")? s.split(" ") : s, n=o=>o.length, lg=console.log
/*
谈到 unify(a,b) ，二者皆可能是值或变量。易猜它是 st 上的操作而会枚举出唯一的符合 st1 (派生自 st 的取值表)： a=b
在下面的内容里它地位特殊，因为只有它真正给变量引入新值！ go all/one 都只能组合其它可能状态，说到底还是因它而变。

关系式 a=1&b=0&a=b 是假(无解)，而假设 a=1&b=2 ，a+b=5 就是不可能的，这俩实质相同 (a=1&a+b=1+4&b=2)，等同(identity)关系是一切逻辑关系与组合的基元，如果说 a=1 或 1=a 时 a 有何可能值，那必然只有 a:1 符合要求。
*/
on(State).unify=(s0,a,b)=>{
  a=s0.get(a), b=s0.get(b);
  let s1 = null;
  if(State.equal(a,b))s1=s0; // vv(== or null) rv&rr/vr makeEq
  else if(a.k)s1=s0.puts(a,b); else if(b.k)s1=s0.puts(b,a);
  return s1;
}
on(State,"copy").puts=(s1,k,v)=>{s1.set(k,v);}

/*
Var 必须被建模成 Symbol ，它仅是 st 上抽离出的某 k ，用于指代其当前值，不得有 mutate 方法
- “重赋值”的便利方法都应在 st 上，不该有储存值或 判定是否变量的语义（理论上）
- 不要过分重视其标识符名，变量是不可能冲突，别搞出 name, st.keyOf, 变量名 三者不统一的情况，元编程提供变量名足矣
- 重点： var 是用来令数据体里的部分 value 可变的， st.get 是做一个 var-value?:var 的代换，它为 unify动作 服务

unify(a,b) 相当于单次应用等号的传递性，而 goal 则负责把这些相等关系组织起来，构成用户想要的逻辑过滤系统
*/
on(State,"copy").vars=(s1,ks,vs=[])=>{
  ss(ks).forEach((k,i)=>{let v=vs[i]; vs[i]=s1.v(k); s1.d.set(vs[i], v);});
}

st=new State, vs=[1,5];
{
  s1=st.vars("x y",vs); let [x,y]=vs;
  lg(x,y,s1)
  lg(x==x, x==y, x==st.v("x"))
}
{
  vs=[,,5], s1=st.vars("x y z", vs);
  let [x,y,z]=vs
  s1.set(x,y); s1.set(y,z); //x=y,y=z,z=5
  lg("xyz",vs,s1)
  lg(s1.get(x), s1.get(7))
}
{
  let vs=[,], s1=st.vars("x y", vs),s2; let [x,y]=vs
  lg(s1.unify(x,x), s1.unify(y,x), s1.get(x))
  s2=s1.unify(y,6)
  lg("unify",s1.unify(5,x), s2.unify(x,5), s2.unify(y,2)) // 待会用 goal 表达会清晰很多
}

const
  canEval=s=>{try{eval(s);return true}catch{return false}}, // 临时引入 ES5/6 通用惰性序列
  iter=canEval(`(function*(){})`)? (op_gen,eval)=>{
    let ps=paramNames(op_gen), s=getCode(op_gen); s=s.slice(ps.i1||s.indexOf("{"), -n("}")); // 没判 s[ps.i1-1]=="{"?
    return eval(`(function*(${ps.join()}){${s.replaceAll(ps[0]+"(","yield(")}})`)
  } : x=>()=>x,

  next=g=>{let r; if(n(g)==1)try{g(v=>{r=v;throw 0;}) }catch{return r} else return g.next().value}, isEnd=v=>v===undefined,// lazy 序列
  nextAll=g=>(n(g)==1)? (a=>{g(v=>a.push(v)); return a})([]) : [...g],
  //nextN=(n,g)=>{if(!g.next)g=g(); let inf=!isFinite(n), a=inf? [] : Array(n), i=inf? n:0; if(inf)while(i-- !=0)if(isNon(a.push(next(g))))break; else for(;i<n;i++)if(isNon(a[i]=next(g)))break; return a},
  interleave=(xs,i=-1)=>iter(got=>{
    while(n(xs)!=0) { i=(i+1)%n(xs); let r=next(xs[i]); if(isEnd(r)) xs.shift(); else got(r); } // 好处是 ES5 可用，坏处是 mutate 语句得放前面及 _=>eval(_)
  },_=>eval(_)),
  rng=(fst,last,step=1,i=fst-1)=>(typeof fst=="number")? iter(n=>{for(;i<last;){i+=step;n(i)}},_=>eval(_)) : map(String.fromCodePoint, rng(...[fst,last].map(s=>s.codePointAt(0)), step)()),
  map=(op,xs)=>n(xs)==1? map(op,nextAll(xs).values()) : iter(o=>{for(let x of xs)o(op(x)) }, _=>eval(_)) // DownlevelIteration

on(String).subsBetween=(s,s01)=>(i=> s.slice(i[0]+1,i[1]))(ss(s01).map(sP=>s.indexOf(sP)))
paramNames=op=>{let s=getCode(op), m=/^\s*\(?(\w+)\)?\s*=>\s*{?/.exec(s); return m? Object.assign([m[1]],{i1:m.index+n(m[0])}) : /,\s*/[Symbol.split](s.subsBetween("( )").trim())},
getCode=op=>(op.toSource||op.toString).call(op);

lg(...[(function(  a , b , c ){}), ( x =>x), (x)=>{}, (x,y)=>x, x=> {}, x=>x].map(paramNames) )
lg(nextAll(interleave([rng(0,10)(),rng('a','z')()])()))

on(State).of=(st,op)=>{ let ks=paramNames(op), vs=Array(ks.length), s1=st.vars(ks,vs), g=op(...vs); return [next(g(s1))]}
const
  goEq=(a,b)=>st=>{let s1=st.unify(a,b); return (s1?[s1]:[]).values() },
  goOne=(...gs)=>st=>interleave(gs.map(g=>g(st)))(),
  goAll0=(g,...gs)=>st=>gs.reduce((s0,g)=>{
    // and st (x:xs) = interleave(st=x(st), and st xs)
    let ss=nextAll(s0)
    return interleave(ss.map(s1=>g(s1)) )() // bfs 广度搜索
  }, g(st))
  goAll=(g,g1)=>st=>{
    const rec=(ss)=>{
      let s1=next(ss); if(isEnd(s1)) return [].values()
      return interleave([g1(s1), rec(ss)])()
    }
    return rec(g(st))
  }

lgA=(...a)=>lg(...a.map(r=>r.map(x=>x.toString())).join(";"),...a), logs=(op,...a0)=>(...a)=>lg(a,...a0)||op(...a)
{
  lgA(st.of((x,y)=> goEq(5,x)),
  st.of((x,y)=> goEq(x,5)),
  st.of((x,y)=> goEq(y,2)))
}
lgA(
  st.of(x=>goOne(goEq(x,1),logs(goEq(x,2), `两个 state 被 unify:puts 给 fork 出来了`))),
  st.of((x,y)=>goAll(goEq(x,5), logs(goEq(y,1), `其二在其一的基础上合并`)))
)
//combining-goals
/*看到这里，最后复习下三基元的实际建模：
State, .puts(k,v)=fork .unify=this/fork/null ; st.of((x,y)=>goal(x,y))
ordcat=interleave, goEq(a,b)
goOne(gs)=ordcat(gs.map(runs(st)))
goAll(g,gs)=gs.reduce( ordcat(s1s.map(run(g)) ) , g(s0))

现在我们能迭代甚至穷举变量集，有了基础系统，很好。但是仅有变量的语言是不够的，一般语言都会提供些数字、真假、数组类的数据结构。

简单起见，仅实现形如 [a,b] 的二元组，就可以同时提供数组、正整数的解关系式支持！
当然不可能在不改动 unify() 的情况下支持这种“特殊值”，但——了解我的人应该知道有个 TkGUI 项目，它用了一种 "value-name substitution" 值名代换算法来进行 执行同时生成等效代码 的魔性操作

既有的 var 建模已足够“修改”这些 (a,b) pair！它们本身是值，而它们上代表"变量"的 js对象，和 eq(a,1) 里 a 一样也是 st 上的变量！既有的算法当然可以看见并操纵这些变量。
不过，我们需要给 unify 和 get 的算法添加此结构的特例，get 要能把关系式世界的 (a,b) 映射回 js对象的世界，解引用其中变量。
*/
const canExtract=(a,b)=>{
  const isO=v=>typeof v =="object"&&v!==null, isA=o=>!!n(o), po=o=>o.__proto__;
  return isO(a)&&isO(b)&&(po(a)==po(b) ||
    isA(a)&&isA(b)&&n(a)==n(b))
}
on(State).unify=(s0,a,b)=>{
  a=s0.get(a), b=s0.get(b);
  let s1 = null;

  if(canExtract(a,b)) {
    return Object.keys(a).reduce((st, k)=>!st?null: st.unify(a[k], b[k]), s0);
  }
  if(State.equal(a,b))s1=s0; // vv(== or null) rv&rr/vr makeEq
  else if(a&&a.k)s1=s0.puts(a,b); else if(b&&b.k)s1=s0.puts(b,a);
  return s1;
}
on(State).get=(s0,v)=>{
  const deref=v=>{
    if(!canExtract(v,v)||!!v.k)return null;
    let o=(v instanceof Array)? Array(n(v)) : Object.create(v.__proto__);
    Object.keys(v).forEach(k=>{ o[k]=s0.get(v[k]); });
    return o
  }
  return s0.d.get(v)||deref(v)||v
}

lgA(
  st.of((x,y)=>goEq([2,x], [y, [1,y]]) )
)
/*
else if 的顺序和原文有出入，主要是咱的建模利用了动态类型 o.k 判断是否变量。
  咱使用了大量 reduce((acc,x), acc0) 来宽化兼容既有模型或简写，咱的 unify/get 是支持 js 全体对象/[] 的，而不仅仅是 [a,b] 类数组（k:v 对象的特例）。

是的，仅仅是俩项也没啥有趣，但这 (a,b) 是一切的基础，看看它等价什么，能表达、编码些什么，就能把啥样数据类型的问题带进这个“世界”来解决。
*/
eqLList=(T,isT)=>{ let recA, recB;
  return [(recA=([x,...xs])=>!x?null:T(x,recA(xs))), (recB=([x,pair])=>!isT(pair)?[x]:[x,...recB(pair)]) ]
}, eqPair=eqLList((a,b)=>[a,b], o=>(o instanceof Array), a=>a[0], a=>a[1]), eqNum=[n=>eqPair[0](Array(n).fill(1)), p=>n(eqPair[1](p))];
lgA(
  eqPair[0]([1,5,6,7]),
  eqPair[1]([1,[7,[0,null]]])
)
lg(
  eqNum[0](5),
  eqNum[1]([1,[1,[1,null]]])
)

lgA(
  st.of((x,y,z)=>goEq([x, 2, z], [1, y, 3]) ),
  st.of((x,y,z)=>goEq(... [[x, 2, z], [1, y, 3]].map(eqPair[0]) ) )
)

/*
接下来咱开始真正的关系式编程了！

concat("a","b","ab") 的序列拼接关系可表达：

concat(a,b, s): a=[]&b=s | (x,ta,ts){ a=[x,ta]&s=[x,ts]& concat(ta,b,ts) }

不难发现 a,s 的首项 x 建立了相等关系，接下来确保余下 ta+锚点b 是 ts ，递归到 (a [])+b=s 关系成立
正是由于编程的单位是「每项」间的关系，关系式才能查询到所有可能的变量组合！
*/
const
  goOf=op=>st=>st.of(op),
  gConcat=(a,b,c)=>goOne(
    goAll(goEq(a,null), goEq(b,c)),
    goOf((x,ra,rc)=>goAll(
      goAll(goEq(a, [x,ra]), goEq(c, [x,rc])), // 最明显的区别是，这里并没有赋值而只有任意化的 var ！
      gConcat(ra, b, rc)
    ))
  )

lgA(
  st.of(s=>gConcat(eqPair[0](""), eqPair[0]("l"), s))
)

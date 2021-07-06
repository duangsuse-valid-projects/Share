关于 1+2*3 这类中缀链的问题，可能是蠢，咱之前讲过很多次

中缀链最难的地方在于——很多人 `s.join("")` 函数都不会写，那么现在是读取不是输出，而且还要同时解决 + 更浅的问题？牙白伊！


```js
    assoc=(base,o_left)=>{ // base +o1 (x1 *o2 3)
      let o1=o_left||o(); if(!o1)return base
      let x1=x(); if(!x)return null
      let o2=o(); if(!o2)return prec_joins[o1][1](base,x1)

      let [l1,op1]=prec_joins[o1], c2=prec_joins[o2], l2=c2[0];
      if (l1>=l2)return assoc(op1(base,x1), o2) // for b&a=1|c
      else { c2[0]=Math.min(l2, l1); lg(JSON.stringify,prec_joins);let r=assoc(x1,o2); r=!r?r: op1(base, r); c2[0]=l2; return r} // +* less means assocR
    }
```

它是这么用：

```js
optab={
    ["="]:[5, scall("eq")],
    ["&"]:[4, scall("all", "...inn")], // 毕竟这俩支持多参， a&b&c 能合并
    ["|"]:[3, scall("one", "...inn")],
  }
```

很久没发现的传递性问题，`(b&a=1|c)` 这种在比较 =| 的时候 & __早就__ 准备去当后面的|的爸爸了，当时弄计算器测试就在怀疑结果不对，猜是不是浮点数实现差别……

咱就参考 [html hN 内容树解析] 那次的 Lua 式算符链的经验，搞了5小时，疯狂调试出了这东西：

```js
opChain=(prec_joins,oxs)=>{ let t=[],lev_t; //root
  const
  takeOp=p=>()=>{let r=next(oxs); return (!isNon(r)&&(r in prec_joins) == p)?r:null },
  o=takeOp(true),
  x=takeOp(false),
  lev=o=>prec_joins[o][0],
  addTree=(abase, nlev)=>{ // adds item >lev0
    let n = nlev, a=abase, e=x(), f,_p=v=>a.push(v); if(!e) throw[a,t];
    do {
      f=o(); if(!f){_p(e); break;}
      let n1=lev(f); if (n1<n){_p(e); console.log(e,f,n,a);return [n1,f,a];}
      else if (n1==n) _p(e);
      else {
        let a1 = [f,e]; _p(a1); let nc_f = addTree(a1, lev(f));
        let [nc, fEnd] = nc_f; console.log(nc_f,n,a,lev_t);
        if (nc<n)if(n!=lev_t) return nc_f/*chain nlev*/; else {a=[fEnd,a];n=lev(fEnd);}
        else { a1=a[a.length-1]=[fEnd,a1] ;_p=v=>a1.push(v) ;lg(a)}
      }
    } while (!!(e=x()));
    return [n,null,a] //ss("b|a=1&x b&a=1|x b|a=1=5&x b&a=1=c|x b&a=1=c|x|d b&a=1=c|x&c")
  }
  let e=x(),f; if(!e)throw oxs;
  f=o(); if(!!f){t=addTree([f,e],(lev_t=lev(f)) )[2];} else t.push(e);
  return Object.assign(t, { run: ()=>t })
},
```

解释下，这个算法怪直观，树底部优先级0，就是 `(b&a=1|c)` 这种低优先级 `|` 在后面的情况时，它会“掉落”到同级层读此算符的下个参数，这样也实现了合并同符号并列参数的优化（比如字符串拼合就有用，然后参数列表的形式依然可以有 (a,b) 俩项间的 reduce）

因为可能到底了都没有一层拦截(&| 时)，得在底层 `(n==lev_t)` 确保式重写 `n=lev1`

~~因为(|&=|x 时) 掉落到第一 '|' ，x 实际上是 &= 那级的~~ 实际 `a[n(a)-1]` 就是 `[n1,f,a][2]` ，是改时没一起，可见面向 `console.log` 编程的弱智性。不过 `_p` 插入点的修改是必须的，因为不能弄丢这层的 `a` 也不能 `setA`

今早咱还想到了个“缩短”方法，把 return 里的 `[,a]` 去掉参数加个 `setA` 方法；顶层别预读第一个中缀，允许修改并返回 `t[0]`，这样顶层 `lev_t` 也就不用在 "chain nlev" 时特殊判断了

那这个“惰性”也没啥用啊，读取还不是要读整个的，逻辑那么复杂。

突然想到一个好方法：直接弄整个被中缀 join 的链，一层只切一种算符，然后递归处理；咋要“掉落”呢？不调用不就好了！【恍然大悟】

这种方法是 Haskell 解析组合子 chain l/r 的做法，也是咱在 LittleDict 里解析字典表达式的做法，尽管简单很多人仍想不到（~~法律学久了就失去人性了~~ 算法学久了就忘记本心了）

```js
const opChain=(o,x,lev)=>{
  const only=(o0,a)=>{
    let v=x(), o1,  a1,  _p=a=>a.push(x());
    while ((o1=o())) {
      if(o0>o1)/*o1 grabs*/ { a1=[];a.push(a1); o0=o1; } else
      if(o0<o1) a1=null;
      else a1?_p(a1):_p(a);
    }
  }
  let t=[]; only(0,t); return t
}
```

这是最初构想，only 的结果最深两层，然后可选的再调用即可。

最终：

```js
const opChain=(o,x,lev)=>{
  let aTop=[], oR;
  const only=(o0,a)=>{
    let v, o1, l=lev, _p=a=>{v=x(); if(!v)throw[o0,a,t,oR]; a.push(v);}
    _p();
    while ((o1=o())) {
      if(l(o0)>l(o1) ||o1!=o0)/*o1 grabs*/ { a1=[o1];a.push(a1); oR=only(o1,a1); if(oR)a=[oR,a]; _p(); } else
      if(l(o0)<l(o1)) return o1;//oR
      else _p();
    }
    return null // no fall-rewrite
  }
  only(0,aTop); return t
},
runOptab(d)=s=>(re=>{
  let ss=[...re[Symbol.split](s)].values(), op=p=>{let v=ss.next().value; return (v in d)==p; }
  return opChain(op(true), op(false), o=>d[o][0])
})(RegExp("["+Object.keys(d).join("")+"]"))
```

真的最终可以在 mkey.js 里看，这个版本其实不是只切一层、拼合下层再递归的，临时数组少建一点。

顺便一提，写的时候可能因为短代码有点走火入魔，居然连 `Symbol.replaceAll` 都记不得了，，啊不对， `pairedIdx` 不能靠 rep 它来着

另外 `setA` 是做什么啊， Array 不就有 push,unshift,splice 等 mutate 方法吗？

```js
subPaired=(p,re,dn,op)=>s=>{
  let s1=[...s]; // ->() to puts
  for(let {[1]:sarg, [0]:m0, index:i} of re[Symbol.matchAll](s)) {
    let i1=pairedIdx(p, s, i+dn); if(!i1)throw s;
    let code=s1.slice(i+n(m0), i1);
    s1.splice(i, i1-i +1, ...op(sarg,code.join("")));
  }
  return s1.join("")
}
```
真是石勒智。

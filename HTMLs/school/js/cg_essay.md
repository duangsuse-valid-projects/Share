# 函数抽象与代码生成 随想

关于 [scan.js](scan_fin.js) 的 Buffer 支持，我和我谈了一下早有的 `(s,c=null)=>` 组合函方法

buf 的支持是靠 DOM 侧新的 `ArrayBuffer` View/`Blob` API 的，它们提供了不同整数的读写接口，不出意外，咱这边最突破的点是，仍是只有组合(s,c)=>的函数值， c 显然不能只是 write 动词，但除了 parse,dump 操作现在还有 sizeof ，有必要用面向对象 class？

显然 c={} 里得包含 str 和 blob 的输出接口，这点都做的到所以关键是怎么在 Seq,One,More 这些组合子里定义多种操作还不乱，老设计是 c=show_rep 然后判 null(Kotlin 里还简单) 但现在显然没，那 if(c.n) c.n= 甚至 else if 这种有无赋值式？太长、自动转型太不严谨，不好看。

最后我选择了 `c.n(sz=>sz(+10))` 这种“提供惰性计算函数”的方法，主要理由……当然是写着太有颜值， `c.o(r=>r.each(seq[i](0,c.of(v) )))` 就能提供 Seq 的回显

这种方法还能同时运行几种操作，比如读取/回显什么的，对 formatter 方便，关键是它对数据绑定的理论优雅性，俩 (s,o) 参数定义了相互的关系和一些调整，尽管对 parser 流绑定关系必须靠 range 映射故应选择性地去增量解析

结合 noWhiteFeed 上的 span 存储化更改，它也让元编程和动态类型的优雅性显现，可以

```js
if(!c.o(v=>{})) read(s)
c.n(sz=>{})
return c.o(res)
```

这样，在全定义皆语句前提下，较优雅实现多操作、子语言化、输入输出的隔离，我觉得配合 feed/state 的良好组合子框架性 API

回头再给组合器加自动包 "" 和 [""] 参数的外函数……  最好还能弄 .then .also

---还打算弄个最小编程语言：基于 S-表达式和 pSlicedTry JSON

```lua
Expr (\a b. Expr) -- abstra
|(fnExpr Expr*) -- apply
|nameRef|jsonVal
```

词法：非 jsonVal 跳空格和 -- 行注释

这个其实没怎么难，就是递归 s-expr 加 (\a. 的预判和 nameRef 的解析，会把前者变成 function(){} 而后者是 arguments[argNo] ，(f a1) 翻译成 `f.apply(scope,[a1])`
其实是有中间树的，长这样：` [(a)=>_op("+").apply(null,[a(0),a(1)]), "hello","fun"] `，其中 apply 的参2 可以被闭包式组织，但这种函数定义不得不有 `(op)=>(...a)=>op(i=>a[i])` 包装，它不涉及 arg 对象的 [i] 因为那没法组成值表达、它是 JS 语言字面层的引用解析。

细心的朋友们要发现华点了—— _op 没有来源，从值组织上它不是合法闭包性(即能靠 o=>k=>o[k] 这样填出来的)代码，故 (s,a)=> 再 s["_op"] 才是有效的
这样我们就成功在没有一次 eval() ，也没有一个 tree walker 的前提下从 String 构筑了可从 JS 调用的函数！

那有人会吐槽，这只是函数定义与调用啊，没有实现 `let a=b` 和 `a+b` 这种代码啊

小傻瓜， a=b 可以分“定义简写”和“重赋值”两种情况，前者通过 (\a. expr)(b) 而后者通过递归/forEach/reduce 等函数式方法可以取代，(+) 这种“操作符”其实本质是 (\a b.) 函数的形式，这就是组合力不比 Java 等高级语言差的「编程语言」啊！

欢迎来到 JavaScript ，一门对象皆 K-V字典、函数与访问语法皆可再包装的弱类型语言。

有点犯规，因为 combinator 的重写代替每次去 walk AST 是足矣，它相当于邦死了的 walk(eval_er) 函数，但是 upvalue 仍没融合到这个系统，语言现在像 C 或 C预处理宏一样，不存在 make_f()(1) 的层次

你正在学习函数子程序与存储空间的老本本。不难发现编译期 nameRef 靠动态作用域(增设&回删/恢 或全复制)你不能把上层函数的参数，化为 a(i) 的形式，你可以想办法把它变成 s.upval(1, (i)0) 结合调用栈元编程接口和 K-带层差-V 动态域实现。

如此一来，编译原理剩下的基本就是线性化与回填、下层 CGen API 了，最“精华”的部分就是这些“原初”函数式的，要知道动作依赖啥参数、参数以变化有何数量级差，不也是 OOP/FP 始终追寻的易写性吗。

然后关于动态作用域（编译器/解释器 解析变量引用会用到）的实现，我也不谈优化思路的优劣，说说作用域动态静态处理，如何区别对待。

```kotlin
forall<K,V>
class Scope { fun get(K):V?; fun set(K,V); fun enter(); fun exit(); fun closure():Scope } //不喜欢弄 contains 判断，null 很优雅而目标语言的 null 用 object vNull 取代亦可
forall<> thing Dyn Scope {
  private val d:Map
  val shadow: List<Map>
  fun get(K)=d[k]
  fun set(K,V)=TODO("旧值或空添加到本层 shadow")
  fun enter=TODO("添加 shadow")
  fun leave=TODO("复原 shadow d")
  fun closure=LexScope(shadow,d)
}
forall<> thing LexScope(:List<Map>,:Map): DynScope {
  //创建 当前被shadow值|全局 的懒字典 ；其实 d 的全局没隔离开会产生变量数可能增多的问题，对查错不利，但既有量不会错
  fun closure=this //首先词法域也是能 set 的，其次它闭包含了一些量；我们靠 enter/exit 解决 {} 单有量的移除
}
```

这个方法可以说是对 (\name.)(v) 预绑定 name 的灵活版，避免全复制或级联查&存的性能问题

但我们回避了一个问题，刚刚咱说 "upvalue" 是没法融入 局部/全局量 的系统的，如果你在写解释器，它和这个作用域表 1:1 够用，可对编译器 closure() 函数与 LexScope 都是没用的。

它们都得被映射到目标代码文件格式的 常量区/调用栈 的 固定/偏移量 位置，和文本命名形式脱离干系，这是残酷的编译原理基础。

刚才说 upvalue((dLayer)1, (i)0) ，显然你 ((\a.b. a * b) 1) 得知道 (\b a * b) 的 a 是引用哪层外部函数的局部量，这里层差是 +1。


我们要判断，一个名字究竟是指代 local,global,upvalue ，最简接口不难设计为： `scope.partitionLUG({argno,varObj-> }, {k,argno,var-> }, {key->ctx.addGloVar(key)})`
然后全局表的编号化可以后处理，定义/引用两边同时改 `ctx.glo.reref("name", idx++)` 这样

我想了想 Map 创建与级联查 开销的平衡，首先局部量必须单 Map 是肯定，但 upval 和全局的区分我觉得没必要缓存，也不应该记住全部全局键，可以靠否决来判全局量。

`DynScopeLayered()` 肯定要存层号 layerNo ，upval 如果要存住层号是可以，但考虑在代码里不常见，没必要去分配，可以 `scanUpvOrG(shadow,key, onUpv,onG, k=0)` 临时查
考虑到内部函数不常见，靠否决断言出全局量不需要查几层 shadow ，Lua 也是这个方法

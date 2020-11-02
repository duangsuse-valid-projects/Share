/*
咳咳…… 这个脚本可以用来“翻译”也可以用来查词（甚至输入法，大雾）
应该说还是挺好用的（也很实用），可惜只有最近的浏览器可以执行（Trie 的 toString 遍历都依赖 ES6 Generator）

咱是有把它移植到 ES5 的打算（而且也的确做得到），不过介于为了这个项目已经花了一天半，原谅咱吧……
也是想了、实现了动态加载 text(URL) 和 invert trie 的，精力不多了。

Trie 定义的语法比较像左递归，但不能直接 fallback 到低一级算符，不过想必你们也因此了解到左递归算符优先级解析法对递归的利用技巧。

昨天我也一直在想 Coroutine 的问题，还有怎么用 CPS(continuation-passing-style) 重写支持 callback 模式的方法

不过说起来这里也有个挺好玩：
```
function scheduleFixedRate(ms, op) { setTimeout(() => { op(); scheduleFixedRate(ms, op); }, ms);  }
scheduleFixedRate(700, () => { helem("text").selectionStart -= 5; });
```
啊啊跑题了。

关于 function* _iter(point) 的移植，直接变成 visitWith(op, point) 然后里面 yield x 变成 op(x) 、 yield* 变成递归就好了。
forEachCps （也就是 for of 的全枚举）什么的可以把单次循环变成 function body ，然后 `if (!hasNext) return else aop(v => { op(v); rec(xz); });` 这样

opChain 的我记得是比较麻烦（没看过我 ParserKt InfixPattern 实现的现在去看看），因为里面除了直接递归还有等待下层递归的
不过有实现价值（毕竟异步的算符链解析也是利于去实现特性的）
  大概就是 `loadItem(v => (precL < precR)? : rec(s,rhs, v => op1(base, v)) : rec(s,op1(base, rhs), cont) ) //结合本层`
  这样，把写前面的放到 cont => 里去就好了
  所以说，递归、闭包、CPS 果然是很相容嘛。


最后，关于渲染方面我也不清楚要不要加 <pre> 让浏览器处理 #text 的换行好了，以及是不是给未识别一个 tag ，或者不加 .recognized 是不是更快；总之能用就好。
*/
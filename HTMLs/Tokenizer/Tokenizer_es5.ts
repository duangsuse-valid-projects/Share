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

以前我听说拼接 HTML 性能比操纵 DOM 好，实践后我才发现这想法真智障。

第二天加几个特性，包含一个 Trie 字典数据 onprogess 下载进度的， indexOf(':') 再拼接算点百分比也容易，不过要修改 xhrReadText 的 API ，忍住了（只说在下载什么东西，连下载大小都没有）

第三天还想加个 RegExp 替换(inword-grep) 的功能，大概就是在某个 char 匹配时再匹配skip/替换一段字，开始主要是解决英语空格单引号的 Tokenize，后来发现甚至可以用来支持 C Preprocessor 一样的工作（迫真）
计划的优化是给匹配完的键到 Map<,Function> 里面去（后来发现没必要），然后那个 char 应该也可以替换，真是麻烦

嗯…… 实现上就是 tokenize 提供参 (char:string) => [RegExp, string]? 然后如果结果 == c 直接跳 match 否则只能在 input 左拼接了
（反正 `"hello 1".replace(/(\d)/, "$1a") == "hello 1a"` ）

这几天有点累了，估计类似的项目以后可能还有，就暂时没有继续实现。

如果有希望，我想把项目分成 triedata.ts , Tokenizer_lib.ts 多加 greaseyFork 的脚本或者 JS lyrics player 什么的。

我从 https://github.com/hexenq/kuroshiro 项目拿到了日文汉字(Kanji) 到平假字典，日语部分算是完成了，大概以后也不得不处理更复杂的 grep 吧，唉。

第四天，新的 inword-grep 特性总算完成了，感觉可以替换第一匹配（发起匹配）字符的设计好奇怪啊，等于可以删掉或者保留此字符，还好最后我测试许多变绕过来了。
*/
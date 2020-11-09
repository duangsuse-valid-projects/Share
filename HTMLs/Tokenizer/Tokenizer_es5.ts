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

第五天，我又支持了原来因为性能问题（读 (+) 的那层解析器收的还是 Map 而 (>>) 显然不可能比它大所以要临时 Trie） 不打算加而是支持了 2nd-tokenize 的 (>>)

真的不想进行最终的重构了（虽然估计可以支持 ES5 ，也能为萌娘百科什么的做贡献），唉

https://github.com/haochi/annotate-pinyin-with-chinese/blob/master/src/browser/pinyin.ts

这个大佬写的代码真好看，简直找不出可以重构的地方，会以他的 API 模板实现浏览器插件。

--- 导入了 Unicode CJK 数据后，脚本的性能暴露出了严重问题（其中有一部分是内存分配过度），开始咱策划的是用压缩前缀树(Radix) 而不是字典树(Trie)
后来发现咱的 Tokenizer 算法如果用压缩前缀得从 m[pt] 的 O(1) 变成 for (let [k, v] in m.entries) if (s.startsWith(k)) 的 O(n) ，反而不利于性能（但优点是不必创建哈希表）
于是咱提出了三个优化点：
1. ES6 的把 Object in delete [] []= 改成 Map 对象的操作
2. 惰性初始化 Trie 的 Bin ，也就是允许 route 里直接存值的情况，有添加再替换（比较类似前缀树了）
3. 惰性从 K-V 初始化 Trie ，尽可能避免创建冗余对象（比如 LittleDict 的 dictGen js 也是用 readline event 而不是 split("\n") 的）
还有，尽可能降低抽象开销，例如用 T.prototype.op 不 new 调用方法

但咱还是设计了一下前缀树，感觉有很大不同。

Trie 的每个节点有三种情况： Path (仅路径没有值)、Bin (有值和路径)、 Tip(只有值)
这些都可以用 Map/Object 来表示（路径本身的值就是 KZ = "\u0000" ）
Radix 也是必须有 KZ (Bin) 的，但是它可以压缩内存使用
set 时， Radix 默认（无当前键）是直接存在 root 的
如果有的话就要进行切分操作
_split(k, ins_k, v) {
  let oldV = routes[k]; delete routes[k];
  let newK = k.substr(k.length-ins_k.length)
  routes[newK] = { [KZ]: v, [k.substr(ins_k.length)]: oldV };
}

get 时，必须遍历然后找前缀继续递归 pt.substr(k.length) 拿值

```js
let iKsLast = ks.length -1; // unchecked
let parent = this._makePath(ks.substr(0, iKsLast), true);
let lastK = ks[iKsLast];
if (!parent.has(lastK)) { parent.set(lastK, v as unknown as Routes<V>); }
else {
  let newPoint = new Map; // lazy split
  let oldV = parent.get(lastK);
  newPoint.set(KZ, oldV); newPoint.set(lastK, v);
  parent.set(lastK, newPoint);
}
```

一开始是这么写的，后来发现 get 的时候肯定也要有处理，就合并化了 _makePath 与 _path ，加了个 boolean flag

其实这个性能瓶颈本来也是咱写的不对（value 应该是直接关联在 Trie 对象而非 Map 上的），不过这样也有好处（不会有多余的 Trie 实例）

…… 第二个特性实现的时候出现了很多小问题，卡了整整一天。

想想也就是 Tip 自动转 Bin 的问题而已，其它实现看了下，有的有『合并后缀』的优化，但不是想要的。

在有了 Trie.asBin 和 pvalue/pnext/pv 这些统一化缩写，终于知道该怎么实现 lazy init 了，也替换了一些难看的逻辑：
```
  let pv = Trie.valueAt(v);
  let isMap = v instanceof Map;
  if (pv !== undefined && (!isMap || isMap && (v as Routes<V>).size == 1)) yield [ks_path+k, pv];
  else yield* this._iter(v as Routes<V>, ks_path+k);
```
到更清晰的
```
for (let [k, v] of path.entries()) {
  let pnext = Trie.asBin(v); //v optimize val-only node
  if (pnext === undefined || pnext !== undefined && pnext.size == 1) { yield [ks_path+k, Trie.valueAt(v)]; }
  else { yield* this._iter(pnext, ks_path+k); }
}
```

马上实现了 Ext 版后，咱考虑下弄个 GenUI 代码生成生成库，写支持 Native Spannable 的 Android 版的说！

在靠着自己的编程习惯和代码质量，终于解决性能瓶颈的第二天，修复了 iter 和 tokenize(索引计算盲目优化) 的 bug ，终于迁移到了惰性树，跑得贼鸡儿快！

之前发现了一个修理方法可以解决无尽循环的 bug（tokenize 里面 else Trie.valueAt(point) 改成 pvalue ），但后来 tokenize 漏词的时候最终发现是这个导致的（修好后不会无尽循环）
原来一些 bug 是可以导致本来错写的东西看起来正常运行的…… 现实工程还是难，各种条件各种程序路径和数据变化
 */
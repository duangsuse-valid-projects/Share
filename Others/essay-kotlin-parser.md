---
author: duangsuse
---
# 看完这段 Kotlin 代码后我哭了

## 那么我们来看看这个标题党到底是什么意思吧

<div class="literateBegin" id="SampleCode"></div>

```kotlin
fun <K, E> Iterable<E>.hist(key: (E) -> K): Map<K, List<E>> {
  val histogram: MutableMap<K, MutableList<E>> = mutableMapOf()
  for (item in this) histogram.getOrPut(key(item), ::mutableListOf).add(item)
  return histogram
}
fun main() {
  val words = listOf("雨女无瓜", "柠檬精", "鸡你太美", "盘他",
    "我太难了", "我酸了", "六学", "奥力给", "Giao", "skr", "亲")
  println(words.hist { it.length })
}
```

<div class="literateEnd"></div>

> 我们如何让计算机可以『阅读』并『理解』以上代码？

阅读的方法很简单，和我们一样，按字、词读就好了，不过一般情况计算机只能按字来读呢。

理解是什么意思？比如从 `"apple banana crystal"` 这三个以空格 `" "` 切分的单词序列里，提取出这三个单词 `["apple", "banana", "crystal"]`，
从一串字符和空白，到一些单词，这就是做了某种层面的理解——当然也可以做更深层次的理解，比如分析它们之间的关系或者归类什么的。

> 或许你想说 Python、Java、JavaScript、Ruby 里这用 `"apple banana crystal".split(" ")` 就可以解决，但这篇文章不止于此。

其实阅读也可以认为是某种层面的理解，因为它从一串字，到了另外一种形式，只不过对作为人类的我们来说不是很明显而已。

怎么个读法？我们需要知道一种叫『模式<sub>pattern</sub>』的东西，~~大家在写正则表达式<sub>Regular Expression</sub>的时候往往会用到。~~

无论是 `"apple banana crystal"` 还是 `"123"`，它们都遵循某种模式，这样我们的计算机才能举一反三地理解所有类似的表达方式。

一些程序员不知道正则可以 group 出值，如 `"hello world"` 以 `/^hello (.*)$/` 可解出 `(.*)` 代表的 `world`，~~而且还能 backref，在接下来的序列里能使用 `\1` 再引之前的匹配结果，十分不得了。~~

（划掉的内容纯属作者胡思乱想，不要求理解）

其实正则表达式是很高级的，什么有穷无穷、可确定不可确定状态机啦，这里不谈那么高大上的东西。

但我们这里不用，我们用一些平凡的表示法，比如，

+ `a b c` 表示顺序出现
+ `a|b|c` 表示可能是这些情况之一
+ `{a}` 表示重复出现
+ `a ~t` 表示重复直到 `t`
+ `a?` 表示可选项目

这是一些比较泛泛而抽象的表达，但还需要一些具体一点的，如，

+ `"abc"` 表示字符序列，注意这里我们把 `1`、`+` 什么的也视为字符
+ `'a'` 代表单一字符
+ `[`...`]` 代表一个字符，这字符可能是其中任意字符里的一个
+ `a-z` 在 `[]` 里表示 `abcdef`...`z` 所有这些字符
+ `a b c` 里的空格代表 `{" "}?`，或者说可能有一些空格
+ `a.b.c` 里的 `.` 代表 `{" "}`，或者说有一些空格

然后，括号 `()`、等号 `=` 的涵义和小学数学里的一样，大家肯定会吧。

之后我们就可以描述一下上面的代码，归纳出它的语法，注意『提取』『泛化』出通用模式是很重要的思想。

```kotlin
fun <K, E> Iterable<E>.hist(key: (E) -> K): Map<K, List<E>> {}
```

```plain
Fun = "fun" TypeParameters (Type '.' Name) FormalParameters ':' Type Block
TypeParameters = '<' Name {',' Name}? '>'
FormalParameters = '(' NameType? {',' NameType}? ')'
NameType = Name ':' Type
```

那个 `Name {',' Name}?` 是一个比较通用的模式关于 `Name` 的实例，
表达 `SomeName` 及 `Bananas, Apples` 这种逗号切分列表情况。注意其中 `Bananas` 什么的都是某种 `Name`。

对于 `Name` 的定义有点复杂，是因为 `_, __, ___` 这样全下划线的名字不能用，而且名字不能以 `0-9` 开头。

```plain
Name = (letter{letterDigit|underscore}?)
  | (underscore{underscore}?letterDigit{letterDigit|underscore}?)
underscore = '_'
letter = [a-zA-Z]
digit = [0-9]
letterDigit = letter|digit
```

然后我们可以看看 `Type`，这里有三个 case（情况）

+ `Iterable<E>`
+ `(E) -> K`
+ `Map<K, List<E>>`

我们看到第三种情况就很显眼地需要读另一个相同形式的 `Type`。

```plain
Type = Name   -- T, E, K, V, ...
  | (Name angleL Type {comma Type}? angleR)
  | (parenL Name {comma Name}? parenR "->" Type)
comma = ','
angleL = '<'; angleR = '>'
parenL = '('; parenR = ')'
```

定义完了，如果你很好奇 `Map<K, List<E>>` 怎么读，就是在 `L` 这个字符的时候继续等待读另一个 `Type` 的结果嘛。

```plain
Block = "TODO"
```

待会再定义 `Block` 是什么样子的，现在为时尚早。

## 那么你还能干什么呢

<div class="literateBegin" id="WTFCanUDo"></div>

读它们啊？而且是要能以子程序方式组合的。比如读 `"hello world"` 其实可以分成三部分：读 `"hello"`、读空格、读 `"world"`，这样输入中间再多几个空格都没问题了，代码也好看好改。

可是…… 总有些东西好像不对劲，该怎么把『读』的过程分布到几个子程序里去做呢？

很简单啊！比如上面的例子里，读空格是在读完一个 `"hello"` 的情况下进行的，换句话说，它知道自己应该从 `"hello"` 后的那个空格开始读了。我们用 `CharIterator` 吧，上面有 `hasNext():Boolean` 和 `next():Char`。

不过，这里我们想得更前卫，完全使用泛型抽提接受的输入流类型。

不仅仅这样，我们还利用异常系统而不允许直接判断是否 `hasPeek`，有点类似 Python 和 Ruby 的 `StopIteration`。

```kotlin
interface Feed<out T> {
  val peek: T
  fun consume(): T
  class End(): Exception("no more inputs")
}
```

为了让子程序可以判断是否接受某字符开头的词、不接受也不影响别人判断，如对模式 `("apple"|"blueberry"|"cucumber")`，
我们把对数据的读取分为两部分——预取<sub>peek</sub>和消耗<sub>consume</sub>，
预取仅用于判断是否接受字符，消耗时如果输入已经结束，抛下一个异常。

```kotlin
class IteratorFeed<T>(private val iterator: Iterator<T>): Feed<T> {
  private var lastItem: T = iterator.next()
  private var tailConsumed = false
  override val peek: T get() = lastItem
  override fun consume(): T = peek.also {
    if (iterator.hasNext())
      lastItem = iterator.next()
    else if (!tailConsumed)
      tailConsumed = true
    else
      throw Feed.End()
  }
  override fun toString() = "IteratorFeed(${lastItem.rawItem()}...${iterator})"
}
```

我们把接受一个 `Feed<T>`、返回某种 `R` 的东西称为『<a id="Parser">解析器</a>』，因为它能够从 `T` 的序列里，提取出数据 `R`，比如从一串符号 `"123"` 里阅读出数值 `123`。

```kotlin
interface Parser<T, out R> {
  fun read(s: Feed<T>): R?
} // 本节仅阐述概念，不写实例了。
```

而有的时候，我们只是想让 `Parser` 对输入的 `Feed` 进行一些操作如跳过空格，并不希望获得一个输出值，正如 Java 里 `void` 函数一样。

使用 `Parser<Unit>` 的话，其中的 `read(Feed<T>):R` 就是 `read(Feed<T>):Unit` 了，刚刚好。（`kotlin.Unit` 这里类似 Java 的 `void`）

这时候我们灵感突发：如果要读（也可跳过）空格怎么办？就是判断+读取、到预取不是空格为止啊！这样下一次、下一个解析器读取时，不就没空格了吗？

但是仅仅对是不是空格的情况设计，太大材小用了，我们应该提取出数学命题，

```kotlin
typealias Predicate<T> = (T) -> Boolean
```

——不过是它的简化版，我们称之为『谓词』或者说『条件』，比如 `我(主)爱(谓)你(宾)`，那是一个可以照变量 _你、我_ 判断真假的「爱」命题。

```kotlin
fun <T> Feed<T>.peekWhile_1(predicate: Predicate<T>): List<T> {
  val satisfied: MutableList<T> = mutableListOf()
  while (predicate(peek)) // 重复若条件对某项成立
    satisfied.add(consume()) // 把它取到列表里；检查下一项。
  return satisfied
}
```

（起名带 `_1` 是因为这不是最终版，下文皆是如此）

### 读几个单词吧

<div class="literateBegin" id="TryIteratorFeed" depend="WTFCanUDo"></div>

我们给一个例子：苹果、蓝莓、黄瓜。

```kotlin
const val FRUITY_STRING = "apple blueberry cucumber"
val fruits = IteratorFeed(FRUITY_STRING.iterator())
```

```kotlin
// 待会 A, B 部分要用，现在不必理解
fun readName_1(feed: Feed<Char>): List<Char> = feed.peekWhile_1 { it in 'a'..'z' }
```
<div class="literateEnd"></div>

<div class="literateBegin" id="TryIteratorFeed-A" depend="TryIteratorFeed"></div>

试一试呗，

```kotlin
fun main() {
  part1_readApple()
  part2_WhyCantSkipWhites()
}
```

```kotlin
fun part1_readApple() {
  println(fruits.peekWhile_1 { it in 'a'..'z' })
  //[a, p, p, l, e]
}
```

然后我们再提取出 `{ it in 'a'..'z' }` 这个「命题」来读 `apple` 这样的名字，怎么样？

```kotlin
fun part2_WhyCantSkipWhites() {
  println(readName_1(fruits)) // 提取出这个 peekWhile_1 的逻辑成 readName_1
  //[]
  println(fruits)
  //IteratorFeed(' '...kotlin.text.StringsKt...$iterator...)
}
```

为什么不行了？好像是因为，还有一个空格…… 空格…… `(' ' !in 'a'..'z')`，所以我们 `readName` 无数遍也无法继续下去！

但，这其实是正常情况，如果不是这样，要读取空格的时候与代码命名等搞混，岂不是会出错？
<div class="literateEnd"></div>

<div class="literateBegin" id="TryIteratorFeed-B" depend="TryIteratorFeed"></div>

那么怎么解决这个问题呢？答案是，跳过我们不需要的空格。

```kotlin
fun main() {
  part3_ItWorksMaybe()
  part4_FinalParser()
}
```

```kotlin
fun part3_ItWorksMaybe() {
  try {
    while (true) {
      println(readWhitespace_1(fruits))
      //[] //[ ] //[ ]
      println(readName_1(fruits))
      //[a, p, p, l, e] //[b, l, u, e, b, e, r, r, y] //Done.
    }
  } catch (_: Feed.End) {
    println("Done.")
  }
}
fun readWhitespace_1(feed: Feed<Char>) = feed.peekWhile_1 { it == ' ' }
```

（读那个 `// [] // [ ]` 的时候请注意你读错了，是从上往下、从左往右读）

我们直接循环（重复）读取了，因为余下 `" blueberry cucumber"` 正好是 `{ws Word}` 的形式。

（其实，这就组合出了一个用来读取的『解析子程序』）

这里 `ws` 是 `Whitespace` 的意思，一般而言 `Whitespace` 和 `Newline` 是非常特殊的字符，所以我给起的名字也很特殊。

等等…… 如果读完 `cucumber` 再读 `ws` 已经失败了会怎么样？会抛出 `Feed.End` 异常啊，于是我们这不是处理了吗？看看。

好像有点不对？`cucumber` 去哪了？噢…… 原来我们还没给 `peekWhile` 加上异常处理，加上就好了：

```kotlin
fun <T> Feed<T>.peekWhile_2(predicate: Predicate<T>): List<T> {
  val satisfied: MutableList<T> = mutableListOf()
  while (predicate(peek))
    try { satisfied.add(consume()) }
    catch (_: Feed.End) { break }
  return satisfied
}
```

~~具体的原因是 `peekWhile_1` 在判断并添加 `"cucumber"` 最后一个 `'r'` 后，我们的 `Feed` 会再多给出一次 `'r'`，但这个 `r` 在 `consume()` 时会抛异常代表它实际上不存在、不可取。~~

最后我们终于得到了一个成品，

```kotlin
fun part4_FinalParser() {
  val fruits2 = IteratorFeed(FRUITY_STRING.iterator())
  for (_t in 1..3) {
    println(readWhitespace(fruits2))
    //[] //[ ] //[ ]
    println(readName(fruits2))
    //[a, p, p, l, e] //[b, l, u, e, b, e, r, r, y] //[c, u, c, u, m, b, e, r]
  }
}
fun readWhitespace(feed: Feed<Char>) = feed.peekWhile_2 { it == ' ' }
fun readName(feed: Feed<Char>): List<Char> = feed.peekWhile_2 { it in 'a'..'z' }
```
<div class="literateEnd"></div>

正常多了，可是我们得到的 `[a, p, p, l, e]`（一个字符列表）和原来的 `"apple"` 完全不是一个东西，怎么处理？

> 其实可以用 `a_p_p_l_e.joinToString("")` 拼回原名，但下节内容远远不止于这一点。

上面我们早就知道要读取 3 个单词，可如果我们不知道，要怎么动态判断何时停止呢？

现在没异常了，只能判断 `peekWhile` 取到的列表是否为空啊！要定义新变量，真麻烦……

还有，我们在读空格的时候和读名字的时候用的都是 `peekWhile`，但谈到『读取是否成功』，对空格来说返回列表 `[]` 也是成功的，对名字来说 `[]` 却表示失败！

我们可以把这种判断『硬编码』在程序里，但那样会让代码更难看、更不规范。

为了实现一个解析器，要写许多比这复杂许多倍的子程序，我们怎么解决那时代码的繁复性？

__欲知方法如何，请看下节分解。__

### 给 `Feed` 的一些辅助类

下面是一些关于本节内容定义的辅助类，其含义及食用方式请自己扩散思维，举例理解。

```kotlin
fun <T> T.rawItem(): String = toString().escape().let {
  if (it.length == 1) it.surround("'", "'")
  else it.surround("\"", "\"")
}
fun String.escape(): String = translate(KOTLIN_ESCAPE)
fun String.translate(map: Map<Char, Char>, prefix: Char = '\\'): String = fold (StringBuilder()) { acc, c ->
  map[c]?.let { acc.append(prefix).append(it) } ?: acc.append(c) }.toString()

val KOTLIN_ESCAPE = mapOf( // \t\b\n\r\"\'\$\\
  '\t' to 't', '\b' to 'b',
  '\n' to 'n', '\r' to 'r',
  '"' to '"', '\'' to '\'',
  '$' to '$',
  '\\' to '\\'
)
fun String.surround(prefix: String, suffix: String): String = prefix+this+suffix
```

关于转义符，请参阅 [Kotlin Grammar: EscapedIdentifier](https://kotlinlang.org/docs/reference/grammar.html#EscapedIdentifier)。

上面的 `escape`、`translate` 是定义着玩的，不要用它实际组织输出 Kotlin 代码，不兼容的（虽然兼容也不用再改太多，只要 `Map<Char, (Char) -> String>` 足矣）。

下面是另一种基于 `CharSequence` 的 `Feed<Char>` 实现：

```kotlin
class StringFeed(private val seq: CharSequence): Feed<Char> {
  private var position = 0
  override val peek: Char get() = try { seq[position] }
    catch (_: IndexOutOfBoundsException) { seq[position.dec()] }
  override fun consume(): Char = try { seq[position++] }
    catch (_: IndexOutOfBoundsException) { throw Feed.End() }
}
```

注：一般而言基于控制结构的编程 `i++` 不是好实践方式，它与 `++i` 一样，都会顺带让 `i=i+1`，
~~但 `i=0; xs[i++]` 是 `xs[0]`、`i=0; xs[++i]` 则是 `xs[1]`。~~

> 至于为什么要两个 `try catch`，考虑一下 `seq="abc", position=2` 也即指在 `'c'`，
`consume()` 时得到 `'c'`，但下一次 `position=3` getPeek 就会抛出异常，而我们认为 `peek` 不能抛出异常。

如果我们把 `peek` 抛出的异常捕获，它就不会把异常直接抛给使用它的算法了（没有 `hasPeek():Boolean` 真麻烦！）

但 `consume()` 完最后一项后如何 `throw Feed.End()` 呢？答案是，只要保护住 `peek` 在正好 `position=lastIndex+1` 时不抛，`consume()` 自然会在稍后抛出异常的，捕获住统一化就好了。

思路不错，可是只能解决字符串读取的问题，如果要写一个 `Array<out String>` 的解析器呢？

其实它们有个共同点，就是都类似于列表，于是我们可以抽象出一个 `Slice<E>`。

```kotlin
typealias Idx = Int // index number
typealias Cnt = Int // counted number like length, size
```

上面引入一些优化代码可读性的类型别名<sub>typealias</sub>

我们认为，任何有『索引』的东西都有『大小』也即属于 `Sized`。

```kotlin
interface Slice<out E>: Sized {
  operator fun get(index: Idx): E
}
```

它依赖的类型 `Sized` 定义如下：

```kotlin
interface Sized {
  val size: Cnt
}
```

自然可以弄出许多类似 `kotlin.collection.List` 上的扩展属性<sub>extension property</sub>

```kotlin
val Sized.isEmpty get() = size == 0
val Sized.isNotEmpty get() = size != 0
val Sized.lastIndex get() = size.dec()
val Sized.indices get() = 0..lastIndex
```

当然，我们也可以扩展出 `MutableSlice<E>` 或者带 `operator fun get(indices: IntRange): Slice<E>` 的 `Slice<E>`，但这里没有任何必要。

记住，编程只在必要时引入对问题的解决方案，尽可能把和特有逻辑无关的东西放在别处，不能都混在一起。

换句话说，能够泛化<sub>generialize</sub>的东西要懂得泛化，表述有主次有结构，
这也是泛型<sub>generics</sub>或者说参数化多态<sub>parametric polymorphism</sub>、闭包<sub>closure</sub>、
协程<sub>coroutine</sub>、序列<sub>sequences</sub>乃至高级程序设计语言本身设计最重要的理念。

```kotlin
fun slice(char_seq: CharSequence): Slice<Char> = object: Slice<Char> {
  override val size: Cnt get() = char_seq.length
  override fun get(index: Idx): Char = char_seq[index]
}
fun <E> slice(array: Array<E>): Slice<E> = object: Slice<E> {
  override val size: Cnt get() = array.size
  override fun get(index: Idx): E = array[index]
}
fun <E> slice(list: List<E>): Slice<E> = object: Slice<E> {
  override val size: Cnt get() = list.size
  override fun get(index: Idx): E = list[index]
}
```

这样就可以写出能够兼容更多 `ArrayLike`（有 `size` 和 `get` 而可随机访问的数据结构）的输入，而不仅仅 `StringFeed` 了。

```kotlin
class SliceFeed<E>(private val slice: Slice<E>): Feed<E> {
  private var position = 0
  override val peek: E get() = try { slice[position] }
    catch (_: IndexOutOfBoundsException) { slice[position.dec()] }
    //^ don't panic when position=lastIndex+1, put off to consume()
  override fun consume(): E = try { slice[position++] }
    catch (_: IndexOutOfBoundsException) { throw Feed.End() }
}
```

于是我们就有了 `IteratorFeed` 和 `SliceFeed`，可以实现普通文件解析器和类似 browser console 的 REPL。

注：REPL = Read-Eval-Print-Loop，或者说交互式解释环境。

<div class="literateEnd"></div>

## Talk is cheap, show me the code

> + 上面我们早就知道要读取 3 个单词，可如果我们不知道，要怎么动态判断何时停止呢？
> + 为了实现一个解析器，要写许多比这复杂许多倍的子程序，我们怎么解决那时代码的繁复性？
> <br>__欲知方法如何，请看下节分解。__

还记得我们之前对 `interface Parser` 的<a href="#Parser">定义</a>吗？

## 说点别的

`IteratorFeed` 在 ES6 有 `IteratorResult` 的情况下更简单，它只需要 yield 上次的 result，再 assign `iterator.next()` 到下次需 yield 的 result 即可。

```typescript
export class Peek<T> implements Iterator<T> {
  iter: Iterator<T>
  last: IteratorResult<T>
  //...hasPeek, peek
  next() {
    let oldLast = this.last;
    this.last = this.iter.next();
    return oldLast.value; //once more when iter has finished
  }
}
```

这里的实现对 `peek` 来说不是很严谨，因为最后一次 `iterator` 终末取不到 `next()` 时，会直接保留最后一个 `peek`，不过不要紧，因为 `consume()` 的时候会抛异常，上面也说了。

### 关于『阅读法』

这篇文章里教的阅读法就是所谓的『自顶向下』，因为它早就知道应该读什么结构，『顶』的实际含义是我们最开始阅读的规则、『向下』是“往单个字符读”的意思。

对应的是『自底向上』，那就有点像一个侦探了，开始不知道会给自己哪种情况的输入，随着自己的记忆和蛛丝马迹慢慢发现匹配的文法规则，一般这种都涉及数据栈而且均非手写（太难了）。

写能手写的，并把它写好是本分，写不能手写的是艺术，~~把能手写的写得跟机器生成的一样，是个人才。~~

这个阅读法其实依靠 Kotlin 对递归的支持，也是可以阅读其中可能包含自身引用规则的。如 `Accept = Something "->" Accept`。

总而言之，就叫『递归下降法<sub>recursive descent method</sub>』，相当知名的序列解析算法。Lua 等程序设计语言官方实现即采用递归下降实现文法处理部分。

在文法推导里的非终结符<sub>non-terminal</sub>的名字，上文采用 `Capitalized` 形式，除了 `ws` 和 `newline`，上面也说了。

终结符<sub>terminal</sub>的名字都是 `snake_cased` 形式。

所谓的终结符，就是最终能被判断相等性的东西，如 `currentChar == 'A'`。

其实也不一定，只要不能再被视作其它项继续阅读就可以。如 `Fruits => Apple` 的 `Fruits` 显然不是终结符，而 `Apple` 不是由其它项构成，是原子<sub>atom</sub>项，所以是终结符。

这里，我们认为单个字符就是所谓的『终结符』，其实分出『词法分析』和『文法分析』阶段也可以不把单个字符视为『终结符』，事实上那个现在还更常用。

Lex/Yacc style 说的就是 scanner/parser 词法/文法分析，分开的情况，当然对编译原理一般也可直接去掉对两个分析过程的隔离，这就是本文的 scanner-less parsing。

## 亲爱的 Literate Kotlin

看不见我看不见我~

<script src="https://unpkg.com/kotlin-playground@1"></script>

<script async src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.js" data-main="https://duangsuse-valid-projects.github.io/LiterateKt/lkt.bundle.js"></script>

## 解释一下题目是什么意思

> 看完这段 Kotlin 代码，我哭了

知不知道你在写烂代码的时候，不仅以后熬夜维护的时候内心是崩溃的，电脑也会哭？

多为使用者想想，那怕直接使用的“人”，只是按程序求解的计算机而已。

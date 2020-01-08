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

~~`out` 在作为类型参数修饰符的时候表示此类型仅用于方法或属性的输出，`in` 在相同位置的时候则表示仅用于输入~~

~~一般而言不加好像也没什么问题，但 `in`/`out` 提供了类型系统的类型兼容性(子类型)上的一些约束，从而允许更多样的使用方式，相关知识太多这里不能说清。~~

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

<div class="literateBegin" id="TryIteratorFeed-B" depend="TryIteratorFeed PeekWhile-2"></div>

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

好像有点不对？`cucumber` 去哪了？噢…… 原来我们还没给 `peekWhile` 加上异常处理，<a href="#PeekWhile-2">加上</a>就好了。

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

<div class="literateBegin" id="PeekWhile-2" depend="WTFCanUDo"></div>

```kotlin
fun <T> Feed<T>.peekWhile_2(predicate: Predicate<T>): List<T> {
  val satisfied: MutableList<T> = mutableListOf()
  while (predicate(peek))
    try { satisfied.add(consume()) }
    catch (_: Feed.End) { break }
  return satisfied
}
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

<div class="literateBegin" id="TalkIsCheap" depend="WTFCanUDo PeekWhile-2"></div>

> + 上面我们早就知道要读取 3 个单词，可如果我们不知道，要怎么动态判断何时停止呢？
> + 为了实现一个解析器，要写许多比这复杂许多倍的子程序，我们怎么解决那时代码的繁复性？
> <br>__欲知方法如何，请看下节分解。__

还记得我们之前对 `interface Parser<T, R>` 的<a href="#Parser">定义</a>吗？

还记得我们之前谈论的『模式<sub>pattern</sub>』吗？

我们并不是生来就会『编程』、生来就能识文断字，那为什么后来又能『看懂』代码、读懂文章？

靠的是『模式识别<sub>pattern recognition</sub>』，读多了自然懂得语法，再稍加分析和对应就学会了一门『语言』。

有了模式，可以针对任何输入进行『模式匹配<sub>pattern matching</sub>』，好比把从几个模具里做出来的一堆冰块试着放回本来的模具，而这个过程只有两种结果——__成功(matched)__ 或 __失败(unmatched)__。

+ __成功__ 代表你把冰块放回了对的模具，你知道要对它做什么、需要它的哪些信息。
+ __失败__ 代表你又遇到了一个新的、不认识、不属于你的冰块，什么信息都拿不到。

```kotlin
val notParsed: Nothing? = null
```

`Boolean?` 的意思是除了原 `Boolean` 的 `true`、`false` 外还可以是 `null`，`Nothing?` 以此类推。

实在不明白或者想再深入了解就去下面那个<a href="#WhatIsValue">值是什么</a>看看。

当然，成功和失败都是对于『子解析器<sub>sub-parser</sub>』而非『整体解析过程』而言的，因为我们是要『组合解析器<sub>combined parser</sub>』。

> 上面我们早就知道要读取 3 个单词，可如果我们不知道，要怎么动态判断何时停止呢？

__答案很简单，那应该是一种抽象的模式，而不是某个特定的『读取』程序。__ 那时候那么写，只是为了方便你理解而已。

```groovy
for (_t in 1..3) {
  println(readWhitespace(fruits2))
  println(readName(fruits2))
}
```

```plain
Input = {Whitespace? Word}
Word = {letter}
letter = [a-z]
```

我们来实现对 `(Whitespace? Word)` 这类模式的读取。

```kotlin
/** 按顺序读取全部 [sub] 子解析器，
  读取它们支持的 [T] 流(Feed)，收集子解析器的结果到 [R] 的 List */
class Seq_1<T, R>(private vararg val sub: Parser<T, R>): Parser<T, List<R>> {
  override fun read(s: Feed<T>): List<R>? {
    val results: MutableList<R> = mutableListOf()
    for (item in sub) {
      val parsed = item.read(s) ?: return notParsed // 若失败，此 Seq 立刻返回匹配失败
      results.add(parsed) // 否则，把结果储存起来
    }
    return results
  }
}
```

再实现对 `{a}` 这类模式的读取。

```kotlin
class Repeat_1<T, R>(private val item: Parser<T, R>): Parser<T, List<R>> {
  override fun read(s: Feed<T>): List<R> {
    val results: MutableList<R> = mutableListOf()
    var lastResult: R
    do {
      lastResult = item.read(s) ?: break
      lastResult.let(results::add)
      //= if (lastResult != null) lastResult.let(results::add)
      //= if (lastResult != null) results.add(lastResult)
    } while (lastResult != notParsed)
    return results
  }
}
```

其实以上实现应该简化，但为了开开眼界，先这么写吧。

现在我们已经可以读取 `(a b c)` 和 `{a}` 这种模式了，可还剩下 `letter = [a-z]`、`Whitespace?` 没有实现。

对于 `Whitespace?`，先不直接实现泛化的 `a?` 读取器，因为我们早就知道怎么读 `Whitespace = {whitespace}` 了，直接写吧。

```kotlin
object WhitespaceMay_1: Parser<Char, Unit> {
  override fun read(s: Feed<Char>): Unit? {
    s.peekWhile_2 { it == ' ' }
    return Unit //always parsed
  }
}
```

~~说句题外话，`fun emmm() {}` 默认返回 `Unit` 或者说 `fun emmm() = Unit`，可以不显式写出 `Unit` 返回类型，`{}` 里的 `return Unit` 是自动的。~~

对于 `[a-z]`，想想<a href="#TryIteratorFeed-B">之前</a>是怎么写的？

```kotlin
object Name_1: Parser<Char, String> {
  override fun read(s: Feed<Char>): String? {
    return s.peekWhile_2 { it in 'a'..'z' }
      .takeIf { it.isNotEmpty() }?
      .let { it.joinToString("") }
  }
}
```

<div class="literateBegin" id="KotlinNullabilityOps"></div>

差点忘了你们不知道 `?.` 是啥、`takeIf` 是啥、`let` 又是啥。

```kotlin
fun main() {
  var something: Int? = null
  check((something ?: 1) == 1)
  something = 2
  check((something ?: 1) == 2)

  println(something) //2
  something?.let { that_thing -> println(that_thing) } //2
  something?.let(::println) //2
  something?.let { println(it) }
  something?.let { it -> println(it) } // it argument can be implicit
  null?.let { _ -> error("This block is never called") }

  check(1.takeIf { it is Int } != null)
  check(1.takeIf { it == 100 } == null)
  // (1 == 100) is false, and 1.takeIf {...} is null
  // so the { fail() } block is not called
  1.takeIf { it == 100 }?.let { error("not possible") }
}
```
<div class="literateEnd"></div>

当然，细心的同学肯定会发现了，我们都用到了 `peekWhile` 操作，那么这个程序是否可以简化呢？

看起来不好简化吧！它们是那么复杂，稍后等我们多做点其他方面的改进，再看看。

接下来就是见证奇迹的时刻。

```kotlin
fun main() {}
```

当然，许多编程语言的语法，都是可以被拆成『通用模式』和『通用模式的特化』而解析提取的，这样利用子程序<sub>sub-procedure</sub> 抽象出它们的读取方式，就能极大地方便解析器的编写过程。

比如，<a href="#SampleCode">开头的示例</a>用到了三种括号：`<a>`、`(a)`、`{a}`。

括号的区分往往是为了语言的易读性，或是为了区分使用的子语法种类，我们在读取子语法本身过程中的目标其实是括号里的 `a`。

这种『被包围』的文法，其实就是一种模式，我们可以为它创建一个子解析器：

```kotlin
fun <T, R> Parser<T, R>.surroundBy(prefix: Parser<T, *>, suffix: Parser<T, *>): Parser<T, R>
= object: Parser<T, R> {
  override fun read(s: Feed<T>): R? {
    if (prefix.read(s) == notParsed) return notParsed
    val innerResult = this@surroundBy.read(s)
    if (suffix.read(s) == notParsed) return notParsed
    return innerResult
  }
}
```

上面的 `Parser<T, *>` 表示『接受 `T` 流、返回结果是什么都可以的解析器』。

我们给它起个名字叫 `Matcher`<sub>匹配器</sub>，因为它返回 `notParsed` 表示未匹配、返回其它任何值都表示匹配。

```kotlin
typealias Matcher<T> = Parser<T, *>
```

<div class="literateEnd"></div>

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

### ~~值是什么~~

> 如果你已经知道了 `Boolean?` 的意思是除了原 `Boolean` 的 `true`、`false` 外还可以是 `null`，
并且对类型理论（虽然下面我也不想再谈太深刻的）不感兴趣，那接下来的全篇可以直接跳过。

<div class="literateBegin" id="WhatIsValue"></div>

```kotlin
fun main() {
```

Kotlin 里，我们把所有 `Boolean`<sub>真假值</sub>、`Int`、`Float`<sub>浮点数</sub>、`Char`<sub>字</sub>、`String`<sub>文本</sub> 都称为『值<sub>value</sub>』。

值，就是可以参加计算的东西，比如 `1+1` 的两个 `1` 是值，`(+)` 是接受两个值、返回一个值的计算子程序。

```kotlin
println(1+1) //2
println(1.plus(1)) //2
println(1 is Int) //true
```

对 `String` 也一样，大部分『静态类型』的编程语言都有一个重要特性——
多态重载<sub>overloading</sub>，其本质是<a href="#AboutPolymorphism">多态</a>，意味着一些不同的操作（计算）可以用相同的名字引用。

```kotlin
val name = "Alice"
println("Hello " + name + ".") //Hello Alice.
```

一般我们会把类型<sub>type</sub> 视为属从它们值的集合，如 `Boolean` 包含 `true`、`false`，`Int` 包含 `1`、`42`、`(-3)` 等等。

```kotlin
val booleans: Set<Boolean> = setOf(true, false)
val someNumber: List<Int> = listOf(1, 42, -3)
```

有些类型的所有可能值，也全都属从于另外一个类型——比如，所有 `Boolean` 都是 `Any`、所有 `Int` 也全都是 `Any`…… 也就是说，所有这些，都是『值』。

```kotlin
check(true is Any && false is Any)
check(someNumber.all { it is Any })
```

……都是值，或者说是 `kotlin.Any` 的『子类型<sub>subtype</sub>』，换句话说，如果有一个操作，或者变量能接受 `Any`，那它势必能接受所有这些 `Boolean`、`Int`、……

~~（这里 `kotlin.Any` 是一个带点号的名字，称为全称名<sub>qualified name</sub>，大概就是能把南极企鹅非洲企鹅分清的那个『全称』）~~

```kotlin
fun someOperation(value: Any) {
  println("Value ${value.toString()} at ${value.hashCode()}")
}
check(::someOperation is (Any) -> Unit)

for (num in someNumber) someOperation(num) // 给 (Any) -> Unit 以整数
for (bool in booleans) someOperation(bool) // 给 (Any) -> Unit 以真假
```

__刚才我们看到的 `Nothing` 如果视作集合，是一个空集__，在 Kotlin 里，一个返回 `Nothing` 的子程序，实际上不可能返回，如 `System::exit`。

```kotlin
fun impossible(): Nothing = throw IllegalStateException()
lateinit var cantBeGot: Nothing
try { cantBeGot = impossible() }
catch (_: Exception) { println("See? Isn't any value here.") }

try { System.exit(throw IllegalStateException()) }
catch (_: Exception) { println("See? System::exit isn't called actually.") }
```

也正因类型是 `Nothing` 的表达式实际求值时总是导致程序抛出异常，或直接退出而永远不能拿到它们的值，__它可以被认为是任何类型的子类型__，
因为对类似 `fun operate(x: Nothing): WTF` 这样操作的实际调用根本不可能发生。

`Nothing?` 乃至 _forall `T`._ `T?` 的意思是 `(T|null)`，表达一个类型，属从它的值可能是任意属从 `T` 的值或者 `null`，如 `Int?` 可以是 `1` 或 `null`。

```kotlin
check(1 is Int  && null !is Int)
check(1 is Int? && null is Int?)
```

`p && q` 表示 `p 且 q`、`||` 则是「或」的意思，注意这里没有反向推导，但不代表计算机不能 [反向计算](https://codon.com/hello-declarative-world)。

`Nothing` 是 `Nothing?` 的子类型，也可看作子集，所有 `Nothing` 的值都属从 `Nothing?`，所以所有接受 `Nothing?` 的地方也能被提供 `Nothing`。

超集 `Nothing?` 就比 `Nothing` 多个 `null`。

```kotlin
} // 上面『值是什么』讲完了
```

如果有一个操作能输出 `Boolean`，那它输出的也即属从 `Any`，并且它本身也可以在任何需要函数类型 `() -> Any` 的地方被提供，`in`/`out` 也就是这个意思。~~这里不想再细讲了……~~

```kotlin
interface FunctionType<in T, out R>
fun <T, R> FunctionType(_op: (T) -> R) = object: FunctionType<T, R> {}

// "*" 在 out 的位置代表 Any?，任何类型的亲类型
fun acceptCharSeq(someFunc: FunctionType<String, *>) {}
// "*" 在 in 的位置代表 Nothing，任何类型的子类型
fun resultNumber(someFunc: FunctionType<*, Number>) {}

fun typeIsOkHere() {
  check(Unit is Unit) // 叫 "Unit" 的既可能是一个值，也可能是一个类型（多态）
  check((1 as Int) is Number) // Int 是 Number 的子类型
  check(("emmm" as String) is CharSequence) // String 是 CharSequence 的子类型

  // 如果一个函数能输出值属从 Number 的 Int，那它自然可以视为能输出 Number
  // 所以，任何需要 () -> Number 的位置都可以提供一个 () -> Int
  resultNumber(FunctionType<Unit, Int> { _: Unit -> 1 })

  // 如果一个函数连 CharSequence 都能接受，那它自然能接受值属从 CharSequence 的 String
  // 所以，任何需要 (String) -> * 的地方反而都可以给一个 (CharSequence) -> *
  acceptCharSeq(FunctionType<CharSequence, Unit> { _: CharSequence -> println() })
}
```
<div class="literateEnd"></div>

#### 关于多态

<div class="literateBegin" id="AboutPolymorphism"></div>

```kotlin
fun main() {
```

```kotlin
println("hello " + "world") //hello world
println(1 + 2) //3

//println(String::plus) //fun kotlin.String.plus(kotlin.Any?): kotlin.String
//val intPlus: (Int, Int) -> Int = Int::plus
//println(intPlus) //fun kotlin.Int.plus(kotlin.Int): kotlin.Int
```

这里正好有个反例——许多数学子领域就没有这种特性，如集合论——有一些基础计算 交集、并集、补集。

对于并集来说，很多人感觉它像是 `A+B`，集合论则是自己又创建了一套『数学操作符』。

```kotlin
// (∪) Union of sets
println(setOf(1) + setOf(2)) //[1, 2]
// (∩) Intersection of sets
println(setOf("cat").intersect(setOf("mouse"))) //[]
// ∁(A,B) Complement of A,B
println(setOf("monkey", "apple", "banana") - setOf("monkey")) //[apple, banana]

println('?' in "How are you Alice?") //true
println(1 in 0..9) //true
println(1 in setOf(6, 7)) //false
```

还有逻辑上的 且、或、非：

```kotlin
// (∧): Logical AND
println(true and true) //true
println(true and false) //false

// (∨): Logical OR
println(true or false) //true
println(false or false) //false

// ¬_: Logical NOT
println(!true) //false
println(!false) //true
```

在计算机和微电子领域常用二进制，也有叫『且、或』的二进制计算，我们称为『位运算<sub>bitwise operation</sub>』。

```kotlin
fun bitPrintln(i: Int) = println(i.toString(2))

bitPrintln(0b01 and 0b10) //00
bitPrintln(0b11 and 0b10) //10

bitPrintln(0b11 or 0b00) //11
bitPrintln(0b10 or 0b01) //11
```

（上文的 `0bXX` 是 Kotlin 里对二进制数值的一种写法）

（当然，我们知道二进制、十进制实际上只是表达整数的『位置计数法』而已，数字的加减乘除运算、比较大小和相等性才是实际『数』的抽象，换算只存在于文本表示上）

再谈下去就扯远了…… 现在还不是时候。

```kotlin
}
```
<div class="literateEnd"></div>

## 亲爱的 Literate Kotlin

看不见我看不见我~

<script src="https://unpkg.com/kotlin-playground@1"></script>

<script async src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.js" data-main="https://duangsuse-valid-projects.github.io/LiterateKt/lkt.bundle.js"></script>

## 解释一下题目是什么意思

> ## 《看完这段 Kotlin 代码，我哭了》

知不知道你在写烂代码的时候，不仅以后熬夜维护的时候内心是崩溃的，电脑也会哭？

多为使用者想想，那怕直接使用的“人”，只是按程序求解的计算机而已。

另外，写这篇文章花了我好长时间，眼睛疼，难受得都快哭了，嘤嘤嘤。

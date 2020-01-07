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
```

<div class="literateEnd"></div>

我们如何让计算机可以『阅读』并『理解』以上代码？

阅读的方法很简单，和我们一样，按字、词读就好了，不过一般情况计算机只能按字来读呢。

怎么个读法？我们需要知道一种叫『模式(pattern)』的东西，大家在写正则的时候往往会用到。

一些程序员不知道正则可以 group 出值，如 `/^hello (.*)$/` 可以从 `hello world` 解出 `(.*)` 代表的 `world`，而且还能 backref，在接下来的序列里能使用 `\1` 再引回来，十分不得了。

其实正则是很高级的，什么有穷无穷、可确定不可确定状态机啦，这里不谈那么高大上的东西。

但我们这里不用，我们用一些平凡的表示法，比如，

+ `a b c` 表示顺序出现
+ `a|b|c` 表示可能是这些情况之一
+ `{a}` 表示重复出现
+ `a ~t` 表示重复直到 `t`
+ `a?` 表示可选项目

之后我们就可以描述一下上面的代码，归纳出它的语法。

```plain
Fun = "fun" TypeParameters Type "." Name FormalParameters ":" Type Block
TypeParameters = "<" Name {"," Name}? ">"
FormalParameters = "(" NameType? {"," NameType}? ")"
NameType = Name ":" Type
Name = [A-Za-z] {[A-Za-z0-9_]}?
  | [A-Za-z_] {[A-za-z0-9_]}? [A-za-z0-9]
```

然后那个 `Name` 定义有点复杂，是因为 `_, __, ___` 这样全下划线的名字不能用，是吧。

然后我们可以看看 `Type`，这里有三个 case（情况）

+ `Iterable<E>`
+ `(E) -> K`
+ `Map<K, List<E>>`

我们看到第三种情况就很显眼地需要读另一个相同形式的 `Type`。

```plain
Type = Name   -- E, K
  | Name "<" Type {"," Type}? ">"
  | "(" Name {"," Name}? ")" "->" Type
```

定义完了，如果你很好奇 `Map<K, List<E>>` 怎么读，就是在 `L` 这个字符的时候继续等待读另一个 `Type` 的结果嘛。

```plain
Block = "TODO"
```

明天再说 `Block` 是什么样子的。

## 那么你还能干什么呢

<div class="literateBegin" id="WTFCanUDo"></div>

读它们啊？而且是要能以子程序方式组合的。比如读 `hello world` 其实可以分成三部分：读 `hello`、读空格、读 `world`，这样输入中间再多几个空格都没问题了，代码也好看好改。

可是…… 总有些东西好像不对劲，该怎么把『读』的过程分布到几个子程序里去做呢？

很简单啊！比如上面的例子里，读空格是在读完一个 `hello` 的情况下进行的，换句话说，它知道自己应该从 `hello` 后的那个空格开始读了。我们用 `CharIterator` 吧，上面有 `hasNext():Boolean` 和 `next():Char`。

不过，这里我们想得更前卫，完全使用泛型抽提接受的输入流类型。

不仅仅这样，我们还利用异常系统而不允许直接判断是否 `hasPeek` ，这有点类似 Python 和 Ruby 的 `StopIteration` 异常。

```kotlin
interface Feed<out T> {
  val peek: T
  fun consume(): T
  class End(): Exception("no more inputs")
}
```

为了让子程序可以判断是否接受某字符开头的词、不接受也不影响别人判断，如对模式 `"apple"|"blueberry"|"cucumbre"`，我们把对数据的读取分为两部分——预取<sub>peek</sub>和消耗<sub>consume</sub>，预取仅用于判断是否接受字符，且消耗时如果输入已经结束，抛下一个异常。

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
  override fun toString() = "IteratorFeed(${lastItem}..${iterator})"
}
```

我们把接受一个 `Feed<T>`、返回某种 `R` 的东西称为『解析器』，因为它能够从 `T` 的序列里，提取出数据 `R`，比如从一串符号 `"123"` 里阅读出数值 `123`。

这时候我们灵感突发：如果要读（也可跳过）空格怎么办？就是判断+读取、到预取不是空格为止啊！这样下一次、下一个解析器读取时，不就没空格了吗？

但是仅仅对是不是空格的情况设计，大材小用了，我们应该提取出数学命题——不过是它的简化版，我们称之为『谓词』，比如 `我(主)爱(谓)你(宾)`，这是一个可以照变量 _你、我_ 判断真假的「爱」命题：`Predicate<PairPerson>`。

```kotlin
typealias Predicate<T> = (T) -> Boolean
fun <T> Feed<T>.peekWhile1(predicate: Predicate<T>): List<T> {
  val satisfied: MutableList<T> = mutableListOf()
  while (predicate(peek))
    satisfied.add(consume())
  return satisfied
}
```

（起名带 `1` 是因为这不是最终版）

<div class="literateBegin" id="TryIteratorFeed" depend="WTFCanUDo"></div>

试一试呗，

```kotlin
const val FRUITY_STRING = "apple blueberry cucumber"
fun main() {
  val fruits = IteratorFeed(FRUITY_STRING.iterator())
  println(fruits.peekWhile1 { it in 'a'..'z' })
  //[a, p, p, l, e]
  brabrabra(fruits)
}
```

然后我们再提取出 `{ it in 'a'..'z' }` 这个「命题」来读 `apple` 这样的东西怎么样？

```kotlin
fun brabrabra(fruits: Feed<Char>) {
  println(readName1(fruits))
  //[]
  println(fruits)
  //IteratorFeed( ..kotlin.text.StringsKt...$iterator...)
  finallyReads(fruits)
}
fun readName1(feed: Feed<Char>): List<Char> = feed.peekWhile1 { it in 'a'..'z' }
```

为什么不行了？好像是因为，还有一个空格…… 空格…… `!in 'a'..'z'`，所以我们 `readName` 无数遍也无法继续下去！

但，这其实是正常情况，如果不是这样，要读取空格的时候与代码命名等搞混，岂不是会出错？

```kotlin
fun finallyReads(fruits: Feed<Char>) {
  try {
    while (true) {
      println(readWhitespace_1(fruits))
      //[ ] //[ ]
      println(readName1(fruits))
      //[b, l, u, e, b, e, r, r, y] //Done.
    }
  } catch (_: Feed.End) {
    println("Done.")
  }
  fixedParser()
}
fun readWhitespace_1(feed: Feed<Char>) = feed.peekWhile1 { it == ' ' }
```

我们直接循环读取了，因为余下 `" blueberry cucumber"` 正好是 `{ws Word}` 的形式。

这里 `ws` 是 `Whitespace` 的意思，一般而言 `Whitespace` 和 `Newline` 是非常特殊的字符。

等等…… 如果读完 `cucumber` 再读 `ws` 已经失败了会怎么样？会抛出 `Feed.End` 异常啊，于是我们这不是处理了吗？看看。

好像有点不对？`cucumber` 去哪了？噢…… 原来我们还没给 `peekWhile` 加上异常处理，加上就好了：

```kotlin
fun <T> Feed<T>.peekWhile2(predicate: Predicate<T>): List<T> {
  val satisfied: MutableList<T> = mutableListOf()
  while (predicate(peek))
    try { satisfied.add(consume()) }
    catch (_: Feed.End) { break }
  return satisfied
}
```

最后，

```kotlin
fun fixedParser() {
  val fruits = IteratorFeed(FRUITY_STRING.iterator())
  while (true) {
    println(readWhitespace(fruits))
    println(readName(fruits))
  }
}
fun readWhitespace(feed: Feed<Char>) = feed.peekWhile2 { it == ' ' }
fun readName(feed: Feed<Char>): List<Char> = feed.peekWhile2 { it in 'a'..'z' }
```

正常多了，可是我们得到的 `['a', 'p', 'p', ...]` 和原来的 `"apple"` 完全不是一个东西，怎么处理？为了实现一个解析器要写许多比这复杂许多倍的子程序，我们怎么解决？

> 其实可以用 `a_p_p_l_e.joinToString("")` 拼回原名，但下节内容远远不止于这一点。

欲知方法如何，请看下节分解。

<div class="literateEnd"></div>

下面是一些关于本节内容定义的辅助类，其含义请自己扩散思维，举例理解。

```kotlin
class StringFeed(private val seq: CharSequence): Feed<Char> {
  private var position = 0
  override val peek: Char get() = try { seq[position] }
    catch (_: IndexOutOfBoundsException) { seq[position.dec()] }
  override fun consume(): Char = try { seq[position++] }
    catch (_: IndexOutOfBoundsException) { throw Feed.End() }
}
```

> 至于为什么要 `try catch` 两次，考虑一下 `seq="abc", position=2` 也即指在 `'c'`，`consume()` 时得到 `'c'`，但下一次 `position=3` getPeek 就会抛出异常，而我们认为 `peek` 不能抛出异常。
<br>如果我们把 `peek` 抛出的异常捕获，它就不会把异常直接抛给使用它的算法了，
但 `consume()` 完最后一项后如何 `throw Feed.End()` 呢？答案是，只要保护住 `peek` 在正好 `position=lastIndex+1` 时不抛，`consume()` 自然会在稍后抛出异常的，捕获住统一化就好了。

思路不错，可是只能解决字符串读取的问题，如果要写一个 `Array<out String>` 的解析器呢？于是我们可以抽象出一个 `Slice`。

```kotlin
typealias Cnt = Int
typealias Idx = Int

interface Sized {
  val size: Cnt
}
val Sized.isEmpty get() = size == 0
val Sized.isNotEmpty get() = size != 0
val Sized.lastIndex get() = size.dec()
```

```kotlin
interface Slice<out E>: Sized {
  operator fun get(index: Idx): E
}
```

当然，我们也可以扩展出 `MutableSlice<E>` 或者带 `operator fun get(indices: IntRange): Slice<E>` 的 `Slice<E>`，但这里没有任何必要。

<div class="literateEnd"></div>

## 说点别的

`IteratorFeed` 在 ES6 有 `IteratorResult` 的情况下更简单，它只需要 yield 上次的 result，再 assign `iterator.next()` 到下次需 yield 的 result 即可。

```typescript
export class Peek<T> implements Iterator<T> {
  iter: Iterator<T>
  last: IteratorResult<T>
  //...
  next() {
    let oldLast = this.last;
    this.last = this.iter.next();
    return oldLast.value; //once more when iter has finished
  }
}
```

这里的实现对 `peek` 来说不是很严谨，因为最后一次 `iterator` 终末取不到 `next()` 时，会直接保留最后一个 `peek`，不过不要紧，因为 `consume()` 的时候会抛异常。

这篇文章里教的阅读法就是所谓的『自顶向下』，因为它早就知道应该读什么结构，『顶』的实际含义是我们最开始阅读的规则、『向下』是“往单个字符读”的意思。

对应的是『自底向上』，那就有点像一个侦探了，开始不知道会给自己哪种情况的输入，随着自己的记忆和蛛丝马迹慢慢发现匹配的文法规则，一般这种都涉及数据栈而且均非手写（太难了）。

这个阅读法其实依靠 Kotlin 对递归的支持，也是可以阅读其中可能包含自身引用规则的。如 `Accept = Something "->" Accept`。

总而言之，就叫『递归下降法<sub>recursive descent method</sub>』。

在文法推导里的非终结符<sub>non-terminal</sub>的名字，上文采用 `Capitalized` 形式。

终结符<sub>terminal</sub>的名字都是 `snake_cased` 形式。

所谓的终结符，就是最终能被判断相等性的东西，如 `currentChar == 'A'`。

其实也不一定，只要不能再被视作其它项继续阅读就可以。如 `Fruits => Apple` 的 `Fruits` 显然不是终结符，而 `Apple` 不是由其它项构成，是原子<sub>atom</sub>项，所以是终结符。

这里，我们认为单个字符就是所谓的『终结符』，其实分出『词法分析』和『文法分析』阶段也可以，事实上那个还更常用。

## 亲爱的 Literate Kotlin

看不见我看不见我~

<script src="https://unpkg.com/kotlin-playground@1"></script>

<script async src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.js" data-main="https://duangsuse-valid-projects.github.io/LiterateKt/lkt.bundle.js"></script>

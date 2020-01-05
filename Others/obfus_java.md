---
title: 手工混淆 Java 与手工编写 Java 解析器
---

# 手工混淆 Java 与手工编写 Java 解析器

咸得没事的 duangsuse 刚好可以练习一下手写递归下降解析器。反正他也闲得没事嘛。

懒得写 AST Walker 工具了，有点累，而且事比较多……

或许我也是想告诉曾经的一个人，__编程是编程、代码风格是代码风格，两者不是一种东西，编程不与任何语言直接相关，甚至也都不一定和计算机有关。__

而且…… 代码风格怎么样，虽然对人来说是看不懂，对计算机可是简单得很。__我听人说，程序员是携手计算机为人类社会服务，人提供思想、计算机作为求解器提供计算能力，两者是 _朋友关系_。__

__肯定不是程序员顶着社会需求的压力为计算机服务，两者是奴才与主子的关系。__

编程应该从『朝计算机吼指令』『为计算机操碎心』『伺候程序控制流』的风气中恢复下来，走回人类思想第一的正道。并且随着非结构化编程、结构化编程、面向对象、函数式…… 的主流变迁慢慢越来越重要，Kotlin 是今日 JVM 甚至 JavaScript 开发者最好的选择，没有之一。

能把代码写得（或者刻意写得）别人看不懂，很 NB。但是更 NB 的是你写出的代码不仅别人轻而易举都能搞懂，而且 __别人最少 10 行你最多 5 行__，这就是 🐮 逼之处，这就是你『比别人优秀』的底气所在。

推荐阅读 [Hello, declarative world](https://codon.com/hello-declarative-world)，本篇文章以后也可能随便瞎放点与题目无关的东西……

当然 duangsuse 的二进制读写器项目 Binarie 还在后面待补完，暂时不能写它呢……

## 「源」代码

```java
public class Main {
  public static void main(String[] args) {
    int _o_ = 0; int _0_ = 0;
    do {
      int o_o = 5+(_0_*3);
      _o_ += o_o;
      System.out.println(o_o+"+");
      _0_++; } while (_0_ < 10);
    System.out.println("="+_o_); _o_=0;
    for (int o0o=0; o0o<10; o0o++) {
      int o_o = 5+(o0o*3);
      _o_ += o_o;
      System.out.println("+"+o_o);
    }System.out.println("="+_o_);
    _o_=0; _0_=0;

    while (_0_<10) {
      int o_o = 5+(_0_*3);
      _o_+=o_o;
      System.out.println(o_o+"+");
      _0_++;
    }

    System.out.println("="+_o_);
  }
}
```

很难看呢，当然 IDEA 里 <kbd>Shift F6</kbd> 一下子就好了，何况人家还能自动 merge `while (i<stop) {...; i++;}` 这种。

## 输入流

<div class="literateBegin" id="input-impl"></div>

我们使用的解析器「范式」是『递归下降(recursive descent)』，它『自顶向下』阅读并解构字符序列 `CharSequence` 的结构。

何谓向下？`BracedStmt = "{" Stmt "}"` 从对 `BracedStmt` 的读取，到对 `Stmt` 的读取，就是所谓的『向下』。

每个像 `BracedStmd` 这样的项，我们都为它编写一个子程序 `fun` 来实际『读取』，可是这就产生一个问题——输入如果要能够被顺序解析，就得有一个『当前读取位置』的指针，谁来维护？不可能用全局变量吧。

于是可以用 `Iterator<Char>`，但我们为了方便应该用以下数据流：

一般而言为了方便，我们会让 `PeekConsme` 在最后 `lastIndex` 的数据已经在 `peek` 后(`it+1`)时 `consume` 才抛异常（而不是在 `peek` 时抛），为了写解析器更方便，那比较麻烦。

下面的 `tailConsumed` 就是这个意思，允许你 `consume` 掉 `lastIndex` 处的项目。

```kotlin
class PeekConsume(private val input: CharSequence) {
  private var position = 0
  private var tailConsumed = false
  val peek: Char get() = input[position]
  fun consume(): Char {
    if (position != input.lastIndex)
      return input[position++]
    else if (!tailConsumed) {
      tailConsumed = true
      return input[position]
    } else throw IndexOutOfBoundsException()
  }
  override fun toString() = input.subSequence(position, input.length).toString()
}
```

否则可以这么写，但就不得不对应地修改 `takeWhile` 等辅助解析方法了。

这样的话成功 `consume` 输出 `lastIndex-1` 后，`lastIndex` 若不额外检查势必 `IndexOutOfBounds`，因为原来都是以 `position+1` 不越界作为检查使用的。

<div class="literateBegin"></div>

```kotlin
class PeekConsume(private val input: CharSequence) {
  private var position = 0
  val peek: Char get() = input[position]
  fun consume(): Char = input[position.also { input[++position] }] // check bounds before next peek
  override fun toString() = input.subSequence(position, input.length).toString()
}
```
<div class="literateEnd"></div>

（不好意思无脑用了个不良实践 `++` 表达式，别学我）

要不然就无法实现预判单字符的解析器了，因为一旦尝试只有成功，子解析器失败也无法把 `next()` 的字符放回去。

那么，何谓递归？

+ `1` 这是一个数字
+ `1+1` 这是一个加法表达式

我们知道 `out.println(x)` 对上面那三种都是有效的，猜猜怎么形式化表达他们的语法模式？

如果我们把上面那个 _x_ 里 __可以出现的东西__ 称为 _表达式_(__Expr__-ession)

+ `1` 是数字还是表达式？
+ `1+1` 是 _表达式_
+ `1+(1+1)` 是一个 _表达式_
+ 所以 `(a)` 是一个 _表达式_

总之：

```plain
Expr = [0-9]+ | ("(" Expr ")") | (Expr "+" Expr)
```

为了能接受 `(1+1)+2` 这样的输入，必须能够递归，此谓『递归下降』。

当然，JSON 解析器也是完全可以使用这种方法编写的。

至于解析器呢？我们这么认为：

```kotlin
interface Parser<R> {
  fun read(s: PeekConsume): R?
}
```

如果 `read` 返回 `null`，代表子解析器未匹配。

<div class="literateEnd"></div>

## 解析器 <sub>Kotlin Literate</sub>

<div class="literateBegin" id="parser-impl" depend="input-impl"></div>

```kotlin
sealed class Ast
```

构建一棵语法树，语法树是一种分支数据结构，
我们用 `sealed class` 这种子类仅在一个文件里确定的类型，
免得 `when` `is` 要加 `else`。

```plain
whitespace ' '|'\n'
Name [a-zA-Z_].([a-zA-Z0-9_])*
```

这里 `[a-zA-Z]` 比如 `abzABZ` 这些字符，`[a-zA-Z_]` 就是除了前面的还多一个 `'_'` 字符。

`whitespace` 是我们会在读取时跳过的字符，我们用 (A`.`B) 形式表示 __不要__ 尝试读取并略过它们。

如果你不知道啥是正则表达式，`a*` 表示项重复 `a` 但也可能没有(zero or more)、`a+` 表示项重复 `a` 至少一遍(one or more)。

```kotlin
typealias Predicate<T> = (T) -> Boolean
interface PositiveParser<R>: Parser<R> {
  override fun read(s: PeekConsume): R
}
fun PeekConsume.takeWhile(predicate: Predicate<Char>): String? {
  val sb = StringBuilder()
  while (predicate(peek))
    try { sb.append(consume()) }
    catch (_: IndexOutOfBoundsException) { break }
  return sb.toString().takeIf { it.isNotEmpty() }
}

object ws: PositiveParser<Unit> {
  override fun read(s: PeekConsume) {
    s.takeWhile { it in whitespace }
  }
  private val whitespace = setOf(' ', '\n')
}
object Name: Parser<String> {
  override fun read(s: PeekConsume): String?
     = s.takeWhile { it in namePartNoDigi }?.plus(s.takeWhile { it in namePart })
  private val namePartNoDigi = ('a'..'z').toSet()+('A'..'Z').toSet()+setOf('_')
  private val namePart = namePartNoDigi+('0'..'9').toSet()
}
```

如果你不知道什么是读取，继续看下去就会懂的。

一起来试一下能不能用。

<div class="literateBegin" depend="input-impl parser-impl"></div>

```kotlin
fun main() {
  val white1 = PeekConsume("   1")
  ws.read(white1) //skip spaces
  println(white1) //"1"
  val hello = PeekConsume("_hello1_")
  println(Name.read(hello)) //"_hello1_"
  val _1abc = PeekConsume("1abc")
  println(Name.read(_1abc)) //null
  // Name = namePartNoDigi.namePart*
  val abc1 = PeekConsume("abc1")
  println(Name.read(abc1)) //"abc1"
}
```
<div class="literateEnd"></div>

接下来我们一起冷静分析一下上文用到的 Java 语法。

```java
public class Main { …… }
```

```plain
Modifier public|static
ClassDef Modifier* class Name { ClassMember* }
```

```kotlin
enum class Modifier { Public, Static }
data class ClassDef(val modifiers: List<Modifier>, val name: String, val members: List<ClassMember>): Ast()
```

我们已经可以解析 `public class Main {}`，但还不能知道 `ClassMember` 具体包含什么。

```java
  public static void main(String[] args) { …… }
```

```plain
ClassMember MethodDef
Type Name|(Type "[" "]")
MethodDef Modifier* Type Name "(" Type Name ("," Type Name)* ")" BraceBlock
```

我不是说 `ClassMember` 只能包含 方法(methods) 定义，这里只是一个很片面的解析器示例。

其实我们也可以不写 `("," Type Name)*`，毕竟这里只有一个参数不需要重复读取。

尽管我们不知道什么是 `BrackBlock`、什么是 `Block`，我们却知道 brace 是 `{}` 这两个符号。

```kotlin
data class MethodDef(val modifiers: List<Modifier>, val type: Type, val name: String, val argDefs: List<ArgDef>, val block: Block): Ast()
sealed class Type {
  data class Named(val name: String): Type() //String, void, ...
  data class ArrayOf(val type: Type): Type() //String[], int[], ...
}
data class ArgDef(val type: Type, val name: String)
```

这里的 `Block` 实为 Compound Statement，组合语句。但是我们得先知道有何语句，比如 `if (p) stmt`、`System.out.println(……)`？

```java
    int _o_ = 0;
```

```plain
IntLit [0-9]+
Literal IntLit
VarDefInit Type Name "=" Literal
```

注意换行符也是空格。`int a=0; int b=0;` 不特殊。

可是后面也有

```java
    int o_o = 5+(_0_*3);
```

所以，我们认为 `int name = ...` 必须足够泛化。

```kotlin
sealed class ClassMember
data class Block(val _233: List<Statement>)
sealed class Statement
```

所以 Java 这门语言的语法实在是太简单了，又简单又没那么贴合人的思想，所以说“辣鸡 Jawa”。

<div class="literateEnd"></div>

```kotlin
TODO("只是一个小例子，我现在貌似还有点其他的事需要做……")
```

## 最后

懒得写了，就当是对 Literate Kotlin 的一次练手吧，平时时间的确不多，而且这个问题是可以写很久。

__我太难了！__

效果还不错，这得归功于 JetBrains 把一切做成库的开源思想，要不然我没 Kotlin Playground 用。科你太美！

在我完成『绝句』前，专门处理 Literate Kotlin 代码、转化诸如 Gradle 项目的 Kotlin 命令行工具也会被开发出来，但愿过程顺利吧。

<script src="https://duangsuse-valid-projects.github.io/Share/%E7%BB%9D%E5%8F%A5/literate_kt.js"></script>
<script src="https://unpkg.com/kotlin-playground@1"></script>

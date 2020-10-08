# 评论版机器人编写测试

这是一个 Telegram Channel 创建 inline keyboard 评论版机器人的测试，包含两部分：

1. 简单，用下方接口实现一个支持添加评论的机器人；以及用 Telegram 的 Message 存储 `Map<PrivateMsg, ChannelMsg>` 的可编辑/删除的每用户一条评论版
2. 复杂但抽象，直接用 Kotlin 编写，其使用支持代码生成的关系型多后端数据库接口，实现可编辑/删除的自由评论版；这里不实现实际部署，而是通过 mock testing 验证可用性

本文旨在 __通过于高抽象层次进行程序设计__ 的方法，结合实践设计一个可读而有趣、__附带可复用库__ 的应用程序。

这种方法会让你 __自顶向下地设计易读且可复用程序__，而不是先列举功能点，然后靠结合当前框架/平台的模型和方法逐步 _自底向上堆砌出仅仅能用的程序_；毕竟应用程序写多了，也有足够信心尝试如何提升代码质量了。

我们会用到 Kotlin/Gradle, ES6/Cloudflare Workers 技术，不过，本文也会顺带重写复刻一堆相关的小应用，用于辅助熟悉相关领域。

在此感谢相关应用的编写者，他们对知识的第一重收集利用，帮助了我们的进一步整理。

## 机器人接口

```kotlin
interface Message {
  enum class Text { Plain, HTML, Markdown }
  fun read(kind: Text): String
  fun edit(kind: Text, transform: (String) -> String)
  fun delete()
  fun replyWith(kins: Text, text: String)
}

typealias InlineKeyboard = List<List<Pair<String, String>>>
inteface Chat {
  fun post(text: String)
  fun addInlineKeyboard(kbd: InlineKeyboard)
}

data class PosMessage(val chat: Chat, val msg: Message)
inteface TelegramBot {
  fun onCommand(pmsg: PosMessage, argv: List<String>)
  fun onInlineCallback(pmsg: PosMessage, data: String)
  fun onMessage(pmsg: PosMessage)
  fun onMessageChanged(pmsg: PosMessage)
}
interface Telegram {
  data class BotInfo(val username: String, val token: String) {
    companion object Factory { fun parse(s: String): BotInfo; fun loadFromEnv(name: String = "TG_BOT_INFO"): BotInfo }
  }
  fun attach(bot: TelegramBot, info: BotInfo)
}
```

这些只是实现业务流程所需的必须抽象，还没有加入异步支持与平台特化。

另外，上仅 Bot 所需接口， Telegram 平台所必须的抽象是这些：

```kotlin
data class BotInfo(val username: String, val token: String)

interface Telegram {
  fun attach(bot: TelegramBot, info: BotInfo)
}
```

### 实际化

我们只是凭空臆想了 API 的样子，不一定和 bot 扩展设计者的想法兼容，验证下几个关键点：

1. 异步。目前没有查询式方法，所有变更方法可以从 `Unit` 换为返回某种 `Task` ，在 `TelegramBot` 上定义 `Task.unaryPlus` 来添加到任务队列
2. Inline Keyboard 的建模。根据 [EncoderBot](https://github.com/Trumeet/EncoderBot/blob/master/src/main/kotlin/moe/yuuta/encoderbot/EncoderBot.kt#L52) 的代码，我们的抽象需把 `addInlineKeyboard` 的 `add` 变成 `with`(reply markup)。
3. Inline Keyboard 的回调方法。根据上链接，我们缺了一个 `AnswerCallbackQuery` 的 ，这似乎能在客户端上显式一个短时消息，不过这里不会用到。
4. `Chat` 是否可以并入 `Message`。 看起来是可以的。

我们的抽象比底层库的抽象用了更少的 Builder 模式以及配置特例(enableMarkdown)，这可能因为底层库采用了自动代码生成，不方便提供数据参数列表或为减少临时属性。

> 为什么有 `PosMessage` 这种没意义的麻烦数据类？

这是自顶向下设计容易进入的误区，过分强调直觉感受到的结构——但请注意：失败是有价值且不可避免的，通过多次重写或参照同类代码，可以避免类似误解的产生。

最开始通过对客户端使用上直觉，应该意识到有 `onMessage(chat, msg)`，为简化 `override fun` 定义可以合并成 `PosMessage(chat, msg)` 的形式；但从 bot handler 的角度看，整个传递的是有 `chat` 的 `Message` 信息。

## 初建 Telegram Bot

创造来源于不完全的复制。许多人以为「复制」「逆向工程」是对编程的侮辱，实际上对我来说，编程只是重写「未知源代码的新程序」的代码而已，编写者理应在头脑里基于他对接口的想象或实际接口能够执行编程、思考探索到的关键细节；毕竟，__编程是一件无关语言、无关平台的，“编译期”的事情__。

既然我们已经了解 JVM+lib/Webworker JS 里机器人的差别，为何不把 [EncoderBot](https://github.com/Trumeet/EncoderBot/blob/master/src/main/kotlin/moe/yuuta/encoderbot/EncoderBot.kt#L52) 和 [KickNewMemberBot](https://gist.github.com/moesoha/feb6041b85cc7a9a960ff333d5220677) 以 Kotlin/multipaltform 重写一下？

重写会让你更深刻地明白应用程序特性的组成部分、了解相关 API 如何实现，并且它也是测试属于你自己的抽象框架的最好方法。

提示：你可能需要为 JS 寻找另外的 `base64`, `qr` 生成库；同时要实现 `ResourceBundle` 的工厂方法 `getBundle(name)` 和实例 `getString(name)` 以支持 i18n 。

## 关系型数据库描述语言

关于关系型数据库，很多人不理解这个『关系』的含义，不怪他们，因为『关系型』本身就是十分隐晦的——它靠 id 和数据列里的外键(foreign key) 建立，再靠极度模板化的 SQL 查询语句被读取；而这类数据库本身只是许多 Table——包含多行，行代表单条关系『记录』、行上的列代表其属性或外键——而已。

关于 ORM(Object Relational Mapping)，我们知道这个技术在 Java EE 里被称为 "Data Persistence"，并且有 Hibernate 等流行实现；有 JSR 定义了 `@OneToOne`, `@OneToMany` 等字段声明来定义其对象关系（即便可读性十分不佳）。

DSL(domain specific language) 现在越来越流行，诸如 Server-side 的 template laguage, expression language 也都属此大类。

利用 DSL，你可以让程序员免于 XML 和 Annotation reflect 的繁琐隐晦，而且它与现代 JVM 构建系统是兼容的——著名 Android 库 butterknife 就利用了能实现 DSL 的 `javax.annotation.processing.AbstractProcessor` codegen。

相比于在 Gradle 等构建系统里添加 `dependsOn File` / `doLast` 的 task ，利用 Annotation Processor 的代码生成更具可移植性、可以添加错误提示，且为许多服务框架及 Kotlin 所支持。

实现例比如这个 [Vertx. Event Bus codegen](https://gist.github.com/cpdyj/34f77d3bd56903247dc2a9e92196c6eb)

我们要定义的语言目标是生成带 equals/hashCode/toString 的包装 `class` ，它类似这样：

```plain
typealias Age = Byte -- Comment
Human(key $name:String, isBoy:Boolean, :Age) hasMany
Finger(name:String)
Human hasOne Head(hairColor:String, faceValue:Int)
```

这个语言主要为简洁性考虑，支持 `typealias`，允许 `$name`(可变)和 `:Age`(自动名)，并且允许混用记录类型的定义和引用——换到 Java 里就是你可以写 `(int a = 2) + 2 == 4` 这种。

在 Telegram Bot 里应用此技术看起来非常扯淡，但灵感正是来源于普通的设计期间，抓住灵感需要勇气和宽广的心。

## 关系型数据库描述语言-实现细节

生成结果，比如上例（略过 equals/hashCode/toString）：

```kotlin
class Human(private val rid: ID) {
  var name: String get() = rDB.getAttr(rid, "name")
    set(v) { rDB.setAttr(rid, "name", v) }
  //isBoy, age
  val fingers: Iterable<Finger> get() = findFingers() ?: errorNotFound("Human", "Finger", Relation.Multipled)
  fun findFingers() = rDB.getMany(rid, "finger")
  fun save() = rDB.save("human", rid)
  fun remove() = rDB.remove("human", rid)
  companion object {
    fun of(name: String, is_boy: Boolean, age: Age) = rDB.create(::Human, name, is_boy, age)
    fun ofName(name: String) = rDB.getByKey("human", name)
    val list: Iterable<Human> get() = rDB.list("human")
  }
}

class Finger(private val rid: ID) {
  //name
  val human get() = findHuman() ?: errorNotFound("Finger", "Human", Relation.Paired)
  fun findHuman() = rDB.getOne(rid, "human")
  //
}

//Head
```

我们知道一共有三种数量级关系：

1. 1:1，比如每人都有一只鼻子
2. 1:N，比如每人都有十根手指
3. N:N，比如小明是肖战的粉丝；小红也是肖战的粉丝(此时还是反向 N:1)；除了肖战小红还是蔡徐坤的粉丝

数量级关系有交换律，这在生成代码时容易让人无所适从，所以我们称 `A hasXXX B` 里 A 为 _subject_；B 为 _related_。

在这门语言里， `hasOne` 和 `hasMany` 在某些情况下是可以互换的，但这并不意味着它们等价对方：

+ hasOne 的关系是可变(`var related`)的，并且其 `related` 方除了 `find[Subject]s` 外还有不加 `-s` 的单数版本(对应 1:1)
+ hasMany 有 `add(related)` 方法

综上所述，如果关系是可变的，那就只能用 hasOne 描述，然后手动 `val e = Finger.of("无名指")` 并 `Human.of().add(e)` 

## 关系型数据库建模

我们的语言要足够抽象，所以它要能够支持 `java.util.collection`,  SQLite, MongoDB 等多后端（不然创建它就和其它 ORM 框架一样，这没有意义）

幸运的是，只要基础的关系型查询模型在，模型可以在多个后端上实现。作为一个全局变量 `RelDatabase` 即可允许依据构建依赖的不同而连接到不同后端。

这个特性可以支持，但该如何建模？

```kotlin
lateinit var rDB: RelDatabase
typealias ID = Any
typealias DType = String

enum class Relation { Paired, Multipled }
interface RelDatabase {
  fun initSchema(vararg relations: Triple<DType, DType, Relation>)
  fun getOne(id: ID, subj: DType): ID
  fun setOne(id: ID, subj: DType, item: ID): ID
  fun getMany(id: ID, subj: DType): Iterable<ID>
  fun addMany(id: ID, subj: DType, item: ID)
  fun list(type: DType): Iterable<ID>
  fun getByKey(type: DType, key: Any)
  fun save(type: DType, id: ID)
  fun remove(type: DType, id: ID)
  fun getAttr(type: DType, id: ID, attr_name: String): Any?
  fun setAttr(type: DType, id: ID, attr_name: String, value: Any?)
  fun <T> create(type: (ID) -> T, vararg attributes: Any?): T
}
```

### 优化

这个模型通过包装 `ID` （可能是真的 ID ，也有可能是 `Map` 类的对象）工作，非常好。但有一点：没有必要搞得像 Java EE 一样，允许 "detach", "save" 等等；所有数据的实例，实际上只需要在 setAttr 时更新，在创建时填充即可。

不然的话，允许创建不在数据库里的数据实例，势必在实现后端时包括一个未保存的缓冲区，加之我们的框架没有给 attribute 以编号信息，同步较为复杂。

```kotlin
typealias ID = Any
interface DType {
  val name: String
  fun create(values: Array<Any?>): Any
}

interface RelDatabase {
  //fun save(type: DType, id: ID)
  fun <T> create(type: DType, vararg values: Any?): T
}
```

我们替换了包含构造函数的 `DType` ，所以 `RelDatabase` 将可以把结果行自动封装为目标数据类型；而目标的属性更新时，也可以通知到数据库接口。

考虑到基于 `ID` 实现实际查询/删除操作，即便没有 primary key(当然，应该自动生成)，一个数据对象的全部属性足以在 SQL 内标记它自身

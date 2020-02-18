typealias Stack = MutableList<PP>

fun KeywordPattern<String>.greedy() = Piped(this) { it ?: //FIXME is not possible
  try { takeWhile { it !in this@greedy.routes }.joinToString("").takeIf(String::isNotEmpty) }
  catch (_: Feed.End) { notParsed }
}

/* Lexer-like algorithm，注意如果要允许翻译则得为维护 TriePattern 的反向映射建立新类，故直接用了 Pattern.show */
object ChengForm {
  const val 钱符 = '￥'; const val 全角空格 = "　"

  val 钱 = item(钱符)
  val 钱边 = 钱.alsoDo { stateAs<Stack>()?.add(tag ?: Preety.Doc.None) } to 钱.clam {"钱钱 ${stateAs<Stack>()?.removeLast()!!}"}
  val 钱钱 = SurroundBy(钱边, Until(钱, asString(), anyChar))
  val 不翻译 = 钱钱 addPrefix "-"

  val 翻译器 = KeywordPattern<String>().apply {
    mergeStrings("真" to "true", "假" to "false", "空" to "null")
    mergeStrings("事" to "fun", "量" to "val ", "变" to "var", "常" to "const ")
    mergeStrings("若" to "if", "否则" to "else", "判" to "when")
    mergeStrings("当" to "while", "对" to "for", "在" to "in")
    mergeStrings("停下" to "break", "略过" to "continue", "回" to "return ")
    mergeStrings("抛下" to "throw ", "尝试" to "try", "接迎" to "catch", "终焉" to "finally")
    mergeStrings("亲" to "super", "我" to "this", "它" to "it")
    mergeStrings("类" to "interface", "物" to "class", "例" to "object")
    mergeStrings("包" to "package ", "引" to "import ")
  }
  val 翻译 = Piped(翻译器 addPrefix "+") { it ?: takeWhileNotEnd { c -> c !in 翻译器.routes && c != 钱符 }.joinToString("").let("-"::plus) }

  val 橙式构词 = Decide(不翻译, 翻译).mergeFirst { if (it[0] == '+') 1 else 0 }
  val 橙式 = Until(EOF, asList(), 橙式构词)

  @JvmStatic fun main(vararg args: String) {
    val reverse = args.firstOrNull()?.equals("reverse") ?: false
    val noReverse = args.firstOrNull()?.equals("noReverse") ?: false
    print(
      if (reverse) 橙式.show(CharInput.STDIN.readText().split(全角空格))
      else 橙式.read(CharInput.STDIN.withState<Stack>(mutableListOf()))?.let { kws ->
        if (noReverse) kws.joinToString("", transform = { it.drop(1) }) else kws.joinToString(全角空格)
      })
  }
}

infix fun Pattern<Char, String>.addPrefix(prefix: String) = Convert(this, { prefix + it }, { it.drop(prefix.length) })

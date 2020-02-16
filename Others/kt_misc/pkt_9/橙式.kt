/* Lexer-like algorithm，注意如果要允许翻译则得为维护 TriePattern 的反向映射建立新类，故直接用了 Pattern.show */
object ChengForm {
  const val 钱符 = '￥'; const val 全角空格 = "　"

  val 钱 = item(钱符)
  val 钱钱 = SurroundBy(钱 to 钱.clam("钱钱"), Until(钱, asString(), anyChar))
  val 不翻译 = 钱钱 addPrefix "-"

  val 翻译器 = KeywordPattern<String>().apply {
    mergeStrings("函数" to "fun", "量" to "val", "变" to "var")
    mergeStrings("若" to "if", "否则" to "else", "判" to "when")
    mergeStrings("当" to "while", "对" to "for", "在" to "in")
  }
  val 翻译 = Piped(翻译器 addPrefix "+") { it ?: takeWhile { c -> c !in 翻译器.routes && c != 钱符 }.joinToString("").let("-"::plus) }

  val 橙式构词 = Decide(不翻译, 翻译).mergeFirst { if (it[0] == '+') 1 else 0 }
  val 橙式 = Until(EOF, asList(), 橙式构词)

  @JvmStatic fun main(vararg args: String) {
    val reverse = args.firstOrNull()?.equals("reverse") ?: false
    print(
      if (reverse) 橙式.show(CharInput.STDIN.readText().split(全角空格))
        else 橙式.read(CharInput.STDIN)?.joinToString(全角空格)
    )
  }
}

infix fun Pattern<Char, String>.addPrefix(prefix: String) = Convert(this, { prefix + it }, { it.drop(prefix.length) })

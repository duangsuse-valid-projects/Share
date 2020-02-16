object ChengForm {
  const val 钱 = '￥'; const val 全角空格 = "　"

  val 钱钱 = stringSurroundByConstant(item(钱) to item(钱), "钱钱", anyChar)
  val 不翻译 = Convert(钱钱, { "-" + it }, { it.drop(1) })
  val 翻译器 = KeywordPattern<String>().apply {
    mergeStrings("函数" to "fun", "量" to "val", "变" to "var")
    mergeStrings("若" to "if", "否则" to "else", "判" to "when")
    mergeStrings("当" to "while", "对" to "for", "在" to "in")
  }
  val 翻译 = Piped(翻译器) { "+" + (it ?: takeWhile { c -> c !in 翻译器.routes && c != 钱 }.joinToString("")) }
  val 橙式构词 = Decide(不翻译, 翻译).mergeFirst { if (it[0] == '+') 1 else 0 }
  val 橙式 = Until(EOF, asList(), 橙式构词)

  @JvmStatic fun main(vararg args: String) {
    val reverse = args.firstOrNull()?.equals("reverse") ?: false
    println(
      if (reverse) 橙式.show(CharInput.STDIN.asIterable().joinToString("").split(全角空格))
        else 橙式.read(CharInput.STDIN)?.joinToString(全角空格)
    )
  }
}

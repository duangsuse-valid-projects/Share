object ChengForm {
  val 不翻译 = Convert(stringSurroundBy('￥' to '￥', anyChar), { "-" + it }, { it.drop(1) })
  val 翻译器 = KeywordPattern<String>().apply {
    mergeStrings("函数" to "fun", "量" to "val", "变" to "var")
    mergeStrings("若" to "if", "否则" to "else", "判" to "when")
    mergeStrings("当" to "while", "对" to "for", "在" to "in")
  }
  val 翻译 = Piped(翻译器) { "+" + (it ?: takeWhile { c -> c !in 翻译器.routes }.joinToString("")) }
  val 橙式构词 = Decide(不翻译, 翻译).mergeFirst { if (it[0] == '+') 1 else 0 }
  val 橙式 = Until(EOF, asList(), 橙式构词)
  val 全角空格 = '　'

  @JvmStatic fun main(vararg args: String) {
    val reverse = args.firstOrNull()?.equals("reverse") ?: false
    println(
      if (reverse) 橙式.show(CharInput.STDIN.asIterable().joinToString("").split(全角空格))
        else 橙式.read(CharInput.STDIN).joinToString(全角空格)
    )
  }
}

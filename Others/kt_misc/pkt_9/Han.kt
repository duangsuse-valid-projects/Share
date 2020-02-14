val hanDigits = "一二三四五六七八九".asIterable().map(Char::toString).zip(1..9)
private lateinit var hanShow: (Output<Char>, Int?) -> Unit
val hanDigit = object: KeywordPattern<Int>() {
  init { mergeStrings(*hanDigits.toArray()) }
  override fun show(s: Output<Char>, value: Int?) { if (value == null) return;
    if (value in 1..9) super.show(s, value) else hanShow(s, value) }
}
val hanUnit = KeywordPattern<Int>().apply {
  mergeStrings("" to 1, "十" to 10, "百" to 100)
  mergeStrings("千" to 1000, "万" to 10000)
} 
val hanNum=NumUnitTrie(hanDigit, hanUnit, IntOps).also { hanShow = it::show }

import kotlin.math.abs

val hanDigits = "一二三四五六七八九".asIterable().map(Char::toString).zip(1..9)

private lateinit var hanShow: (Output<Char>, Int?) -> Unit
val hanDigit = object: KeywordPattern<Int>() {
  init { mergeStrings(*hanDigits.toArray(), "又" to -1) } //“又”比较特殊，只能以“三十又十”形式出现
  override fun show(s: Output<Char>, value: Int?) {
    if (value == null) return
    if (value in 1..9) super.show(s, value) else { hanShow(s, value); s('又') }
  }
}
val hanUnit = PairedKeywordPattern<Int>().apply {
  mergeStrings("" to 1, "十" to 10, "百" to 100)
  mergeStrings("千" to 1000, "万" to 10000, "亿" to 100000000/*10^8*/)
  listOf("百", "千", "万", "亿").forEach { this[it+"零"] = -this[it]!! }
  // 因为“百零”和“百”的系数无二，反向映射会出差错。
  // 反正没有负数系数的需要，使用时取绝对值无异。
}

object HanNum: NumUnitTrie<Char, Int>(hanDigit, hanUnit, IntOps) {
  init { hanShow = this::show }
  override fun read(s: Feed<Char>) = super.read(s).also { if (s.peek == '零') s.error("零 form cannot be used in tail part") }

  override fun joinUnitsInitial(s: Feed<Char>, k: Int, i: Int): Int =
    if (i == (-1)) 0.also { s.error("又 cannot be used as digit") } else op.times(abs(k), i)
  override fun joinUnits(s: Feed<Char>, u0: NumUnit<Int, Char>, u1: NumUnit<Int, Char>, acc: Int, i: Int): Int {
    val (nk1, name1) = u0; val (nk2, name2) = u1
    val k1 = abs(nk1); val k2 = abs(nk2)
    val showUnits by lazy { "$name1($k1) => $name2($k2)" }
    if (!isZsep(name1)) when {
      k1 > (k2*10) -> s.error("missing seprator 零: $showUnits") //三千一
      k1 < k2 && i != (-1) -> s.error("missing ascending seprator 零: $showUnits") //三百二千
    }
    return when {
      i == (-1) -> when {
        k2 == 1 /*四十又*/ -> acc.also { s.error("又 is not digit") }
        k1 <= k2 /*三十又百、三万又万*/ -> op.times(k2, acc)
        else -> acc.also { s.error("bad descending 又: $showUnits") }
      }
      k1 < k2 -> op.times(k2, op.plus(i, acc)) //一十二万
      k1 > k2 -> op.plus(op.times(k2, i), acc) //三千一百
      k1 == k2 -> acc.also { s.error("dup units $name1($k1)") }
      else -> impossible()
    }
  }
  private fun isZsep(name: Iterable<Char>) = name.lastOrNull()?.let { it == '零' } ?: false

  override fun joinUnitsShow(s: Output<Char>, u0: NumUnit<Int, Char>, u1: NumUnit<Int, Char>) {
    val (k1, _) = u0; val (k2, _) = u1
    if (k1 > k2 * 10) s('零') // 一千(零)一十
  }
}

private val hanDigitsMap = MapPattern(mapOf(*hanDigits.mapToArray { it.first.single() to it.second }))
val hanNum = Decide(
  Convert(hanDigitsMap.toDefault(0) prefix item('十'), {it + 10}, {it - 10}),
  MapPattern(mapOf('零' to 0)),
  HanNum
).mergeFirst { if (it in 10..19) 0 else if (it == 0) 1 else 2 }

object Calc {
  fun asIntegral(radix: Int) = JoinFold(0, {this*radix+it})
  val sign = Convert(elementIn('+', '-').toDefault('+'), {it=='-'}, {if(!it) '+' else '-'})
  val digit = Convert(elementIn('0'..'9'), {it-'0'}, {'0'+it})
  val numPart = object: Repeat<Char, Int, Int>(asIntegral(10), digit) {
    override fun unfold(value: Int) = kotlin.math.abs(value).toString().map {it-'0'}
  }
  val int = Convert(Contextual(sign) { sign ->
    Pipe(numPart) { if (!sign) it else -it }
  }, { it.second }, { Tuple2(it<0, it) } )
  enum class Ops(override val join: Join<Int>): InfixOpEnum<Int> {
    `*`(Int::times), `+`(Int::plus)
  }
  val expr = InfixPattern(int, Ops.`+`.toInfixOps())
  val exprs = object: JoinBy<Char, Char, Int>(item('\n'), expr) {
    override fun onItem(value: Int) = println("= $value")
  }
  @JvmStatic fun main(vararg args: String) {
    val es = exprs.read(CharInput.STDIN)
    println(es)
  }
}

class DecimalRead(zero: Int): Monoid<Int>(zero, { this*10 + it })
object Digit: Convert<Char, Char, Int>(RangeElement('0'..'9'),  {it-'0'}, {'0'+it})
object Decimal: Repeat<Char, Int, Int>(DecimalRead(0), Digit) {
  override fun show(write: Consumer<Char>, item: Int?) { item?.toString()?.forEach(write) }
}
enum class Op_(val eval: (Int, Int) -> Int) {
  Add(Int::plus), Sub(Int::minus), Mul(Int::times), Div(Int::div);
  fun toJoin() = object: Join<Int> {
    override fun invoke(x0:Int, x1:Int) = eval(x0, x1)
    override fun compareTo(other: Join<Int>): Int = fromJoin(this).compareTo(fromJoin(other))
  }
  companion object {
    val reverseMap = Op_.values().toList().toMap { it to it.toJoin() }.reversedMap()
    fun fromJoin(j: Join<Int>): Op_ = reverseMap.getValue(j)
  }
}
val op = TriePattern<Char, Op_>().also {
it["+".toList()] = Op_.Add
it["-".toList()] = Op_.Sub
it["*".toList()] = Op_.Mul
it["/".toList()] = Op_.Div
}
object Op: Convert<Char, Op_, Join<Int>>(op, {it.toJoin()}, {TODO()})

// 不知道为什么，这里加一个 object 就会导致 REPL 里 Parser 的 top level declaration 如 typealias 完全不能用
/*object Kalc: InfixPattern<Char, Int>(Decimal, Op) {
  override fun onError(base: Int, op1: Join<Int>): Nothing = error("bad infix")
  override fun show(write: Consumer<Char>, item: Int?) = TODO()
}
*/

//Kalc.read(CharInput("",SliceFeed(slice("12* 31")) ))

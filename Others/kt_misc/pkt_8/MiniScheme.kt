import Token.Integral
import Token.Integral.IRepr

sealed class Token {
  data class Boolean(val x: Boolean): Token()
  data class Integral(val x: Long, val repr: IRepr) {
    enum class IRepr(val radix: kotlin.Int) { Bin(2), Dec(10), Hex(16), Fail(-1) }
    fun map(transform: (Long) -> Long) = Integral(transform(x), repr)
    override fun toString() = x.toString(repr.radix)
  }
  data class Char(val x: Char): Token()
  data class String(val x: String): Token()
  data class Name(val x: String): Token()
  object Null: Token()
}

fun digitsIn(range: CharRange, padding: Int = 0)
  = Convert(elementIn(range), { it-range.first+padding }, { range.first+(it - padding) })
val binDigit = digitsIn('0'..'1')
val decDigit = digitsIn('0'..'9')

val hexDigitLo = digitsIn('a'..'f', padding = 10)
val hexDigitUp = digitsIn('A'..'F', padding = 10)
val hexDigit = DecideUn(decDigit, hexDigitUp, hexDigitLo) { if (it in 0..9) 0 else 1 }

fun asLong(radix: Int, initial: Long = 0L) = JoinFold(initial) { this*radix + it }
fun integralFor(digit: Pattern<Char, Int>, repr: IRepr): Pattern<Char, Integral>
  = Convert(Repeat(asLong(repr.radix), Convert(digit, Int::toLong))) { Integral(it, repr) }

val binPart = integralFor(binDigit, IRepr.Bin)
val decPart = integralFor(decDigit, IRepr.Dec)
val hexPart = integralFor(hexDigit, IRepr.Hex)

val sign = Convert(elementIn('+', '-').toDefault('+'), { it == '-' }, { if(it) '-' else '+' })
fun signed(part: Pattern<Char, Integral>) = Convert(Contextual(sign) { sign ->
  Pipe(part) { if (sign) it.map(Long::unaryMinus) else it }
}, { it.second }, { Tuple2(it.x < 0, it) })

// 0x / 0b / 123
val zeroNotation = Decide(
  hexPart prefix item('x'),
  binPart prefix item('b'),
  Peek(Convert(!decDigit) {ifail(it.toLong())}) { if (peek == '0') takeIfStickyEnd(ifail(-1)) else ifail(0) }.clamWhile(decDigit, ifail(0), "no octal notations")
)
val numPart = Convert(Contextual(decDigit) {
  signed( if (it == 0) zeroNotation
  else Convert(Repeat(asLong(10, it.toLong()), Convert(decDigit, Int::toLong)).Maybe()) { Integral(it, IRepr.Dec) } )
}, { it.second })

internal fun ifail(x: Long) = Integral(x, IRepr.Fail)

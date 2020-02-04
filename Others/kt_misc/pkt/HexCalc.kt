import kotlin.math.abs


fun digitItem(digit: SatisfyPattern<Char>) = Convert(digit, {it-'0'}, {'0'+it})
val digit = digitItem(elementIn('0'..'9'))
val binDigit = digitItem(elementIn('0', '1'))
fun subP10(c: Char): (Char) -> Int = { it-c+10 }
fun charM10(c: Char): (Int) -> Char = { c+(it-10) }

val hexLower = Convert(elementIn('a'..'z'), subP10('a'), charM10('a'))
val hexUpper = Convert(elementIn('A'..'Z'), subP10('A'), charM10('A'))
val hexDigit = DecideUn(digit, hexLower, hexUpper) { if (it in 0..9) 0 else 2 }

fun asInt(radix: Int = 10, initial: Int = 0) = JoinFold(initial, {this*radix+it})
val decPart = Repeat(asInt(10), digit)
val hexPart = Repeat(asInt(16), hexDigit)
val binPart = Repeat(asInt(2), binDigit)

val sign = Convert(elementIn('+', '-').toDefault('+'), {it=='-'}, {if(!it) '+' else '-'})
// 0x / 0b / 123
val zeroNotation = Decide(
  hexPart prefix item('x'),
  binPart prefix item('b')
)
/*
val numPart = Contextual<Char, Int, Int>(digit) {
  if (it == 0) zeroNotation
  else Peek(!digit) {0}.clam("no octal notations")
}
val int = Convert(Contextual(sign) { sign ->
  Pipe(numPart) { if (!sign) it else -it }
}, { it.second }, { Tuple2(it<0, abs(it)) } )
*/
enum class Op(override val join: Join<Int>): InfixOpEnum<Int> {
  `*`(Int::times), `+`(Int::plus);
}

val ops = infixOpsLike(Op.`+`).apply {
  register(0 to "/" join Int::div)
  register(1 to "-" join Int::minus)
}

val ws = Repeat(asString(), elementIn(' ', '\t', '\n', '\r'))
//val expr = InfixPattern(int, ops)

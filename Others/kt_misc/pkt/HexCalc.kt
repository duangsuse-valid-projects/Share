import kotlin.math.abs

fun digitItem(digit: SatisfyPattern<Char>) = Convert(digit, {it-'0'}, {'0'+it})

val digit = digitItem(elementIn('0'..'9'))
val binDigit = digitItem(elementIn('0'..'1'))
fun intFrom(c: Char): (Char) -> Int = { it-c+10 }
fun charFrom(c: Char): (Int) -> Char = { c+(it-10) }

val hexLower = Convert(elementIn('a'..'z'), intFrom('a'), charFrom('a'))
val hexUpper = Convert(elementIn('A'..'Z'), intFrom('A'), charFrom('A'))
val hexDigit = DecideUn(digit, hexLower, hexUpper) { if (it in 0..9) 0 else 2 }

fun asInt(radix: Int = 10, initial: Int = 0) = JoinFold(initial, {this*radix+it})
val hexPart = Repeat(asInt(16), hexDigit)
val binPart = Repeat(asInt(2), binDigit)

val sign = Convert(elementIn('+', '-').toDefault('+'), {it=='-'}, {if(!it) '+' else '-'})
// 0x / 0b / 123
val zeroNotation = Decide(
  hexPart prefix item('x'),
  binPart prefix item('b'),
  Peek(!digit) { if (peek == '0') takeIfStickyEnd(-1) else 0 }.clamWhile(digit, 0, "no octal notations")
)

val numPart = Convert(Contextual(digit) {
  if (it == 0) zeroNotation
  else Repeat(asInt(10, it), digit).Maybe()
}, { it.second })

val int = Convert(Contextual(sign) { sign ->
  Pipe(numPart) { if (!sign) it else -it }
}, { it.second }, { Tuple2(it<0, abs(it)) })

val ops = KeywordPattern<InfixOp<Int>>().apply {
  register("*" infixl 0 join Int::times)
  register("/" infixl 0 join Int::div)
  register("+" infixl 1 join Int::plus)
  register("-" infixl 1 join Int::minus)
}

fun stringFor(char: SatisfyPattern<Char>) = Repeat(asString(), char).Maybe()
val ws = stringFor(elementIn(' ', '\t'))
val atom = Convert(Seq(::AnyTuple, ws, int, ws), { it.getAs<Int>(1) }, { anyTupleOf("", it, "") })
val expr = InfixPattern(atom, ops)

object HexCalc {
  @JvmStatic fun main(vararg args: String) {
    fun ps1() { print("> "); System.`out`.flush() }
    ps1()
    val repl = JoinBy(item('\n'), expr).AddListeners({ println("= $it"); ps1() }, { /*on-seprator*/ })
    val calcLogs = repl.read(CharInput.STDIN)
    println(calcLogs)
  }
}

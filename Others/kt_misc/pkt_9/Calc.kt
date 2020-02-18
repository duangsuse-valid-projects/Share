import kotlin.math.abs

val digit = digitFor('0'..'9')
val binDigit = digitFor('0'..'1')

val hexLower = digitFor('a'..'f', 'a', 10)
val hexUpper = digitFor('A'..'F', 'A', 10)
val hexDigit = Decide(digit, hexLower, hexUpper).mergeFirst { if (it in 0..9) 0 else 2 }

val hexPart = Repeat(asInt(16), hexDigit)
val binPart = Repeat(asInt(2), binDigit)

val sign = Convert(elementIn('+', '-', '负').toDefault('+'), {it!='+'}, {if(it) '-' else '+'})
// 0x / 0b / 123
val octal = elementIn('0'..'8')
val zeroNotation = Decide(
  hexPart prefix item('x'),
  binPart prefix item('b'),
  StickyEnd(item('0') or EOF, 0) { if (octal.test(peek)) error("no octal notations");  -1 }
).mergeFirst {0}

val numPart = Contextual<Char, Int, Int>(digit) {
  if (it == 0) zeroNotation
  else Repeat(asInt(10, it), digit).Many()
}.mergeFirst {0}

val int = Convert(Contextual(sign) { sign ->
  Piped(Decide(numPart, hanNum).mergeFirst {0}) { if (sign && it!=notParsed) -it else it }
}, { it.second as Number }, { Tuple2(it.toInt()<0, abs(it.toInt())) })

val ws = stringFor(elementIn(' ', '\t')).toConstant(" ")

lateinit var expr: Pattern<Char, Number>
val atomParen = SurroundBy(parens.toCharPat(), Deferred {expr})
val atomInt = SurroundBy(ws to ws, int)
val atom = Decide(atomInt, atomParen).mergeFirst {0}
val ops = KeywordPattern<InfixOp<Number>>().apply {
  listOf("*", "乘").forEach { register(it infixl 0 join fn(Int::times)) }
  listOf("/", "除以").forEach { register(it infixl 0 join fn(Int::div)) }
  register("除" infixl 0 join flip(fn(Int::div)))
  register("分" infixl 0 join { a: Number, b: Number-> (a.toDouble() / b.toDouble()) as Number })
  listOf("+", "加") .forEach { register(it infixl 1 join fn(Int::plus)) }
  listOf("-", "减") .forEach { register(it infixl 1 join fn(Int::minus)) }
}
internal fun fn(join: InfixJoin<Int>): InfixJoin<Number> = { a, b -> join(a.toInt(), b.toInt()) }

object Calc {
  init {
    val duoLine = int prefix item('\n')
    expr = object: InfixPattern<Char, Number>(atom, ops) {
      override fun rescue(s: Feed<Char>, base: Number, op1: InfixOp<Number>) = duoLine.read(s) ?: notParsed.also { s.error("expecting rhs for $base $op1") }
    }
  }
  @JvmStatic fun main(vararg args: String) {
    fun ps1() = print("> ")
    ps1()
    val input = CharInput.STDIN
    val repl = JoinBy(item('\n'), expr).OnItem { println("= $it"); ps1() }
    val calcLogs = input.catchError { repl.read(input) }
    println(calcLogs)
  }
}

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
}, { it.second }, { Tuple2(it<0, abs(it)) })

val ws = stringFor(elementIn(' ', '\t'))

lateinit var expr: Pattern<Char, Int>
val atomParen = SurroundBy(Pair('(', ')').toPat(), Deferred {expr})
val atomInt = Convert(Seq(::AnyTuple, ws, int, ws), { it.getAs<Int>(1) }, { anyTupleOf("", it, "") })
val atom = Decide(atomInt, atomParen).mergeFirst {0}
val ops = KeywordPattern<InfixOp<Int>>().apply {
  listOf("*", "乘").forEach { register(it infixl 0 join Int::times) }
  listOf("/", "除").forEach { register(it infixl 0 join Int::div) }
  listOf("+", "加") .forEach { register(it infixl 1 join Int::plus) }
  listOf("-", "减") .forEach { register(it infixl 1 join Int::minus) }
}

object Calc {
  init {
    val duoLine = int prefix item('\n')
    expr = object: InfixPattern<Char, Int>(atom, ops) {
      override fun rescue(s: Feed<Char>, base: Int, op1: InfixOp<Int>) = duoLine.read(s) ?: notParsed.also { s.error("expecting rhs for $base $op1") }
    }
  }
  @JvmStatic fun main(vararg args: String) {
    fun ps1() = print("> ")
    ps1()
    val repl = JoinBy(item('\n'), expr).OnItem { println("= $it"); ps1() }
    val calcLogs = repl.read(CharInput.STDIN)
    println(calcLogs)
  }
}

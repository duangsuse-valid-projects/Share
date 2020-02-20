object MapSyntax: LexicalBasics() {
lateinit var list: Pattern<Char, List<Any>>
val comma = item(',').tokenizePunction()
val colon = item(':').tokenizePunction()

val string = SurroundBy(clamly(quotes), stringFor(!item('\'')))
val value: Pattern<Char, Any> = Decide(numInt, Deferred{list}).mergeFirst { if (it is List<*>) 1 else 0 }
init { list = SurroundBy(clamly(squares), comma seprated value) }

val kvPart = Seq(::AnyTuple, string, colon, value)
val kv = Convert(kvPart, { it[0] to it[2] }, { anyTupleOf(it.first, ':', it.second) })
val mapPart = SurroundBy(clamly(braces), comma seprated kv)
val map = Convert(mapPart, { it.toMap() }, { it.toList() })

@JvmStatic fun main(vararg args: String) {
  val (e, input) = CharInput.STDIN.withState(ExpectClose()).addErrorList()
  val parsed = map.read(input)
  println(parsed)
  println(map.show(parsed))
  println(e)
}
}

object Arithmetic: LexicalBasics() {
  sealed class Exp {
    data class Parened(override val v: Exp): Exp(), ConvertAs.Box<Exp> {
      override fun toString() = "($v)"
    }
    data class TermInt(override val v: Int): Exp(), ConvertAs.Box<Int> {
      override fun toString() = "$v"
    }
    data class Op(val id: String, val lhs: Exp, val rhs: Exp): Exp() {
      override fun toString() = "$id $lhs $rhs"
    }
    fun eval(): Int = when (this) {
      is Parened -> v.eval()
      is TermInt -> v
      is Op -> when (id) {
        "+" -> lhs.eval() + rhs.eval()
        "-" -> lhs.eval() - rhs.eval()
        "*" -> lhs.eval() * rhs.eval()
        "/" -> lhs.eval() / rhs.eval()
        else -> unsupported("op $id")
      }
    }
  }
  fun KeywordPattern<InfixOp<Exp>>.mergeOps(level: Int, vararg ids: String)
    = ids.forEach { id -> register(id infixl level join { a, b -> Exp.Op(id, a, b) }) }

  val ops = KeywordPattern<InfixOp<Exp>>().apply {
    mergeOps(0, "*", "/")
    mergeOps(1, "+", "-")
  }
  lateinit var atom: Pattern<Char, Exp>
  val expr = InfixPattern(Deferred{atom}, ops)
  val number: Pattern<Char, Exp> = numInt.tokenize().typed { Exp.TermInt(it) }.force()
  init {
    val parened = SurroundBy(clamly(parens), expr) typed { Exp.Parened(it) }
    atom = Decide<Char, Exp>(number, parened).mergeFirst { if (it is Exp.Parened) 1 else 0 }.tokenize()
  }
  @JvmStatic fun main(vararg args: String) {
    val (e, input) = CharInput.STDIN.withState(ExpectClose()).addErrorList()
    val parsed = expr.read(input)
    println(parsed)
    println("= ${parsed?.eval()}")
    println(e)
  }
}

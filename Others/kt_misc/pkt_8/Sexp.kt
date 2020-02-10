sealed class Sexp { data class Term(val name: String): Sexp(); data class Nest(val list: List<Sexp>): Sexp() }

object SexpApp {
  lateinit var sexp: Pattern<Char, Sexp>
  val str = Until(elementIn(' ', *parens.items()), asString(), anyChar)
  val atom = Convert(str) { Sexp.Term(it) }
  val nestItems = SurroundBy(parens.asPat(), JoinBy(item(' '), Deferred{sexp}).mergeSecond {emptyList()})
  val nest = Convert(nestItems) { Sexp.Nest(it) }
  init { sexp = Decide(nest, atom).mergeFirst { if (it is Sexp.Nest) 1 else 0 } }
  @JvmStatic fun main(vararg args: String) {
    repeat(args[0].toInt()) { println(sexp.read(CharInput.STDIN)) }
  }
}

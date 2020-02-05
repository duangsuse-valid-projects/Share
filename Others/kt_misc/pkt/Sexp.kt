sealed class Sexp { data class Term(val name: String): Sexp(); data class Nest(val list: List<Sexp>): Sexp() }

lateinit var sexp: Pattern<Char, Sexp>
val str = Until(elementIn(' ', *parens.items()), asString(), anyChar)
val atom = Convert(str) { Sexp.Term(it) }
val nestItems = SurroundBy(parens.asPat(), JoinBy(item(' '), Deferred{sexp}).ignoreSecond())
val nest = Convert(nestItems) { Sexp.Nest(it) }
sexp = Decide(nest, atom)

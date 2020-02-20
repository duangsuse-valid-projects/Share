object MapSyntax: LexicalBasics() {
lateinit var list: Pattern<Char, List<Any>>
val comma = item(',').tokenizePunction()
val colon = item(':').tokenizePunction()

val number = RepeatUn(asInt(), digitFor('0'..'9')) { i -> i.toString().map{it-'0'} }
val string = SurroundBy(clamly(quotes), stringFor(!item('\'')))
val value: Pattern<Char, Any> = Decide(number, Deferred{list}).mergeFirst { if (it is List<*>) 1 else 0 }
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

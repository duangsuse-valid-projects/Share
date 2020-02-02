sealed class Json {
  data class Object(val kv: Map<String, Json>): Json()
  data class Array(val xs: List<Json>): Json()
  data class String(val literal: kotlin.String): Json()
  data class Number(val i: Double): Json()
  data class Boolean(val p: kotlin.Boolean): Json()
  object Null: Json()
}

abstract class JsonLexical {
  val brace = '{' to '}'; val square = '[' to ']'
  val colon = ':'; val comma = ',';
  val dquote = '"'
  val constLiteral = TriePattern<Char, Json>().apply {
    mergeStrings("true" to Json.Boolean(true), "false" to Json.Boolean(false))
    mergeStrings("null" to Json.Null)
  }
  val white = elementIn(' ', '\n', '\r', '\t')
  val ws = Repeat(asString(), white)

  fun asIntegral(radix: Int, initial: Int = 0) = JoinFold(initial, {this*radix+ it})
  fun zeroPad(item: SatisfyPattern<Char>) = Convert(item, {it-'0'}, {'0'+it})
  val zeroNine = zeroPad(elementIn('0'..'9'))
  val oneNine = zeroPad(elementIn('1'..'9'))
  fun digitsOf(item: Pattern<Char, Int>) = Repeat(asIntegral(10), item)
  val digits = Decide(digitsOf(oneNine), Convert(Contextual<Char, Int, Int>(zeroNine) { h ->
      if (h == 0) Peek(0) { if (it in '0'..'9') error("bad octal notation ${consume()}") }
      else Repeat(asIntegral(10, h), zeroNine)
  }, {it.second}, {Tuple2(0, it)}) )
  val sign = elementIn('+', '-').toDefault('+')
}

object JsonSyntax: JsonLexical() {
}

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
  val colon = ':'; val comma = ','
  val dquote = '"'

  val translateMap = mapOf( // \"\t\b\n\r\f\/\\
    '"' to '"',
    't' to '\t', 'b' to '\b',
    'n' to '\n', 'r' to '\r',
    'f' to '\u0012',
    '/' to '/', '\\' to '\\'
  )

  val constLiteral = TriePattern<Char, Json>().apply {
    mergeStrings("true" to Json.Boolean(true), "false" to Json.Boolean(false))
    mergeStrings("null" to Json.Null)
  }
  val white = elementIn(' ', '\n', '\r', '\t')
  val ws = Repeat(asString(), white)

  val sign = elementIn('+', '-').toDefault('+')
  val zeroNine = zeroPad(elementIn('0'..'9'))
  val oneNine = zeroPad(elementIn('1'..'9'))

  val int = get1(zeroNine) { head ->
    if (head == 0) Peek(oneNine.not().clam("bad octal notation"), 0)
    else Repeat(asInt(10, head), zeroNine)
  }
  val hexDigit = object: Decide<Char, Int>(zeroNine, Convert(elementIn('a'..'f'), {it-'a'+10}), Convert(elementIn('A'..'f'), {it-'A'+10}, {'A'+it-10})) {
    override fun undecide(value: Int) = when (value) { in 0..9 -> 0; else -> 2 }
  }
  val escape = MapPattern(translateMap)
  val unicodeEscape = Convert(object: Repeat<Char, Int, Int>(asInt(16), hexDigit) {
    override fun testCount(n: Cnt) = n == 4
    override fun unfold(value: Int) = value.toString(16).padStart(4, '0').map { it-'0' }
  }, Int::toChar, Char::toInt)
  val string = SurroundBy(dquote to dquote, Until(asString(), dquote, Decide(
    object: Decide<Char, Char>(unicodeEscape prefix 'u', escape) {
      override fun undecide(value: Char) = if (value in translateMap.reversedMap()) 1 else 0
    } prefix '\\', item<Char>().and(!item('\n')).clam("unterminated string") ) ))
}

fun zeroPad(item: SatisfyPattern<Char>) = Convert(item, {it-'0'}, {'0'+it})
fun asInt(radix: Int = 10, initial: Int = 0) = JoinFold(initial, {this*radix+ it})
fun <IN, T> get1(head: Pattern<IN, T>, body: (T) -> Pattern<IN, T>) = Convert(Contextual(head, body), { it.second })

object JsonSyntax: JsonLexical() {
}

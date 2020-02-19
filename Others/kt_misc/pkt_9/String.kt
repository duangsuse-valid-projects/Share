import kotlin.math.pow

abstract class LexicalBasics {
val digit = digitFor('0'..'9')
val sign = Convert(elementIn('+', '-').toDefault('+')) { it == '-' }
val bin = digitFor('0'..'1'); val octal = digitFor('0'..'8')
val hex = Decide(digit, digitFor('A'..'F', 'A', 10), digitFor('a'..'f', 'a', 10)).mergeFirst { if (it in 0..9) 0 else 1 }

val escapes = mapOf('"' to '"', 't' to '\t', 'b' to '\b', 'n' to '\n', 'r' to '\r', '\\' to '\\')
val namedEscape = MapPattern(escapes) { error("unknown escape '$it'"); '?' }

val white = elementIn(' ', '\t', '\n', '\r') named "white"
val ws = Repeat(asString(), white).Many().toConstant("")
fun <T> Pattern<Char, T>.tokenize() = SurroundBy(ws to ws, this)
}

abstract class JSONLexical: LexicalBasics() {
val unicodeEscapePart = object: Repeat<Char, Int, Int>(asInt(16), hex) {
  override val bounds = 4..4
  override val greedy = false
  override fun unfold(value: Int) = value.toString(16).padStart(4, '0').map { hex.read(SingleFeed(it))!! }
}
val unicodeEscape = Convert(unicodeEscapePart, Int::toChar, Char::toInt).clamWhile(hex, '?') {"bad unicode escape"}

val escaped = Decide(unicodeEscape prefix item('u'), namedEscape).mergeFirst{1} prefix item('\\')

val stringPart = Decide(!elementIn('\\', '"', '\n'), escaped).mergeFirst { if (it in escapes.values) 1 else 0 }
val string = SurroundBy(item('"') to item('"').clam {"non-terminated \""}, stringFor(stringPart))

fun readFloat(i: Int) = object: ConvertFold<Int, Double, Number>() {
  override val initial = i.toDouble()
  var count = 0
  override fun join(base: Double, value: Int) = (base*10 + value).also { count++ }
  override fun convert(base: Double): Number = (base*(0.1).pow(count)).also { count = 0 }
}
fun floatingNum(i: Int) = Repeat(readFloat(i), digit).clamWhile(never(), i.toDouble()) {"expecting fraction part"} prefix item('.')

val zeroNotation = Decide(
  Repeat(asInt(16), hex) prefix elementIn('X', 'x').toConstant('x'),
  Repeat(asInt(2), bin) prefix elementIn('B', 'b').toConstant('b'),
  floatingNum(0),
  StickyEnd(item('0'), 0) { clamWhile(!octal, octal.read(this), "no octal notations") }
).discardFirst()

val numPart = Contextual<Char, Int, Number>(digit) {
  if (it == 0) zeroNotation
  else Contextual(Repeat(asInt(10, it), digit).Many()) {
    Decide(floatingNum(it), always(it as Number)).discardFirst()
  }.discardFirst()
}.discardFirst()

val num = Contextual(sign) { sign ->
  Piped(numPart) { if (sign && it != notParsed) -it else it }
}.mergeFirst { it.toInt() < 0 }

operator fun Number.unaryMinus(): Number = when (this) {
  is Int -> -this
  is Double -> -this
  else -> unsupported("-")
}

protected val itemsTerm = elementIn('}', ']')
val comma = item(',').tokenize()
val colon = item(':').tokenize().clamWhile(!itemsTerm, ',') {":!!"}
}

object JSONParser: JSONLexical() {
lateinit var json: Pattern<Char, JSON>
sealed class JSON {
  object Null: JSON()
  data class Boolean(val e: kotlin.Boolean): JSON()
  data class Number(val e: kotlin.Number): JSON()
  data class String(val e: kotlin.String): JSON()
  data class Array(val es: List<JSON>): JSON()
  data class Object(val es: Map<kotlin.String, JSON>): JSON()
}

val jsonConst = KeywordPattern<JSON>().apply {
  mergeStrings("null" to JSON.Null)
  mergeStrings("true" to JSON.Boolean(true), "false" to JSON.Boolean(false))
}

val arrayPart = SurroundBy(item('[') to item(']').clam {"]!!"},
                           JoinBy(comma, Deferred{json}).Rescue { s, dl -> s.error("missing value: $dl"); JSON.Null }
  .mergeConstantJoin().tokenize().toDefault(emptyList()))

class JsonKV: AnyTuple(3) {
  val key by indexAs<String>(0)
  val value by indexAs<JSON>(2)
  fun toPair() = key to value
}
val kvNull = tupleOf(::JsonKV, "null", ':', JSON.Null)
val kv = Seq(::JsonKV, string, colon, Deferred{json})
val kvPart = SurroundBy(item('{') to item('}').clam {"}!!"},
                        JoinBy(comma, kv).Rescue { s, dl -> s.error("missing kv pair: $dl"); kvNull }
  .mergeConstantJoin().tokenize().toDefault(emptyList()))

val jsonNum = Convert(num) { JSON.Number(it) }
val jsonStr = Convert(string) { JSON.String(it) }

val jsonArray = Convert(arrayPart) { JSON.Array(it) }
val jsonObject = Convert(kvPart) { JSON.Object(it.map(JsonKV::toPair).toMap()) }

init { json = Decide(jsonNum, jsonStr, jsonArray, jsonObject, jsonConst).discardFirst() }

@JvmStatic fun main(vararg args: String) { println(json.read(CharInput.STDIN)) }
}

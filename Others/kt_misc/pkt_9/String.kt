abstract class JSONLexical: LexicalBasics() {
val escapes = mapOf('"' to '"', 't' to '\t', 'b' to '\b', 'n' to '\n', 'r' to '\r', '\\' to '\\')
val namedEscape = MapPattern(escapes) { error("unknown escape '$it'"); '?' }

val unicodeEscapePart = object: Repeat<Char, Int, Int>(asInt(16), hex) {
  override val bounds = 4..4
  override val greedy = false
  override fun unfold(value: Int) = value.toString(16).padStart(4, '0').map { hex.read(SingleFeed(it))!! }
}
val unicodeEscape = Convert(unicodeEscapePart, Int::toChar, Char::toInt).clamWhile(hex, '?') {"bad unicode escape"}

val escaped = Decide(unicodeEscape prefix item('u'), namedEscape).mergeFirst{1} prefix item('\\')

val stringPart = Decide(!elementIn('\\', '"', '\n'), escaped).mergeFirst { if (it in escapes.values) 1 else 0 }
val string = SurroundBy(item('"') to item('"').clam {"non-terminated \""}, stringFor(stringPart))

fun floatingNum(i: Long): Pattern<Char, Number>
= Convert(Repeat(asDouble(i), digit)) { it as Number }.clamWhile(never(), i) {"expecting fraction part"} prefix item('.')

val zeroNotation = Decide(
  Repeat(asInt(16), hex) prefix elementIn('X', 'x').toConstant('x'),
  Repeat(asInt(2), bin) prefix elementIn('B', 'b').toConstant('b'),
  floatingNum(0L),
  StickyEnd(item('0'), 0) { clamWhile(!octal, octal.read(this), "no octal notations") }
).discardFirst()

val numPart = Contextual(digit) {
  if (it == 0) zeroNotation
  else Contextual(Repeat(asInt(10, it), digit).Many()) {
    Decide(floatingNum(it.toLong()), always(it as Number)).discardFirst()
  }.discardFirst()
}.discardFirst()

val num = Contextual(sign) { sign ->
  Piped(numPart) { if (sign && it != notParsed) -it else it }
}.mergeFirst { it.toInt() < 0 }.showByString { it.toString() }

operator fun Number.unaryMinus(): Number = when (this) {
  is Int -> -this
  is Double -> -this
  else -> unsupported("-")
}

protected val itemsTerm = elementIn('}', ']')
val comma = item(',').tokenize()
val colon = item(':').tokenize().clamWhile(!itemsTerm, ',') {":!!"}
}

typealias Bool = kotlin.Boolean
typealias Num = kotlin.Number
typealias Str = kotlin.String

typealias JSON = JSONParser.Json<*>

object JSONParser: JSONLexical() {
lateinit var json: Pattern<Char, JSON>
sealed class Json<T: Any>(override val x: T): ConvertAs.Box<T>, AnyBy(x) {
  object Null: Json<Unit>(Unit)
  class Boolean(x: Bool): Json<Bool>(x)
  class Number(x: Num): Json<Num>(x)
  class String(x: Str): Json<Str>(x)
  class Array(x: List<JSON>): Json<List<JSON>>(x)
  class Object(x: Map<Str, JSON>): Json<Map<Str, JSON>>(x)
}

val jsonConst = KeywordPattern<JSON>().apply {
  mergeStrings("null" to Json.Null)
  mergeStrings("true" to Json.Boolean(true), "false" to Json.Boolean(false))
}

val arrayPart = SurroundBy(item('[') to item(']').clam {"]!!"},
                           JoinBy(comma, Deferred{json}).Rescue { s, dl -> s.error("missing value: $dl"); Json.Null }
  .mergeConstantJoin().tokenize().toDefault(emptyList()))

class JsonKV: AnyTuple(3) {
  val key by indexAs<String>(0)
  val value by indexAs<JSON>(2)
  fun toPair() = key to value
}
val kvNull = tupleOf(::JsonKV, "null", ':', Json.Null)
val kv = Seq(::JsonKV, string, colon, Deferred{json})
val kvPart = SurroundBy(item('{') to item('}').clam {"}!!"},
                        JoinBy(comma, kv).Rescue { s, dl -> s.error("missing kv pair: $dl"); kvNull }
  .mergeConstantJoin().tokenize().toDefault(emptyList()))

val jsonNum = Convert.typed({ Json.Number(it) }, num)
val jsonStr = Convert.typed({ Json.String(it) }, string)

val jsonArray = Convert.typed({ Json.Array(it) }, arrayPart)
val jsonObject = Convert(kvPart) { Json.Object(it.map(JsonKV::toPair).toMap()) }

init {
json = Decide(jsonNum, jsonStr, jsonArray, jsonObject, jsonConst).mergeFirst { when (it) {
  is Json.Boolean, is Json.Null -> 4
  is Json.Number -> 0
  is Json.String -> 1
  is Json.Array -> 2
  else -> unsupported("convert-back (necessary code for sample only)")
} }
}

@JvmStatic fun main(vararg args: String) { println(json.read(CharInput.STDIN)) }
}

val digit = digitFor('0'..'9')
val hex = Decide(digit, digitFor('A'..'F', 'A', 10), digitFor('a'..'f', 'a', 10)).mergeFirst { if (it in 0..9) 0 else 1 }

val escapes = mapOf('"' to '"', 't' to '\t', 'b' to '\b', 'n' to '\n', 'r' to '\r', '\\' to '\\')
val namedEscape = MapPattern(escapes) { error("unknown escape '$it'"); '?' }

val unicodeEscapePart = object: Repeat<Char, Int, Int>(asInt(16), hex) {
  override val bounds = 4..4
  override val greedy = false
  override fun unfold(value: Int) = value.toString(16).padStart(4, '0').map { hex.read(SingleFeed(it))!! }
}
val unicodeEscape = Convert(unicodeEscapePart, Int::toChar, Char::toInt).clamWhile(hex, '?') {"bad unicode escape"}

val escaped = Decide(unicodeEscape prefix item('u'), namedEscape).mergeFirst {1} prefix item('\\')

val stringPart = Decide(!elementIn('\\', '"', '\n'), escaped).mergeFirst { if (it in escapes.values) 1 else 0 }
val string = SurroundBy(item('"') to item('"').clam {"non-terminated \""}, Repeat(asString(), stringPart))

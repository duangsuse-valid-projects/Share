sealed class MuToken {
  object Nil: MuToken()
  data class Bool(val e: Boolean): MuToken()
  data class Name(val name: String): MuToken()
  data class Keyword(val id: String): MuToken()
  interface Operator { val id: String }
  data class Op(override val id: String): MuToken(), Operator
  data class PrefixOp(override val id: String): MuToken(), Operator
  data class ComposeAssignOp(override val id: String): MuToken(), Operator
}
fun <T> KeywordPattern<T>.mergeOf(vararg paths: String, transform: (String) -> T) = paths.forEach { this[it] = transform(it) }
fun KeywordPattern<MuToken>.mergeKeywords(vararg kws: String) = mergeOf(*kws) { MuToken.Keyword(it) }

fun KeywordPattern<MuToken>.mergeOps(vararg ops: String) = mergeOf(*ops) { MuToken.Op(it) }
fun KeywordPattern<MuToken>.mergeComposeAssignOps(vararg ops: String) = ops.forEach {
  val tok = MuToken.ComposeAssignOp(it)
  this[op] = tok; this[op+"="] = tok
}

abstract class BasicParts {
  val digit = digitFor('0'..'9')
  val hexUpper = digitFor('A'..'F', 'A', 10)
  val hexLower = digitFor('a'..'f', 'a', 10)
  val hexDigit = Decide(digit, hexLower, hexUpper).mergeFirst { if (it in 0..9) 0 else 2 }
}

abstract class MuLexical: BasicParts {
//0[xX][0-9A-Fa-f]+
val hexPart = Repeat(asInt(16), hexDigit)
val zeroNotation = Decide(
  hexPart prefix elementIn('X', 'x').toConstant('x'),
  StickyEnd(item('0') or EOF, 0) { if (peek in '0'..'8') error("no octal notations"); -1 }
).mergeFirst {0}
//\\d+
//\\d+\\.\\d+
val int = Contextual(digit) {
  if (it == 0) zeroNotation
  else Repeat(asInt(10, it), digit).Many()
}
val fraction = int prefix item('.')
val num = Seq(::IntTuple, int, fraction.toDefault(-1))
val escape = MapPattern(mapOf('"' to '"', 't' to '\t', 'n' to '\n', 'r' to '\r'))
val strPart = Decide(Contextual(item('\\')) {escape}.mergeFirst {'\\'}, !elementIn('"', '\n')).mergeFirst { if (it in escape.map.values) 0 else 1 }
//(\\")((?<!\\\\)\\\\\\1|.)*?\\1
val str = SurroundBy(item('"') to item('"'), Repeat(asString(), strPart) )
//(\\')((?<!\\\\)\\\\\\1|.)*?\\1
val str1 =
//\\$?[_a-zA-Z][_a-zA-Z0-9]*
val name =
//^#!.*
val shellBang = stringFor(!newlineChar) prefix item('#')
//'//[^\n]*'
val comment = stringFor(!newlineChar)
//'/\\*.*?\\*/'
val comment1 = stringFor(!newlineChar)

//[ \t\r]+
val ws1 = Repeat(asString(), elementIn(' ', '\t', '\r'))

// braces
val keywords = KeywordPattern<MuToken>().apply {
  mergeStrings("nil" to MuToken.Nil)
  mergeStrings("true" to MuToken.Bool(true), "false" to MuToken.Bool(false))
  mergeOps("and", "or", "xor")
  mergeKeywords("if", "elif", "else")
  mergeKeywords("while", "loop", "for", "in")
  mergeKeywords("return", "break", "continue")
  mergeKeywords("func", "type", "using", "module")
  mergeKeywords("try", "catch", "finally", "throw")
  mergeKeywords("operator", "yield", "by", "extern", "super", "attr")
  mergeOps("...", "..<", "..", ".")
  mergeKeywords("$", "->", ",", ";", "?", ":")
  //squares, parens
  mergeOps("===", "!==", "==", "!=")
  mergeOps(">=", "<=", ">", "<")
  mergeOps("=")
  mergeOf("~", "!") { MuToken.PrefixOp(it) }
  mergeComposeAssignOps(">>", "<<", "^", "|", "&")
  mergeComposeAssignOps("+", "-", "*", "/", "%")
}

}

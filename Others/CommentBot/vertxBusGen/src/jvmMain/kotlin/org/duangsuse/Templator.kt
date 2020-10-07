package org.duangsuse

typealias Globals = MutableMap<String, Any?>
typealias Stringify = (Any) -> String
typealias Destructify = (Any?, Globals) -> Unit

sealed class TemplatorAst {
  class Plain(val text: String): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Globals) { sb.append(text) }
  }
  class ValRef(val pipes: List<String>, val name: String): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Globals) {
      sb.append(pipes.foldRight(map.resolve(name)) { it, res ->
        map.getTyped<Stringify>(it, "bad function $it")(res)
      }.toString())
    }
  }
  class Block(val items: List<TemplatorAst>): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Globals) { items.forEach { it.fillTo(sb, map) } }
  }
  class BuildString(val name: String, val block: Block): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Globals) {
      val sb1 = map.getOrPut(name, ::StringBuilder) as StringBuilder
      block.fillTo(sb1, map)
    }
  }
  abstract class BaseFor(val name: String, val varName: String, val block: Block): TemplatorAst() {
    abstract fun onEach(value: Any?, map: Globals)
    override fun fillTo(sb: Appendable, map: Globals) {
      map.getTyped<Iterable<*>>(varName, "$varName not iterable").forEach { onEach(it, map); block.fillTo(sb, map) }
    }
  }
  class ForIn(name: String, varName: String, block: Block): BaseFor(name, varName, block) {
    override fun onEach(value: Any?, map: Globals) { map[name] = value }
  }
  class ForDo(name: String, varName: String, block: Block): BaseFor(name, varName, block) {
    override fun onEach(value: Any?, map: Globals) { map.getTyped<Destructify>(name, "bad destructor $name")(value, map) }
  }
  class If(val inverted: Boolean, val varName: String, val block: Block): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Globals) {
      val truthy = (map[varName] as? Boolean) == true
      if (if (inverted) !truthy else truthy) block.fillTo(sb, map)
    }
  }
  protected fun Globals.resolve(name: String) = this[name] ?: error("undefined variable $name")
  protected inline fun <reified T> Globals.getTyped(name: String, message: String) = resolve(name) as? T ?: error(message)
  abstract fun fillTo(sb: Appendable, map: Globals)
}

abstract class SubseqParser(protected var text: CharSequence) {
  object End: Exception("no more")
  protected fun drop(n: Int) { text = text.run { subSequence(n, length) } }
  protected fun dropTo(sb: Appendable, n: Int) { sb.append(text.subSequence(0, n)); drop(n) }
  protected fun impossible(): Nothing = throw Error()
  protected inline infix fun Int.minus1(op: () -> Int) = if (this == -1) op() else this
}

/**
 * ```plain
 * Top = Item*
 * Block = Item* end
 * Item = plain | ValRef | BuildString | For | If
 * ValRef = Name* Name
 * BuildString = buildString Name Block
 * For = for Name (in | do) Name Block
 * If = if ('!')? Name Block
 * ```
 *
 * Recursive descent parser.
 */
class TemplatorParser(text: CharSequence): SubseqParser(text) {
  enum class TokenKind { Plain, Squared, Braced }
  private val braceKind = mapOf('[' to TokenKind.Squared, '{' to TokenKind.Braced)
  private val sb = StringBuilder()
  private fun plainToken() = (TokenKind.Plain to sb.toString()).also { if (sb.isEmpty()) throw End; sb.clear() }
  fun readToken(): Pair<TokenKind, String> {
    while (text.isNotEmpty()) {
      val idxMinus = text.indexOf('-') minus1 { dropTo(sb, text.length); -1 }
      if (idxMinus == text.lastIndex) break
      braceKind[text[idxMinus+1]]?.let {
        dropTo(sb, idxMinus)
        if (sb.isNotEmpty()) return plainToken()
        drop(2/*-[*/)
        val closing = when (it) { TokenKind.Squared -> ']'; TokenKind.Braced -> '}'; else -> impossible() }
        val idxClose = text.indexOf(closing) minus1 { error("$it: where is $closing to close?") }
        val innerSb = StringBuilder()
        dropTo(innerSb, idxClose); drop(1/*]*/)
        return it to innerSb.toString()
      } ?: run { dropTo(sb, idxMinus+1/*-*/) }
    }
    return plainToken()
  }
  var lastToken: Pair<TokenKind, String> = readToken() // makes readItem -{end} able to fallback to readBlock
  private fun nextToken() { lastToken = readToken() }
  private inline fun <T> readList(read: () -> T?, next: () -> Unit): List<T> {
    val collected = mutableListOf<T>()
    try { while (true) { collected.add(read() ?: break); next() } } catch (_: End) {}
    return collected
  }
  private fun expect(kind: TokenKind, name: String): String {
    val (tok, text) = lastToken
    if (tok != kind) error("expecting $kind $name, not $tok: $text")
    return text
  }
  private fun error(message: String): Nothing {
    kotlin.error("$message\nNear:\n$text")
  }
  fun readTop() = readList(::readItem) { nextToken() }
  fun readBlock(): TemplatorAst.Block {
    val items = readList(::readItem) { nextToken() }
    if (expect(TokenKind.Braced, "end of code block").trim() != "end") error("expecting block end")
    try { nextToken() } catch (_: End) {} // EOF -{end}
    return TemplatorAst.Block(items)
  }
  fun readItem(): TemplatorAst? {
    val (tok, text) = lastToken
    return when (tok) {
      TokenKind.Plain -> TemplatorAst.Plain(text)
      TokenKind.Squared -> text.splitWs().let { if (it.isEmpty()) error("empty ref"); TemplatorAst.ValRef(it.subList(0, it.size-1), it.last()) }
      TokenKind.Braced -> {
        val parts = text.splitWs(); if (parts.isEmpty()) error("empty command brace")
        fun t(i: Int, name: String) = try { parts[i] } catch (_: IndexOutOfBoundsException) { error("$name param required in ${parts[0]}") }
        val command = parts[0]; if (command == "end") return null
        nextToken() // skip statement head for readBlock()
        when (command) {
          "buildString" -> TemplatorAst.BuildString(t(1, "name"), readBlock())
          "for" -> { when (val mode = t(2, "mode")) { "in" -> TemplatorAst.ForIn(t(1,"name"), t(3,"varName"), readBlock()); "do" -> TemplatorAst.ForDo(t(1,"varName"), t(3,"opName"), readBlock()); else -> error("unknown mode $mode") } }
          "if" -> { if (parts.size == 2) t(1, "varName").let { val inverted = (it[0] == '!');
            TemplatorAst.If(inverted, it.removePrefix("!"), readBlock()) } else error("use if like {if name} or {if !name}") }
          else -> error("unknown command $command")
        }
      }
    }
  }
  private fun CharSequence.splitWs() = split(' ', '\t', '\n', '\r')
}

object Templator {
  fun fillWith(map: Map<String, Any?>, vararg templates: TemplatorAst): String {
    val lastSb = StringBuilder()
    val globals = map.toMutableMap()
    templates.forEach { lastSb.clear(); it.fillTo(lastSb, globals) }
    return lastSb.toString()
  }
}

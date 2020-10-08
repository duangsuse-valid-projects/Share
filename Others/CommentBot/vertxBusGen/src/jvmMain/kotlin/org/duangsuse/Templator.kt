package org.duangsuse

import java.io.File
object Platform {
  fun readFileText(path: String) = File(path).readText()
  fun getenv(): MutableMap<String, String> = System.getenv()
  fun lineSeparator(): String = System.lineSeparator()
}

typealias Globals = MutableMap<String, Any?>
typealias Processor = Scope.(Any) -> Any
typealias Destructor = Scope.(Any?) -> Unit

interface Scope {
  operator fun get(key: String): Any?
  operator fun set(key: String, value: Any?)
  fun enterBlock(); fun leaveBlock()
  fun closure() = this
}
open class DynamicScoping(val globals: Globals): Scope {
  private val stack = mutableListOf<Globals?>()
  override fun get(key: String) = globals[key]
  override fun set(key: String, value: Any?) {
    if (stack.isNotEmpty()) {
      val parent = stack.getOrInit(stack.lastIndex, ::mutableMapOf)
      parent[key] = globals[key]
    }
    globals[key] = value
  }
  override fun enterBlock() { stack.add(null) }
  override fun leaveBlock() {
    val parent = stack.removeAt(stack.lastIndex) ?: return // no set() called on that
    for ((k, oldV) in parent.entries) globals[k] = oldV
  }
  override fun closure() = LexicalScope(globals, stack.flatMap { it?.keys ?: emptySet() }
    .associateWithTo(mutableMapOf()) { globals[it] })
}
/** Just [DynamicScoping] with cloned flattened upvalues as globals */
class LexicalScope(private val topGlobals: Globals, upvalues: Globals): DynamicScoping(upvalues) {
  override fun get(key: String): Any? {
    return super.get(key) ?: topGlobals[key]
  }
  override fun closure() = LexicalScope(topGlobals, globals.toMutableMap())
  override fun toString() = "$topGlobals -> $globals"
}
fun Scope.resolve(name: String) = this[name] ?: error("undefined variable $name")
inline fun <reified T:Any> Scope.getTyped(name: String, message: String) = resolve(name) as? T ?: error(message)

private inline fun <T> MutableList<T?>.getOrInit(index: Int, init: () -> T): T {
  if (this[index] == null) this[index] = init()
  @Suppress("unchecked_cast") return this[index] as T
}

sealed class TemplatorAst {
  class Plain(val text: String): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Scope) { sb.append(text) }
  }
  class ValRef(val pipes: List<String>, val name: String): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Scope) {
      sb.append(pipes.foldRight(map.resolve(name)) { it, res ->
        if (it[0] == '=') { map[it.substring(1, it.length)] = res; res }
        else try { map.getTyped<Processor>(it, "bad function $it")(map, res) }
          catch (e: Exception) { throw Exception("Failed calling process $it: ${e.message}\nin $pipes <- $name with res: $res", e) }
      }.toString())
    }
  }
  class Block(val items: List<TemplatorAst>): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Scope) { items.forEach { it.fillTo(sb, map) } }
  }
  abstract class HasBlock(val block: Block): TemplatorAst()
  class BuildString(val name: String, b: Block): HasBlock(b) {
    override fun fillTo(sb: Appendable, map: Scope) {
      val sb1 = map[name] as? StringBuilder ?: StringBuilder().also { map[name] = it }
      block.fillTo(sb1, map)
    }
  }
  abstract class BaseFor(val name: String, val varName: String, b: Block): HasBlock(b) {
    abstract fun onEach(value: Any?, map: Scope)
    override fun fillTo(sb: Appendable, map: Scope) {
      map.enterBlock()
      map.getTyped<Iterable<*>>(varName, "$varName not iterable").forEach { onEach(it, map); block.fillTo(sb, map) }
      map.leaveBlock()
    }
  }
  class ForIn(name: String, varName: String, b: Block): BaseFor(name, varName, b) {
    override fun onEach(value: Any?, map: Scope) { map[name] = value }
  }
  class ForDo(name: String, varName: String, b: Block): BaseFor(name, varName, b) {
    override fun onEach(value: Any?, map: Scope) { map.getTyped<Destructor>(name, "bad destructor $name")(map, value) }
  }
  class If(val inverted: Boolean, val varName: String, b: Block): HasBlock(b) {
    override fun fillTo(sb: Appendable, map: Scope) {
      val truthy = (map[varName] as? Boolean) == true
      map.enterBlock()
      if (if (inverted) !truthy else truthy) block.fillTo(sb, map)
      map.leaveBlock()
    }
  }
  class LetIn(val table: Table, b: Block): HasBlock(b) {
    override fun fillTo(sb: Appendable, map: Scope) {
      map.enterBlock()
      table.fill(map)
      block.fillTo(sb, map)
      map.leaveBlock()
    }
  }
  class Def(val name: String, val table: Table, b: Block): HasBlock(b) {
    override fun fillTo(sb: Appendable, map: Scope) {
      map.enterBlock()
      table.fill(map)
      val closed=map.closure(); val outs=StringBuilder()
      val op: Processor = { closed["it"] = it; block.fillTo(outs, closed); val res=outs.toString(); outs.clear(); res }
      map.leaveBlock()
      map[name] = op
    }
  }
  class Table(val variables: Map<String, String>) {
    fun fill(map: Scope) { for ((k, v) in variables.entries) if (v.isNotEmpty() && v[0] == '$') map[k] = map[v.substring(1)] else map[k] = v }
  }
  abstract fun fillTo(sb: Appendable, map: Scope)
}

object Templator {
  fun fillWith(map: Scope, vararg templates: TemplatorAst): String {
    val lastSb = StringBuilder()
    templates.forEach { lastSb.clear(); it.fillTo(lastSb, map) }
    return lastSb.toString()
  }
  fun createGlobal(map: Map<String, Any?>): Scope = DynamicScoping(map.toMutableMap().also { it.putAll(initGlobals) })
  fun compile(code: String) = TemplatorParser(code).readTop().let { TemplatorAst.Block(it) }
  val initGlobals: Globals = mutableMapOf("_" to " ", "TAB" to "\t",
    "NL" to Platform.lineSeparator(), "CR" to "\r", "LF" to "\n",
    "PLUS" to "+", "done" to "")
  init { // lib processes like variables/cat, join/split, replace/transform/match, repeat/map/filter/get
    @Suppress("unchecked_cast") val func = initGlobals as MutableMap<String, Processor>
    func["variables"] = { if (it is String && it.isNotEmpty()) resolve(it) else this.closure() }
    func["cat"] = { it.toS().split('+').joinToString("") { part -> this[part]?.toS() ?: part } }
    func["join"] = { (it as Iterable<*>).joinToString(getSeparator()) }
    func["split"] = { val s=it.toS(); getRegex()?.let(s::split) ?: s.split(getSeparator()) }
    func["replace"] = { val s=it.toS(); val subst=resolve("subst").toS(); getRegex()?.let { re -> s.replace(re, subst) } ?: s.replace(s, subst) }
    func["match"] = { val s=it.toS(); getRegex()?.let { re -> s.matches(re) } ?: s.contains(getTyped<String>("substr", "substr required")) }
    func["repeat"] = { val sb=StringBuilder(); val n=resolve("n").toS().toInt(); val char=this["item"]?.toS() ?: it; for (_t in (1..n)) sb.append(char); sb.toString() }
    func["map"] = { val op=getTyped<Processor>("op", "op: Processor required"); (it as Iterable<*>).map { item -> op(this, item ?: error("nulls in $it")) } }
    func["filter"] = { val op=getTyped<Processor>("op", "op: Predicate required"); (it as Iterable<*>).filter { item -> if (item == false) false else op(this, item!!) == true } }
    func["get"] = { (it as List<*>)[(this["index"] ?: 0).toString().toInt()]!! }
    func["transform"] = {
      val s = it.toString()
      when (val mode = resolve("mode") as String) {
        "lower" -> s.toLowerCase()
        "upper" -> s.toUpperCase()
        "capitalize" -> s.capitalize()
        "decapitalize" -> s.decapitalize()
        "reverse" -> s.reversed()
        "trim" -> s.trim()
        else -> throw IllegalArgumentException("unknown mode $mode")
      }
    }
  }
  private fun Scope.getRegex() = (this["regex"] as? String)?.let(::Regex)
  private fun Scope.getSeparator() = this["separator"] as? String ?: ", "
  private fun Any?.toS() = this?.toString() ?: "?"
  @JvmStatic fun main(vararg args: String) {
    val env = Platform.getenv()
    val scope = createGlobal(env)
    fun runRepl() {
      print("Single-line snippet REPL.\n>")
      val sb = StringBuilder()
      while (true) {
        val line = readLine() ?: break // single-line REPL... not stream based
        try { compile(line).fillTo(sb, scope); println(sb.toString()); sb.clear() } catch (e: Exception) { e.printStackTrace() }
        finally { print(">") }
      }
    }
    print(fillWith(scope, *Array(args.size) { i ->
      if (args[i] == "-") { runRepl(); TemplatorAst.Plain("") }
      else try { compile(Platform.readFileText(args[i])) }
      catch (e: Exception) { throw IllegalArgumentException("Failed to compile #$i, ${args[i]}", e) }
    }))
  }
}


abstract class SubseqParser(protected var text: CharSequence) {
  object End: Exception("no more")
  protected fun drop(n: Int) { text = text.run { subSequence(n, length) } }
  protected fun dropTo(sb: Appendable, n: Int) { sb.append(text.subSequence(0, n)); drop(n) }
  protected fun impossible(): Nothing = throw Error()
  protected inline infix fun Int.minus1(op: () -> Int) = if (this == -1) op() else this
}

open class TemplatorLexer(text: CharSequence): SubseqParser(text) {
  enum class TokenKind { Plain, Squared, Braced }
  private val braceKind = mapOf('[' to TokenKind.Squared, '{' to TokenKind.Braced)
  private val sb = StringBuilder()
  private fun plainToken() = (TokenKind.Plain to sb.toString()).also { if (sb.isEmpty()) throw End; sb.clear() }
  private fun readToken(): Pair<TokenKind, String> {
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
  private var lastTok: Pair<TokenKind, String>? = readToken()
  val lastToken get() = lastTok ?: error("no more")
  fun nextToken() { try { lastTok = readToken() } catch (_: End) { lastTok = null } }
  val isNotEnd get() = lastTok != null
  protected fun expect(kind: TokenKind, name: String): String {
    fun mismatch(): Nothing = error("expecting $kind $name")
    val (tok, text) = lastTok ?: mismatch()
    if (tok != kind) mismatch()
    return text
  }
  protected fun error(message: String): Nothing = kotlin.error(if (lastTok == null) "$message\nat EOF" else "$message\nnear $lastTok:\n$text")
}

/**
 * ```plain
 * Top = Item*
 * Block = Item* end
 * Item = plain | ValRef | BuildString | For | If | Let | Def
 * ValRef = ('='? Name)* Name
 * BuildString = buildString Name Block
 * For = for Name (in | do) Name Block
 * If = if ('!')? Name Block
 * Table = (Name'=' '$'?~white)*
 * Let = let Table in Block
 * Def = def Name Table Block
 * ```
 *
 * Recursive descent parser.
 */
class TemplatorParser(text: CharSequence): TemplatorLexer(text) {
  private inline fun <T> asList(read: () -> T): List<T> {
    val collected = mutableListOf<T>()
    try { while (isNotEnd) collected.add(read()) } catch (_: End) {}
    return collected
  }
  fun readTop() = asList(::readItem)
  private fun readBlock(): TemplatorAst.Block {
    fun isEnd(s: String) = s.trim() == "end"
    val items = asList { if (lastToken.run { first == TokenKind.Braced && isEnd(second) }) throw End; readItem() }
    expect(TokenKind.Braced, "end of code block")/*not EOF*/; nextToken()
    return TemplatorAst.Block(items)
  }
  fun readItem(): TemplatorAst {
    val (tok, text) = lastToken; nextToken()
    return try { when (tok) {
      TokenKind.Plain -> TemplatorAst.Plain(text)
      TokenKind.Squared -> (text.splitWs() ?: error("empty ref")).let { val rIdx=it.size-1; TemplatorAst.ValRef(it.subList(0, rIdx), it[rIdx]) }
      TokenKind.Braced -> {
        val parts = text.splitWs() ?: error("empty command brace")
        fun t(i: Int, name: String) = try { parts[i] } catch (_: IndexOutOfBoundsException) { error("$name as param $i required in ${parts[0]}") }
        fun table(ri:IntRange): TemplatorAst.Table {
          val m = mutableMapOf<String, String>()
          for (i in ri) { val kv=parts[i]; val qi=kv.indexOf('=') minus1 { error("expect = in arg `$kv'") }; m[kv.substring(0, qi)] = kv.substring(qi+1,kv.length) }
          return TemplatorAst.Table(m)
        }
        when (val command = parts[0]) {
          "buildString" -> TemplatorAst.BuildString(t(1, "name"), readBlock())
          "for" -> { when (val mode = t(2, "mode")) { "in" -> TemplatorAst.ForIn(t(1,"name"), t(3,"varName"), readBlock()); "do" -> TemplatorAst.ForDo(t(3,"opName"), t(1,"varName"), readBlock()); else -> error("unknown for-mode $mode") } }
          "if" -> { if (parts.size == 2) t(1, "varName").let { val inverted = (it[0] == '!');
            TemplatorAst.If(inverted, it.removePrefix("!"), readBlock()) } else error("use if like {if name} or {if !name}") }
          "let" -> {
            if (parts.size < 3 || parts[parts.size-1] != "in") error("use let like {let a=1 b=2 in}")
            TemplatorAst.LetIn(table(1 until parts.size-1), readBlock()) }
          "def" -> {
            if (parts.size < 2) error("use def name a=1")
            TemplatorAst.Def(t(1, "name"), table(2 until parts.size), readBlock()) }
          else -> error("unknown command $command")
        }
      }
    } } catch (e: IllegalStateException) { throw IllegalStateException("`$text': "+e.message, e.cause) }
  }
  private fun CharSequence.splitWs() = split(' ', '\t', '\n', '\r').filter(String::isNotEmpty).takeUnless { it.isEmpty() }
}

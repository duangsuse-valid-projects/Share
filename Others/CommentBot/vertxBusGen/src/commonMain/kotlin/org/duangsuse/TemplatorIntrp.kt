package org.duangsuse

import kotlin.jvm.JvmStatic

typealias Obj = Any?
typealias Globals = MutableMap<String, Obj>
typealias Processor = Scope.(Obj) -> Obj

interface Scope {
  operator fun get(key: String): Obj
  operator fun set(key: String, value: Obj)
  fun enterBlock(); fun leaveBlock()
  fun closure() = this
}
/** Basic enclosed scope implementation */
open class DynamicScoping(val globals: Globals): Scope {
  private val stack = mutableListOf<Globals?>()
  override fun get(key: String) = globals[key]
  override fun set(key: String, value: Obj) {
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
  override fun closure(): LexicalScope {
    val shadowed: Globals = mutableMapOf()
    for (frame in stack) if (frame != null) for (key in frame.keys) {
      shadowed[key] = globals[key]
    } // stack.flatMap { it?.keys ?: emptySet() }.associateWithTo(mutableMapOf()) { globals[it] }
    return LexicalScope(globals, shadowed)
  }
}
/** Just [DynamicScoping] with cloned, flattened upvalues as globals */
class LexicalScope(private val topGlobals: Globals, upvalues: Globals): DynamicScoping(upvalues) {
  override fun get(key: String) = super.get(key) ?: topGlobals[key]
  override fun closure() = LexicalScope(topGlobals, globals.toMutableMap())
  override fun toString() = "λ.$globals in $topGlobals"
}
fun Scope.resolve(name: String) = this[name] ?: error("undefined variable $name")
inline fun <reified T:Any> Scope.getTyped(name: String, message: String) = resolve(name) as? T ?: error(message)

private inline fun <T> MutableList<T?>.getOrInit(index: Int, init: () -> T): T {
  if (this[index] == null) this[index] = init()
  @Suppress("unchecked_cast") return this[index] as T
}
private fun impossible(): Nothing = throw Error()

/** [K]:[V] = 1:1 (instead of N:1) bi-directional map */
class BidirMap<K, V> private constructor(private val back: MutableMap<K, V>): MutableMap<K, V> by back {
  private val revBack = mutableMapOf<V, K>()
  fun keyOf(value: V) = revBack[value]
  override fun put(key: K, value: V): V? {
    require(!revBack.containsKey(value)) {"value $value repeated (in key $key)"}
    revBack[value] = key
    return back.put(key, value)
  }
  override fun putAll(from: Map<out K, V>) {
    from.values.firstOrNull { !revBack.containsKey(it) }?.let { throw IllegalArgumentException("value $it repeated (in map $from)") }
    for ((k, v) in from.entries) revBack[v] = k
    back.putAll(from)
  }
  override fun remove(key: K): V? {
    val value = back.remove(key)
    value?.let(revBack::remove)
    return value
  }
  override val values: MutableCollection<V> get() = revBack.keys
  override fun containsValue(value: V): Boolean = revBack.containsKey(value)
  override fun clear() { revBack.clear(); back.clear() }
  companion object {
    fun <K, V> of(vararg pairs: Pair<K, V>): BidirMap<K, V> {
      val bid = BidirMap<K, V>(mutableMapOf())
      for ((k, v) in pairs) bid[k] = v
      return bid
    }
    fun <FORM, K, V> translate(forms: Map<FORM, BidirMap<K, V>>, mode: Pair<FORM, FORM>, value: K): K? {
      val (src, dest) = mode
      val standard = forms[src]?.get(value)
      return if (standard == null) null else forms[dest]?.keyOf(standard)
    }
    fun <V> identity(vararg values: V) = BidirMap<V, V>(mutableMapOf()).apply { for (value in values) this[value] = value }
  }
}

//// == abstract Syntax Tree and script API ==
sealed class TemplatorAst {
  abstract fun fillTo(sb: Appendable, map: Scope)

  class Plain(val text: String): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Scope) { sb.append(text) }
  }
  class ValRef(val name: String): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Scope) { sb.append(map.resolve(name).toString()) }
  }
  class ValPipe(val pipes: List<String>, val name: String): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Scope) {
      val res = pipes.foldRight(map.resolve(name)) { it, res:Obj ->
        if (it[it.length-1] == '=') { map[it.substring(0, it.length-1)] = res; res }
        else try { map.getTyped<Processor>(it, "bad function $it")(map, res) }
        catch (c: ControlException) { throw c }
        catch (e: Exception) { throw Exception("Failed calling process $it: ${e.message}\nin $pipes <- $name with res: $res", e) }
      }.toString()
      if (name != "ok") sb.append(res)
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
    abstract fun onEach(value: Obj, map: Scope)
    override fun fillTo(sb: Appendable, map: Scope) {
      map.enterBlock()
      for (it in map.getTyped<Iterable<*>>(varName, "$varName not iterable")) {
        onEach(it, map)
        try { block.fillTo(sb, map) } catch (c: ControlException) {
          when (c.mode) { BREAK -> break; CONTINUE -> continue; else -> { map.leaveBlock(); throw c } }
        }
      }
      map.leaveBlock()
    }
  }
  class ForIn(name: String, varName: String, b: Block): BaseFor(name, varName, b) {
    override fun onEach(value: Obj, map: Scope) { map[name] = value }
  }
  class ForDo(name: String, varName: String, b: Block): BaseFor(name, varName, b) {
    override fun onEach(value: Obj, map: Scope) { map.getTyped<Processor>(name, "bad destructor $name")(map, value) }
  }
  class If(val inverted: Boolean, val varName: String, val a: Block, val b: Block): TemplatorAst() {
    override fun fillTo(sb: Appendable, map: Scope) {
      val truthy = (map[varName] as? Boolean) == true
      map.enterBlock()
      if (if (inverted) !truthy else truthy) a.fillTo(sb, map) else b.fillTo(sb, map)
      map.leaveBlock()
    }
  }
  class Table(val variables: Map<String, String>) {
    fun fill(map: Scope) { for ((k, v) in variables.entries) if (v.isNotEmpty() && v[0] == '$') map[k] = map[v.substring(1)] else map[k] = v }
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
      val params = mutableListOf<String>(); for ((k, v) in table.variables.entries) if (v == "?") params.add(k)
      val closed=map.closure(); val outs=StringBuilder()
      val op: Processor = proc@ {
        closed.enterBlock()
        closed["it"] = it; for (k in params) closed[k] = this[k]
        try { block.fillTo(outs, closed) }
        catch (c: ControlException) { if (c.mode == RETURN) return@proc c.value else throw c }
        finally { closed.leaveBlock() }
        val res=outs.toString(); outs.clear(); res
      }
      map.leaveBlock()
      map[name] = op
    }
  }
  class ControlException(val mode: Int, val value: Obj): Exception() {
    override val message: String? get() = "non-local control#$mode with $value"
  }
  companion object {
    val nop = Block(emptyList())
    const val RETURN = 0
    const val BREAK = 1
    const val CONTINUE = 2
  }
}

expect fun lineSeparator(): String
expect fun main(vararg args: String)
object Templator {
  fun fillWith(map: Scope, vararg templates: TemplatorAst): String {
    val lastSb = StringBuilder()
    templates.forEach { lastSb.clear(); it.fillTo(lastSb, map) }
    return lastSb.toString()
  }
  fun createGlobal(map: Map<String, Obj>): Scope = DynamicScoping(map.toMutableMap().also { it.putAll(initGlobals) })
  fun compile(code: String, mode: LangMode = LangMode.Normal) = TemplatorParser(code, mode).readTop().let { TemplatorAst.Block(it) }
  enum class LangMode { Normal, Pure }
  class ParseError(message: String, cause: Throwable? = null): Exception(message, cause)
  @JvmStatic fun main(vararg args: String) = org.duangsuse.main(*args)
  val initGlobals: Globals = mutableMapOf("_" to " ", "TAB" to "\t",
    "NL" to lineSeparator(), "CR" to "\r", "LF" to "\n",
    "PLUS" to "+", "QUEST_MARK" to "?", "ok" to "", "done" to "",
    "true" to true, "false" to false, "null" to null)
  val notImplemented: Processor = { error("not implemented on this platform") }
  init { // lib processes like variables/cat, join/split, replace/transform/match, repeat/map/filter/get
    @Suppress("unchecked_cast") val func = initGlobals as MutableMap<String, Processor>
    func["return"] = controlThrow(TemplatorAst.RETURN)
    func["break"] = controlThrow(TemplatorAst.BREAK)
    func["continue"] = controlThrow(TemplatorAst.CONTINUE)
    func["variables"] = { if (it is String && it.isNotEmpty()) resolve(it) else this.closure() }
    func["puts"] = { println(it); "" }; func["putsOnce"] = { print(it); "" }
    func["require"] = notImplemented
    func["rename"] = {  }
    func["cat"] = { it.toS().split('+').joinToString("") { part -> this[part]?.toS() ?: part } }
    func["range"] = { resolve("start").toI()..resolve("last").toI() }
    func["pair"] = { resolve("first") to resolve("second") }
    func["join"] = { (it as Iterable<*>).joinToString(vSeparator()) }
    func["split"] = { val s=it.toS(); vRegex()?.let { re -> s.split(re) } ?: s.split(vSeparator()) }
    func["replace"] = { val s=it.toS(); val subst=resolve("subst").toS(); vRegex()?.let { re -> s.replace(re, subst) } ?: s.replace(vSubstr(), subst) }
    func["match"] = { val s=it.toS(); vRegex()?.let { re -> s.matches(re) } ?: s.contains(vSubstr()) }
    func["repeat"] = { val sb=StringBuilder(); val n=resolve("n").toI(); val item=resolve("item").toS(); for (_t in (1..n)) sb.append(item); sb.toString() }
    func["map"] = { val op=getTypedReq<Processor>("op", "processor"); (it as Iterable<*>).map { item -> op(this, item) } }
    func["filter"] = { val op=getTypedReq<Processor>("test", "predicate"); (it as Iterable<*>).filter { item -> op(this, item) == true } }
    func["get"] = { (it as List<*>)[(this["index"] ?: 0).toI()] }
    func["size"] = { when (it) { is Collection<*> -> it.size; is CharSequence -> it.length; is Array<*> -> it.size; else -> error("size of $it unknown") } }
    func["transform"] = {
      val s = it.toS()
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
  private fun Obj.toS() = this?.toString() ?: "?"
  private fun Obj.toI() = this.toS().toInt()
  private fun Scope.vRegex() = (this["regex"] as? String)?.let(::Regex)
  private fun Scope.vSeparator() = this["separator"] as? String ?: ", "
  private fun Scope.vSubstr() = getTypedReq<String>("substr", "sub-string")
  private inline fun <reified T:Any> Scope.getTypedReq(name: String, desc: String) = getTyped<T>(name, "$name: $desc is required")
  private fun controlThrow(mode: Int): Processor = { throw TemplatorAst.ControlException(mode, it) }
}

//// == non-streamed Parser used in eval ==
abstract class SubseqParser(protected var text: CharSequence) {
  protected fun drop(n: Int) { text = text.run { subSequence(n, length) } }
  protected fun dropTo(sb: Appendable, n: Int) { sb.append(text.subSequence(0, n)); drop(n) }
  protected inline infix fun Int.minus1(op: () -> Int) = if (this == -1) op() else this
}
class Peek<T>(private val next: () -> T) {
  object End: Exception("no more")
  private var lastItem: T = next()
  private var tailConsumed = false
  val peek get() = lastItem
  fun consume(): T {
    val token = peek
    try { lastItem = next() }
    catch (_: End) { if (!tailConsumed) tailConsumed = true else throw End }
    return token
  }
  val isEnd get() = tailConsumed
}

typealias Token = Pair<TemplatorLexer.TokenKind, String>
open class TemplatorLexer(text: CharSequence, mode: Templator.LangMode): SubseqParser(text) {
  enum class TokenKind { Plain, Squared, Braced }
  private val sb = StringBuilder()
  private fun sbToken(kind: TokenKind): Token { val s=sb.toString(); sb.clear(); return (kind to s) }
  private fun readToken(): Token { // -{cmd} -[ref] text
    while (text.isNotEmpty()) {
      val idxMinus = text.indexOf('-') minus1 { dropTo(sb, text.length); -1 }
      if (idxMinus == text.lastIndex) break/*=do-while*/
      braceKind[text[idxMinus+1]]?.let {
        dropTo(sb, idxMinus)
        if (sb.isNotEmpty()) return sbToken(TokenKind.Plain)
        drop(2/*-[*/)
        val closing = when (it) { TokenKind.Squared -> ']'; TokenKind.Braced -> '}'; else -> impossible() }
        val idxClose = text.indexOf(closing) minus1 { throw Templator.ParseError("$it: where is $closing expected to close?\nnear:\n$text") }
        val innerSb = StringBuilder()
        dropTo(innerSb, idxClose); drop(1/*]*/)
        return it to innerSb.toString()
      } ?: run { dropTo(sb, idxMinus+1/*-*/) }
    }
    if (sb.isEmpty()) throw Peek.End
    return sbToken(TokenKind.Plain)
  }
  private fun readToken1(): Token { // (cmd) ref
    while (text.isNotEmpty()) {
      val idxPar = text.indexOf('(') minus1 { dropTo(sb, text.length); -1 }
      if (idxPar == text.lastIndex) break/*=do-while*/
      dropTo(sb, idxPar)
      if (sb.isNotEmpty()) return sbToken(TokenKind.Squared)
      drop(1/*(*/)
      val idxClose = text.indexOf(')') minus1 { throw Templator.ParseError("where is ) expected to close?\nnear:\n$text") }
      val innerSb = StringBuilder()
      dropTo(innerSb, idxClose); drop(1/*)*/)
      return TokenKind.Braced to innerSb.toString()
    }
    if (sb.isEmpty()) throw Peek.End
    return sbToken(TokenKind.Squared)
  }
  val token = Peek(when(mode) { Templator.LangMode.Normal -> ::readToken; Templator.LangMode.Pure -> ::readToken1 })
  companion object {
    private val braceKind = mapOf('[' to TokenKind.Squared, '{' to TokenKind.Braced)
  }
  protected fun expect(kind: TokenKind, name: String, predicate: (String) -> Boolean) {
    fun mismatch(): Nothing = error("expecting $kind $name")
    val (tok, text) = token.peek
    if (tok != kind || !predicate(text)) mismatch()
  }
  protected fun error(message: String): Nothing = throw Templator.ParseError(if (token.isEnd) "$message\nat EOF" else "$message\nnear ${token.peek}:\n$text")
}

/**
 * ```plain
 * Top = Item*
 * Block = Item* end
 * Item = plain | ValRef | BuildString | For | If | Let | Def
 * ValRef = ('='? Name)* Name
 * BuildString = buildString Name Block
 * For = for Name (in | do) Name Block
 * If = if ('!')? Name (Block | Item* else Block)
 * Table = (Name'=' '$'?~white)*
 * Let = (let Table in Block) | (let Table do Name*)
 * Def = def Name Table Block
 * ```
 *
 * Recursive descent parser.
 */
class TemplatorParser(text: CharSequence, mode: Templator.LangMode): TemplatorLexer(text, mode) {
  private inline fun <T> asList(read: () -> T): List<T> {
    val collected = mutableListOf<T>()
    try { while (true) collected.add(read()) } catch (_: Peek.End) {}
    return collected
  }
  fun readTop() = asList(::readItem)
  private fun readBlock(): TemplatorAst.Block {
    val items = asList { if (token.peek.run { first == TokenKind.Braced && isEnd(second) }) throw Peek.End; readItem() }
    readBlockEnd()
    return TemplatorAst.Block(items)
  }
  private fun isEnd(s: String) = s.trim() == "end"
  private fun readBlockEnd() {
    expect(TokenKind.Braced, "end of code block", ::isEnd)/*not EOF*/
    try { token.consume() } catch (_: Peek.End) { error("expect more end") }
  }
  fun readItem(): TemplatorAst {
    val (tok, text) = token.peek; token.consume()
    return try { when (tok) {
      TokenKind.Plain -> TemplatorAst.Plain(text)
      TokenKind.Squared -> (text.splitWs() ?: error("empty ref")).cValPipe { TemplatorAst.ValRef(it) }
      TokenKind.Braced -> {
        val parts = text.splitWs() ?: error("empty command brace")
        fun t(i: Int, name: String) = try { parts[i] } catch (_: IndexOutOfBoundsException) { error("$name as param $i required in ${parts[0]}") }
        fun table(ri:IntRange): TemplatorAst.Table {
          val m = mutableMapOf<String, String>()
          for (i in ri) { val kv=parts[i]; val qi=kv.indexOf('=') minus1 { error("expect = in arg `$kv'") }; m[kv.substring(0, qi)] = kv.substring(qi+1,kv.length) }
          return TemplatorAst.Table(m)
        }
        fun isElse(s: String) = s.trim() == "else"
        when (val command = parts[0]) {
          "buildString" -> TemplatorAst.BuildString(t(1, "name"), readBlock())
          "for" -> { when (val mode = t(2, "mode")) { "in" -> TemplatorAst.ForIn(t(1,"name"), t(3,"varName"), readBlock()); "do" -> TemplatorAst.ForDo(t(3,"opName"), t(1,"varName"), readBlock()); else -> error("unknown for-mode $mode") } }
          "if" -> { if (parts.size == 2) t(1, "varName").let { val inverted = (it[0] == '!'); val varName = it.removePrefix("!")
            val items = asList { if (token.peek.run { first == TokenKind.Braced && (isElse(second) || isEnd(second)) }) throw Peek.End; readItem() }
            val block = TemplatorAst.Block(items)
            if (isElse(token.peek.second)) { token.consume(); TemplatorAst.If(inverted, varName, block, readBlock()) }
            else { readBlockEnd(); TemplatorAst.If(inverted, varName, block, TemplatorAst.nop) } } else error("use if like {if name} or {if !name}") }
          "let" -> {
            val di = parts.indexOf("do")
            if (di != -1) {
              TemplatorAst.LetIn(table(1 until di), TemplatorAst.Block(listOf(parts.subList(di+1, parts.size).cValPipe { TemplatorAst.ValPipe(listOf(it), "done") })))
            } else { if (parts.size < 3 || parts[parts.size-1] != "in") error("use let like {let a=1 b=2 in}")
            TemplatorAst.LetIn(table(1 until parts.size-1), readBlock()) }
          }
          "def" -> {
            if (parts.size < 2) error("use def name a=1")
            TemplatorAst.Def(t(1, "name"), table(2 until parts.size), readBlock()) }
          else -> error("unknown command $command")
        }
      }
    } } catch (e: Templator.ParseError) { throw Templator.ParseError("`$text': "+e.message, e.cause) }
  }
  private inline fun List<String>.cValPipe(single: (String) -> TemplatorAst): TemplatorAst { val rIdx=size-1; return if (rIdx==0) single(this[0]) else TemplatorAst.ValPipe(subList(0, rIdx), this[rIdx]) }
  private fun CharSequence.splitWs() = split(' ', '\t', '\n', '\r').filter(String::isNotEmpty).takeUnless { it.isEmpty() }
}

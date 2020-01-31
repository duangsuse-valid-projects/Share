import kotlin.reflect.KProperty

import java.io.InputStream
import java.io.InputStreamReader
import java.nio.charset.Charset
import java.nio.charset.StandardCharsets

// Feed(peek;consume) => Input(MarkReset) => CharInput(SourceLocated)

typealias Cnt = Int
typealias Idx = Int

//// Part I: Feed stream

/** A stream with non-changing method [peek] */
interface Feed<out T> {
  val peek: T; fun consume(): T
  class End: Exception("no more")
}
interface MarkReset {
  fun mark() fun reset()
  fun unmark()
}
interface SourceLocated {
  val sourceLoc: SourceLocation
  data class SourceLocation(val file: String, var line: Cnt, var column: Cnt, var position: Cnt) {
    constructor(file: String): this(file, 1, 1, 0)
    val tag get() = "$file:$line:$column"
    override fun toString() = "$tag #$position"
  }
}



//// Side A: Iterator feeds
abstract class AbstractIteratorFeed<T>: Feed<T> {
  protected abstract fun nextItem(): T
  protected abstract fun hasNextItem(): Boolean
  protected abstract var nextOne: T
  private var tailConsumed = false
  override val peek get() = nextOne
  override fun consume() = peek.also {
    if (hasNextItem()) nextOne = nextItem()
    else if (!tailConsumed) tailConsumed = true
    else throw Feed.End()
  }
}

class IteratorFeed<T>(private val iterator: Iterator<T>): AbstractIteratorFeed<T>() {
  override fun nextItem() = iterator.next()
  override fun hasNextItem() = iterator.hasNext()
  override var nextOne = nextItem()
  override fun toString() = "IteratorFeed(${nextOne.rawString()}...${iterator})"
}

open class InputStreamFeed(private val reader: InputStreamReader): AbstractIteratorFeed<Char>() {
  constructor(stream_in: InputStream, charset: Charset = StandardCharsets.UTF_8): this(InputStreamReader(stream_in, charset))
  override fun nextItem() = reader.read().toChar()
  override fun hasNextItem() = nextOne != endTransaction
  override var nextOne = nextItem()
  open val endTransaction = '\u0004'
  override fun toString() = "InputStreamFeed(${nextOne.rawString()}...${reader})"
}

//// Side B: Slice feeds
interface Sized {
  val size: Cnt
}
val Sized.lastIndex get() = size.dec()
val Sized.indices get() = 0..lastIndex
val Sized.isEmpty get() = size == 0
val Sized.isNotEmpty get() = !isEmpty

interface Slice<out T>: Sized {
  operator fun get(index: Idx): T
}
abstract class AnyBy(val obj: Any) {
  override fun equals(other: Any?) =
    if (other !is AnyBy) obj == other
    else obj == other.obj
  override fun hashCode() = obj.hashCode()
  override fun toString() = obj.toString()
}

fun <T> slice(ary: Array<T>): Slice<T> = object: Slice<T>, AnyBy(ary) {
  override val size get() = ary.size
  override fun get(index: Idx) = ary[index]
}
fun <T> slice(list: List<T>): Slice<T> = object: Slice<T>, AnyBy(list) {
  override val size get() = list.size
  override fun get(index: Idx) = list[index]
}
fun slice(str: CharSequence): Slice<Char> = object: Slice<Char>, AnyBy(str) {
  override val size get() = str.length
  override fun get(index: Idx) = str[index]
}

class SliceFeed<T>(private val slice: Slice<T>): Feed<T>, StackMarkReset<Idx>() {
  override var saved = 0
  override val peek get() = try { slice[saved] }
    catch (_: IndexOutOfBoundsException) { throw Feed.End() }
  override fun consume() = try {  slice[saved++] }
    catch (_: IndexOutOfBoundsException) { throw Feed.End() }
  override fun toString() = "$showPeek@$saved...$slice"
  private val showPeek get() = runCatching{peek}.getOrNull()?.rawString() ?: "?>${slice.lastIndex}"
}

/// Auxiliary
fun <T> showRawString(value: T) = value.rawString()
fun <T> T.rawString() = toString().prefixTranslate(KOTLIN_ESCAPE, "\\").let {
  if (it.length == 1) it.surround("'", "'")
  else it.surround("\"", "\"")
}
val KOTLIN_ESCAPE = mapOf( // \"\'\t\b\n\r\$\\
  '"' to '"', '\'' to '\'',
  '\t' to 't', '\b' to 'b',
  '\n' to 'n', '\r' to 'r',
  '$' to '$', '\\' to '\\'
)
fun String.surround(prefix: String, suffix: String): String = prefix+this+suffix
fun String.prefixTranslate(map: Map<Char, Char>, prefix: String): String = fold (StringBuilder()) { sb, c ->
  map[c]?.let { sb.append(prefix).append(it) } ?: sb.append(c) }.toString()

fun impossible(): Nothing = error("impossible")

fun <T> MutableList<T>.removeLast() = removeAt(lastIndex)

abstract class StackMarkReset<T>: MarkReset {
  protected abstract var saved: T
  private val states: MutableList<T> by lazy(::mutableListOf)
  override fun mark() { states.add(saved) }
  override fun reset() { saved = states.removeLast() }
  override fun unmark() { states.removeLast() }
}

abstract class BufferMarkReset<BUF>: MarkReset {
  protected abstract fun newLayer(): BUF
  protected abstract fun consumeLayer(layer: BUF)
  protected val layers: MutableList<BUF> by lazy(::mutableListOf)
  override fun mark() { layers.add(newLayer()) }
  override fun reset() { layers.removeLast().let(::consumeLayer) }
  override fun unmark() { layers.removeLast() }
}

/** Rotate the order of reversed lists. `[a, b, c, d], [e, f] <= (stack top)` */
class StackLists<T>: Sized {
  private val stack: MutableList<T> = mutableListOf()
  fun add(list: Iterable<T>) = stack.addAll(list.reversed())
  fun removeLast(): T = stack.removeLast()
  override val size get() = stack.size
}

open class Trie<K, V>(var value: V?) {
  constructor(): this(null)
  val routes: MutableMap<K, Trie<K, V>> by lazy(::mutableMapOf)
  fun getPath(key: Iterable<K>): Trie<K, V> {
    var point = this
    for (k in key) point = point.routes[k] ?: errorNoPath(key, k)
    return point
  }
  fun getOrCreatePath(key: Iterable<K>): Trie<K, V> {
    var point = this
    for (k in key) point = point.routes.getOrPut(k, ::Trie)
    return point
  }
  operator fun get(key: Iterable<K>): V? = getPath(key).value
  operator fun set(key: Iterable<K>, value: V) { getOrCreatePath(key).value = value }
  fun collectKeys(): Set<List<K>> {
    return if (routes.isEmpty()) setOf(listOf()) //terminator size(/a/b/[] *1)
    else routes.flatMapTo(mutableSetOf()) { kr ->
      kr.value.collectKeys().mapToSet { listOf(kr.key)+it }
    }
  }
  fun toMap() = collectKeys().toMap { k -> k to this[k] }

  private fun errorNoPath(key: Iterable<K>, k: K): Nothing {
    val msg = "${key.joinToString("/")} @$k"
    throw NoSuchElementException(msg)
  }
  override fun toString() =
    if (value == null) "Path${routes}"
    else "Bin[$value]${routes}"
  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    return if (other == null || other !is Trie<*, *>) false
    else (routes == other.routes) && value == other.value
  }
  override fun hashCode() = routes.hashCode() xor value.hashCode()
}

fun <T, R> Iterable<T>.mapToSet(transform: (T) -> R) = mapTo(mutableSetOf(), transform)
fun <K, V> Map<K, V>.reversedMap(): Map<V, K> = entries.kvMap { kv -> kv.value to kv.key }

fun <A, B> Iterable<A>.toMap(transform: (A) -> Pair<A, B>): Map<A, B> {
  val map: MutableMap<A, B> = mutableMapOf()
  for (item in this) {
    val (k, v) = transform(item)
    map[k] = v
  }
  return map
}
fun <K, V, K1, V1> Iterable<Map.Entry<K, V>>.kvMap(transform: (Map.Entry<K, V>) -> Pair<K1, V1>): Map<K1, V1> {
  val map: MutableMap<K1, V1> = mutableMapOf()
  for (kv in this) {
    val (k1, v1) = transform(kv)
    map[k1] = v1
  }
  return map
}

//// Part II: Inputs
open class Input<T>(private val feed: Feed<T>): Feed<T>, BufferMarkReset<MutableList<T>>() {
  protected open fun onItem(item: T) {}
  private val resetList: StackLists<T> = StackLists()
  override val peek get() = feed.peek
  override fun consume() = (
    if (resetList.isNotEmpty)
      resetList.removeLast()
    else
      feed.consume()
    ).also { onItem(it); layers.lastOrNull()?.add(it) }
  override fun newLayer(): MutableList<T> = mutableListOf()
  override fun consumeLayer(layer: MutableList<T>) { resetList.add(layer) }

  override fun mark() = (feed as? MarkReset)?.mark() ?: super.mark()
  override fun reset() = (feed as? MarkReset)?.reset() ?: super.reset()
  override fun unmark() = (feed as? MarkReset)?.unmark() ?: super.unmark()
  override fun toString() = "Input:$feed"
}
////////
open class CharInput(file: String, feed: Feed<Char>, protected val eol: Char = '\n'): Input<Char>(feed), SourceLocated {
  override val sourceLoc = SourceLocated.SourceLocation(file)
  override fun onItem(item: Char) {
    when (item) {
      eol -> { ++sourceLoc.line; sourceLoc.column = 1 }
      else -> { ++sourceLoc.column }
    }
    ++sourceLoc.position
  }
  override fun toString() = super.toString()+":$sourceLoc"
}

open class CharInputCRLF(file: String, feed: Feed<Char>, eol: Char = '\n'): CharInput(file, feed, eol) {
  private var lastChar = '\u0000'
  override fun onItem(item: Char) {
    super.onItem(item)
    val seqCRLF = (lastChar == '\r' && item == '\n').also { lastChar = item }
    if (seqCRLF) when (eol) {
      '\r' -> { --sourceLoc.column }
      '\n' -> {}
    }
  }
}

fun <T> Feed<T>.consumeIf(predicate: Predicate<T>): T? =
  peek.takeIf(predicate)?.let { runCatching(::consume).getOrNull() }

fun <T> Feed<T>.takeWhile(predicate: Predicate<T>): Sequence<T> = sequence {
  while (true) {
    val item = consumeIf(predicate)
    yield(item ?: break)
  }
}

fun <T> Feed<T>.take(n: Cnt): Sequence<T> {
  var count = 0; return takeWhile { count++ != n }
}

//// Part III: Tuples

/** Tuple is an array-like object with `val (x0, x1) = (tup)` destruct and index access
 *
 * + __tuple items__ are stored in array [items], since Kotlin does not support reified type parameters in class,
 * __it should be overridden and created in subclasses using [size]__
 * + declare named indices first-class delegation [Index] with `var name: Type by index(idx)`
 * + destruct component 1..4 are provided, see [Tuple.component1]
 */
abstract class Tuple<E>(override val size: Cnt): Sized {
  protected abstract val items: Array<E>
  operator fun get(index: Idx) = items[index]
  operator fun set(index: Idx, value: E) { items[index] = value }
  fun toArray(): Array<E> = items

  protected fun <T> index(idx: Idx) = Index<T>(idx)
  protected class Index<T>(private val idx: Idx) {
    operator fun getValue(self: Tuple<out T>, _p: KProperty<*>): T = self[idx]
    operator fun setValue(self: Tuple<in T>, _p: KProperty<*>, value: T) { self[idx] = value }
  }

  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    return if (other == null || other !is Tuple<*>) false
    else (size == other.size) && items.contentEquals(other.items)
  }
  override fun hashCode(): Int  = 31 * size + items.contentHashCode()
  override fun toString(): String = "(${items.joinToString(", ")})"
}

data class Tuple2<A, B>(var first: A, var second: B)

operator fun <E> Tuple<E>.component1() = this[0]
operator fun <E> Tuple<E>.component2() = this[1]
operator fun <E> Tuple<E>.component3() = this[2]
operator fun <E> Tuple<E>.component4() = this[3]

fun <E> Tuple<E>.toList(): List<E> = indices.map(this::get)

//// Part IV: Fold operators
typealias Producer<T> = () -> T
typealias Consumer<T> = (T) -> Unit
typealias Predicate<T> = (T) -> Boolean

typealias Fold<T, R> = FoldOp<T, *, R>

interface Reducer<in T, out R> {
  fun accept(item: T)
  fun finish(): R
}
abstract class FoldOp<in A, B, out C> {
  protected abstract val initial: B
  protected abstract fun join(base: B, item: A): B
  protected abstract fun convert(base: B): C

  open fun reducer() = object: Reducer<A, C> {
    private var base: B = initial
    override fun accept(item: A) { base = join(base, item) }
    override fun finish(): C = convert(base)
  }
}
////////
abstract class Monoid<T>(mzero: T, private val mplus: T.(T) -> T): FoldOp<T, T, T>() {
  override val initial: T = mzero
  final override fun join(base: T, item: T): T = base.mplus(item)
  final override fun convert(base: T): T = base
}
abstract class Effect<A, B, C>: FoldOp<A, B, C>() {
  protected abstract fun accept(base: B, item: A)
  final override fun join(base: B, item: A): B = base.also { accept(base, item) }
}

typealias AsList<T> = Effect<T, MutableList<T>, List<T>>
fun <T> asList() = object: AsList<T>() {
  override val initial: MutableList<T> get() = mutableListOf()
  override fun accept(base: MutableList<T>, item: T) { base.add(item) }
  override fun convert(base: MutableList<T>): List<T> = base
}
typealias BuildStr = FoldOp<Char, StringBuilder, String>
fun buildStr() = object: BuildStr() {
  override val initial get() = StringBuilder()
  override fun join(base: StringBuilder, item: Char) = base.append(item)
  override fun convert(base: StringBuilder) = base.toString()
}

//// Part V: Pattern model
interface Pattern<T, R> {
  fun read(s: Input<T>): R?
  fun show(write: Consumer<T>, item: R?)
}
interface PositivePattern<T, R>: Pattern<T, R> {
  override fun read(s: Input<T>): R
}
inline val notParsed: Nothing? get() = null

fun <T, R> Pattern<T, R>.toDefault(defaultValue: R) = object: PositivePattern<T, R> {
  override fun read(s: Input<T>): R = this@toDefault.read(s) ?: defaultValue
  override fun show(write: Consumer<T>, item: R?) { this@toDefault.show(write, item!!) }
}
fun <T, R> Pattern<T, R>.tryRead(s: Input<T>): R? {
  fun read(): R? = try { this.read(s) }
    catch (_: Feed.End) { notParsed }
  val parsed: R?
  s.mark(); parsed = read()
  s.run { if (parsed == notParsed) reset() else unmark() }
  return parsed
}

//// Part VI: Pattern instances (Atom)
abstract class AbstractSatisfy<T>: Pattern<T, T> {
  abstract fun test(item: T): Boolean
  override fun read(s: Input<T>) = s.peek.takeIf(::test)?.let { s.consume() }
  override fun show(write: Consumer<T>, item: T?) { item?.let(write) }
}
open class Satisfy<T>(val predicate: Predicate<T>): AbstractSatisfy<T>() {
  override fun test(item: T) = predicate(item)
  override fun toString() = "+$predicate"
}
open class Deferred<T, R>(private val pat: Producer<Pattern<T, R>>): Pattern<T, R> {
  override fun read(s: Input<T>): R? = pat().read(s)
  override fun show(write: Consumer<T>, item: R?) { pat().show(write, item) }
}
////////
class AnyItem<T>: Satisfy<T>({ true }) {
  override fun toString() = "anyItem"
}
open class Item<T>(val x: T): AbstractSatisfy<T>() {
  override fun test(item: T) = item == x
  override fun toString() = "${x.rawString()}"
}

open class Element<T>(vararg val xs: T): AbstractSatisfy<T>() {
  override fun test(item: T) = item in xs
  override fun toString() = "(${xs.joinToString("|", transform = ::showRawString)})"
}
open class RangeElement(val xs: CharRange): AbstractSatisfy<Char>() {
  override fun test(item: Char) = item in xs
  override fun toString() = "$xs"
}

//// Part VII: SOR Pattern (Seq, Or, Repeat)
open class Seq<IN, T, TUP: Tuple<T>>(val allocator: Producer<TUP>, vararg val items: Pattern<IN, T>): Pattern<IN, TUP> {
  override fun read(s: Input<IN>): TUP? {
    val tuple = allocator()
    for ((i, pat) in items.withIndex())
      tuple[i] = pat.tryRead(s) ?: return notParsed
    return tuple
  }
  override fun show(write: Consumer<IN>, item: TUP?) {
    if (item == null) return
    for ((pat, state) in items.zip(item.toList())) pat.show(write, state)
  }
  override fun toString() = items.joinToString(" ").surround("(", ")")
}

abstract class Or<T, R>(vararg val cases: Pattern<T, R>): Pattern<T, R> {
  override fun read(s: Input<T>): R? {
    for (pat in cases) pat.tryRead(s)?.let { return it }
    return notParsed
  }
  override fun toString() = cases.joinToString("|").surround("(", ")")
}

abstract class Repeat<IN, T, R>(val fold: Fold<T, R>, val item: Pattern<IN, T>): Pattern<IN, R> {
  open val nbound: Predicate<Cnt> = {true}
  override fun read(s: Input<IN>): R? {
    val reducer = fold.reducer()
    var countParsed: Cnt = 0
    while (true) {
      val parsed = item.tryRead(s) ?: break
      reducer.accept(parsed).also { ++countParsed }
    }
    return reducer.finish().takeIf { nbound(countParsed) }
  }
  override fun toString() = "{$item}"
}

//// Part VIII: Helper pattern
open class Convert<T, R, R1>(val item: Pattern<T, R>, val from: (R) -> R1, val to: (R1) -> R): Pattern<T, R1> {
  override fun read(s: Input<T>): R1? = item.read(s)?.let(from)
  override fun show(write: Consumer<T>, item: R1?) { item?.let(to)?.let { this.item.show(write, it) } }
  override fun toString() = item.toString()
}
open class SurroundBy<T, R>(val lr: Pair<T, T>, val item: Pattern<T, R>): Pattern<T, R> {
  override fun read(s: Input<T>): R? {
    val (left, right) = lr; val parse: R?
    s.consumeIf { it == left } ?: return notParsed
    parse = item.read(s)
    s.consumeIf { it == right } ?: return notParsed
    return parse
  }
  override fun show(write: Consumer<T>, item: R?) {
    val (left, right) = lr
    item?.let { write(left); this.item.show(write, it); write(right) }
  }
}

class TriePattern<K, V>: Trie<K, V>(), Pattern<K, V> {
  override fun read(s: Input<K>): V? {
    var point: Trie<K, V> = this
    while (true)
      try { point = point.routes[s.consume()] ?: break } //FIXME
      // Kalc.read(CharInput("",SliceFeed(slice("12* 31")) ))
      catch (_: Feed.End) {break}
    return point.value
  }
  override fun show(write: Consumer<K>, item: V?) {
    if (item == null) return
    toMap().reversedMap()[item]?.let { it.forEach(write) }
  }
}

interface Join<T>: Comparable<Join<T>> {
  operator fun invoke(x0: T, x1: T): T
}
abstract class InfixPattern<IN, ATOM>(val atom: Pattern<IN, ATOM>, val op: Pattern<IN, Join<ATOM>>): Pattern<IN, ATOM> {
  abstract fun onError(base: ATOM, op1: Join<ATOM>): Nothing
  override fun read(s: Input<IN>): ATOM? {
    val base = atom.read(s) ?: return notParsed
    return infixChain(s, base)
  }
  fun infixChain(s: Input<IN>, base: ATOM, op_left: Join<ATOM>? = null): ATOM {
    val op1 = op_left ?: op.read(s) ?: return base  //'+' in 1+(2*3)... | atom "1"
    val rhs1 = atom.read(s) ?: onError(base, op1) //'2'
    val op2 = op.read(s) ?: return op1(base, rhs1) //(a⦁b) "terminated"
    return when { // lessThan b => win; default ("="): left assoc
      op1 <= op2 -> infixChain(s, op1(base, rhs1), op2) //(a ⦁ b) ⦁ ...
      op1  > op2 -> op1(base, infixChain(s, rhs1, op2)) //a ⦁ (b ⦁ ...)
      else -> impossible()
    }
  }
}

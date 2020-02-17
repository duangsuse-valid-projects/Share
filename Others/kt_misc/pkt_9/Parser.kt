import java.io.InputStream
import java.io.Reader
import java.io.InputStreamReader

import java.nio.charset.Charset
import java.nio.charset.StandardCharsets

import kotlin.reflect.KProperty

// File: util/CommonDefs
typealias Cnt = Int
typealias Idx = Int
typealias IdxRange = IntRange

typealias Producer<T> = () -> T
typealias Consumer<T> = (T) -> Unit
typealias Predicate<T> = (T) -> Boolean

typealias Pipe<T> = (T) -> T
typealias ActionOn<T> = T.() -> Unit
typealias ProducerOn<T, R> = T.() -> R
typealias ConsumerOn<T, A1> = T.(A1) -> Unit

fun unsupported(message: String): Nothing = throw UnsupportedOperationException(message)
fun impossible(): Nothing = throw IllegalStateException("impossible")

fun <E> MutableList<E>.removeLast() = removeAt(lastIndex)

typealias MonoPair<T> = Pair<T, T>
fun <T, R> MonoPair<T>.map(transform: (T) -> R): MonoPair<R> = Pair(transform(first), transform(second))

inline fun <T, reified R> Collection<T>.mapToArray(transform: (T) -> R): Array<R> {
  val mapFirst = transform(firstOrNull() ?: return emptyArray())
  val array: Array<R> = Array(size) {mapFirst}
  for ((i, x) in withIndex()) { array[i] = transform(x) }
  return array
}

inline fun <A:T, B:T, reified T> Pair<A, B>.items(): Array<T> = arrayOf(first, second)
fun CharRange.items(): Array<Char> = toList().toCharArray().toTypedArray()
inline fun <reified T> Collection<T>.toArray() = mapToArray {it}

fun <T, K, V> Iterable<T>.toMap(entry: (T) -> Pair<K, V>): Map<K, V> {
  val map: MutableMap<K, V> = mutableMapOf()
  forEach { val (k, v) = entry(it); map[k] = v }
  return map
}
fun <K, V> Map<K, V>.reversedMap(): Map<V, K> = entries.toMap { it.value to it.key }

/* val printHex = ap<Int, Int, String>(Int::toString, 16) then ::println */
inline infix fun <A, B, C> ((A) -> B).then(crossinline transform: (B) -> C): (A) -> C = { transform(invoke(it)) }
inline fun <A1, A2, R> flip(crossinline op: (A1, A2) -> R): (A2, A1) -> R = { b, a -> op(a, b) }
inline fun <T, A1, R> ap(crossinline op: T.(A1) -> R, x1: A1): (T) -> R = { it.op(x1) }

// File: util/TextPreety
interface Preety {
  fun toPreetyDoc(): Doc
  sealed class Doc {
    object Null: Doc()
    object None: Doc()
    data class Text(val obj: Any): Doc()
      { override fun toString() = super.toString() }
    data class SurroundBy(val lr: MonoPair<Doc>, override val sub: Doc): Doc(), DocWrapper
      { override fun toString() = super.toString() }
    data class JoinBy(val sep: Doc, override val subs: List<Doc>): Doc(), DocsWrapper
      { override fun toString() = super.toString() }
    fun <R> visitBy(visitor: Visitor<R>): R = when (this) {
      is Null -> visitor.see(this)
      is None -> visitor.see(this)
      is Text -> visitor.see(this)
      is JoinBy -> visitor.see(this)
      is SurroundBy -> visitor.see(this)
    }
    interface Visitor<out R> {
        fun see(t: Doc.Null): R
        fun see(t: Doc.None): R
        fun see(t: Doc.Text): R
        fun see(t: Doc.JoinBy): R
        fun see(t: Doc.SurroundBy): R
    }
    override fun toString() = visitBy(DocShow)
    private object DocShow: Visitor<String> {
      override fun see(t: Doc.Null) = "null"
      override fun see(t: Doc.None) = ""
      override fun see(t: Doc.Text) = t.obj.toString()
      override fun see(t: Doc.JoinBy) = t.subs.joinToString(t.sep.show(), transform = { it.show() })
      override fun see(t: Doc.SurroundBy) = "${t.lr.first.show()}${t.sub.show()}${t.lr.second.show()}"
      private fun Doc.show() = visitBy(DocShow)
    }
  }
  interface DocWrapper { val sub: Doc }
  interface DocsWrapper { val subs: List<Doc> }
}

abstract class PreetyAny: Preety {
  override fun toString() = toPreetyDoc().toString()
}

typealias PP = Preety.Doc

fun Any?.preetyOr(defaultValue: PP) = if (this == null) defaultValue else Preety.Doc.Text(this)
fun Any?.preetyOrNone() = preetyOr(Preety.Doc.None)
fun Any?.preety() = preetyOr(Preety.Doc.Null)
fun Iterable<*>.preety() = map(Any?::preety)

fun PP.surround(lr: MonoPair<PP>) = Preety.Doc.SurroundBy(lr, this)
fun List<PP>.join(sep: PP) = Preety.Doc.JoinBy(sep, this)
operator fun PP.plus(other: PP) = listOf(this, other).join(Preety.Doc.None)

fun PP.surroundText(lr: MonoPair<String>) = surround(lr.map(Any?::preety))
fun List<PP>.joinText(sep: String) = join(sep.preety())
operator fun PP.plus(other: Any?) = this + other.preety()

infix fun String.paired(other: String) = MonoPair(this, other)
fun String.monoPaired() = this paired this
val parens = "(" paired ")"
val squares = "[" paired "]"
val braces = "{" paired "}"
val quotes = "'" paired "'"
val dquotes = "\"" paired "\""

fun List<PP>.colonParens() = joinText(":").surroundText(parens)

//// == Raw Strings ==
fun CharSequence.prefixTranslate(map: Map<Char, Char>, prefix: String) = fold(StringBuilder()) { acc, char ->
  map[char]?.let { acc.append(prefix).append(it) } ?: acc.append(char)
}.toString()

/** `\"\'\t\b\n\r\$\\` */
internal val KOTLIN_ESCAPE = mapOf(
  '"' to '"', '\'' to '\'',
  '\t' to 't', '\b' to 'b',
  '\n' to 'n', '\r' to 'r',
  '$' to '$', '\\' to '\\'
)

internal val ESCAPED_CHAR = Regex("""^\\.$""")
fun String.rawString() = prefixTranslate(KOTLIN_ESCAPE, "\\").let {
  if (it.length == 1 || it.matches(ESCAPED_CHAR)) it.preety().surroundText(quotes)
  else it.preety().surroundText(dquotes)
}

fun Any?.rawPreety() = if (this == null) Preety.Doc.Null else toString().rawString()

// File: util/AnyValue&Rec
interface Eq {
  override fun equals(other: Any?): Boolean
  override fun hashCode(): Int
}

/** Transparent delegate for [Any] */
open class AnyBy(val obj: Any): Eq {
  override fun equals(other: Any?)
    = if (other is AnyBy) obj == other.obj
    else obj == other
  override fun hashCode() = obj.hashCode()
  override fun toString() = obj.toString()
}

open class RecursionDetect {
  protected var recursion = 0
  protected fun <R> recurse(op: Producer<R>): R {
    ++recursion; try { return op() } finally { --recursion }
  }
  protected val isActive get() = recursion > 1
}

// File: util/ArrangeModel
interface Sized { val size: Cnt }
val Sized.lastIndex: Idx get() = size.dec()
val Sized.indices: IdxRange get() = 0..lastIndex
val Sized.isEmpty get() = size == 0
val Sized.isNotEmpty get() = !isEmpty

//// == Abstract ==
// Sized { size } (lastIndex, indices, isEmpty)
// Slice: Sized { get }
//   Instance: Array<E>, List<E>, CharSequence
// Tuple2, Tuple (tupleOf, emptyTuple)
//   TypedTuple (IntTuple..., tupleOf(::IntTuple, 1, 2) )
//   DynamicTuple (AnyTuple, anyTupleOf, getAs<T>, indexAs<T>)

interface Slice<out E>: Sized {
  operator fun get(index: Idx): E
  companion object Instance {
    operator fun <E> invoke(array: Array<E>): Slice<E> = object: AnyBy(array), Slice<E> {
      override val size get() = array.size
      override fun get(index: Idx) = array[index]
    }
    operator fun <E> invoke(list: List<E>): Slice<E> = object: AnyBy(list), Slice<E> {
      override val size get() = list.size
      override fun get(index: Idx) = list[index]
    }
    operator fun invoke(str: CharSequence): Slice<Char> = object: AnyBy(str), Slice<Char> {
      override val size get() = str.length
      override fun get(index: Idx) = str[index]
    }
  }
}

data class Tuple2<A, B>(var first: A, var second: B)

/** Data storage base on array [items], [get]/[set] and destruct, delegate by [index] */
abstract class Tuple<E>(override val size: Cnt): Slice<E> {
  protected abstract val items: Array<E>
  fun toArray() = items

  override fun get(index: Idx) = items[index]
  operator fun set(index: Idx, value: E) { items[index] = value }

  protected fun <E> Tuple<E>.index(idx: Idx): Index<E> = Index(idx)
  protected class Index<T>(private val idx: Idx) {
    operator fun getValue(self: Tuple<out T>, _p: KProperty<*>): T = self[idx]
    operator fun setValue(self: Tuple<in T>, _p: KProperty<*>, value: T) { self[idx] = value }
  }
  
  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    return if (other !is Tuple<*>) false
    else items.contentEquals(other.items)
  }
  override fun hashCode() = items.contentHashCode()
  override fun toString() = items.asIterable().preety().joinText(", ").surroundText(parens).toString()
}

operator fun <E> Tuple<E>.component1() = this[0]
operator fun <E> Tuple<E>.component2() = this[1]
operator fun <E> Tuple<E>.component3() = this[2]
operator fun <E> Tuple<E>.component4() = this[3]

fun <E> Tuple<E>.toList() = toArray().toList()
fun <E> Tuple<E>.asIterable() = toArray().asIterable()

//// == Abstract ==
inline fun <reified E> tupleOf(vararg items: E) = object: Tuple<E>(items.size) {
  override val items: Array<E> = arrayOf(*items)
}
inline fun <reified E> emptyTuple() = object: Tuple<E>(0) {
  override val items: Array<E> = emptyArray()
}

//// == Typed Tuples ==
open class IntTuple(size: Cnt): Tuple<Int>(size) { override val items = Array(size){0} }
open class LongTuple(size: Cnt): Tuple<Long>(size) { override val items = Array(size){0L} }
open class FloatTuple(size: Cnt): Tuple<Float>(size) { override val items = Array(size){0.0F} }
open class DoubleTuple(size: Cnt): Tuple<Double>(size) { override val items = Array(size){0.0} }

open class CharTuple(size: Cnt): Tuple<Char>(size) { override val items = Array(size){'\u0000'} }
open class StringTuple(size: Cnt): Tuple<String>(size) { override val items = Array(size){""} }

fun <T, TUPLE: Tuple<T>> tupleOf(type: (Cnt) -> TUPLE, vararg items: T): TUPLE {
  val tuple = type(items.size)
  for ((i, x) in items.withIndex()) tuple[i] = x
  return tuple
}
fun <T, TUPLE: Tuple<T>> tupleOf(type: Producer<TUPLE>, vararg items: T) = tupleOf({ _ -> type() }, *items)

/// == Dynamic Tuples ==
open class AnyTuple(size: Cnt): Tuple<Any>(size) {
  @Suppress("UNCHECKED_CAST")
  override val items = arrayOfNulls<Any>(size) as Array<Any>
}

fun anyTupleOf(vararg items: Any) = object: AnyTuple(items.size) {
  override val items = arrayOf(*items)
}

inline fun <reified T> Tuple<*>.getAs(idx: Idx) = this[idx] as T

fun <T> Tuple<*>.indexAs(idx: Idx): IndexAs<T> = IndexAs(idx)
class IndexAs<T>(private val idx: Idx) {
  @Suppress("UNCHECKED_CAST")
  operator fun getValue(self: Tuple<*>, _p: KProperty<*>): T = self[idx] as T
  operator fun setValue(self: Tuple<in T>, _p: KProperty<*>, value: T) { self[idx] = value }
}

// File: util/FoldModel
interface Reducer<in T, out R> {
  fun accept(value: T)
  fun finish(): R
}
interface Fold<in T, out R> {
  fun reducer(): Reducer<T, R>
}

/** Fold of [makeBase] and [onAccept] */
abstract class EffectFold<T, R: R0, R0>: Fold<T, R0> {
  protected abstract fun makeBase(): R
  protected abstract fun onAccept(base: R, value: T)
  override fun reducer() = object: Reducer<T, R0> {
    val base = makeBase()
    override fun accept(value: T) { onAccept(base, value) }
    override fun finish() = base
  }
}
/** Fold of [initial], [join], [convert] */
abstract class ConvertFold<T, A, R>: Fold<T, R> {
  protected abstract val initial: A
  protected abstract fun join(base: A, value: T): A
  protected abstract fun convert(base: A): R
  override fun reducer() = object: Reducer<T, R> {
    var base = initial
    override fun accept(value: T) { base = join(base, value) }
    override fun finish() = convert(base)
  }
}

/** Shorthand for [ConvertFold], use like `JoinFold(initial = 0,  append = Int::plus)` */
open class ConvertJoinFold<T, R>(override val initial: R, private val append: R.(T) -> R): ConvertFold<T, R, R>() {
  override fun join(base: R, value: T) = base.append(value)
  override fun convert(base: R) = base
}
class JoinFold<T>(initial: T, append: T.(T) -> T): ConvertJoinFold<T, T>(initial, append)

typealias InfixJoin<T> = (T, T) -> T

//// == Abstract ==
// EffectFold { makeBase, onAccept }
// ConvertFold { initial, join, convert }
// JoinFold(initial, append)

fun <T> asList() = object: EffectFold<T, MutableList<T>, List<T>>() {
  override fun makeBase(): MutableList<T> = mutableListOf()
  override fun onAccept(base: MutableList<T>, value: T) { base.add(value) }
}
fun asString() = object: ConvertFold<Char, StringBuilder, String>() {
  override val initial get() = StringBuilder()
  override fun join(base: StringBuilder, value: Char) = base.append(value)
  override fun convert(base: StringBuilder) = base.toString()
}

fun <T, R> Iterable<T>.fold(fold: Fold<T, R>): R {
  val reducer = fold.reducer()
  forEach(reducer::accept)
  return reducer.finish()
}

// File: FeedModel
interface Feed<out T>: Preety {
  val peek: T; fun consume(): T
  class End: NoSuchElementException("no more")
}
typealias AllFeed = Feed<*>

fun <IN> Feed<IN>.consumeOrNull() = runCatching(::consume).getOrNull()
fun <IN> Feed<IN>.consumeIf(predicate: Predicate<IN>): IN?
  = peek.takeIf(predicate)?.let { consumeOrNull() }

fun <IN> Feed<IN>.takeWhile(predicate: Predicate<IN>): Sequence<IN>
  = sequence { while (true) yield(consumeIf(predicate) ?: break) }

fun <IN> Feed<IN>.asSequence(): Sequence<IN>
  = sequence { while (true) yield(consumeOrNull() ?: break) }
fun <IN> Feed<IN>.asIterable() = asSequence().asIterable()

fun Feed<Char>.readText() = asIterable().joinToString("")

// NOTES ABOUT Feed:
// - Feed cannot be constructed using empty input
// - Feed.peek will yield last item *again* when EOS reached
fun AllFeed.isStickyEnd() = consumeOrNull() == null
// - Patterns like `Until(elementIn(' '), asString(), anyChar)` will fail when EOS entercounted
//      easiest workaround: append EOF or terminate char to end of *actual input*
fun <R> AllFeed.catchError(op: Producer<R>): R? = try { op() } catch (e: IllegalStateException) { this.error(e.message ?: e.toString()); null }

//// == SliceFeed & StreamFeed ==
// SliceFeed { position, viewport }
// StreamFeed { bufferIterator, convert, nextOne }
//   - IteratorFeed
//   - ReaderFeed

open class SliceFeed<T>(private val slice: Slice<T>): PreetyAny(), Feed<T> {
  init { require(slice.isNotEmpty) {"empty input"} }
  protected var position = 0
  override val peek get() = try { slice[position] }
    catch (_: IndexOutOfBoundsException) { slice[slice.lastIndex] }
  override fun consume() = try { slice[position++] }
    catch (_: IndexOutOfBoundsException) { --position; throw Feed.End() }
  override fun toPreetyDoc(): PP = "Slice".preety() + listOf(peek.rawPreety(), viewport(slice)).joinText("...").surroundText(parens)
  protected open fun viewport(slice: Slice<T>): PP
    = (position.inbound()..(position+10).inbound()).map(slice::get)
      .let { items -> items.preety().joinText(if (items.all { it is Char }) "" else ", ") }
  private fun Idx.inbound() = coerceIn(slice.indices)
}

abstract class StreamFeed<T, BUF, STREAM>(private val stream: STREAM): PreetyAny(), Feed<T> {
  protected abstract fun bufferIterator(stream: STREAM): Iterator<BUF>
  protected abstract fun convert(buffer: BUF): T
  private val iterator = bufferIterator(stream)
  protected var nextOne: BUF = try { iterator.next() }
    catch (_: NoSuchElementException) { require(false) {"empty input"}; impossible() }
  private var tailConsumed = false
  override val peek get() = convert(nextOne)
  override fun consume() = peek.also {
    if (iterator.hasNext()) nextOne = iterator.next()
    else if (!tailConsumed) tailConsumed = true
    else throw Feed.End()
  }
  override fun toPreetyDoc(): PP = "Stream".preety() + listOf(peek.rawPreety(), stream.preety()).joinText("...").surroundText(parens)
}

//// == Stream Feeds ==
class IteratorFeed<T>(iterator: Iterator<T>): StreamFeed<T, T, Iterator<T>>(iterator) {
  override fun bufferIterator(stream: Iterator<T>) = stream
  override fun convert(buffer: T) = buffer
}
class ReaderFeed(reader: Reader): StreamFeed<Char, Int, Reader>(reader) {
  constructor(s: InputStream, charset: Charset = StandardCharsets.UTF_8): this(InputStreamReader(s, charset))
  override fun bufferIterator(stream: Reader) = object: Iterator<Int> {
    override fun hasNext() = nextOne != (-1) //impossible
    override fun next() = stream.read()
  }
  override fun convert(buffer: Int) = buffer.toChar()
  override fun consume(): Char {
    if (nextOne == (-1)) throw Feed.End()
    else return super.consume()
  }
}

// File: InputModel
interface ErrorListener {
  var onError: ConsumerOn<AllFeed, ErrorMessage>
}
typealias ErrorMessage = String
typealias ErrorMessager = ProducerOn<AllFeed, ErrorMessage>

//// == Abstract ==
// SourceLocation <- SourceLocated { sourceLoc }
// ParseError(feed, message)
// Feed.tag: PP?; Feed.error(message)

interface SourceLocated { val sourceLoc: SourceLocation }
data class SourceLocation(val file: String, var line: Cnt, var column: Cnt, var position: Cnt): Preety, Cloneable {
  constructor(file: String): this(file,1,0, 0) // since only consumed items adds errors, column are counted from 0
  val tag get() = listOf(file, line, column).preety().joinText(":")
  override fun toPreetyDoc() = tag + ("#".preety() + position)
  override fun toString() = toPreetyDoc().toString()
  public override fun clone() = copy(file = file, line = line, column = column, position = position)
}

open class ParseError(val feed: AllFeed, message: ErrorMessage): Error(message.toString())
val AllFeed.tag: PP? get() = (this as? SourceLocated)?.sourceLoc?.tag
fun AllFeed.error(message: ErrorMessage) = (this as? ErrorListener)?.onError?.invoke(this, message) ?: kotlin.error(message)

//// == Input & CharInput ==
// Input { onItem, onError }
// CharInput (STDIN) { isCRLF, eol }

open class Input<T>(protected val feed: Feed<T>): PreetyAny(), Feed<T>, ErrorListener {
  protected open fun onItem(item: T) {}
  override var onError: ConsumerOn<AllFeed, ErrorMessage> = { message ->
    val inputDesc = this.tag ?: (this as? Filters<*>)?.parent?.tag ?: "parse fail near `$peek'"
    throw ParseError(this, "$inputDesc: $message")
  }
  override val peek get() = feed.peek
  override fun consume() = feed.consume().also(::onItem)
  override fun toPreetyDoc(): PP = "Input".preety() + ":" + feed.toPreetyDoc()
  open class Filters<T>(val parent: AllFeed, feed: Feed<T>): Input<T>(feed) {
    init { onError = (parent as? ErrorListener)?.onError ?: onError }
    override fun toPreetyDoc() = parent.toPreetyDoc()
  }
}

open class CharInput(feed: Feed<Char>, file: String): Input<Char>(feed), SourceLocated {
  protected open val isCRLF = false
  protected open val eol: Char = '\n'
  override val sourceLoc = SourceLocation(file)
  override fun onItem(item: Char) {
    if (isCRLF && item == '\r' && peek == '\n') when (eol) {
      '\r' -> { consume(); newLine() }
      '\n' -> newLine()
    } else when (item) {
      eol -> newLine()
      else -> { ++sourceLoc.column }
    }
    ++sourceLoc.position
  }
  private fun newLine() { ++sourceLoc.line; sourceLoc.column = 0 }
  override fun toPreetyDoc(): PP = super.toPreetyDoc() + ":" + sourceLoc.preety()
  companion object {
    val STDIN by lazy { CharInput(ReaderFeed(System.`in`), "<stdin>") }
  }
}

//// == Abstract ==
// Slice, Iterator, Reader (Char)
fun inputOf(text: String, file: String = "<string>") = CharInput(SliceFeed(Slice(text)), file)
fun <IN> inputOf(vararg items: IN) = Input(SliceFeed(Slice(items)))

fun <IN> inputOf(iterator: Iterator<IN>) = Input(IteratorFeed(iterator))
fun <IN> inputOf(iterable: Iterable<IN>) = inputOf(iterable.iterator())

fun inputOf(reader: Reader, file: String = "<read>") = CharInput(ReaderFeed(reader), file)

// File: pat/PatternModel
inline val notParsed: Nothing? get() = null
typealias Output<T> = Consumer<T>

//// "PPOP" (Pattern, Positive, Optional, PatternWrapper)
// Pattern { read(Feed), show(Output, value) }
// val notParsed: Nothing? = null

interface Pattern<IN, T>: Preety {
  fun read(s: Feed<IN>): T?
  fun show(s: Output<IN>, value: T?)
  override fun toString(): String
}
interface PositivePattern<IN, T>: Pattern<IN, T> {
  override fun read(s: Feed<IN>): T
}
interface OptionalPatternKind<T> { val defaultValue: T }
interface PatternWrapperKind<IN, T> { val item: Pattern<IN, T> }

typealias MonoPattern<IN> = Pattern<IN, IN>
typealias MonoPositivePattern<IN> = PositivePattern<IN, IN>
typealias MonoOptionalPattern<IN, T> = ConvertOptionalPattern<IN, IN, T>
typealias MonoPatternWrapper<IN, T> = ConvertPatternWrapper<IN, IN, T>

interface ConstantPattern<IN, T>: Pattern<IN, T> { val constant: T }
typealias MonoConstantPattern<IN> = ConstantPattern<IN, IN>

//// == OptionalPattern & PatternWrapper ==

abstract class ConvertOptionalPattern<IN, T, T1>(override val item: Pattern<IN, T>, override val defaultValue: T1): PreetyAny(),
  PositivePattern<IN, T1>, OptionalPatternKind<T1>, PatternWrapperKind<IN, T> {
  override fun toPreetyDoc() = listOf(item.preety(), defaultValue.rawPreety()).joinText("?:")
}
abstract class ConvertPatternWrapper<IN, T, T1>(override val item: Pattern<IN, T>): PreetyAny(),
  Pattern<IN, T1>, PatternWrapperKind<IN, T> {
  abstract fun wrap(item: Pattern<IN, T>): ConvertPatternWrapper<IN, T, T1>
  override fun toPreetyDoc() = item.toPreetyDoc()
}

//// == Optional Patterns (toDefault) ==
abstract class OptionalPattern<IN, T>(item: Pattern<IN, T>, defaultValue: T): ConvertOptionalPattern<IN, T, T>(item, defaultValue) {
  override fun show(s: Output<IN>, value: T?) = item.show(s, value ?: defaultValue)
}

fun <IN, T> Pattern<IN, T>.toDefault(defaultValue: T) = object: OptionalPattern<IN, T>(this, defaultValue) {
  override fun read(s: Feed<IN>) = item.read(s) ?: defaultValue
}
fun <IN, T> ConstantPattern<IN, T>.toDefault() = toDefault(constant)

//// == Pattern Wrappers ==
abstract class PatternWrapper<IN, T>(item: Pattern<IN, T>): ConvertPatternWrapper<IN, T, T>(item) {
  override fun read(s: Feed<IN>) = item.read(s)
  override fun show(s: Output<IN>, value: T?) = item.show(s, value)
}

inline operator fun <reified IN, T> MonoPatternWrapper<IN, T>.not() = wrap(!(item as SatisfyPattern<IN>))
inline fun <reified IN, T> MonoPatternWrapper<IN, T>.clam(noinline messager: ErrorMessager)
  = wrap((item as SatisfyPattern<IN>).clam(messager))

// Losing type information for T in ConvertPatternWrapper, required for fun show
@Suppress("UNCHECKED_CAST")
inline operator fun <reified IN, T> PatternWrapper<IN, T>.not() = wrap(!(item as ConvertPatternWrapper<IN, IN, T>))
@Suppress("UNCHECKED_CAST")
inline fun <reified IN, T> PatternWrapper<IN, T>.clam(noinline messager: ErrorMessager)
  = wrap((item as ConvertPatternWrapper<IN, IN, T>).clam(messager))

//// == Error Handling (clam, clamWhile) ==
// CharInput.addErrorList(): Pair<List<LocatedError>, CharInput>
// Input.addErrorList(): Pair<List<BoundError>, Input>
typealias LocatedError = Pair<SourceLocation, ErrorMessage>
fun CharInput.addErrorList(): Pair<List<LocatedError>, CharInput> {
  val errorList: MutableList<LocatedError> = mutableListOf()
  onError = { message -> errorList.add(sourceLoc.clone() to message) }
  return Pair(errorList, this)
}
typealias BoundError<IN> = Pair<IN, ErrorMessage>
fun <IN> Input<IN>.addErrorList(): Pair<List<BoundError<IN>>, Input<IN>> {
  val errorList: MutableList<BoundError<IN>> = mutableListOf()
  onError = @Suppress("unchecked_cast") { message -> errorList.add((peek as IN) to message) }
  return Pair(errorList, this)
}

// SatisfyPattern.clam(messager)
abstract class SatisfyPatternBy<IN>(protected open val self: SatisfyPattern<IN>): SatisfyPattern<IN>() {
  override fun test(value: IN) = self.test(value)
  override fun read(s: Feed<IN>) = self.read(s)
  override fun show(s: Output<IN>, value: IN?) = self.show(s, value)
  override fun toPreetyDoc() = self.toPreetyDoc()
}

/** Add error and __skip unacceptable__ [pat], yield [defaultValue] */
fun <IN, T> Feed<IN>.clamWhile(pat: Pattern<IN, *>, defaultValue: T, message: ErrorMessage): T {
  this.error(message)
  while (pat.read(this) != notParsed) {}
  return defaultValue
}
fun <IN, T> Pattern<IN, T>.clamWhile(pat: Pattern<IN, *>, defaultValue: T, messager: ErrorMessager) = object: OptionalPattern<IN, T>(this, defaultValue) {
  override fun read(s: Feed<IN>) = this@clamWhile.read(s) ?: s.clamWhile(pat, defaultValue, s.messager())
}

/** Add error, consume item until __pattern parses__ or feed end */
open class SatisfyClam<IN>(self: SatisfyPattern<IN>, val messager: ErrorMessager): SatisfyPatternBy<IN>(self) {
  override fun read(s: Feed<IN>): IN? = self.read(s) ?: run { s.error(s.messager())
    var parsed: IN? = null
    while (parsed == notParsed) {
      s.consumeOrNull() ?: break
      parsed = self.read(s)
    }; return@run parsed }
}
class SatisfyEqualClam<IN>(override val self: SatisfyEqualTo<IN>, messager: ErrorMessager): SatisfyClam<IN>(self, messager), MonoConstantPattern<IN> {
  override val constant get() = self.constant
}

fun <IN> SatisfyPattern<IN>.clam(messager: ErrorMessager) = SatisfyClam(this, messager)
fun <IN> SatisfyEqualTo<IN>.clam(messager: ErrorMessager) = SatisfyEqualClam(this, messager)

//// == State & Modify State ==
// StatedInput, StatedCharInput, stateAs<ST>
interface State<out ST> { val state: ST }

open class StatedInput<T, ST>(feed: Feed<T>, override val state: ST): Input<T>(feed), State<ST>
open class StatedCharInput<ST>(feed: Feed<Char>, file: String, override val state: ST): CharInput(feed, file), State<ST>

fun <T, ST> Feed<T>.withState(value: ST) = StatedInput(this, value)
fun <ST> CharInput.withState(value: ST) = StatedCharInput(this, sourceLoc.file, value)

@Suppress("UNCHECKED_CAST")
inline fun <reified ST> AllFeed.stateAs(): ST? = (this as? State<ST>)?.state

// PatternAlsoDo
// SatisfyAlsoDo, SatisfyEqualAlsoDo
// fun Pattern.alsoDo(op); ...
typealias AlsoDo<IN> = ConsumerOn<AllFeed, IN>

open class PatternAlsoDo<IN, T>(self: Pattern<IN, T>, val op: AlsoDo<T>): PatternWrapper<IN, T>(self) {
  override fun read(s: Feed<IN>) = super.read(s)?.also { s.op(it) }
  override fun wrap(item: Pattern<IN, T>) = PatternAlsoDo(this, op)
}
open class SatisfyAlsoDo<IN>(self: SatisfyPattern<IN>, val op: AlsoDo<IN>): SatisfyPatternBy<IN>(self) {
  override fun read(s: Feed<IN>): IN? = self.read(s)?.also { s.op(it) }
}
class SatisfyEqualAlsoDo<IN>(override val self: SatisfyEqualTo<IN>, op: AlsoDo<IN>): SatisfyAlsoDo<IN>(self, op), MonoConstantPattern<IN> {
  override val constant get() = self.constant
}

fun <IN, T> Pattern<IN, T>.alsoDo(op: AlsoDo<T>) = PatternAlsoDo(this, op)
fun <IN> SatisfyPattern<IN>.alsoDo(op: AlsoDo<IN>) = SatisfyAlsoDo(this, op)
fun <IN> SatisfyEqualTo<IN>.alsoDo(op: AlsoDo<IN>) = SatisfyEqualAlsoDo(this, op)

//// == Abstract ==
fun <T> Pattern<Char, T>.read(text: String) = read(inputOf(text))
fun <T> Pattern<Char, T>.readPartial(text: String): Pair<List<LocatedError>, T?> {
  val (e, input) = inputOf(text).addErrorList()
  return Pair(e, read(input))
}
fun <T> Pattern<Char, T>.show(value: T?): String? {
  if (value == null) return null
  val sb = StringBuilder()
  show({ sb.append(it) }, value)
  return sb.toString()
}
fun <T> Pattern<Char, T>.rebuild(text: String) = show(read(text))
fun <T> Pattern<Char, T>.rebuild(text: String, operation: ActionOn<T>) = show(read(text)?.apply(operation))


fun <IN, T> Pattern<IN, T>.read(vararg items: IN) = read(inputOf(*items))
fun <IN, T> Pattern<IN, T>.readPartial(vararg items: IN): Pair<List<BoundError<IN>>, T?> {
  val (e, input) = inputOf(*items).addErrorList()
  return Pair(e, read(input))
}
fun <IN, T> Pattern<IN, T>.show(value: T?): List<IN>? {
  if (value == null) return null
  val list: MutableList<IN> = mutableListOf()
  show({ list.add(it) }, value)
  return list
}
fun <IN, T> Pattern<IN, T>.rebuild(vararg items: IN) = show(read(*items))
fun <IN, T> Pattern<IN, T>.rebuild(vararg items: IN, operation: ActionOn<T>) = show(read(*items)?.apply(operation))

// == Patterns ==
// SURDIES (Seq, Until, Repeat, Decide) (item, elementIn, satisfy) (always, never)
// CCDP (Convert, Contextual, Deferred, Piped)
// SJIT (SurroundBy, JoinBy) (InfixPattern, TriePattern)

// == Extensions ==
// ArrangeModel: Sized, Slice, Tuple
// FoldModel: Fold
// InputLayer: Feed, Input, CharInput

// File: pat/AtomIES
abstract class SatisfyPattern<IN>: PreetyAny(), MonoPattern<IN> {
  abstract fun test(value: IN): Boolean
  override fun read(s: Feed<IN>) = s.consumeIf(::test)
  override fun show(s: Output<IN>, value: IN?) { value?.let(s) }
  /** Apply logical relation like (&&) (||) with 2 satisfy patterns */
  class LogicalConcat<IN>(val item: SatisfyPattern<IN>, val other: SatisfyPattern<IN>,
      val name: String, private val join: InfixJoin<Boolean>): SatisfyPattern<IN>() {
    override fun test(value: IN) = join(item.test(value), other.test(value))
    override fun toPreetyDoc() = listOf(item, other).preety().joinText(name)
  }
  infix fun and(next: SatisfyPattern<IN>) = LogicalConcat(this, next, "&", Boolean::and)
  infix fun or(next: SatisfyPattern<IN>) = LogicalConcat(this, next, "|", Boolean::or)
  operator fun not(): SatisfyPattern<IN> = object: SatisfyPattern<IN>() {
    override fun test(value: IN) = !this@SatisfyPattern.test(value)
    override fun toPreetyDoc(): PP{
      val pat = this@SatisfyPattern
      val showPat = pat.preety()
      return "!".preety() + if (pat is LogicalConcat<*>) showPat.surroundText(parens) else showPat
    }
  }
}
class SatisfyEqualTo<IN>(override val constant: IN): SatisfyPattern<IN>(), MonoConstantPattern<IN> {
  override fun test(value: IN) = value == constant
  override fun toPreetyDoc() = constant.rawPreety()
}

// item(), item(value)
fun <IN> item() = object: SatisfyPattern<IN>() {
  override fun test(value: IN) = true
  override fun toPreetyDoc() = "anyItem".preety()
}
fun <IN> item(value: IN) = SatisfyEqualTo(value)

// elementIn(a, b, c), elementIn(1..100), elementIn('a'..'z', 'A'..'Z')
fun <IN> elementIn(vararg values: IN) = object: SatisfyPattern<IN>() {
  override fun test(value: IN) = value in values
  override fun toPreetyDoc() = values.map { it.rawPreety() }.joinText("|").surroundText(parens)
}
fun <IN: Comparable<IN>> elementIn(range: ClosedRange<IN>) = object: SatisfyPattern<IN>() {
  override fun test(value: IN) = value in range
  override fun toPreetyDoc() = range.preety().surroundText(parens)
}
fun elementIn(vararg ranges: CharRange) = object: SatisfyPattern<Char>() {
  override fun test(value: Char) = ranges.any { range -> value in range }
  override fun toPreetyDoc() = ranges.map(::toDashPreety).join(Preety.Doc.None).surroundText(squares)
  private fun toDashPreety(r: CharRange) = listOf(r.first, r.last).preety().joinText("-")
}

// satisfy<Int>("even") { it % 2 == 0 }
fun <IN> satisfy(name: String = "?", predicate: Predicate<IN>) = object: SatisfyPattern<IN>() {
  override fun test(value: IN) = predicate(value)
  override fun toPreetyDoc() = name.preety().surroundText(parens)
}

fun <IN, T> always(value: T): ConstantPattern<IN, T> = object: PreetyAny(), ConstantPattern<IN, T> {
  override val constant = value
  override fun read(s: Feed<IN>) = constant
  override fun show(s: Output<IN>, value: T?) {}
  override fun toPreetyDoc() = listOf("always", value).preety().colonParens()
}
fun <IN, T> never(): Pattern<IN, T> = object: PreetyAny(), Pattern<IN, T> {
  override fun read(s: Feed<IN>) = notParsed
  override fun show(s: Output<IN>, value: T?) {}
  override fun toPreetyDoc() = "never".preety().surroundText(parens)
}

// anyChar
val anyChar = object: SatisfyPattern<Char>() {
  override fun test(value :Char) = true
  override fun toPreetyDoc() = "anyChar".preety()
}

infix fun <IN> SatisfyPattern<IN>.named(name: String) = object: SatisfyPatternBy<IN>(this) {
  override fun toPreetyDoc() = name.preety()
}

// File: pat/CombSURD

// SingleFeed and FoldPattern(Until, Repeat)

/** Peek feed used in [Until], [StickyEnd], etc. */
class SingleFeed<T>(val value: T): Feed<T> {
  private var valueConsumed = false
  override val peek = value
  override fun consume() = if (!valueConsumed)
    { valueConsumed = true; value }
  else throw Feed.End()
  override fun toPreetyDoc(): PP = "SingleFeed".preety() + value.preety().surroundText(parens) +
    (if (valueConsumed) ".".preety() else Preety.Doc.None)
}
fun <IN> Feed<IN>.singleFeed() = Input.Filters(this, SingleFeed(peek))
fun <IN, T> Pattern<IN, T>.testPeek(s: Feed<IN>) = read(s.singleFeed()) != notParsed

/** Pattern of [Iterable.fold] items, like [Until], [Repeat] */
abstract class FoldPattern<IN, T, R>(val fold: Fold<T, R>, val item: Pattern<IN, T>): PreetyAny(), Pattern<IN, R> {
  protected open fun unfold(value: R): Iterable<T> = defaultUnfold(value)
  override fun show(s: Output<IN>, value: R?) {
    if (value == null) return
    unfold(value).forEach { item.show(s, it) }
  }
}
internal fun <R, T> defaultUnfold(value: R): Iterable<T> = @Suppress("unchecked_cast") when (value) {
  is Iterable<*> -> value as Iterable<T>
  is String -> value.asIterable() as Iterable<T>
  else -> unsupported("unfold")
}

// "SURDIES"
// Seq(type: TUPLE, vararg items), Until(terminate, fold, item),
//   Repeat(fold, item) { greedy, bound }, Decide(vararg cases)

class Seq<IN, T, TUPLE: Tuple<T>>(val type: (Cnt) -> TUPLE, vararg val items: Pattern<IN, out T>): PreetyAny(), Pattern<IN, TUPLE> {
  constructor(type: Producer<TUPLE>, vararg items: Pattern<IN, out T>): this({ _ -> type() }, *items)
  override fun read(s: Feed<IN>): TUPLE? {
    val tuple = type(items.size)
    for ((i, x) in items.withIndex()) tuple[i] = x.read(s) ?: return notParsed
    return tuple
  }
  override fun show(s: Output<IN>, value: TUPLE?) {
    if (value == null) return
    for ((i, v) in value.toArray().withIndex())
      @Suppress("unchecked_cast") (items[i] as Pattern<IN, in @UnsafeVariance T>).show(s, v)
  }
  override fun toPreetyDoc(): PP = items.asIterable().preety().joinText(" ").surroundText(parens)
}

open class Until<IN, T, R>(val terminate: Pattern<IN, *>, fold: Fold<T, R>, item: Pattern<IN, T>): FoldPattern<IN, T, R>(fold, item) {
  override fun read(s: Feed<IN>): R? {
    val reducer = fold.reducer()
    while (!terminate.testPeek(s)) {
      val parsed = item.read(s) ?: return notParsed
      s.catchError { reducer.accept(parsed) } ?: return notParsed
    }
    return reducer.finish()
  }
  override fun toPreetyDoc(): PP = listOf(item, terminate).preety().joinText("~")
}

open class Repeat<IN, T, R>(fold: Fold<T, R>, item: Pattern<IN, T>): FoldPattern<IN, T, R>(fold, item) {
  override fun read(s: Feed<IN>): R? {
    val reducer = fold.reducer()
    var count = 0
    while (true) {
      val parsed = item.read(s) ?: break
      s.catchError { reducer.accept(parsed) } ?: return notParsed
      ++count; if (!greedy && count.inc() !in bounds) break
    }
    return if (count in bounds) reducer.finish() else notParsed
  }
  override fun show(s: Output<IN>, value: R?) {
    if (value == null) return
    var count = 0
    unfold(value).forEach { item.show(s, it); ++count }
    check(count in bounds) {"bad wrote count: $count"}
  }
  override fun toPreetyDoc(): PP = item.preety().surroundText(braces)

  // "repeat many" (0..MAX) - Repeat(...).Many(), RepeatUn(...).Many()
  protected open val greedy = true
  protected open val bounds = 1..Cnt.MAX_VALUE

  open inner class InBounds(override val bounds: IntRange, override val greedy: Boolean = true): Repeat<IN, T, R>(fold, item) {
    override fun toPreetyDoc() = listOf( super.toPreetyDoc(),
      (bounds as Any).preety().surroundText(parens) ).join(if (greedy) "g".preety() else Preety.Doc.None)
  }
  inner class Many: InBounds(0..Cnt.MAX_VALUE), OptionalPatternKind<R> {
    override val defaultValue = fold.reducer().finish()
    override fun toPreetyDoc() = item.preety().surroundText(braces) + "?"
  }
}

class Decide<IN, T>(vararg val cases: Pattern<IN, out T>): PreetyAny(), Pattern<IN, Tuple2<Idx, T>> {
  override fun read(s: Feed<IN>): Tuple2<Idx, T>? {
    for ((i, case) in cases.withIndex()) case.read(s)?.let { return Tuple2(i, it) }
    return notParsed
  }
  override fun show(s: Output<IN>, value: Tuple2<Idx, T>?) {
    if (value == null) return
    val (i, state) = value
    @Suppress("unchecked_cast") (cases[i] as Pattern<IN, in @UnsafeVariance T>).show(s, state)
  }
  override fun toPreetyDoc(): PP = cases.asIterable().preety().joinText("|").surroundText(parens)
}

// "rebuild" - UntilUn(+unfold), RepeatUn(+unfold)

class UntilUn<IN, T, R>(terminate: ConstantPattern<IN, T>, fold: Fold<T, R>, item: Pattern<IN, T>, val unfold: (R) -> Iterable<T>): Until<IN, T, R>(terminate, fold, item) {
  override fun unfold(value: R) = unfold.invoke(value)
}
class RepeatUn<IN, T, R>(fold: Fold<T, R>, item: Pattern<IN, T>, val unfold: (R) -> Iterable<T>): Repeat<IN, T, R>(fold, item) {
  override fun unfold(value: R) = unfold.invoke(value)
}

// item(), item(value)
// elementIn(vararg values), elementIn(ClosedRange), elementIn(vararg ranges: CharRange)
// satisfy(predicate)
// always(value), never()

/* val str = Seq(::StringTuple, item('"').toStringPat(), *anyChar until item('"')) */

fun <T> MonoPair<T>.toPat(): MonoPair<MonoConstantPattern<T>> = map(::item)
fun MonoPair<String>.toCharPat(): MonoPair<MonoConstantPattern<Char>> = map(String::single).toPat()

fun MonoPattern<Char>.toStringPat() = Convert(this, Char::toString, String::first)
fun Seq<Char, Char, CharTuple>.toStringPat() = Convert(this, { it.toArray().joinToString("") }, { tupleOf(::CharTuple, *it.toCharArray().toTypedArray()) })

infix fun MonoPattern<Char>.until(terminate: MonoConstantPattern<Char>)
  = arrayOf<Pattern<Char, String>>(Until(terminate, asString(), this), terminate.toStringPat())

// File: pat/WrapperCCDP
// "CCDP"
// Convert(item, transform: ConvertAs<T1, T>) constructor(item, to={unsupported})
// Contextual(head, body)
// Deferred(item: Producer<Pattern<IN, R>>)
// Piped(item, op)

data class ConvertAs<T1, T>(val from: (T) -> T1, val to: (T1) -> T)
class Convert<IN, T, T1>(item: Pattern<IN, T>, val transform: ConvertAs<T1, T>): ConvertPatternWrapper<IN, T, T1>(item) {
  constructor(item: Pattern<IN, T>, from: (T) -> T1, to: (T1) -> T): this(item, ConvertAs(from, to))
  constructor(item: Pattern<IN, T>, from: (T) -> T1): this(item, from, { unsupported("convert back") })

  override fun read(s: Feed<IN>) = item.read(s)?.let(transform.from)
  override fun show(s: Output<IN>, value: T1?) {
    if (value == null) return
    item.show(s, value.let(transform.to))
  }
  override fun wrap(item: Pattern<IN, T>) = Convert(item, transform)
}

class Contextual<IN, HEAD, BODY>(val head: Pattern<IN, HEAD>, val body: (HEAD) -> Pattern<IN, BODY>): PreetyAny(), Pattern<IN, Tuple2<HEAD, BODY>> {
  override fun read(s: Feed<IN>): Tuple2<HEAD, BODY>? {
    val context = head.read(s) ?: return notParsed
    val parsed = body(context).read(s) ?: return notParsed
    return Tuple2(context, parsed)
  }
  override fun show(s: Output<IN>, value: Tuple2<HEAD, BODY>?) {
    if (value == null) return
    val (context, parsed) = value
    head.show(s, context)
    body(context).show(s, parsed)
  }
  override fun toPreetyDoc() = head.preety() + "@"
}

class Deferred<IN, T>(val lazyItem: Producer<Pattern<IN, T>>): Pattern<IN, T>, RecursionDetect() {
  override fun read(s: Feed<IN>) = lazyItem().read(s)
  override fun show(s: Output<IN>, value: T?) = lazyItem().show(s, value)
  override fun toPreetyDoc(): PP = lazyItem().toPreetyDoc()
  override fun toString() = recurse { if (isActive) "recurse" else toPreetyDoc().toString() }
}

class Piped<IN, T>(item: Pattern<IN, T>, val op: Feed<IN>.(T?) -> T? = {it}): PatternWrapper<IN, T>(item) {
  override fun read(s: Feed<IN>): T? = item.read(s).let { s.op(it) }
  override fun wrap(item: Pattern<IN, T>) = Piped(item, op)
  override fun toPreetyDoc() = listOf("piped", item).preety().colonParens()
}

// Tuple2: flatten(), mergeFirst(first: (B) -> A), mergeSecond(second: (A) -> B)
/* val i2 = Seq(::IntTuple, *Contextual(item<Int>()) { item(it) }.flatten().items()) */

fun <IN, A, B> Pattern<IN, Tuple2<A, B>>.flatten(): Pair<Pattern<IN, A>, Pattern<IN, B>> {
  val item = this; var parsed: Tuple2<A, B>? = null
  val part1: Pattern<IN, A> = object: PreetyAny(), Pattern<IN, A> {
    override fun read(s: Feed<IN>) = item.read(s).also { parsed = it }?.first
    override fun show(s: Output<IN>, value: A?) {}
    override fun toPreetyDoc() = item.toPreetyDoc()
  }
  val part2: Pattern<IN, B> = object: PreetyAny(), Pattern<IN, B> {
    override fun read(s: Feed<IN>) = parsed?.second
    override fun show(s: Output<IN>, value: B?) = item.show(s, parsed)
    override fun toPreetyDoc() = "#2".preety()
  }
  return Pair(part1, part2)
}

fun <IN, A, B> Pattern<IN, Tuple2<A, B>>.mergeFirst(first: (B) -> A) = Convert(this, { it.second }, { Tuple2(first(it), it) })
fun <IN, A, B> Pattern<IN, Tuple2<A, B>>.mergeSecond(second: (A) -> B) = Convert(this, { it.first }, { Tuple2(it, second(it)) })

// File: pat/AuxiliarySJ
// "SJIT"
// SurroundBy(surround: Pair<ConstantPattern?, ConstantPattern?>, item)

typealias SurroundPair<IN> = Pair<MonoConstantPattern<IN>?, MonoConstantPattern<IN>?>
class SurroundBy<IN, T>(val surround: SurroundPair<IN>, val item: Pattern<IN, T>): PreetyAny(), Pattern<IN, T> {
  override fun read(s: Feed<IN>): T? {
    val (left, right) = surround
    if (left != null) left.read(s) ?: return notParsed
    val parsed = item.read(s)
    if (right != null) right.read(s) ?: return notParsed
    return parsed
  }
  override fun show(s: Output<IN>, value: T?) {
    val (left, right) = surround.map { it?.constant }
    value?.let { left?.let(s); item.show(s, value); right?.let(s) }
  }
  override fun toPreetyDoc() = item.preety().surround(surround.first.preetyOrNone() to surround.second.preetyOrNone())
}

//// == Surround Shorthands ==
infix fun <IN, T> Pattern<IN, T>.prefix(item: MonoConstantPattern<IN>) = SurroundBy(item to null, this)
infix fun <IN, T> Pattern<IN, T>.suffix(item: MonoConstantPattern<IN>) = SurroundBy(null to item, this)

// JoinBy(join, item) { onItem, onSep, AddListeners(onItem, onSep), OnItem(onItem) }

typealias DoubleList<A, B> = Tuple2<List<A>, List<B>>
open class JoinBy<IN, SEP, ITEM>(val sep: Pattern<IN, SEP>, val item: Pattern<IN, ITEM>): PreetyAny(), Pattern<IN, DoubleList<ITEM, SEP>> {
  protected open fun rescue(s: Feed<IN>, doubleList: DoubleList<ITEM, SEP>): ITEM? = notParsed
  override fun read(s: Feed<IN>): DoubleList<ITEM, SEP>? {
    val items: MutableList<ITEM> = mutableListOf()
    val seprators: MutableList<SEP> = mutableListOf()
    fun readItem() = item.read(s)?.also { items.add(it); onItem(it) }
    fun readSep() = sep.read(s)?.also { seprators.add(it); onSep(it) }
    val doubleList: DoubleList<ITEM, SEP> = Tuple2(items, seprators)

    readItem() ?: return notParsed
    var seprator = readSep()
    while (seprator != notParsed) {
      readItem() ?: if (sep is OptionalPatternKind<*> && seprator == sep.defaultValue) return doubleList
        else rescue(s, doubleList) ?: return notParsed
      seprator = readSep()
    }
    return doubleList
  }
  override fun show(s: Output<IN>, value: DoubleList<ITEM, SEP>?) {
    if (value == null) return
    val (values, sepratorList) = value
    val seprators = sepratorList.iterator()
    item.show(s, values.first())
    try { values.drop(1).forEach { sep.show(s, seprators.next()); item.show(s, it) } }
    catch (_: NoSuchElementException) { error("Missing seprator: ${sepratorList.size} vs. ${values.size}") }
  }
  override fun toPreetyDoc() = listOf(item, sep).preety().joinText("...").surroundText(braces)

  protected open fun onItem(value: ITEM) {}
  protected open fun onSep(value: SEP) {}

  inner open class AddListeners(private val onItem: Consumer<ITEM>, private val onSep: Consumer<SEP>): JoinBy<IN, SEP, ITEM>(sep, item) {
    override fun onItem(value: ITEM) = onItem.invoke(value)
    override fun onSep(value: SEP) = onSep.invoke(value)
  }
  inner class OnItem(onItem: Consumer<ITEM>): AddListeners(onItem, {})
}

//// == Merge JoinBy Join ==
fun <IN, SEP, ITEM> JoinBy<IN, SEP, ITEM>.mergeConstantJoin(constant: SEP) = mergeSecond { (0 until it.size.dec()).map { constant } }
fun <IN, SEP, ITEM> JoinBy<IN, SEP, ITEM>.mergeConstantJoin() = @Suppress("unchecked_cast") mergeConstantJoin((sep as MonoConstantPattern<SEP>).constant)

fun <IN, ITEM> JoinBy<IN, Char, ITEM>.concatCharJoin() = Convert(this,
  { Tuple2(it.first, it.second.joinToString("")) },
  { Tuple2(it.first, it.second.toList()) })

// File: pat/InfixPattern
// InfixChain(atom, infix)

data class Precedence(val ordinal: Int, val isRAssoc: Boolean)
infix fun String.infixl(prec: Int) = this to Precedence(prec, false)
infix fun String.infixr(prec: Int) = this to Precedence(prec, true)

class InfixOp<T>(val name: String, val assoc: Precedence, val join: InfixJoin<T>): Comparable<InfixOp<T>> {
  override fun compareTo(other: InfixOp<T>) = assoc.ordinal.compareTo(other.assoc.ordinal)
  override fun toString() = name
}

infix fun <T> Pair<String, Precedence>.join(op: InfixJoin<T>) = InfixOp(first, second, op)
fun <T> KeywordPattern<InfixOp<T>>.register(op: InfixOp<T>) { this[op.name] = op }

open class InfixPattern<IN, ATOM>(val atom: Pattern<IN, ATOM>, val op: Pattern<IN, InfixOp<ATOM>>): PreetyAny(), Pattern<IN, ATOM> {
  protected open fun rescue(s: Feed<IN>, base: ATOM, op1: InfixOp<ATOM>): ATOM? = notParsed.also { s.error("infix $base parse failed at $op1") }
  override fun read(s: Feed<IN>): ATOM? {
    val base = atom.read(s) ?: return notParsed
    return infixChain(s, base)
  }
  override open fun show(s: Output<IN>, value: ATOM?) { unsupported("infix show") }
  fun infixChain(s: Feed<IN>, base: ATOM, op_left: InfixOp<ATOM>? = null): ATOM? {
    val op1 = op_left ?: op.read(s) ?: return base  //'+' in 1+(2*3)... || return atom "1"
    val rhs1 = atom.read(s) ?: rescue(s, base, op1) ?: return notParsed //"2"
    val op2 = op.read(s) ?: return op1.join(base, rhs1) //'*' //(a⦁b) END: terminated

    fun associateLeft() = infixChain(s, op1.join(base, rhs1), op2) //(a ⦁ b) ⦁ ...
    fun associateRight() = infixChain(s, rhs1, op2)?.let { op1.join(base, it) } //a ⦁ (b ⦁ ...)
    return when { // lessThan b => first
      op1 < op2 -> associateLeft()
      op1  > op2 -> associateRight()
      else -> if (op1.assoc.isRAssoc) associateRight() else associateLeft()
    }
  }
  override fun toPreetyDoc() = listOf("InfixChain", op).preety().colonParens()
}

// File: pat/TriePattern

class MapPattern<K, V>(val map: Map<K, V>): PreetyAny(), Pattern<K, V> {
  override fun read(s: Feed<K>) = map[s.peek]?.let { if (s.isStickyEnd()) null else it }
  override fun show(s: Output<K>, value: V?) { if (value != null) reverseMap[value]?.let(s) }
  private val reverseMap = map.reversedMap()
  override fun toPreetyDoc() = listOf("map", map).preety().colonParens()
}

/*
val dict = KeywordPattern<String>().apply { mergeStrings("hello" to "你好", "world" to "世界") }
val noun = Repeat(asList(), dict)
*/
typealias KeywordPattern<V> = TriePattern<Char, V>

open class TriePattern<K, V>: Trie<K, V>(), Pattern<K, V> {
  override fun read(s: Feed<K>): V? {
    var point: Trie<K, V> = this
    while (true)
      try { point = point.routes[s.peek]?.also { onItem(s.consume()) } ?: break }
      catch (_: Feed.End) { break }
    return point.value?.also(::onSuccess) ?: onFail()
  }
  override fun show(s: Output<K>, value: V?) {
    if (value == null) return
    reverseMap[value]?.let { it.forEach(s) }
  }
  private val reverseMap by lazy { toMap().reversedMap() }
  override fun toPreetyDoc() = super.toString().preety()

  protected open fun onItem(value: K) {}
  protected open fun onSuccess(value: V) {}
  protected open fun onFail(): V? = notParsed
  override fun toString() = toPreetyDoc().toString()
}

//// == Trie Tree ==
open class Trie<K, V>(var value: V?) {
  constructor(): this(null)
  val routes: MutableMap<K, Trie<K, V>> by lazy(::mutableMapOf)

  operator fun get(key: Iterable<K>): V? = getPath(key).value
  operator fun set(key: Iterable<K>, value: V) { getOrCreatePath(key).value = value }
  operator fun contains(key: Iterable<K>) = try { this[key] != null } catch (_: NoSuchElementException) { false }
  fun toMap() = collectKeys().toMap { k -> k to this[k]!! }

  fun getPath(key: Iterable<K>): Trie<K, V> {
    return key.fold(initial = this) { point, k -> point.routes[k] ?: errorNoPath(key, k) }
  }
  fun getOrCreatePath(key: Iterable<K>): Trie<K, V> {
    return key.fold(initial = this) { point, k -> point.routes.getOrPut(k, ::Trie) }
  }
  fun collectKeys(): Set<List<K>> {
    if (routes.isEmpty() && value == null) return emptySet()
    val routeSet = routes.flatMapTo(mutableSetOf()) { kr ->
      val (pathKey, nextRoute) = kr
      return@flatMapTo nextRoute.collectKeys().map { listOf(pathKey)+it }
    }
    if (value != null) routeSet.add(emptyList())
    return routeSet
  }
  private fun errorNoPath(key: Iterable<K>, k: K): Nothing {
    val msg = "${key.joinToString("/")} @$k"
    throw NoSuchElementException(msg)
  }
  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    return if (other !is Trie<*, *>) false
    else (routes == other.routes) && value == other.value
  }
  override fun hashCode() = routes.hashCode() xor value.hashCode()
  override fun toString(): String = when {
    value == null -> "Path".preety() + routes
    value != null && routes.isNotEmpty() -> "Bin".preety() + value.preety().surroundText(squares) + routes
    value != null && routes.isEmpty() -> "Term".preety() + value.preety().surroundText(parens)
    else -> impossible()
  }.toString()
}

//// == Abstract ==
fun <K, V> Trie<K, V>.merge(vararg kvs: Pair<Iterable<K>, V>) {
  for ((k, v) in kvs) this[k] = v
}
fun <V> Trie<Char, V>.mergeStrings(vararg kvs: Pair<CharSequence, V>) {
  for ((k, v) in kvs) this[k] = v
}

operator fun <V> Trie<Char, V>.get(index: CharSequence) = this[index.asIterable()]
operator fun <V> Trie<Char, V>.set(index: CharSequence, value: V) { this[index.asIterable()] = value }
operator fun <V> Trie<Char, V>.contains(index: CharSequence) = index.asIterable() in this

// File: pat/MiscHelper
typealias CharPattern = MonoPattern<Char>
typealias CharConstantPattern = MonoConstantPattern<Char>

fun digitFor(cs: CharRange, zero: Char = '0', pad: Int = 0): Pattern<Char, Int>
  = Convert(elementIn(cs), { (it - zero) +pad }, { zero + (it -pad) })

fun asInt(radix: Int = 10, initial: Int = 0) = JoinFold(initial) { this*radix + it }
fun asLong(radix: Int = 10, initial: Long = 0L): Fold<Int, Long> = ConvertJoinFold(initial) { this*radix + it }

fun stringFor(char: CharPattern) = Repeat(asString(), char).Many()
fun stringFor(char: CharPattern, surround: MonoPair<CharPattern>)
  = surround.second.toStringPat().let { terminate -> Seq(::StringTuple, surround.first.toStringPat(), Until(terminate, asString(), char), terminate) }

val EOF = item('\uFFFF')
class StickyEnd<IN, T>(override val item: MonoPattern<IN>, val value: T?, val onFail: ProducerOn<Feed<IN>, T?> = {notParsed}): MonoPatternWrapper<IN, T>(item) {
  override fun read(s: Feed<IN>) = if (item.testPeek(s) && s.isStickyEnd()) value else s.onFail()
  override fun show(s: Output<IN>, value: T?) {}
  @Suppress("UNCHECKED_CAST")
  override fun wrap(item: Pattern<IN, IN>) = StickyEnd(item, value, onFail)
  override fun toPreetyDoc() = listOf("stickyEnd", item, value).preety().colonParens()
}

val newlineChar = elementIn('\r', '\n')
val singleLine = Convert(Seq(::StringTuple, Until(newlineChar, asString(), anyChar), newlineChar.toStringPat()),
  { it[0] + it[1] }, { it.run { tupleOf(::StringTuple, take(length -1), last().toString()) } })

open class TextPattern<T>(item: Pattern<Char, String>, val regex: Regex, val transform: (List<String>) -> T): ConvertPatternWrapper<Char, String, T>(item) {
  constructor(regex: Regex, transform: (List<String>) -> T): this(singleLine, regex, transform)
  override fun read(s: Feed<Char>): T? = item.read(s)?.let { regex.find(it)?.groupValues?.let(transform) }
  override open fun show(s: Output<Char>, value: T?) {}
  override fun wrap(item: Pattern<Char, String>) = TextPattern(item, regex, transform)
  override fun toPreetyDoc() = item.toPreetyDoc() + regex.preety().surroundText("/" to "/")
}

// File: NumUnitPattern
interface NumOps<NUM: Comparable<NUM>> {
  val zero: NUM
  fun plus(b: NUM, a: NUM): NUM
  fun minus(b: NUM, a: NUM): NUM
  fun times(b: NUM, a: NUM): NUM
  fun div(b: NUM, a: NUM): NUM
  fun rem(b: NUM, a: NUM): NUM
  open class Instance<NUM: Comparable<NUM>>(
    override val zero: NUM,
    private val plus: InfixJoin<NUM>, private val minus: InfixJoin<NUM>,
    private val times: InfixJoin<NUM>, private val div: InfixJoin<NUM>, private val rem: InfixJoin<NUM>
  ): NumOps<NUM> {
    override fun plus(b: NUM, a: NUM) = plus.invoke(a, b)
    override fun minus(b: NUM, a: NUM) = minus.invoke(a, b)
    override fun times(b: NUM, a: NUM) = times.invoke(a, b)
    override fun div(b: NUM, a: NUM) = div.invoke(a, b)
    override fun rem(b: NUM, a: NUM) = rem.invoke(a, b)
  }
}
object IntOps: NumOps.Instance<Int>(0, Int::plus, Int::minus, Int::times, Int::div, Int::rem)
object LongOps: NumOps.Instance<Long>(0L, Long::plus, Long::minus, Long::times, Long::div, Long::rem)
object FloatOps: NumOps.Instance<Float>(0.0F, Float::plus, Float::minus, Float::times, Float::div, Float::rem)
object DoubleOps: NumOps.Instance<Double>(0.0, Double::plus, Double::minus, Double::times, Double::div, Double::rem)

/*
val n=RepeatUn(asInt(), digitFor('0'..'9')) { it.toString().map { it-'0' } }
val u=KeywordPattern<Int>().apply { mergeStrings("s" to 1, "min" to 60, "hr" to 60*60) }
val k=NumUnitTrie(n, u, IntOps)
*/

typealias NumUnit<NUM, IN> = Pair<NUM, Iterable<IN>>

/** Pattern for `"2hr1min14s"`, note that reverse map won't be updated every [show] */
abstract class NumUnitPattern<IN, NUM: Comparable<NUM>>(val number: Pattern<IN, NUM>, open val unit: Pattern<IN, NUM>,
    protected val op: NumOps<NUM>): PreetyAny(), Pattern<IN, NUM> {
  protected open fun rescue(s: Feed<IN>, acc: NUM, i: NUM): NUM? = notParsed
  override fun read(s: Feed<IN>): NUM? {
    var accumulator: NUM = op.zero
    var lastUnit: NumUnit<NUM, IN>? = null
    var i: NUM? = number.read(s) ?: return notParsed
    while (i != notParsed) { // i=num, k=unit
      val k = unit.read(s) ?: rescue(s, accumulator, i) ?: return notParsed
      val unit = reversedPairsDsc.first { it.first == k }
      accumulator = (if (lastUnit == null) joinUnitsInitial(s, k, i)
        else joinUnits(s, lastUnit, unit, accumulator, i)) ?: return accumulator
      lastUnit = unit //->
      i = number.read(s)
    }
    return accumulator
  }
  override fun show(s: Output<IN>, value: NUM?) {
    if (value == null) return
    var rest: NUM = value
    var lastUnit: NumUnit<NUM, IN>? = null
    while (rest != op.zero) {
      val unit = maxCmpLE(rest)
      if (lastUnit != null) joinUnitsShow(s, lastUnit, unit)
      lastUnit = unit //->
      val (ratio, name) = unit
      val i = op.div(ratio, rest); rest = op.rem(ratio, rest)
      number.show(s, i); name.forEach(s)
    }
  }
  protected abstract val map: Map<Iterable<IN>, NUM>
  protected val reversedPairsDsc by lazy { map.reversedMap().toList().sortedByDescending { it.first } }
  protected fun maxCmpLE(value: NUM) = reversedPairsDsc.first { it.first <= value }
  override fun toPreetyDoc() = listOf("NumUnit", number, unit).preety().colonParens()

  protected open fun joinUnitsInitial(s: Feed<IN>, k: NUM, i: NUM): NUM? = op.times(k, i)
  protected open fun joinUnits(s: Feed<IN>, u0: NumUnit<NUM, IN>, u1: NumUnit<NUM, IN>, acc: NUM, i: NUM): NUM? = op.plus(op.times(u1.first, i), acc)
  protected open fun joinUnitsShow(s: Output<IN>, u0: NumUnit<NUM, IN>, u1: NumUnit<NUM, IN>) {}
}

open class NumUnitTrie<IN, NUM: Comparable<NUM>>(number: Pattern<IN, NUM>, override val unit: TriePattern<IN, NUM>,
    op: NumOps<NUM>): NumUnitPattern<IN, NUM>(number, unit, op) {
  override val map get() = unit.collectKeys().toMap { k -> k.asIterable() to unit[k]!! }
}

// File: LayoutPattern

/** item<fun sample()> tail<where> children<...{layout item}> */
sealed class Deep<T, L> { interface HasItem<T> { val item: T }
  data class Root<T, L>(val nodes: List<Deep<T, L>>): Deep<T, L>()
  data class Nest<T, L>(override val item: T, val tail: L, val children: List<Deep<T, L>>): Deep<T, L>(), HasItem<T>
  data class Term<T, L>(override val item: T): Deep<T, L>(), HasItem<T>
  fun <R> visitBy(visitor: Visitor<T, L, R>): R = when (this) {
    is Root -> visitor.see(this)
    is Nest -> visitor.see(this)
    is Term -> visitor.see(this)
  }
  interface Visitor<T, L, out R> {
    fun see(t: Root<T, L>): R
    fun see(t: Nest<T, L>): R
    fun see(t: Term<T, L>): R
  }
}

typealias LayoutRec<T, L> = Pair<Int, List<Deep<T, L>>>?
open class LayoutPattern<IN, T, L>(val item: Pattern<IN, T>, val tail: Pattern<IN, L>, val layout: Pattern<IN, Int>): PreetyAny(), Pattern<IN, Deep<T, L>> {
  protected open val layoutZero = 0
  protected open fun rescueLayout(s: Feed<IN>, parsed: T): Int? = notParsed
  protected open fun rescueLayout(s: Feed<IN>, parsed: T, parsedTail: L): Int? = notParsed

  protected open fun onRootIndent(s: Feed<IN>, closed: Int) { if (closed != 0) s.error("terminate indent not zero: $closed") }
  protected open fun onNestIndent(s: Feed<IN>, n0: Int, n1: Int, closed: Int, layerItems: MutableList<Deep<T, L>>) {
    if (n1 <= n0) s.error("bad layout-open decrement ($n0 => $n1)")
  }
  protected open fun onTermIndent(s: Feed<IN>, n0: Int, n: Int, parsed: T) = when {
    n <= n0 -> Unit
    n0 < n -> s.error("illegal layout increment ($n0 => $n) near $parsed")
    else -> impossible()
  }

  /** [Pattern.show] for resulting pattern should be general, since [show] does not use this function */
  protected open fun decideLayerItem(parsed: T, parsedTail: L): Pattern<IN, T> = item

  fun readRec(s: Feed<IN>, layerItem: Pattern<IN, T>, n0: Int): LayoutRec<T, L> {
    val layerItems: MutableList<Deep<T, L>> = mutableListOf()
    var parsed: T? = layerItem.read(s)
    var parsedTail: L? = tail.read(s)
    while (parsed != notParsed) {
      if (parsedTail != notParsed) {
        val n1 = layout.read(s) ?: rescueLayout(s, parsed, parsedTail) ?: return notParsed
        val (closed, items1) = readRec(s, decideLayerItem(parsed, parsedTail), n1) ?: return notParsed
        val layer1 = Deep.Nest(parsed, parsedTail, items1)
        layerItems.add(layer1)
        onNestIndent(s, n0, n1, closed, layerItems)
        if (closed < n0) return Pair(closed, layerItems)
      } else {
        val term = Deep.Term<T, L>(parsed)
        layerItems.add(term)
        val n = layout.read(s) ?: rescueLayout(s, parsed) ?: return notParsed
        onTermIndent(s, n0, n, parsed)
        if (n < n0) return Pair(n, layerItems)
      }
      parsed = layerItem.read(s)
      parsedTail = tail.read(s)
    }
    return Pair(n0, layerItems)
  }
  fun readRec(s: Feed<IN>, n0: Int) = readRec(s, item, n0)
  fun readRec(s: Feed<IN>) = readRec(s, layoutZero)

  override fun read(s: Feed<IN>): Deep<T, L>? {
    val (closed, layout) = readRec(s) ?: return notParsed
    onRootIndent(s, closed)
    return Deep.Root(layout)
  }
  override fun show(s: Output<IN>, value: Deep<T, L>?) {
    if (value == null) return
    value.visitBy(ShowVisitor(s))
  }
  private inner class ShowVisitor(private val s: Output<IN>): Deep.Visitor<T, L, Unit> {
    private var level = layoutZero
    override fun see(t: Deep.Root<T, L>) { t.nodes.forEach { it.show() } }
    override fun see(t: Deep.Nest<T, L>) {
      layout.show(s, level)
      item.show(s, t.item); tail.show(s, t.tail)
      ++level; t.children.forEach { it.show() }; --level
    }
    override fun see(t: Deep.Term<T, L>) { layout.show(s, level); item.show(s, t.item) }
    private fun Deep<T, L>.show() = visitBy(this@ShowVisitor)
  }
  override fun toPreetyDoc() = listOf("Layout", item, tail, layout).preety().colonParens()
}

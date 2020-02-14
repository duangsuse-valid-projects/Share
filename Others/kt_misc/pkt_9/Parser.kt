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
fun IntRange.map(transform: Pipe<Int>) = transform(first)..transform(last)

inline fun <T, reified R> Collection<T>.mapToArray(transform: (T) -> R): Array<R> {
  val mapFirst = transform(firstOrNull() ?: return emptyArray())
  val array: Array<R> = Array(size) {mapFirst}
  for ((i, x) in withIndex()) { array[i] = transform(x) }
  return array
}

inline fun <reified T> Collection<T>.toArray() = mapToArray {it}
inline fun <A:T, B:T, reified T> Pair<A, B>.items(): Array<T> = arrayOf(first, second)
fun CharRange.items(): Array<Char> = toList().toCharArray().toTypedArray()

fun <T, K, V> Iterable<T>.toMap(entry: (T) -> Pair<K, V>): Map<K, V> {
  val map: MutableMap<K, V> = mutableMapOf()
  forEach { val (k, v) = entry(it); map[k] = v }
  return map
}
fun <K, V> Map<K, V>.reversedMap(): Map<V, K> = entries.toMap { it.value to it.key }

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
abstract class EffectFold<T, R>: Fold<T, R> {
  protected abstract fun makeBase(): R
  protected abstract fun onAccept(base: R, value: T)
  override fun reducer() = object: Reducer<T, R> {
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
fun <T> asList() = object: EffectFold<T, MutableList<T>>() {
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

// NOTES ABOUT Feed:
// - Feed cannot be constructed using empty input
// - Feed.peek will yield last item *again* when EOS reached
fun AllFeed.isStickyEnd() = consumeOrNull() == null
// - Patterns like `Until(elementIn(' '), asString(), anyChar)` will fail when EOS entercounted
//    easiest workaround: append EOF or terminate char to end of *actual input*
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
    = (position..(position+10)).map { it.coerceIn(slice.indices) }
      .map(slice::get).let { items -> items.preety().joinText(if (items.all { it is Char }) "" else ", ") }
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

//// == Abstract ==
// SourceLocation <- SourceLocated { sourceLoc }
// ParseError(feed, message)
// Feed.tag: PP?; Feed.error(message)
interface SourceLocated { val sourceLoc: SourceLocation }
data class SourceLocation(val file: String, var line: Cnt, var column: Cnt, var position: Cnt): Preety, Cloneable {
  constructor(file: String): this(file,1,1, 0)
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

open class Input<T>(private val feed: Feed<T>): PreetyAny(), Feed<T>, ErrorListener {
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
  private fun newLine() { ++sourceLoc.line; sourceLoc.column = 1 }
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

//// == Error clam list ==
typealias LocatedError = Pair<SourceLocation, ErrorMessage>
fun CharInput.withErrorList(): Pair<List<LocatedError>, CharInput> {
  val errorList: MutableList<LocatedError> = mutableListOf()
  onError = { message -> errorList.add(sourceLoc.clone() to message) }
  return Pair(errorList, this)
}
typealias BoundError<IN> = Pair<IN, ErrorMessage>
fun <IN> Input<IN>.withErrorList(): Pair<List<BoundError<IN>>, Input<IN>> {
  val errorList: MutableList<BoundError<IN>> = mutableListOf()
  onError = @Suppress("unchecked_cast") { message -> errorList.add((peek as IN) to message) }
  return Pair(errorList, this)
}

// File: pat/PatternModel
inline val notParsed: Nothing? get() = null
typealias Output<T> = Consumer<T>

//// "PPOP" (Pattern, Positive, Optional, PatternWrapper)

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

abstract class ConvertOptionalPattern<IN, T, T1>(override val item: Pattern<IN, T>, override val defaultValue: T1): PreetyAny(),
  PositivePattern<IN, T1>, OptionalPatternKind<T1>, PatternWrapperKind<IN, T> {
  override fun toPreetyDoc() = listOf(item.preety(), defaultValue.rawPreety()).joinText("?:")
}
abstract class ConvertPatternWrapper<IN, T, T1>(override val item: Pattern<IN, T>): PreetyAny(),
  Pattern<IN, T1>, PatternWrapperKind<IN, T> {
  abstract fun wrap(item: Pattern<IN, T>): ConvertPatternWrapper<IN, T, T1>
  override fun toPreetyDoc() = item.toPreetyDoc()
}

abstract class OptionalPattern<IN, T>(item: Pattern<IN, T>, defaultValue: T): ConvertOptionalPattern<IN, T, T>(item, defaultValue) {
  override fun show(s: Output<IN>, value: T?) = item.show(s, value ?: defaultValue)
}
abstract class PatternWrapper<IN, T>(item: Pattern<IN, T>): ConvertPatternWrapper<IN, T, T>(item) {
  override fun show(s: Output<IN>, value: T?) = item.show(s, value)
}

inline operator fun <reified IN, T> MonoPatternWrapper<IN, T>.not() = wrap(!(item as SatisfyPattern<IN>))
inline fun <reified IN, T> MonoPatternWrapper<IN, T>.clam(message: ErrorMessage) = wrap((item as SatisfyPattern<IN>).clam(message))

// Losing type information for T in ConvertPatternWrapper, required for fun show
@Suppress("UNCHECKED_CAST")
inline operator fun <reified IN, reified T> PatternWrapper<IN, T>.not() = wrap(!(item as ConvertPatternWrapper<IN, IN, T>))
@Suppress("UNCHECKED_CAST")
inline fun <reified IN, reified T> PatternWrapper<IN, T>.clam(message: ErrorMessage) = wrap((item as ConvertPatternWrapper<IN, IN, T>).clam(message))

//// == Error Handling ==
fun <IN, T> Pattern<IN, T>.toDefault(defaultValue: T) = object: OptionalPattern<IN, T>(this, defaultValue) {
  override fun read(s: Feed<IN>) = item.read(s) ?: defaultValue
}
fun <IN, T> ConstantPattern<IN, T>.toDefault() = toDefault(constant)

/** Add error and __skip unacceptable__ [pat], yield [defaultValue] */
fun <IN, T> Feed<IN>.clamWhile(pat: Pattern<IN, *>, defaultValue: T, message: ErrorMessage): T {
  this.error(message)
  while (pat.read(this) != notParsed) {}
  return defaultValue
}
fun <IN, T> Pattern<IN, T>.clamWhile(pat: Pattern<IN, *>, defaultValue: T, message: ErrorMessage) = object: OptionalPattern<IN, T>(this, defaultValue) {
  override fun read(s: Feed<IN>) = this@clamWhile.read(s) ?: s.clamWhile(pat, defaultValue, message)
}

abstract class SatisfyPatternBy<IN>(protected open val self: SatisfyPattern<IN>): SatisfyPattern<IN>() {
  override fun test(value: IN) = self.test(value)
  override fun read(s: Feed<IN>) = self.read(s)
  override fun show(s: Output<IN>, value: IN?) = self.show(s, value)
  override fun toPreetyDoc() = self.toPreetyDoc()
}

/** Add error, consume item until __pattern parses__ or feed end */
open class SatisfyClam<IN>(self: SatisfyPattern<IN>, val message: ErrorMessage): SatisfyPatternBy<IN>(self) {
  override fun read(s: Feed<IN>): IN? = self.read(s) ?: run { s.error(message)
    var parsed: IN? = null
    while (parsed == notParsed) {
      s.consumeOrNull() ?: break
      parsed = self.read(s)
    }; return@run parsed }
}
class SatisfyEqualToClam<IN>(override val self: SatisfyEqualTo<IN>, message: ErrorMessage): SatisfyClam<IN>(self, message), MonoConstantPattern<IN> {
  override val constant get() = self.constant
}

fun <IN> SatisfyPattern<IN>.clam(message: ErrorMessage) = SatisfyClam(this, message)
fun <IN> SatisfyEqualTo<IN>.clam(message: ErrorMessage) = SatisfyEqualToClam(this, message)

//// == Abstract ==
fun <T> Pattern<Char, T>.read(text: String) = read(inputOf(text))
fun <T> Pattern<Char, T>.readPartial(text: String): Pair<List<LocatedError>, T?> {
  val (e, input) = inputOf(text).withErrorList()
  return e to read(input)
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
  val (e, input) = inputOf(*items).withErrorList()
  return e to read(input)
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
// CCDC (Convert, Contextual, Deferred, Check)
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

// Pattern { read(Feed), show(Output, value) }
// val notParsed: Nothing? = null
// toDefault(defaultValue); clamWhile(pat, defaultValue, message); SatisfyPattern.clam(message)
// CharInput.withErrorList(): Pair<List<LocatedError>, CharInput>

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
  protected open val greedy = true
  protected open val bounds = 1..Cnt.MAX_VALUE
  override fun toPreetyDoc(): PP = item.preety().surroundText(braces)

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
  override fun toPreetyDoc() = cases.asIterable().preety().joinText("|").surroundText(parens)
}

// "rebuild" - UntilUn(+unfold), RepeatUn(+unfold)
// "repeat many" (0..MAX) - Repeat(...).Many(), RepeatUn(...).Many()

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

// val str = Seq(::StringTuple, item('"').asStringPat(), *anyChar until item('"'))

fun MonoPattern<Char>.toStringPat() = Convert(this, Char::toString, String::first)
fun Seq<Char, Char, CharTuple>.toStringPat() = Convert(this, { it.toArray().joinToString("") }, { tupleOf(::CharTuple, *it.toCharArray().toTypedArray()) })

infix fun MonoPattern<Char>.until(terminate: MonoConstantPattern<Char>)
  = arrayOf<Pattern<Char, String>>(Until(terminate, asString(), this), item(terminate.constant).toStringPat())

// File: pat/WrapperCCDC
// "CCDC"
// Convert(item, transform: ConvertAs<T1, T>) constructor(item, to={unsupported})
// Contextual(head, body)
// Deferred(item: Producer<Pattern<IN, R>>)
// Check(item, check)

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

class Check<IN, T>(item: Pattern<IN, T>, val check: Feed<IN>.(T?) -> T? = {it}): PatternWrapper<IN, T>(item) {
  override fun read(s: Feed<IN>): T? = item.read(s).let { s.check(it) }
  override fun wrap(item: Pattern<IN, T>) = Check(item, check)
  override fun toPreetyDoc() = listOf("check", item).preety().colonParens()
}

// Tuple2: flatten(), mergeFirst(first: (B) -> A), mergeSecond(second: (A) -> B)
// val i2 = Seq(::IntTuple, *Contextual(item<Int>()) { item(it) }.flatten().items())

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
// JoinBy(join, item) { onItem, onSep, AddListeners(onItem, onSep) }

typealias SurroundPair<IN> = Pair<MonoConstantPattern<IN>?, MonoConstantPattern<IN>?>

infix fun <IN, T> Pattern<IN, T>.prefix(item: MonoConstantPattern<IN>) = SurroundBy(item to null, this)
infix fun <IN, T> Pattern<IN, T>.suffix(item: MonoConstantPattern<IN>) = SurroundBy(null to item, this)
fun <T> MonoPair<T>.toPat(): SurroundPair<T> = map(::item)

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
  protected open fun onItem(value: ITEM) {}
  protected open fun onSep(value: SEP) {}
  override fun toPreetyDoc() = listOf(item, sep).preety().joinText("...").surroundText(braces)

  inner open class AddListeners(private val onItem: Consumer<ITEM>, private val onSep: Consumer<SEP>): JoinBy<IN, SEP, ITEM>(sep, item) {
    override fun onItem(value: ITEM) = onItem.invoke(value)
    override fun onSep(value: SEP) = onSep.invoke(value)
  }
  inner class OnItem(onItem: Consumer<ITEM>): AddListeners(onItem, {})
}

fun <IN, SEP, ITEM> JoinBy<IN, SEP, ITEM>.mergeConstantJoin(constant: SEP) = mergeSecond {
  (0 until it.size.dec()).asIterable().map { constant }
}
@Suppress("UNCHECKED_CAST")
fun <IN, SEP, ITEM> JoinBy<IN, SEP, ITEM>.mergeConstantJoin() = mergeConstantJoin((sep as MonoConstantPattern<SEP>).constant)
fun <IN, ITEM> JoinBy<IN, Char, ITEM>.concatCharJoin() = Convert(this, {
  Tuple2(it.first, it.second.joinToString(""))
}, {
  Tuple2(it.first, it.second.toList())
})

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
fun <T> TriePattern<Char, InfixOp<T>>.register(op: InfixOp<T>) { this[op.name] = op }

open class InfixPattern<IN, ATOM>(val atom: Pattern<IN, ATOM>, val op: Pattern<IN, InfixOp<ATOM>>): PreetyAny(), Pattern<IN, ATOM> {
  protected open fun rescue(s: Feed<IN>, base: ATOM, op1: InfixOp<ATOM>): ATOM? = notParsed.also { s.error("infix $base parse failed at $op1") }
  override fun read(s: Feed<IN>): ATOM? {
    val base = atom.read(s) ?: return notParsed
    return infixChain(s, base)
  }
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
  override open fun show(s: Output<IN>, value: ATOM?) { unsupported("infix show") }
  override fun toPreetyDoc() = listOf("InfixChain", op).preety().colonParens()
}

// File: pat/TriePattern

class MapPattern<K, V>(val map: Map<K, V>): PreetyAny(), Pattern<K, V> {
  override fun read(s: Feed<K>) = map[s.peek]?.also { s.consume() }
  override fun show(s: Output<K>, value: V?) { if (value != null) map.reversedMap()[value]?.let(s) }
  override fun toPreetyDoc() = listOf("map", map).preety().colonParens()
}

// TriePattern<K=Char, V>() 
//val dict = KeywordPattern<String>().apply { mergeStrings("hello" to "你好", "world" to "世界") }
//val noun = Repeat(asList(), dict)

class KeywordPattern<V>: TriePattern<Char, V>()

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
    toMap().reversedMap()[value]?.let { it.forEach(s) }
  }
  protected open fun onItem(value: K) {}
  protected open fun onSuccess(value: V) {}
  protected open fun onFail(): V? = notParsed
  override fun toPreetyDoc() = super.toString().preety()
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
    return if (routes.isEmpty()) setOf() //terminator (/a/b/[])
    else routes.flatMapTo(mutableSetOf()) { kr ->
      val (pathKey, nextRoute) = kr
      val routeSet: MutableSet<List<K>> = mutableSetOf()
      if (nextRoute.value != null) routeSet.add(listOf(pathKey))
      nextRoute.collectKeys().mapTo(routeSet) { listOf(pathKey)+it }
      return@flatMapTo routeSet
    }
  }

  private fun errorNoPath(key: Iterable<K>, k: K): Nothing {
    val msg = "${key.joinToString("/")} @$k"
    throw NoSuchElementException(msg)
  }
  override fun toString(): String = when {
    value == null -> "Path".preety() + routes
    value != null && routes.isNotEmpty() -> "Bin".preety() + value.preety().surroundText(squares) + routes
    value != null && routes.isEmpty() -> "Term".preety() + value.preety().surroundText(parens)
    else -> impossible()
  }.toString()
  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    return if (other !is Trie<*, *>) false
    else (routes == other.routes) && value == other.value
  }
  override fun hashCode() = routes.hashCode() xor value.hashCode()
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
fun digitFor(cs: CharRange, zero: Char = '0', pad: Int = 0): Pattern<Char, Int>
  = Convert(elementIn(cs), { (it - zero) +pad }, { zero + (it -pad) })

fun asInt(radix: Int = 10, initial: Int = 0) = JoinFold(initial) { this*radix + it }
fun asLong(radix: Int = 10, initial: Long = 0L): Fold<Int, Long> = ConvertJoinFold(initial) { this*radix + it }

fun stringFor(char: MonoPattern<Char>) = Repeat(asString(), char).Many()
fun stringFor(char: MonoPattern<Char>, surround: MonoPair<String>) = stringSurroundBy(surround.map { it.single() }, char)

fun stringSurroundBy(surround: MonoPair<Char>, char: MonoPattern<Char>)
  = Seq(::StringTuple, item(surround.first).toStringPat(), *char until item(surround.second))

val EOF = item('\uFFFF')
class StickyEnd<IN, T>(override val item: MonoPattern<IN>, val value: T?, val onFail: ProducerOn<Feed<IN>, T?>): MonoPatternWrapper<IN, T>(item) {
  override fun read(s: Feed<IN>) = if (item.testPeek(s) && s.isStickyEnd()) value else s.onFail()
  override fun show(s: Output<IN>, value: T?) {}
  @Suppress("UNCHECKED_CAST")
  override fun wrap(item: Pattern<IN, IN>) = StickyEnd(item, value, onFail)
  override fun toPreetyDoc() = listOf("StickyEnd", item, value).preety().colonParens()
}

val newlineChar = elementIn('\r', '\n')
val singleLine = Convert(Seq(::StringTuple, Until(newlineChar, asString(), anyChar), newlineChar.toStringPat()),
  { it[0] + it[1] }, { it.run { tupleOf(::StringTuple, take(length -1), last().toString()) } })

open class TextPattern<T>(item: Pattern<Char, String>, val regex: Regex, val transform: (MatchResult) -> T): ConvertPatternWrapper<Char, String, T>(item) {
  constructor(regex: Regex, transform: (MatchResult) -> T): this(singleLine, regex, transform)
  override fun read(s: Feed<Char>): T? = item.read(s)?.let { regex.find(it)?.let(transform) }
  override open fun show(s: Output<Char>, value: T?) {}
  override fun wrap(item: Pattern<Char, String>) = TextPattern(item, regex, transform)
  override fun toPreetyDoc() = item.toPreetyDoc() + regex.preety().surroundText("/" to "/")
}

// File: NumUnitPattern
abstract class NumOps<NUM: Comparable<NUM>> {
  abstract val zero: NUM
  abstract fun plus(b: NUM, a: NUM): NUM
  abstract fun minus(b: NUM, a: NUM): NUM
  abstract fun times(b: NUM, a: NUM): NUM
  abstract fun div(b: NUM, a: NUM): NUM
  object IntOps: NumOps<Int>() {
    override val zero = 0
    override fun plus(b: Int, a: Int) = a + b
    override fun minus(b: Int, a: Int) = a - b
    override fun times(b: Int, a: Int) = a * b
    override fun div(b: Int, a: Int) = a / b
  }
}

/** Pattern for 2hr1min14s */
abstract class NumUnitPattern<IN, NUM: Comparable<NUM>>(val number: Pattern<IN, NUM>, open val unit: Pattern<IN, NUM>,
    private val op: NumOps<NUM>): PreetyAny(), Pattern<IN, NUM> {
  protected open fun rescue(s: Feed<IN>, accumulator: NUM, i: NUM): NUM? = notParsed
  override fun read(s: Feed<IN>): NUM? {
    var accumulator: NUM = op.zero // i=num, k=unit
    var i: NUM? = number.read(s) ?: return notParsed
    while (i != notParsed) {
      val k = unit.read(s) ?: rescue(s, accumulator, i) ?: return notParsed
      accumulator = op.plus(op.times(k, i), accumulator)
      i = number.read(s)
    }
    return accumulator
  }
  override fun show(s: Output<IN>, value: NUM?) {
    if (value == null) return
    var rest: NUM = value
    while (rest != op.zero) {
      val unit = reverseMapDsc.first { it.key <= rest }
      val i = op.div(unit.key, rest)
      rest = op.minus(op.times(unit.key, i), rest)
      number.show(s, i)
      unit.value.forEach(s)
    }
  }
  protected abstract val map: Map<Iterable<IN>, NUM>
  private val reverseMapDsc = map.reversedMap().entries.sortedByDescending { it.key }
  override fun toPreetyDoc() = listOf("NumUnit", number, unit).preety().colonParens()
}

class NumUnitTrie<IN, NUM: Comparable<NUM>>(number: Pattern<IN, NUM>, override val unit: TriePattern<IN, NUM>,
    op: NumOps<NUM>): NumUnitPattern<IN, NUM>(number, unit, op) {
  override val map: Map<Iterable<IN>, NUM> get() = unit.toMap()
}

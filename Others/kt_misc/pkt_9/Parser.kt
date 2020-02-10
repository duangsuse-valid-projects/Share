import java.io.InputStream
import java.io.Reader
import java.io.InputStreamReader
import java.nio.charset.Charset
import java.nio.charset.StandardCharsets

import kotlin.reflect.KProperty

// File: CommonDefs
typealias Cnt = Int
typealias Idx = Int
typealias IdxRange = IntRange

typealias Producer<T> = () -> T
typealias Consumer<T> = (T) -> Unit
typealias Predicate<T> = (T) -> Boolean

typealias Pipe<T> = (T) -> T
typealias ActionOn<T> = T.() -> Unit
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

inline fun <A:T, B:T, reified T> Pair<A, B>.items(): Array<T> = arrayOf(first, second)
fun CharRange.items(): Array<Char> = toList().toCharArray().toTypedArray()

fun <T, K, V> Iterable<T>.toMap(entry: (T) -> Pair<K, V>): Map<K, V> {
  val map: MutableMap<K, V> = mutableMapOf()
  forEach { val (k, v) = entry(it); map[k] = v }
  return map
}
fun <K, V> Map<K, V>.reversedMap(): Map<V, K> = entries.toMap { it.value to it.key }

// File: TextPreety
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
    fun <R> visitBy(visitor: DocVisitor<R>): R = when (this) {
      is Null -> visitor.see(this)
      is None -> visitor.see(this)
      is Text -> visitor.see(this)
      is JoinBy -> visitor.see(this)
      is SurroundBy -> visitor.see(this)
    }
    override fun toString() = visitBy(DocShow)
    private object DocShow: DocVisitor<String> {
      override fun see(t: Doc.Null) = "null"
      override fun see(t: Doc.None) = ""
      override fun see(t: Doc.Text) = t.obj.toString()
      override fun see(t: Doc.JoinBy) = t.subs.joinToString(t.sep.toString(), transform = Doc::toString)
      override fun see(t: Doc.SurroundBy) = "${t.lr.first}${t.sub}${t.lr.second}"
    }
  }
  interface DocWrapper { val sub: Doc }
  interface DocsWrapper { val subs: List<Doc> }
  interface DocVisitor<out R> {
    fun see(t: Doc.Null): R
    fun see(t: Doc.None): R
    fun see(t: Doc.Text): R
    fun see(t: Doc.JoinBy): R
    fun see(t: Doc.SurroundBy): R
  }
}

abstract class PreetyAny: Preety {
  override fun toString() = toPreetyDoc().toString()
}

typealias PP = Preety.Doc

fun Any?.toPreety() = if (this == null) Preety.Doc.Null else Preety.Doc.Text(this)
fun Iterable<*>.toPreety() = map(Any?::toPreety)

fun PP.surround(lr: MonoPair<PP>) = Preety.Doc.SurroundBy(lr, this)
fun List<PP>.join(sep: PP) = Preety.Doc.JoinBy(sep, this)
operator fun PP.plus(other: PP) = listOf(this, other).join(Preety.Doc.None)

fun PP.surroundText(lr: MonoPair<String>) = toPreety().surround(lr.map(Any::toPreety))
fun List<PP>.joinText(sep: String) = toPreety().join(sep.toPreety())
operator fun PP.plus(other: Any?) = this + other.toPreety()

infix fun String.paired(other: String) = MonoPair(this, other)
val parens = "(" paired ")"
val squares = "[" paired "]"
val braces = "{" paired "}"
val quotes = "'" paired "'"
val dquotes = "\"" paired "\""

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
fun Any?.rawPreety() = if (this == null) Preety.Doc.Null
else toString().prefixTranslate(KOTLIN_ESCAPE, "\\").let {
  if (it.length == 1 || it.matches(ESCAPED_CHAR)) it.toPreety().surroundText(quotes)
  else it.toPreety().surroundText(dquotes)
}

// File: AnyValue&Rec
interface Data {
  override fun equals(other: Any?): Boolean
  override fun hashCode(): Int
}

open class AnyBy(val obj: Any): Data {
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

// File: ArrangeModel
interface Sized { val size: Cnt }
val Sized.lastIndex: Idx get() = size.dec()
val Sized.indices: IdxRange get() = 0..lastIndex
val Sized.isEmpty get() = size == 0
val Sized.isNotEmpty get() = !isEmpty

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
  override fun toString() = items.asIterable().toPreety().joinText(", ").surroundText(parens).toString()
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

// File: FoldModel
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
class JoinFold<T>(override val initial: T, private val append: T.(T) -> T): ConvertFold<T, T, T>() {
  override fun join(base: T, value: T) = base.append(value)
  override fun convert(base: T) = base
}

//// == Abstract ==
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
interface Feed<out T> {
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


//// == SliceFeed & StreamFeed ==
// SliceFeed { position, viewport }
// StreamFeed { bufferIterator, convert, nextOne }
//   - IteratorFeed
//   - InputStreamFeed

open class SliceFeed<T>(private val slice: Slice<T>): PreetyAny(), Feed<T> {
  init { require(slice.isNotEmpty) {"empty input"} }
  protected var position = 0
  override val peek get() = try { slice[position] }
    catch (_: IndexOutOfBoundsException) { slice[slice.lastIndex] }
  override fun consume() = try { slice[position++] }
    catch (_: IndexOutOfBoundsException) { --position; throw Feed.End() }
  override fun toPreetyDoc() = "Slice".toPreety() + listOf(peek.rawPreety(), viewport(slice)).joinText("...").surroundText(parens)
  protected open fun viewport(slice: Slice<T>): PP
    = (position..(position+10)).map { it.coerceIn(slice.indices) }
      .map(slice::get).let { items -> items.toPreety().joinText(if (items.all { it is Char }) "" else ", ") }
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
  override fun toPreetyDoc() = "Stream".toPreety() + listOf(peek.rawPreety(), stream.toPreety()).joinText("...").surroundText(parens)
}

//// == Stream Feeds ==
class IteratorFeed<T>(iterator: Iterator<T>): StreamFeed<T, T, Iterator<T>>(iterator) {
  override fun bufferIterator(stream: Iterator<T>) = stream
  override fun convert(buffer: T) = buffer
}
class InputStreamFeed(reader: Reader): StreamFeed<Char, Int, Reader>(reader) {
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

interface SourceLocated { val sourceLoc: SourceLocation }
data class SourceLocation(val file: String, var line: Cnt, var column: Cnt, var position: Cnt): Cloneable {
  constructor(file: String): this(file,1,1, 0)
  val tag get() = "$file:$line:$column"
  override fun toString() = "$tag #$position"
  public override fun clone() = copy(file = file, line = line, column = column, position = position)
}

//// == Input & CharInput ==
// Input { onItem, onError }
// CharInput (STDIN) { isCRLF, eol }

open class Input<T>(private val feed: Feed<T>): Feed<T>, ErrorListener {
  protected open fun onItem(item: T) {}
  override var onError: ConsumerOn<AllFeed, ErrorMessage> = { message ->
    val inputDesc = this.tag ?: (this as? Filters<*>)?.parent?.tag ?: "parse fail near `$peek'"
    throw ParseError(this, "$inputDesc: $message")
  }
  override val peek get() = feed.peek
  override fun consume() = feed.consume().also(::onItem)
  override fun toString() = "Input:$feed"
  open class Filters<T>(val parent: AllFeed, feed: Feed<T>): Input<T>(feed) {
    init { onError = (parent as? ErrorListener)?.onError ?: onError }
    override fun toString() = parent.toString()
  }
}

open class ParseError(val feed: AllFeed, message: ErrorMessage): Error(message.toString())
val AllFeed.tag: String? get() = (this as? SourceLocated)?.sourceLoc?.tag
fun AllFeed.error(message: ErrorMessage) = (this as? ErrorListener)?.onError?.invoke(this, message) ?: kotlin.error(message)

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
  override fun toString() = super.toString()+":$sourceLoc"
  companion object {
    val STDIN by lazy { CharInput(InputStreamFeed(System.`in`), "<stdin>") }
  }
}

//// == Abstract ==
fun inputOf(text: String, file: String = "<string>") = CharInput(SliceFeed(Slice(text)), file)
fun <IN> inputOf(vararg items: IN) = Input(SliceFeed(Slice(items)))

fun <IN> inputOf(iterator: Iterator<IN>) = Input(IteratorFeed(iterator))
fun <IN> inputOf(iterable: Iterable<IN>) = inputOf(iterable.iterator())

fun inputOf(reader: Reader, file: String = "<read>") = CharInput(InputStreamFeed(reader), file)

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

import kotlin.reflect.KProperty

import java.io.InputStream
import java.io.Reader
import java.io.InputStreamReader
import java.nio.charset.Charset
import java.nio.charset.StandardCharsets

// == Patterns ==
// SURDIES(Seq, Until, Repeat, Decide, item, elementIn, satisfy, stay)
// CCDP(Convert, Contextual, Deferred, Pipe)
// SJ(SurroundBy, JoinBy)
// IT(InfixPattern, TriePattern)

// == Extensions ==
// Tuple, Fold
// Input (Feed, CharInput, ...)

// File: Auxiliary
typealias Cnt = Int
typealias Idx = Int

typealias Producer<T> = () -> T
typealias Consumer<T> = (T) -> Unit

typealias ActionOn<T, A1> = T.(A1) -> Unit
typealias FunctionOn<T, A1, R> = T.(A1) -> R

typealias Predicate<T> = (T) -> Boolean
operator fun <T> Predicate<T>.not(): Predicate<T> = { !this@not(it) }

fun impossible(): Nothing = error("impossible")
fun unsupported(message: String): Nothing = throw UnsupportedOperationException(message)

fun <E> MutableList<E>.removeLast() = removeAt(lastIndex)
inline fun <T, reified R> List<T>.mapToArray(transform: (T) -> R): Array<R> {
  val init = firstOrNull()?.let(transform) ?: return emptyArray()
  val array = Array(size) {init}
  for ((i, v) in withIndex()) array[i] = transform(v)
  return array
}
inline fun <T, R> Pair<T, T>.map(transform: (T) -> R): Pair<R, R> = Pair(transform(first), transform(second))
inline fun IntRange.map(transform: (Int) -> Int) = transform(first)..transform(last)

fun <E, K, V> Iterable<E>.toMap(kv: (E) -> Pair<K, V>): Map<K, V> {
  val map: MutableMap<K, V> = mutableMapOf()
  forEach { val (k, v) = kv(it); map[k] = v }
  return map
}
fun <K, V> Map<K, V>.reversedMap(): Map<V, K> = entries.toMap { it.value to it.key }

data class SurroundPair(val prefix: String, val suffix: String)
internal operator fun String.minus(suffix: String) = SurroundPair(this, suffix)

fun String.surround(surround: SurroundPair): String = surround.prefix+this+surround.suffix
fun String.prefixTranslate(map: Map<Char, Char>, prefix: String): String = fold (StringBuilder()) { sb, c ->
  map[c]?.let { sb.append(prefix).append(it) } ?: sb.append(c) }.toString()

internal val KOTLIN_ESCAPE = mapOf( // \"\'\t\b\n\r\$\\
  '"' to '"', '\'' to '\'',
  '\t' to 't', '\b' to 'b',
  '\n' to 'n', '\r' to 'r',
  '$' to '$', '\\' to '\\'
)

internal val ESCAPED_CHAR = Regex("""^\\.$""")
fun <T> T.rawString() = toString().prefixTranslate(KOTLIN_ESCAPE, "\\").let {
  if (it.length == 1 || it.matches(ESCAPED_CHAR)) it.surround("'"-"'")
  else it.surround("\""-"\"")
}

internal val TYPE_STRING = Regex("""(.*\.)?(\S+)""")
internal val FUNCTION_STRING = Regex("""^\((.*?)\) -> (.*)$""")
fun <T, R> ((T) -> R).functionTypeString(): String {
  fun translateType(shown: String): String {
    val (_, namespace, name) = TYPE_STRING.find(shown)?.groupValues ?: return shown
    val prefix = namespace.takeUnless { it.startsWith("kotlin") } ?: ""
    return prefix+name
  }
  fun functionTypeStringRec(shown: String): String {
    val (_, q, r) = FUNCTION_STRING.find(shown)?.groupValues ?: return translateType(shown)
    return "${translateType(q)}→${functionTypeStringRec(r)}"
  }
  return functionTypeStringRec(this.toString())
}

/** Transparent delegate for [Any] */
abstract class AnyBy(val obj: Any) {
  override fun equals(other: Any?) =
    if (other !is AnyBy) obj == other
    else obj == other.obj
  override fun hashCode() = obj.hashCode()
  override fun toString() = obj.toString()
}

// File: Slice
interface Sized { val size: Cnt }
val Sized.lastIndex get() = size.dec()
val Sized.indices get() = 0..lastIndex
val Sized.isEmpty get() = size == 0
val Sized.isNotEmpty get() = !isEmpty

interface Slice<out E>: Sized {
  operator fun get(index: Idx): E
  companion object Instance {
    operator fun <E> invoke(ary: Array<E>): Slice<E> = object: AnyBy(ary), Slice<E> {
      override fun get(index: Idx) = ary[index]
      override val size get() = ary.size
    }
    operator fun <E> invoke(list: List<E>): Slice<E> = object: AnyBy(list), Slice<E> {
      override fun get(index: Idx) = list[index]
      override val size get() = list.size
    }
    operator fun invoke(str: CharSequence): Slice<Char> = object: AnyBy(str), Slice<Char> {
      override fun get(index: Idx) = str[index]
      override val size get() = str.length
    }
  }
}

// File: InputModel
interface Feed<out T> {
  val peek: T; fun consume(): T
  class End: NoSuchElementException("no more")
}
interface ErrorListener {
  var onError: ActionOn<Feed<*>, String>
}

interface SourceLocated { val sourceLoc: SourceLocation }
data class SourceLocation(val file: String, var line: Cnt, var column: Cnt, var position: Cnt): Cloneable {
  constructor(file: String): this(file,1,1, 0)
  val tag get() = "$file:$line:$column"
  override fun toString() = "$tag #$position"
  public override fun clone() = copy(file = file, line = line, column = column, position = position)
}

fun <IN> Feed<IN>.consumeIf(predicate: Predicate<IN>): IN?
  = peek.takeIf(predicate)?.let { runCatching(::consume).getOrNull() }
fun <IN> Feed<IN>.takeWhile(predicate: Predicate<IN>): Sequence<IN>
  = sequence { while (true) yield(consumeIf(predicate) ?: break) }

fun <IN> Feed<IN>.asSequence() = sequence {
  while (true) try { yield(consume()) }
    catch (_: Feed.End) { break }
}
fun <IN> Feed<IN>.asIterable() = asSequence().asIterable()

 // File: Feed
open class SliceFeed<T>(private val slice: Slice<T>): Feed<T> {
  init { require(slice.isNotEmpty) {"empty input"} }
  protected var position = 0
  override val peek get() = try { slice[position] }
    catch (_: IndexOutOfBoundsException) { slice[slice.lastIndex] }
  override fun consume() = try { slice[position++] }
    catch (_: IndexOutOfBoundsException) { --position; throw Feed.End() }
  override fun toString() = "Slice(${peek.rawString()}...${viewport(slice)})"
  protected open fun viewport(slice: Slice<T>): String
    = (position..(position+10)).map { it.coerceIn(slice.indices) }
      .map(slice::get).let { it.joinToString(if (it.filterIsInstance<Char>().size == it.size) "" else ", ") }
}

abstract class StreamFeed<T, BUF, STREAM>(private val stream: STREAM): Feed<T> {
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
  override fun toString() = "Stream(${peek.rawString()}...$stream)"
}

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
  companion object {
    val STDIN by lazy { InputStreamFeed(System.`in`) }
  }
}

//// == Abstract ==
// SliceFeed { position, viewport }
// StreamFeed { bufferIterator, convert, nextOne }
//   - IteratorFeed
//   - InputStreamFeed (STDIN)

// File: Input
open class Input<T>(private val feed: Feed<T>): Feed<T>, ErrorListener {
  protected open fun onItem(item: T) {}
  override var onError: ActionOn<Feed<*>, String> = { message ->
    val inputDesc = (this as? SourceLocated)?.sourceLoc?.tag ?: "parse fail near `$peek'"
    throw ParseError(this as Input<*>, "$inputDesc: $message")
  }
  override val peek get() = feed.peek
  override fun consume() = feed.consume().also(::onItem)
  override fun toString() = "Input:$feed"
}

class ParseError(val input: Input<*>, message: String): Error(message)
fun Feed<*>.error(message: String) = (this as? ErrorListener)?.onError?.invoke(this, message) ?: kotlin.error(message)

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
    val STDIN by lazy { CharInput(InputStreamFeed.STDIN, "<stdin>") }
  }
}

//// == Abstract ==
// Input { onItem, onError }
// CharInput (STDIN) { isCRLF, eol }

// Basic usage: SliceFeed(Slice("abc")), InputStreamFeed.STDIN, CharInput.STDIN
fun inputOf(text: String, file: String = "<string>") = CharInput(SliceFeed(Slice(text)), file)
fun <IN> inputOf(vararg items: IN) = Input(SliceFeed(Slice(items)))

fun inputOf(reader: Reader, file: String = "<read>") = CharInput(InputStreamFeed(reader), file)
fun <IN> inputOf(iterator: Iterator<IN>) = Input(IteratorFeed(iterator))
fun <IN> inputOf(iterable: Iterable<IN>) = inputOf(iterable.iterator())

// File: Tuple
data class Tuple2<A, B>(var first: A, var second: B)

/** Data storage base on array [items], [get]/[set] and destruct, delegate by [index] */
abstract class Tuple<E>(override val size: Cnt): Sized {
  protected abstract val items: Array<E>
  fun toArray() = items

  operator fun get(index: Idx) = items[index]
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
  override fun hashCode()  = items.contentHashCode()
  override fun toString() = items.joinToString(", ").surround("("-")")
}

operator fun <E> Tuple<E>.component1() = this[0]
operator fun <E> Tuple<E>.component2() = this[1]
operator fun <E> Tuple<E>.component3() = this[2]
operator fun <E> Tuple<E>.component4() = this[3]

fun <E> Tuple<E>.toList(): List<E> = indices.map(::get)

//// == Abstract ==
inline fun <reified E> tupleOf(vararg items: E) = object: Tuple<E>(items.size) {
  override val items: Array<E> = arrayOf(*items)
}
inline fun <reified E> emptyTuple() = object: Tuple<E>(0) {
  override val items: Array<E> = emptyArray()
}

//// == Dynamic Tuples ==
open class IntTuple(size: Cnt): Tuple<Int>(size) { override val items = Array<Int>(size){0} }
open class LongTuple(size: Cnt): Tuple<Long>(size) { override val items = Array<Long>(size){0L} }
open class FloatTuple(size: Cnt): Tuple<Float>(size) { override val items = Array<Float>(size){0.0F} }
open class DoubleTuple(size: Cnt): Tuple<Double>(size) { override val items = Array<Double>(size){0.0} }

open class CharTuple(size: Cnt): Tuple<Char>(size) { override val items = Array<Char>(size){'\u0000'} }
open class StringTuple(size: Cnt): Tuple<String>(size) { override val items = Array<String>(size){""} }
open class AnyTuple(size: Cnt): Tuple<Any>(size) {
  @Suppress("UNCHECKED_CAST")
  override val items = arrayOfNulls<Any>(size) as Array<Any>
}

//// == Cast IndexAs ==
inline fun <reified T> Tuple<*>.indexAs(idx: Idx): IndexAs<T> = IndexAs(idx)
class IndexAs<T>(private val idx: Idx) {
  @Suppress("UNCHECKED_CAST")
  operator fun getValue(self: Tuple<*>, _p: KProperty<*>): T = self[idx] as T
  operator fun setValue(self: Tuple<in T>, _p: KProperty<*>, value: T) { self[idx] = value }
}

// File: Fold
interface Reducer<in T, out R> {
  fun accept(value: T)
  fun finish(): R
}
interface Fold<in T, out R> {
  fun reducer(): Reducer<T, R>
}

/** Fold of [makeBase], [onAccept] */
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

fun asString() = object: ConvertFold<Char, StringBuilder, String>() {
  override val initial get() = StringBuilder()
  override fun join(base: StringBuilder, value: Char) = base.append(value)
  override fun convert(base: StringBuilder) = base.toString()
}
fun <T> asList() = object: EffectFold<T, MutableList<T>>() {
  override fun makeBase(): MutableList<T> = mutableListOf()
  override fun onAccept(base: MutableList<T>, value: T) { base.add(value) }
}

//// == Abstract ==
fun <T, R> Iterable<T>.fold(fold: Fold<T, R>): R {
  val reducer = fold.reducer()
  forEach(reducer::accept)
  return reducer.finish()
}

// File: pat/PatternModel
typealias Output<T> = Consumer<T>
inline val notParsed: Nothing? get() = null
interface Pattern<IN, T> {
  fun read(s: Feed<IN>): T?
  fun show(s: Output<IN>, value: T?)
  override fun toString(): String
}

interface PositivePattern<IN, T>: Pattern<IN, T> {
  override fun read(s: Feed<IN>): T
}
abstract class OptionalPattern<IN, T>(val item: Pattern<IN, T>, val defaultValue: T): PositivePattern<IN, T> {
  override fun show(s: Output<IN>, value: T?) = item.show(s, value ?: defaultValue)
  override fun toString() = "$item?:${defaultValue.rawString()}"
}

fun <IN, T> Pattern<IN, T>.toDefault(defaultValue: T) = object: OptionalPattern<IN, T>(this, defaultValue) {
  override fun read(s: Feed<IN>) = item.read(s) ?: defaultValue
}
fun <IN, T> Pattern<IN, T>.clamWhile(pat: Pattern<IN, *>, defaultValue: T, message: String)
= object: OptionalPattern<IN, T>(this, defaultValue) {
  override fun read(s: Feed<IN>) = this@clamWhile.read(s) ?: run {
    s.error(message)
    while (pat.read(s) != notParsed) {}; defaultValue
  }
}

typealias ClamError = Pair<SourceLocation, String>
fun CharInput.clam(): Pair<CharInput, List<ClamError>> {
  val errorList: MutableList<ClamError> = mutableListOf()
  onError = { message -> errorList.add(sourceLoc.clone() to message) }
  return Pair(this, errorList)
}
fun <IN> Input<IN>.clam(): Pair<Input<IN>, List<String>> {
  val errorList: MutableList<String> = mutableListOf()
  onError = { message -> errorList.add(message) }
  return Pair(this, errorList)
}

//// == Abstract ==
fun <T> Pattern<Char, T>.read(text: String) = read(inputOf(text))
fun <T> Pattern<Char, T>.show(value: T?): String? {
  if (value == null) return null
  val sb = StringBuilder()
  show({ sb.append(it) }, value)
  return sb.toString()
}
fun <T> Pattern<Char, T>.rebuild(text: String) = show(read(text))

// Pattern { read(Feed), show(Output, value), toString() }
// val notParsed: Nothing?
// toDefault(defaultValue), clamWhile(pat, defaultValue, message)
// CharInput.clam(): Pair<CharInput, List<ClamError>>

// "SURDIES"
// Seq(type: TUPLE, vararg items), Until(fold, terminate: IN, item),
//   Repeat(fold, item) { testCount }, Decide(vararg cases) { undecide, onDoneRead }
// item(), item(value), elementIn(vararg values), elementIn(vararg ranges: CharRange), satisfy(predicate), stay()

// "CCDP"
// Convert(item, from, to), Contextual(head, body), Deferred(item: Producer<Pattern<IN, R>>), Pipe(item, transform)

// "SJ"
// SurroundBy(surround: Pair<IN?, IN?>, item), JoinBy(join, item) { onItem, onSep }
// "IT"
// InfixChain(atom, infix), Trie()

// File: pat/SURD
class Seq<IN, T, TUPLE: Tuple<T>>(val type: (Cnt) -> TUPLE, vararg val items: Pattern<IN, out T>): Pattern<IN, TUPLE> {
  constructor(type: Producer<TUPLE>, vararg items: Pattern<IN, T>): this({ _ -> type() }, *items)
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
  override fun toString() = items.joinToString(" ").surround("("-")")
}

abstract class FoldPattern<IN, T, R>(val fold: Fold<T, R>): Pattern<IN, R> {
  protected open fun unfold(value: R): Iterable<T> = defaultUnfold(value)
}
internal fun <R, T> defaultUnfold(value: R): Iterable<T> = @Suppress("unchecked_cast") when (value) {
  is Iterable<*> -> value as Iterable<T>
  is String -> value.asIterable() as Iterable<T>
  else -> unsupported("unfold")
}

open class Until<IN, T, R>(fold: Fold<T, R>, val terminate: IN, val item: Pattern<IN, T>): FoldPattern<IN, T, R>(fold) {
  override fun read(s: Feed<IN>): R? {
    val reducer = fold.reducer()
    while (s.peek != terminate)
      reducer.accept(item.read(s) ?: return notParsed)
    return reducer.finish()
  }
  override fun show(s: Output<IN>, value: R?) {
    if (value == null) return
    unfold(value).forEach { item.show(s, it) }
  }
  override fun toString() = "($item)~${terminate.rawString()}"
}

open class Repeat<IN, T, R>(fold: Fold<T, R>, val item: Pattern<IN, T>): FoldPattern<IN, T, R>(fold) {
  override fun read(s: Feed<IN>): R? {
    val reducer = fold.reducer()
    var count = 0
    while (true) {
      reducer.accept(item.read(s) ?: break)
      ++count
    }
    return if (testCount(count)) reducer.finish() else notParsed
  }
  override fun show(s: Output<IN>, value: R?) {
    if (value == null) return
    var count = 0
    unfold(value).forEach { item.show(s, it); ++count }
    check(testCount(count)) {"bad wrote count: $count"}
  }
  protected open fun testCount(n: Cnt) = (n > 0)
  override fun toString() = "{$item}"
}

open class Decide<IN, T>(vararg val cases: Pattern<IN, out T>): Pattern<IN, T> {
  override fun read(s: Feed<IN>): T? {
    for ((i, case) in cases.withIndex()) case.read(s)?.let { onDoneRead(i, it); return it }
    return notParsed
  }
  override fun show(s: Output<IN>, value: T?) {
    if (value == null) return
    @Suppress("unchecked_cast") (cases[undecide(value)] as Pattern<IN, in @UnsafeVariance T>).show(s, value)
  }
  protected open fun onDoneRead(case: Idx, value: T) {}
  protected open fun undecide(value: T): Idx = 0
  override fun toString() = cases.joinToString("|").surround("("-")")
}

// File: pat/IES
abstract class SatisfyPattern<IN>: Pattern<IN, IN> {
  protected abstract fun test(value: IN): Boolean
  override fun read(s: Feed<IN>) = s.consumeIf(::test)
  override fun show(s: Output<IN>, value: IN?) { value?.let(s) }
  operator fun not(): SatisfyPattern<IN> = object: SatisfyPattern<IN>() {
    override fun test(value: IN) = !this@SatisfyPattern.test(value)
    override fun toString() = "!${this@SatisfyPattern}"
  }
}

fun <IN> item() = object: SatisfyPattern<IN>() {
  override fun test(value: IN) = true
  override fun toString() = "anyItem"
}
fun <IN> item(value: IN): SatisfyPattern<IN> {
  val valueExpected = value
  return object: SatisfyPattern<IN>() {
    override fun test(value: IN) = value == valueExpected
    override fun toString() = value.rawString()
  }
}

fun <IN> elementIn(vararg values: IN) = object: SatisfyPattern<IN>() {
  override fun test(value: IN) = value in values
  override fun toString() = values.joinToString("|", transform = { it.rawString() }).surround("("-")")
}
fun elementIn(vararg ranges: CharRange) = object: SatisfyPattern<Char>() {
  override fun test(value: Char) = ranges.any { range -> value in range }
  override fun toString() = ranges.joinToString("", transform = ::toDashString).surround("["-"]")
  private fun toDashString(r: CharRange) = "${r.first}-${r.last}"
}

fun <IN> satisfy(name: String = "?", predicate: Predicate<IN>) = object: SatisfyPattern<IN>() {
  override fun test(value: IN) = predicate(value)
  override fun toString() = "($name)"
}
fun <IN> stay() = object: PositivePattern<IN, Unit> {
  override fun read(s: Feed<IN>) = Unit
  override fun show(s: Output<IN>, value: Unit?) {}
  override fun toString() = "()"
}

// File: pat/MiscPattern
abstract class PatternWrapper<IN, T, T1>(val item: Pattern<IN, T>): Pattern<IN, T1> {
  abstract fun wrap(item: Pattern<IN, T>): PatternWrapper<IN, T, T1>
}
inline operator fun <reified IN, T1> PatternWrapper<IN, IN, T1>.not() = wrap(!(item as SatisfyPattern<IN>))

//// == Abstract ==
// Convert, Contextual, Deferred, Pipe

class Convert<IN, T, T1>(item: Pattern<IN, T>, val from: (T) -> T1, val to: (T1) -> T): PatternWrapper<IN, T, T1>(item) {
  override fun read(s: Feed<IN>) = item.read(s)?.let(from)
  override fun show(s: Output<IN>, value: T1?) {
    if (value == null) return
    item.show(s, value.let(to))
  }
  override fun wrap(item: Pattern<IN, T>) = Convert(item, from, to)
  override fun toString() = item.toString()
}

class Contextual<IN, HEAD, BODY>(val head: Pattern<IN, HEAD>, val body: (HEAD) -> Pattern<IN, BODY>): Pattern<IN, Tuple2<HEAD, BODY>> {
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
  override fun toString() = "$head:${body.functionTypeString()}"
}

class Deferred<IN, T>(val item: Producer<Pattern<IN, T>>): Pattern<IN, T> {
  override fun read(s: Feed<IN>) = item().read(s)
  override fun show(s: Output<IN>, value: T?) = item().show(s, value)
  override fun toString() = item().toString()
}

class Peek<IN, T>(val placeholder: T, val operation: ActionOn<Feed<IN>, IN>): PositivePattern<IN, T> {
  override fun read(s: Feed<IN>): T = placeholder.also {
    try { s.operation(s.peek) }
    catch (_: Feed.End) {}
  }
  override fun show(s: Output<IN>, value: T?) {}
  override fun toString() = "Peek"
}

class Pipe<IN, T>(item: Pattern<IN, T>, val transform: (T) -> T): PatternWrapper<IN, T, T>(item) {
  override fun read(s: Feed<IN>) = item.read(s)?.let(transform)
  override fun show(s: Output<IN>, value: T?) {
    if (value == null) return
    item.show(s, value)
  }
  override fun wrap(item: Pattern<IN, T>) = Pipe(item, transform)
  override fun toString() = item.toString()
}

// File: pat/SurroundJoin
class SurroundBy<IN, T>(val surround: Pair<IN?, IN?>, val item: Pattern<IN, T>): Pattern<IN, T> {
  override fun read(s: Feed<IN>): T? {
    val (left, right) = surround
    fun single(value: IN?) = if (value == null) true else s.consumeIf { it == value } != null
    single(left) || return notParsed
    val parse = item.read(s)
    single(right) || return notParsed
    return parse
  }
  override fun show(s: Output<IN>, value: T?) {
    val (left, right) = surround
    value?.let { left?.let(s); item.show(s, value); right?.let(s) }
  }
  override fun toString() = "${surround.first}$item${surround.second}"
}

typealias DoubleList<A, B> = Tuple2<List<A>, List<B>>
open class JoinBy<IN, SEP, ITEM>(val join: Pattern<IN, SEP>, val item: Pattern<IN, ITEM>): Pattern<IN, DoubleList<ITEM, SEP>> {
  override fun read(s: Feed<IN>): DoubleList<ITEM, SEP>? {
    val items: MutableList<ITEM> = mutableListOf()
    val seprators: MutableList<SEP> = mutableListOf()
    fun readItem() = item.read(s)?.also { items.add(it); onItem(it) }
    fun readSep() = join.read(s)?.also { seprators.add(it); onSep(it) }
    readItem() ?: return notParsed
    var seprator = readSep()
    while (seprator != notParsed) {
      readItem() ?: return notParsed
      seprator = readSep()
    }
    return Tuple2(items, seprators)
  }
  override fun show(s: Output<IN>, value: DoubleList<ITEM, SEP>?) {
    if (value == null) return
    val (values, sepratorList) = value
    val seprators = sepratorList.iterator()
    item.show(s, values.first())
    values.drop(1).forEach { join.show(s, seprators.next()); item.show(s, it) }
  }
  protected open fun onItem(value: ITEM) {}
  protected open fun onSep(value: SEP) {}
  override fun toString() = "{$item}$join"
}

// File: pat/InfixPattern
typealias Join<T> = (T, T) -> T

/** Comparable infix operator, lower (assoc first) by [ordinal] */
class InfixOp<T>(val ordinal: Int, val join: Join<T>, val name: String = "?"): Comparable<InfixOp<T>> {
  override fun compareTo(other: InfixOp<T>) = this.ordinal.compareTo(other.ordinal)
  override fun toString() = name
}
infix fun <T> Join<T>.level(k: Int) = InfixOp(k, this)

open class InfixPattern<IN, ATOM>(val atom: Pattern<IN, ATOM>, val op: Pattern<IN, InfixOp<ATOM>>): Pattern<IN, ATOM> {
  protected open fun onError(s: Feed<IN>, base: ATOM, op1: InfixOp<ATOM>) = s.error("infix $base parse failed at $op1")
  override fun read(s: Feed<IN>): ATOM? {
    val base = atom.read(s) ?: return notParsed
    return infixChain(s, base)
  }
  fun infixChain(s: Feed<IN>, base: ATOM, op_left: InfixOp<ATOM>? = null): ATOM? {
    val op1 = op_left ?: op.read(s) ?: return base  //'+' in 1+(2*3)... || return atom "1"
    val rhs1 = atom.read(s) ?: onError(s, base, op1).let { return notParsed } //"2"
    val op2 = op.read(s) ?: return op1.join(base, rhs1) //(a⦁b) "terminated"
    return when { // lessThan b => first
      op1 <= op2 -> infixChain(s, op1.join(base, rhs1), op2) //(a ⦁ b) ⦁ ...
      op1  > op2 -> infixChain(s, rhs1, op2)?.let { op1.join(base, it) } //a ⦁ (b ⦁ ...)
      else -> impossible() // default: left assoc
    }
  }
  override open fun show(s: Output<IN>, value: ATOM?) { unsupported("infix show") }
  override fun toString() = "(InfixChain)"
}

//// == Abstract ==
interface InfixOpEnum<T> {
  val name: String; val ordinal: Int; val join: Join<T>
  fun toPair(replaceName: String? = null) = Pair(replaceName ?: name, InfixOp(ordinal, join, name))
}
inline fun <reified ENUM, T> ENUM.toInfixOps(replaceName: Map<String, String> = emptyMap()): Pattern<Char, InfixOp<T>>
where ENUM: Enum<ENUM>, ENUM: InfixOpEnum<T> {
  val tree = TriePattern<Char, InfixOp<T>>()
  tree.mergeStrings(*enumValues<ENUM>().toList().mapToArray { replaceName[it.name].let(it::toPair) })
  return tree
}

// File: pat/TriePattern
open class EnumMap<V, K>(private val map: Map<K, V>): Map<K, V> by map {
  constructor(values: Iterable<V>, key: (V) -> K): this(values.toMap { key(it) to it })
  constructor(values: Array<V>, key: (V) -> K): this(values.asIterable(), key)
}

open class Trie<K, V>(var value: V?) {
  constructor(): this(null)
  val routes: MutableMap<K, Trie<K, V>> by lazy(::mutableMapOf)

  operator fun get(key: Iterable<K>): V? = getPath(key).value
  operator fun set(key: Iterable<K>, value: V) { getOrCreatePath(key).value = value }
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
  fun toMap() = collectKeys().toMap { k -> k to this[k] }

  private fun errorNoPath(key: Iterable<K>, k: K): Nothing {
    val msg = "${key.joinToString("/")} @$k"
    throw NoSuchElementException(msg)
  }
  override fun toString(): String {
    return if (value == null) "Path${routes}"
    else "Bin[$value]${routes}"
  }
  override fun equals(other: Any?): Boolean {
    if (this === other) return true
    return if (other !is Trie<*, *>) false
    else (routes == other.routes) && value == other.value
  }
  override fun hashCode() = routes.hashCode() xor value.hashCode()
}

//// == Abstract ==
fun <K, V> Trie<K, V>.merge(vararg pairs: Pair<Iterable<K>, V>) {
  for ((k, v) in pairs) this[k] = v
}
fun <V> Trie<Char, V>.mergeStrings(vararg pairs: Pair<CharSequence, V>) {
  for ((k, v) in pairs) this[k.asIterable()] = v
}
fun <K, V> trieOf(vararg pairs: Pair<Iterable<K>, V>) = Trie<K, V>().apply { merge(*pairs) }

//// == Pattern ==
class TriePattern<K, V>: Trie<K, V>(), Pattern<K, V> {
  override fun read(s: Feed<K>): V? {
    var point: Trie<K, V> = this
    while (true)
      try { point = point.routes[s.peek]?.also { s.consume() } ?: break }
      catch (_: Feed.End) { break }
    return point.value
  }
  override fun show(s: Output<K>, value: V?) {
    if (value == null) return
    toMap().reversedMap()[value]?.let { it.forEach(s) }
  }
}

data class StreamEnd(val position: Idx): Error()

inline fun <reified EX : Throwable, R : Any> Try(op: Producer<R>): R? = try { op() }
  catch (e: Throwable) { if (e is EX) null else (throw e)  }

interface DiffAlgorithm {
  fun <E> diff(xs: Feeder<E>, ys: Feeder<E>): Differences<E>

  data class Differences<out T>(val changes: List<Change<T>>)
    { override fun toString() = changes.joinToString(Change.partSep) }

  sealed class Change<out T> {
    data class Same<T>(val part: List<T>) : Change<T>()
      {  override fun toString() = part.joinToString(sep) }

    data class Removed<T>(val deleted: List<T>) : Change<T>()
      { override fun toString() = "(${deleted.joinToString(sep)})" }

    data class Inserted<T>(val added: List<T>) : Change<T>()
      { override fun toString() = "[${added.joinToString(sep)}]" }

    companion object { var sep = ","; var partSep = " " }
  }
}

interface FiniteStream
  { val isEOF: Boolean get }

interface PeekStream<out E> {
  val peek: E get
  //@Throws(StreamEnd::class)
  fun consume(): E
}

interface ResetIterator<out E> : Iterator<E>, Resetable, FiniteStream
interface ResetIterable<out E> : Iterable<E>
  { override fun iterator(): ResetIterator<E> }
interface IndexedIterator: Sized
  { val position: Idx }

/** Helper for 'peek-1' streams */
interface FinalConsumeIter<out E> : ResetIterator<E>, IndexedIterator
  { var oneMore: Boolean }

interface MutableSlice<E> : Slice<E>
  { operator fun set(index: Idx, value: E) }

interface Slice<out E> : Sized, ResetIterable<E> {
  operator fun get(index: Idx): E
  override fun iterator() = object : FinalConsumeIter<E> {
    override var position: Idx = 0
    var oldPosition: Idx = (-1)
    override var oneMore = true
    override fun hasNext() = position < size //!in setOf(size, size.inc())
    override fun next() = this@Slice[position++]

    override fun mark() { oldPosition = position }
    override fun reset() { position = oldPosition }

    override val isEOF get() = (!hasNext() && !oneMore)
    override val size = this@Slice.size
  }

  companion object Factory {
    fun <T> of(list: List<T>) = object : Slice<T> {
      override val size get() = list.size
      override operator fun get(index: Int) = list[index]
    }

    fun <T> of(list: MutableList<T>) = object : MutableSlice<T> {
      override val size get() = list.size
      override operator fun get(index: Int) = list[index]
      override operator fun set(index: Int, value: T) { list[index] = value }
    }
  }
}

open class Feeder<out E>(private val sliter: FinalConsumeIter<E>) : PeekStream<E>,
  FiniteStream by sliter, Resetable, Iterable<E> {
  constructor(inputs: Slice<E>) : this(inputs.iterator())
  constructor(list: List<E>) : this(Slice.of(list))

  override val peek get() = lastItem
  override fun consume(): E = peek.alsoDo {
    if (isEOF) throw StreamEnd(sliter.position)
    Try<StreamEnd, Unit> { lastItem = sliter.next() }
      ?: run { sliter.oneMore = false }
  }

  private var lastItem: E
  private var oldLastItem: E
  init { lastItem = sliter.next(); oldLastItem = lastItem }

  override fun iterator() = object : Iterator<E> {
    override fun hasNext() = !isEOF
    override fun next() = consume()
  }

  override fun mark() = sliter.mark().also { oldLastItem = lastItem; check(sliter.oneMore, EOF_MARK) }
  override fun reset() = sliter.reset().also { lastItem = oldLastItem; sliter.oneMore = true }

  override fun toString() = "Feeder($peek: $sliter)"
}

fun Feeder(str: String): Feeder<Char> = Feeder(str.toList())

inline val EOF_MARK get() = { "Marking at EOF" }

fun <E : Any> Feeder<E>.takeWhile(predicate: Predicate<E>): List<E> {
  val took = mutableListOf<E>()
  while (predicate(peek))
    { took.add(consume()) }
  return took
}

typealias Change<T> = DiffAlgorithm.Change<T>

object Diff : DiffAlgorithm {
  override fun <E> diff(xs: Feeder<E>, ys: Feeder<E>): DiffAlgorithm.Differences<E> {
    val differences = mutableListOf<Change<E>>()
    fun append(cast: (List<E>) -> Change<E>) =
      fun(list: Collection<E>): Unit = list.takeIf { !it.isEmpty() }?.toList()?.let(cast)
        ?.let(differences::add)
        ?.let { check(it) } ?: Unit

    val same = append { DiffAlgorithm.Change.Same(it) }
    val inserted = append { DiffAlgorithm.Change.Inserted(it) }
    val deleted = append { DiffAlgorithm.Change.Removed(it) }

    val equalPart = mutableListOf<E>()
    while (!xs.isEOF && !ys.isEOF) {
      if (xs.peek == ys.peek) {
        equalPart.add(xs.consume().alsoDo(ys::consume)); continue
      }
      same(equalPart.toList()); equalPart.clear()
      val rest = xs.positional { xs.toSet() }

      ys.mark() //for EOF-rescue
      val ins = Try<StreamEnd, List<E>> { ys.takeWhile { it !in rest } } ?: run {
        deleted(rest); ys.reset(); inserted(ys.toList())
        xs.take(rest.size)
      }
      if (ys.isEOF) break // no `common' succeed found

      val commonSucc = ys.peek
      val del = xs.takeWhile { it != commonSucc }
      deleted(del); inserted(ins)
      //assert(xs.peek == ys.peek)
    }
    same(equalPart) // with tail-sequence of Same(...)
    if (!xs.isEOF) deleted(xs.toList())
    if (!ys.isEOF) inserted(ys.toList())

    return DiffAlgorithm.Differences(differences)
  }

  fun <E : Any> diff(xs: List<E>, ys: List<E>) = diff(Feeder(xs), Feeder(ys))
  fun diff(s0: String, s1: String) = diff(s0.toList(), s1.toList())
  fun wordDiff(t0: String, t1: String, sep: String = " ") = diff(t0.split(sep), t1.split(sep))
  fun tokenizeDiff(t0: String, t1: String, vararg seps: Char) = diff(t0.split(*seps), t1.split(*seps))
  fun tokenizeDiff(t0: String, t1: String, regex: Regex) = diff(t0.split(regex), t1.split(regex))
}

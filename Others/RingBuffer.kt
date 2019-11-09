import java.io.Closeable

typealias Cnt = Int
typealias Idx = Int
typealias Producer<R> = () -> R
typealias Operation = Producer<Unit>

inline fun <T> T.alsoDo(crossinline op: Operation): T = also { op() }

fun <A, B, R> Iterable<A>.zipWith(other: Iterable<B>, f: (A, B) -> R): Iterable<R> = Iterable {
  object : Iterator<R> {
    val xs = this@zipWith.iterator()
    val ys = other.iterator()
    override fun hasNext() = xs.hasNext() && ys.hasNext()
    override fun next() = f(xs.next(), ys.next())
  }
}

interface Queue<E>: Iterable<E>, Sized {
  override val size: Cnt get
  fun add(item: E)
  fun pop(): E
  fun addMany(n: Cnt, src: Iterable<E>)
  fun popMany(n: Cnt, dst: MutableCollection<E>)
  override fun iterator() = object : Iterator<E> {
    override fun hasNext() = !isEmpty
    override fun next() = pop()
  }
}
fun <E> Queue<E>.addAll(src: Collection<E>) = addMany(src.size, src)
fun <E> Queue<E>.pop(n: Cnt) = mutableListOf<E>().also { popMany(n, it) }

interface Resetable {
  val isMarking: Boolean get
  fun mark() fun reset()
}

interface Sized {
  val size: Cnt get
  companion object Factory {
    fun of(c: Collection<*>) = object : Sized
      { override val size get() = c.size }
  }
}
val Sized.isEmpty get() = size == 0

fun Resetable.withPosition() = Closeable(::reset).alsoDo(::mark)
fun <R> Resetable.positional(op: Producer<R>): R = mark().let { op().alsoDo(::reset) }

/** Cyclic index integer supports plus/increment operation */
data class CyclicIndex(val sized: Sized, val value: Int) {
  fun wrap(new_value: Int) = CyclicIndex(sized, new_value)
  fun cycle(index: Int) = index % Math.max(1, sized.size) // Int % 1 == 0

  operator fun inc() = wrap(cycle(value.inc()))
  operator fun plus(n: Int) = wrap(cycle(value.plus(n)))
  override fun toString() = "($value in 0..${sized.size -1})"
}
infix fun CyclicIndex.untilSize(size: Cnt) = value.until(value+size).map(::cycle)

operator fun <E> List<E>.get(index: CyclicIndex) = this[index.value]
operator fun <E> MutableList<E>.set(index: CyclicIndex, value: E) { this[index.value] = value }


inline val INSUFF_BUFFER get() = { "Insufficient buffer" }
inline val NO_MORE_ELEMENT get() = { "No more elements" }

open class RingBuffer<E>(private val backend: MutableList<E>): Queue<E> {
  val capacity: Cnt get() = backend.size
  override val size: Cnt get() = available

  protected var readPos = CyclicIndex(Sized.of(backend), 0)
  protected var writePos = CyclicIndex(Sized.of(backend), 0)
  protected var available: Cnt = 0

  protected open val freeSpace: Cnt get() = capacity - available

  override fun add(item: E) {
    check(freeSpace != 0, INSUFF_BUFFER).alsoDo { ++available }
    backend[writePos++] = item
  }
  override fun pop(): E {
    check(available != 0, NO_MORE_ELEMENT).alsoDo { --available }
    return backend[readPos++]
  }

  override fun addMany(n: Cnt, src: Iterable<E>) {
    check(freeSpace >= n, INSUFF_BUFFER).alsoDo { available += n }
    writePos.untilSize(n).zipWith(src) { i, x -> backend[i] = x }.take(n)
    writePos += n
  }
  override fun popMany(n: Cnt, dst: MutableCollection<E>) {
    check(available >= n, NO_MORE_ELEMENT).alsoDo { available -= n }
    for (i in readPos.untilSize(n)) dst.add(backend[i])
    readPos += n
  }

  override fun toString() = "Ring[$backend; ^${readPos.value}, _${writePos.value}, $available]"
}

class ResetRingBuffer<E>(backend: MutableList<E>): RingBuffer<E>(backend), Resetable {
  override var isMarking: Boolean = false
  private lateinit var oldReadPos: CyclicIndex
  private var markedRead: Cnt = 0

  override val freeSpace: Cnt get() = super.freeSpace - markedRead

  override fun pop() = super.pop()
    .alsoDo { if(isMarking) ++markedRead }
  override fun popMany(n: Cnt, dst: MutableCollection<E>) = super.popMany(n, dst)
    .alsoDo { if(isMarking) markedRead += n }

  override fun mark() { oldReadPos = readPos; isMarking = true }
  override fun reset() {
    readPos = oldReadPos
    available = markedRead.alsoDo { markedRead = 0 }
    isMarking = false
  }
  fun viewport() = positional { toList() }
}

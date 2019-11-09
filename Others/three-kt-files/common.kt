//import java.io.Closeable

typealias Cnt = Int
typealias Idx = Int

typealias Predicate<T> = (T) -> Boolean
typealias Producer<R> = () -> R
typealias Operation = Producer<*>

inline fun <T> T.alsoDo(crossinline op: Operation): T = also { op() }

interface Sized {
  val size: Cnt get
  companion object Factory {
    fun of(c: Collection<*>) = object : Sized
      { override val size get() = c.size }
  }
}
inline val Sized.isEmpty get() = size == 0

interface Resetable {
  fun mark() fun reset()
  interface Stated: Resetable { val isMarking: Boolean get }
}
//fun Resetable.withPosition() = Closeable(::reset).alsoDo(::mark)
fun <R> Resetable.positional(op: Producer<R>): R = mark().let { op().alsoDo(::reset) }

fun <A, B, R> Iterable<A>.zipWith(other: Iterable<B>, f: (A, B) -> R): Iterable<R> = Iterable {
  object : Iterator<R> {
    val xs = this@zipWith.iterator()
    val ys = other.iterator()
    override fun hasNext() = xs.hasNext() && ys.hasNext()
    override fun next() = f(xs.next(), ys.next())
  }
}

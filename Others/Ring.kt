typealias Cnt = Int
interface Pipe<E> {
  fun add(item: E)
  fun addAll(items: Iterable<E>)
  fun pop(): E
  fun peek(): E
  val length: Cnt get
}
interface MarkReset {
  fun mark()
  fun reset()
  val isMarking: Boolean get
}

open class Ring<E>(private val buffer: Array<E>): Pipe<E>, Iterable<E> {
  val capacity = buffer.size
  var position = 0
    protected set
  private var writePos = 0

  protected var freeSpace: Cnt = capacity
  open val avaliable: Cnt get() = capacity - freeSpace

  override fun add(item: E) {
    check(freeSpace >0) { "Insufficient buffer ${describe()}" }
    buffer[writePos] = item
    writePos = rollingIndex(writePos+1)
    also { freeSpace -= 1 }
  }
  override fun pop(): E {
    check(avaliable >0) { "No more elements ${describe()}" }
    val shifted = buffer[position]
    position = rollingIndex(position+1)
    return shifted.also { freeSpace += 1 }
  }
  override fun peek(): E = buffer[position].also { check(avaliable >0) }

  override fun addAll(items: Iterable<E>) = items.forEach { add(it) }
  override val length: Cnt get() = avaliable

  private fun rollingIndex(idx: Cnt): Cnt = idx % capacity

  override fun iterator() = object: Iterator<E> {
    override fun hasNext() = avaliable !=0
    override fun next() = pop()
  }

  val viewport: List<E> get()  {
    if (avaliable <=0) return listOf<E>()
    val datav = mutableListOf<E>()
    for (nextIdx in position..(position+avaliable)-1) {
      val actualNext = rollingIndex(nextIdx)
      datav.add(buffer[actualNext])
    }
    return datav
  }
  operator fun contains(item: E) = item in viewport

  internal fun describe(): String = "(${toString()}, :$freeSpace<$position>$avaliable:$capacity)"
  protected open fun flag(idx: Cnt): String {
    var fl = ""
    if(idx == writePos) fl += '>'
    if(idx == position) fl += '^'
    return fl }
  override fun toString(): String {
    val inspect = StringBuilder("Ring").append("[")
    var index = 0
    buffer.fold(inspect) { pre, it ->
      pre.append(flag(index)).append(it).append(", ") .also {index++} }
    return inspect.append("…").append("]").toString()
  }

  companion object Factory {
    inline operator fun <reified E> invoke(capacity: Cnt, noinline initialf: (Int) -> E)
      = Ring<E>(Array(capacity, initialf))
    inline operator fun <reified E> invoke(capacity: Cnt, initial: E)
      = invoke(capacity) { _ -> initial }
  }
}

class MarkResetRing<E>(buffer: Array<E>): Ring<E>(buffer), MarkReset {
  var markerPos = MP0
    private set
  private var markedRead = 0
  override val avaliable: Cnt get() = capacity - (freeSpace + markedRead)

  override fun pop(): E = super.pop().also {
    if(isMarking) { freeSpace -= 1; markedRead += 1 } }

  override val isMarking: Boolean get() = markerPos != MP0
  override fun mark() = check(!isMarking).also { markerPos = position }
  override fun reset() = check(isMarking).also {
    position = markerPos; markerPos = MP0; markedRead = 0 }

  override fun flag(idx: Cnt): String {
    var fl = super.flag(idx)
    if(idx == markerPos) fl += '|'
    return fl
  }
  companion object Factory {
    inline operator fun <reified E> invoke(capacity: Cnt, noinline initialf: (Int) -> E)
      = MarkResetRing<E>(Array(capacity, initialf))
    inline operator fun <reified E> invoke(capacity: Cnt, initial: E)
      = invoke(capacity) { _ -> initial }
    const val MP0 = (-1)
  }
}


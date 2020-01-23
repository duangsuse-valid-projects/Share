typealias CategoryMap<K, V> = Set<Map<K, V>>
typealias IncludePath = String
/** Descending level */
typealias Level = /*Comparable*/ Int

class DescendAllocator(private var max: Int = Int.MAX_VALUE) {
  fun less() = max--
}

val kmap: CategoryMap<IncludePath, Level> = DescendAllocator().run { setOf(
  mapOf(
    "QObject" to less(),
    "QScopedPointer" to less(),
    "QByteArray" to less()
  ),
  mapOf(
    "QIODevice" to less(),
    "QTimer" to less(),
    "QAudioOutput" to less()
  ),
  mapOf(
    "QMainWindow" to less(),
    "QLabel" to less(),
    "QComboBox" to less(),
    "QPushButton" to less(),
    "QSlider" to less()
  )
)
}

fun <T, K> Iterable<T>.histogram(key: (T) -> K): Map<K, List<T>> {
  val hist: MutableMap<K, MutableList<T>> = mutableMapOf()
  for (item in this) { hist.getOrPut(key(item), ::mutableListOf).add(item) }
  return hist
}

object SortInclude {
  @JvmStatic
  fun main(vararg arg: String) {
    val code = readText()
    val includes = parse(code)
    println(includes)
    println(dump(organize(includes)))
  }
  fun dump(includes: Set<List<IncludePath>>): String {
    return includes.map { it.joinToString("\n") }.joinToString("\n\n")
  }
  private fun parse(includeCode: String): List<IncludePath>
    = includeCode.lines().map { includeRegex.matchEntire(it)
        ?.groupValues?.get(1) ?: error(it) }
  private val includeRegex = Regex("#include <(.*)>")
  fun organize(includes: List<IncludePath>): Set<List<IncludePath>> {
    val parted = includes.histogram { kmap.find { m -> it in m } ?: homeless }
    val sorted = parted.map { val (m, inz) = it;
      inz.sortedByDescending(m::getValue) }
    return sorted.toSet()
  }
  private val homeless: Map<IncludePath, Level> = emptyMap()
}

fun readText(): String {
  val text = StringBuilder()
  while (true) {
    val line = readLine()
    if (line == ".") break
    else text.append(line).append("\n")
  }
  text.delete(text.lastIndex, text.lastIndex.inc()) //"\n"
  return text.toString()
}


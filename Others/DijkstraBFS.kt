import kotlin.collections.Map
import kotlin.collections.MutableMap
import kotlin.collections.List
import kotlin.collections.MutableList

import java.util.Queue
import java.util.LinkedList

import java.io.InputStream
import java.util.Scanner
import java.util.regex.Pattern

typealias MMap<K, V> = MutableMap<K, V>
typealias MList<E> = MutableList<E>
////
data class BfsNode<T>(var walked: Boolean, val value: T) {
  override fun toString() = (if (walked) "~" else "") + value.toString()
  override fun equals(other: Any?) = (other is BfsNode<*>) && other.value == this.value
  override fun hashCode() = value?.hashCode() ?: 0b0
}
typealias Node = BfsNode<String>
typealias WeightedLink = Pair<Cost, Node>

typealias DirectedWeightedGraph = Map<Node, List<WeightedLink>>
typealias RouteSelect = MMap<Node, WeightedLink>

typealias Cost = Int
const val INF: Cost = Int.MAX_VALUE // BFS 采用的性质：任何数 n 不能大于 Infinity
typealias Graph = DirectedWeightedGraph
typealias Link = WeightedLink

sealed class Maybe<out T>()
class Some<T>(val value: T): Maybe<T>()
object None: Maybe<Nothing>()
val RootNode = BfsNode(true, "GraphRoot")
val NullNode = BfsNode(true, "NULL")

fun panic(msg: String = "Inconstant program state reached"): Nothing = throw RuntimeException(msg)

object DijkstraBFS {
  val LINK_REGEX = Pattern.compile("^(\\S+)\\s*>(\\d+)>\\s*(\\S+)$")

  fun inputGraph(stream: InputStream = System.`in`): Graph = inputGraph(Scanner(stream))
  fun inputGraph(scanner: Scanner): Graph = inputGraph(scanLines(scanner))
  fun inputGraph(lines: List<String>): Graph {
    val graph: MMap<Node, MList<WeightedLink>> = mutableMapOf()
    for (line in lines) {
      if (line.isEmpty()) continue;
      val matcher = LINK_REGEX.matcher(line)
        if (!matcher.matches()) { panic("Parser failed for input link $line") }
        val m: (Int) -> String = matcher::group
      val node = newNode(m(1)); val cost = Integer.parseInt(m(2)); val target = newNode(m(3))
      if (graph[target] == null) { graph[target] = mutableListOf() }
      if (graph[node] == null) { graph[node] = mutableListOf(Pair(cost, target)); continue; }
      graph[node]!!.add(Pair(cost, target))
    }
    return graph.toMap()
  }
  fun scanLines(stream: Scanner): List<String> {
    val lines = mutableListOf<String>()
    while (stream.hasNextLine()) { lines.add(stream.nextLine()) }
    return lines
  }
  fun newNode(name: String) = Node(false, name)
  fun selectId(gra: Graph) = fun(id: String) = gra.keys.find { it.value == id }

  fun checkGraphCyclic(gra: Graph): Maybe<Node> { TODO() }

  fun bfsSolveCosts(gra: Graph)
  = fun (start: Node): RouteSelect {
    val routes: RouteSelect = mutableMapOf()
    val bfs: Queue<Node> = LinkedList()
      val enque = makeEnqueuer(bfs)
    val cost = costGetter(routes)
    val setcost = costSetter(routes)
    val setpred = predSetter(routes)
    val links = linkGetter(gra)

    for (node in gra.keys) { setcost(node, INF) }
    setcost(start, 0); setpred(start, RootNode)
    enque(start)
    while (bfs.peek() != null) {
      val node = bfs.poll()
        if (node.walked) continue
      val neighbors = links(node)
      val curcost = cost(node)
      for ((linkcost, target) in neighbors) {
        val newcost = curcost + linkcost
        val oldcost = cost(target)
        if (newcost < oldcost) {
          setcost(target, newcost); setpred(target, node)
        }
        enque(target)
      }
      node.walked = true
    }

    return routes
  }

  fun bfsBacktrace(rs: RouteSelect) = fun(begin: Node, end: Node): List<Node> {
    val route = mutableListOf<Node>()
    var curr = begin
    while (true) {
      if (curr == end) break
      val pred = rs[curr]?.second ?: panic("Backtrace failed for $rs @($curr)")
      route.add(pred)
      curr = pred }
    return route
  }
  
  private fun <T> makeEnqueuer(que: Queue<T>)
    = fun(x: T) = if (que.offer(x)) Unit else panic()

  private fun costGetter(rs: RouteSelect)
    = fun (nd: Node): Cost = rs[nd]?.first ?: panic("Failed to fetch cost for $nd")
  private fun costSetter(rs: RouteSelect)
    = fun (nd: Node, c: Cost) { rs[nd] = Pair(c, rs[nd]?.second ?: NullNode) }
  private fun predSetter(rs: RouteSelect)
    = fun (nd: Node, pred: Node) { rs[nd] = Pair(rs[nd]?.first ?: 0, pred) }
  private fun linkGetter(gra: Graph)
    = fun (nd: Node): List<Link> = gra[nd] ?: listOf()
}

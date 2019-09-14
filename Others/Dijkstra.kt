package org.duangsuse.samp

import java.io.InputStream
import java.util.Scanner

import kotlin.text.Regex

fun <K, V> MutableMap<K, V>.getOrInitiate(k: K, init: V): V = if (k in this) this[k]!!
  else let { it[k] = init; return@let init }
fun <K, V : Any> MutableMap<K, V>.assignOrInitiate(k: K, init: V, op: (V) -> V): Unit
  { this[k] = if (k in this) op(this[k]!!) else init }

fun InputStream.lines() = object : Iterator<String> {
  val scan = Scanner(this@lines)
  override fun hasNext() = scan.hasNextLine()
  override fun next() = scan.nextLine()
}

inline fun singleshot(crossinline op: () -> Unit): () -> Unit {
  var called = false
  return { if (!called) op(); called = true }
}

////
/* Weighted DAG */
abstract class Dijkstra<T: Any> {
  data class Node<out T : Any>(val x: T, var walk: Boolean = true) {
    override fun equals(other: Any?) = other?.let { it is Node<*> && it.x == this.x } ?: false
    override fun hashCode() = x.hashCode()
    override fun toString() = "$x" }
  data class WNode<out T: Any>(val w: Int, val n: Node<T>)
  /* (1)Node <Vertice> (N)Node */
  open class GraphB<T: Any>(val g: Map<Node<T>, MutableSet< WNode<T> >> = mapOf()): // bad
    Map<Node<T>, MutableSet< WNode<T> >> by g
  class MutableGraphB<T: Any>(val mg: MutableMap<Node<T>, MutableSet< WNode<T> >> = mutableMapOf()):
    MutableMap<Node<T>, MutableSet< WNode<T> >> by mg, GraphB<T>(mg)
  class RouteSelectB<T: Any>(val rs: MutableMap<Node<T>, WNode<T> > = mutableMapOf()):
    MutableMap<Node<T>, WNode<T> > by rs // Node : Edge-Node
  
  // Nod : Node<T>, Graph : GraphB<T>,
  // MutableGraph : MutableGraphB<T>, RouteSelect : RouteSelectB<T>

  companion object Constant {
    val DIST_MAX = Int.MAX_VALUE
    
    object Regexz {
      data class LinkDraw<out T>(val x: T, val dist: Int, val y: T)
      fun MatchResult.txtOr(idx: Int, dft: String = "") = this.groups[idx]?.value ?: dft
      infix fun MatchResult.txt(idx: Int) = this.txtOr(idx)

      val LINK = Regex("^\\s*" +"(\\S+)\\s*\\->(\\((\\d+)\\))?\\s*(\\S+)"+ "\\s*$")
      fun LINK_Extr(m: MatchResult) = LinkDraw(m txt 1, m.txtOr(3, "0").let(Integer::parseInt), m txt 4)
    }
  }
  abstract fun nilNode(): Node<T>

  fun scanGraph(cstm: InputStream): GraphB<String> = cstm.let(::Scanner).let(::scanGraph)
  fun scanGraph(cstm: Scanner): GraphB<String> {
    val g: MutableGraphB<String> = MutableGraphB() // Why not use CharSeq.lines?
    val note = singleshot { println("NOTE: Use regex ${Regexz.LINK}") }
    while (cstm.hasNextLine()) {
      val ln = cstm.nextLine()
      val match = Regexz.LINK.find(ln)
      if (match !is Any) { println("Input: unrecognized `$ln'"); note(); continue }
      val ext = Regexz.LINK_Extr(match)
      g.getOrInitiate(Node(ext.x), mutableSetOf()).add(WNode(ext.dist, Node(ext.y)))
    }
    return g
  }

  fun backtrace(rs: RouteSelectB<T>) = fun(end: Node<T>, start: Node<T>): List<Node<T>> {
    val rout: MutableList<Node<T>> = mutableListOf()
    var step: Node<T>? = end
    do {
      step = rs[step]?.n
      step?.let(rout::add)
    } while (step in rs && step != start)
    if (step != start) throw IllegalArgumentException("Discrete route selection ($end - $start)@$step")
    return rout.reversed()
  }

  @JvmOverloads
  fun solve(gra: GraphB<T>, root: Node<T>, warn: (Node<T>) -> Unit = { println("Anon Nod $it") }): RouteSelectB<T> {
    val rs: RouteSelectB<T> = RouteSelectB()
    for (nd in gra.keys) { rs[nd] = WNode(DIST_MAX, nilNode()) }
    for (edges in gra.values) for ((_, nd) in edges) { rs[nd] = WNode(DIST_MAX, nilNode()) }
    rs[root] = WNode(0, nilNode()) // 其实上面那个可以换成更符合事实的『规范化输入结构』，将匿名端点全都 gra[nd] = emptySet()；这里不这么写
    while (rs.keys.find { it.walk } is Any) {
      val step = rs.keys.filter { it.walk }.minBy { rs[it]!!.w } !!
      val basew: Int = rs[step]!!.w
      for ((cost, neibor) in gra[step] ?: emptySet<WNode<T>>().also { warn(step) } ) {
        val newcost = basew + cost
        if (newcost < rs[neibor]!!.w) {
          rs[neibor] = WNode(newcost, step)
        }
      }
      step.walk = false
    }
    return rs
  }
}

object DijSolve : Dijkstra<String>() {
  val ROOT = Node("GraphRoot")
  override fun nilNode() = Node("-")
  @JvmStatic fun main(vararg args: String) {
    val input = scanGraph(System.`in`)
    if (ROOT !in input) { println("Please create entry node $ROOT"); return }
    println(input)
    val solution = solve(input, ROOT)
    println(solution)
    println()
    println("Backtrace >>>")
    for (ln in System.`in`.lines()) {
      val ab = ln.split(' ')
      try {
        val start = if (2 <= ab.size) Node(ab[1]) else ROOT
        println(backtrace(solution)(Node(ab[0]), start)) }
      catch (e: IllegalArgumentException) { println(e) }
    }
  }
}

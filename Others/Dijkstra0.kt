package org.duangsuse.samp

import java.io.InputStream
import java.util.Scanner

import kotlin.text.Regex

/* Weighted DAG */
typealias WNode<Nd> = Pair<Int, Nd>
typealias GraphB<Nd> = Map<Nd, Set< WNode<Nd> >> /* Node : Edge */
typealias MutableGraphB<Nd> = MutableMap<Nd, MutableSet< WNode<Nd> >>
typealias RouteSelectB<Nd> = MutableMap<Nd, WNode<Nd> > // Node : Edge-Node

data class Node<out T : Any>(val x: T, var walk: Boolean = true) {
  override fun equals(other: Any?) = other?.let { it is Node<*> && it.x == this.x } ?: false
  override fun hashCode() = x.hashCode()
  override fun toString() = "$x"
}

typealias Nod = Node<String>
typealias Graph = GraphB<Nod>
typealias MutableGraph = MutableGraphB<Nod>
typealias RouteSelect = RouteSelectB<Nod>

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

object Dijkstra {
  val DIST_MAX = Int.MAX_VALUE
  val ROOT = Node("GraphRoot")
  val NIL = Node("-")

  object Regexz {
    data class LinkDraw<out T>(val x: T, val dist: Int, val y: T)
    fun MatchResult.txtOr(idx: Int, dft: String = "") = this.groups[idx]?.value ?: dft
    infix fun MatchResult.txt(idx: Int) = this.txtOr(idx)

    val LINK = Regex("^\\s*" +"(\\S+)\\s*\\->(\\((\\d+)\\))?\\s*(\\S+)"+ "\\s*$")
    fun LINK_Extr(m: MatchResult) = LinkDraw(m txt 1, m.txtOr(3, "0").let(Integer::parseInt), m txt 4)
  }

  fun scanGraph(cstm: InputStream): Graph = cstm.let(::Scanner).let(::scanGraph)
  fun scanGraph(cstm: Scanner): Graph {
    val g: MutableGraph = mutableMapOf() // Why not use CharSeq.lines?
    val note = singleshot { println("NOTE: Use regex ${Regexz.LINK}") }
    while (cstm.hasNextLine()) {
      val ln = cstm.nextLine()
      val match = Regexz.LINK.find(ln)
      if (match !is Any) { println("Input: unrecognized `$ln'"); note(); continue }
      val ext = Regexz.LINK_Extr(match)
      g.getOrInitiate(Node(ext.x), mutableSetOf()).add(Pair(ext.dist, Node(ext.y)))
    }
    return g
  }

  fun backtrace(rs: RouteSelect) = fun(end: Nod, start: Nod): List<Nod> {
    val rout: MutableList<Nod> = mutableListOf()
    var step: Nod? = end
    do {
      step = rs[step]?.second
      step?.let(rout::add)
    } while (step in rs && step != start)
    if (step != start) throw IllegalArgumentException("Discrete route selection ($end - $start)@$step")
    return rout.reversed()
  }

  @JvmOverloads
  fun solve(gra: Graph, root: Nod = ROOT, warn: (Nod) -> Unit = { println("Anon Nod $it") }): RouteSelect {
    val rs: RouteSelect = mutableMapOf()
    for (nd in gra.keys) { rs[nd] = Pair(DIST_MAX, NIL) }
    for (edges in gra.values) for ((_, nd) in edges) { rs[nd] = Pair(DIST_MAX, NIL) }
    rs[root] = Pair(0, NIL) // 其实上面那个可以换成更符合事实的『规范化输入结构』，将匿名端点全都 gra[nd] = emptySet()；这里不这么写
    while (rs.keys.find { it.walk } is Any) {
      val step = rs.keys.filter { it.walk }.minBy { rs[it]!!.first } !!
      val basew: Int = rs[step]!!.first
      for ((cost, neibor) in gra[step] ?: emptySet<WNode<Nod>>().also { warn(step) } ) {
        val newcost = basew + cost
        if (newcost < rs[neibor]!!.first) {
          rs[neibor] = Pair(newcost, step)
        }
      }
      step.walk = false
    }
    return rs
  }

  @JvmStatic fun main(vararg args: String) {
    val input = scanGraph(System.`in`)
    if (ROOT !in input) { println("Please create entry node $ROOT"); return }
    println(input)
    val solution = solve(input)
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



object BrainFuck {
sealed class BF {
  data class Op(val id: Char): BF() { override fun toString() = "Op($id)" }
  data class Blk(val body: List<BF>): BF() { override fun toString() = "Blk$body" }
}
val control = elementIn('>', '<', '+', '-', '.', ',')
val controlBF = Convert(control, { BF.Op(it) }, { it.id })
lateinit var program: Pattern<Char, List<BF>>
val block = SurroundBy(item('[') to item(']').clam {"] !!!"}, Deferred {program})
val blockBF = Convert(block, { BF.Blk(it) }, { it.body })

val ws = Repeat(asString(), !(control or elementIn('[',']','\n')) ).Many()
init {
  val part = JoinBy(ws, Decide(controlBF, blockBF).mergeFirst { if (it is BF.Op) 0 else 1 }).mergeConstantJoin("")
  program = Convert(Seq(::AnyTuple, ws, part, ws), { it.getAs<List<BF>>(1) }, { anyTupleOf("",it,"") })
}

@JvmStatic fun main(vararg args: String) {
  val repl = JoinBy(item('\n'), Decide(program, StickyEnd(EOF, notParsed)).mergeFirst {0}).OnItem(::println).mergeConstantJoin()
  repl.read(CharInput.STDIN)?.let { println(repl.show(it)) }
}
}

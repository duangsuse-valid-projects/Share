package org.duangsuse

typealias Globals = MutableMap<String, Any>
typealias Stringify = (Any) -> String

sealed class TemplatorAst {
  class Plain(val text: String): TemplatorAst() {
    override fun fillTo(sb: StringBuilder, map: Globals) { sb.append(text) }
  }
  class Block(val items: List<TemplatorAst>): TemplatorAst() {
    override fun fillTo(sb: StringBuilder, map: Globals) { items.forEach { it.fillTo(sb, map) } }
  }
  class BuildString(val name: String, val block: Block): TemplatorAst() {
    override fun fillTo(sb: StringBuilder, map: Globals) {
      val sb1 = map.getOrPut(name, ::StringBuilder) as StringBuilder
      block.fillTo(sb1, map)
    }
  }
  class If(val inverted: Boolean, val varName: String, val block: Block): TemplatorAst() {
    override fun fillTo(sb: StringBuilder, map: Globals) {
      val truthy = (map[varName] as? Boolean) == true
      if (if (inverted) !truthy else truthy) block.fillTo(sb, map)
    }
  }
  class ValRef(val pipes: List<String>, val name: String): TemplatorAst() {
    override fun fillTo(sb: StringBuilder, map: Globals) {
      @Suppress("unchecked_cast") sb.append(pipes.fold(map[name] ?: error("undefined variable $name")) { res, it ->
        (map[it] as? Stringify ?: error("bad function $it"))(res)
      })
    }
  }
  abstract fun fillTo(sb: StringBuilder, map: Globals)
}

object Templator {
  fun fillWith(map: Map<String, Any>, vararg templates: TemplatorAst): String {
    val lastSb = StringBuilder()
    val globals = map.toMutableMap()
    templates.forEach { lastSb.clear(); it.fillTo(lastSb, globals) }
    return lastSb.toString()
  }
}

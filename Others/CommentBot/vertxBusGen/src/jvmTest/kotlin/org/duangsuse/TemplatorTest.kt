package org.duangsuse

import kotlin.test.Test
import kotlin.test.assertEquals

class TemplatorTest {
  @Test fun lexer() {
    assertEquals(EXPECTED.split("|"), lex(INPUT))
  }
  private fun lex(input: String): List<String> {
    val pas = TemplatorParser(input, Templator.LangMode.Normal)
    val list = mutableListOf<String>()
    try { while (true) { list.add(pas.token.consume().second) } } catch (_: Peek.End) {}
    return list
  }
  @Test fun parser() {
    val res = Templator.compile("-{if partyOpen}Party is opened-{if !full}, welcome!!-{end}-{end}\n").items
    assertEquals(2, (res[0] as TemplatorAst.If).a.items.size)
    val res1 = Templator.compile(INPUT).items
    assertEquals(10, res1.size)
  }
  @Test fun usage() {
    val party = Templator.compile(INPUT)
    assertEquals(EXPECTED_FILL1, Templator.fillWith(Templator.createGlobal(fill1), party))
  }
  @Test fun bidMap() {
    val kws = BidirMap.identity("for", "in", "if")
    val trans = mapOf(
      "zh_cn" to BidirMap.of("对" to "for", "存于" to "in", "若" to "if"),
      "bad" to BidirMap.of("对于" to "for", "在" to "in", "如果" to "if")
    )
    assertEquals("存于", BidirMap.translate(trans, "bad" to "zh_cn", "在"))
  }
  companion object {
    const val INPUT = """
Hello plain text.
His name is -[name]

Party members:
-{for name in names}-[name]
-{end}
-{if partyOpen }Party is opened-{if !full}, welcome!!-{end}-{end}

-{buildString foodList}Foods:
-[joinFoodList   eachTrim foods]-{end}-[foodList]
"""
    const val EXPECTED = """
Hello plain text.
His name is |name|

Party members:
|for name in names|name|
|end|
|if partyOpen |Party is opened|if !full|, welcome!!|end|end|

|buildString foodList|Foods:
|joinFoodList   eachTrim foods|end|foodList|
"""
    const val EXPECTED_FILL1 = """
Hello plain text.
His name is Mike

Party members:
Jake Wilkerson
Rose Sunny
Mike Dabbing

Party is opened

Foods:
Apple, Banana, Ice-cream
"""
    val fill1 = mapOf(
      "name" to "Mike",
      "names" to listOf("Jake Wilkerson", "Rose Sunny", "Mike Dabbing"),
      "partyOpen" to true, "full" to true,
      "foods" to listOf(" Apple ", "Banana", "Ice-cream"),
      "joinFoodList" to { _:Scope, it: List<String> -> it.joinToString() },
      "eachTrim" to { _:Scope, it: List<String> -> it.map { s -> s.trim() } }
    )
  }
}
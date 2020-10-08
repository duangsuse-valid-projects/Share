package org.duangsuse

import kotlin.test.Test
import kotlin.test.assertEquals

class TemplatorTest {
  @Test fun lexer() {
    assertEquals(EXPECTED.split("|"), lex(INPUT))
  }
  private fun lex(input: String): List<String> {
    val pas = TemplatorParser(input)
    val list = mutableListOf<String>()
    while (pas.isNotEnd) { list.add(pas.lastToken.second); pas.nextToken() }
    return list
  }
  @Test fun parser() {
    val res = TemplatorParser("-{if partyOpen}Party is opened-{if !full}, welcome!!-{end}-{end}\n").readTop()
    assertEquals(2, (res[0] as TemplatorAst.If).block.items.size)
    val res1 = TemplatorParser(INPUT).readTop()
    assertEquals(10, res1.size)
  }
  @Test fun usage() {
    val party = Templator.compile(INPUT)
    assertEquals(EXPECTED_FILL1, Templator.fillWith(fill1, party))
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
      "joinFoodList" to { it: List<String> -> it.joinToString() },
      "eachTrim" to { it: List<String> -> it.map { s -> s.trim() } }
    )
  }
}
package org.duangsuse

import kotlin.test.Test
import kotlin.test.assertEquals

class TemplatorTest {
  @Test fun lexer() {
    assertEquals(EXPECTED.split("|"), lex(INPUT))
  }
  private fun lex(input: String): List<String> {
    val pas = TemplatorParser(input)
    val list = mutableListOf(pas.lastToken.second)
    try { while (true) list.add(pas.readToken().second) } catch (_: SubseqParser.End) {}
    return list
  }
  @Test fun parser() {
    assertEquals(TemplatorAst.ValRef(listOf(), "a"), TemplatorParser("-{if partyOpen}Party is opened-{if !full}, welcome!!-{end}-{end}\n").readTop()[0])
  }
  companion object {
    const val INPUT = """
Hello plain text.
His name is -[name]

Party members:
-{for name in names}name-{end}
-{if partyOpen}Party is opened-{if !full}, welcome!!-{end}-{end}

-{buildString foodList}
Foods:
-[joinFoodList eachTrim foods]
-{end}
-[foodList]
"""
    const val EXPECTED = """
Hello plain text.
His name is |name|

Party members:
|for name in names|name|end|
|if partyOpen|Party is opened|if !full|, welcome!!|end|end|

|buildString foodList|
Foods:
|joinFoodList eachTrim foods|
|end|
|foodList|
"""
  }
}
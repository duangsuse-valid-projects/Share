package org.duangsuse

import kotlin.test.Test
import kotlin.test.assertEquals

class TemplatorTest {
  @Test fun lexer() {
    val pas = TemplatorParser(INPUT)
    val list = mutableListOf<String>()
    try { while (true) list.add(pas.readToken().second) } catch (_: SubseqParser.End) {}
    assertEquals(EXPECTED.split("|"), list)
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
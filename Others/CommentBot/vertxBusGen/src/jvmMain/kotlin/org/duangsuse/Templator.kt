package org.duangsuse

import java.io.File
object Platform {
  fun readFileText(path: String) = File(path).readText()
  fun getenv(): MutableMap<String, String> = System.getenv()
}

actual fun lineSeparator(): String = System.lineSeparator()

actual fun main(vararg args: String) {
  val env = Platform.getenv()
  val scope = Templator.createGlobal(env)
  fun runRepl(mode: Templator.LangMode) {
    print("$mode Template snippet REPL.\n>")
    val code = StringBuilder(); val sb = StringBuilder()
    val inputs = mutableListOf<String>(); scope["_In"] = inputs
    val nl = lineSeparator()
    while (true) {
      readLine()?.let(code::append) ?: break // single-line concat REPL... not stream based
      try {
        val codeStr=code.toString(); Templator.compile(codeStr, mode).fillTo(sb, scope)
        println(sb.toString()); sb.clear(); inputs.add(codeStr); code.clear() }
      catch (pe: Templator.ParseError) {
        if (pe.message?.contains("expect") == true) { code.append(nl); print("|"); continue }
        pe.printStackTrace(); code.clear()
      } catch (e: Exception) { e.printStackTrace(); code.clear() }
      finally { print(">") }
    }
  }
  val empty = TemplatorAst.Plain("")
  print(Templator.fillWith(scope, *Array(args.size) { i ->
    when (args[i]) {
      "-" -> { runRepl(Templator.LangMode.Normal); empty }
      "-r" -> { runRepl(Templator.LangMode.Pure); empty }
      else -> try {
        Templator.compile(Platform.readFileText(args[i]))
      } catch (e: Exception) {
        throw IllegalArgumentException("Failed to compile #$i, ${args[i]}", e)
      }
    }
  }))
}

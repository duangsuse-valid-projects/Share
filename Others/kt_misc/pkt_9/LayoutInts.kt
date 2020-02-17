val item = RepeatUn(asInt(), digitFor('0'..'9')) { i -> i.toString().map { it - '0' } }
val tail = Seq(::CharTuple, item('-'),item('>')).toStringPat()
val layout = Convert(Repeat(asString(), item(' ')).Many() prefix item('\n'), { it.length }, { "".padStart(it) })
val p = LayoutPattern(item, tail, layout)

val comment = TextPattern(stringFor(anyChar), Regex("^(#|;)(.*)")) { it[1]+it[2] }
val slash = item('/')
val line = JoinBy(slash, Repeat(asString(), anyChar and !slash).clamWhile(!slash, "") {"empty field"} ).mergeConstantJoin()
val slashSepValues = JoinBy(newlineChar, Decide(comment, line)) 

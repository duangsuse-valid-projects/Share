val item = RepeatUn(asInt(), digitFor('0'..'9')) { i -> i.toString().map { it - '0' } }
val tail = Seq(::CharTuple, item('-'),item('>')).toStringPat()
val layout = Convert(Repeat(asString(), item(' ')).Many() prefix item('\n'), { it.length }, { "".padStart(it) })
val p = LayoutPattern(item, tail, layout)

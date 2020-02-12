object Hosts {
//comment: COMMENT;
val nl = Seq(::CharTuple, item('\r').toDefault(), item('\n')).toStringPat()
val nlChar = elementIn('\r', '\n')
//NL: ('\r\n'|'\n\r'|'\r'|'\n') ->skip;
//BLANK: (' '|'\t') ->skip; 
val ws = Repeat(asString(), elementIn(' ', '\t')).Many()

//HOSTNAME: [A-z0-9.]+;
val hostname = Repeat(asString(), elementIn('A'..'z', '0'..'9') or item('.'))

//NUM: [0-9] +;
val digit = digitItem(elementIn('0'..'9'))
val number = RepeatUn(asInt(), digit) { it.toString().map { it - '0' } }
//IPADDRESS: NUM '.' NUM '.' NUM '.' NUM;
val ipAddress = JoinBy(item('.'), number).mergeConstantJoin()

//item: IPADDRESS HOSTNAME ;
val record = Seq<Char, Any, AnyTuple>(::HostEntry, ws, ipAddress, ws, hostname, ws)
class HostEntry: AnyTuple(5) {
  var ipAddress by indexAs<List<Int>>(1)
  var hostname by indexAs<String>(3)
}

//COMMENT: '#' .*? '\r'? '\n';
val comment = Seq(::StringTuple, Until(nlChar, asString(), anyChar), nl)

//line : item | comment;
val line = Decide(record, comment)
//hostfile: line* EOF;
val hosts = Repeat(asList(), line).Many()

}

object Hosts {
//comment: COMMENT;
val nl = Seq(::CharTuple, item('\r').toDefault(), item('\n')).toStringPat()
val nlChar = elementIn('\r', '\n')
//NL: ('\r\n'|'\n\r'|'\r'|'\n') ->skip;
//BLANK: (' '|'\t') ->skip; 
val ws = Repeat(asString(), elementIn(' ', '\t'))

//HOSTNAME: [A-z0-9.]+;
val hostname = Repeat(asString(), elementIn('A'..'z', '0'..'9') or item('.'))

//NUM: [0-9] +;
val digit = digitItem(elementIn('0'..'9'))
val number = Repeat(asInt(), digit)
//IPADDRESS: NUM '.' NUM '.' NUM '.' NUM;
val ipAddressPart = JoinBy(item('.'), number).mergeSecond { (0 until it.size).asIterable().map { '.' } }
val ipAddress = Convert(ipAddressPart, {it.joinToString("")}, {it.split(".").map(String::toInt)})

//item: IPADDRESS HOSTNAME ;
val record = Seq(::HostEntry, ws, ipAddress, ws, hostname, ws)
class HostEntry: StringTuple(2) {
  var ipAddress by index(1)
  var hostname by index(3)
}

//COMMENT: '#' .*? '\r'? '\n';
val comment = Seq(::StringTuple, Until(nlChar, asString(), anyChar), nl)

//line : item | comment;
val line = Decide(record, comment)
//hostfile: line* EOF;
val hosts = Repeat(asList(), line).Many()

}

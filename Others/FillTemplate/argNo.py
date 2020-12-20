from re import compile as Regex
RE_DEFINE_REF = Regex("\\${\\s*(.*?)\\s*}")
RE_PARENED = Regex("\\((.*?)\\)")

formals = ["a", "b"]
found = []
def argNo(m, is_regex): # find ${N} index of ref, or expr (ref).ops
  fmts = ("(.*)", ".*") if is_regex else ("${%s}", "NOREF")
  brace = fmts[0]
  def braceRef(name):
    idx = formals.index(name)
    if is_regex: found.append(idx); return brace
    else: return brace %str(idx)
  try: return braceRef(m.group(1))
  except ValueError: pass
  expr = m.group(1) #v just convert ${(N)} to args[N] in exprs
  refIsFound = [False]
  def refEval(m1):
    name1 = m1.group(1)
    try:
      if refIsFound[0]: return "noRef(%r, %r)" %(name1, "DUP")
      sRef = braceRef(name1) #v replaces only non-regex
      refIsFound[0] = True
      return RE_DEFINE_REF.sub(lambda m2: "args[%s]" %m2.group(1), sRef)
    except ValueError:
      return "noRef(%r)" %name1
  expr1 = RE_PARENED.sub(refEval, expr)
  return (brace if is_regex else brace %expr1) if refIsFound[0] else fmts[1]

def printSubst(s):
  found = []
  for subs in None, found: print(s, RE_DEFINE_REF.replaceIn(s, lambda m: argNo(["a", "b"], subs, m)))
  print(found); found.clear()
for code in "hello", "hell${x}", "hell${p}${a}", "${b}${a}", "${(b).name}${xs[(a)]}", "${(sb).a1}${(b)}", "${(a).of(b)}${(b)}": printSubst(code)

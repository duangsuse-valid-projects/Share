RE_DEFINE_REF = Regex("\\${\\s*(.*?)\\s*}")
RE_PARENED = Regex("\\((.*?)\\)")

def argNo(m): # find ${N} index of ref, or expr (ref).ops
  noRef = "REF"; braceRef = lambda i: "${%d}" %formals.index(i)
  try: return braceRef(m.group(1))
  except ValueError: pass
  expr = m.group(1) #v just convert ${N} to a[N] in exprs
  refEval = lambda m1: RE_DEFINE_REF.sub(lambda m2: "a[%s]" %m2.group(1), argNo(m1))
  expr1 = RE_PARENED.sub(refEval, expr)
  return "${%s}" %expr1 if (expr1 != expr) else noRef

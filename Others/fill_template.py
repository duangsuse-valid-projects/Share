#!/usr/bin/env python
from __future__ import print_function
import re # using Regex as tokenizer
from re import compile as Regex

from sys import argv, stderr, exc_info
import traceback
from os import mkdir, chdir, path, getenv
from shutil import copytree

def eprint(*args): print(*args, file=stderr)

def _mkdirs(fp):
  base = path.dirname(fp) # just for fun... bad
  try:
    if base != "": _mkdirs(base)
    mkdir(fp)
  except FileExistsError as ex:
    if not path.isdir(fp): raise ex
def mkdirs(fp):
  base = path.dirname(fp)
  if base != "": _mkdirs(base)

def _sumSrcPos(tb):
  (src, lineno) = tb[0].rsplit(':')
  lnbeg = int(lineno)
  return "%s:%d+%d, %s:%d" %(src, lnbeg, tb[1], src, lnbeg+tb[1])

def eprintMdStack(tb):
  for caller in reversed(traceback.extract_tb(tb)):
    try: eprint(_sumSrcPos(caller))
    except ValueError: break

def runCode(code, srcpos, locals):
  try: eval(compile(code, srcpos, "exec"), None, locals)
  except BaseException:
    (etype, ex, tb) = exc_info()
    eprint("----"); eprint(code)
    callee = traceback.extract_tb(tb, limit=2)[-1]
    try: eprint(":: %s (%s)" %(ex, _sumSrcPos(callee)))
    except ValueError: eprint(str(ex)) # PY2 exc_info() errloc

def strBrief(s, n_vp):
  iVp = n_vp // 2
  return (s[:iVp], s[len(s)-iVp:]) if len(s) > n_vp+1 else (s,) # odd len =+1.


## PART macro util
RE_WHITE = Regex("\\s")
RE_COMMA = Regex(",\\s*")
RE_DEFINE = Regex("\\s*(\\S+?)\\((.*?)\\) ?(.*?)\\n")
RE_MACRO_REF = Regex("\\${(.*?)}")
def readDefine(d, s, srcpos):
  def convertDef(m):
    (name, formals, body) = m.groups()
    return "macro(d, %r, %r, %r, srcpos)\n" %(name, formals, body)
  code = RE_DEFINE.sub(convertDef, s)
  runCode(code, srcpos, {"d": d, "srcpos": srcpos})

def macro(d, name, params, body, srcpos):
  notPY2 = not name.endswith("_PY2")
  sInterp = "lambda %s: f(%r, {}, {})"
  lambCode = sInterp.format(repr(params), params) if notPY2 else "lambda %s: %s"
  try:
    code = compile(lambCode %(params, body), srcpos, "eval")
    dGlo = {"scope": d}
    def strInterpolate(s, params, *args):
      table = dict(zip(RE_COMMA.split(params), args))
      return RE_MACRO_REF.sub(lambda m: str(eval(m.group(1), dGlo, table)), s)
    dGlo["f"] = strInterpolate #recur-ref
    d[name] = eval(code, dGlo) # in lambCode
    eprint("defined %s of %s" %(name, params))
  except SyntaxError as ex:
    pfix = len(name) - len("lambda") - (2 if notPY2 else 0) #f"
    eprint("--"); eprint(ex.text)
    evalCaller = traceback.extract_stack(limit=2)[0]
    eprint(":: %s in %s (%s:%d)" %(ex.msg, name, _sumSrcPos(evalCaller), ex.offset+pfix))

RE_MACRO = Regex("(#|/{2})(\\S+?)\\(\\s*(.*?)\\)", re.DOTALL)
def joinAlsoPrint(*args): print(*args); return "".join(args)
def firstOccur(s, i, *texts):
  iFound = -1
  for text in texts:
    idx = s.find(text, i)
    if idx != -1 and (iFound == -1 or idx < iFound): iFound = idx
  return iFound

def eprintSyntaxError(s, i, msg):
  slErr = list(s)
  slErr.insert(i, '<')
  eprint("----"); eprint("".join(slErr)); eprint("%s near <:%d" %(msg, i))

def _expandMacroTo(sb, s, i0, get_subst): # TODO: turn to use stream / subproc as state
  #return RE_MACRO.sub(lambda m: get_subst(m[2], m[3]), s)
  n = len(s); buf = []
  i = i0; state = 0
  def appendBuf():
    sBuf = "".join(buf); buf.clear()
    if sBuf != "": sb.append(sBuf)
    return i
  while i < n:
    c = s[i]
    if state == 0 and c in "#/)": # state machine
      if c == '#': buf.append('#'); i+=1
      elif c == '/': buf.append('//'); i+=2
      elif c == ')': return appendBuf()
      state = 1; continue # just like "call a function"
    elif state == 1:
      try:
        while not (s[i].isspace() or s[i] in "()"): buf.append(s[i]); i += 1
        if s[i] == ')': return appendBuf()
        sL = buf[-1]
        if sL == "#" or sL == "//": appendBuf(); state = 0
      except IndexError: break  
      if s[i] == '(':
        name = "".join(buf); buf.clear()
        iBeg = len(sb)
        i = _expandMacroTo(sb, s, i+1, get_subst)
        iEnd = len(sb)
        for idx in range(iBeg, iEnd): buf.append(sb.pop(iBeg))
        called = get_subst(name.lstrip("#/"), "".join(buf) )
        sb.insert(iBeg, called) # Excel-like step-by-step
        buf.clear()
        if i >= n or s[i] != ')':
          eprintSyntaxError(s, i, "expecting ')'")
          break
        i += 1
    oldI = i
    i = firstOccur(s, i, "#", "//", ")")
    if i == -1: i = n # at EOF
    skip = s[oldI:i]
    if skip != "": sb.append(skip)
  return appendBuf() # just for fun, not serious.

def expandMacro(s, get_subst):
  sb = []; _expandMacroTo(sb, s, 0, get_subst)
  return "".join(sb)

MACRO_SUFFIXES = ["", "_PY2", "_JS"]
def getMacroResult(fn, s_arg, scope):
  for suffix in MACRO_SUFFIXES:
    name = fn+suffix
    op = scope.get(name); args = RE_COMMA.split(s_arg)
    if op != None:
      try: return str(op(*args))
      except BaseException:
        tb = exc_info()[2]
        eprint("Exception in %s %r" %(name, args))
        eprintMdStack(tb)
        eprint(traceback.format_exc())
        return "FAIL"
  return "ERR"


## PART output process / main
RE_CODE = Regex("```\\w*\\n(#|/{2})(\\s?!?!?[^\\s!#]+\\n)?\\n?(.*?)```", re.DOTALL) #!compat
# original: "```\\w*\\n//\\s([\\w/.]*)\\n(.*?)```"
def outputInPwd(src, fp_base, scope={}, n_previ=40):
  srcmd = ""
  with open(src, "r") as fd: srcmd = fd.read()
  prefixFp = "" # talk-about feat.
  def getSrcpos(m): # errloc feat.
    return "%s:%d" %(path.relpath(src, fp_base), srcmd.count('\n', 0, m.start())+2)
  def getDir(): return path.dirname(src)

  for m in RE_CODE.finditer(srcmd):
    (sCmt, desc, code) = m.groups()
    isText = (desc == None)
    fpOut = "" if isText else desc.strip()
    if fpOut.startswith("!!"):
      action = fpOut[2:]
      if action == "define": readDefine(scope, code, getSrcpos(m))
      elif action == "execute": runCode(code, getSrcpos(m), {"__FILE__": src, "__DIR__": getDir(), "scope": scope})
      elif action == "include":
        fp = path.join(getDir(), code.strip())
        outputInPwd(fp, fp_base, scope, n_previ)
      elif action == "talkabout": prefixFp = code.strip()
      else: eprint("unknown preprocessor action: %s" %action)
      continue
    if fpOut.startswith("!"): continue # ignore '!'!
    fpOut1 = prefixFp+fpOut
    if fpOut1 == "": continue # talk-about is not for outer blocks
    code1 = expandMacro(code, lambda name, s_arg: getMacroResult(name, s_arg, scope))
    previ = RE_WHITE.sub(" ", code1) #!pref
    print("%s N=%i %s" %(fpOut1, len(code1), "...".join(strBrief(previ, n_previ)) ))
    mkdirs(fpOut1)
    with open(fpOut1, getenv("writeMode", "a")) as fd:
      if isText: fd.write(sCmt) # for "##"
      fd.write(code1)

def processFile(src, fp_tpl):
  fpAbs = path.abspath(src)
  (fpBase, name) = path.split(fpAbs)
  dst = path.splitext(name)[0]
  if fp_tpl != "":
    if not path.isdir(fp_tpl): raise EnvironmentError(fp_tpl+" dir not found here")
    try: copytree(fp_tpl, dst, dirs_exist_ok=True) # template feat.
    except TypeError: copytree(fp_tpl, dst)
  else:
    if not path.isdir(dst): mkdir(dst)
  chdir(dst); outputInPwd(fpAbs, fpBase)

# TODO: Add TextEdit .create/modify Range, listenFileChange(dst, srcs, d_ftes)
# TODO: Add auto-macro-match from output

if __name__ == "__main__":
  fpTpl = getenv("template", "")
  for fp in argv[1:]: processFile(fp, fpTpl)

def trimBetween(cps, s): # confusing why added.
  state = 0; sb = [] # but anyone can shrink it...
  for c in s:
    (ce, p) = cps[state]
    if c == ce: state += p
    elif state %2==0: sb.append(c)
  return "".join(sb)

parenCps = { 0: ['(', 1], 1: [')', 0-1] }

#!/usr/bin/env python
from __future__ import print_function
import re # using Regex as tokenizer
from re import compile as Regex

from sys import argv, stderr, exc_info
from sys import version_info, getfilesystemencoding # choose CStringIO stream impl cfg.
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
RE_MACRO_REF = Regex("\\${\\s*(.*?)\\s*}")
def readDefine(d, s, srcpos):
  def convertDef(m):
    (name, formals, body) = m.groups()
    return "macro(d, %r, %r, %r, srcpos)\n" %(name, formals, body)
  code = RE_DEFINE.sub(convertDef, s)
  runCode(code, srcpos, {"d": d, "srcpos": srcpos})

def macro(d, name, params, body, srcpos):
  notPY2 = not name.endswith("_PY")
  sInterp = "lambda %s: f(%r, {}, {})"
  lambCode = sInterp.format(repr(params), params) if notPY2 else "lambda %s: %s"
  try:
    code = compile(lambCode %(params, body), srcpos, "eval")
    dGlo = {"scope": d, "Regex": Regex}
    def strInterpolate(s, params, *args):
      table = dict(zip(RE_COMMA.split(params), args))
      return RE_MACRO_REF.sub(lambda m: str(eval(m.group(1), dGlo, table)), s)
    dGlo["f"] = strInterpolate #recur-ref
    d[name] = eval(code, dGlo) # defined in lambCode
    eprint("defined %s of %s" %(name, params))
  except SyntaxError as ex:
    pfix = len(name) - len("lambda") - (2 if notPY2 else 0) #f"
    eprint("--"); eprint(ex.text)
    evalCaller = traceback.extract_stack(limit=2)[0]
    eprint(":: %s in %s (%s:%d)" %(ex.msg, name, _sumSrcPos(evalCaller), ex.offset+pfix))

def joinAlsoPrint(*args): print(*args); return "".join(args)
def takeTillFirstOccur(cs, *texts):
  s = str(cs)[cs.pos:]; iFound = -1
  for text in texts:
    idx = s.find(text)
    if idx != -1 and (iFound == -1 or idx < iFound): iFound = idx
  i1 = 0
  if iFound == -1: cs.io.seek(0, 2); i1 = cs.pos; cs.io.close() # EOF
  else: i1 = iFound; cs.pos += i1+1
  return s[:i1]

def eprintSyntaxError(s, i, msg):
  slErr = list(s)
  slErr.insert(i, '<')
  eprint("----"); eprint("".join(slErr)); eprint("%s near <:%d" %(msg, i))

class CStringIO:
  if version_info.major == 2:
    global StringIO; from cStringIO import StringIO
  else: global StringIO; from io import StringIO

  def __init__(self, initial=""): self.io = StringIO(initial); self.initial = initial
  def write(self, s): self.io.write(s)
  def __str__(self): return self.io.getvalue()
  def clear(self): self.io.seek(0, 0); self.io.truncate(0)
  @property
  def pos(self): return self.io.tell()
  @pos.setter
  def pos(self, i): self.io.seek(i, 0)
  def __iter__(self): return CStringIO.ReadIter(self)
  class ReadIter:
    def __init__(self, s): #dytype
      self.s = CStringIO(unicode(s, getfilesystemencoding())) if version_info.major == 2 else s
      self.pos = 0
    def __next__(self):
      c = self.s.io.read(1)
      if c == "": self.s.io.close(); raise StopIteration()
      self.pos += 1
      return c
    def skip(self, n):
      self.pos += n
      self.s.io.seek(self.s.io.tell()+n) # can't use SEEK_CUR on non-rb stream, see Issue 12922
    def isEnd(self):
      try:
        oldPos = self.s.pos
        b = not self.s.io.readable() or self.s.io.read(1) == ""
        if not b: self.s.pos = oldPos
        return b
      except ValueError: return True

RE_MACRO = Regex("(#|/{2})(\\S+?)\\(\\s*(.*?)\\)", re.DOTALL)
def _expandMacroTo(sb, cz, get_subst):
  #return RE_MACRO.sub(lambda m: get_subst(m[2], m[3]), s)
  buf = CStringIO(); state = 0
  def appendBuf():
    sBuf = str(buf); buf.clear()
    if sBuf != "": sb.append(sBuf)
  while True:
    try: c = next(cz)
    except StopIteration: break
    if state == 0 and c in "#/)": # state machine
      if c == '#': buf.write('#'); cz.skip(1)
      elif c == '/': buf.write('//'); cz.skip(2)
      elif c == ')': return appendBuf()
      state = 1; continue # just like "call a function"
    elif state == 1:
      try:
        c1 = c; iBuf0 = buf.pos
        while not (c1.isspace() or c1 in "()#/"): buf.write(c1); c1 = next(cz)
        if c1 == ')': return appendBuf()
        if buf.pos == iBuf0: appendBuf(); state = 0
      except StopIteration: break # optimized
      if c1 == '(':
        name = str(buf); buf.clear()
        iBeg = len(sb)
        cz.skip(1); _expandMacroTo(sb, cz, get_subst)
        iEnd = len(sb)
        for idx in range(iBeg, iEnd): buf.write(sb.pop(iBeg))
        called = get_subst(name.lstrip("#/"), str(buf) )
        sb.insert(iBeg, called) # Excel-like step-by-step
        buf.clear()
        if cz.isEnd() or next(cz) != ')':
          eprintSyntaxError(cz.s.initial, cz.pos, "expecting ')'")
          break
        cz.skip(1)
    skip = takeTillFirstOccur(cz.s, "#", "//", ")")
    if skip != "": sb.append(skip)
    if cz.isEnd(): break # at EOF
  return appendBuf() # just for fun, not serious.

def expandMacro(s, get_subst):
  sb = []; _expandMacroTo(sb, iter(CStringIO(s)), get_subst)
  return "".join(sb)


## PART output process / main
RE_CODE = Regex("```\\w*\\n(#|/{2})?(\\s?!?!?\\S+\\n)?(.*?)```", re.DOTALL) #!compat
# original: "```\\w*\\n//\\s([\\w/.]*)\\n(.*?)```"
RE_INVALID = Regex("!|#")
class FillTemplate:
  def __init__(self, scope={}, nPrevi=40):
    self.scope=scope; self.nPrevi=nPrevi
    self.writeMode = getenv("writeMode", "a")
    self.sourceSet = set()

  def _outputInPwd(self, fp_abs, text, prefixes, m):
    def getSrcpos(m): # errloc feat.
      return "%s:%d" %(path.relpath(fp_abs, self.fpBase), text.count('\n', 0, m.start())+2)
    def getDir(): return path.dirname(fp_abs)
    # extracted (continue=return, self.prefixXXX) from outputInPwd
    (sCmt, desc, code) = m.groups()
    if sCmt == None and prefixes[0] == "": return
    isText = (desc == None) # is //-header omitted?
    fpOut = "" if isText else desc.strip()
    if fpOut.startswith("!!"):
      act = fpOut[2:]
      if act == "define": readDefine(self.scope, code, getSrcpos(m))
      elif act == "execute": runCode(code, getSrcpos(m), {"__FILE__": fp_abs, "__DIR__": getDir(), "scope": self.scope})
      elif act == "include":
        fp = path.relpath(path.join(getDir(), code.strip()), self.fpBase)
        self.outputInPwd(fp)
      elif act == "talkabout": prefixes[0] = code.strip(); prefixes[1] = sCmt
      elif act == "ignore": pass
      else: eprint("unknown preprocessor action: %s" %act)
      return
    if fpOut.startswith("!") or RE_INVALID.match(fpOut) != None:
      eprint("unknown command %s, treating as text" %fpOut)
      fpOut = ""; isText = True # notify '!'!
    fpOut1 = prefixes[0]+fpOut
    code1 = expandMacro(code, self.getMacroResult)
    sBrief = "...".join(strBrief(RE_WHITE.sub(" ", code1), self.nPrevi))
    print("%s N=%i %s" %(fpOut1, len(code1), sBrief))
    if fpOut1 == "": return # talk-about is not for outer blocks
    mkdirs(fpOut1)
    with open(fpOut1, self.writeMode) as fd:
      if isText and sCmt != None: fd.write(sCmt) # for "##"
      fd.write(code1)

  def outputInPwd(self, src):
    eprint("Render file %s (%d items in scope):" %(src, len(self.scope)))
    self.sourceSet.add(src)
    sMd = ""
    fpAbs = path.join(self.fpBase, src)
    with open(fpAbs, "r") as fd: sMd = fd.read()
    prefixes = ["", ""] # talk-about feat. & server mode comment
    for m in RE_CODE.finditer(sMd): self._outputInPwd(fpAbs, sMd, prefixes, m)

  MACRO_SUFFIXES = ["", "_PY", "_JS"]
  def getMacroResult(self, fn, s_arg):
    args = RE_COMMA.split(s_arg)
    for suffix in FillTemplate.MACRO_SUFFIXES: # try fallback fn-ver s.
      name = fn+suffix
      op = self.scope.get(name)
      if op != None:
        try: return str(op(*args))
        except BaseException:
          tb = exc_info()[2]
          eprint("Exception in %s %r" %(name, args))
          eprintMdStack(tb)
          eprint(traceback.format_exc())
          return "FAIL"
    return "ERR" # funny terminology

  def processFile(self, src, fp_tpl):
    fpAbs = path.abspath(src)
    (fpBase, name) = path.split(fpAbs)
    self.fpBase = fpBase
    dst = path.splitext(name)[0]
    if fp_tpl != "":
      if not path.isdir(fp_tpl): raise EnvironmentError(fp_tpl+" dir not found here")
      try: copytree(fp_tpl, dst, dirs_exist_ok=True) # template feat.
      except TypeError: copytree(fp_tpl, dst)
    else: # fp_tpl ""
      if not path.isdir(dst): mkdir(dst)
    chdir(dst); self.outputInPwd(name)

# TODO: Add TextEdit .create/modify Range, listenFileChange(dst, srcs, d_ftes)
# TODO: Add auto-macro-match from output

if __name__ == "__main__":
  fpTpl = getenv("template", "")
  filler = FillTemplate()
  for fp in argv[1:]: filler.processFile(fp, fpTpl)

def trimBetween(cps, s): # confusing why added.
  state = 0; sb = [] # but anyone can shrink it...
  for c in s:
    (ce, p) = cps[state]
    if c == ce: state += p
    elif state %2==0: sb.append(c)
  return "".join(sb)

parenCps = { 0: ['(', 1], 1: [')', 0-1] }

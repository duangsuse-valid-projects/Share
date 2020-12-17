#!/usr/bin/env python
from __future__ import print_function, unicode_literals
import re # using Regex as tokenizer
from re import compile as Regex

from sys import exc_info, version_info
import traceback

from io import StringIO # needs unicode, so not cStringIO
from sys import getfilesystemencoding # choose String[Build/Read] stream impl cfg.
FS_ENCODING = getfilesystemencoding()

if version_info.major == 2:
  from codecs import open
  def unicodeify(s): return s if isinstance(s, unicode) else unicode(s, FS_ENCODING)
else:
  def unicodeify(s): return s

from os import mkdir, chdir, path, getenv
from shutil import copytree, rmtree
from sys import argv, stderr

def eprint(*args): print(*args, file=stderr)

ENV_PREFIX = "LPY_"
def envOr(deft, name, transform=unicodeify):
  value = getenv(ENV_PREFIX+name)
  return deft if value == None else transform(value)

commaSet = lambda s: set(s.split(',')) # trace fnames, flags
commaRegex = lambda s: Regex("|".join(map(lambda sP: "(%s)" %sP, s.split(','))))

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
  posBeg = int(lineno)
  return "%s:%d+%d, %s:%d" %(src, posBeg, tb[1], src, posBeg+tb[1])

def eprintMdStack(tb):
  for caller in reversed(traceback.extract_tb(tb)):
    try: eprint(_sumSrcPos(caller))
    except ValueError: break

def runCode(code, srcpos, locals):
  try: eval(compile(code, srcpos, "exec"), None, locals)
  except BaseException:
    (etype, ex, tb) = exc_info()
    eprint("----"); eprint(code)
    callees = traceback.extract_tb(tb, limit=2)
    try:
      callee = (ex.filename, ex.lineno) if len(callees) == 1 and etype == SyntaxError else callees[-1]
      eprint(":: %s (%s)" %(ex, _sumSrcPos(callee)))
    except ValueError: eprint(str(ex)) # PY2 exc_info() errloc

# for i in range(0, 8): print(i,__import__("fill_template").strBrief("helloa", i))
def strBrief(s, n_vp):
  nS = len(s)
  if nS <= n_vp: return (s,)
  (iVp, nRem) = divmod(n_vp, 2) # no overlap idx.
  return (s[:(iVp + nRem)], s[(nS - iVp):])

FLAGS = envOr(set(), "flags", commaSet)

## PART macro util
RE_WHITE = Regex("\\s")
RE_COMMA = Regex(",\\s*") # NOTE: op(a ,b ,c) better readability, instead of: op(a, b, c)
RE_PARENED = Regex("\\((.*?)\\)")
RE_DEFINE = Regex("\\s*(\\S+?)\\((.*?)\\) ?(.*?)\\n")
RE_DEFINE_ARG = Regex("\\s*,\\s*")
RE_DEFINE_LANG = Regex(".*_(.*)")
RE_DEFINE_REF = Regex("\\${\\s*(.*?)\\s*}")

def readDefine(d, s, srcpos):
  def convertDef(m):
    (name, sFormals, sBody) = m.groups()
    if sBody == "": return m.group(0)+"\n" # no match, fill NL only
    formals = sFormals # RE_DEFINE_ARG.split(sFormals)
    def argNo(m): # find ${N} index of ref, or expr (ref).ops
      noRef = "REF"; braceRef = lambda i: "${%d}" %formals.index(i)
      try: return braceRef(m.group(1))
      except ValueError: pass
      expr = m.group(1) #v just convert ${N} to a[N] in exprs
      refEval = lambda m1: RE_DEFINE_REF.sub(lambda m2: "a[%s]" %m2.group(1), argNo(m1))
      expr1 = RE_PARENED.sub(refEval, expr)
      return "${%s}" %expr1 if (expr1 != expr) else noRef
    body = sBody # RE_DEFINE_REF.sub(argNo, sBody)
    return "macro(d, srcpos, %r, %r, %r)\n" %(name, formals, body)
  code = RE_DEFINE.sub(convertDef, s)
  runCode(code, srcpos, {"d": d, "srcpos": srcpos})

def macro(d, srcpos, name, params, body): # executed in eval()
  langM = RE_DEFINE_LANG.match(name)
  ignoreErrors = False
  if langM == None:
    lambCode = "lambda %s: f(%r, {}, {})".format(repr(params), params)
  else:
    lambCode = "lambda %s: %s"
    if langM.group(1) != "PY": ignoreErrors = True
  try:
    code = compile(lambCode %(params, body), srcpos, "eval")
    dGlo = {"scope": d, "Regex": Regex}
    def strInterpolate(s, params, *args):
      table = dict(zip(RE_COMMA.split(params), args))
      evalRef = lambda m: unicodeify(eval(m.group(1), dGlo, table)) # TODO: recursive expansion, arglist, lazy if()?
      return RE_DEFINE_REF.sub(evalRef, s) # ...and macro ',' comma(), spread()
    dGlo["f"] = strInterpolate # recur-ref dGlo
    d[name] = eval(code, dGlo) # defined in lambCode
    if "see-onDefined" in FLAGS: eprint("defined %s of %s" %(name, params))
  except SyntaxError as ex:
    if ignoreErrors: return
    pfix = len(name) - len("lambda") - (2 if langM == None else 0) #f"
    eprint("--"); eprint(ex.text)
    evalCaller = traceback.extract_stack(limit=2)[0]
    eprint(":: %s in %s (%s:%d)" %(ex.msg, name, _sumSrcPos(evalCaller), ex.offset+pfix))

def joinAlsoPrint(*args): print(*args); return "".join(args)

def eprintSyntaxError(s, i, msg):
  slErr = list(s)
  slErr.insert(i, '<')
  eprint("----"); eprint("".join(slErr)); eprint("%s near <:%d (count %d)" %(msg, i, len(s)))

class StringBuild:
  def __init__(self, initial=""): self.io = StringIO(initial)
  if version_info.major == 2:
    def write(self, s): self.io.write(unicodeify(s))
  else:
    def write(self, s): self.io.write(s)
  def str(self): return self.io.getvalue()
  def clear(self): self.io.seek(0, 0); self.io.truncate(0) # 0, SEEK_SET
  @property
  def pos(self): return self.io.tell()
  @pos.setter
  def pos(self, i): self.io.seek(i)

class StringRead:
  def __init__(self, s):
    self.text = s
    self.pos = 0; self._n = len(self.text)
  def __iter__(self): return self
  def __next__(self):
    if self.pos >= self._n: raise StopIteration()
    self.pos += 1
    return self.text[self.pos]
  next = __next__ # PY2
  def str(self): return self.text[self.pos:]
  def get(self): return self.text[self.pos]
  def skip(self, n): self.pos += n
  def isEnd(self): return (self.pos >= self._n)

def takeTillFirstOccur(sr, *texts):
  s = sr.str(); iFound = -1
  for text in texts:
    idx = s.find(text)
    if idx != -1: iFound = idx; break # first found
  if iFound == -1: # EOF.
    sr.pos = len(sr.text); iFound = sr.pos
  else:
    for text in texts: # NOTE perf: first fnd. text not removed
      idx = s.find(text)
      if idx != -1 and  idx < iFound: iFound = idx
    sr.pos += iFound
  return s[0:iFound]

RE_MACRO = Regex("(#|/{2})(\\S+?)\\(\\s*(.*?)\\)", re.DOTALL)
def _expandMacroTo(ab, sr, s0, get_subst):
  #return RE_MACRO.sub(lambda m: get_subst(m[2], m[3]), s)
  buf = StringBuild(); state = s0
  def appendNE(s):
    if s != "": ab.append(s)
  def appendBuf():
    sBuf = buf.str(); buf.clear(); appendNE(sBuf)
  def takeToBuf(s):
    buf.write(s); sr.skip(len(s))
  def gotoNextMacro():
    appendNE(takeTillFirstOccur(sr, "#", "//", ")"))
  gotoNextMacro()
  while not sr.isEnd():
    c = sr.get()
    if state == 0 or state == 2: # event-based state machine
      if c == ')':
        if state == 2: break
        takeToBuf(c); appendBuf()
      else:
        if c == '#': takeToBuf(c)
        elif c == '/': takeToBuf("//") # asserted
        state = 1; continue # just like "call a function"
    elif state == 1:
      try:
        iBuf0 = buf.pos; c1 = c
        while not (c1.isspace() or c1 in "()#/"): buf.write(c1); c1 = next(sr)
        if c1 == ')': break
        if buf.pos == iBuf0: appendBuf(); state = 0 # nomatch, only "//()"
      except StopIteration: break
      if c1 == '(':
        name = buf.str(); buf.clear()
        iBeg = len(ab)
        sr.skip(1); _expandMacroTo(ab, sr, 2, get_subst)
        iEnd = len(ab)
        for idx in range(iBeg, iEnd): buf.write(ab.pop(iBeg))
        called = get_subst(name.lstrip("#/"), buf.str() ); buf.clear()
        ab.insert(iBeg, called) # Excel-like step-by-step
        if sr.isEnd() or sr.get() != ')':
          eprintSyntaxError(sr.text, sr.pos, "expecting ')'")
          return # buf cleared
        sr.skip(1)
    gotoNextMacro()
  appendBuf(); return # adding unparsed tail

def expandMacro(s, get_subst):
  ab = []; _expandMacroTo(ab, StringRead(s), 0, get_subst)
  return "".join(ab)


## PART output process / main
RE_CODE = Regex("```\\w*\\n(#|/{2})?( ?!?!?\\S+\\n)?(.*?)```", re.DOTALL) #!compat
RE_INVALID = Regex("!|#")

class FillTemplate:
  def __init__(self, scope={}):
    self.scope=scope
    self.fpTpl = envOr("", "template") # TODO: support !!include (+init.h.md), !!include-onfinish, Makefile doMake()
    self.nPrevi = envOr(40, "nPrevi", int)
    self.writeMode = envOr("a", "writeMode")
    self.sourceSet = set()

  def _outputInPwd(self, fp_abs, text, lval_prefixes, m):
    def getSrcpos(m): # errloc feat.
      fpMd = path.relpath(fp_abs, self.fpaDir)
      return "%s:%d" %(fpMd, text.count('\n', 0, m.start())+2)
    def getDir(): return path.dirname(fp_abs)
    # extracted (continue=return, self.prefix[Fp/Cmt]=lval_prefixes) from outputInPwd
    (sCmt, sDesc, code) = m.groups()
    if sCmt == None and lval_prefixes[0] == "": return
    # is //-header omitted?
    isText = (sDesc == None)
    desc = "" if isText else sDesc.strip()
    if desc.startswith("!!"):
      act = desc[2:]
      if act == "define": readDefine(self.scope, code, getSrcpos(m))
      elif act.startswith("execute"):
        if act[7:].lstrip("-") == "PY":
          runCode(code, getSrcpos(m), {"__FILE__": fp_abs, "__DIR__": getDir(), "scope": self.scope})
      elif act == "include":
        fpMd = path.relpath(path.join(getDir(), code.strip()), self.fpaDir)
        self.outputInPwd(fpMd)
      elif act == "talkabout":
        prefix = code.strip()
        if "see-onTalkabout" in FLAGS: print("Talking about %s:" %prefix)
        lval_prefixes[0] = prefix; lval_prefixes[1] = sCmt
      elif act == "ignore": pass
      else: eprint("unknown preprocessor action: %s" %act)
      return
    if desc.startswith("!") or RE_INVALID.match(desc) != None: # notify '!'!
      eprint("unknown command %s, treating as text" %desc)
      desc = ""; isText = True
    # eval doc & output maybe
    fpOut = lval_prefixes[0]+desc
    code1 = expandMacro(code, self.getMacroResult)
    if fpOut == "": return # talk-about is not for outer blocks
    sBrief = "...".join(strBrief(RE_WHITE.sub(" ", code1), self.nPrevi))
    if "see-nLines" in FLAGS:
      code1Lns = code1.splitlines(); code1Slocs = list(filter(lambda s: not (s == "" or s.isspace()), code1Lns))
      nCode1Ln = len(code1Lns)
      print("%s N=%d nLine=%d=(%d+%d) %s" %(fpOut, len(code1), nCode1Ln, len(code1Slocs), nCode1Ln-len(code1Slocs), sBrief))
    else:
      print("%s N=%d %s" %(fpOut, len(code1), sBrief))
    mkdirs(fpOut)
    with open(fpOut, self.writeMode, encoding=FS_ENCODING) as fd:
      if isText and sCmt != None: fd.write(sCmt) # for "##"
      fd.write(code1)

  def outputInPwd(self, src):
    if "see-onRender" in FLAGS: eprint("Render file %s (%d items in scope):" %(src, len(self.scope)))
    self.sourceSet.add(src)
    fpAbs = path.join(self.fpaDir, src); sMd = ""
    with open(fpAbs, "r", encoding=FS_ENCODING) as fd: sMd = fd.read()
    prefixes = ["", ""] # talk-about feat. & server mode comment
    for m in RE_CODE.finditer(sMd): self._outputInPwd(fpAbs, sMd, prefixes, m) # could be reuse when re-impl. in JS

  MACRO_SUFFIXES = ["", "_PY", "_JS"]
  TRACE_EXPANSION = envOr(None, "traceExpansion", commaRegex)
  def getMacroResult(self, fn, s_arg):
    args = RE_COMMA.split(s_arg); expandRes = None
    for suffix in FillTemplate.MACRO_SUFFIXES: # try fallback fn-ver s.
      name = fn+suffix
      cfgTe = FillTemplate.TRACE_EXPANSION
      hasTrace = (cfgTe != None and cfgTe.match(name) != None)
      if hasTrace: eprint("%s(%r)" %(name, s_arg))
      op = self.scope.get(name)
      if op != None:
        try: expandRes = unicodeify(op(*args)); break
        except BaseException:
          tb = exc_info()[2]
          eprint("Exception in %s %r" %(name, args))
          eprintMdStack(tb)
          eprint(traceback.format_exc())
          expandRes = "FAIL"; break
    if expandRes == None: expandRes = "ERR" # funny terminology
    if hasTrace: eprint("  = %r" %expandRes)
    return expandRes

  def processFile(self, src):
    fpTpl = self.fpTpl
    (fpaDir, fpSrc) = path.split(path.abspath(src))
    self.fpaDir = fpaDir
    fpDst = path.splitext(fpSrc)[0]
    if "clean" in FLAGS: rmtree(fpDst, ignore_errors=True)
    if fpTpl != "":
      if not path.isdir(fpTpl): raise EnvironmentError(fpTpl+" dir not found here")
      try: copytree(fpTpl, fpDst, dirs_exist_ok=True) # template feat.
      except TypeError: copytree(fpTpl, fpDst)
    else: # fpTpl ""
      if not path.isdir(fpDst): mkdir(fpDst)
    chdir(fpDst); self.outputInPwd(fpSrc)

# TODO: Add TextEdit .create/modify Range, listenFileChange(dst, srcs, d_ftes)
# TODO: Add auto-macro-match from output
# TODO: improve flag set

if __name__ == "__main__":
  filler = FillTemplate()
  for fp in argv[1:]: filler.processFile(fp)

def trimBetween(cps, s): # confusing why added.
  state = 0; sb = [] # but anyone can shrink it...
  for c in s:
    (ce, p) = cps[state]
    if c == ce: state += p
    elif state %2==0: sb.append(c)
  return "".join(sb)

parenCps = { 0: ['(', 1], 1: [')', 0-1] }

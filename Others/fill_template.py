#!/usr/bin/env python
from __future__ import print_function, unicode_literals
import re # using Regex as tokenizer

from sys import exc_info, version_info
import traceback

from io import StringIO # needs unicode, so not cStringIO. perf
from sys import getfilesystemencoding
FS_ENCODING = getfilesystemencoding()

if version_info.major == 2:
  from codecs import open
  def unicodeify(s): return s if isinstance(s, unicode) else unicode(s, FS_ENCODING)
else:
  def unicodeify(s): return s
unicodeType = type("")

from os import mkdir, chdir, path, getenv
from shutil import copytree, rmtree
from sys import argv, stderr


## PART basic environment
def eprint(*args): print(*args, file=stderr)
def eprintOnce(*args): print(*args, file=stderr, end="")

def printOnce(*args): print(*args, end="")

ENV_PREFIX = "LPY_"
def envOr(deft, name, transform=unicodeify):
  value = getenv(ENV_PREFIX+name)
  return deft if value == None else transform(value)

def _sumSrcPos(tbf): # get/sum eval() fail source position depends on its .file "XXX.md:code_start"
  (src, lineno) = tbf[0].rsplit(':')
  pos0 = int(lineno); pos = tbf[1] # line pos
  return "%s:%d+%d, %s:%d" %(src, pos0, pos, src, pos0+pos)

def _getSrcPos(exc_info): # -> tbf
  (etype, ex, tb) = exc_info
  callees = traceback.extract_tb(tb, limit=2)
  return (ex.filename, ex.lineno) if len(callees) == 1 and etype == SyntaxError else callees[-1] # compat

def eprintMdStack(tb):
  for caller in reversed(traceback.extract_tb(tb)):
    try: eprint(_sumSrcPos(caller))
    except ValueError: break

def runMdCode(code, srcpos, locals):
  try: eval(compile(code, srcpos, "exec"), None, locals)
  except BaseException as ex:
    eprint("----"); eprint(code)
    try:
      eprint(":: %s (%s)" %(ex, _sumSrcPos(_getSrcPos(exc_info()))))
    except ValueError: eprint(str(ex)) # PY2 exc_info() errloc


## PART common abstractions
class Regex:
  class Match:
    def __init__(self, m): self._m = m
    def groups(self): return self._m.groups()
    def group(self, nth): return self._m.group(nth)
    @property
    def span(self): return range(*self._m.span())
    @property
    def pos0(self): return self._m.start()
    @property
    def pos1(self): return self._m.end()
    def __str__(self): return "%s (at %d..%d)" %(self.group(0), self.pos0, self.pos1 -1)
    __repr__ = __str__
  @staticmethod
  def _match(m): return Regex.Match(m) if m != None else None

  def __init__(self, code, flags=""): # parse flags
    self.flags = flags
    if flags == "": self._re = re.compile(code)
    else:
      iflags = 0
      for c in flags:
        try: iflags = iflags + getattr(re, c.upper())
        except AttributeError: raise ValueError("unknown flag %s" %c)
      self._re = re.compile(code, iflags)
  def test(self, s): return self._re.match(s) != None
  def match(self, s): return Regex._match(self._re.match(s))

  def iterateMatch(self, s): return map(Regex._match, self._re.finditer(s))
  def replaceIn(self, s, subst): return self._re.sub(subst, s)
  def bireplaceIn(self, s, subst, subst_unmatch):
    sb = []; i0 = 0
    def append(x): # appendNotNone
      if x != None: sb.append(x)
    for m in self.iterateMatch(s):
      append(subst_unmatch(s[i0:m.pos0])); i0 = m.pos1
      append(subst(m))
    append(subst_unmatch(s[i0:]))
    return "".join(sb)

  def split(self, s): return self._re.split(s)
  def toFullmatch(self): return Regex("^%s$" %self.source, self.flags)
  @property
  def source(self): return self._re.pattern
  def __str__(self): return "/%s/%s" %(self.source, self.flags)
  __repr__ = __str__

RE_SLASHS = Regex(r"/(.+?)/")
class FlagSet:
  def __init__(self):
    self.availableFlags = []; self.flags = set()
    self._attrNames = []
  def __setattr__(self, name, value):
    if isinstance(value, str):
      self.availableFlags.append(value)
      self._attrNames.append(name)
    return self._setattr(name, value)
  if  version_info.major == 2:
    def _setattr(self, name, value): self.__dict__[name] = value
  else:
    def _setattr(self, name, value): super().__setattr__(name, value)

  def refresh(self):
    for (i, name) in enumerate(self._attrNames): setattr(self, name, self.availableFlags[i] in self.flags)
  def init(self, s_cfg):
    slash = RE_SLASHS.match(s_cfg)
    if slash == None:
      for name in commaSplit(s_cfg): self.flags.add(name)
    else:
      re = commaRegex(slash.group(1))
      for flag in self.availableFlags:
        if re.match(flag) != None: self.flags.add(flag)
    self.refresh()

class GroupingH:
  def __init__(self): self.d = {}
  def add(self, k, v):
    vs = self.d.get(k)
    if vs != None: vs.append(v)
    else: self.d[k] = [v]
  def items(): return self.d.items()

class FileWatcher: # not portable. Linux 2.6 DNotify / Win32 file
  def watch(self, fp, op, mode="m"): # modes: am cd [r]ename
    if not path.isdir(fp): #v coerce to file listen
      return self._watch(path.dirname(fp), lambda fp1: op(fp1) if fp1 == fp else None, mode)
    else: return self._watch(fp, op, mode) #^ WARN: use shorthand above can cause watch event loss
  try:
    global os, fcntl, signal, sleep
    import os
    import fcntl, signal
    from time import sleep
    _modes = {"a": "ACCESS", "m": "MODIFY", "c": "CREATE"} # no DELETE, RENAME, ATTRIB
    for (k, v) in _modes.items(): _modes[k] = getattr(fcntl, "DN_%s" %v)
    def __init__(self):
      self._dfp_ops = GroupingH(); self._mtimes = {}
      signal.signal(signal.SIGIO, self._rescan)
    def _watch(self, dfp, op, mode):
      fd = os.open(dfp,  os.O_RDONLY)
      fcntl.fcntl(fd, fcntl.F_SETSIG, 0)
      imode = fcntl.DN_MULTISHOT
      for c in mode: imode = imode | FileWatcher._modes[c]
      fcntl.fcntl(fd, fcntl.F_NOTIFY, imode); self._dfp_ops.add(dfp, op)
    def _rescan(self, signum, frame): # DN_ has no capacity of getting path (no more than fd)
      mts = self._mtimes
      for (dfp, ops) in self._dfp_ops.items():
        for fp in os.listdir(dfp):
          fpa = path.join(dfp, fp)
          fs = os.stat(fpa)
          fid = fs.st_ino; mt = fs.st_mtime
          mt0 = mts.get(fid)
          if mt0 == None or mt != mt0: mts[fid] = mt
          for op in ops: op(fpa) # required to notice each at once (on dir entry).
    def mainloop(self):
      while True: sleep(10000)
  except ImportError:
    global win32file, win32con
    import win32file, win32con
    def __init__(self): self._hDir_ops = GroupingH()
    def _watch(self, dfp, op, mode): # NOTE: no impl for mode c/d/(m), and renamed from/to
      flagFs = win32con.FILE_SHARE_READ | win32con.FILE_SHARE_WRITE
      flagB = win32con.FILE_FLAG_BACKUP_SEMANTICS #v 0x1=FILE_LIST_DIRECTORY
      hDir = win32file.CreateFile(fp, 0x0001, flagFs, None, win32con.OPEN_EXISTING, flagB, None)
      self._hDir_ops.add(hDir, op)
    def _rescan(self):
      imode = win32con.FILE_NOTIFY_CHANGE_LAST_WRITE
      for (hDir, ops) in self._hDir_ops.items():
        results = win32file.ReadDirectoryChangesW(hDir, 1024, False, imode, None, None)
        for actnum, fp in results:
          if actnum == 3: #"Updated"
            for op in ops: op(fp)
    def mainloop(self):
      while True: self._rescan()


class StringBuilder: # with pos
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

class StringReader:
  def __init__(self, s):
    self.text = s
    self.pos = 0; self._n = len(self.text)
  def __iter__(self): return self
  def __next__(self):
    if self.pos >= self._n: raise StopIteration()
    self.pos += 1
    return self.text[self.pos]
  next = __next__ # PY2
  def skip(self, n): self.pos += n
  def str(self): return self.text[self.pos:]
  def get(self): return self.text[self.pos]
  def isEnd(self): return (self.pos >= self._n)

def takeTillFirstOccur(sr, texts):
  s = sr.str(); iFound = -1
  for text in texts:
    idx = s.find(text)
    if idx != -1: iFound = idx; break # get first found.
  if iFound == -1: # EOF.
    sr.pos = len(sr.text); iFound = sr.pos
  else:
    for text in texts: # NOTE perf: first fnd. text not removed
      idx = s.find(text)
      if idx != -1 and  idx < iFound: iFound = idx
    sr.pos += iFound
  return s[0:iFound]

def eprintSyntaxError(sr, msg):
  s = sr.text; i = sr.pos
  slErr = list(s)
  slErr.insert(i+1, '<')
  eprint("----"); eprint("".join(slErr))
  eprint("%s near <:%d (count %d)" %(msg, i, len(s)))

# for i in range(0, 8): print(i,__import__("fill_template").strBrief("helloa", i))
def strBrief(s, n_vp):
  nS = len(s)
  if nS <= n_vp: return (s,)
  (iVp, nRem) = divmod(n_vp, 2) # no overlap idx.
  return (s[:(iVp + nRem)], s[(nS - iVp):])

def _commaSplit(text): # NOTE: op(a ,b ,c) better readability, instead of: op(a, b, c)
  parts = []; sb = StringBuilder() # perf!
  i = 0; n = len(text)
  while i != n:
    c = text[i]
    if c == ',':
      parts.append(sb.str()); sb.clear()
      i += 1
      while i != n and text[i].isspace(): i += 1 #< skip white
      continue #v merge "\\," due to Regex compat limitation
    elif c == '\\' and i+1 != n and text[i+1] == ',': sb.write(','); i += 2; continue
    else: sb.write(c)
    i += 1
  parts.append(sb.str())
  return parts

global commaSplit
try:
  reComma = Regex(r"(?<!\\),\s*")
  reEComma = Regex(r"\\,") # escaper
  def commaSplit(s): return [reEComma.replaceIn(s1, ",") for s1 in reComma.split(s)]
except Exception:
  commaSplit = _commaSplit

def commaRegex(s):
  cases = map(lambda sP: "(%s)" %sP, commaSplit(s))
  return Regex("|".join(cases)).toFullmatch() # NOTE: config-default.

def _appFlagSet():
  f = FlagSet()
  f.watch = "watch"
  f.matchback = "matchback"
  f.seeOnRender = "see-onRender"
  f.seeOnDefine = "see-onDefine"
  f.seeOnTalkabout = "see-onTalkabout"
  f.seeNLines = "see-nLines"
  f.seePaths = "see-paths"
  f.seeScope = "see-scope"
  f.finishRepl = "finish-repl"
  f.clean = "clean"
  return f
flag = _appFlagSet()
envOr(None, "flags", flag.init)


## PART macro util
RE_WHITE = Regex(r"\s")
RE_PARENED = Regex(r"\((.*?)\)")
RE_DEFINE = Regex(r"[^\n\S]*(\S+?)\((.*?)\) (.*?)\n")
RE_DEFINE_ARG = Regex(r"\s*,\s*")
RE_DEFINE_REF = Regex(r"\${(.*?)}")
RE_DEFINE_LANG = Regex(r".*_(.*)")

RE_ARG_CODE = Regex(r"args\[(\d+)\]")
RE_ARG_NOREF = Regex(r"noRef\((.+?)\)") # for traceback
RE_ARG_CALL = Regex(r"scope\[\"(.+?)\"\]\(\S+?\)") # inv feat

_reCodeAny = r"((\(\.\*\))|(\.\*))"
RE_MATCHBACK_INVALID = Regex(r"(^%s.*)|(.*%s$)" %(_reCodeAny, _reCodeAny))

sNOREF = "NOREF" # script constants
sFAIL = "FAIL"
sERR = "ERR"
kReMacros = "macro-regexs"
fkInvRegex = "sregex_%s"
fkInv = "inv_%s"
fsCall = "#%s(%s)"
def getFuncName(op): return op.__name__

def _convertDef(d, m):
  (name, sFormals, sBody) = m.groups()
  if sBody == "": return m.group(0)+"\n" # no match, plus NL only
  formals = RE_DEFINE_ARG.split(sFormals)
  def evalArg(found):
    def arg(m): return _convertArgNo(d, name, formals, found, m)
    return RE_DEFINE_REF.bireplaceIn(sBody, arg, re.escape) if found != None else RE_DEFINE_REF.replaceIn(sBody, arg)
  body = evalArg(None)
  if flag.matchback:
    iArgs = []; sRe = evalArg(iArgs)
    entry = (Regex(sRe), iArgs, len(formals), name)
    d[kReMacros].append(entry)
  iBody = m.group(0).index(')')+1 + 1 #len(" ")
  return "macro(d, srcpos, %r, %r, %r, %r)\n" %(iBody, name, formals, body)

def executeDefine(d, s, srcpos):
  code = RE_DEFINE.replaceIn(s, lambda m: _convertDef(d, m))
  runMdCode(code, srcpos, {"d": d, "srcpos": srcpos})

class NoSuchRefError(Exception):
  def __init__(self, name): super().__init__(name)
  def __str__(self): return "no such ref. %r" %self.args[0]
def _errorNoRef(name): raise NoSuchRefError(name)

class NonlocalReturn(Exception):
  INST = None
NonlocalReturn.INST = NonlocalReturn("nonlocal return")

macroGlobals = {"Regex": Regex, "noRef": _errorNoRef}

def macro(d, srcpos, m_start, name, params, body): # executed in eval()
  def _onSyntaxError(ex, srcpos, m): # m_start, params, name
    eprint("--"); eprint(ex.text)
    pfix = m_start + (m.pos0+2) #len("${")
    sfix = RE_ARG_CODE.replaceIn(ex.text[:ex.offset +1], lambda m1: params[int(m1.group(1))])
    sfix = RE_ARG_NOREF.replaceIn(sfix, lambda m1: eval(m1.group(1)))
    eprint(sfix)
    eprint(":: %s in %s (%s:%d)" %(ex.msg, name, srcpos, pfix+len(sfix) + 1))

  if flag.seeOnDefine: eprintOnce("define %s of %s" %(name, params))
  langM = RE_DEFINE_LANG.match(name)
  ignoreErrors = False
  if langM != None and langM.group(1) != "PY": ignoreErrors = True; eprintOnce(" (try %s)" %langM.group(1))
  compiled = [] #parts str|int|code
  invOperators = []
  def appendNE(s):
    if s != "": compiled.append(s)
  def appendCode(m):
    part = m.group(1)
    try: compiled.append(int(part)) # ${1}
    except ValueError:
      try:
        compiled.append(compile(part, srcpos, "eval")) # ${(args[1])+'x'}
        if flag.matchback:
          inv = _findCallVar(d, part, fkInv) # query call inv_ support
          if inv != None: invOperators.append((len(compiled)-1 - 1, inv) ) # NOTE: lastIndex-1, affected by bireplaceIn order.
      except SyntaxError as ex:
        if flag.seeOnDefine: eprint(" ..fail")
        if not ignoreErrors:
          _onSyntaxError(ex, _sumSrcPos(_getSrcPos(exc_info())), m)
        raise NonlocalReturn.INST
  try: RE_DEFINE_REF.bireplaceIn(body, appendCode, appendNE) # s, c,s, c,s, ...
  except NonlocalReturn: return

  if len(invOperators) != 0: # define auto-generated inverse op
    if flag.seeOnDefine: eprint(" (with inv %r)" %invOperators)
    iargs = next(iter(filter(lambda t: t[3] == name, d[kReMacros])))[1] # !=None asserted
    def invOp(args):
      for (i, inv) in invOperators: args[i] = inv(args[i])
      return args
    d[fkInv %name] = invOp # used in FillTemplate.matchback(s)
  if flag.seeOnDefine: eprint(" ..done = %s" %compiled)
  dGlobal = macroGlobals.copy(); dGlobal["scope"] = d
  dLocal = {} #<^ per-interpreter, per-call
  def strInterpolate(*args): # macro evaluator
    dLocal["args"] = args; res = []
    for c in compiled:
      if isinstance(c, unicodeType): res.append(c)
      elif isinstance(c, int): res.append(args[c])
      else:
        try: res.append(unicodeify(eval(c, dGlobal, dLocal)))
        except NameError as ex:
          tb = exc_info()[2]; eprintMdStack(tb)
          eprint("%s, try surround it in ()" %ex)
          res.append(sNOREF) # once.
    return "".join(res)
  d[name] = strInterpolate

def _findCallVar(d, expr, fk): # NOTE: can't read assigned val in define!!, use execute!! before defs.
  m = RE_ARG_CALL.match(expr)
  if m != None:
    return d.get(fk %m.group(1))
  return None

RE_MACRO = Regex(r"(#|/{2})(\S+?)\((.*?)\)", "s") # NOTE: first whites not skipped
def _expandMacroTo(ab, sr, s0, resolve, get_subst):
  #return RE_MACRO.replaceIn(s, lambda m: get_subst(resolve(m.group(2)), m.group(3)))
  buf = StringBuilder(); state = s0
  def appendNE(s):
    if s != "": ab.append(s)
  def appendBuf():
    sBuf = buf.str(); buf.clear(); appendNE(sBuf)
  def takeToBuf(s):
    buf.write(s); sr.skip(len(s))
  keywds = ["#", "//"]
  if s0 == 2: keywds.append(")") # in Call
  def gotoNextMacroKw():
    appendNE(takeTillFirstOccur(sr,  keywds))
  gotoNextMacroKw()
  while not sr.isEnd():
    c = sr.get()
    if state == 0 or state == 2: # event-based state machine
      if c == ')':
        if state == 2: break
        ab.append(c); sr.skip(1) # impossible !in Call
      else:
        if c == '#': takeToBuf(c)
        elif c == '/': takeToBuf("//") # asserted
        state = 1; continue # just like "call a function"
    elif state == 1:
      try:
        iBuf0 = buf.pos; c1 = c
        while not (c1.isspace() or c1 in "()#/"): buf.write(c1); c1 = next(sr)
        if c1 == ')': break # "//a)"
      except StopIteration: break
      if c1 == '(' and buf.pos != iBuf0:
        name = buf.str().lstrip("#/"); buf.clear()
        resolved = resolve(name)
        iBeg = len(ab) #v lazy expansion
        isLazy = getFuncName(resolved[1]) == "callByExpr" if resolved != None else False
        sr.skip(1); _expandMacroTo(ab, sr, 2, resolve, _substLazy if isLazy else get_subst)
        iEnd = len(ab) #^ whitespace skipped later in commaSplit()
        for idx in range(iBeg, iEnd): buf.write(ab.pop(iBeg))
        called = get_subst(resolved, buf.str() ) if resolved != None else sERR; buf.clear()
        ab.insert(iBeg, called) # Excel-like step-by-step
        if sr.isEnd() or sr.get() != ')': # p2:impossible
          eprintSyntaxError(sr, "expecting ')'")
          return # buf cleared
        sr.skip(1)
      else: appendBuf() # nomatch, only "//()"
      state = s0
    gotoNextMacroKw()
  appendBuf(); return # adding unparsed tail

def _substLazy(resolved, arg): return fsCall %(resolved[0], arg)

def expandMacro(s, resolve, get_subst):
  ab = []; _expandMacroTo(ab, StringReader(s), 0, resolve, get_subst)
  return "".join(ab)

def _convertArgNo(d, macro_name, formals, found, m): # resolve ${N} index of ref, or expr (ref).ops
  isRegex = (found != None)
  fmts = ("(.*)", ".*") if isRegex else ("${%s}", sNOREF)
  brace = fmts[0]
  def braceRef(name):
    idx = formals.index(name)
    if isRegex: found.append(idx); return brace
    else: return brace %str(idx)
  try: return braceRef(m.group(1).strip())
  except ValueError: pass
  expr = m.group(1) #v just convert ${(N)} to args[N] in exprs
  ref_hasFound = [False]
  def refEval(m1):
    name = m1.group(1)
    try:
      sRef = braceRef(name)
      if isRegex and ref_hasFound[0]:
        eprint("W: argNo(%s): multiple ref %r in code can't be matched" %(macro_name, name))
        found.pop()
      ref_hasFound[0] = True
      return RE_DEFINE_REF.replaceIn(sRef, lambda m2: "(args[%s])" %m2.group(1)) #< replaces only fnd. braceRef
    except ValueError:
      return "(noRef(%r))" %name
  if isRegex: # custom regex for call
    sre = _findCallVar(d, expr, fkInvRegex)
    if sre != None: brace = sre
  expr1 = RE_PARENED.replaceIn(expr, refEval)
  return (brace if isRegex else brace %expr1) if ref_hasFound[0] or not isIdentifier(expr) else fmts[1]

def isIdentifier(s):
  return RE_WHITE.match(expr) == None


## PART output process / main
RE_MD_CODE = Regex(r"```\w*\n(#|/{2})?( ?!?!?\S+\n)?(.*?)```", "s")
RE_CMD_INVALID = Regex(r"!|#")

sComma = ", "
def commaJoin(texts):
  return sComma.join([text.replace(",", "\\,") for text in texts])

class FillTemplate:
  def __init__(self, scope={}):
    self.scope = scope
    self.nPrevi = envOr(40, "nPrevi", int)
    self.writeMode = envOr("a", "writeMode")
    self.fpaDir = ""
    self.sourceSet = set()
    self._dstDirs = set()
    self.scope["expr"] = FillTemplate.callByExpr # lazy expansion (actually call-by-name, aka. by-expr, replaces by-value)
    self.scope["eval"] = lambda s: expandMacro(s, self.resolveMacro, self.evalMacro)
    if flag.matchback:
      self.scope[kReMacros] = []
    self.fpTpl = envOr("", "template") # TODO: support !!include (+init.h.md), !!include-onfinish, Makefile doMake()

  @staticmethod
  def callByExpr(se): return se # btw. lazy evaluation of macro arg is not effecient, since only str arg is supported.

  def _outputInPwd(self, fpa, text, lval_prefixes, m):
    def getSrcpos(m): # errloc feat.
      fpMd = path.relpath(fpa, self.fpaDir)
      return "%s:%d" %(fpMd, text.count('\n', 0, m.pos0)+2) #"```\n".count('\n') +1
    def getDir(): return path.dirname(fpa)
    # extracted from outputInPwd (continue=return, self.prefix[Fp/Cmt]=lval_prefixes)
    (sCmt, sDesc, code) = m.groups()
    if sCmt == None and lval_prefixes[0] == "": return
    # is //-header omitted?
    isText = (sDesc == None)
    desc = "" if isText else sDesc.strip()
    if desc.startswith("!!"):
      act = desc[2:]
      if act == "define": executeDefine(self.scope, code, getSrcpos(m))
      elif act.startswith("execute"):
        langM = act[7:]
        if langM == "-PY" or langM == "":
          runMdCode(code, getSrcpos(m), {"__FILE__": fpa, "__DIR__": getDir(), "scope": self.scope})
      elif act == "include":
        fpMd = path.relpath(path.join(getDir(), code.strip()), self.fpaDir)
        self.outputInPwd(fpMd)
      elif act == "talkabout":
        prefix = code.strip()
        if flag.seeOnTalkabout: eprint("Talking about %s:" %prefix)
        lval_prefixes[0] = prefix; lval_prefixes[1] = sCmt
      elif act == "ignore": pass
      # there's no "pragma" action or pragma-once, reinclude protect should use "allowReinclude"
      # but it's not effecient for preprocessors (have to parse file header), so I decided to use special filename form.
      else: eprint("unknown preprocessor action: %s" %act)
      return
    if desc.startswith("!") or RE_CMD_INVALID.test(desc): # notify '!'!
      eprint("unknown command %s, treating as text" %desc)
      desc = ""; isText = True
    # eval doc & output (has cmd/talkabout)
    fpOut = lval_prefixes[0] + desc
    code1 = self.scope["eval"](code)
    if fpOut == "": return # unk cmd & no talkabout.
    printOnce(fpOut); printOnce(" "); print(self.showSummary(code1))
    self.mkdirs(fpOut)
    with open(fpOut, self.writeMode, encoding=FS_ENCODING) as fd:
      if isText and sCmt != None: fd.write(sCmt) # for "##"
      fd.write(code1)

  def outputInPwd(self, src):
    if (src in self.sourceSet) and not ".relude." in src: eprint("Render file %s: pass" %src); return
    if flag.seeOnRender: eprint("Render file %s (%d items in scope):" %(src, len(self.scope)))
    self.sourceSet.add(src)
    fpaMd = path.join(self.fpaDir, src); sMd = ""
    with open(fpaMd, "r", encoding=FS_ENCODING) as fd: sMd = fd.read()
    prefixes = ["", ""] # talk-about feat & server mode comment
    for m in RE_MD_CODE.iterateMatch(sMd):
      self._outputInPwd(fpaMd, sMd, prefixes, m) # could be reuse when re-impl in JS
    if flag.seeOnRender: eprint("Finished rendering %s" %src)

  def showSummary(self, text):
    sBrief = "...".join(strBrief(RE_WHITE.replaceIn(text, " "), self.nPrevi))
    if flag.seeNLines:
      lns = text.splitlines(); slocs = list(filter(lambda s: not (s == "" or s.isspace()), lns))
      nLn = len(lns); nSloc = len(slocs)
      return "N=%d nLine=%d=(%d+%d) %s" %(len(text), nLn, nSloc, nLn-nSloc, sBrief)
    else:
      return "N=%d %s" %(len(text), sBrief)

  MACRO_SUFFIXES = ["", "_PY", "_JS"]
  TRACE_EXPANSION = envOr(None, "traceExpansion", commaRegex)
  def resolveMacro(self, fn):
    for suffix in FillTemplate.MACRO_SUFFIXES: # try fallback fn-ver s.
      name = fn + suffix
      op = self.scope.get(name)
      if op != None: return (name, op)
    return None

  def evalMacro(self, resolved, s_arg): # apply macro to strs, -> str
    expandRes = None
    (name, op) = resolved
    args = commaSplit(s_arg)
    cfgTe = FillTemplate.TRACE_EXPANSION # trace
    hasTrace = (cfgTe != None and cfgTe.match(name) != None)
    if hasTrace: eprint("%s(%s)" %(name, sComma.join(map(repr, args))) )
    try: expandRes = unicodeify(op(*args))
    except BaseException:
      expandRes = sFAIL # funny terminology
      tb = exc_info()[2]
      eprint("Exception in %s %r" %(name, args))
      eprintMdStack(tb)
      eprint(traceback.format_exc())
    if hasTrace: eprint("  = %r" %expandRes)
    return expandRes

  def processFile(self, src):
    (fpaDir, fpMd) = path.split(path.abspath(src))
    self.fpaDir = fpaDir
    fpDst = path.splitext(fpMd)[0]
    if flag.clean: rmtree(fpDst, ignore_errors=True)
    fpTpl = self.fpTpl
    if fpTpl != "":
      if not path.isdir(fpTpl): raise EnvironmentError(fpTpl+" dir not found here")
      try: copytree(fpTpl, fpDst, dirs_exist_ok=True) # template feat.
      except TypeError: copytree(fpTpl, fpDst)
    else: # fpTpl ""
      if not path.isdir(fpDst): mkdir(fpDst)
    self._dstDirs.add(fpDst)
    chdir(fpDst); self.outputInPwd(fpMd)

  def onFinish(self):
    print("Running finish hook:")
    if flag.matchback: # valid filter
      reMacros = self.scope[kReMacros]
      reMacros1 = []
      invalids = set()
      for tup in reMacros:
        (re, iargs, argc, name) = tup
        print("%s = %s(%s) %d" %(re, name, iargs, argc))
        if RE_MATCHBACK_INVALID.test(re.source): invalids.add(name)
        else: reMacros1.append(tup)
      print("invalid: %s" %sComma.join(invalids))
      self.scope[kReMacros] = reMacros1
    if flag.seePaths:
      print("src: %s" %commaJoin(self.sourceSet))
      print("dst: %s" %commaJoin(self._dstDirs))
    if flag.seeScope:
      eprint(self.scope)
    if flag.finishRepl:
      while True:
        try: print(eval(input(">")))
        except EOFError: break
        except KeyboardInterrupt: break
        except BaseException: traceback.print_exc()

  def matchback(self, text):
    def genArgs(m):
      args = ["" for i in range(argc)]
      for (i, no) in enumerate(iargs): args[no] = m.group(1+i)
      opInv = self.scope.get(fkInv %name)
      if opInv != None: return opInv(args) # for (generated) inverse operators
      return args
    sAcc = text
    for (re, iargs, argc, name) in self.scope[kReMacros]:
      sAcc = re.replaceIn(sAcc, lambda m: fsCall %(name, commaJoin(genArgs(m)))  )
    return sAcc

  def _mkdirs(self, dfp):
    dfp0 = path.dirname(dfp) # created for compat.
    if dfp0 != "": _mkdirs(dfp0)
    try: mkdir(dfp); self._dstDirs.add(dfp)
    except FileExistsError as ex:
      if not path.isdir(dfp): raise ex

  def mkdirs(self, fp):
    dfp = path.dirname(fp)
    if dfp != "": self._mkdirs(dfp) # require dir fp

# TODO: Add TextEdit .create/modify Range, listenFileChange(dst, srcs, d_ftes)
# TODO: Add auto-macro-match from output
# TODO: make "%r" repr() and String.format unified

if __name__ == "__main__":
  filler = FillTemplate()
  for fp in argv[1:]: filler.processFile(fp)
  filler.onFinish()

def trimBetween(cps, s): # confusing why added.
  state = 0; sb = [] # but anyone can shrink it...
  for c in s:
    (ce, p) = cps[state]
    if c == ce: state += p
    elif state %2==0: sb.append(c)
  return "".join(sb)

parenCps = { 0: ['(', 1], 1: [')', 0-1] }
def joinAlsoPrint(*args): print(*args); return "".join(args) # test. get_subst

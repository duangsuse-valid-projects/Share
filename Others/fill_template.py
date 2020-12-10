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

RE_DEFINE = Regex("\\s*(\\S+?)\\((.*?)\\) ?(.*?)\\n") # NOTE: Fuzzy naming rules.
RE_BRACE = Regex("\\${(.*?)}")
def readDefine(d, s, srcpos):
  def convertDef(m):
    (name, formals, body) = m.groups()
    body1 = RE_BRACE.sub("{\\1}", body)
    return "macro(d, %r, %r, %r, srcpos)\n" %(name, formals, body1)
  code = RE_DEFINE.sub(convertDef, s)
  runCode(code, srcpos, {"d": d, "srcpos": srcpos})
def macro(d, name, params, body, srcpos):
  notPY2 = not name.endswith("_PY2")
  lambCode = "lambda %s: f\"%s\"" if notPY2 else "lambda %s: %s"
  try:
    code = compile(lambCode %(params, body), srcpos, "eval")
    d[name] = eval(code, {"scope": d}, None)
    eprint("defined %s of %s" %(name, params))
  except SyntaxError as ex:
    pfix = len(name) - len("lambda") - (2 if notPY2 else 0) #f"
    eprint("--"); eprint(ex.text)
    evalCaller = traceback.extract_stack(limit=2)[0]
    eprint(":: %s in %s (%s:%d)" %(ex.msg, name, _sumSrcPos(evalCaller), ex.offset+pfix))

# original: "```\\w*\\n//\\s([\\w/.]*)\\n(.*?)```"
RE_WHITE = Regex("\\s")
RE_COMMA = Regex(",\\s*")
RE_CODE = Regex("```\\w*\\n(#|/{2})(\\s?!?!?\\S+\\n)?(.*?)```", re.DOTALL) #!compat
RE_MACRO = Regex("(#|/{2})(\\S+?)\\(\\s*(.*?)\\)", re.DOTALL)
MACRO_SUFFIXES = ["", "_PY2", "_JS"]
def outputInPwd(src, fp_base, scope={}, n_previ=40):
  srcmd = ""
  with open(src, "r") as fd: srcmd = fd.read()
  prefixFp = "" # talk-about feat.
  def getSrcpos(m): # errloc feat.
    return "%s:%d" %(path.relpath(src, fp_base), srcmd.count('\n', 0, m.start())+2)
  def getDir(): return path.dirname(src)
  def getMacroResult(m):
    fn = m.group(2)
    for suffix in MACRO_SUFFIXES:
      name = m.group(2)+suffix
      op = scope.get(name); args = RE_COMMA.split(m.group(3))
      if op != None:
        try: return str(op(*args))
        except BaseException:
          tb = exc_info()[2]
          eprint("Exception in %s %r" %(name, args))
          eprintMdStack(tb)
          eprint(traceback.format_exc())
    return "ERR"
  for m in RE_CODE.finditer(srcmd):
    (sCmt, desc, code) = m.groups()
    fpOut = "" if desc == None else desc.strip()
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
    fpOut1 = prefixFp+fpOut
    if fpOut1 == "": continue # talk-about is not for outer blocks
    code1 = RE_MACRO.sub(getMacroResult, code)  # NOTE: add "" str / recursion maybe?
    previ = RE_WHITE.sub(" ", code1) #!pref
    print("%s N=%i %s" %(fpOut1, len(code1), "...".join(strBrief(previ, n_previ)) ))
    print(fpOut1)
    mkdirs(fpOut1)
    with open(fpOut1, getenv("writeMode", "a")) as fd: fd.write(code1)

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

# TODO: add real ${} templating
# TODO: remove non-regular identifiers
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

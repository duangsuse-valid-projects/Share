#!/usr/bin/env python
from __future__ import print_function
import re # using Regex as tokenizer
from re import compile as Regex

from sys import argv, stderr, exc_info
import traceback
from os import mkdir, chdir, path
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

def runCode(code, srcpos, locals):
  try: eval(compile(code, srcpos, "exec"), None, locals)
  except BaseException:
    (etype, ex, tb) = exc_info()
    eprint("----"); eprint(code)
    callee = traceback.extract_tb(tb, limit=2)[-1]
    eprint(":: %s (%s)" %(ex, _sumSrcPos(callee)))

def strBrief(s, n_vp):
  iVp = n_vp // 2
  return (s[:iVp], s[len(s)-iVp:]) if len(s) > n_vp+1 else (s,) # odd len =+1.

RE_DEFINE = Regex("(\\w+)\\((.*?)\\)\\s?(.*?)\\n")
RE_BRACE = Regex("\\${(.*?)}")
def readDefine(d, s, srcpos):
  def convertDef(m):
    (name, formals, body) = m.groups()
    eprint("defined %s of %s" %(name, formals))
    body1 = RE_BRACE.sub("{\\1}", body)
    return "macro(d, %r, %r, %r)\n" %(name, formals, body1)
  code = RE_DEFINE.sub(convertDef, s)
  runCode(code, srcpos, {"d": d})
def macro(d, name, params, body):
  notPY2 = not name.endswith("_PY2")
  lambCode = "lambda %s: f\"%s\"" if notPY2 else "lambda %s: %s"
  pfix = len(name) - len("lambda") - (2 if notPY2 else 0) #f"
  try: d[name] = eval(lambCode %(params, body))
  except SyntaxError as ex:
    eprint("--"); eprint(ex.text)
    evalCaller = traceback.extract_stack(limit=2)[0]
    eprint(":: %s in %s (%s:%d)" %(ex.msg, name, _sumSrcPos(evalCaller), ex.offset+pfix))

# original: "```\\w*\\n//\\s([\\w/.]*)\\n(.*?)```"
RE_CODE = Regex("```\\w*\\n(#?//\\s?!?!?[\\w/.]*\\n)?(.*?)```", re.DOTALL) #!compat
RE_WHITE = Regex("\\s")
WHITE_COMMENT = "/# \t\n\r\x0b\x0c"
RE_COMMA = Regex(",\\s*")
RE_MACRO = Regex("#(\\w+)\\(\\s*(.*?)\\)") # \w in regex supports unicode.
MACRO_SUFFIXES = ["", "_PY2", "_JS"]
def outputInPwd(src, fp_base, scope={}, n_previ=40):
  srcmd = ""
  with open(path.join(fp_base, src), "r") as fd: srcmd = fd.read()
  prefixFp = "" # talk-about feat.
  def getSrcpos(m): return "%s:%d" %(src, srcmd.count('\n', 0, m.start())+2) # error loc feat.
  def getMacroResult(m):
    fn = m.group(1)
    for suffix in MACRO_SUFFIXES:
      op = scope.get(m.group(1)+suffix)
      if op != None: return str(op(*RE_COMMA.split(m.group(2))))
    return "ERR"
  for m in RE_CODE.finditer(srcmd):
    (desc, code) = m.groups()
    fpOut = "" if desc == None else desc.strip(WHITE_COMMENT)
    if fpOut.startswith("!!"):
      action = fpOut[2:]
      if action == "define": readDefine(scope, code, getSrcpos(m))
      elif action == "execute": runCode(code, getSrcpos(m), {"__FILE__": src, "__DIR__": fp_base, "scope": scope})
      elif action == "include": outputInPwd(code.strip(), fp_base, scope, n_previ)
      elif action == "talkabout": prefixFp = code.strip()
      else: eprint("unknown preprocessor action: %s" %action)
      continue
    fpOut1 = prefixFp+fpOut
    if fpOut1 == "": continue # talk-about is not for outer blocks
    code1 = RE_MACRO.sub(getMacroResult, code)
    previ = RE_WHITE.sub(" ", code1) #!pref
    print("%s N=%i %s" %(fpOut1, len(code1), "...".join(strBrief(previ, n_previ)) ))
    mkdirs(fpOut1)
    with open(fpOut1, "a") as fd: fd.write(code1)

def processFile(src, fp_tpl):
  (fpBase, name) = path.split(path.abspath(src))
  dst = path.splitext(name)[0]
  if fp_tpl != "":
    if not path.isdir(fp_tpl): raise EnvironmentError(fp_tpl+" dir not found here")
    try: copytree(fp_tpl, dst, dirs_exist_ok=True) # template feat.
    except TypeError: copytree(fp_tpl, dst)
  else:
    if not path.isdir(dst): mkdir(dst)
  chdir(dst); outputInPwd(name, fpBase)

from os import getenv
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

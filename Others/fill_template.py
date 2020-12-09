from __future__ import print_function
import re # using Regex as tokenizer
from re import compile as Regex
from os import mkdir, chdir, path
from shutil import copytree

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

from sys import argv, stderr
def eprint(*args): print(*args, file=stderr)

RE_DEFINE = Regex("(\\w+)\\((.*?)\\)\\s?(.*?)\\n(?<!\\\\)")
RE_BRACE = Regex("\\${(.*?)}")
def readDefine(d, s, srcpos):
  for (name, formals, body) in RE_DEFINE.findall(s):
    eprint("defined %s of %s" %(name, formals))
    body1 = RE_BRACE.sub("{\\1}", body)
    lambCode = "lambda %s: f\"%s\"" if not name.endswith("_PY2") else "lambda %s: %s"
    try: d[name] = eval(compile(lambCode %(formals, body1), srcpos, "eval"))
    except SyntaxError as ex:
      eprint(ex)
      eprint("...failed to define %s" %name) # for PY2.

# original: /```\\w*\\n//\\s(!?!?[\\w/.]*)\\n(.*?)```/
RE_CODE = Regex("```\\w*\\n(#?//\\s?!?!?[\\w/.]*\\n)?(.*?)```", re.DOTALL) #!compat
RE_WHITE = Regex("\\s")
RE_COMMA = Regex(",\\s*")
RE_MACRO = Regex("#(\\w+)\\(\\s*(.*?)\\)") # \w in regex supports unicode.
WHITE_COMMENT = "/# \t\n\r\x0b\x0c"
def outputInPwd(src, fp_base, scope={}, n_previ=40):
  srcmd = ""
  with open(path.join(fp_base, src), "r") as fd: srcmd = fd.read()
  prefixFp = "" # talk-about feat.
  def getSrcpos(m): return "%s:%d" %(src, srcmd.count('\n', 0, m.start())+2) # error loc feat.
  def getMacroResult(m):
    fn = m.group(1)
    for suffix in ["", "_PY2"]:
      op = scope.get(m.group(1)+suffix)
      if op != None: return op(*RE_COMMA.split(m.group(2)))
    return "ERR"
  for m in RE_CODE.finditer(srcmd):
    (desc, code) = m.groups()
    fpOut = "" if desc == None else desc.strip(WHITE_COMMENT)
    if fpOut.startswith("!!"):
      action = fpOut[2:]
      if action == "define": readDefine(scope, code, getSrcpos(m))
      elif action == "execute": eval(compile(code, getSrcpos(m), "exec"))
      elif action == "include": outputInPwd(code.strip(), fp_base, scope, n_previ)
      elif action == "talkabout": prefixFp = code.strip()
      else: eprint("unknown preprocess action: %s" %action)
      continue
    fpOut1 = prefixFp+fpOut
    if fpOut1 == "": continue # talk-about is not for outer blocks
    code1 = RE_MACRO.sub(getMacroResult, code)
    previ = RE_WHITE.sub(" ", code1) #!pref
    print("%s N=%i %s" %(fpOut1, len(code1), "...".join(strBrief(previ, n_previ)) ))
    mkdirs(fpOut1)
    with open(fpOut1, "a") as fd: fd.write(code1)

def strBrief(s, n_vp):
  iVp = n_vp // 2
  return (s[:iVp], s[len(s)-iVp:]) if len(s) > n_vp+1 else (s,) # odd len =+1.

def processFile(src, fp_tpl):
  (fpBase, name) = path.split(path.abspath(src))
  dst = path.splitext(name)[0]
  if fp_tpl != "":
    if not path.isdir(fp_tpl): raise EnvironmentError(fp_tpl+" dir not found here")
    try: copytree(fp_tpl, dst, dirs_exist_ok=True) # template feat.
    except TypeError: copytree(fp_tpl, dst)
  else: mkdir(dst)
  chdir(dst); outputInPwd(name, fpBase)

from os import getenv
if __name__ == "__main__":
  fpTpl = getenv("template", "template")
  for fp in argv[1:]: processFile(fp, fpTpl)

def trimBetween(cps, s): # confusing why added.
  state = 0; sb = [] # but anyone can shrink it...
  for c in s:
    (ce, p) = cps[state]
    if c == ce: state += p
    elif state %2==0: sb.append(c)
  return "".join(sb)

parenCps = { 0: ['(', 1], 1: [')', 0-1] }

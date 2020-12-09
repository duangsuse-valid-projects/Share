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
def eprint(*args, **kwargs): print(*args, **kwargs, file=stderr)
RE_DEFINE = Regex("(\\w+)\\((.*?)\\)\\s?(.*?)\\n")
RE_BRACE = Regex("\\${(.*?)}")
def readDefine(d, s, srcpos):
  for (name, formals, body) in RE_DEFINE.findall(s):
    eprint("defined %s of  %s" %(name, formals))
    body1 = RE_BRACE.sub("{\\1}", body)
    try: d[name] = wrapMacro(eval("lambda %s: f\"%s\"" %(formals, body1)), srcpos)
    except SyntaxError as ex:
      eprint(ex, end="")
      eprint(", failed to define %s (%s)" %(name, srcpos))
      d[name] = lambda *args: ""
    # may use closure, for (k,v) in zip(param,arg): d.update(k,v), and regex replace...

def wrapMacro(op, srcpos):
  def landpad(*args):
    try: return op(*args)
    except BaseException as ex:
      raise type(ex)("%s (from %s)" %(ex, srcpos))
  return landpad

# original: /```\\w*\\n//\\s(!?!?[\\w/.]*)\\n(.*?)```/
RE_CODE = Regex("```\\w*\\n(#?//\\s?!?!?[\\w/.]*\\n)?(.*?)```", re.DOTALL) #!compat
RE_WHITE = Regex("\\s")
RE_COMMA = Regex(",\\s*")
RE_MACRO = Regex("#(\\w+)\\(\\s*(.*?)\\)") # \w in regex supports unicode.
WHITE_COMMENT = "/# \t\n\r\x0b\x0c"
def outputInPwd(src, fp_base, scope={}, n_previ=40):
  srcmd = ""
  with open(path.join(fp_base, src), "r") as fd: srcmd = fd.read()
  def getSrcpos(m): return "%s:%d" %(src, srcmd.count('\n', 0, m.start()))
  prefixFp = "" # talk-about feat.
  for m in RE_CODE.finditer(srcmd):
    (desc, code) = m.groups()
    fpOut = "" if desc == None else desc.strip(WHITE_COMMENT)
    if fpOut.startswith("!!"):
      action = fpOut[2:]
      if action == "define": readDefine(scope, code, getSrcpos(m))
      elif action == "execute":
        try: exec(code)
        except BaseException as ex: eprint(ex, end=""); eprint(" from %s" %getSrcpos(m))
      elif action == "include": outputInPwd(code.strip(), fp_base, scope, n_previ)
      elif action == "talkabout": prefixFp = code.strip()
      else: eprint("unknown preprocess action: %s" %action)
      continue
    fpOut1 = prefixFp+fpOut
    if fpOut1 == "": continue # talk-about is not for outer blocks
    code1 = RE_MACRO.sub(lambda m: scope[m[1]](*RE_COMMA.split(m[2])), code)
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
    copytree(fp_tpl, dst, dirs_exist_ok=True) # template feat.
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

from re import compile, DOTALL # using Regex as tokenizer
from os import mkdir, chdir, path
from shutil import copytree

def _mkdirs(fp):
  (base, name) = path.split(fp) # just for fun... bad
  try:
    if base != "": _mkdirs(base)
    mkdir(fp)
  except FileExistsError as ex:
    if not path.isdir(fp): raise ex
def mkdirs(fp):
  base = path.split(fp)[0]
  if base != "": _mkdirs(base)

from sys import argv, stderr
RE_DEFINE = compile("(\\w+)\\((.*?)\\)\\s?(.*?)\\n")
def readDefine(d, s):
  for (name, formals, body) in RE_DEFINE.findall(s):
    print("defined "+name+" of "+formals, file=stderr)
    d[name] = eval("lambda "+formals+": "+body)
    # may use closure, for (k,v) in zip(param,arg): d.update(k,v), and regex replace...

RE_CODE = compile("```\\w*\\n//\\s(!?!?[\\w/.]*)\\n(.*?)```", DOTALL) #!compat
RE_WHITE = compile("\\s")
RE_COMMA = compile(",\\s*")
RE_MACRO = compile("#(\\w+)\\(\\s*(.*?)\\)") # \w in regex supports unicode.
def outputInPwd(srcmd, fp_base, scope={}, n_previ=20):
  for (fpOut, code) in RE_CODE.findall(srcmd):
    if fpOut.startswith("!!"):
      action = fpOut[2:]
      if action == "define": readDefine(scope, code) # NOTE: improv. macro/include err msg?
      elif action == "include":
        with open(path.join(fp_base, code.strip()), "r") as fd: outputInPwd(fd.read(), fp_base, scope, n_previ)
      else: print("unknown preprocess action: "+action, file=stderr)
      continue
    code1 = RE_MACRO.sub(lambda m: scope[m[1]](*RE_COMMA.split(m[2])), code)
    previ = RE_WHITE.sub(" ", code1) #!pref
    print(f"{fpOut} N={len(code)} {previ[:n_previ]}..{previ[len(previ)-n_previ:]}") # NOTE: fix4short-s?
    mkdirs(fpOut)
    with open(fpOut, "a") as fd: fd.write(code1)

def processFile(src, fp_tpl):
  dst = path.splitext(src)[0]
  if fp_tpl != "":
    if not path.isdir(fp_tpl): raise EnvironmentError(fp_tpl+" dir not found here")
    copytree(fp_tpl, dst, dirs_exist_ok=True)
  with open(src, "r") as fd: srcmd = fd.read()
  fpBase = path.abspath(path.curdir)
  chdir(dst); outputInPwd(srcmd, fpBase)

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

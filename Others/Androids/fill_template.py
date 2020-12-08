from re import compile, DOTALL
from os import mkdir, chdir, path
from shutil import copytree

def _mkdirs(fp):
  (base, name) = path.split(fp) # just for fun... bad
  try:
    if base != "": _mkdirs(base)
    mkdir(fp)
  except FileExistsError as ex:
    if not path.isdir(fp): raise ex
def mkdirs(fp): return _mkdirs(path.split(fp)[0])

RE_CODE = compile("```\\w*\\n//\\s([\\w/.]*)\\n(.*?)```", DOTALL) #!compat
RE_WHITE = compile("\\s")
def outputInPwd(srcmd, n_previ=20):
  for (fpOut, code) in RE_CODE.findall(srcmd):
    previ = RE_WHITE.sub(" ", code) #!pref
    print(f"{fpOut} N={len(code)} {previ[:n_previ]}..{previ[len(previ)-n_previ:]}")
    mkdirs(fpOut)
    with open(fpOut, "w+") as fd: fd.write(code)

def main(args, path_tpl="template"):
  if not path.isdir(path_tpl): raise EnvironmentError(template+" dir not found here")
  src = args[0]
  dst = path.splitext(src)[0]
  copytree(path_tpl, dst, dirs_exist_ok=True)
  with open(src, "r") as fd: srcmd = fd.read()
  chdir(dst); outputInPwd(srcmd)

from sys import argv
if __name__ == "__main__": main(argv[1:])

def trimBetween(cps, s): # confusing why added.
  state = 0; sb = [] # but anyone can shrink it...
  for c in s:
    (ce, p) = cps[state]
    if c == ce: state += p
    elif state %2==0: sb.append(c)
  return "".join(sb)

parenCps = { 0: ['(', 1], 1: [')', 0-1] }

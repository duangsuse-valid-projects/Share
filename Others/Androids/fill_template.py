from re import compile, DOTALL
from os import mkdir, path
from shutil import copytree

def mkdirs(fp):
  (base, name) = path.split(fp)
  if base == "": return # at first dir
  try: mkdirs(name)
  except FileExistsError as ex:
    if path.isdir(name): pass
    else: raise ex

RE_CODE = compile('''.*```.*\n// \n([\w/]*)\n(.*?)```.*''', DOTALL)
def output(dst, srcmd):
  for (m, fpOut, code) in RE_CODE.findall(read):
    print(f"{fpOut}\n{code}")

from sys import argv
def main(args=argv[1:], path_tpl="template"):
  (dst, src) = args
  if not path.isdir(path_tpl): raise EnvironmentError(template+" dir not found")
  copytree(path_tpl, dst)
  output(dst, src)

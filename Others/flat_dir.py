from glob import iglob
from os import path, remove
from shutil import move

class BiStr:
  def __init__(self,s,sep): self.s=s; self._sI=s.index(sep);self._sIr=len(s)-(self._sI+len(sep))
  def get(self,s): return s[self._sI:-self._sIr]
  def fmt(self,s): return self.s[:self._sI]+str(s)+self.s[len(self.s)-self._sIr:]
class FileOrdSeq:
  def __init__(self,pat,fifo=True): self.pat=BiStr(pat,"*"); self._fifo=fifo
  def _lastNo(self): return (min if self._fifo else max) (map(lambda s: int(self.pat.get(s)), iglob(self.pat.s)) , default=0 )
  def add(self): return open(self.pat.fmt(self._lastNo()+1), "w+")
  def pop(self,mode="r"):
    with open(self.pat.fmt(self._lastNo()),mode) as f: r=f.read(); remove(f.name); return r

def zipNotNone(xs,op): return filter(lambda ab: ab[1]!=None, zip(xs,map(op,xs)))

try:
  from pathlib import Path
  def mkdirs(fp): Path(fp).mkdir(parents=True, exist_ok=True)
except: mkdirs=path.os.mkdir
fpRoot="."; lifo=FileOrdSeq("dfp*.txt",False)
def globAll(pat): return [s for s in iglob(pat,recursive=True) if path.isfile(s)]
def enflat(key=lambda x:None, pat="**"):
  fpa=[]
  try:
    for fp in globAll(pat): fpd=key(fp) or path.curdir;mkdirs(fpd); move(fp,fpd); fpa.append(fp+"\n") # store here w/o key(x)
  finally:
    with lifo.add() as f: f.writelines(fpa)
def deflat():
  dfp={path.basename(ln):path.dirname(ln) for ln in lifo.pop().split("\n")}
  for (fp,fpdOrig) in zipNotNone(globAll("**"), lambda fp:dfp.get(path.basename(fp))): mkdirs(fpdOrig); move(fp,path.concat(fpRoot,fpdOrig))
def main(args):
  fpRoot=args.pop(0)
  if len(args):
    if args[0]=="undo": deflat();return
    args[0]=eval(f"lambda x:{args[0]}", globals(),path.__dict__)
  enflat(*args)

grpHTML={"css":"style", "js":"js"}
for k in "png jpg svg".split(): grpHTML[k]="image"
extname=lambda fp:path.splitext(fp)[1][1:]#'.'

if __name__=="__main__":from sys import argv;main(argv[1:])

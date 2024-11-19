from socket import*
import json as J
json=(J.loads,J.dumps)
import struct as S
import io

class Bin:
  def __init__(o,pat): o.m=pat; o._n=S.calcsize(pat)
  def read(o, s):return S.unpack(o.m, s.read(o._n))
  def write(o, s,obj):s.write(S.pack(o.m, obj))

letIf=lambda o,p,f:f(o)if p else o
def bin(pat):
  n=S.calcsize(pat); return(
  lambda s:letIf(S.unpack(pat, s.read(n)), len(pat)==1,lambda x:x[0]),
  lambda s,o:s.write(S.pack(pat, o)) )

def lenPrefix(m):
  a,b=m; A=lambda s: s.read(a(s))
  def B(s,o): b(s,len(o)); s.write(o)
  return A,B
def pipe(f2,F2):
  a,b=f2;A,B=F2
  return (lambda s:A(a(s)) ), lambda s,o:b(s,bytes(B(o),enc))

enc='utf8'
class Binary:
  def __init__(o,it, **cd):
    if isinstance(it,(str,bytes,list)): it=io.BytesIO(bytes(it,**cd))
    o.read=it.read or it.recv
    o.write=it.write or it.send
    o.val=it.getvalue
  def r(o, pat):return pat[0](o)
  def w(o, pat,obj):pat[1](o,obj)

mdFile= pipe(lenPrefix(bin("i")),json) #can use marshal however

b=Binary("",encoding="utf8")
b.w(mdFile,[1,2,3])
Binary(b.val()).r(mdFile)


def mlist(*m, flat={0}):
  def A(s,a):
    a.append(ns:=[])
    for i,x in enumerate(m):
      one=x[0](s)
      if i in flat: a.extend(one); ns.append(len(one))
      else: a.append(one)
  def B(s,a):
    ns=a.pop(0)
    for i,x in enumerate(m):
        n=ns.pop()if(i in flat)else 1
        x[1](s,a[:n]);del a[:n]
  return onnew(list,A),B
onnew=lambda make,f:lambda*a: f(*a,make())

mJF=mlist(mJ,mBuf)

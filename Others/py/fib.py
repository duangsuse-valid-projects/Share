from itertools import chain, islice, starmap, cycle
from operator import add

def drop(n,xs): return islice(xs,n,None)
def take(n,xs): return list(islice(xs,n))

class iself:
  def __init__(self, xs_ctor, nvp_max=4):
    self.xs_ctor=xs_ctor; self.nvp_max=nvp_max
  def __iter__(self):
    buf = []
    ref_ivp = [0]; n = self.nvp_max
    xs = self.xs_ctor(iself._vpiter(buf, ref_ivp))
    xz = iter(xs)
    while True:
      i = ref_ivp[0]
      for _ in range(n):
        buf.append(next(xz))
      for i1 in range(i, i+n): yield buf[i1]
      ref_ivp[0] += n
  @staticmethod
  def _vpiter(buf, ref_ivp):
    i = ref_ivp[0] -2
    while True:
      try: yield buf[i]; i += 1
      except IndexError: break

fibs = iself(lambda fibs: chain([1,1], starmap(add, zip(fibs, drop(1,fibs)))))

def on_each(op, xs):
  for x in xs: op(x); yield x
def sdbg(s,xs): return on_each(lambda x: print(s,x), xs)

class iself1:
  def __init__(self,xs_ctor,nvp_max):
    self.xs_ctor=xs_ctor; self.nvp_max=nvp_max
  def __iter__(self):
    n = self.nvp_max
    buf = [None for _ in range(n)]
    ri = [0]
    xz = iter(self.xs_ctor(iself1._vp(buf, ri)))
    while True:
      i = ri[0]
      buf[i] = next(xz)
      yield buf[i]
      ri[0] += 1
      if ri[0] == n: ri[0] = 0 
  @staticmethod
  def _vp(buf, ri): # 到底在 iter 里创建，还是只创建一次？
    i = ri[0]
    while True:
      try: yield buf[i]; i+=1
      except IndexError: i=0
# 但即便我懵懵懂懂，还是蒙对了…… 就想着 drop1 是“选择”b 环形缓冲区也行么
fibs = iself1(
	 lambda s: chain([1,1], starmap(add, zip(sdbg("a",s), sdbg("c",drop(1,s)))) ),
	 2
)
fibns = take(int(input("n?")), fibs)
def zip_next(xs): return iself1(lambda s: zip(xs, drop(1, xs)), 1)
print(fibns)
fibns = fibns[1:]
print(list(zip_next(fibns)))
if all(starmap(lambda a,b: a<b, zip_next(fibns))):
  print("是单调递增序列")

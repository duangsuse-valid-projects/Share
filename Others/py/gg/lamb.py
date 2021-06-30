#!/bin/python3 -qi
# -*- coding: utf-8 -*-

'''
Auxilary functions, like what defined in Haskell
Provides a well-__repr__ functional programming style library for Python3

- Lambdas: 入, curry, uncurry; delzy, delazy1, idp
- Function operation: compose, flip
- Auxilary: Try, cast, Infinity
- Streams: baserange, chrange, distrange, repeat, concat, every
- Logical relations: andp, or_p, notp, nandp, xorp, allp, existp
- Operator notation: op_infix, op_prefix, op_postfix
'''

## Part 0: Lambdas
def 入name(o): return o.__name__
def 入namefmt(nam, bord='(%s)'):
  hassp = any(map(lambda c: c.isspace(), nam))
  return (bord %nam if hassp else nam)
def 入(fn: callable, name) -> callable:
  fn.__qualname__ = 入namefmt(name)
  fn.__name__ = fn.__qualname__
  return fn
# curry :: ((a, b) -> r) -> (a -> (b -> r))
def curry(f) -> callable:
  fname = 入name(f)
  return 入(lambda x0: 入(lambda x1: f(x0, x1), f'λx. {fname}({x0}, x)'), f'λx. {fname}(x, _)')
# uncurry: ((a, b) r)  (( (a,b) ) r)
def uncurry(f) -> callable:
  return 入(lambda t0, t1: f((t0, t1)), f'{入name(f)}(x₀,x₁)ᵀ')
# delazy: (() r | r) r
def delazy(r_op): return r_op() if callable(r_op) else r_op
入(delazy, 'λx.$x')
# delazy1: ((a) r | r) r
def delazy1(r_f, x): return r_f(x) if callable(r_f) else r_f
# idp :: a -> a
def idp(x): return x
入(idp, 'λx.x')

## Part 1: Functional operators
def compose(g, f):
  return 入(lambda x: g(f(x)), f'{入name(f)} » {入name(g)}')
def flip(f):
  return 入(lambda x0, x1: f(x1, x0), f'(rev {入name(f)})')

## Part 2: Auxilary
def Try(op, fail=lambda e: lambda c: False, normal=lambda r: lambda c: c(r), err=Exception):
  try:
    return delazy1(normal, op())
  except err as ex:
    return delazy1(fail, ex)
def cast(ty, o, castf=lambda ty, x: ty(x), inschkf=lambda ty, x: type(x) is ty):
  return o if inschkf(ty,o) else castf(ty,o)
Infinity = cast(float, 'inf')

## Part 3: Streams
class baserange:
  ''' A base class for custom range, delegate for built-in range
      Provides: rng :: (s, e, k)
      Instance: List {len, getitem, iter, reversed, contains} / Obj {init, eq, hash, str}
      Left-inclusive & Right-exclusive; range('x', 'z') should be [x, y] (len=2)
  '''
  def __init__(self, start, end, step=1):
    self.r = range(start, end, step)
  def __eq__(self, other): return self.r.__eq__(other.r)
  def __hash__(self): return self.r.__hash__()
  def __str__(self):
    rstep = self.r.step; simplew = rstep == 1
    return '(%s..%s%s)' %(self.r.start, self.r.stop, "" if simplew else f', {rstep}')
  __repr__ = __str__
  def __len__(self): return self.r.__len__()
  def __getitem__(self,i): return self.r.__getitem__(i)
  def __iter__(self): return self.r.__iter__()
  def __reversed__(self): return self.r.__reversed__()
  def __contains__(self,x): return self.r.__contains__(x)
  def rangeTuple(self): return (self.r.start, self.r.stop, self.r.step)
  rtuple = property(rangeTuple, doc='Tuple (start, end, step)')
class xxrange (baserange):
  ''' WTF range implemented with (T -> Int) and (Int -> T) '''
  @classmethod
  def t2int(x): pass
  @classmethod
  def int2t(i): pass
  def __init__(self, start, end, step=1):
    super().__init__(self.t2int(start), self.t2int(end), step)
  def __getitem__(self,i): return self.int2t(super().__getitem__(i))
  def __iter__(self): return map(self.int2t, super().__iter__())
  def __reversed__(self): return map(self.int2t, super().__reversed__())
  def __contains__(self,x): return super().__contains__(self.t2int(x))
  def __repr__(self): return super().__str__()+self.describe()
  def describe(self): return '[%c-%c]' %tuple(map(self.int2t, self.rtuple[:-1]))

global ord, chr
class chrange (xxrange):
  t2int = ord; int2t = chr

class Iinfty (int):
  ''' Infinity with sign (+/-) '''
  def __init__(self, posign=False): self.neg = posign
  def __abs__(self): return Iinfty(False)
  def __neg__(self): return Iinfty(not self.neg)
  def __bool__(self): return True
  def __add__(self, v): return self
  def __sub__(self, v):
    assert self.notrealeq(v), f'{self}-({v}) is undefined number'
    return self
  def __rsub__(self, v): return Iinfty(True)
  def __rmul__(self, v): return self.__mul__(v)
  def __rtruediv__(self, v): return self.changesign(v)
  def __rmod__(self, v): return v
  # +/+=+; +/-,-/+=-; -/-=+
  def changesign(self, v):
    return Iinfty(False if (v >=0 and not self.neg) or (v<0 and self.neg) else True)
  def notrealeq(self, n): return not (type(n) is Iinfty and n.neg==self.neg)
  def __mul__(self, v): return self.changesign(v)
  def __truediv__(self, v): return self.changesign(v)
  def __mod__(self, v): return Iinfty(v <0)
  def __divmod__(self, v): return (self.__truediv__(v), self.__mod__(v))
  def __gt__(self, n): return self.notrealeq(n) and not self.__lt__(n)
  def __ge__(self, n): return self.__gt__(n) or False#eq
  def __lt__(self, n):
    otherinf = (type(n) is not Iinfty); nneg = n <0
    if self.neg:
      return (True if not otherinf or (otherinf and not nneg) else False)
    else:
      return (False if not otherinf or (otherinf and not nneg) else True)
  def __le__(self, n): return self.__lt__(n) or False#eq
  def __eq__(self, other): return False
  def __ne__(self, other): return not self.__eq__(other)
  def __hash__(self): assert False, 'Infinity cannot have hashcode (they never == anything)'
  def signrep(self): return ('-' if self.neg else "")
  def __str__(self): return self.signrep()+'Infinity'
  __repr__ = __str__
  def __float__(self): return -Infinity if self.neg else Infinity
IInfinity = Iinfty()

def distrange(k, n=IInfinity, start=0): return range(start, k*n, k)
def repeat(x, n=Infinity):
  assert n>=0, f'n({n}) must not be negative'
  while n !=0: n-=1; yield x # 我憎恨时序逻辑！
def concat(*args):
  for xs in args:
    for x in xs: yield x      
every = curry(map)

## Part 4: Logical operators
global any, all

def logicfmt(f0, r, f1, surr='(%s)'): return surr %f'{入name(f0)}{r}{入name(f1)}'

def wtf(q, tf, ff): lambda x: (delazy(tf) if q(x) else delazy(ff))
def andp(q0, q1): return 入(lambda x: q0(x) and q1(x), logicfmt(q0, '∧', q1))
def or_p(q0, q1): return 入(lambda x: q0(x) or q1(x), logicfmt(q0, '∨', q1))
def notp(q): return 入(lambda x: not q(x), f'¬{入name(q)}')
def nandp(q0, q1): return 入(compose(notp, andp(q0, q1)), logicfmt(q0, '⊼', q1))
def norp(q0, q1): return 入(compose(notp, or_p(q0, q1)), logicfmt(q0, '⊽', q1))
def xorp(q0, q1): return 入(andp(nandp(q0, q1), or_p(q0, q1)), logicfmt(q0, '⊻', q1))

def allp(q): return 入(compose(all, every(q)), f'λxs. ∀x∈xs. {入name(q)}(x)')
def existp(q): return 入(compose(any, every(q)), f'λxs. ∃x∈xs. {入name(q)}(x)')

## Part 5: Infix operators
def 入x(cs, nam): return 入(eval(f'lambda x: {cs}'), nam)
def op_postfix(op, nam): return 入x(f'x {op}', nam)
def op_prefix(op, nam): return 入x(f'{op}x', nam)
def op_infix(op, rhs=None, lhs=None) -> callable:
  names = chrange('x', 'z')
  anames = zip(names, [lhs, rhs]); anamed = dict(anames)
  argt = filter(compose(noneq, snd), entries(anamed))
  tabl=list(map(fst, argt)); atab = ','.join(tabl)
  body = f'{anamed["x"] or "x"}{op}{anamed["y"] or "y"}'
  desc = 'λ'+' '.join(tabl)+'. '+body if len(tabl) !=0 else body
  return 入(eval(f'lambda {atab}: {body}'), desc)

fst, snd = (op_postfix('[0]', 'x₀'), op_postfix('[1]', 'x₁'))
dentry = lambda d: lambda k: (k, d[k])
def entries(d): return map(dentry(d), d.keys())
noneq = op_postfix('is None', 'none?')

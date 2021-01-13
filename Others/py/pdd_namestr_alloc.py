class Group:
  def __init__(self): self.d={}
  def __getitem__(self,k): return self.d[k]
  def add(self, k, v):
    vs = self.d.get(k)
    if vs == None: vs = self.empty(); self.d[k]=vs
    v1 = self.append(vs, v)
    if v1 != None: self.d[k] = v1
  empty = lambda o: []
  def append(self, vs, v): vs.append(v)

class CountGroup(Group):
  empty = lambda o: 0
  append = lambda o, a, b: a+b

class Namer:
  def __init__(self): self.cg=CountGroup(); self.names={}
  def tag(self,u): return u[0]
  def name(self, u):
    nam=self.names
    if u not in nam:
      tag = self.tag(u)
      self.cg.add(tag, 1)
      nam[u] = f"{tag}[{self.cg[tag]}]"
    return nam[u]

def at_apost(us):
  c = Namer()
  return [c.name(u) for u in us]
def datUsers(s, d={"拼":"拼多多","阿":"阿里巴巴","京":"京东"}):
  us = [(d[u[0]]+"员工",u[1]) for u in s.split(" ")]
  return us

du=datUsers("拼a 拼b 拼a 拼a 阿a 京a 京b")
print(du,at_apost(du))

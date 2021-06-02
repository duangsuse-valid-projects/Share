class Equiv:pass
def computeIfNone(d,k,get_v):
    v=d.get(k) #res=(!!v)?v:(d[k]=get_v(k))
    if v==None: d[k] = get_v(k)
    return d[k]
class Me(Equiv):
  def run(_,a,b): return "".join(b[i] for i in map(int,a))
  def rev(_,s): #先是set()但它没indexOf，于是变list但它要手动单项化，于是成 dict(set+ iv-assoc)
      ci=dict()
      newIndex=lambda c: len(ci) #=n
      return ([computeIfNone(ci, c,newIndex)for c in s],list(ci.keys()))

m=Me()
print(m.run("20324013233","82103"))
print(m.rev("8013820100"))

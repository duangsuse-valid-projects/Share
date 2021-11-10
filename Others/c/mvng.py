from lxml.etree import Element as E,tostring,parse; import sys as S; import os
sp=lambda s:s.split(":"); _k=sp("groupId:artifactId:version:scope")
def ins(e,k,v):e.append(x:=E(k));x.text=v
def gav(e,a):
  def add(e,*a):[ins(e,k,v)for k,v in zip(_k,a)]
  if a[0]: (g,k)=a[:2]; [add(e(),g,g[g.rindex('.')+1:] if '-'==kk[0]else kk,*a[2:])for kk in k.split(',')];return
  for i,k in enumerate(_k):x=e.find(k);a[i]=x.text if x!=None else ''
def deps(e0,qu,a):
  if e0==None: f=lambda:doc.find(qu)
  else:
    f=lambda:e0.append(x:=E(qu))or x
    for e in e0.findall(qu): c=[None]*4; gav(e,c); yield c
  for c in a: gav(f,c) # Yup we can dep=coordsFile=dep+coords ,but it's :(

doc=parse("pom0.xml").getroot();ins(doc,"modelVersion","4.0.0");doc.set("xmlns","http://maven.apache.org/POM/4.0.0")

def divlast(a,v):
  for i,k in enumerate(a): yield(k,v[i:]) if i==len(a)-1 else (k,[v[i]])
for k,v in divlast(sp(os.getenv("path",".:parent:dependency")), [sp(x)for x in S.argv[1:]]):
  [print(':'.join(c))for c in deps(doc.find(k[:-1]+"ies"if k[-1]=='y' else k+'s'),k, v) ]
S.stdout.buffer.write(tostring(doc))

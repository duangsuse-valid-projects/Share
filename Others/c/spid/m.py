import re,sys; fp=sys.argv[1]
md=open(fp,"r").read()
ls=list(re.finditer("^```py\n(.*?)\n```", md, re.DOTALL|re.MULTILINE))
lno=[0]*len(ls)

for i,x in enumerate(ls):lno[i]=md[:x.start()].count('\n')+2;print(f"{i} {x[1][:20]} {fp}:{lno[i] }")
while 1: i=int(input()); s=ls[i][1]; print(s[:200]); exec(compile(s,f"{fp}:{lno[i] }","exec") )
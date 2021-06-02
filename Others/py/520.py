def pipe(f,f1): return lambda *a: f1(f(*a))
mapToL = pipe(map,list) # this(op,xs)=[op(x)for x in xs]
def getMonths():
  monthN={'a':31,'b':30}
  month=mapToL(pipe(monthN.get,int),("a b "*3+"a a b a b a").split(" "))
  month[1]=29 # 二月日数
  assert sum(month)==365
  return month
months=getMonths()

daysTill520=20+sum(months[0:4]) #求和是五个数
def monthDayAt(no): #no: num
  ms=months #别名简写
  acc=ms[0]; k=0; rem=0 # 下为卡位条算法，(减法)余数不及下月即此月日期，优化版的
  #first i. no-sum(months[0:i])<months[i]
  for (i,n) in enumerate(ms[1:]): #除数不能是0 故从acc=1月数 开始迭代。等效从0
    (k,rem) = a=divmod(no,acc);print(a)
    isLast=(i==len(months)) #先确保 xs[i] 里 i 存于区间 0..<len(xs)
    if isLast or rem<months[i+1]: break
    acc+=n
  return (k,rem) # 好吧写错了，混用数学和时序查找，155%31 相当于一年每月只有31天的情况，所以余数也叫模运算啊

def first(xs,p):
  for x in xs:
    if p(x): return x
def wrap(f):
  return lambda op: lambda *a: op(f(*a),*a)
monthDayAt = lambda no: first(range(0,12), lambda i: no-sum(months[0:i])<months[i])
@wrap(monthDayAt)
def monthDayAt(res,no): return (res, no-sum(months[:res]))

_520Day=monthDayAt(520-365)#155 #=(5,3) # 6/3 日
a=sum(months[0:5])
print(locals())
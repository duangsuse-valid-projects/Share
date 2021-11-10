# 关于11月省赛,爬虫统计图

虽然是入门级，可能有些工具会用，也应认真对待。这次除服管运维外，要求Py爬虫、Java后处理、JS显示，

大概是 requests,BeautifulSoup(XML parser); HQL,MapReduce(都是经典集群 加速计算); echarts柱图 ，目标是个招聘站

总的来说这些(包括图表) Python 都能做，区别只是写法不同、性能和用户体验低

## Linux

Linux 下 `dir cd` 和 cmd 一致(删移动是 rm mv)，上下键命令历史(`history`)__Tab补齐__ Ctrl C 终止 D输完

此次估计只会用(`sudo` 拿root) `apt install nano htop` 和 `yum groupinstall` 等去安软件，然后 `nano /etc/*.conf`

启动服务应该是 `service start` 或 systemctl 之类的，总之可查文档。网络/本机(`127.0.0.1`)服务一般都有个端口号，都是在conf文件配置

有一点是重复命令、参数建议用 `alias l='ls -lh'` 缩写，__避免复制粘贴__。

conf格式不了解可 `apropos -s 5 .`。手安基本是 `cd /opt; tar -xf *.tar; ./install` 这解压当前./ 即 /opt/ 下所有 *.tar 再执行一个程序，都是文件操作

```bash
help if for #内部命令
info coreutils #GNU工具
man man #软件文档/搜索
find `echo $PATH|xargs -d:` -name '*ctl' #ctl结尾的命令
f(){ echo "$*" = $0 $@;}
IFS=:
f a b c:d
env;set
```

Linux 的bash命令 `cat <in >out`, `grep kw <in.txt` 及 `yes|head` IO重定向管道语法也同cmd，它的脚本能力也不比Python差，但混乱 主要是运维用。见 `man bash` 的 / Expansion,History 

## SQL

关系式数据库类似 Excel ，服务端由行列构成、客户端逐语句查询/修改/dump ，它也被Android等用于快速搜索。有些图形化客户端 dbeaver,navicat,phpmyadmin 。可在 `sqlite3` CLI界面 试用

```sql
create table Stud(Sno integer, name varchar);
insert into Stud values (1,"丽"), (2,"刚");
select Sno from Stud where name like "%丽";
select (name) from Stud where Sno=1 limit 1 offset 0; --关系式 只选取name列, 于no=1的行, 1分页
--create db main;
--alter tb. (modify Sno) delete column..
.dump
update Stud set name="老刚" where Sno=2; delete from Stud; --以上所谓CRUD,都是(a,b)元组的列表操作
```

针对统计有专门的 HQL 兼容 json,csv 等表格式数据，术语都和蜂巢(hive,beeline)相关。(我检查了下 `row format: delim field termby ','; stored as textfile tblprop_("k"="v");` 可谓是乱的很)

`load data inpath 'a.csv' into table wtf;`

还能 `partitioned by (year int)` 这样分组，其实柱图(histogram) 本质也是分组计数 `items.groupBy{it.owner}.eachCount()`

「清洗」的确是数据系专门的术语而不是 `filter(lambda x:x>1,[0,2,3])` 的子集选取，有删列去重，当然这次举例子「重复列-新ID」「过滤列空」

```sql
--重复的id列 排序后,id+1w
with t as (sel *,row_number() over (partition by id) from tb as sq  where id>8k)
sel(sq-1)*1w+id as id, price,
year(date)as year from t

--关联表、去空
sel*from(sel*from Stud s
    where exists(sel*from StudID d where s.id=t.id)
)as a where a.name!=""
--where 表达式里 cast(numstr as int) 可以读取数值
insert overwrite table B sel*from A;--表赋值
insert into B select A;--标准
```

感觉是在用蹩脚的英文写Py。把SQL括号住的语句视作Py条件表达式、Excel行就行。

## 爬虫

Python 的语法简单直白，支持流处理和多种参数，适合与C/JS互操作

只因简单方便 Py 成为许多人的选择，而 Py 的表达力和元编程也的确在诸如 pandas,taichi,PyV8 多领域的软件上通过考验

```py
import random,cmd,code
class 猜数(cmd.Cmd):
  x=random.randint(0,100)
  intro="0~100";prompt="猜? "
  def default(o,s): x=o.x;n=int(s); print("对的"and exit() if n==x else "太"+("大"if n>x else "小") )
猜数().cmdloop()#help cmd
code.interact()#print(* (f"{x}{'偶'if(x%2==0)else'奇'}数" for x in range(0,100+1)) )
```

使用单线程 HTTP GET / = (status 200 OK) text="wtf" 的 requests 库，bs4 解析 html 。 bs DOM 支持 doc.table 和 find,find_all CSS 查询

```py
import requests as http
r=http.get("http://sm.ms", timeout=4)
assert r.status_code==200 and r.ok and b"div" in r.content  

if 0:
  r=H.post(ubase+"/upload", data={"id":"user"})
  r.raise_for_status() # if r; with as r; iter_, appa_encoding: decode text/json

help(http.Response)
http.api #header,cookie,json,file
```

我尽可能不用 `re.findall("", e.text)` ，移植我之前一个 scra.js 从 HTML-DOM 提取和忽视无效数据(但Py的变量字符串太贫瘠,不如新JS)

```py
import requests as H
from argparse import Namespace as O
from functools import *
@lru_cache
def 校列(bcur_type=11,year=2021):d=H.get("https://www.shanghairanking.cn/api/pub/v1/bcur",params=locals()).json(); return O(**d['data'])
def 写表(fmt,*a):单多项(a,lambda x:print(fmt.format(*x)) )
做表=lambda ks,a: [[x[k] for k in ks]for x in a]
单多项=lambda a,op: [[op(r) for r in x]if len(x)and isinstance(x[0],list)else op(x) for x in a]

o=做表("rankOverall univNameCn score univCategory".split(), 校列().rankings)
写=partial(写表,"{0:^N}\t{1:　^N}\t{2:^N}\t{3:^N}".replace('N','10'), "排名 学校名称 总分 类型".split(), ); 写(o)
#试着分类排名，再输出！
```

不止是调个WebAPI的爬虫，可能需跟随资源ID (如职位分类的所有需求单，看其工资)，是个简单的 BFS `collections.deque` add/popleft 队列(当然 add/pop 也行)

我们视队项为『任务』，据URL模式选择scra去解析并添加到 `指定页种csv.writer .writerow()` 结果

```py
def 切ND(s,sp):return [切ND(s,sp[1:]) for s in s.split(sp[0])] if len(sp) and (sp[0] in s) else s

网=切ND("""
鸡:chicken 爱=鸭
鸭:duck 厌=鱼,羊
鱼:fish 注=h
h:此文在fish里
羊:sheep ?别名=goat
看不到我:
""",["\n",":"," "])
#通过 爱厌 拿到别页. 注= 引的页面是内联作文本(特殊处理)的，?开头 别名不是链接(同特殊) . 实际情况也会有很多特处

from collections import defaultdict as dictOf
队=[input()or "鸡"]; 果=dictOf(list) #爬取根
def 取(k):return next(x[1] for x in 网 if len(x)==2 and x[0]==k)
while len(队):
  k0=队.pop()
  def 写(s,k=k0):果[k].append(s)
  引用=取(k0)
  for x in 引用:
    if x[1]=='=':
      v=x[2:]
      if x[0]!='注': a=v.split(','); [写(k0+x[0],k)for k in a]; 队+=a #厌=鱼,羊
      else: 写(取(v))
    else:写(x)
for(k,s)in 果.items():print(f"{k}: {s}")
```

`type(http).__truediv__=lambda o,u:o.get("https://"+u)` 可惜运算符不能附在module导入对象

一些py元编程见[metaclass-type是有new的obj](https://lotabout.me/2018/Understanding-Python-MetaClass/), `attr types dataclasses`

```py
d={1:2, 3:2}#熟悉下列表处理

from itertools import groupby
from operator import itemgetter; V=itemgetter(1)
{
  k:[x[1]for x in kv]
  for k,kv in groupby(sorted(d.items(), key=V), V)
}
nth=lambda i:lambda a:a[i] #喂索引i = 操作:拿组a内项
[list(v)for k,v in groupby(d,nth(3))]if 0 else 0 #map(lambda e:list(e[1]), groupby(o,nth(3)))
```

`python -m lib2to3 a.py -w` [GTK列表](https://blog.csdn.net/b617437942/article/details/73571939),[x](https://www.cnblogs.com/xchsp/p/4322026.html)

```py
import re,sys; fp=sys.argv[1]
md=open(fp,"r").read()
ls=list(re.finditer("^```py\n(.*?)\n```", md, re.DOTALL|re.MULTILINE)) #可删^和|re.M
lno=[0]*len(ls)

for i,x in enumerate(ls):lno[i]=md[:x.start()].count('\n')+2;print(f"{i} {x[1][:20]} {fp}:{lno[i] }")
while 1: i=int(input()); s=ls[i][1]; print(s[:200]); exec(compile(s,f"{fp}:{lno[i] }","exec") )
```

## 图示

echarts 是百度联合某科大的 canvas/svg(H5元素) 带动画交互图表库，其 API是{}风，比 Py matplotlib 的单实例严谨但易用些，利用 `XHR().onload=JSON.parse(xh.respText)` 或 `fetch(url).json()` 可填好图表配置对象(含标题)

职位 是和 城市,薪资,技术标签 相关的，__最基础__ 肯定是给个城市-职位的柱图，然后职位-薪资范围的图 ；虽然仅4小时相信有人也能写出来(不止一个统计模式)

首先 charts 对布局的支持不太好，我觉得 `overflow:auto; resize:both` 再加上鼠标按键-移动-弹起 拖动窗体化更亮眼(~10行 ，当然会有个有内味的 __默认布局、配色__，肯定比学校食堂的酷)



建议完全利用交互式图表(类似省市区的多 `<select>`)，允许用户点选 城市-职位 然后能看到(__一个统计评语__)、薪资范围柱状图、预定 __技术标签的计数__(精通啊熟念啊 Spring Hibernate 啊)，以及职位链接列表。如果尚有余力，可以加趋势图之类的

考虑到数据量大，城市-职位的两层 Grouping 肯定是后端反馈名字-计数，如果这样那 0 号数据就是城市名-职位数、 123 就是北上广啥；但我估计这次不会考这么细，直接在 JS 侧完成 groupBy 。

```js
x1=(a,i)=>a[a.length-i],
区间=(左线,f=(a,b)=>`${a}~${b}`)=>{let a=Array(x1(左线,0)),l=a[0],il;
  for(il=1,N=n(a);il<N;il++,l=a[i])a.fill(f(l,x), i,l-a[il-1])
  return a //对大量数据是快的
}
```

图表联动就是 Chart 有个点击事件，拿得到点中系列，然后更新相应元素的 data ，初始时用首项更新一次；这个对 城-职 和 职-薪* 柱图是一样的，类型名不同

## 另外

我觉得区分小文件的 `script[src]` 对单页应用没啥意义，因为打包时非常容易自动处理 `script[src=""]{src=name||随机名(); dl(src,innerText)}` ， js/ css/ 文件夹同理。

```py
import sys
import xml.dom.minidom as D
import lxml.html as D
def _(o,k): v=o.get(k); del o.attrib[k]; return v
D.HtmlElement.pop=_
from pathlib import Path
def rename(fp,s): c=Path(fp); return c.with_stem(c.stem+s)

doc=(root:=D.parse(fpr:=sys.argv[1])).find("body")
for i,e in enumerate(e for e in doc.xpath("script") if e.get("src")==None):
  fp=e.pop("name")or "h{i}.js"
  e.set("src", fp)
  open(fp,"w+").write(e.text)
rename(fpr,"1").write_bytes(
  D.tostring(root,doctype="",pretty_print=True)
) #doc.text_content()
import code;code.interact(local=globals())
```

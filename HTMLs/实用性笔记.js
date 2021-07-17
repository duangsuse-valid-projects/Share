此文件非 JS source ，只是复用高亮

https://ikirby.me/133.html Kt/coro Android 最小封装法
此文笔者最开始用 Thread 和自写 runOnUiThread 去写异步逻辑，但太混乱就用 RxJava ，它虽好点也不易懂、易炸，就全换了 Kotlin Coroutines

gav(org.jetbrains.kotlinx:kotlinx-coroutines-android:1.1.0) 提供了 Dispatchers.Main 在 UI 更新线程上调度

open class BaseAct:Activity,CoroutineScope{
  private val job=SupervisorJob()
  val coroCtx get()=Dispatchers.Main+ job
  fun onDestroy==coroCtx.cancelChildren
  fun examp1=launch { res=withContext(Disp.IO){/*http操作等*/} /*普通UI操作*/}
}

https://xecades.xyz/lab/Cube/
原来 console log warn 啥的支持 `'<css="">'` 啊，百度知乎的招聘 ASCII ART/UI 都弱爆了


https://xecades.xyz/js/script.js
果然是单页 pushState-JAX 应用…… 切换的那么丝滑


[研究性学习 - 简单分形几何图形的性质及作法研究 | Xecades](https://blog.xecades.xyz/articles/fractal/)
[关于 Base64 编码的娱乐性代码 (笑) | Xecades](https://blog.xecades.xyz/articles/base64/)
[康威生命游戏 | 元胞自动机 | Xecades](https://blog.xecades.xyz/articles/LifeGame/)

```js 
ops1=["+",1,["*",2,3]], ord=1, //1+2*3
log=(...a)=>console.log(a)||a, itself=x=>x
walk=(t,op,op0=itself, rec=tt=>walk(tt,op,op0) )=>!(t instanceof Array)?op0(t):
  ord==0? op(t[0], mapLazy(rec,t.slice(1))) :
  ord==1? op(t[0], ...t.slice(1).map(rec)) :
  ord==2? (xL=>op(t[0], xL,rec(t[2])))(rec(t[1])) : null
mapLazy=(op,xs)=>new Proxy(xs,{get:(o,k)=>op(o[k])})

log([(o,a)=>o=="*"?a[0]:a[1], log, log].map((op,i)=>{ord=i; return walk(ops1,op)}) )
ww=nd=>{let a=[],f=x=>a.push(x); ord=nd; walk(ops1, [(o,a)=>f(o)||a[0]||a[1],f,f][nd],f); return a}
log(["pre","post","in"].map((s,i)=>`${s}-order: ${ww(i).join()}`) )
```

- 回想起 C snake 贪吃蛇的时候，还有五子连珠啊、 spaceship 啊、键盘网格动画，大概还是要有 _9patch,spirite,transition,physics veloc 技术才能做得更好吧

- 话说 mkey 开始还打算支持 (不过咱提供了 `:=` 给 `->for(x=xs[i])x:=x+xs[N-i];` 的缩写强迫症) ，哈哈

https://blog.xecades.xyz/articles/multiprocessing/ Py多进程

总结：(1)仅 POSIX 的 fork/wait 模型
bash 中 cmd& 是 fork 而 wait 可等待 jobs 执行完，在 musl 等 libc 可能有差异。
每条命令靠 fork&exec 替换来创建进程，进程间必先存在父子 fork 关系。
孤儿进程是失去父进程的进程，属于 pid1(init) ，僵尸进程是未正常退出(父没拿结果)的子进程；进程全局变量和文件等资源不共享

(2)Py 翻译用 os. fork()==0, get pid/ppid, _exit,wait,waitid 接口可执行 UNIX 风格多进程，

multiprocessing 的 Queue(put/get),Pipe,Lock 是多进程信息传输和同步的基础资源

Process(target=func,args, name,daemon=False) 可 .start() 而 .join() 相当于 waitid(pid)

对象管道语法是 (c0,c1)=Pipe() ，类似 socket send/recv 但参数不止是buffer ，可用于双边通信如 c1.send; c0.recv ，双方不是一收一发会破坏稳定性。

Lock() 互斥锁语法是 with l: ，相当于独占资源

(3)Py 的 threading 提供了（可能不对应到系统的）多线程， Thread() 接口类似 Process(含 join)，current_thread() 可得当前线程

多进程中变量是单次捕获，各自修改；多线程中非 ThreadLocal 变量的修改会（不能确定时延）的同步更新，容易把变量改乱。

from threading import *
num=0
def nochange(dn):
  global num
  num+=dn; num-=dn

def spawnr(ps=[]):
  def op(p=["start","join"]):
    if isinstance(p,list):
      for k in p: [getattr(p,k)() for p in ps]
    else: ps.append(Thread(target=p))
  return op

spawn=spawnr()
for dn in 5,8:
  def racey():
    for _ in range(2000000): nochange(dn)
  spawn(racey)

spawn()
print(num)

互斥锁的获取动词是 acquire() ，如果释放时机不当，可能导致死锁（或为循环等待）
为保证资源一定释放可用 try...finally 的 with 结构，锁的好处是能让一段读写操作不被其它线程打扰，但实质是单线程兼容化了其代码，性能更差

我们可以把 with l 加在 racey() 或其 nochange() 调用里，前者是整体执行完才能进其它线程，后者是每 +- 一次能进，据批量各有优劣。

https://blog.xecades.xyz/articles/CSSBugs/ CSS 细节之 margin 纵向外距塌陷/合并

如我们有 .box0 { margin-top: 200px; .box {}  } ，不难想像 e0 距顶端隔点沟，e 则紧贴 e0 的顶边

若 .box:margin-top:200px; 似乎 e 应该下移并扩充 e0 的 height ，可似乎并没有动！直到 e:margin>e0:margin ，才发现整体的外上边距只是最大值！似乎， e0 没有顶边……

垂直方向，嵌套二元素只有整体边距，是二者最大值。

方案1： .box0:border-top:1px solid transparent; 加个顶，可是这影响了高度不太优雅
方案2：BFC 块级格式上下文

display:inline-block;
position:absolute;
float:L/R
overflow:hidden

应用任一便确认是带格式的块级。


如果我们有 .ln1{} .ln2{} ， .ln1:margin-bot=.ln2:margin-top=100px ，理论上中间隔 200px ，可实际上似乎重叠在一起了

给其一加 BFC 属性的父级仍可解决这个问题，不过，手写情况，直接改数值就能解决问题。

http://www.yinwang.org/blog-cn/2013/04/21/ydiff-结构化的程序比较 解析器

- 支持检测函数内子表达式的移动，能以 token 为单位对应滚动
- 和序列 diff 不同，能整理删除&再插入


pA :eIn("([")
pB :eIn(")]")
Name :not(pA,pB)
Sexp pA {Sexp}? pB |(Sexp|Name)


https://blog.hoshino9.org/2019/08/25/just-dependent-type.html types haskell

有了 GADT 广义代数数据类型，就可以让类型检查部分地应用上（树形数据的）语义

data Ast=(LN Int)|(LS String)|(Add Ast Ast)

时 Add 可能组织出 n+s ，但如果

data Ast res where
  (LN Int)::Ast Int
  (LS String)::Ast String

在 type 上暴露出一个可自定的 field 允许检查一致性(Add 可仅收 Ast Int)，就能断言数据被正确组织了。
此没有构造器接收的 tvar 人称 Phantom type

静态检查链表长度： data List a=(Cons a (List a))|Nil

head0 :: List a->a
head0 (Cons x _)=x --Nil 则未定义，运行时错误

假设用 GADT 的这个 type field 去编码一个长度

data Z; data S n -- 自然数0,N+1
data List len a where -- 此篇没有构造器能用这儿 len 符号，相当于显式写出 forall 去定义无用变量了
  Cons::a->(List n a)->(List (S n) a)
  Nil::(List Z a)

head :: (List (S n) a)->a --实现一样，但没有给 head Nil 的版本了

我们只是把 0,1::Int 值级的变量提升到 *(任意类型) 级，就能在编译期有限地做计算，不过类型上只能用模式匹配(类似 C++ template)，故利用 !<0 Int 与链表的等价关系 Peano 数去实现。

注意 Z 和 S 是不同的类型(:k Z, :: *)，而不是 data 定义同型的不同构造器，但这并不影响 GADT 模式匹配解构它。
另外 S n 里 n 是往往被推导出的构造 tvar 类型变量，不是数据构造器的 field ，它无需带类型

-XDataKinds
data Nat=Z|(S Nat) 后， :kind Z,S 各自是 Nat,(->) 类型，但其实类型本身还有 '类型，而这个 '类型 的类型才是 kind，就像 Ruby 的 class 有 metaclass 所以有静态方法

-XTypeFamilies

如果要连接两个列表，可以用类型运算扩展在类型级别定义运算：

type family (Add (a::Nat)(b::Nat))::Nat
type instance
  (Add (S a) b)=S (Add a b)
  (Add Z b)=b

concat::(List m a)->(List n a)->(List (Add m n) a) --实现略过

总之开启这两个 -X 后你就可以用普通语法在类型级编程了，好处是可以拓展类型检查器，坏处是 IO 不便

https://akarin.dev/2020/02/07/alicdn-video-hosting/

图床即视频床，二进制“隐写”，有意思

https://www.cnblogs.com/conmajia/p/a-more-powerful-binary-reader-writer.html

老有意思了

君土母语编程支持无服务器云服务 - 君土的文章 - 知乎
https://zhuanlan.zhihu.com/p/339889731

```plain
事 回应(名：化) = 判名属，
  于表，
    若取长(名)是1，
      若你 名的项[0]的值是""，回你。
    名去化文
  于文，名。
  否则，"错误：非预期的参数类型 ${取属(名)}"。

【测试】的事 档创() 为
  量书=核的书构去创书 断不空
  量页=书的主页 断不空
  断是(""、页的标题)
  量话=页的根话 断不空
  断是(""、话)
```

https://gitee.com/HTWX/klang

开始以为是和 kamet 差不多的编译器，没想到是 Go 的 js transpiler

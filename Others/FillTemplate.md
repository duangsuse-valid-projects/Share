# FillTemplate 是啥子

> `python fill_template.py FillTemplate.md`

本 repo 包含个人关于一些 Android 小应用的实践，从零开始吧。

我，duangsuse，是一个泛语言后端复用库/DOM 程序员，对 _数据库、GUI、非阻塞_ 这些东西都不太敏感，但还是努力在写代码。

在编写 [AClipboard](AShareClipboard.md) （一个 Android+C/socket 的网络剪贴板）的时候我创建了这个项目集，应该说也不太硬核，但因为我是一个 __最小化设计__、__定义式编程__ 主义者——

意味着我很讨厌把无关核心的业务逻辑放在主代码里。这个项目集采用了 __文学式编程__ (Literate Programming) ，也就是一种能详细写出你每行代码、每个子程序具体思路的编程方式。

比方说，这段程序分俩模块：

```c
// !!talkabout
strops.py
```

```python
def trimBetween(cps, s): # confusing why added.
  state = 0; sb = [] # but anyone can shrink it...
```

先定义 `state` 和结果 `sb`

```python
  for c in s:
    (ce, p) = cps[state]
    if c == ce: state += p
    elif state %2==0: sb.append(c)
```

更新状态的循环，若状态偶数则添加

```python
  return "".join(sb)
```

```c
// !!talkabout
```

这就 done 了。

```python
# main.py
parenCps = { 0: ['(', 1], 1: [')', 0-1] }
```

启动的部分：

```python
# main.py
from strops import trimBetween
if __name__ == "__main__": print(trimBetween(parenCps, "hello( no) hawaii"))
```

好了，那么你就可以 `python FillTemplate/main.py`

这个小工具基于 RegExp 的 `(.*?)` 最适匹配和 `DOTALL` flag，勉强支持中文标识符。

当然如果只是这样就太短，几乎不需要专门创个文件了，所以它还有 CPP(C语言预处理器) 的主要功能：宏调用，为简单实现，是基于 Python `eval("lambda params: body")` 的（当然我也可以选择实现成模板字符串 `d=dict(zip(params, args)); RE_REF.gsub(d.__getitem__, s)` 的形式，但是就不能用 `if`、`map` 的简单编译期运算了）。

```bash
# !!define
hello(t) Hello ${t}
bye(t) Bye ${t}
hello_PY(t) "Hello {}".format(t)
bye_PY(t) "Bye {}".format(t)
```

一个比较草的问题是， Python2 的 `\w` 不支持中文等 Unicode 字符，所以不得不用类似 greedy match 的方法写了 macro name / output path (not-space*) 的 rule 。

所以说你的宏名不仅可以带中部空格，甚至能换行…… 而且定义宏甚至能 `f(x)\n  body` 这种换行……（因为 `)` 后跳的是 `\s?`）

真的不知道该不该做更多的限制。（补充：已经横下决心了）

String Interpolation 问题没有解决主要是懒得解决

```plain
// hell.txt
#hello(Mike)
#hello(Jake) #bye(Rose)
#bye(Apple)
```

此外，还可以 `include` 一个文件一起处理。

这个文件与 include 者共享宏命名空间。

```plain
// !!include
FillTemplate.h.md
```

```plain
// hell.txt
#repeat(没有, 6)
通过。

//#repeat(淦, 23)
/#hello()
/notMacro()
```

于是你打开 `cat FillTemplate/hell.txt`

```plain
Hello Mike
Hello Jake Bye Rose
Bye Apple
没有没有没有没有没有没有
通过。

//淦淦淦淦淦淦淦淦淦淦淦淦淦淦淦淦淦淦淦淦淦淦淦
/Hello 
/notMacro()
```

以上；使用愉快。

```bash
export template=Androids/template
function testFillTpl() {
$1 fill_template.py FillTemplate.md
python FillTemplate/main.py
cat FillTemplate/hell.txt
rm -r FillTemplate/
}
testFillTpl python3
testFillTpl python2
```

## 以上之外

这里放一些测试性/还在设计时偶尔写的些小程序，测试效果。

一个“跑马灯”文本输出。执行应该看到：

```plain
['你好，', 's', '、', 's', '、', 's', ' 色']
[1, 3, 5]
你好，赤、橙、黄 色
你好，橙、黄、绿 色
你好，黄、绿、青 色
你好，绿、青、蓝 色
你好，青、蓝、紫 色
```

这个的最简实现（不用封装好 ADT 数据结构的）一般人都会想到右侧插一个，止于右侧的赋下项值吧：

```python
im = [i for (i,s) in enumerate(filled) if s. strip() == "s"]; nIm = len(im)
while True:
  try: filled[im[nIm-1]] = next (substz)
  except StopIteration: break
  for i in range(0, nIm- 1):
    filled[im[i]] = filled[im[i+1]]
  print("". join (filled))
```

当然时序也是很重要的。首先要先左移而不是右插，虽然是 `i in 0 until len(ss)-1: ss[i] = ss[i+1]` 的左至右顺序也不会把右添的项目复制到左边，但，
先插就覆盖了末项，导致 `ss[len(ss)-1 -1]` 和末项相等。

最后是最好有个 `iter`，然后能第一遍先把占位符填满，
这样的话 `print` 也要移到循环前面，消耗第一次填满的。（这么看前面的不仅不好也有 bug，不会输出最后一次左移）

成品：

```python
# fifo_str.py
import re
text = """
你好，%s、%s、%s 色
""". strip()
subst = list("赤橙黄绿青蓝紫")

def showSubsts():
  filled = re.split('%(\\w+)', text); print(filled)
  im = [i for (i,s) in enumerate(filled) if s. strip() == "s"]; print (im)
  substz = iter(subst)
  nIm = len(im)
  for i in range (nIm) :
    filled[im[i]] = next(substz)
  while True:
    print("". join (filled))
    for i in range(0, nIm- 1):
      filled[im[i]] = filled[im[i+1]]
    try: filled[im[nIm-1]] = next (substz)
    except StopIteration: break
showSubsts ()
```

### 关于宏调用的扩展

咱策划了有三个扩展：

1. 递归宏展开（就是宏定义里能直接 `${}` 而不必用嵌入 `scope["name"]()` 的 PY/JS 通用语法）
2. 惰性宏展开（就是 call-by-need 按需求值，而不是 by-value 的先求值再传值调用，可以实现体带副作用的 `//if(p, a, b)`）
3. 自动重构（就是动态构造正则表达式 `(.*?)` 匹配，实现从 `//尊敬的博士(A)` 配 `尊敬的A博士` 的双向变换）

其实也可以有内联（依据 arg 指代上函数的 param 替换 body）什么的，不过那都是有点跑题了的……

#### 首先说递归宏展开

实际上咱已经支持递归宏展开了（和 `cpp` 不一样，LPY 会穷尽展开 `#f(g(x))` 这样的宏调用），只不过不能在宏定义里直接 `twice(s) #repeat(2, s)` 这种。

首先，宏调用是不能放在 `${}` 外的，因为自咱区分 `_JS`/`_PY` 形式的宏和普通宏，参数引用理应只在钱花括号内出现。

但如果这样做，普通展开结果不需要 `""`，而代码内结果需要展开成字面量，会导致许多问题（即便用 `twice(s) #repeat(2, ${s})` 也会在代码宏与普通宏之间产生不应有的联系）

所以，只好用 `twice(s) ${scope["repeat"](2, s)}` 的这种形式，也有利于强调 LPY 作为预处理器，生成代码的能力有分层。

#### 惰性宏展开

很简单，在边解析边执行的 `_expandMacroTo` 里判断名字，如果叫 `"lazy"` （更进一步就是支持 per-macro 的 flag）就不展开它的子项，直接跳走即可（当然这个宏也可以起名像 `//>()` ，是支持的）

```python
# lazy.txt
#lazy(//hello(1) #bye(2))
#eval(//hello(1) #bye(2))
//hello(1) #bye(2)
```

然后，在能拿到 expandMacro 的地方定义 `scope["lazy"]` 的闭包，它返回一个 `callable` 的 `Lazy` 闭包住所需变量即可。

实现这一点必须有传值（而不只 `str`）宏的特性，其实不是太困难，参数列表是 `["a", 1, SEP, "b", "c"]` 的形式，每个逗号前只要无文本拼在其前调用结果上，自然就不会转 str

```python
while ab[i+1] != SEP:
  a1 = ab.pop(i+1)
  ab[i] = str(ab[i]) + str(a1)
ab.pop(i+1) #SEP
if len(ab) == i: break
```

当然，也可以定义 `if` 宏去求值字符串，也不需要支持传值了，但那样不可以做复杂点的宏比如 `#set!(a,int(1))`。（_实际上，目前的实现就是这种……_ 毕竟只是文本预处理器，很难想像会需要 value ，已经加入 `\,` 支持，但当然没有 `\\` 了）

后来发现可以利用 `get_subst` 的参数，完全解析但只重新生成一个调用语法。

目前实现上也就是 `lazy`/`eval` 的 call-by-name 手动传表达式调用。

```python
# lazy.txt
#hello(\, Hello\, wor\,\,ld!!)
```

为此特意写了这个，可惜不能解决跳空格的问题，只能弃 Regex 彻底重写（许多旧引擎不支持 negative lookbehind `(?<!\\)`），唉。

```python
def commaSplit(text):
  ss = RE_COMMA.split(text)
  if len(ss) < 2: return ss
  i = 0
  while i != len(ss) -1:
    s = ss[i]; n = len(s) # merge \, due to Regex compat limitation
    if n != 0 and s[n-1] == '\\': ss[i] = s[:n - 1] +","+ ss.pop(i+1)
    else: i += 1
```

（妈的 IPython `%timeit` 测试 `StringBuild()`、`StringIO()`、`sb=[]` 还没有 `s+="x"` 快，到 JS 里可能又反过来，真不知道怎么写好，[这个人](https://waymoot.org/home/python_string/)说最好是 `[ for ]` comprehension 其次是 `StringIO`，一群喜欢玩魔法谈甚么 Pythonic 的，不尊重用户抽象，茴字有几种写法。

关于这个特性，也考虑过是不是要做到 callee 方的 define 里去（就可以弄 `lazy!if(p,a,b) ...` 这种了），后来觉得就是个预处理器，没必要引入这种实现复杂性

#### 自动重构

这个也需要形式化参数列表，在定义时必须预先解析成 argNo 的形式，允许生成反向的 regex 代码

如果参数找不到就返回 `"REF"`，或正则式的 `.*` （实际上就不是 `${}` 的形式了），但只要能找到，就把它存入参数顺序里，并且返回 `(.*?)`

这个要多测试，感觉那个 Parser 写得好渣，可惜毕竟是状态机，又含递归，难以改。

那个 `_expandMacroTo`，本质上只是 `Repat(Call|anyChar)` 或 `takeUntil(')', Call|anyChar)` 的区别，但不用状态机而换成子程序甚至 parser combinator 的话会很长很麻烦。

```python
# argNo.py
from re import compile as Regex
RE_DEFINE_REF = Regex("\\${\\s*(.*?)\\s*}")
RE_PARENED = Regex("\\((.*?)\\)")

formals = ["a", "b"]
found = []
def argNo(m, is_regex): # find ${N} index of ref, or expr (ref).ops
  fmts = ("(.*)", ".*") if is_regex else ("${%s}", "NOREF")
  brace = fmts[0]
  def braceRef(name):
    idx = formals.index(name)
    if is_regex: found.append(idx); return brace
    else: return brace %str(idx)
  try: return braceRef(m.group(1))
  except ValueError: pass
  expr = m.group(1) #v just convert ${(N)} to args[N] in exprs
  refIsFound = [False]
  def refEval(m1):
    name1 = m1.group(1)
    try:
      if refIsFound[0]: return "noRef(%r, %r)" %(name1, "DUP")
      sRef = braceRef(name1) #v replaces only non-regex
      refIsFound[0] = True
      return RE_DEFINE_REF.sub(lambda m2: "args[%s]" %m2.group(1), sRef)
    except ValueError:
      return "noRef(%r)" %name1
  expr1 = RE_PARENED.sub(refEval, expr)
  return (brace if is_regex else brace %expr1) if refIsFound[0] else fmts[1]

def printSubst(s):
  found = []
  for subs in None, found: print(s, RE_DEFINE_REF.sub(lambda m: argNo(["a", "b"], subs, m), s))
  print(found); found.clear()
for code in "hello", "hell${x}", "hell${p}${a}", "${b}${a}", "${(b).name}${xs[(a)]}", "${(sb).a1}${(b)}", "${(a).of(b)}${(b)}": printSubst(code)
```

开始咱的 `refEval` 写出了个递归（看样子大概是接受 `${(${(b)})}` 了很迫真），发现是思路不清后很快解决了。

这个子程序十分不优雅，但调了两个小时…… 唉不哆说了，都是泪

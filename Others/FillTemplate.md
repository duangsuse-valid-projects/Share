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

```python
# !!define
hello(t) Hello {t}
bye(t) Bye {t}
hello_PY2(t) "Hello {}".format(t)
bye_PY2(t) "Bye {}".format(t)
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

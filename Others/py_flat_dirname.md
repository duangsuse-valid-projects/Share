# 干嘛要手动归类文件夹啊！

每次你看 Android 项目大概都会有种莫名其妙的挫败感——source `.java` 什么的好深！在 `src/main/java/com/xxxx` 里面，点好多次才能进去！

在 GitHub `/tree/` 文件浏览里，多层只有单项的文件夹会被自动合并为路径，那么我就想问了，能不能对本地文件解除这种深深的嵌套，方便浏览文件？

其实 `for fp in find .; do mv $fp . ;done` 一行 bash 就能做到“铺平子文件夹”了，但我不可能破坏原有的结构吧！于是不难发现在 mv 前存入某个 `"$(basename fp) $(dirname fp)">>oldPath.txt` 如 `deep/a` 变 `a deep/` 就老够了，这是文件系统树形结构的熟悉练习。

对于一个深深的树，就像一层层嵌套的文件夹，如何对所有子项目执行操作？命令行 `find` 其实是一个带 predicate(条件过滤) 的 `TreeWalker` ，也有点类似 "glob" 这种查询动作。

```ruby
Dir.glob '**/**' #=>["a","a/wtf.txt"]
```

但我们目前关心的是怎么在 py 里带存根地铺平，然后怎么优雅地恢复。

我们知道文件系统暴露的主要部分其实是路径、子路径，比如 `dirent.h` 的 `readdir()`，而不是 `open()` 的 `read/write Text`；但对应用编程言了解 __绝对路径__ （即完整路径）的三个成分——`dirname` 文件夹名、`basename` 文件名、`extname` 扩展名，才能很好地组织各种项目结构，压缩包里、系统镜像里也基本是一个样。

```bash
ls ./dir/base.ext # . 代表当前目录，.. 代表上层，所以 POSIX(即UNIX) 路径比 DOS/Win 更复杂
basename -s .ext base.ext #base
#对 sh 脚本言基本名也可以指去 .xx 后的文件名，但基名就是文件名，有点混淆。
```

那么，利用 `glob` 路径枚举 API 和 `shutil` 暴露的 fs `move(fp,fp1)` API，以及最最基础的 `os.path` 与 `json` 序列化存储，我们可以轻而易举地实现铺平与收回。

话说，它附加了个 `iglob` 迭代器接口，名字还挺 UNIX 化……

```py
from glob import glob
def globAll(fp):return glob(fp,"**",recursive=True)
from shutil import move

from os import path # 记录侧
from json import dump,load

fpRoot=".";fp1="." #针对 un/re pack 二操作共同参数，可以作模块全局变量
def unpack():
  dfp={} #dir path(of name)
  for fp in globAll(fpRoot): move(fp, fp1); dfp[path.basename(fp)]=path.dirname(fp)
  #^两个操作的顺序一般是不可能抛异常断执行的在前，这里倒过来是因为真move()失败咱也没必要还原
  #文件处理程序必须把 state 保存在文件里，如果是服务就能直接存入内存
  with open("dfp.json","w+") as f: dump(dfp, f)
def repack():
  dfp={}
  with open("dfp.json","r") as f: dfp=load(f)
  for fp in globAll(fp1): move(fp, dfp[fp])
```

有一个细节，就是无论是文件路径的树形结构，还是 HTML 的，其上的二参操作，往往都可选任意参作主语而不同，注意 `dirname` 这个操作的结果是依当前路径 `abspath(".")` 而言的，所以 `repack` 里对 `dfp[fp]` 的解释应该是 `path.concat(fpRoot, it)` 的版本且 fp1 必须是 cwd(即 "." 当前工作路径)，而才算正确做成两个 fp 参数。

看完你会发现对处理到文件系统的程序言，当前路径就是个隐含参数，我们把 `fp1` 删了呗(这是考虑到那个存根 json 文件应该放在它里面 而 fpRoot 可灵活)。

## 怎么解决手移的套版式归类

文件夹结构的一个常见特例是『分类(最深2层)』吧，比如博客按年-月分、静态网页按样式/脚本/图片资源类型(文件后缀名)去分，这样做的本意是方便，但手工维护实在太骚；那我们可以让这个工具走得更远，去解决自动归类的问题。

想这么搞最大的问题就是，如果我先想铺平，又想以日期分文件夹，那看完后该怎么放回？

存根 `dfp.json` 会被覆盖，而假设不会，其内容也会因为二次移动而失效（所以因为理论基础出问题导致bug你是不知道自己在干嘛）

很简单，我们存 `dfp={}` 本质是在把新路径(只用一个名)对应到其原有深路径，的文件夹(因为文件名没有变 绝对路径可以夹+名拼嘛)，坦白说那 `json` 只存一个 fpa(绝对路径) 列表也行，那样 `dfp={basename(s):dirname(s) for s in f}` 按行读嘛，构造 `{}` 只是方便查然后较标准。

这就是从1到多的重构了——不难发现文件树在程序执行前后有两个状态 0 1，而 `dfp` 存根就是提供 1->0 的撤回信息，现在不止两个状态，何如？

状态 1 其实就是下一次运行的 0！想像下在 Word 里按 Ctrl+Z 撤销编辑，那肯定是先撤回刚输的内容了，所以要给存根文件加递增编号，每次撤回按号最大的优先，从状态 `3(dfp2)->2(dfp1)->1` 应用不同的反向 `move(fp,fp1)` 存根，就能回到最初的未修改文件夹结构，同样能在任意时刻重新分组了。

然后就看怎么定义这个「分类」了，很明确就是个 `key(x)` 函数，比如 `pipe(path.extname, ({"css":"style/"}).get)` ，数据集合之 `Group<K,V>=Map<K,List<V>>`

__我们已经知道了算法是要干什么，它的路径映射模型和所需底层操纵 API ，可以设计接口了__

## 实现 cli 工具

这种工具最常见当然命令行接口，变量少(`fpRoot`,`key`)所以不用 argparse 什么的，我们应尽量提供多的操作输入选择方式。

我觉得就是 `key fpRoot` 比如 `flat .` 基础吧，但 fpRoot 不可能有很多个(dfp 文件只在当前目录)，所以我觉得额外暴露 `glob()` 的"模式字符串"参数，`fpRoot key=flat pat? (key pat)*` 是个不错的模式(?可选*重复)，那么：

```py
def unpack(key,pat="**"):pass
def repack():pass

def main(args):
  n=len(args)
  if n>2:
    fpRoot=args[0]
    for a in seqPairs(args[1:]): unpack(*a)
  def setFP(s): fpRoot=s; unpack(pFlat)
  [exit, setFP, readSeq(setFP,unpack) ][n] (*args)
def readSeq(op1,op2):
  return lambda *a: op1(a[0])or op2(a[1:])
import sys
if __name__=="__main__":main(sys.argv[1:])
```

唉我到底在写啥。不写了不写了，直接上[代码](flat_dir.py)吧

```bash
mkdir Earth; pushd Earth
loc=China/Hubei
echoi() {
  mkdir -p $loc; echo $1 >$loc/$2.txt
}
echoi 哈 Jingzhou
loc=America/
echoi A LosAngles
loc=England/
echoi K London
```

## 另外

其实这个存根用一行一路径，然后按 basename 去查是为简化数据模型方便大家理解，本质上它还是 fp1->fpOrig 的单向映射，所以可以还原旧路径。

如果有分组 key 函数，一行一路径也能足够，原有的功能就相当于被分组到 `"."` 即工作目录根这一组了，但是允许自定义分组也将允许文件名冲突(同名key不同)，这方面一行一路径的隐含当前组就不足够了。

毕竟一个项目结构里很难有同名的文件，这里不处理，如果想的话可以按行判断是一条还是两条，两条(fpHasK,fpOrig)就恢复旧模式而不利用 `mv fp dirname/fp` 隐含的目标路径，不过其创建期的判重不能靠 `path.exists(keyFp+fp)` 而只能另建同名件的集合，还真很符合哈希表应用的常规呢。

最后我总结一下，至少对程序员而言日常的一切都可以由程序操纵，看起来死板的东西只是因为你选择太少所以死板。不过分吧。

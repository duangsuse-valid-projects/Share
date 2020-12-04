# Android-PC 剪贴板共享方案

> 写不出 C server，暂时停止了……

## 问题的由来

这是个关于我个人科学上网的，忧伤的故事。

手机上可以访问到需要的资料站点，但是电脑上通过 USB绑定(Tethering, RNDIS 协议)上网，不方便用梯子。

所以，写代码是在电脑上，但手机的即时通讯软件还是经常用，不方便。

之前我的方法是用 `gvfs-mtp` ——在电脑上创建文件，从 USB绑定 切到 MTP，把文件移动到手机（还不能直接编辑手机上的文件），然后再切回去；从手机到电脑就更麻烦了——小段文本也要打开 WPS Office （一直没装专门的编辑器）编辑添加，再按这个流程……

可是这样太麻烦了（而且这种需求还挺频繁的），所以就在个人频道上抱怨了几句，真的有人教我该怎么做了。

忍不住想到了 QQ 的「发送到PC」功能，难道这就是极客的苦恼么……

## `netcat` 的简单用法

`nc` 可以用来做高级的转发/管道（曾经还有人用10行bash写了个 HTTP 1.1 Server ），但也有 listen/send 的简单操作。

```bash
port=1235 # <1024 的低端口非 root 或 setcap CAP_NET_BIND_SERVICE=+eip 不能 bind
nc -l -p $port # 接收方
nc $RNDIS_HOST # ipconfig 主机
```

它暴露了计算机网络赤裸的命令行接口，socket(套接字)，而不是 HTTP 所带来的 Client/Sever Request/Respond 模式，在这个接口下你理应可以实现互发消息的 P2P 客户端，不必“请求”对方或者第三方的数据。

不过，即便基于双工的 bind socket ，信息传递也是有方向的，而且分清被动(B方) 和主动(A方) 也有利于软件简单性。

对于这个应用， Android 端监听、PC 端请求，所以只有 PC 主动请求了，它的剪贴板才能更新，Android 不能主动设置 PC 的剪贴板。（在连接层Android可以提醒更新，但意义不大）

## 通讯协议

只有两个操作，一个需字节区、一个得字节区，需字节区的称为 `+`，另一个称 `-`。

server 层面： `+buf`, `-`>buf

stdio 层面： `+n:buf`, `-` < buf `EOT`

下面我们可以用 C 的 `<stdio.h>` 和 Java 的 `java.io.InputStream`(`+` 时), `OutputStream` (`-` 时)、 `java.util.Scanner` 完成。

## C/bind 侧

```python
from matplotlib import pyplot
def plot(f, n): pyplot.plot(list(map(f, range(0, n))))
plot(lambda n: 4*n if (n<1024) else 2*n, 10240); pyplot.show()
```

## Java 侧

如果说这个应用是基于我之前几乎没有的 Android 经验设计的，它混合了 MinBase64 (Text view) 、 E2IM (NDK+C project layout) 、 Tree-Toolbox (Intent getFile) 的一些片段。

应用是基于其基本目的和特性点开发的。我们的基础目的是在电脑请求时提供剪贴板数据，并且在电脑提供时设置剪贴板。

这个应用需要的权限是：完整的网络访问、剪贴板

为方便用户查看，应用提供仅一个 `EditText` 视图（当然实现上我会提供更规范的 `LinearLayout` 为顶层）和一个菜单，主文本的 placeholder 是动态的，在文档尾行后显示 `port ${n}... started` 这样的消息。

它的菜单是：存入文件、发送文件、设置(存)端口、[x] 显示上次传输

文件的发送不必更改后端，先按字符串解释收到的字节区，如果失败就显示彩色 `(File received)` ，让用户手动存入即可。

作为拓展，可以允许发送文件的 `intent-filter` 和编辑框手势缩放，此外可以支持快捷打开 USB绑定/其设置页面。

```java
interface AppEnviron {
  String getClipboard();
  void setClipboard(Strnig text);
  File askOpenFile();
  File askSaveFile();
  int prefsGetOrPut(String k, int n);
}
abstract class AppBase extends Activity {
  byte[] lastContent = new byte[0] {};
  // do: sendFile, saveFile, changePort
  void onTransmit() {/*更新文本框内容*/}
  void restartServer(int port) {/*日志到 placeholder 并且启动/重启服务*/}
}

interface Consumer<T> { void accept(T x); }
interface Producer<T> { T get(); } // 可惜 Android 里不方便用 java.util.function 的版本
abstract class AClipboardServer {
  public AClipboardServer(IOStream cli) {}
  public Consumer<String> onSave;
  public Produce<String> onAsk;
  public void bindOn(int port) {}
}
```


## 其它

在当前文件夹下使用以下代码填充项目源码、编译：

```python
```

除了共享剪贴板，以上代码通过 Java 侧的简单修补也可以支持创建文件，毕竟所用的 IO stream (socket, stdout) 都是没有字符集限制的。

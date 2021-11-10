# 谈 Linux 与计算机

>对日常使用而言Win和Linux定制版会有许多不必要做法与配置。可某些只关心应用层API的开发者，在拿出好记星Flash、mp3式系统外成果前，有资格对前人的工作说三道四吗。

尽管较完善的操作系统数不胜数，在“遥远”的30年前，还是DOS这类单进程,单用户BIOS外壳 汇编操作系统的时代。

那时有PC就是今天的高手；而高手就可不是指灵感和选材或体量耗时，是真的对x86裸机和网络有所了解-我试过，排除文档的匮乏(官档很冗)，的确更费脑子

计算机的发展使它能更好为普通人服务，出现了IP协议的广域网、据说是Mac最先有的图形界面，那也就是UNIX的Xorg出现的时代了；而嵌入式内核+迷你界面库驱动的数码设备，从相机mp3到多媒体,电子词典,游戏机 也从程序固定的角度扩大了社会和娱乐生活

物理、信息、电路，再加上数学的优化调控，融合成全新的领域，它完美利用了人类既有的物理知识，可以捕获/回放波形和像素，持续大量分析变换各种渠道各种类型的数据(程序亦数据)、监听控制多种外设模块——计算机。现在是，在未来所谓新技术也会越来越自然普通、更加不可或缺

>操作系统是 explorer.exe 吗？是桌面图标壁纸和任务栏(taskBar),开始菜单吗

无论是个人机、服务器、实时调度，操作系统的内核至少实现这些概念：用户进程内存、文件树/网络IO、鼠标VGA显示等基础外设IO信号、内核扩展(驱动)，最好还有线程(LW-P)同步与资源池

兼容Linux启动API, 弄个能打字的系统：

有些技术无论是40年前还是今天都不变的。有句话，知其变，守其恒，为天下式。

在今天，绝大部分程序员面向x86(IA86)和arm,8085上有完善C语言支持、图形界面乃至 Java,Py,JS 等有更友好 API 的执行环境编程，可以不面对代码文本后厚重的单机技术史

你甚至会觉得文本代码外的说法是可笑的，JSON和YAML,ini外的格式没必要，没REPL和dbg-print的运行时是不存在的，C语言之前也没BCPL或Fortran，C++ 比C只是多std,class两词、%s%d 和main()是语法、事件重绘是魔法

因为一些程序员连画画和HTML表单、布局计算也不了解，用个HTTP或文件API都困难，会黏几个社区库、或者拿300行解决50行的功能，起一堆意义不大姿态不小的名字，就叫大佬了

但以前的『程序员』就是那样啥心都操，因为以前的机器太慢太窄了

一旦新技术出现很快会有人把它面向大众， Web,PHP,P2P共享,流媒体,CV生成人脸,Token货币 ，复杂的技术(socket收发线)有简单化统一化(HTTP/MIME/Session-cookie)，也有简单化以后再复杂化(起名故弄玄虚的 XXer,XXor,XML)

现在的某些IT，拿amule阉割的啥p2p搜索器、各种意义不明的所谓资源、烦人的登录可见满级可见入群可见、在国外一键可装的用户js 赚信息差

也只能说是时代的车轮注定，在一些人眼里只有自己懂到，他才有好处，哪怕他没真懂。


对称职的人当然只需黏合示例直到工作，但对优秀的你，追求程序的优雅是和功能同等重要的东西，为此就需要站在各层API、不同时代、不同算法的角度对程序的各种交互有完整的蓝图，在执行到某行前就通过最小预测和举例了解了程序的功能点

可以只考虑当前子程序，也可以放眼直到内核进程的，知道相关信息都在哪，进退自如

## 现实的

所谓发行版如果用现有软件包格式(apt-dpkg,yum-rpm,pacman-zstd)基本上是自定义图标窗口主题，预装几个应用和 xxrc脚本，然后改下 initramfs 基础服务，能搜索挂载 squashfs 压缩根文件树和特殊路径，  oscdimg

GTK 基于 GObject C对象元信息和GDK图形库，实现了类似 DOM 渲染的UI框架，有一个DevTools 与 CSS ，它还支持一个显示到网页的 GDK_BACKEND=broadway
GIMP 所用的 GTK2 是跨平台的，有 GTK+(gtkmm) GTK# PyGTK 等绑定，对无鼠标,快捷键,面板/树/分页 有完善支持

GTK 和 GDK 相当于 Android的 view.Widget/surfaceflinger 、Chrome 的 Blink/Skia 、Qt 的 QWidget/QPaintDevice 、Tcl Tk/Xlib 、 imgui/SDL

现在GTK和Qt都支持 Wayland 窗口混成器，Xorg 其实是可以远程访问的(`xauth xprop xdpyinfo`) 对绘制性能有影响，而 xdg freedesktop GIO 的桌面链接,任务通知,用户配置, 图标资源,登录窗口规范 真正带来了世界上选择权最多的日用图形界面，KDE,GNOME,XFCE,e17 等现代桌面都支持这些

新的GObj体系自身有完善的FFI(跨C语)数值绑定，和 QObject moc 一样支持 OOP编程的 signal 事件扩展；DBus 作为桌面Linux 的跨应用Rpc调用服务实现了像截图锁屏的功能，它也有一套像BSON的数值，和OOP实例路径体系

GNO的开发者们有设计Vala语言与开发环境的能力，就像 GNU 有设计 gcc,ld,bash,coreutils,grub 等一大堆工具辅助 "Linux" 流行的能力(虽然代码风格略逊)

systemd xxctl 作为 run-command 初始化(pid1)系统没有旧 linuxrc 的 bash 之类低效的代码，用以支持自动挂载、电源网络、错误记录的工作；内核加载、根目录挂载后，它负责hibernate,getty,startx 等不同的目标功能

bin lib 是 PATH 短名搜索路径， etc/shells 执行 execve, lib/ld-*.so 在 dlopen 时默认从这里 openat,mmap ，是 /usr/ 下的同名链接
var tmp 是服务注册和临时文件路径
devtmpfs 下是虚拟设备和标准的块,管道(tty,fb,null)； sysfs 下是扩展外设和插件电源等(firmware/efi,backlight)，二者都有 disk/by-label 这种分组文件夹；procfs 用于查询进程信息(统称DSP吧)

opt mnt home 包括 srv sbin 对系统而言没啥特殊意义，用户软件和盘挂载
boot 保留 grub2 要加载的各版内核和迷你根，只在系统引导时用

awk,perl,sed 前二者其实是流行于UNIX的脚本语言，可惜和 gdb guile,make functions 一样帮助太烂，而 `info coreutils` 的 `cut -f 2|grep` 和 `sed -E s/(.)/\1x/g` 往往能解决所谓AWK 的问题，总之，易用性很重要

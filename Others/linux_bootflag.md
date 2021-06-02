# Arch 安装 linux cmdline onshot 启动脚本

学校没有多的插座，手机必须在笔记本上充电，但是笔记本 BIOS 偏偏不能调 USB 是否在睡眠模式下供电，也不知道 GRUB 里怎么睡眠，只能让 systemd init 系统去做个检测、GRUB 里加个条目了。

保证每个 kernel ver 都能拥有 suspended 菜单项，需要改系统提供的 `grub-mkconfig` 的生成脚本，在类似命令下添加：

```bash
#/etc/grub.d/10_linux
    linux_entry "suspended ${OS}" "${version}" fallback \
                "${GRUB_CMDLINE_LINUX} ${GRUB_CMDLINE_LINUX_DEFAULT} suspend"
```

然后更新：`sudo grub-mkconfig -o /boot/grub/grub.cfg`

## 头疼的 bash 脚本

动苏的风格肯定不会一做只支持 `suspend` 参数，当然是允许系统管理员们自己建立 `.sh` 去添加，所以这叫 `flagexec`(旗标执行) ，`findNames` 是收集脚本注册到的 `cmdline` 参数，然后用 for 循环实现 `reg.get(it)?.invoke()`，循环两层顺序不影响（某些人也会选择 function+`$*` 或者 `shift` 什么的）

```bash
#/lib/systemd/scripts/flagexec
findNames(){
local glob=$1 suf=$2;local fp0="${glob}*${suf}"
names=""
for fp in `ls $fp0`; do
  names="$names $(basename $fp $suf)"
done
}

findNames /lib/systemd/scripts/ .sh
for arg in `cat /proc/cmdline|xargs`; do
  for s in $names; do
    [ $arg == $s ] && source /lib/systemd/scripts/$s.sh
  done
done
exit 0
```

记得加执行权：`chmod +x /lib/systemd/scripts/flagexec`

然后在 `/lib/systemd/system/` 库添加某 `man systemd.service` 条目：

```ini 
[Unit]
[Service]
Type=oneshot
ExecStart=bash /lib/systemd/scripts/flagexec
User=root
[Install]
WantedBy=multi-user.target
```

后要启用开机启动：`systemctl enable flagexec`

顺便一提 systemd 不得优化的不友好还是很令人没话， `start` 时出错它提醒你 `status`，单元文件有变它提醒你 `daemon-reload` ，就是命令 verb 变了一个，手动编辑？ ……

写了咱也对 bash 系 Unix Shell 意见颇大，空格换行太严格（不像 CSS `calc()` 的操作符设计优雅协调值写法的合理强制）、一切皆字符串、子程序模型辣鸡没有形式化参数没有自由返回值。

`""` 和 `''` 的区分也没能很好提升语言表现力，有时还要命名表达式（还是咱不会操作？）

说到这点就得夸夸 闭源恶魔 Powershell(posh) 引入的新 CLI 参数接口和 path,man 系统，但至少人家没有抄 libc crt.so ，做 `return` 和 `$?` 强制挂钩的弱智操作

你会发现 coreutils 的 `help` doc 写的还不错、索引组织好，但是用户接口格式太单一了；当然 shell 等命令处理程序也就是给不常编程解决的 sysadmin 用的了，形式语法都没有，也不好说设计、命名不协调之类的，毕竟这没办法。

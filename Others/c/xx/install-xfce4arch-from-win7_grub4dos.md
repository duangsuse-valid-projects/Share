# 一人一机，从 Windows 7 开始安装 Win7+ArchLinux 双系统（MBR）

## 故事的缘起：万恶 2345

这几天回老家，收到修好的旧笔记本电脑，却发现硬盘被偷换成 128G 的 SSD 了... （修了一风扇，可惜没扇点风又坏惹...）

原有一 OpenSUSE，荡然无存。只剩下一个塞满了 2345 各种『良心』产品（呕吐）（比如软件中心啊、安全中心啦、浏览器啦... 在此不赘述了）的盗版 Microsoft Windows 7 旗舰版...

我实在无力和 2345 这种老牌『知名』软件战斗，而且实在被什么头条大新闻、开机速度恶心到不行... 何况我即使用盗版也完全可以去 MSDN 下 VL 版 WIM 镜像
然后通过 Windows 企业授权的 KMS 服务器，`slmgr/skms` 一句激活。反正我不是特别依赖 Windows。（这句话好伤人，跑）

果断先 <kbd>Meta</kbd>+<kbd>R</kbd> 请出 `cmd.exe` 看 `bcdedit`，右击〖计算机〗按 <kbd>G</kbd> 磁盘管理，压缩删除创建 raw 分区（图形化好操作），准备安装 ArchLinux。

本来打算还没动身的时候安装的，不过看起动漫来又忘记啦，我 X... (x_x)/?

只能在老家安啦。不过很不巧的是，我没带别的存储设备呢... （一般都是用优盘呢）

原来打算使用的 DriveDroid 发现带错手机了... 一个没有 root 的垃圾猾为，嗳。

又要打败自己喽？（虽然是在一个很 trivial 的问题上，根本不涉及程序设计内容...）
我之前是完全无法做到『不用优盘安装 XXX 发行版』的程度，不过毕竟是毕竟简单的内容，也罢。

首先我们想想怎么通过 Windows Boot Manager 启动一个能去引导（至于具体怎么实现，作为用户我们不需要考虑，但是实际上要给机器/IO 做很多初始化工作...）
Linux 内核并且通过 Init RamDisk 的辅助最终挂载切换到真实的 rootfs，我的选择当然是 Grub4Dos。

为了保证电脑的持续可操作性（因为如果没有操作系统能用的话，就会很麻烦，一人一机而已啊）
我得保证每一步操作都是安全的。

这也意味着在 ArchLinux 被确认是真正可用之前，我不能做♂掉 Windows 和 wbmgr。要不然都不能用，进退两悬可就玩完了。

所以我选择的是先做双系统，而且因为 ArchLinux 要用 BtrFS 的原因，必须使用 GRUB2 作为主引导记录来加载 Windows Boot Manager (bootmgr, bcdboot)，由 WbMgr 来启动 GRUB4DOS，额，好像 GRUB4DOS 就没有用了...

噢，之前忘了说，原 Win7 是简单 3 Plain NTFS 卷 + MBR Parition Table 的，我考虑过要不要 GPT+UEFI 的操作，
可是现在不能做到（因为重建分区表要格式化整个磁盘，而且即使不考虑 Live GNU/Linux 环境要依赖某个卷上的 Root SquashFS 文件，失败的话重启一次后也没法进入任何一个操作系统了）...
反正只要建立一个 EFI 分区，也可以从 EFI BIOS 里启动各种 UEFI 应用的，比如 UEFI shell（跑）

## 0x00 起源：Windows 7


### 0x00.1 准备安装映像

Dism、DiskPart，都是 Windows 自带的好工具，可是除了 DiskPart 被用来 `list device` / `list partition` 之外就不使用了... 
笔者是个计算痴，非常讨厌手算分区起始结束甚至只有大小也懒得看...

首先当然是下载 ArchLinux Live 的镜像 "archiso"，推荐从 [USTC OpenSource Mirrors](http://mirrors.ustc.edu.cn/) 下载。

〖获取安装镜像〗就可以啦。Archlinux 现在已经放弃了对 i386 的支持，毕竟 64 位机器是时代主流，Arch 也不是通用发行版。

下载好之后，按照你自己的需求可以去专门下 [checksum](http://mirrors.ustc.edu.cn/archlinux/iso/latest/) 什么的，然后手动检查（从[官方](https://www.archlinux.org/download/)那也可以找到）。

```bash
sha1sum --check sha1sums.txt
```

下载好之后，首先使用 WinRAR（因为它可以解压标准一点的 ISO，当然 UltraISO 也可以）解压一份 `ARCH\BOOT` 到 `C:` 根部，反正就是 NTFS/FAT+到时候写 GRUB 引导命令行方便即可。

然后你也得把 ISO 本身弄到 `C:` 根部去，也是为了以后使用方便，而且考虑到你可能已经准备删掉 Windows 了，所以整洁性不重要。（滑稽）

### 0x00.2 准备 GRUB4DOS 和 BCD 配置

对于 GRUB4DOS，虽然很容易就可以找到，不过找不到的话可以去这位[引导大佬的博客](http://chenall.net/categories/GRUB4DOS/)看看，_0.4.4_ 版本已经足矣。
~~反正用完就删~~

下载得一 RAR 或者 ZIP 什么的，解压到 `C:\` 重命名文件夹为 `gr4dos` 即可，待会 BootManager 会以实模式(x86 Real Mode) 加载这个 `gr4dos\grldr.mbr`。

接下来我们需要编辑 BCD (Boot Configuration Data) 文件，只需使用 `bcdedit.exe` 即可完成，可是为了方便当然要用 BootICE（

```cmd
bcdedit /delete {ntldr}
bcdedit /create /d "GRand Unified Bootloader 4 DOS" /application osloader
bcdedit
bcdedit /set {guid} path \gr4dos\grldr.mbr
```

上面的命令不需要运行... 自己到网上找一 BootICE 调试即可方便地动态图形化（WinForm）修改 BCD 引导配置啦（不依赖 `bcdedit.exe`）。

BootICE 操作非常简单，编辑 BCD，当前系统 BCD 智能编辑。
然后勾选〖启动延时〗、新建实模式启动项，〖从磁盘/分区引导〗，选择 `C:`、标题随便起，路径填 `\gr4dos\grldr.mbr` 即可。

### 0x00.3 __(optional)__ 准备 EFI 应用程序

ArchISO 是一个神奇的镜像，因为它轻巧，但是又五脏俱全。

它支持 IsoLinux/SysLinux 引导，也支持 UEFI 固件引导，而且还带有大量固件检测工具（大多数是 syslinux 模块）什么的。

对于某些缺乏爱的 UEFI 电脑来说，里面有很多可用的程序。

这只小麻雀看起来像是这样 🐦

+ LABEL=ARCH_201907
  + ARCH
    + X86_64
    + PKGLIST_X86_64.TXT
    + BOOT
      + INTEL_UCODE.IMG
      + MEMTEST
      + SYSLINUX
      + X86_64
        + VMLINUZ
        + ARCHISO.IMG
  + ISOLINUX
  + EFI
    + BOOT
      + BOOTX64.EFI
      + LOADER.EFI
      + HASHTOOL.EFI
    + ARCHISO
      + EFIBOOT.IMG
    + SHELLX64_V1.EFI
    + SHELLX64_V2.EFI
  + LOADER
    + LOADER.CONF
    + ENTRIES
      + ARCHISO_X86_64.CONF
      + UEFI_SHELL_V1_X86_64.CONF
      + UEFI_SHELL_V2_X86_64.CONF

总结一下：

+ 使用方式 0：启动 Arch/Boot 迷你预启动环境；启动 Live 环境
+ 使用方式 1：启动 MemTest86+

+ EFI 方式 1：使用 Shellv1, Shellv2, HashTool 程序
+ EFI 方式 2：使用 Systemd-boot 的 Loader.efi 和 BootX64.efi，虽然看起来好像没有用...

ArchISO 还有利用 CowFS（Copy-On-Write）进行 persistence live 的黑科技（虽然不是 Arch 的专利）这里不赘述啦。

对于方式 0，这是我们待会要讲的。

方式 1：GRUB 里 `kernel memtest` 然后 `boot` 就好了，注意 GRUB 2 里 `kernel` 指令得换成 `linux`

对于 EFI 方式，得先分出一个 FAT(32) 文件系统的 UEFI 保留分区供固件读取，然后进入 UEFI Setup 添加 UEFI 启动项。

名字随便起，分区选择检测出的 ESP 分区、路径填写 `.EFI` 应用程序文件的路径，比如：`\EFI\SHELLX64.EFI`

在启动选择里引导测试一下，适合的时候保存吧。（因为 EFI 程序是可以退出回启动应用的，shell 里 `exit` 指令就可以、EFI LOADER 里 `F1` 按几次 `q` 即可）

## 0x01 Linux Kernel，启动！

准备好 Arch 镜像、Boot 环境解包、GRUB4DOS、BCD 引导配置后就可以启动 GRUB4DOS 了。

重启，选择之前创建的 Boot 管理器菜单项，即可进入 GRUB4DOS。

因为我们要引导自己的 Linux（而不是它自动检测的 WbMgr Chainloader），所以直接按 <kbd>c</kbd> 建进入 BASH-like console

确认一下自己的 `C:` 在 GRUB4DOS 里是 `(hdx,y)`，然后填写好，我的是 `(hd0,0)`。
然后 `ARCH_YYYYRR` 是下载镜像的版本，比如我的是 `ARCH_201907`（有点类似 `date +%Y%M` 的输出...）

~~吐槽~~：其实这里我写 `(hdn,m)` 比 `(hdx,y)` 好

```bash
root (hdx,y)
kernel /BOOT/VMLINUZ archisolabel=ARCH_YYYYRR
initrd /BOOT/ARCHISO.IMG
boot
```

`archisolabel` 和 `archisobasedir` 都是 EFI LOADER 很好的引导参数例子，从 IsoLinux/SysLinux/Systemd Boot 的引导参数里都可以看到，
对于已经安装好的系统，InitRamDisk 为了预备挂载根分区也得指定 `root=LABEL={fslabel} rw` 什么的。

想象一下 `BOOT` 只是最小的启动环境而已，它提供了 Linux Kernel 但只是 Live 的一小部分，它还需要寻找自己的根(rootfs) 来决定自己到底是什么。

`BaseDir` 是有默认值的，但是 `Label` 必须得填写，不然你可以在 emergency shell 里 `grep "Waiting" /init_functions` 看看，会卡在等待 ISO 镜像分区挂载那里
（而且你不能靠手动 `mount -t iso9660 -o ro arch.iso /new_root` 解决...）。

既然不是传统的『外接存储设备』的话，也只好自己帮忙挂载 ISO 卷了。

ArchISO 的处理方案很简单，虽然他们没有直接说。
就是它会等待 `[ -b /dev/disk/by-label/<name> ]` 的时候停下，定时检测介质挂载情况，而 `disk/by-label/` 代表系统有一个卷标 `<name>` 的新卷挂载。

对了，如果安装好了系统，通过 `kernel` 和 `initrd` 引导，没有引导加载器想要手工指定 rootfs 的话直接 `mount /dev/sdX /new_root` 即可。
虽然你 pass 一个 `root=UUID={uuid} rw` kernel cmdline 就可以直接成功完成了...

这个程序里的 `<name>` 就是我们之前指定的 `archisolabel` 内核参数（`cat /proc/cmdline` 即可得到），
如果未设置的话默认为空，导致路径出现了歧义（因为文件必须得有长度大于零的名字的，我们本来想引用 `/by-label/` 下某个文件，却引用成了 `by-label/` 文件夹本身，它不是一个块设备），
同时也就不能达到目的了，所以内核参数必须指定。

这里有一个骚操作，就是我还不知道是这样的时候（`vi init_functions` 看了好久...）
误打误撞 `ln -s -f /dev/loop0 /dev/disk/by-label/ARCH20190701` 把 `/dev/loop0` 删掉了，无法挂载新的块设备...

最后我 `cd /dev; mknod -m 660 loop0 b 7 0` 才恢复了 `loop0`...

接着 `ln -sf /dev/loop0 /dev/disk/by-label/ARCH20190701` 手动指定了 iso 卷（

试下 `[ -b /dev/disk/by-label/ARCH_201907 ] || printf` 如果没有输出就 <kbd>Ctrl</kbd>+<kbd>D</kbd> EOT 离开 shell 吧。

接下来，等待 Arch 的 Live 环境正常启动。

## 0x02 从零开始的异系统安装生活

一般来说平常的固件就可以直接使用 Live 了，可是还得进行安装。

安装需要对 Arch 软件源的网络访问，和至少 512M 的内存、800M 的存储空间。
如果遇到不懂不记得的地方，随时 `less install.txt` 看看手册。

假设你没有使用 UEFI，安装过程大概分为：

+ 安装 ArchLinux
  + 引导 Live 环境
  + 准备 Live 环境
    + 设置 keymap 和 font
    + 设置网络访问
    + 网络同步系统时间
  + 准备分区、创建文件系统、挂载分区
  + 创建根文件系统
    + 选择安装镜像
    + 使用 `pacstrap`
  + 设置新系统
    + 设置 fstab
    + 设置 vconsole 的 keymap 和 font
    + 设置时区、同步当前系统时间到硬件时钟
    + 设置国际化本地语言
    + 设置网络主机名，同步到 hosts
    + 安装需要的软件包
    + 设置 root 密码，创建普通用户
  + 安装引导加载器

### 0x02.0 __(optional)__ 设置 keymap 和 font

Live 环境的默认设置已经足够好了，可是为了兼容性，还是要手工设置一下。

```bash
ls /usr/share/kbd/keymaps/**/*.map.gz
loadkeys us
```

喜欢 dovrak 的同学可以试试 `dvorak` 和 `dvorak-programmer`，据说后者写括号十分方便。

```bash
ls -1 /usr/share/kbd/consolefonts/*.gz | awk -F/ '{print $6}' | xargs
setfont Lat2-Terminus16
```

### 0x02.1 设置网络访问

一般可以使用 ethernet、USB 绑定、WiFi 上网。

ethernet 直接插网线即可。
WiFi 的话也十分方便，ArchLinux 作为一群 Linux 高级运维工程师的杰作，自然是少不了用户中心方便脚本的。

```bash
wifi-menu
```

一行命令搞定，注意 WPA(2) 的 PSK 最短是 8 字符别瞎🐦填（

也可以使用 USB 绑定上网，当然内核驱动一般都默认弄好了的。（QEMU 之类的网桥设置比较麻烦，不过 Arch 的 USB 绑定还好）

```bash
ip link
ip link set enp0s20u2 up
dhcpcd enp0s20u2
ip addr
ping archlinux.org
```

`ifcfg` (`ifconfig`) 现在已经彻底被弃用了，请使用 `ip` （滑稽，毕竟 if 这个名字明明和 Net/IP 一点关系都没有啊）
不过使用 `ifstat` 还是可以查看所有网路接口的流量情况。

如果需要操纵无线接口的情况，`rfkill block` 即可。

### 0x02.2 设置系统时间

有了网络就可以 NTP 同步时间了。

```bash
timedatectl set-ntp true
```

过会设置好新系统的时区即把时间同步到硬件。

### 0x02.3 准备分区

之前分区已经在 Windows 下划分好了，只是还没有格式化（创建文件系统）

现在使用 `parted` 和 `fdisk` 查看分区并且镜像格式化和挂载。

```bash
mkdir -p /mnt/root
mkdir /mnt/root/tmp
mkdir -p /mnt/root/boot/efi
```

分区方案很简单：

+ 一个 root 分区
+ 一个独立的 tmp 大约 2G
+ 一个 swap 分区和内存大小相当（宁小勿大）即可。
+ 一个 ESP （已经建立好）200M

GNU Parted 和 FDisk 的目的都一样，此外还可以 `lsblk` 和 `blkid`，`sda` 的意思是第一个 SATA 磁盘

```
fdisk -l /dev/sda
```

接下来创建文件系统

```bash
mkfs.btrfs -d single -L root /dev/sda$ROOT
mkfs.btrfs -d single -L temporatory /dev/sda$TMP
mkswap -L arch /dev/sda$SWAP
```

然后挂载分区

```bash
mount /dev/sda$ROOT /mnt/root/
mount /dev/sda$TMP /mnt/root/tmp/
mount /dev/sda$ESP /mnt/root/boot/efi
swapon /dev/sda$SWAP
```

### 0x02.4 创建根文件系统

Linux 继承了 UNIX 之大统，一切皆文件。这意味着系统配置的任务都可以使用人类可读可写的形式完成（当然这和高性能配置不冲突，只是额外提供了通用的人机接口而已）。

Linux 里有很多伪·文件系统，比如 `/proc` （访问进程和系统内核状态信息）就是 `proc` 文件系统、`/sys` （访问外设和硬件平台信息）就是 `sysfs`、`/dev` （访问内部集成设备信息）就是 `devtmpfs`，
此外还有 `devpts`, `/net/tun`, `/dev/shm`, `/dev/tty`, `binfmt_misc` 等特殊文件什么的，一切文件系统挂载到 `/` 树下，形成了 UNIX 风格的文件信息管理结构。

和 UNIX 的各种 Shell 解释器结合，就形成了完美的『字符』式系统管理编程能力，强大的组合性。

文件系统提供了程序机器代码的保存、配置文件的保存、C 接口头文件等等的保存功能，他们对维持系统正常运行有着重大的意义。

创建文件系统，是指创建为 Linux Kernel 所用的静态文件系统，一般是 Ext4、Btrfs、XFS 等格式的。

Arch 里，只需要安装 `base` package group 里的一些软件包即可安装 ArchLinux 的 Root FS 了。

先 `nano /etc/pacman.d/mirrorlist` 删了（按 <kbd>Ctr</kbd>+<kbd>K</kbd> 可删掉一行）不需要使用的软件镜像，留下少数速度可以的，比如 USTC。

`pacstrap` 脚本的参数不多，支持 `pacman` 的命令参数，除此之外，还有 `-c` 在本地保存包缓存 `-G` 不自动设置密钥环、`-M` 不自动设置源镜像、`-i` 交互确认安装等。 

```bash
pacstrap /mnt/root/ base base-devel btrfs-progs
```

在安装过程中，要改变屏幕亮度可以 <kbd>Alt</kbd>+<kbd>RightArrow</kbd> 或 <kbd>F2</kbd> 切换 vconsole 登录 `root`，这么操作

```bash
read max_brig </sys/class/backlight/intel_backlight/max_brightness
printf `expr $max_brig / 2` >/sys/class/backlight/intel_backlight/brightness
```

要查看电池剩余电量，都可以通过 sysfs 暴露的接口读取：

```bash
linux_battery
cat /sys/class/power_supply/BAT0/capacity
```

### 0x02.5 设置新系统

接下来我们做最后一件需要用到原来系统环境的事情：生成挂载表。

```bash
genfstab -L /mnt/root >>/mnt/root/etc/fstab
```

因为我们刚才已经设置好了卷标，就直接用卷标查找挂载点了。
接下来 chroot 进入新系统根目录容器。

```bash
arch-chroot /mnt/root /bin/bash
```

至于 vconsole 的 keymap 和 font，`/etc/vconsole.conf` 里这么填写即可。

```bash
KEYMAP_TOGGLE=us
KEYMAP=dvorak-programmer
FONT=Lat2-Terminus16
```

我不知道什么快捷键可以切换 keymap，不过如果你放反了 `us` 和 `dvorak`，结果是惨烈的。
你会和我一样仅仅为了登录新系统，就暴力学习 dvorak 键盘布局... 我花了三十分钟，只是因为我的 root 密码比较复杂...

至于时区设置：

```bash
ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
hwclock --systohc
```

然后是 i18n：

```bash
echo -e "en_US.UTF8 UTF-8\n" >>/etc/locale.gen
echo -e "zh_CN.UTF8 UTF-8\n" >>/etc/locale.gen

locale-gen

echo "LANG=en_US.UTF8 >>/etc/locale.conf"
```

最后，设置自己的主机名。

```bash
printf "susepc" >/etc/hostname

read -dEOF hosts <<EOF
127.0.0.1 localhost
::1 localhost

localhost susepc
EOF

for i in $hosts; do
  echo $i
done
```

啊好像写错了，就当是顺便学习了一下 UNIX Shell 使用吧。佩服写那么多工具还不累的人...
内容肯定看得懂吧。

### 0x02.6 安装软件包

接下来安装一些常用软件，首先学习 `pacman` 的基本使用

```bash
pacman -Ss <query>
pacman -Qs <query>

pacman -Sy
pacman -Syu
pacman -U <pkg>

pacman -S <id> [--needed]

pacman -Qgq <group>
pacman -Qt <pkg>
```

不会的话 `--help` 就可以了，非常方便的（比如 `pacman -Sh`）

`pacman -Qgq` 经常输出到 `xarg` 使用，例如：`pacman -Qt \`pacman -Qgq base |xargs\``

我们要装的自然是 XFCE4、Firefox、中文字体、iBus/RIME 什么的

```bash
pacman -S xfce4 xfce4-goodies

pacman -S xorg-server xorg-server-devel

pacman -S wqy-microhei
pacman -S firefox

pacman -S ibus ibus-chewing

pacman -S git python python-setuptools python2-setuptools

python -mensurepip --user
python2 -mensurepip --user
```

配置 IBus 输入法模块支持环境变量，写到 `~/.bashrc` 里，
当然优秀的人肯定是在 `/etc/profile.d/` 里做脚本，反正只是添加环境变量。

```bash
export GTK_IM_MODULE=ibus
export QT_IM_MODULE=ibus
export XMODIFIERS=@im=ibus
```

然后

```bash
export DISPLAY=:0
ibus-daemon -d -x
```

为了添加 RIME 支持，

```bash
pacman -S ibus-rime librime
ibus restart
ibus engine rime
```

[plum](https://github.com/rime/plum) 配置管理器可以手动安装。

<kbd>Ctrl</kbd>+<kbd>`</kbd> 以选择输入方案。

在 vconsole 下，使用 `startxfce4` 即可启动 XFCE4

### 0x02.7 设置用户帐号

root 一般是需要密码的

```bash
passwd root
```

输两遍。

```bash
useradd -m duangsuse -c "Salted fish"
passwd duangsuse

groupadd wheel
usermod duangsuse -G wheel
pacman -S sudo --needed

lslogins; w

nano /etc/sudoers # 然后取消 wheel 特权组配置的注释，注意前面的 % 字符不是注释符！
```

然后试试新帐号

```bash
su duangsuse
sudo -i
```

输入 duangsuse 的密码后应该可以借用到 root 的权限。

### 0x02.8 安装 Bootloader

最后，安装引导加载器。
这会覆盖掉原来的 WinBootMgr，不过因为 GRUB2 的 OsProber 可用，所以不用担心无法启动 Windows

```bash
pacman -S grub --needed
pacman -Ss grub-btrfs breeze-grub os-prober

grub-install --target=i386-pc --install-modules=all /dev/sda
grub-mkconfig -o /boot/grub/grub.cfg
```

### 0x03 享受新系统吧

然后你可以 `less /var/log/pacman.log` （ALPM 的操作记录）看看自己都装过甚么（跑

`reboot` & have a cup of tea

如果想把用户界面作为 Systemd service 启动，则可以参考各种 display manager 的配置，不过使用 `startxfce4` 脚本也很好

```awk
awk '$3=="[PACMAN]" { for (i=NF; i>3 ;--i) {print $i} print "\tNEXT "NR }' /var/log/pacman.log
```

```bash
pacman -S lzop tk cairo mcpp freeglut wpa_supplicant
pacman -S mtools os-prober libisoburn efibootmgr dosfstools fuse2

pacman -S noto-fonts-extra noto-fonts-emoji noto-fonts-cjk ladspa hunspell-en_US speech-dispatcher
pacman -S networkmanager graphviz
```

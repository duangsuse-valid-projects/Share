// gcc -DT=typedef -Dvar=__auto_type -DNO=NULL -include stdio.h -Dw=printf -Wno-implicit-int  -ldl -D iSym=ELF64_R_SYM -DgccLib=__attribute__ -shared -fPIC -e _start -nostdlib nmhok.c
#include <stdio.h>
#include <sys/types.h>
const char _RTLD[] gccLib((section(".interp")))="/lib/ld-2.33.so";
#include<dlfcn.h>
#include<elf.h>
#include<sys/user.h>
#include<stdlib.h>
#include<unistd.h>
#include<errno.h>
#include <inttypes.h>

#define E(k) Elf64_##k
T char*Str;T void*P; T E(Word)uint; //ELF vaddr, pf-offset.

#define Rep(n) for(i=0;i<n;i++)
gnuHashN(uint* p){
  uint nB=p[0],i, n=0;
  var buk=p+4+2*p[2];
  Rep(nB) if(buk[i]>n)n=buk[i];
  return n;//+p[1];
}
P libcAddr(pid_t i){ char line[100]; P p; FILE*fp;
  if (NO == (fp = fopen("/proc/self/ maps", "r")))goto ok;
  while (fgets(line, sizeof(line), fp)) { var ic=strrchr(line, '/');
    if (ic&&strncmp(ic+1,"libc-",5)==0 &&
    //7ffff36d5000-7ffff36f6000 rw-p 00000000 00:00 0                          [stack]
        sscanf(line, "%"PRIxPTR"-%*lx %*4s 00000000", &p) == 1) //x uintptr
        return p;
  }
  fclose(fp);
  ok:return 0;
}

/*NameHook(nmhok) 是提供 Py cffi 访问,注入替换的最简 ELF 程序文件工具。 ELF .o .so ./a.out 以多段,节(segment,section) 构成(段Phdr[]的偏移和计数在ELF文件头内)，段是节的子集
它不止汇编对应的机器码。跨 .c 即 .o 的变量和函数共享、系统库如 libc 引用必须由 GOLD -fpic 重填地址/合并代码，否则文件过大且难更新。

对于共享库，此过程大部分在运行时于 .got.plt 这 rw- 段，基于 .rela.plt 重填函数(如 atoi@libc)地址。类似 NT PE 的 IAT
只有段被 ld-linux.so 运行期链接器以 vaddr,memsz, 以文件 offset,sz 给 mmap() 到内存地址空间，节所包含的符号调试信息可以被 strip 。如 text rodata bss 节保存了 C 代码,字符串,全0数组, 而 init,fini _array 是text C++的一部分. *strtab, symtab 则是给ld用

nmhook 会解析被自身加载的.so运行时必然存在的 dynstr dynsym rel 三dyn段，达到枚举符号及 hook 地址 写到文件 nmhoka ，以便 nmhokrc py脚本进一步动作的目的；此外它支持通过 ptrace 注入dlopen,在(新建)进程执行从而实现 ctypes 调试器，目前支持 x86/x64 。
对于目标进程，只需获取 /proc/$pid/maps libc.so 的 pf +nmhokrc内既存的 dlopen@libc 地址，单步暂停 保护现场，注入机器码调用即可。 nmhoka 在运行中始终存在，只是调试状态先读rc内的dlopen_pELF 注入目标，创建空nmhoka待第二次加载填写,pyrc 后移除。
此外，它也提供 pltgot, gnu/hash, strsz/soname/flags(PIE,PIC..), rpath needed 的值或地址. 和 类型rwx-大小-段地址-文件址-大小差 程序段信息, 与符号#-rel 一起出现在符号列表前

即便无调试符号,GDB 的 x/10i $rip ; frame ; b readdir+0 等基础地址指令仍可用
main 之前的 _start 初始化C调用栈， __libc_start_main 支持了 atexit 等资源预备；这些可通过 readelf -S 和 objdump -d 等查看

GNU dlfcn.h 即 RT-ld 的 dl_iterate_phdr({pf,fp, a,n}, udata) 提供了路径fp 已加载至pf 的.so 的 Phdr a[n] ，通过它查到 _DYNAMIC union E(Dyn)* 数组，以 d_tag 和 un.ptr/val 取值
pltrel-sz-jmprel 指向了 rel/a 的地址， n=sz/ent 。地址都是相对ELF文件或strtab等资源节、sz都是总字节数

细节:str/sym,rel,rela,pltrel 的 -sz,-ent 及-count ver- 项被无视、不考虑首 LOAD segment 的 vaddr!=0 ,不是GNU.hash的情况。textrel? symbolic? 等flag 。 nmhook 工作类似ld-linux ，它仅修改RTLD_LAZY的got段，不 mprotect或builtin_clear_cache
符号单前缀， uvfscot 未定,变量,函数,节,C文件,共有,线程量 大/小写代表 局部/全局 ，若带 _ 前缀则是弱全局；尾随其大小,节号
利用 ph/syment 等确实可兼容不同架构ELF，但本程序需被32/64b 进程加载，直接重编译即可
*/
T struct{P pf; Str fp; E(Phdr)*a; uint16_t n;} SoLoad;
onSo(SoLoad*po, size_t nb,P ud){SoLoad o=*po; P dy,ht;
  int i,n,k;Rep(o.n){var x=o.a[i]; if(x.p_type==PT_DYNAMIC)w("%s %lx ",o.fp,dy=(o.pf+x.p_vaddr)); }
  if(NO==dy)goto ok;
  P dt[2]={NO}; int dtk[]={DT_STRTAB,DT_SYMTAB};
  for(E(Dyn)*x=dy; (k=x->d_tag);x++) {
    var v=x->d_un.d_ptr; if(v<o.pf)v+=o.pf;
    Rep(2) if(k==dtk[i])dt[i]=v;
    if(k==DT_GNU_HASH){ w("%lx %d\n",v,n=gnuHashN(v) );}
  }
  E(Sym)*s=dt[1]; if(NO!=s&&NO!=dt[0]) Rep(n) {
    var ik=s->st_info;
    Str kt="uvfscot";
    var sb=ELF32_ST_BIND(ik);
    var t=kt[ELF32_ST_TYPE(ik)];
    if(sb==0) w("%c",t+ 'a'-'A'); if(sb==1)w("%c",t); if(sb==2)w("_%c",t); if(sb>2) w("%d]%c",sb,t);
    w(" %s\n",dt[0]+s->st_name); s++;
  }
  ok:return 0;
}
gccLib((constructor)) void dllMain() {
  var l=dlopen("libpython3.so", RTLD_LAZY);
  var init=(void(*)())dlsym(l,"Py_Initialize");
  var pyrc=(P(*)(Str))dlsym(l, "PyRun_SimpleString");
  init();pyrc("import time;time.sleep(2)"); //atexit rm
  w("dll\n");
  dl_iterate_phdr(onSo,NO);
  w("%lx\n",libcAddr(0));
}
kPT[]={9,7, 1,4, 12,13, 16,17}; //stop cont rw rwreg a.detach
ptrace(int op,pid_t, int iW, P pR);
T struct user_regs_struct RegVar;

main(int n,Str a[]){
  pid_t traced; int sig;
  if(n>1){
    var cm=a[1];
    if(cm[0]=='!'){dllMain(); return n-2;}
    traced=atoi(cm);
  } else {dllMain(); return 0;}
  if(traced==0&&(traced=fork())==0)
  {execvpe(a[1],a+1,__environ); perror("");}else{ //only execve is syscall
    ptrace(kPT[6],traced, 0,NO);
    wait(&sig); //waitpid(,*r,WNOHANG|)
    RegVar rv;
    if(WIFSTOPPED(sig) && WSTOPSIG(sig) == 19) {//trap, 0xff00
      ptrace(kPT[4],traced, 0,&rv); w("%lx\n",rv.rip);
      //保护寄存器,交换 *rip 的几word 提供 rax=&dlopen，shellcode执行后 sig==5 ,换回来
      ptrace(kPT[7],traced,0,NO);
    }
  }
}
#if 1
gccLib((force_align_arg_pointer)) _start(){ //不能同时是 PIE exe 和 so 动态库，不自定链接只能通过 -e _start 替 __libc_start_main
  // int argc = (int)(long)__builtin_return_address(0);
  P sp;asm("mov %%rsp,%0" : "=r"(sp));
  sp+=4*sizeof(P);
  exit(main(*(int*)sp,(Str*)sp+1));
}//neeed sudo setcap CAP_SYS_PTRACE=p a.out || sudo sysctl kernel.yama.ptrace_scope=0 and sudo
//b _start; x/4gx *(size_t*)$rsp; x/10i _start 后我选择 rbp+8 (push bp=0)后 或 *rsp 。没人知道为什么GCC mov [rsp+8],.. 它既不是call-ret 也不是上层栈bp
#else
asm(".intel_syntax noprefix");
asm(".global _start\n_start:"
"mov rbp,0; mov rdi,[rsp]; lea rsi,[rsp+8]; call main"); // in __i386__ we align esp-=8 first, push arg 2 1
#endif